#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Events}, vec, Address, Env, String};

#[test]
fn test() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let words = client.hello(&String::from_str(&env, "Dev"));
    assert_eq!(
        words,
        vec![
            &env,
            String::from_str(&env, "Hello"),
            String::from_str(&env, "Dev"),
        ]
    );
}

fn create_contract(env: &Env) -> ContractClient<'_> {
    let contract_id = env.register(Contract, ());
    ContractClient::new(env, &contract_id)
}

#[test]
fn test_create_agreement_success() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agent = Some(Address::generate(&env));
    
    let agreement_id = String::from_str(&env, "AGREEMENT_001");
    
    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &agent,
        &1000, // monthly_rent
        &2000, // security_deposit
        &100,  // start_date
        &200,  // end_date
        &10,   // agent_commission_rate
    );
    
    // Check events
    let events = env.events().all();
    assert_eq!(events.len(), 1);
    let event = events.last().unwrap();
    // event.1 is the topics vector
    assert_eq!(event.1.len(), 1);
    // event.1.get(0) returns the topic
    use soroban_sdk::{Symbol, TryIntoVal};
    let topic: Symbol = event.1.get(0).unwrap().try_into_val(&env).unwrap();
    assert_eq!(topic, Symbol::new(&env, "agreement_created_event"));

    // Verify persistence
    let stored_agreement: types::RentAgreement = env.as_contract(&client.address, || {
        env.storage().persistent().get(&types::DataKey::Agreement(agreement_id.clone())).unwrap()
    });
    
    assert_eq!(stored_agreement.agreement_id, agreement_id);
    assert_eq!(stored_agreement.monthly_rent, 1000);
    assert_eq!(stored_agreement.status, types::AgreementStatus::Draft);
    assert_eq!(stored_agreement.landlord, landlord);
    assert_eq!(stored_agreement.tenant, tenant);
    
    // Verify counter
    let count: u32 = env.as_contract(&client.address, || {
        env.storage().instance().get(&types::DataKey::AgreementCount).unwrap()
    });
    assert_eq!(count, 1);
}

#[test]
fn test_create_agreement_with_agent() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agent = Address::generate(&env);
    
    let agreement_id = String::from_str(&env, "AGREEMENT_WITH_AGENT");
    
    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &Some(agent.clone()),
        &1500,
        &3000,
        &1000,
        &2000,
        &5,
    );
    
    // Verify persistence (not directly accessible via client unless we add a getter, 
    // but successful execution implies no panic)
}

#[test]
fn test_create_agreement_without_agent() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    
    let agreement_id = String::from_str(&env, "AGREEMENT_NO_AGENT");
    
    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &1200,
        &2400,
        &500,
        &1500,
        &0,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_negative_rent_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    
    let agreement_id = String::from_str(&env, "BAD_RENT");
    
    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &-100, // Negative rent
        &1000,
        &100,
        &200,
        &0,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_invalid_dates_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    
    let agreement_id = String::from_str(&env, "BAD_DATES");
    
    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &1000,
        &2000,
        &200, // start_date
        &100, // end_date < start_date
        &0,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_duplicate_agreement_id() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    
    let agreement_id = String::from_str(&env, "DUPLICATE_ID");
    
    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &1000,
        &2000,
        &100,
        &200,
        &0,
    );
    
    // Try to create again with same ID
    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &1000,
        &2000,
        &100,
        &200,
        &0,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_invalid_commission_rate() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    
    let agreement_id = String::from_str(&env, "BAD_COMMISSION");
    
    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &1000,
        &2000,
        &100,
        &200,
        &101, // > 100
    );
}

// ====== ESCROW TESTS ======
// Note: Storage tests in modules are skipped as they require env.as_contract()
// These integration-style tests demonstrate core functionality

#[test]
fn test_create_escrow_success() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    
    let depositor = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let arbiter = Address::generate(&env);
    let token = Address::generate(&env);
    
    // Test that create works by checking the escrow details after creation
    env.as_contract(&contract_id, || {
        let escrow_id = escrow::EscrowContract::create(&env, depositor.clone(), beneficiary.clone(), arbiter.clone(), 1000, token.clone()).unwrap();
        
        let escrow = escrow::EscrowContract::get_escrow(&env, &escrow_id).unwrap();
        assert_eq!(escrow.depositor, depositor);
        assert_eq!(escrow.beneficiary, beneficiary);
        assert_eq!(escrow.arbiter, arbiter);
        assert_eq!(escrow.amount, 1000);
        assert_eq!(escrow.token, token);
        assert_eq!(escrow.status, escrow::EscrowStatus::Pending);
    });
}

#[test]
fn test_create_escrow_invalid_amount() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    
    let depositor = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let arbiter = Address::generate(&env);
    let token = Address::generate(&env);
    
    env.as_contract(&contract_id, || {
        let result = escrow::EscrowContract::create(&env, depositor, beneficiary, arbiter, 0, token);
        assert_eq!(result, Err(escrow::EscrowError::InsufficientFunds));
    });
}

#[test]
fn test_create_escrow_duplicate_parties() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    
    let addr = Address::generate(&env);
    let token = Address::generate(&env);
    
    env.as_contract(&contract_id, || {
        let result = escrow::EscrowContract::create(&env, addr.clone(), addr.clone(), Address::generate(&env), 1000, token);
        assert_eq!(result, Err(escrow::EscrowError::InvalidSigner));
    });
}

#[test]
fn test_fund_escrow() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    
    let depositor = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let arbiter = Address::generate(&env);
    let token = Address::generate(&env);
    
    env.as_contract(&contract_id, || {
        let escrow_id = escrow::EscrowContract::create(&env, depositor.clone(), beneficiary, arbiter, 1000, token).unwrap();
        
        // Fund the escrow
        let result = escrow::EscrowContract::fund_escrow(&env, &escrow_id, &depositor);
        assert!(result.is_ok());
        
        // Verify status changed to Funded
        let escrow = escrow::EscrowContract::get_escrow(&env, &escrow_id).unwrap();
        assert_eq!(escrow.status, escrow::EscrowStatus::Funded);
    });
}

#[test]
fn test_approve_release_insufficient_signers() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    
    let depositor = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let arbiter = Address::generate(&env);
    let token = Address::generate(&env);
    
    env.as_contract(&contract_id, || {
        let escrow_id = escrow::EscrowContract::create(&env, depositor.clone(), beneficiary.clone(), arbiter, 1000, token).unwrap();
        
        // Fund the escrow
        escrow::EscrowContract::fund_escrow(&env, &escrow_id, &depositor).unwrap();
        
        // First approval (not enough)
        let result = escrow::EscrowContract::approve_release(&env, &escrow_id, &depositor, beneficiary.clone());
        assert!(result.is_ok());
        
        // Escrow should still be Funded, not Released
        let escrow = escrow::EscrowContract::get_escrow(&env, &escrow_id).unwrap();
        assert_eq!(escrow.status, escrow::EscrowStatus::Funded);
    });
}

#[test]
fn test_approve_release_duplicate_signer() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    
    let depositor = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let arbiter = Address::generate(&env);
    let token = Address::generate(&env);
    
    env.as_contract(&contract_id, || {
        let escrow_id = escrow::EscrowContract::create(&env, depositor.clone(), beneficiary.clone(), arbiter, 1000, token).unwrap();
        
        // Fund the escrow
        escrow::EscrowContract::fund_escrow(&env, &escrow_id, &depositor).unwrap();
        
        // First approval
        escrow::EscrowContract::approve_release(&env, &escrow_id, &depositor, beneficiary.clone()).unwrap();
        
        // Same signer tries to approve again (should fail)
        let result = escrow::EscrowContract::approve_release(&env, &escrow_id, &depositor, beneficiary);
        assert_eq!(result, Err(escrow::EscrowError::AlreadySigned));
    });
}

#[test]
fn test_initiate_dispute() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    
    let depositor = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let arbiter = Address::generate(&env);
    let token = Address::generate(&env);
    
    env.as_contract(&contract_id, || {
        let escrow_id = escrow::EscrowContract::create(&env, depositor.clone(), beneficiary, arbiter, 1000, token).unwrap();
        
        // Fund the escrow
        escrow::EscrowContract::fund_escrow(&env, &escrow_id, &depositor).unwrap();
        
        // Depositor initiates dispute
        let reason = String::from_str(&env, "Unauthorized deductions");
        let result = escrow::DisputeHandler::initiate_dispute(&env, &escrow_id, &depositor, reason.clone());
        assert!(result.is_ok());
        
        // Verify escrow is disputed
        let is_disputed = escrow::DisputeHandler::is_disputed(&env, &escrow_id).unwrap();
        assert!(is_disputed);
        
        let escrow = escrow::EscrowContract::get_escrow(&env, &escrow_id).unwrap();
        assert_eq!(escrow.status, escrow::EscrowStatus::Disputed);
        assert_eq!(escrow.dispute_reason, Some(reason));
    });
}

#[test]
fn test_initiate_dispute_empty_reason() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    
    let depositor = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let arbiter = Address::generate(&env);
    let token = Address::generate(&env);
    
    env.as_contract(&contract_id, || {
        let escrow_id = escrow::EscrowContract::create(&env, depositor.clone(), beneficiary, arbiter, 1000, token).unwrap();
        
        // Fund the escrow
        escrow::EscrowContract::fund_escrow(&env, &escrow_id, &depositor).unwrap();
        
        // Try to initiate dispute with empty reason
        let reason = String::from_str(&env, "");
        let result = escrow::DisputeHandler::initiate_dispute(&env, &escrow_id, &depositor, reason);
        assert_eq!(result, Err(escrow::EscrowError::EmptyDisputeReason));
    });
}

#[test]
fn test_resolve_dispute() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    
    let depositor = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let arbiter = Address::generate(&env);
    let token = Address::generate(&env);
    
    env.as_contract(&contract_id, || {
        let escrow_id = escrow::EscrowContract::create(&env, depositor.clone(), beneficiary.clone(), arbiter.clone(), 1000, token).unwrap();
        
        // Fund and dispute
        escrow::EscrowContract::fund_escrow(&env, &escrow_id, &depositor).unwrap();
        
        let reason = String::from_str(&env, "Damage claim");
        escrow::DisputeHandler::initiate_dispute(&env, &escrow_id, &depositor, reason).unwrap();
        
        // Arbiter resolves in favor of beneficiary
        let result = escrow::DisputeHandler::resolve_dispute(&env, &escrow_id, &arbiter, beneficiary);
        assert!(result.is_ok());
        
        // Verify dispute is cleared and funds released
        let is_disputed = escrow::DisputeHandler::is_disputed(&env, &escrow_id).unwrap();
        assert!(!is_disputed);
        
        let escrow = escrow::EscrowContract::get_escrow(&env, &escrow_id).unwrap();
        assert_eq!(escrow.status, escrow::EscrowStatus::Released);
        assert_eq!(escrow.dispute_reason, None);
    });
}

#[test]
fn test_resolve_dispute_non_arbiter() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    
    let depositor = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let arbiter = Address::generate(&env);
    let token = Address::generate(&env);
    
    env.as_contract(&contract_id, || {
        let escrow_id = escrow::EscrowContract::create(&env, depositor.clone(), beneficiary.clone(), arbiter, 1000, token).unwrap();
        
        // Fund and dispute
        escrow::EscrowContract::fund_escrow(&env, &escrow_id, &depositor).unwrap();
        
        let reason = String::from_str(&env, "Payment issue");
        escrow::DisputeHandler::initiate_dispute(&env, &escrow_id, &depositor, reason).unwrap();
        
        // Non-arbiter tries to resolve (should fail)
        let result = escrow::DisputeHandler::resolve_dispute(&env, &escrow_id, &depositor, beneficiary);
        assert_eq!(result, Err(escrow::EscrowError::NotAuthorized));
    });
}

#[test]
fn test_get_approval_count() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    
    let depositor = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let arbiter = Address::generate(&env);
    let token = Address::generate(&env);
    
    env.as_contract(&contract_id, || {
        let escrow_id = escrow::EscrowContract::create(&env, depositor.clone(), beneficiary.clone(), arbiter, 1000, token).unwrap();
        
        // Fund the escrow
        escrow::EscrowContract::fund_escrow(&env, &escrow_id, &depositor).unwrap();
        
        // Check initial count
        let count = escrow::EscrowContract::get_approval_count(&env, &escrow_id, &beneficiary).unwrap();
        assert_eq!(count, 0);
        
        // Add approval
        escrow::EscrowContract::approve_release(&env, &escrow_id, &depositor, beneficiary.clone()).unwrap();
        
        let count = escrow::EscrowContract::get_approval_count(&env, &escrow_id, &beneficiary).unwrap();
        assert_eq!(count, 1);
    });
}

#[test]
fn test_get_dispute_info() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    
    let depositor = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let arbiter = Address::generate(&env);
    let token = Address::generate(&env);
    
    env.as_contract(&contract_id, || {
        let escrow_id = escrow::EscrowContract::create(&env, depositor.clone(), beneficiary, arbiter, 1000, token).unwrap();
        
        // Fund the escrow
        escrow::EscrowContract::fund_escrow(&env, &escrow_id, &depositor).unwrap();
        
        // Initially no dispute
        let info = escrow::DisputeHandler::get_dispute_info(&env, &escrow_id).unwrap();
        assert_eq!(info, None);
        
        // Initiate dispute
        let reason = String::from_str(&env, "Damage claim");
        escrow::DisputeHandler::initiate_dispute(&env, &escrow_id, &depositor, reason.clone()).unwrap();
        
        // Check dispute info
        let info = escrow::DisputeHandler::get_dispute_info(&env, &escrow_id).unwrap();
        assert_eq!(info, Some(reason));
    });
}

#[test]
fn test_approve_release_on_pending_escrow() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    
    let depositor = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let arbiter = Address::generate(&env);
    let token = Address::generate(&env);
    
    env.as_contract(&contract_id, || {
        let escrow_id = escrow::EscrowContract::create(&env, depositor.clone(), beneficiary.clone(), arbiter, 1000, token).unwrap();
        
        // Try to approve without funding first
        let result = escrow::EscrowContract::approve_release(&env, &escrow_id, &depositor, beneficiary);
        assert_eq!(result, Err(escrow::EscrowError::InvalidState));
    });
}

#[test]
fn test_get_nonexistent_escrow() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    
    env.as_contract(&contract_id, || {
        let fake_id = BytesN::<32>::from_array(&env, &[0u8; 32]);
        let result = escrow::EscrowContract::get_escrow(&env, &fake_id);
        assert_eq!(result, Err(escrow::EscrowError::EscrowNotFound));
    });
}


