//! Core escrow lifecycle logic: creation, funding, approvals, and release.
//! Implements checks-effects-interactions pattern for reentrancy safety.
use soroban_sdk::{contract, contractimpl, token, xdr::ToXdr, Address, BytesN, Env};

use crate::access::AccessControl;
use crate::dispute::DisputeHandler;
use crate::errors::EscrowError;
use crate::events;
use crate::rate_limit;
use crate::storage::EscrowStorage;
use crate::types::{Escrow, EscrowStatus, ReleaseApproval, ReleaseRecord, TimeoutConfig};

/// Core escrow contract implementation.
#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Initialize the contract with an admin address.
    pub fn initialize(env: Env, admin: Address) -> Result<(), EscrowError> {
        if env
            .storage()
            .persistent()
            .has(&crate::types::DataKey::Initialized)
        {
            return Err(EscrowError::AlreadyInitialized);
        }

        admin.require_auth();

        env.storage()
            .persistent()
            .set(&crate::types::DataKey::Initialized, &true);
        env.storage()
            .persistent()
            .extend_ttl(&crate::types::DataKey::Initialized, 500000, 500000);

        let state = crate::types::ContractState {
            admin: admin.clone(),
            initialized: true,
        };

        env.storage()
            .instance()
            .set(&crate::types::DataKey::State, &state);
        env.storage().instance().extend_ttl(500000, 500000);

        events::contract_initialized(&env, admin);

        Ok(())
    }

    /// Get the current contract state.
    pub fn get_state(env: Env) -> Option<crate::types::ContractState> {
        env.storage().instance().get(&crate::types::DataKey::State)
    }

    /// Pause the contract (admin only).
    pub fn pause(env: Env, admin: Address, reason: soroban_sdk::String) -> Result<(), EscrowError> {
        let state = Self::get_state(env.clone()).ok_or(EscrowError::NotInitialized)?;

        admin.require_auth();

        if admin != state.admin {
            return Err(EscrowError::Unauthorized);
        }

        if Self::is_paused(env.clone()) {
            return Err(EscrowError::AlreadyPaused);
        }

        let pause_state = crate::types::PauseState {
            is_paused: true,
            paused_at: env.ledger().timestamp(),
            paused_by: admin.clone(),
            pause_reason: reason.clone(),
        };

        env.storage()
            .instance()
            .set(&crate::types::DataKey::PauseState, &pause_state);
        env.storage().instance().extend_ttl(500000, 500000);

        events::paused(&env, reason, admin);
        Ok(())
    }

    /// Unpause the contract (admin only).
    pub fn unpause(env: Env, admin: Address) -> Result<(), EscrowError> {
        let state = Self::get_state(env.clone()).ok_or(EscrowError::NotInitialized)?;

        admin.require_auth();

        if admin != state.admin {
            return Err(EscrowError::Unauthorized);
        }

        if !Self::is_paused(env.clone()) {
            return Err(EscrowError::NotPaused);
        }

        env.storage()
            .instance()
            .remove(&crate::types::DataKey::PauseState);

        events::unpaused(&env, admin);
        Ok(())
    }

    /// Check if the contract is paused.
    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get::<crate::types::DataKey, crate::types::PauseState>(
                &crate::types::DataKey::PauseState,
            )
            .map(|ps| ps.is_paused)
            .unwrap_or(false)
    }

    /// Propose a new admin (two-step transfer).
    pub fn propose_admin(env: Env, admin: Address, new_admin: Address) -> Result<(), EscrowError> {
        let state = Self::get_state(env.clone()).ok_or(EscrowError::NotInitialized)?;

        admin.require_auth();

        if admin != state.admin {
            return Err(EscrowError::Unauthorized);
        }

        env.storage()
            .instance()
            .set(&crate::types::DataKey::PendingAdmin, &new_admin);
        env.storage().instance().extend_ttl(500000, 500000);

        events::admin_proposed(&env, admin, new_admin);
        Ok(())
    }

    /// Accept admin role (pending admin only).
    pub fn accept_admin(env: Env, new_admin: Address) -> Result<(), EscrowError> {
        let mut state = Self::get_state(env.clone()).ok_or(EscrowError::NotInitialized)?;

        new_admin.require_auth();

        let pending_admin: Address = env
            .storage()
            .instance()
            .get(&crate::types::DataKey::PendingAdmin)
            .ok_or(EscrowError::NoPendingAdmin)?;

        if new_admin != pending_admin {
            return Err(EscrowError::NotPendingAdmin);
        }

        let old_admin = state.admin.clone();
        state.admin = new_admin.clone();

        env.storage()
            .instance()
            .set(&crate::types::DataKey::State, &state);
        env.storage().instance().extend_ttl(500000, 500000);
        env.storage()
            .instance()
            .remove(&crate::types::DataKey::PendingAdmin);

        events::admin_transferred(&env, old_admin, new_admin);
        Ok(())
    }

    /// Get the pending admin address if any.
    pub fn get_pending_admin(env: Env) -> Option<Address> {
        env.storage()
            .instance()
            .get(&crate::types::DataKey::PendingAdmin)
    }

    /// Create a new escrow.
    ///
    /// CHECKS:
    /// - Amount must be positive
    /// - All addresses must be distinct
    ///
    /// EFFECTS:
    /// - Creates new Escrow with Pending status
    /// - Stores escrow in persistent storage
    /// - Increments escrow counter
    ///
    /// INTERACTIONS:
    /// - Token transfer from depositor to escrow contract happens in fund_escrow
    pub fn create(
        env: Env,
        depositor: Address,
        beneficiary: Address,
        arbiter: Address,
        amount: i128,
        token: Address,
    ) -> Result<BytesN<32>, EscrowError> {
        // CHECKS: Validate inputs
        if amount <= 0 {
            return Err(EscrowError::InsufficientFunds);
        }

        // Ensure all parties are distinct
        if depositor == beneficiary || depositor == arbiter || beneficiary == arbiter {
            return Err(EscrowError::InvalidSigner);
        }

        // Generate unique escrow ID from hash of parameters
        let mut data = soroban_sdk::Bytes::new(&env);
        data.append(&depositor.clone().to_xdr(&env));
        data.append(&beneficiary.clone().to_xdr(&env));
        data.append(&arbiter.clone().to_xdr(&env));
        data.append(&amount.to_xdr(&env));
        data.append(&token.clone().to_xdr(&env));
        data.append(&env.ledger().timestamp().to_xdr(&env));

        let escrow_id: BytesN<32> = env.crypto().sha256(&data).into();

        // EFFECTS: Create and save escrow
        let escrow = Escrow {
            id: escrow_id.clone(),
            depositor: depositor.clone(),
            beneficiary: beneficiary.clone(),
            arbiter: arbiter.clone(),
            amount,
            token,
            status: EscrowStatus::Pending,
            created_at: env.ledger().timestamp(),
            timeout_days: EscrowStorage::get_timeout_config(&env).escrow_timeout_days,
            disputed_at: None,
            dispute_reason: None,
        };

        EscrowStorage::save(&env, &escrow);
        EscrowStorage::increment_count(&env);

        Ok(escrow_id)
    }

    /// Fund an existing escrow by depositing funds.
    /// Transitions status from Pending to Funded.
    ///
    /// CHECKS:
    /// - Escrow must exist
    /// - Escrow must be in Pending state
    /// - Caller must be depositor
    ///
    /// EFFECTS:
    /// - Update escrow status to Funded
    ///
    /// INTERACTIONS:
    /// - Token transfer from depositor to escrow contract
    pub fn fund_escrow(
        env: Env,
        escrow_id: BytesN<32>,
        caller: Address,
    ) -> Result<(), EscrowError> {
        // CHECKS: Get and validate escrow
        let mut escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        // Verify caller is depositor
        AccessControl::is_depositor(&escrow, &caller)?;

        // Verify escrow is in Pending state
        if escrow.status != EscrowStatus::Pending {
            return Err(EscrowError::InvalidState);
        }

        // Authorize the deposit
        caller.require_auth();

        // EFFECTS: Update status
        escrow.status = EscrowStatus::Funded;
        EscrowStorage::save(&env, &escrow);

        // INTERACTIONS: Token transfer from depositor to escrow contract
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(&caller, env.current_contract_address(), &escrow.amount);

        Ok(())
    }

    /// Approve release of funds to a target address.
    /// Implements 2-of-3 multi-sig: executes transfer when ≥2 unique signers approve same target.
    ///
    /// CHECKS:
    /// - Escrow must exist and be Funded (or Disputed if arbiter)
    /// - Caller must be a valid party
    /// - Release target must be beneficiary or depositor
    /// - Caller must not have already approved this same target
    ///
    /// EFFECTS:
    /// - Add approval to storage
    /// - Count approvals; if ≥2 unique parties approve same target, update escrow status
    /// - Clear approvals after execution
    ///
    /// INTERACTIONS:
    /// - Token transfer after all state updates
    pub fn approve_release(
        env: Env,
        escrow_id: BytesN<32>,
        caller: Address,
        release_to: Address,
    ) -> Result<(), EscrowError> {
        // CHECKS: Get and validate escrow
        let escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        // Verify caller is a valid party
        AccessControl::is_party(&escrow, &caller)?;

        // Verify escrow is in Funded state
        if escrow.status != EscrowStatus::Funded {
            return Err(EscrowError::InvalidState);
        }

        // Authorize the approval
        caller.require_auth();

        // Rate limiting check
        rate_limit::check_rate_limit(&env, &caller, "approve_release")?;

        // Verify release target is valid (must be beneficiary or depositor)
        if release_to != escrow.beneficiary && release_to != escrow.depositor {
            return Err(EscrowError::InvalidApprovalTarget);
        }

        // Check for duplicate approval using O(1) storage lookup
        if EscrowStorage::has_signer_approved(&env, &escrow_id, &caller, &release_to) {
            return Err(EscrowError::AlreadySigned);
        }

        // EFFECTS: Record the approval flag and increment the counter
        EscrowStorage::set_signer_approved(&env, &escrow_id, &caller, &release_to);
        EscrowStorage::increment_approval_count(&env, &escrow_id, &release_to);

        // Also persist the approval record for audit trail
        let new_approval = ReleaseApproval {
            signer: caller.clone(),
            release_to: release_to.clone(),
            timestamp: env.ledger().timestamp(),
        };
        EscrowStorage::add_approval(&env, &escrow_id, new_approval);

        // Read the updated count via O(1) lookup
        let approval_count =
            EscrowStorage::get_approval_count_for_target(&env, &escrow_id, &release_to);

        // If 2 or more unique signers approve, execute release
        if approval_count >= 2 {
            let mut escrow_to_update =
                EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

            // Determine final status based on release target
            escrow_to_update.status = EscrowStatus::Released;
            EscrowStorage::save(&env, &escrow_to_update);

            // Clear approvals and counters after execution
            EscrowStorage::clear_approvals(&env, &escrow_id);
            let targets = [escrow.beneficiary.clone(), escrow.depositor.clone()];
            let signers = [
                escrow.depositor.clone(),
                escrow.beneficiary.clone(),
                escrow.arbiter.clone(),
            ];
            EscrowStorage::clear_approval_counts(&env, &escrow_id, &targets, &signers);

            // INTERACTIONS: Token transfer from escrow contract to release target
            let token_client = token::Client::new(&env, &escrow.token);
            token_client.transfer(&env.current_contract_address(), &release_to, &escrow.amount);
        }

        Ok(())
    }

    /// Set up a dispute on an escrow.
    pub fn initiate_dispute(
        env: Env,
        escrow_id: BytesN<32>,
        caller: Address,
        reason: soroban_sdk::String,
    ) -> Result<(), EscrowError> {
        DisputeHandler::initiate_dispute(env, escrow_id, caller, reason)
    }

    /// Resolve a dispute by releasing funds to a target.
    pub fn resolve_dispute(
        env: Env,
        escrow_id: BytesN<32>,
        caller: Address,
        release_to: Address,
    ) -> Result<(), EscrowError> {
        DisputeHandler::resolve_dispute(env, escrow_id, caller, release_to)
    }

    /// Refund escrow to depositor if escrow timeout has elapsed.
    /// Intended for stale escrows that are not released yet.
    pub fn release_escrow_on_timeout(env: Env, escrow_id: BytesN<32>) -> Result<(), EscrowError> {
        let mut escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        if escrow.status != EscrowStatus::Pending && escrow.status != EscrowStatus::Funded {
            return Err(EscrowError::InvalidState);
        }

        let timeout_seconds = escrow.timeout_days.saturating_mul(86_400);
        let deadline = escrow.created_at.saturating_add(timeout_seconds);
        let now = env.ledger().timestamp();
        if now <= deadline {
            return Err(EscrowError::TimeoutNotReached);
        }

        escrow.status = EscrowStatus::Refunded;
        EscrowStorage::save(&env, &escrow);

        EscrowStorage::clear_approvals(&env, &escrow_id);
        let targets = [escrow.beneficiary.clone(), escrow.depositor.clone()];
        let signers = [
            escrow.depositor.clone(),
            escrow.beneficiary.clone(),
            escrow.arbiter.clone(),
        ];
        EscrowStorage::clear_approval_counts(&env, &escrow_id, &targets, &signers);

        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.depositor,
            &escrow.amount,
        );

        events::escrow_timeout(&env, escrow_id);
        Ok(())
    }

    /// Resolve disputed escrow on timeout by auto-refunding the depositor.
    pub fn resolve_dispute_on_timeout(env: Env, escrow_id: BytesN<32>) -> Result<(), EscrowError> {
        DisputeHandler::resolve_dispute_on_timeout(env, escrow_id)
    }

    /// Set contract-level timeout config.
    pub fn set_timeout_config(
        env: Env,
        caller: Address,
        config: TimeoutConfig,
    ) -> Result<(), EscrowError> {
        let state = Self::get_state(env.clone()).ok_or(EscrowError::NotInitialized)?;

        caller.require_auth();

        if caller != state.admin {
            return Err(EscrowError::Unauthorized);
        }

        if config.escrow_timeout_days == 0
            || config.dispute_timeout_days == 0
            || config.payment_timeout_days == 0
        {
            return Err(EscrowError::InvalidTimeoutConfig);
        }

        EscrowStorage::set_timeout_config(&env, &config);
        Ok(())
    }

    /// Get contract-level timeout config.
    pub fn get_timeout_config(env: Env) -> TimeoutConfig {
        EscrowStorage::get_timeout_config(&env)
    }

    /// Get details of an escrow.
    /// Read-only view function.
    pub fn get_escrow(env: Env, escrow_id: BytesN<32>) -> Result<Escrow, EscrowError> {
        EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)
    }

    /// Get approval count for a specific release target.
    /// Returns number of unique signers approving release to a specific address.
    /// Uses O(1) dedicated counter storage instead of iterating the approvals list.
    pub fn get_approval_count(
        env: Env,
        escrow_id: BytesN<32>,
        release_to: Address,
    ) -> Result<u32, EscrowError> {
        // Verify escrow exists
        EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;
        Ok(EscrowStorage::get_approval_count_for_target(
            &env,
            &escrow_id,
            &release_to,
        ))
    }

    /// Approve a partial release or deduction without auto-executing.
    ///
    /// The approval is bound to the exact `(release_to, amount)` pair it authorizes, so a
    /// signature for "refund `amount` to the depositor" can no longer be replayed by anyone
    /// to move a different value or pay a different party. `release_escrow_partial` and
    /// `release_with_deduction` only proceed when 2-of-3 parties approved the precise
    /// recipient and amount they are about to move.
    ///
    /// For `release_with_deduction`, approve `(beneficiary, damage_amount)` — that is the
    /// value leaving the escrow to the counterparty; the remainder refunds the depositor.
    pub fn approve_partial_release(
        env: Env,
        escrow_id: BytesN<32>,
        caller: Address,
        release_to: Address,
        amount: i128,
    ) -> Result<(), EscrowError> {
        // CHECKS: Get and validate escrow
        let escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        // Verify caller is a valid party
        AccessControl::is_party(&escrow, &caller)?;

        // Verify escrow is in Funded state
        if escrow.status != EscrowStatus::Funded {
            return Err(EscrowError::InvalidState);
        }

        // Authorize the approval
        caller.require_auth();

        // Verify release target is valid (must be beneficiary or depositor)
        if release_to != escrow.beneficiary && release_to != escrow.depositor {
            return Err(EscrowError::InvalidApprovalTarget);
        }

        // A negative approval amount is meaningless (a deduction may legitimately approve 0).
        // The release functions remain the authoritative bound against the escrow balance.
        if amount < 0 {
            return Err(EscrowError::InvalidAmount);
        }

        // Check for duplicate approval of this exact (release_to, amount) pair.
        if EscrowStorage::has_signer_approved_amount(&env, &escrow_id, &caller, &release_to, amount)
        {
            return Err(EscrowError::AlreadySigned);
        }

        // EFFECTS: Record the amount-bound approval flag and increment the counter.
        EscrowStorage::set_signer_approved_amount(&env, &escrow_id, &caller, &release_to, amount);
        EscrowStorage::increment_amount_approval_count(&env, &escrow_id, &release_to, amount);

        // Also persist the approval record for audit trail
        let new_approval = ReleaseApproval {
            signer: caller.clone(),
            release_to: release_to.clone(),
            timestamp: env.ledger().timestamp(),
        };
        EscrowStorage::add_approval(&env, &escrow_id, new_approval);

        Ok(())
    }

    /// Release a partial amount from escrow to a recipient.
    /// Requires multi-sig approval (2-of-3) via approve_partial_release bound to the exact
    /// `(recipient, amount)` being moved.
    ///
    /// CHECKS:
    /// - Caller must be a party (depositor, beneficiary, or arbiter) and authenticate
    /// - Escrow must exist and be Funded
    /// - Amount must be positive and not exceed escrow balance
    /// - Recipient must be beneficiary or depositor
    /// - Reason must not be empty
    /// - Must have 2-of-3 approval for this exact (recipient, amount)
    ///
    /// EFFECTS:
    /// - Update escrow amount
    /// - Record release in history
    /// - Clear approvals after execution
    /// - Emit PartialRelease event
    ///
    /// INTERACTIONS:
    /// - Token transfer after all state updates
    pub fn release_escrow_partial(
        env: Env,
        escrow_id: BytesN<32>,
        caller: Address,
        amount: i128,
        recipient: Address,
        reason: soroban_sdk::String,
    ) -> Result<(), EscrowError> {
        // CHECKS: Get and validate escrow
        let mut escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        // Verify the executor is a party to this escrow and authenticate them, so an
        // unrelated address cannot trigger fund movement once approvals exist.
        AccessControl::is_party(&escrow, &caller)?;
        caller.require_auth();

        // Verify escrow is in Funded state
        if escrow.status != EscrowStatus::Funded {
            return Err(EscrowError::InvalidState);
        }

        // Validate amount
        if amount <= 0 {
            return Err(EscrowError::InvalidAmount);
        }

        if amount > escrow.amount {
            return Err(EscrowError::InsufficientFunds);
        }

        // Validate recipient
        if recipient != escrow.beneficiary && recipient != escrow.depositor {
            return Err(EscrowError::InvalidRelease);
        }

        // Validate reason
        if reason.is_empty() {
            return Err(EscrowError::EmptyReleaseReason);
        }

        // Check for 2-of-3 approval bound to this exact (recipient, amount).
        let approval_count =
            EscrowStorage::get_amount_approval_count(&env, &escrow_id, &recipient, amount);
        if approval_count < 2 {
            return Err(EscrowError::NotAuthorized);
        }

        // EFFECTS: Update escrow amount
        escrow.amount -= amount;
        EscrowStorage::save(&env, &escrow);

        // Record release in history
        let release_record = ReleaseRecord {
            escrow_id: escrow_id.clone(),
            amount,
            recipient: recipient.clone(),
            released_at: env.ledger().timestamp(),
            reason: reason.clone(),
        };
        EscrowStorage::add_release_record(&env, &escrow_id, release_record);

        // Clear approvals after execution so the same signatures cannot be replayed.
        EscrowStorage::clear_approvals(&env, &escrow_id);
        let signers = [
            escrow.depositor.clone(),
            escrow.beneficiary.clone(),
            escrow.arbiter.clone(),
        ];
        EscrowStorage::clear_amount_approval(&env, &escrow_id, &recipient, amount, &signers);

        // INTERACTIONS: Token transfer
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(&env.current_contract_address(), &recipient, &amount);

        // Emit event
        events::partial_release(&env, escrow_id, amount, recipient);

        Ok(())
    }

    /// Release escrow with damage deduction.
    /// Deducts damage amount and releases the remainder to the depositor (guest).
    /// The damage amount goes to the beneficiary (landlord).
    /// Requires multi-sig approval (2-of-3) bound to the exact value paid to the beneficiary.
    ///
    /// CHECKS:
    /// - Caller must be a party (depositor, beneficiary, or arbiter) and authenticate
    /// - Escrow must exist and be Funded
    /// - Damage amount must be non-negative and not exceed escrow balance
    /// - Reason must not be empty
    /// - Must have 2-of-3 approval for paying exactly `damage_amount` to the beneficiary
    ///
    /// EFFECTS:
    /// - Update escrow status to Released
    /// - Record both releases in history
    /// - Clear approvals after execution
    /// - Emit DamageDeduction event
    ///
    /// INTERACTIONS:
    /// - Two token transfers after all state updates
    pub fn release_with_deduction(
        env: Env,
        escrow_id: BytesN<32>,
        caller: Address,
        damage_amount: i128,
        reason: soroban_sdk::String,
    ) -> Result<(), EscrowError> {
        // CHECKS: Get and validate escrow
        let mut escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        // Verify the executor is a party to this escrow and authenticate them, so an
        // unrelated address cannot trigger fund movement once approvals exist.
        AccessControl::is_party(&escrow, &caller)?;
        caller.require_auth();

        // Verify escrow is in Funded state
        if escrow.status != EscrowStatus::Funded {
            return Err(EscrowError::InvalidState);
        }

        // Validate damage amount
        if damage_amount < 0 {
            return Err(EscrowError::InvalidAmount);
        }

        if damage_amount > escrow.amount {
            return Err(EscrowError::InsufficientFunds);
        }

        // Validate reason
        if reason.is_empty() {
            return Err(EscrowError::EmptyReleaseReason);
        }

        // Check for 2-of-3 approval bound to paying exactly `damage_amount` to the
        // beneficiary. Previously this read approvals for the depositor while paying the
        // beneficiary, so a quorum that approved a refund-to-depositor could be silently
        // redirected into a damage payout to the beneficiary. Binding the approval to the
        // actual recipient and amount of the contested transfer closes that redirect.
        let approval_count = EscrowStorage::get_amount_approval_count(
            &env,
            &escrow_id,
            &escrow.beneficiary,
            damage_amount,
        );
        if approval_count < 2 {
            return Err(EscrowError::NotAuthorized);
        }

        // Calculate refund amount
        let refund_amount = escrow.amount - damage_amount;

        // EFFECTS: Update escrow status (all funds will be released)
        escrow.status = EscrowStatus::Released;
        EscrowStorage::save(&env, &escrow);

        // Record damage deduction release in history
        if damage_amount > 0 {
            let damage_record = ReleaseRecord {
                escrow_id: escrow_id.clone(),
                amount: damage_amount,
                recipient: escrow.beneficiary.clone(),
                released_at: env.ledger().timestamp(),
                reason: reason.clone(),
            };
            EscrowStorage::add_release_record(&env, &escrow_id, damage_record);
        }

        // Record refund release in history
        if refund_amount > 0 {
            let refund_record = ReleaseRecord {
                escrow_id: escrow_id.clone(),
                amount: refund_amount,
                recipient: escrow.depositor.clone(),
                released_at: env.ledger().timestamp(),
                reason: soroban_sdk::String::from_str(&env, "Refund after damage deduction"),
            };
            EscrowStorage::add_release_record(&env, &escrow_id, refund_record);
        }

        // Clear approvals after execution so the same signatures cannot be replayed.
        EscrowStorage::clear_approvals(&env, &escrow_id);
        let signers = [
            escrow.depositor.clone(),
            escrow.beneficiary.clone(),
            escrow.arbiter.clone(),
        ];
        EscrowStorage::clear_amount_approval(
            &env,
            &escrow_id,
            &escrow.beneficiary,
            damage_amount,
            &signers,
        );

        // INTERACTIONS: Token transfers
        let token_client = token::Client::new(&env, &escrow.token);

        // Transfer damage amount to landlord (beneficiary)
        if damage_amount > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &escrow.beneficiary,
                &damage_amount,
            );
        }

        // Transfer refund to tenant (depositor)
        if refund_amount > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &escrow.depositor,
                &refund_amount,
            );
        }

        // Emit event
        events::damage_deduction(&env, escrow_id, damage_amount, refund_amount);

        Ok(())
    }

    /// Get release history for an escrow.
    /// Returns all partial releases that have been made.
    pub fn get_release_history(
        env: Env,
        escrow_id: BytesN<32>,
    ) -> Result<soroban_sdk::Vec<ReleaseRecord>, EscrowError> {
        // Verify escrow exists
        EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;
        Ok(EscrowStorage::get_release_history(&env, &escrow_id))
    }
}
