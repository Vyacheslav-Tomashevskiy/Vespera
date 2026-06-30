#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, String};

mod errors;
mod events;
mod property;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use errors::PropertyError;
pub use property::{
    get_property, get_property_count, has_property, reassign_property, register_property,
    remove_property, revoke_verification, verify_property,
};
pub use storage::DataKey;
pub use types::{ContractState, PauseState, PropertyDetails};

#[contract]
pub struct PropertyRegistryContract;

#[contractimpl]
impl PropertyRegistryContract {
    /// Initialize the contract with an admin address.
    ///
    /// # Arguments
    /// * `admin` - The address that will have admin privileges to verify properties
    ///
    /// # Errors
    /// * `AlreadyInitialized` - If the contract has already been initialized
    pub fn initialize(env: Env, admin: Address) -> Result<(), PropertyError> {
        if env.storage().persistent().has(&DataKey::Initialized) {
            return Err(PropertyError::AlreadyInitialized);
        }

        admin.require_auth();

        env.storage().persistent().set(&DataKey::Initialized, &true);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Initialized, 500000, 500000);

        let state = ContractState {
            admin: admin.clone(),
            initialized: true,
        };

        env.storage().instance().set(&DataKey::State, &state);
        env.storage().instance().extend_ttl(500000, 500000);

        events::contract_initialized(&env, admin);

        Ok(())
    }

    /// Get the current contract state.
    ///
    /// # Returns
    /// * `Option<ContractState>` - The contract state if initialized
    pub fn get_state(env: Env) -> Option<ContractState> {
        env.storage().instance().get(&DataKey::State)
    }

    /// Register a new property on-chain.
    ///
    /// # Arguments
    /// * `landlord` - The address of the property owner
    /// * `property_id` - A unique identifier for the property
    /// * `metadata_hash` - IPFS hash or other reference to property metadata
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract hasn't been initialized
    /// * `PropertyAlreadyExists` - If a property with this ID already exists
    /// * `InvalidPropertyId` - If the property ID is empty
    /// * `InvalidMetadata` - If the metadata hash is empty
    pub fn register_property(
        env: Env,
        landlord: Address,
        property_id: String,
        metadata_hash: String,
    ) -> Result<(), PropertyError> {
        property::register_property(&env, landlord, property_id, metadata_hash)
    }

    /// Verify a registered property (admin only).
    ///
    /// # Arguments
    /// * `admin` - The admin address performing the verification
    /// * `property_id` - The ID of the property to verify
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract hasn't been initialized
    /// * `Unauthorized` - If the caller is not the admin
    /// * `PropertyNotFound` - If the property doesn't exist
    /// * `AlreadyVerified` - If the property is already verified
    pub fn verify_property(
        env: Env,
        admin: Address,
        property_id: String,
    ) -> Result<(), PropertyError> {
        property::verify_property(&env, admin, property_id)
    }

    /// Remove a registered property (admin only).
    ///
    /// Clears a squatted or fraudulent record and frees the `property_id` so it
    /// can be re-registered by the rightful owner.
    ///
    /// # Arguments
    /// * `admin` - The admin address performing the removal
    /// * `property_id` - The ID of the property to remove
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract hasn't been initialized
    /// * `Unauthorized` - If the caller is not the admin
    /// * `PropertyNotFound` - If the property doesn't exist
    pub fn remove_property(
        env: Env,
        admin: Address,
        property_id: String,
    ) -> Result<(), PropertyError> {
        property::remove_property(&env, admin, property_id)
    }

    /// Reassign a property to a new landlord (admin only).
    ///
    /// Resolves a squatting dispute in place: ownership moves to `new_landlord`,
    /// the metadata is refreshed and verification is reset.
    ///
    /// # Arguments
    /// * `admin` - The admin address performing the reassignment
    /// * `property_id` - The ID of the property to reassign
    /// * `new_landlord` - The address of the new property owner
    /// * `metadata_hash` - Updated metadata reference for the property
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract hasn't been initialized
    /// * `Unauthorized` - If the caller is not the admin
    /// * `InvalidMetadata` - If the metadata hash is empty
    /// * `PropertyNotFound` - If the property doesn't exist
    /// * `InvalidLandlord` - If `new_landlord` is already the current landlord
    pub fn reassign_property(
        env: Env,
        admin: Address,
        property_id: String,
        new_landlord: Address,
        metadata_hash: String,
    ) -> Result<(), PropertyError> {
        property::reassign_property(&env, admin, property_id, new_landlord, metadata_hash)
    }

    /// Revoke a property's verification (admin only).
    ///
    /// # Arguments
    /// * `admin` - The admin address performing the revocation
    /// * `property_id` - The ID of the property whose verification to revoke
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract hasn't been initialized
    /// * `Unauthorized` - If the caller is not the admin
    /// * `PropertyNotFound` - If the property doesn't exist
    /// * `NotVerified` - If the property is not currently verified
    pub fn revoke_verification(
        env: Env,
        admin: Address,
        property_id: String,
    ) -> Result<(), PropertyError> {
        property::revoke_verification(&env, admin, property_id)
    }

    /// Get details of a registered property.
    ///
    /// # Arguments
    /// * `property_id` - The ID of the property to retrieve
    ///
    /// # Returns
    /// * `Option<PropertyDetails>` - The property details if it exists
    pub fn get_property(env: Env, property_id: String) -> Option<PropertyDetails> {
        property::get_property(&env, property_id)
    }

    /// Check if a property exists in the registry.
    ///
    /// # Arguments
    /// * `property_id` - The ID of the property to check
    ///
    /// # Returns
    /// * `bool` - True if the property exists
    pub fn has_property(env: Env, property_id: String) -> bool {
        property::has_property(&env, property_id)
    }

    /// Get the total count of registered properties.
    ///
    /// # Returns
    /// * `u32` - The total number of properties registered
    pub fn get_property_count(env: Env) -> u32 {
        property::get_property_count(&env)
    }

    /// Pause the contract (admin only).
    ///
    /// # Arguments
    /// * `admin` - The admin address performing the pause
    /// * `reason` - The reason for pausing
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract hasn't been initialized
    /// * `Unauthorized` - If the caller is not the admin
    /// * `AlreadyPaused` - If the contract is already paused
    pub fn pause(env: Env, admin: Address, reason: String) -> Result<(), PropertyError> {
        let state = Self::get_state(env.clone()).ok_or(PropertyError::NotInitialized)?;

        admin.require_auth();

        if admin != state.admin {
            return Err(PropertyError::Unauthorized);
        }

        if Self::is_paused(env.clone()) {
            return Err(PropertyError::AlreadyPaused);
        }

        let pause_state = PauseState {
            is_paused: true,
            paused_at: env.ledger().timestamp(),
            paused_by: admin.clone(),
            pause_reason: reason.clone(),
        };

        env.storage()
            .instance()
            .set(&DataKey::PauseState, &pause_state);
        env.storage().instance().extend_ttl(500000, 500000);

        events::paused(&env, reason, admin);
        Ok(())
    }

    /// Unpause the contract (admin only).
    ///
    /// # Arguments
    /// * `admin` - The admin address performing the unpause
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract hasn't been initialized
    /// * `Unauthorized` - If the caller is not the admin
    /// * `NotPaused` - If the contract is not paused
    pub fn unpause(env: Env, admin: Address) -> Result<(), PropertyError> {
        let state = Self::get_state(env.clone()).ok_or(PropertyError::NotInitialized)?;

        admin.require_auth();

        if admin != state.admin {
            return Err(PropertyError::Unauthorized);
        }

        if !Self::is_paused(env.clone()) {
            return Err(PropertyError::NotPaused);
        }

        env.storage().instance().remove(&DataKey::PauseState);

        events::unpaused(&env, admin);
        Ok(())
    }

    /// Check if the contract is paused.
    ///
    /// # Returns
    /// * `bool` - True if the contract is paused
    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get::<DataKey, PauseState>(&DataKey::PauseState)
            .map(|ps| ps.is_paused)
            .unwrap_or(false)
    }

    /// Propose a new admin (two-step transfer, current admin only).
    ///
    /// # Arguments
    /// * `admin` - The current admin address
    /// * `new_admin` - The address of the proposed new admin
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract hasn't been initialized
    /// * `Unauthorized` - If the caller is not the current admin
    pub fn propose_admin(
        env: Env,
        admin: Address,
        new_admin: Address,
    ) -> Result<(), PropertyError> {
        let state = Self::get_state(env.clone()).ok_or(PropertyError::NotInitialized)?;

        admin.require_auth();

        if admin != state.admin {
            return Err(PropertyError::Unauthorized);
        }

        env.storage()
            .instance()
            .set(&DataKey::PendingAdmin, &new_admin);
        env.storage().instance().extend_ttl(500000, 500000);

        events::admin_proposed(&env, admin, new_admin);
        Ok(())
    }

    /// Accept admin role (pending admin only).
    ///
    /// # Arguments
    /// * `new_admin` - The pending admin address accepting the role
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract hasn't been initialized
    /// * `NoPendingAdmin` - If there's no pending admin transfer
    /// * `NotPendingAdmin` - If the caller is not the pending admin
    pub fn accept_admin(env: Env, new_admin: Address) -> Result<(), PropertyError> {
        let mut state = Self::get_state(env.clone()).ok_or(PropertyError::NotInitialized)?;

        new_admin.require_auth();

        let pending_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::PendingAdmin)
            .ok_or(PropertyError::NoPendingAdmin)?;

        if new_admin != pending_admin {
            return Err(PropertyError::NotPendingAdmin);
        }

        let old_admin = state.admin.clone();
        state.admin = new_admin.clone();

        env.storage().instance().set(&DataKey::State, &state);
        env.storage().instance().extend_ttl(500000, 500000);
        env.storage().instance().remove(&DataKey::PendingAdmin);

        events::admin_transferred(&env, old_admin, new_admin);
        Ok(())
    }

    /// Get the pending admin address if any.
    ///
    /// # Returns
    /// * `Option<Address>` - The pending admin address if one is set
    pub fn get_pending_admin(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::PendingAdmin)
    }
}
