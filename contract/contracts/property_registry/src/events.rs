use soroban_sdk::{contractevent, Address, Env, String};

/// Event emitted when the contract is initialized
/// Topics: ["initialized", admin: Address]
#[contractevent(topics = ["initialized"])]
pub struct ContractInitialized {
    #[topic]
    pub admin: Address,
}

/// Event emitted when a property is registered
/// Topics: ["prop_reg", landlord: Address, property_id: String]
#[contractevent(topics = ["prop_reg"])]
pub struct PropertyRegistered {
    #[topic]
    pub landlord: Address,
    #[topic]
    pub property_id: String,
    pub metadata_hash: String,
}

/// Event emitted when a property is verified
/// Topics: ["prop_ver", admin: Address, property_id: String]
#[contractevent(topics = ["prop_ver"])]
pub struct PropertyVerified {
    #[topic]
    pub admin: Address,
    #[topic]
    pub property_id: String,
}

/// Event emitted when a property is removed by the admin (squat/fraud recovery)
/// Topics: ["prop_rm", admin: Address, property_id: String]
#[contractevent(topics = ["prop_rm"])]
pub struct PropertyRemoved {
    #[topic]
    pub admin: Address,
    #[topic]
    pub property_id: String,
}

/// Event emitted when a property is reassigned to a new landlord by the admin
/// Topics: ["prop_rea", admin: Address, property_id: String]
#[contractevent(topics = ["prop_rea"])]
pub struct PropertyReassigned {
    #[topic]
    pub admin: Address,
    #[topic]
    pub property_id: String,
    pub old_landlord: Address,
    pub new_landlord: Address,
}

/// Event emitted when a property's verification is revoked by the admin
/// Topics: ["prop_rev", admin: Address, property_id: String]
#[contractevent(topics = ["prop_rev"])]
pub struct PropertyVerificationRevoked {
    #[topic]
    pub admin: Address,
    #[topic]
    pub property_id: String,
}

/// Event emitted when contract is paused
#[contractevent(topics = ["paused"])]
pub struct Paused {
    pub reason: String,
    pub paused_by: Address,
}

/// Event emitted when contract is unpaused
#[contractevent(topics = ["unpaused"])]
pub struct Unpaused {
    pub unpaused_by: Address,
}

/// Event emitted when admin transfer is proposed
#[contractevent(topics = ["admin_proposed"])]
pub struct AdminProposed {
    pub current_admin: Address,
    pub pending_admin: Address,
}

/// Event emitted when admin transfer is accepted
#[contractevent(topics = ["admin_transferred"])]
pub struct AdminTransferred {
    pub old_admin: Address,
    pub new_admin: Address,
}

/// Helper function to emit contract initialized event
pub(crate) fn contract_initialized(env: &Env, admin: Address) {
    ContractInitialized { admin }.publish(env);
}

/// Helper function to emit property registered event
pub(crate) fn property_registered(
    env: &Env,
    property_id: String,
    landlord: Address,
    metadata_hash: String,
) {
    PropertyRegistered {
        landlord,
        property_id,
        metadata_hash,
    }
    .publish(env);
}

/// Helper function to emit property verified event
pub(crate) fn property_verified(env: &Env, property_id: String, admin: Address) {
    PropertyVerified { admin, property_id }.publish(env);
}

/// Helper function to emit property removed event
pub(crate) fn property_removed(env: &Env, property_id: String, admin: Address) {
    PropertyRemoved { admin, property_id }.publish(env);
}

/// Helper function to emit property reassigned event
pub(crate) fn property_reassigned(
    env: &Env,
    property_id: String,
    admin: Address,
    old_landlord: Address,
    new_landlord: Address,
) {
    PropertyReassigned {
        admin,
        property_id,
        old_landlord,
        new_landlord,
    }
    .publish(env);
}

/// Helper function to emit property verification revoked event
pub(crate) fn property_verification_revoked(env: &Env, property_id: String, admin: Address) {
    PropertyVerificationRevoked { admin, property_id }.publish(env);
}

/// Helper function to emit paused event
pub(crate) fn paused(env: &Env, reason: String, paused_by: Address) {
    Paused { reason, paused_by }.publish(env);
}

/// Helper function to emit unpaused event
pub(crate) fn unpaused(env: &Env, unpaused_by: Address) {
    Unpaused { unpaused_by }.publish(env);
}

/// Helper function to emit admin proposed event
pub(crate) fn admin_proposed(env: &Env, current_admin: Address, pending_admin: Address) {
    AdminProposed {
        current_admin,
        pending_admin,
    }
    .publish(env);
}

/// Helper function to emit admin transferred event
pub(crate) fn admin_transferred(env: &Env, old_admin: Address, new_admin: Address) {
    AdminTransferred {
        old_admin,
        new_admin,
    }
    .publish(env);
}
