//! Tests for the Escrow contract.

use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{Address, BytesN, Env};

use crate::access::AccessControl;
use crate::types::{Escrow, EscrowStatus};

fn create_test_escrow(env: &Env) -> (Escrow, Address, Address, Address) {
    let depositor = Address::generate(env);
    let beneficiary = Address::generate(env);
    let arbiter = Address::generate(env);
    let token = Address::generate(env);

    let escrow = Escrow {
        id: BytesN::<32>::from_array(env, &[1u8; 32]),
        depositor: depositor.clone(),
        beneficiary: beneficiary.clone(),
        arbiter: arbiter.clone(),
        amount: 1000,
        token,
        status: EscrowStatus::Funded,
        created_at: 0,
        dispute_reason: None,
    };

    (escrow, depositor, beneficiary, arbiter)
}

#[test]
fn test_escrow_status_ordering() {
    assert!(EscrowStatus::Pending < EscrowStatus::Funded);
    assert!(EscrowStatus::Funded < EscrowStatus::Released);
}

#[test]
fn test_is_depositor() {
    let env = Env::default();
    let (escrow, depositor, _, _) = create_test_escrow(&env);
    assert!(AccessControl::is_depositor(&escrow, &depositor).is_ok());

    let other = Address::generate(&env);
    assert!(AccessControl::is_depositor(&escrow, &other).is_err());
}

#[test]
fn test_is_beneficiary() {
    let env = Env::default();
    let (escrow, _, beneficiary, _) = create_test_escrow(&env);
    assert!(AccessControl::is_beneficiary(&escrow, &beneficiary).is_ok());

    let other = Address::generate(&env);
    assert!(AccessControl::is_beneficiary(&escrow, &other).is_err());
}

#[test]
fn test_is_arbiter() {
    let env = Env::default();
    let (escrow, _, _, arbiter) = create_test_escrow(&env);
    assert!(AccessControl::is_arbiter(&escrow, &arbiter).is_ok());

    let other = Address::generate(&env);
    assert!(AccessControl::is_arbiter(&escrow, &other).is_err());
}

#[test]
fn test_is_party() {
    let env = Env::default();
    let (escrow, depositor, beneficiary, arbiter) = create_test_escrow(&env);

    assert!(AccessControl::is_party(&escrow, &depositor).is_ok());
    assert!(AccessControl::is_party(&escrow, &beneficiary).is_ok());
    assert!(AccessControl::is_party(&escrow, &arbiter).is_ok());

    let other = Address::generate(&env);
    assert!(AccessControl::is_party(&escrow, &other).is_err());
}

#[test]
fn test_is_primary_party() {
    let env = Env::default();
    let (escrow, depositor, beneficiary, arbiter) = create_test_escrow(&env);

    assert!(AccessControl::is_primary_party(&escrow, &depositor).is_ok());
    assert!(AccessControl::is_primary_party(&escrow, &beneficiary).is_ok());
    // Arbiter is NOT a primary party
    assert!(AccessControl::is_primary_party(&escrow, &arbiter).is_err());

    let other = Address::generate(&env);
    assert!(AccessControl::is_primary_party(&escrow, &other).is_err());
}

#[test]
fn test_unique_escrow_ids() {
    use crate::escrow_impl::EscrowContract;
    use soroban_sdk::contract;

    #[contract]
    struct TestContract;

    let env = Env::default();
    let contract_id = env.register(TestContract, ());

    let depositor = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let arbiter = Address::generate(&env);
    let token = Address::generate(&env);

    let escrow_id1 = env
        .as_contract(&contract_id, || {
            EscrowContract::create(
                &env,
                depositor.clone(),
                beneficiary.clone(),
                arbiter.clone(),
                1000,
                token.clone(),
            )
        })
        .unwrap();

    env.ledger().with_mut(|li| li.timestamp += 1);

    let escrow_id2 = env
        .as_contract(&contract_id, || {
            EscrowContract::create(
                &env,
                depositor.clone(),
                beneficiary.clone(),
                arbiter.clone(),
                1000,
                token.clone(),
            )
        })
        .unwrap();

    assert_ne!(escrow_id1, escrow_id2, "Escrow IDs should be unique");

    let escrow1 = env
        .as_contract(&contract_id, || {
            EscrowContract::get_escrow(&env, &escrow_id1)
        })
        .unwrap();

    let escrow2 = env
        .as_contract(&contract_id, || {
            EscrowContract::get_escrow(&env, &escrow_id2)
        })
        .unwrap();

    assert_eq!(escrow1.id, escrow_id1);
    assert_eq!(escrow2.id, escrow_id2);
    assert_eq!(escrow1.amount, 1000);
    assert_eq!(escrow2.amount, 1000);
}
