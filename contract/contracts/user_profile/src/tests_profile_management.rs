//! Tests for user profile management & verification (Issue #655)
#![allow(unused_results)]

use crate::types::AccountType;
use crate::UserProfileContract;
use soroban_sdk::{testutils::Address as _, Address, Bytes, Env};

fn create_contract(env: &Env) -> crate::UserProfileContractClient<'_> {
    let contract_id = env.register(UserProfileContract, ());
    crate::UserProfileContractClient::new(env, &contract_id)
}

fn create_hash(env: &Env, len: usize) -> Bytes {
    match len {
        32 => Bytes::from_slice(env, &[0u8; 32]),
        46 => Bytes::from_slice(env, &[0u8; 46]),
        31 => Bytes::from_slice(env, &[0u8; 31]),
        _ => Bytes::from_slice(env, &[0u8; 32]),
    }
}

#[test]
fn test_initialize_contract() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);

    let result = client.try_initialize(&admin);
    assert!(result.is_ok());
}

#[test]
fn test_double_initialization_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);

    let _ = client.try_initialize(&admin).unwrap();
    let result = client.try_initialize(&admin);
    assert!(result.is_err());
}

#[test]
fn test_create_profile_success() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let account = Address::generate(&env);

    let _ = client.try_initialize(&admin).unwrap();

    let hash = create_hash(&env, 32);
    let result = client.try_create_profile(&account, &AccountType::Tenant, &hash);

    assert!(result.is_ok());
}

#[test]
fn test_create_profile_landlord() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let account = Address::generate(&env);

    let _ = client.try_initialize(&admin).unwrap();

    let hash = create_hash(&env, 32);
    let result = client.try_create_profile(&account, &AccountType::Landlord, &hash);

    assert!(result.is_ok());
}

#[test]
fn test_create_profile_agent() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let account = Address::generate(&env);

    let _ = client.try_initialize(&admin).unwrap();

    let hash = create_hash(&env, 32);
    let result = client.try_create_profile(&account, &AccountType::Agent, &hash);

    assert!(result.is_ok());
}

#[test]
fn test_prevent_duplicate_profile() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let account = Address::generate(&env);

    let _ = client.try_initialize(&admin).unwrap();

    let hash = create_hash(&env, 32);
    let _ = client
        .try_create_profile(&account, &AccountType::Tenant, &hash)
        .unwrap();

    let result = client.try_create_profile(&account, &AccountType::Tenant, &hash);
    assert!(result.is_err());
}

#[test]
fn test_data_hash_validation_sha256() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let account = Address::generate(&env);

    let _ = client.try_initialize(&admin).unwrap();

    let hash = create_hash(&env, 32);
    let result = client.try_create_profile(&account, &AccountType::Tenant, &hash);
    assert!(result.is_ok());
}

#[test]
fn test_data_hash_validation_ipfs_cid() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let account = Address::generate(&env);

    let _ = client.try_initialize(&admin).unwrap();

    let hash = create_hash(&env, 46);
    let result = client.try_create_profile(&account, &AccountType::Tenant, &hash);
    assert!(result.is_ok());
}

#[test]
fn test_data_hash_validation_invalid_length() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let account = Address::generate(&env);

    let _ = client.try_initialize(&admin).unwrap();

    let hash = create_hash(&env, 31);
    let result = client.try_create_profile(&account, &AccountType::Tenant, &hash);
    assert!(result.is_err());
}

#[test]
fn test_update_profile_account_type() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let account = Address::generate(&env);

    let _ = client.try_initialize(&admin).unwrap();

    let hash = create_hash(&env, 32);
    let _ = client
        .try_create_profile(&account, &AccountType::Tenant, &hash)
        .unwrap();

    let result = client.try_update_profile(&account, &Some(AccountType::Landlord), &None);

    assert!(result.is_ok());
}

#[test]
fn test_update_profile_data_hash() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let account = Address::generate(&env);

    let _ = client.try_initialize(&admin).unwrap();

    let hash1 = create_hash(&env, 32);
    let _ = client
        .try_create_profile(&account, &AccountType::Tenant, &hash1)
        .unwrap();

    let hash2 = create_hash(&env, 32);
    let result = client.try_update_profile(&account, &None, &Some(hash2));

    assert!(result.is_ok());
}

#[test]
fn test_update_non_existent_profile() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let account = Address::generate(&env);

    let _ = client.try_initialize(&admin).unwrap();

    let result = client.try_update_profile(&account, &Some(AccountType::Landlord), &None);

    assert!(result.is_err());
}

#[test]
fn test_verify_profile() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let account = Address::generate(&env);

    let _ = client.try_initialize(&admin).unwrap();

    let hash = create_hash(&env, 32);
    let _ = client
        .try_create_profile(&account, &AccountType::Tenant, &hash)
        .unwrap();

    let result = client.try_verify_profile(&admin, &account);
    assert!(result.is_ok());
}

#[test]
fn test_unverify_profile() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let account = Address::generate(&env);

    let _ = client.try_initialize(&admin).unwrap();

    let hash = create_hash(&env, 32);
    let _ = client
        .try_create_profile(&account, &AccountType::Tenant, &hash)
        .unwrap();

    let _ = client.try_verify_profile(&admin, &account).unwrap();
    let result = client.try_unverify_profile(&admin, &account);
    assert!(result.is_ok());
}

#[test]
fn test_get_profile() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let account = Address::generate(&env);

    let _ = client.try_initialize(&admin).unwrap();

    let hash = create_hash(&env, 32);
    let _ = client
        .try_create_profile(&account, &AccountType::Tenant, &hash)
        .unwrap();

    let result = client.try_get_profile(&account);
    assert!(result.is_ok());
}

#[test]
fn test_has_profile() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let account = Address::generate(&env);

    let _ = client.try_initialize(&admin).unwrap();

    let hash = create_hash(&env, 32);
    let _ = client
        .try_create_profile(&account, &AccountType::Tenant, &hash)
        .unwrap();

    let result = client.try_has_profile(&account).unwrap().unwrap();
    assert!(result);
}

#[test]
fn test_delete_profile() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let account = Address::generate(&env);

    let _ = client.try_initialize(&admin).unwrap();

    let hash = create_hash(&env, 32);
    let _ = client
        .try_create_profile(&account, &AccountType::Tenant, &hash)
        .unwrap();

    let result = client.try_delete_profile(&account);
    assert!(result.is_ok());
}

#[test]
fn test_delete_non_existent_profile() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let account = Address::generate(&env);

    let _ = client.try_initialize(&admin).unwrap();

    let result = client.try_delete_profile(&account);
    assert!(result.is_err());
}

#[test]
fn test_multiple_profiles() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let account1 = Address::generate(&env);
    let account2 = Address::generate(&env);

    let _ = client.try_initialize(&admin).unwrap();

    let hash = create_hash(&env, 32);
    let _ = client
        .try_create_profile(&account1, &AccountType::Tenant, &hash)
        .unwrap();
    let _ = client
        .try_create_profile(&account2, &AccountType::Landlord, &hash)
        .unwrap();

    let has1 = client.try_has_profile(&account1).unwrap().unwrap();
    let has2 = client.try_has_profile(&account2).unwrap().unwrap();

    assert!(has1);
    assert!(has2);
}

#[test]
fn test_account_type_transitions() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let account = Address::generate(&env);

    let _ = client.try_initialize(&admin).unwrap();

    let hash = create_hash(&env, 32);
    let _ = client
        .try_create_profile(&account, &AccountType::Tenant, &hash)
        .unwrap();

    let _ = client
        .try_update_profile(&account, &Some(AccountType::Landlord), &None)
        .unwrap();
    let _ = client
        .try_update_profile(&account, &Some(AccountType::Agent), &None)
        .unwrap();
    let _ = client
        .try_update_profile(&account, &Some(AccountType::Tenant), &None)
        .unwrap();

    let has_profile = client.try_has_profile(&account).unwrap().unwrap();
    assert!(has_profile);
}
