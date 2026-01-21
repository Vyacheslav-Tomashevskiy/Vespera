#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, token, Address, Env, String};

use crate::types::{AgreementStatus, DataKey, Error, RentAgreement};

#[contract]
pub struct ChiomaContract;

#[contractimpl]
impl ChiomaContract {
    /// Initializes the protocol with an admin address and resets all counters.
    /// Can only be called once.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }

        // Persist admin
        env.storage().instance().set(&DataKey::Admin, &admin);

        // Initialize counters to 0
        env.storage()
            .instance()
            .set(&DataKey::AgreementCount, &0u32);
        env.storage().instance().set(&DataKey::PaymentCount, &0u32);
        env.storage().instance().set(&DataKey::DisputeCount, &0u32);

        Ok(())
    }

    /// Returns the current protocol version for auditing and tooling.
    pub fn version(env: Env) -> String {
        String::from_str(&env, "1.0.0")
    }

    /// Internally helper to check if contract is initialized (for future use)
    fn check_initialized(env: &Env) -> Result<(), Error> {
        if !env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::NotInitialized);
        }
        Ok(())
    }

    /// Deposits security deposit and activates the agreement.
    pub fn deposit_security(
        env: Env,
        agreement_id: String,
        token: Address,
        amount: i128,
    ) -> Result<(), Error> {
        ChiomaContract::check_initialized(&env)?;

        let key = DataKey::Agreement(agreement_id.clone());
        let mut agreement: RentAgreement = env
            .storage()
            .instance()
            .get(&key)
            .ok_or(Error::AgreementNotFound)?;

        if agreement.status != AgreementStatus::Draft {
            return Err(Error::InvalidStatus);
        }

        if amount != agreement.security_deposit {
            return Err(Error::InvalidAmount);
        }

        agreement.tenant.require_auth();

        let client = token::Client::new(&env, &token);
        client.transfer(&agreement.tenant, &env.current_contract_address(), &amount);

        agreement.status = AgreementStatus::Active;
        agreement.escrow_balance = amount;

        env.storage().instance().set(&key, &agreement);

        env.events()
            .publish((symbol_short!("activate"), agreement_id), amount);

        Ok(())
    }
}

#[contractimpl]
#[cfg(any(test, feature = "testutils"))]
impl ChiomaContract {
    pub fn test_set_agreement(env: Env, agreement: RentAgreement) {
        let key = DataKey::Agreement(agreement.agreement_id.clone());
        env.storage().instance().set(&key, &agreement);
    }

    pub fn test_get_agreement(env: Env, agreement_id: String) -> RentAgreement {
        let key = DataKey::Agreement(agreement_id);
        env.storage().instance().get(&key).unwrap()
    }
}
mod test;
mod types;
