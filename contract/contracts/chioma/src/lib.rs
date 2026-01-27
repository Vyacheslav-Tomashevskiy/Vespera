#![no_std]
use soroban_sdk::{contract, contractimpl, contracterror, contractevent, vec, Address, BytesN, Env, String, Vec};

mod types;
use types::{AgreementStatus, DataKey, RentAgreement};

pub mod escrow;
use escrow::{EscrowContract, DisputeHandler, EscrowError};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AgreementAlreadyExists = 4,
    InvalidAmount = 5,
    InvalidDate = 6,
    InvalidCommissionRate = 7,
    // Escrow errors are handled via EscrowError, mapped to contract errors
    EscrowNotAuthorized = 8,
    EscrowInvalidState = 9,
    EscrowAlreadySigned = 10,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AgreementCreatedEvent {
    pub agreement_id: String,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn hello(env: Env, to: String) -> Vec<String> {
        vec![&env, String::from_str(&env, "Hello"), to]
    }

    /// Creates a new rent agreement and stores it on-chain.
    ///
    /// Authorization:
    /// - Tenant MUST authorize creation (prevents landlord-only spoofing)
    pub fn create_agreement(
        env: Env,
        agreement_id: String,
        landlord: Address,
        tenant: Address,
        agent: Option<Address>,
        monthly_rent: i128,
        security_deposit: i128,
        start_date: u64,
        end_date: u64,
        agent_commission_rate: u32,
    ) -> Result<(), Error> {
        // Tenant MUST authorize creation
        tenant.require_auth();

        // Validate inputs
        Self::validate_agreement_params(
            &monthly_rent,
            &security_deposit,
            &start_date,
            &end_date,
            &agent_commission_rate,
        )?;

        // Check for duplicate agreement_id
        if env.storage().persistent().has(&DataKey::Agreement(agreement_id.clone())) {
            return Err(Error::AgreementAlreadyExists);
        }

        // Initialize agreement
        let agreement = RentAgreement {
            agreement_id: agreement_id.clone(),
            landlord,
            tenant,
            agent,
            monthly_rent,
            security_deposit,
            start_date,
            end_date,
            agent_commission_rate,
            status: AgreementStatus::Draft,
        };

        // Store agreement
        env.storage().persistent().set(&DataKey::Agreement(agreement_id.clone()), &agreement);

        // Update counter
        let mut count: u32 = env.storage().instance().get(&DataKey::AgreementCount).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&DataKey::AgreementCount, &count);

        // Emit event
        AgreementCreatedEvent { agreement_id }.publish(&env);

        Ok(())
    }

    fn validate_agreement_params(
        monthly_rent: &i128,
        security_deposit: &i128,
        start_date: &u64,
        end_date: &u64,
        agent_commission_rate: &u32,
    ) -> Result<(), Error> {
        if *monthly_rent <= 0 || *security_deposit < 0 {
            return Err(Error::InvalidAmount);
        }

        if *start_date >= *end_date {
            return Err(Error::InvalidDate);
        }

        if *agent_commission_rate > 100 {
            return Err(Error::InvalidCommissionRate);
        }

        Ok(())
    }

    // ====== ESCROW FUNCTIONS ======

    /// Create a new security deposit escrow.
    /// Returns the escrow ID on success.
    ///
    /// # Arguments
    /// * `depositor` - The tenant depositing funds
    /// * `beneficiary` - The landlord who benefits from the deposit
    /// * `arbiter` - The admin who can resolve disputes
    /// * `amount` - Amount of funds to hold (must be > 0)
    /// * `token` - Token contract address (USDC, XLM, etc.)
    ///
    /// # Errors
    /// Returns EscrowError if validation fails
    pub fn create_escrow(
        env: Env,
        depositor: Address,
        beneficiary: Address,
        arbiter: Address,
        amount: i128,
        token: Address,
    ) -> Result<BytesN<32>, EscrowError> {
        EscrowContract::create(&env, depositor, beneficiary, arbiter, amount, token)
    }

    /// Fund an existing escrow (transition from Pending to Funded).
    /// Only the depositor can call this.
    ///
    /// # Arguments
    /// * `escrow_id` - ID of the escrow to fund
    /// * `caller` - Address of the caller (must be the depositor)
    ///
    /// # Errors
    /// Returns EscrowError if escrow doesn't exist or caller is not depositor
    pub fn fund_escrow(env: Env, escrow_id: BytesN<32>, caller: Address) -> Result<(), EscrowError> {
        EscrowContract::fund_escrow(&env, &escrow_id, &caller)
    }

    /// Approve release of escrowed funds.
    /// Any party (depositor, beneficiary, arbiter) can approve release.
    /// Release executes automatically when 2 of 3 parties approve the same target.
    ///
    /// # Arguments
    /// * `escrow_id` - ID of the escrow
    /// * `caller` - Address of the caller (must be a party to the escrow)
    /// * `release_to` - Address to release funds to (must be beneficiary or depositor)
    ///
    /// # Errors
    /// Returns EscrowError if approval conditions aren't met
    pub fn approve_release(env: Env, escrow_id: BytesN<32>, caller: Address, release_to: Address) -> Result<(), EscrowError> {
        EscrowContract::approve_release(&env, &escrow_id, &caller, release_to)
    }

    /// Get details of an escrow.
    /// Public read-only function.
    ///
    /// # Arguments
    /// * `escrow_id` - ID of the escrow to retrieve
    ///
    /// # Returns
    /// Escrow struct with all details, or error if not found
    pub fn get_escrow(env: Env, escrow_id: BytesN<32>) -> Result<escrow::Escrow, EscrowError> {
        EscrowContract::get_escrow(&env, &escrow_id)
    }

    /// Get count of approvals for a specific release target.
    /// Returns number of unique signers approving release to that address.
    ///
    /// # Arguments
    /// * `escrow_id` - ID of the escrow
    /// * `release_to` - The release target to count approvals for
    pub fn get_approval_count(env: Env, escrow_id: BytesN<32>, release_to: Address) -> Result<u32, EscrowError> {
        EscrowContract::get_approval_count(&env, &escrow_id, &release_to)
    }

    /// Initiate a dispute on an escrow.
    /// Only depositor or beneficiary can call this.
    /// Freezes funds until admin resolves.
    ///
    /// # Arguments
    /// * `escrow_id` - ID of the escrow
    /// * `caller` - Address of the caller (must be depositor or beneficiary)
    /// * `reason` - Reason for the dispute (must not be empty)
    ///
    /// # Errors
    /// Returns EscrowError if caller is not a party or reason is empty
    pub fn initiate_dispute(env: Env, escrow_id: BytesN<32>, caller: Address, reason: String) -> Result<(), EscrowError> {
        DisputeHandler::initiate_dispute(&env, &escrow_id, &caller, reason)
    }

    /// Resolve a dispute (admin only).
    /// Arbiter can release funds to either party or refund to depositor.
    ///
    /// # Arguments
    /// * `escrow_id` - ID of the escrow
    /// * `caller` - Address of the caller (must be arbiter)
    /// * `release_to` - Address to release funds to
    ///
    /// # Errors
    /// Returns EscrowError if caller is not arbiter or escrow is not disputed
    pub fn resolve_dispute(env: Env, escrow_id: BytesN<32>, caller: Address, release_to: Address) -> Result<(), EscrowError> {
        DisputeHandler::resolve_dispute(&env, &escrow_id, &caller, release_to)
    }

    /// Check if an escrow is currently disputed.
    ///
    /// # Arguments
    /// * `escrow_id` - ID of the escrow
    pub fn is_escrow_disputed(env: Env, escrow_id: BytesN<32>) -> Result<bool, EscrowError> {
        DisputeHandler::is_disputed(&env, &escrow_id)
    }

    /// Get dispute information for an escrow.
    /// Returns the dispute reason if escrow is disputed, None otherwise.
    ///
    /// # Arguments
    /// * `escrow_id` - ID of the escrow
    pub fn get_dispute_info(env: Env, escrow_id: BytesN<32>) -> Result<Option<String>, EscrowError> {
        DisputeHandler::get_dispute_info(&env, &escrow_id)
    }
}

mod test;
