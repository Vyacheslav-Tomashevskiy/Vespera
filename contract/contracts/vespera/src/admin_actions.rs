//! Privileged state mutations shared by the governance execution paths.
//!
//! `multi_sig::execute_action` and `timelock::execute_action` need to actually
//! apply an approved/queued action (pause, config update, admin transfer, …).
//! The single-admin entrypoints in `lib.rs` (`pause`, `unpause`,
//! `update_config`) guard themselves with `state.admin.require_auth()`, which
//! is wrong for governance: there the authorization is the multi-sig approval
//! threshold (or the elapsed timelock ETA), not a single admin signature.
//!
//! These helpers therefore perform the same storage mutations and emit the same
//! events as their single-admin counterparts, but deliberately do **not** call
//! `require_auth`. They must only be reached after the caller has verified the
//! relevant governance precondition.

use crate::{
    errors::RentalError,
    events,
    storage::DataKey,
    types::{Config, ContractState, PauseState},
};
use soroban_sdk::{Address, Env, String};

const TTL: u32 = 500_000;

fn load_state(env: &Env) -> Result<ContractState, RentalError> {
    env.storage()
        .instance()
        .get(&DataKey::State)
        .ok_or(RentalError::InvalidState)
}

/// Mirror of `RentalContract::is_paused` for use inside the crate without
/// cloning the `Env` by value.
pub(crate) fn is_paused(env: &Env) -> bool {
    if let Some(pause_state) = env
        .storage()
        .instance()
        .get::<DataKey, PauseState>(&DataKey::PauseState)
    {
        return pause_state.is_paused;
    }
    if let Some(state) = env
        .storage()
        .instance()
        .get::<DataKey, ContractState>(&DataKey::State)
    {
        return state.config.paused;
    }
    false
}

fn set_pause_state(env: &Env, admin: Address, reason: String) {
    let pause_state = PauseState {
        is_paused: true,
        paused_at: env.ledger().timestamp(),
        paused_by: admin,
        pause_reason: reason,
    };
    env.storage()
        .instance()
        .set(&DataKey::PauseState, &pause_state);
}

/// Pause the contract. Errors if already paused so a redundant proposal cannot
/// silently "succeed".
pub(crate) fn apply_pause(env: &Env) -> Result<(), RentalError> {
    let mut state = load_state(env)?;

    if is_paused(env) {
        return Err(RentalError::AlreadyPaused);
    }

    let reason = String::from_str(env, "Paused via governance");
    set_pause_state(env, state.admin.clone(), reason.clone());

    if !state.config.paused {
        state.config.paused = true;
        env.storage().instance().set(&DataKey::State, &state);
        env.storage().instance().extend_ttl(TTL, TTL);
    }

    events::paused(env, reason, state.admin);
    Ok(())
}

/// Unpause the contract. Errors if not currently paused.
pub(crate) fn apply_unpause(env: &Env) -> Result<(), RentalError> {
    let mut state = load_state(env)?;

    if !is_paused(env) {
        return Err(RentalError::NotPaused);
    }

    env.storage().instance().remove(&DataKey::PauseState);

    if state.config.paused {
        state.config.paused = false;
        env.storage().instance().set(&DataKey::State, &state);
        env.storage().instance().extend_ttl(TTL, TTL);
    }

    events::unpaused(env, state.admin);
    Ok(())
}

/// Replace the contract configuration, keeping the `PauseState` entry in sync
/// with `config.paused`. Mirrors `RentalContract::update_config`.
pub(crate) fn apply_update_config(env: &Env, new_config: Config) -> Result<(), RentalError> {
    let mut state = load_state(env)?;

    if new_config.fee_bps > 10_000 {
        return Err(RentalError::InvalidConfig);
    }

    let was_paused = is_paused(env);
    let old_config = state.config.clone();
    state.config = new_config.clone();

    env.storage().instance().set(&DataKey::State, &state);
    env.storage().instance().extend_ttl(TTL, TTL);

    if new_config.paused && !was_paused {
        let reason = String::from_str(env, "Paused via config update");
        set_pause_state(env, state.admin.clone(), reason.clone());
        events::paused(env, reason, state.admin.clone());
    } else if !new_config.paused && was_paused {
        env.storage().instance().remove(&DataKey::PauseState);
        events::unpaused(env, state.admin.clone());
    }

    events::config_updated(env, state.admin, old_config, new_config);
    Ok(())
}

/// Transfer the single admin role (used by the timelock `UpdateAdmin` action).
pub(crate) fn apply_set_admin(env: &Env, new_admin: Address) -> Result<(), RentalError> {
    let mut state = load_state(env)?;
    state.admin = new_admin;
    env.storage().instance().set(&DataKey::State, &state);
    env.storage().instance().extend_ttl(TTL, TTL);
    Ok(())
}
