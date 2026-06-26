//! Tests that an approved multi-sig proposal actually performs its action.
//!
//! These cover the regression where `execute_action` marked a proposal
//! `executed = true` and emitted an event but never dispatched on the
//! `ActionType`, so a fully approved Pause / AddToken / UpdateConfig changed
//! nothing (a dangerous false-safety condition).

use crate::{
    errors::RentalError,
    types::{ActionType, Config, SupportedToken},
    Contract, ContractClient,
};
use soroban_sdk::{testutils::Address as _, xdr::ToXdr, Address, Bytes, Env, String, Vec};

/// Register the contract, initialize it (unpaused) and set up a single-admin
/// multi-sig requiring one signature, so a proposer's own approval is enough
/// to execute immediately.
fn setup() -> (Env, ContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(
        &admin,
        &Config {
            fee_bps: 100,
            fee_collector: Address::generate(&env),
            paused: false,
        },
    );

    // Multi-sig admin is independent of the single contract admin.
    let ms_admin = Address::generate(&env);
    let mut admins = Vec::new(&env);
    admins.push_back(ms_admin.clone());
    client.initialize_multisig(&admins, &1);

    (env, client, ms_admin)
}

#[test]
fn test_execute_pause_action_actually_pauses() {
    let (env, client, ms_admin) = setup();
    assert!(!client.is_paused());

    let proposal_id =
        client.propose_action(&ms_admin, &ActionType::Pause, &None, &Bytes::new(&env));
    client.execute_action(&ms_admin, &proposal_id);

    // The contract is now genuinely paused, not just the proposal flagged.
    assert!(client.is_paused());
    assert!(client.get_proposal(&proposal_id).executed);
}

#[test]
fn test_execute_add_token_actually_registers_token() {
    let (env, client, ms_admin) = setup();

    let token = Address::generate(&env);
    assert!(!client.is_token_supported(&token));

    let payload = SupportedToken {
        token_address: token.clone(),
        symbol: String::from_str(&env, "USDC"),
        decimals: 7,
        enabled: true,
        min_amount: 1,
        max_amount: 1_000_000,
    };
    let proposal_id = client.propose_action(
        &ms_admin,
        &ActionType::AddToken,
        &None,
        &payload.to_xdr(&env),
    );
    client.execute_action(&ms_admin, &proposal_id);

    assert!(client.is_token_supported(&token));
    assert_eq!(client.get_supported_tokens().len(), 1);
}

#[test]
fn test_execute_update_config_actually_changes_config() {
    let (env, client, ms_admin) = setup();
    assert_eq!(client.get_state().unwrap().config.fee_bps, 100);

    let new_config = Config {
        fee_bps: 500,
        fee_collector: Address::generate(&env),
        paused: false,
    };
    let proposal_id = client.propose_action(
        &ms_admin,
        &ActionType::UpdateConfig,
        &None,
        &new_config.clone().to_xdr(&env),
    );
    client.execute_action(&ms_admin, &proposal_id);

    assert_eq!(client.get_state().unwrap().config.fee_bps, 500);
}

#[test]
fn test_execute_add_admin_actually_adds_admin() {
    let (env, client, ms_admin) = setup();
    assert_eq!(client.get_multisig_config().total_admins, 1);

    let new_admin = Address::generate(&env);
    let proposal_id = client.propose_action(
        &ms_admin,
        &ActionType::AddAdmin,
        &Some(new_admin.clone()),
        &Bytes::new(&env),
    );
    client.execute_action(&ms_admin, &proposal_id);

    let cfg = client.get_multisig_config();
    assert_eq!(cfg.total_admins, 2);
    assert!(cfg.admins.contains(&new_admin));
}

#[test]
fn test_execute_malformed_config_reverts_and_stays_unexecuted() {
    let (env, client, ms_admin) = setup();

    // UpdateConfig with an undecodable payload must fail (an invalid XDR
    // payload aborts the host, reverting the whole invocation)...
    let proposal_id = client.propose_action(
        &ms_admin,
        &ActionType::UpdateConfig,
        &None,
        &Bytes::from_array(&env, &[1, 2, 3]),
    );
    let result = client.try_execute_action(&ms_admin, &proposal_id);
    assert!(result.is_err());

    // ...and leave the proposal unexecuted and the config untouched.
    assert!(!client.get_proposal(&proposal_id).executed);
    assert_eq!(client.get_state().unwrap().config.fee_bps, 100);
}

#[test]
fn test_execute_emergency_action_is_rejected() {
    let (env, client, ms_admin) = setup();

    let proposal_id = client.propose_action(
        &ms_admin,
        &ActionType::EmergencyAction,
        &None,
        &Bytes::new(&env),
    );
    let result = client.try_execute_action(&ms_admin, &proposal_id);
    assert_eq!(result, Err(Ok(RentalError::InvalidTransition)));
    assert!(!client.get_proposal(&proposal_id).executed);
}
