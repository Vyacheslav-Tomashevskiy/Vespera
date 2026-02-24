use super::*;
use soroban_sdk::{
    contract, contractimpl,
    testutils::{Address as _, Events, MockAuth, MockAuthInvoke},
    Address, Env, IntoVal, String,
};

#[contract]
pub struct MockChiomaContract;

#[contractimpl]
impl ChiomaContract for MockChiomaContract {
    fn get_agreement(env: Env, agreement_id: String) -> Option<ChiomaAgreement> {
        env.storage().persistent().get(&agreement_id)
    }
}

fn create_contract(env: &Env) -> TokenizedRentObligationContractClient<'_> {
    let contract_id = env.register(TokenizedRentObligationContract, ());
    TokenizedRentObligationContractClient::new(env, &contract_id)
}

fn create_mock_chioma(env: &Env) -> Address {
    env.register(MockChiomaContract, ())
}

fn setup_agreement(env: &Env, chioma_addr: &Address, agreement_id: &String, landlord: &Address) {
    env.as_contract(chioma_addr, || {
        let agreement = ChiomaAgreement {
            landlord: landlord.clone(),
        };
        env.storage().persistent().set(agreement_id, &agreement);
    });
}

#[test]
fn test_successful_initialization() {
    let env = Env::default();
    let client = create_contract(&env);

    let result = client.try_initialize();
    assert!(result.is_ok());

    let count = client.get_obligation_count();
    assert_eq!(count, 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_double_initialization_fails() {
    let env = Env::default();
    let client = create_contract(&env);

    client.initialize();
    client.initialize();
}

#[test]
fn test_mint_obligation() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    client.initialize();

    let landlord = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");
    let chioma_addr = create_mock_chioma(&env);

    setup_agreement(&env, &chioma_addr, &agreement_id, &landlord);

    let result = client.try_mint_obligation(&agreement_id, &landlord, &chioma_addr);
    assert!(result.is_ok());

    let owner = client.get_obligation_owner(&agreement_id);
    assert_eq!(owner, Some(landlord.clone()));

    let has_obligation = client.has_obligation(&agreement_id);
    assert!(has_obligation);

    let count = client.get_obligation_count();
    assert_eq!(count, 1);

    let obligation = client.get_obligation(&agreement_id);
    assert!(obligation.is_some());
    let obligation = obligation.unwrap();
    assert_eq!(obligation.agreement_id, agreement_id);
    assert_eq!(obligation.owner, landlord);
    assert_eq!(obligation.minted_at, env.ledger().timestamp());
}

#[test]
#[should_panic]
fn test_mint_obligation_requires_auth() {
    let env = Env::default();

    let client = create_contract(&env);
    client.initialize();

    let landlord = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");
    let chioma_addr = create_mock_chioma(&env);

    setup_agreement(&env, &chioma_addr, &agreement_id, &landlord);

    client.mint_obligation(&agreement_id, &landlord, &chioma_addr);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_mint_duplicate_obligation_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    client.initialize();

    let landlord = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");
    let chioma_addr = create_mock_chioma(&env);

    setup_agreement(&env, &chioma_addr, &agreement_id, &landlord);

    client.mint_obligation(&agreement_id, &landlord, &chioma_addr);
    client.mint_obligation(&agreement_id, &landlord, &chioma_addr);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_mint_without_initialization_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let landlord = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");
    let chioma_addr = create_mock_chioma(&env);

    setup_agreement(&env, &chioma_addr, &agreement_id, &landlord);

    client.mint_obligation(&agreement_id, &landlord, &chioma_addr);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_mint_with_wrong_landlord_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    client.initialize();

    let real_landlord = Address::generate(&env);
    let fake_landlord = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");
    let chioma_addr = create_mock_chioma(&env);

    setup_agreement(&env, &chioma_addr, &agreement_id, &real_landlord);

    client.mint_obligation(&agreement_id, &fake_landlord, &chioma_addr);
}

#[test]
fn test_transfer_obligation() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    client.initialize();

    let landlord = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");
    let chioma_addr = create_mock_chioma(&env);

    setup_agreement(&env, &chioma_addr, &agreement_id, &landlord);
    client.mint_obligation(&agreement_id, &landlord, &chioma_addr);

    let result = client.try_transfer_obligation(&landlord, &new_owner, &agreement_id);
    assert!(result.is_ok());

    let owner = client.get_obligation_owner(&agreement_id);
    assert_eq!(owner, Some(new_owner.clone()));

    let obligation = client.get_obligation(&agreement_id);
    assert!(obligation.is_some());
    let obligation = obligation.unwrap();
    assert_eq!(obligation.owner, new_owner);
}

#[test]
#[should_panic]
fn test_transfer_obligation_requires_auth() {
    let env = Env::default();

    let client = create_contract(&env);
    client.initialize();

    let landlord = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");
    let chioma_addr = create_mock_chioma(&env);

    setup_agreement(&env, &chioma_addr, &agreement_id, &landlord);

    client
        .mock_auths(&[MockAuth {
            address: &landlord,
            invoke: &MockAuthInvoke {
                contract: &client.address,
                fn_name: "mint_obligation",
                args: (&agreement_id, &landlord, &chioma_addr).into_val(&env),
                sub_invokes: &[],
            },
        }])
        .mint_obligation(&agreement_id, &landlord, &chioma_addr);

    client.transfer_obligation(&landlord, &new_owner, &agreement_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_transfer_nonexistent_obligation_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    client.initialize();

    let landlord = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let agreement_id = String::from_str(&env, "nonexistent");

    client.transfer_obligation(&landlord, &new_owner, &agreement_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_transfer_from_non_owner_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    client.initialize();

    let landlord = Address::generate(&env);
    let fake_owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");
    let chioma_addr = create_mock_chioma(&env);

    setup_agreement(&env, &chioma_addr, &agreement_id, &landlord);
    client.mint_obligation(&agreement_id, &landlord, &chioma_addr);

    client.transfer_obligation(&fake_owner, &new_owner, &agreement_id);
}

#[test]
fn test_multiple_obligations() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    client.initialize();

    let chioma_addr = create_mock_chioma(&env);
    let landlord1 = Address::generate(&env);
    let landlord2 = Address::generate(&env);
    let landlord3 = Address::generate(&env);

    let agreement_id1 = String::from_str(&env, "agreement_001");
    let agreement_id2 = String::from_str(&env, "agreement_002");
    let agreement_id3 = String::from_str(&env, "agreement_003");

    setup_agreement(&env, &chioma_addr, &agreement_id1, &landlord1);
    setup_agreement(&env, &chioma_addr, &agreement_id2, &landlord2);
    setup_agreement(&env, &chioma_addr, &agreement_id3, &landlord3);

    client.mint_obligation(&agreement_id1, &landlord1, &chioma_addr);
    client.mint_obligation(&agreement_id2, &landlord2, &chioma_addr);
    client.mint_obligation(&agreement_id3, &landlord3, &chioma_addr);

    assert_eq!(client.get_obligation_count(), 3);

    assert_eq!(client.get_obligation_owner(&agreement_id1), Some(landlord1));
    assert_eq!(client.get_obligation_owner(&agreement_id2), Some(landlord2));
    assert_eq!(client.get_obligation_owner(&agreement_id3), Some(landlord3));
}

#[test]
fn test_get_nonexistent_obligation() {
    let env = Env::default();
    let client = create_contract(&env);
    client.initialize();

    let agreement_id = String::from_str(&env, "nonexistent");

    let owner = client.get_obligation_owner(&agreement_id);
    assert_eq!(owner, None);

    let obligation = client.get_obligation(&agreement_id);
    assert_eq!(obligation, None);

    let has_obligation = client.has_obligation(&agreement_id);
    assert!(!has_obligation);
}

#[test]
fn test_transfer_chain() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    client.initialize();

    let landlord = Address::generate(&env);
    let buyer1 = Address::generate(&env);
    let buyer2 = Address::generate(&env);
    let buyer3 = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");
    let chioma_addr = create_mock_chioma(&env);

    setup_agreement(&env, &chioma_addr, &agreement_id, &landlord);
    client.mint_obligation(&agreement_id, &landlord, &chioma_addr);
    assert_eq!(
        client.get_obligation_owner(&agreement_id),
        Some(landlord.clone())
    );

    client.transfer_obligation(&landlord, &buyer1, &agreement_id);
    assert_eq!(
        client.get_obligation_owner(&agreement_id),
        Some(buyer1.clone())
    );

    client.transfer_obligation(&buyer1, &buyer2, &agreement_id);
    assert_eq!(
        client.get_obligation_owner(&agreement_id),
        Some(buyer2.clone())
    );

    client.transfer_obligation(&buyer2, &buyer3, &agreement_id);
    assert_eq!(
        client.get_obligation_owner(&agreement_id),
        Some(buyer3.clone())
    );

    assert_eq!(client.get_obligation_count(), 1);
}

#[test]
fn test_events_emitted() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    client.initialize();

    let landlord = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");
    let chioma_addr = create_mock_chioma(&env);

    setup_agreement(&env, &chioma_addr, &agreement_id, &landlord);
    client.mint_obligation(&agreement_id, &landlord, &chioma_addr);
    client.transfer_obligation(&landlord, &new_owner, &agreement_id);

    let all_events = env.events().all();
    assert!(!all_events.is_empty());
}
