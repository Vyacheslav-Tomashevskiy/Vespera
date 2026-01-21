#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, String};

use crate::types::{DataKey, Error};

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

    /// Internal helper to check if contract is initialized (for future use)
    fn check_initialized(env: &Env) -> Result<(), Error> {
        if !env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::NotInitialized);
        }
        Ok(())
    }
}
mod test;
mod types;
