use soroban_sdk::{Address, Env, String};

use crate::errors::PropertyError;
use crate::events;
use crate::storage::DataKey;
use crate::types::{ContractState, PauseState, PropertyDetails};

fn check_paused(env: &Env) -> Result<(), PropertyError> {
    if env
        .storage()
        .instance()
        .get::<DataKey, PauseState>(&DataKey::PauseState)
        .map(|ps| ps.is_paused)
        .unwrap_or(false)
    {
        return Err(PropertyError::ContractPaused);
    }
    Ok(())
}

/// Load the contract state and assert the caller is the current admin.
///
/// Returns the loaded `ContractState` so callers can reuse it without a second
/// storage read.
fn require_admin(env: &Env, admin: &Address) -> Result<ContractState, PropertyError> {
    let state: ContractState = env
        .storage()
        .instance()
        .get(&DataKey::State)
        .ok_or(PropertyError::NotInitialized)?;

    admin.require_auth();

    if *admin != state.admin {
        return Err(PropertyError::Unauthorized);
    }

    Ok(state)
}

pub fn register_property(
    env: &Env,
    landlord: Address,
    property_id: String,
    metadata_hash: String,
) -> Result<(), PropertyError> {
    if !env.storage().persistent().has(&DataKey::Initialized) {
        return Err(PropertyError::NotInitialized);
    }

    check_paused(env)?;

    landlord.require_auth();

    if property_id.is_empty() {
        return Err(PropertyError::InvalidPropertyId);
    }

    if metadata_hash.is_empty() {
        return Err(PropertyError::InvalidMetadata);
    }

    let key = DataKey::Property(property_id.clone());
    if env.storage().persistent().has(&key) {
        return Err(PropertyError::PropertyAlreadyExists);
    }

    let property = PropertyDetails {
        property_id: property_id.clone(),
        landlord: landlord.clone(),
        metadata_hash: metadata_hash.clone(),
        verified: false,
        registered_at: env.ledger().timestamp(),
        verified_at: None,
    };

    env.storage().persistent().set(&key, &property);
    env.storage().persistent().extend_ttl(&key, 500000, 500000);

    let count_key = DataKey::PropertyCount;
    let count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
    env.storage().persistent().set(&count_key, &(count + 1));
    env.storage()
        .persistent()
        .extend_ttl(&count_key, 500000, 500000);

    events::property_registered(env, property_id, landlord, metadata_hash);

    Ok(())
}

pub fn verify_property(
    env: &Env,
    admin: Address,
    property_id: String,
) -> Result<(), PropertyError> {
    let state: ContractState = env
        .storage()
        .instance()
        .get(&DataKey::State)
        .ok_or(PropertyError::NotInitialized)?;

    check_paused(env)?;

    admin.require_auth();

    if admin != state.admin {
        return Err(PropertyError::Unauthorized);
    }

    let key = DataKey::Property(property_id.clone());
    let mut property: PropertyDetails = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(PropertyError::PropertyNotFound)?;

    if property.verified {
        return Err(PropertyError::AlreadyVerified);
    }

    property.verified = true;
    property.verified_at = Some(env.ledger().timestamp());

    env.storage().persistent().set(&key, &property);
    env.storage().persistent().extend_ttl(&key, 500000, 500000);

    events::property_verified(env, property_id, admin);

    Ok(())
}

/// Remove a registered property (admin only).
///
/// Frees the `property_id` namespace slot so a squatted or fraudulent record can
/// be cleared and the id re-registered by the rightful owner. Decrements the
/// property count.
///
/// Admin recovery is intentionally **not** gated by the pause switch: the admin
/// must be able to clean up fraudulent records even while the contract is paused
/// for an incident.
pub fn remove_property(
    env: &Env,
    admin: Address,
    property_id: String,
) -> Result<(), PropertyError> {
    let _state = require_admin(env, &admin)?;

    let key = DataKey::Property(property_id.clone());
    if !env.storage().persistent().has(&key) {
        return Err(PropertyError::PropertyNotFound);
    }

    env.storage().persistent().remove(&key);

    let count_key = DataKey::PropertyCount;
    let count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
    env.storage()
        .persistent()
        .set(&count_key, &count.saturating_sub(1));
    env.storage()
        .persistent()
        .extend_ttl(&count_key, 500000, 500000);

    events::property_removed(env, property_id, admin);

    Ok(())
}

/// Reassign a property to a different landlord (admin only).
///
/// Resolves a squatting dispute in place: the record keeps its `property_id` and
/// original registration timestamp, but ownership moves to `new_landlord`, the
/// metadata is refreshed, and verification is reset (the new owner must be
/// re-verified). Not gated by the pause switch (see [`remove_property`]).
pub fn reassign_property(
    env: &Env,
    admin: Address,
    property_id: String,
    new_landlord: Address,
    metadata_hash: String,
) -> Result<(), PropertyError> {
    let _state = require_admin(env, &admin)?;

    if metadata_hash.is_empty() {
        return Err(PropertyError::InvalidMetadata);
    }

    let key = DataKey::Property(property_id.clone());
    let mut property: PropertyDetails = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(PropertyError::PropertyNotFound)?;

    if new_landlord == property.landlord {
        return Err(PropertyError::InvalidLandlord);
    }

    let old_landlord = property.landlord.clone();
    property.landlord = new_landlord.clone();
    property.metadata_hash = metadata_hash;
    property.verified = false;
    property.verified_at = None;

    env.storage().persistent().set(&key, &property);
    env.storage().persistent().extend_ttl(&key, 500000, 500000);

    events::property_reassigned(env, property_id, admin, old_landlord, new_landlord);

    Ok(())
}

/// Revoke a property's verification (admin only).
///
/// Used when a property that was previously verified is later found to be
/// invalid or fraudulent. Not gated by the pause switch (see [`remove_property`]).
pub fn revoke_verification(
    env: &Env,
    admin: Address,
    property_id: String,
) -> Result<(), PropertyError> {
    let _state = require_admin(env, &admin)?;

    let key = DataKey::Property(property_id.clone());
    let mut property: PropertyDetails = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(PropertyError::PropertyNotFound)?;

    if !property.verified {
        return Err(PropertyError::NotVerified);
    }

    property.verified = false;
    property.verified_at = None;

    env.storage().persistent().set(&key, &property);
    env.storage().persistent().extend_ttl(&key, 500000, 500000);

    events::property_verification_revoked(env, property_id, admin);

    Ok(())
}

pub fn get_property(env: &Env, property_id: String) -> Option<PropertyDetails> {
    let key = DataKey::Property(property_id);
    env.storage().persistent().get(&key)
}

pub fn has_property(env: &Env, property_id: String) -> bool {
    let key = DataKey::Property(property_id);
    env.storage().persistent().has(&key)
}

pub fn get_property_count(env: &Env) -> u32 {
    env.storage()
        .persistent()
        .get(&DataKey::PropertyCount)
        .unwrap_or(0)
}
