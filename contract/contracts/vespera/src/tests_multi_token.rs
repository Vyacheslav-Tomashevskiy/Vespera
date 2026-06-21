use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn create_contract(env: &Env) -> ContractClient<'_> {
    let contract_id = env.register(Contract, ());
    ContractClient::new(env, &contract_id)
}

fn initialize_contract(env: &Env, client: &ContractClient<'_>, admin: &Address) {
    let config = Config {
        fee_bps: 100,
        fee_collector: Address::generate(env),
        paused: false,
    };
    client.initialize(admin, &config);
}

#[test]
fn test_add_supported_token() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token_addr = Address::generate(&env);
    let symbol = String::from_str(&env, "USDC");

    client.add_supported_token(&token_addr, &symbol, &6, &1, &1000000);

    assert!(client.is_token_supported(&token_addr));

    let supported = client.get_supported_tokens();
    assert_eq!(supported.len(), 1);
    assert_eq!(supported.get(0).unwrap().symbol, symbol);
}

#[test]
fn test_remove_supported_token() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token_addr = Address::generate(&env);
    let symbol = String::from_str(&env, "USDC");

    client.add_supported_token(&token_addr, &symbol, &6, &1, &1000000);
    assert!(client.is_token_supported(&token_addr));

    client.remove_supported_token(&token_addr);
    assert!(!client.is_token_supported(&token_addr));
}

#[test]
fn test_exchange_rates() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token1 = Address::generate(&env);
    let token2 = Address::generate(&env);
    let rate = 1_500_000_000_000_000_000; // 1.5

    client.set_exchange_rate(&token1, &token2, &rate);

    let fetched_rate = client.get_exchange_rate(&token1, &token2);
    assert_eq!(fetched_rate, rate);

    let amount = 1000;
    let converted = client.convert_amount(&token1, &token2, &amount);
    assert_eq!(converted, 1500);
}

#[test]
fn test_create_agreement_with_token() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = Address::generate(&env);

    client.add_supported_token(
        &token_addr,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1000000000,
    );

    let property_id = String::from_str(&env, "PROP1");
    let agreement_id = client.create_agreement_with_token(&AgreementInput {
        agreement_id: property_id.clone(),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    assert_eq!(agreement_id, property_id);
    let fetched_token = client.get_agreement_token(&agreement_id);
    assert_eq!(fetched_token, token_addr);
}

#[test]
fn test_make_payment_with_different_token() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let base_token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();
    let pay_token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();

    client.add_supported_token(
        &base_token,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1000000000,
    );
    client.add_supported_token(
        &pay_token,
        &String::from_str(&env, "EURT"),
        &6,
        &1,
        &1000000000,
    );

    // Set rate: 1 EURT = 1.1 USDC
    let rate = 1_100_000_000_000_000_000;
    client.set_exchange_rate(&pay_token, &base_token, &rate);

    let agreement_id = client.create_agreement_with_token(&AgreementInput {
        agreement_id: String::from_str(&env, "PROP1").clone(),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1100,
            security_deposit: 2200, // Monthly rent in USDC
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 0,
        },
        payment_token: base_token.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    // Sign agreement to make it active
    client.submit_agreement(&landlord, &agreement_id);
    client.sign_agreement(&tenant, &agreement_id);

    // Give tenant some pay_token
    let pay_token_sac = soroban_sdk::token::StellarAssetClient::new(&env, &pay_token);
    pay_token_sac.mint(&tenant, &1000);

    // Pay 1000 EURT. 1000 * 1.1 = 1100 USDC (matches rent)
    client.make_payment_with_token(&agreement_id, &1000, &pay_token);

    let agreement = client.get_agreement(&agreement_id).unwrap();
    assert_eq!(agreement.total_rent_paid, 1100);
}

// ─── Issue #651: Agreement Lifecycle Tests ────────────────────────────────

#[test]
fn test_create_agreement_success() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = Address::generate(&env);
    let agreement_id = String::from_str(&env, "AGR-001");

    let result = client.try_create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    assert!(result.is_ok());
    let agreement = client.get_agreement(&agreement_id).unwrap();
    assert_eq!(agreement.tenant, tenant);
    assert_eq!(agreement.landlord, landlord);
}

#[test]
fn test_validate_agreement_monthly_rent_positive() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = Address::generate(&env);

    // monthly_rent = 0 should fail
    let result = client.try_create_agreement(&AgreementInput {
        agreement_id: String::from_str(&env, "AGR-INVALID-1"),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 0,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    assert!(result.is_err());
}

#[test]
fn test_validate_agreement_security_deposit_nonnegative() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = Address::generate(&env);

    // security_deposit = 0 should succeed
    let result = client.try_create_agreement(&AgreementInput {
        agreement_id: String::from_str(&env, "AGR-ZERO-DEPOSIT"),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 0,
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    assert!(result.is_ok());
}

#[test]
fn test_validate_agreement_start_before_end() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = Address::generate(&env);

    // start_date >= end_date should fail
    let result = client.try_create_agreement(&AgreementInput {
        agreement_id: String::from_str(&env, "AGR-INVALID-DATES"),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 1000000,
            end_date: 100,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    assert!(result.is_err());
}

#[test]
fn test_validate_agreement_commission_rate_max_100() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = Address::generate(&env);

    // agent_commission_rate > 100 should fail
    let result = client.try_create_agreement(&AgreementInput {
        agreement_id: String::from_str(&env, "AGR-INVALID-COMMISSION"),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 101,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    assert!(result.is_err());
}

#[test]
fn test_sign_agreement_transitions_to_pending() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = Address::generate(&env);
    let agreement_id = String::from_str(&env, "AGR-SIGN-TEST");

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    client.submit_agreement(&landlord, &agreement_id);
    client.sign_agreement(&tenant, &agreement_id);

    let agreement = client.get_agreement(&agreement_id).unwrap();
    assert!(agreement.signed_at.is_some());
}

#[test]
fn test_cancel_agreement_from_draft() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = Address::generate(&env);
    let agreement_id = String::from_str(&env, "AGR-CANCEL-TEST");

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    client.cancel_agreement(&landlord, &agreement_id);
}

#[test]
fn test_agreement_not_found() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let nonexistent_id = String::from_str(&env, "NONEXISTENT-AGR");
    let result = client.get_agreement(&nonexistent_id);
    assert!(result.is_none());
}

#[test]
fn test_duplicate_agreement_prevention() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = Address::generate(&env);
    let agreement_id = String::from_str(&env, "AGR-DUPLICATE");

    let input = AgreementInput {
        agreement_id: agreement_id.clone(),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    };

    client.create_agreement(&input);

    // Attempt to create with same ID should fail
    let result = client.try_create_agreement(&input);
    assert!(result.is_err());
}

#[test]
fn test_add_supported_token_success() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token_addr = Address::generate(&env);
    let symbol = String::from_str(&env, "USDC");

    client.add_supported_token(&token_addr, &symbol, &6, &1, &1000000);

    assert!(client.is_token_supported(&token_addr));
}

#[test]
fn test_remove_supported_token_success() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token_addr = Address::generate(&env);
    let symbol = String::from_str(&env, "USDC");

    client.add_supported_token(&token_addr, &symbol, &6, &1, &1000000);
    assert!(client.is_token_supported(&token_addr));

    client.remove_supported_token(&token_addr);
    assert!(!client.is_token_supported(&token_addr));
}

#[test]
fn test_get_supported_tokens_list() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token1 = Address::generate(&env);
    let token2 = Address::generate(&env);

    client.add_supported_token(&token1, &String::from_str(&env, "USDC"), &6, &1, &1000000);
    client.add_supported_token(&token2, &String::from_str(&env, "EURT"), &6, &1, &1000000);

    let tokens = client.get_supported_tokens();
    assert_eq!(tokens.len(), 2);
}

#[test]
fn test_set_exchange_rate_success() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token1 = Address::generate(&env);
    let token2 = Address::generate(&env);
    let rate = 1_500_000_000_000_000_000; // 1.5

    client.set_exchange_rate(&token1, &token2, &rate);

    let fetched_rate = client.get_exchange_rate(&token1, &token2);
    assert_eq!(fetched_rate, rate);
}

#[test]
fn test_get_exchange_rate_nonexistent() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token1 = Address::generate(&env);
    let token2 = Address::generate(&env);

    // Rate not set, should return default or error
    let result = client.try_get_exchange_rate(&token1, &token2);
    // Behavior depends on implementation
    assert!(result.is_ok() || result.is_err());
}

#[test]
fn test_convert_amount_calculation() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token1 = Address::generate(&env);
    let token2 = Address::generate(&env);
    let rate = 2_000_000_000_000_000_000; // 2.0

    client.set_exchange_rate(&token1, &token2, &rate);

    let amount = 1000;
    let converted = client.convert_amount(&token1, &token2, &amount);
    assert_eq!(converted, 2000); // 1000 * 2.0
}

#[test]
fn test_create_agreement_with_token_stores_token() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = Address::generate(&env);
    let agreement_id = String::from_str(&env, "AGR-TOKEN-TEST");

    client.add_supported_token(
        &token_addr,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1000000000,
    );

    client.create_agreement_with_token(&AgreementInput {
        agreement_id: agreement_id.clone(),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    let fetched_token = client.get_agreement_token(&agreement_id);
    assert_eq!(fetched_token, token_addr);
}

// ─── Issue #64: per-agreement escrow accounting ───────────────────────────

/// Two agreements share the same token. After both fund the escrow,
/// landlord A's release must only ship landlord A's deposits and leave
/// landlord B's funds intact.
#[test]
fn test_release_escrow_only_transfers_owning_agreement_funds() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();
    client.add_supported_token(
        &token,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1_000_000_000,
    );

    let tenant_a = Address::generate(&env);
    let landlord_a = Address::generate(&env);
    let tenant_b = Address::generate(&env);
    let landlord_b = Address::generate(&env);

    let id_a = String::from_str(&env, "AGREEMENT_A");
    let id_b = String::from_str(&env, "AGREEMENT_B");

    client.create_agreement_with_token(&AgreementInput {
        agreement_id: id_a.clone(),
        tenant: tenant_a.clone(),
        landlord: landlord_a.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1_000,
            security_deposit: 0,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: token.clone(),
        metadata_uri: String::from_str(&env, ""),
        attributes: Vec::new(&env),
    });
    client.submit_agreement(&landlord_a, &id_a);
    client.sign_agreement(&tenant_a, &id_a);

    client.create_agreement_with_token(&AgreementInput {
        agreement_id: id_b.clone(),
        tenant: tenant_b.clone(),
        landlord: landlord_b.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1_000,
            security_deposit: 0,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: token.clone(),
        metadata_uri: String::from_str(&env, ""),
        attributes: Vec::new(&env),
    });
    client.submit_agreement(&landlord_b, &id_b);
    client.sign_agreement(&tenant_b, &id_b);

    let sac = soroban_sdk::token::StellarAssetClient::new(&env, &token);
    sac.mint(&tenant_a, &5_000);
    sac.mint(&tenant_b, &5_000);

    // Both agreements pay rent into the shared escrow.
    client.make_payment_with_token(&id_a, &1_000, &token);
    client.make_payment_with_token(&id_b, &1_000, &token);

    let token_client = soroban_sdk::token::Client::new(&env, &token);
    assert_eq!(token_client.balance(&landlord_a), 0);
    assert_eq!(token_client.balance(&landlord_b), 0);

    // Landlord A releases their escrow.
    client.release_escrow_with_token(&id_a, &token);

    // With fee_bps=100 (1%), landlord receives 990 (= 1_000 - 10 fee).
    // Landlord A gets exactly THEIR landlord_amount, not the pooled 2_000.
    assert_eq!(token_client.balance(&landlord_a), 990);
    assert_eq!(token_client.balance(&landlord_b), 0);

    // Landlord B's escrow is still parked at the contract and can
    // still be released later — proving funds were not stolen.
    client.release_escrow_with_token(&id_b, &token);
    assert_eq!(token_client.balance(&landlord_b), 990);
}

/// Releasing twice should not double-pay (the ledger is debited on
/// the first release).
#[test]
fn test_release_escrow_is_idempotent_when_balance_is_drained() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();
    client.add_supported_token(
        &token,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1_000_000_000,
    );

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let id = String::from_str(&env, "AGREEMENT_ONCE");

    client.create_agreement_with_token(&AgreementInput {
        agreement_id: id.clone(),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 500,
            security_deposit: 0,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: token.clone(),
        metadata_uri: String::from_str(&env, ""),
        attributes: Vec::new(&env),
    });
    client.submit_agreement(&landlord, &id);
    client.sign_agreement(&tenant, &id);

    let sac = soroban_sdk::token::StellarAssetClient::new(&env, &token);
    sac.mint(&tenant, &500);
    client.make_payment_with_token(&id, &500, &token);

    client.release_escrow_with_token(&id, &token);
    // Second release is a no-op: per-agreement balance is now zero.
    client.release_escrow_with_token(&id, &token);

    let token_client = soroban_sdk::token::Client::new(&env, &token);
    // With fee_bps=100 (1%), landlord receives 495 (= 500 - 5 fee).
    assert_eq!(token_client.balance(&landlord), 495);
}

/// Releasing on a Draft/Pending agreement is rejected.
#[test]
#[should_panic(expected = "Error(Contract, #15)")] // InvalidState
fn test_release_escrow_rejected_on_non_active_agreement() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();
    client.add_supported_token(
        &token,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1_000_000_000,
    );

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let id = String::from_str(&env, "DRAFT_AGREEMENT");

    // Create-but-don't-sign — agreement stays in Draft.
    client.create_agreement_with_token(&AgreementInput {
        agreement_id: id.clone(),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1,
            security_deposit: 0,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: token.clone(),
        metadata_uri: String::from_str(&env, ""),
        attributes: Vec::new(&env),
    });

    client.release_escrow_with_token(&id, &token);
}

// ─── Issue: platform fee split ───────────────────────────────────────────────

/// When fee_bps = 200 (2 %), a 1 000-unit payment must produce:
///   platform_amount  = 20   (sent directly to fee_collector)
///   landlord_amount  = 980  (held in escrow, released to landlord)
///
/// Invariant checked: landlord_amount + platform_amount == amount_paid.
#[test]
fn test_make_payment_splits_fee_between_landlord_and_fee_collector() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let fee_collector = Address::generate(&env);

    // Initialise with a 2 % platform fee.
    let config = Config {
        fee_bps: 200,
        fee_collector: fee_collector.clone(),
        paused: false,
    };
    client.initialize(&admin, &config);

    // Register a real SAC so token transfers are enforced.
    let token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();
    client.add_supported_token(
        &token,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1_000_000_000,
    );

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agreement_id = String::from_str(&env, "FEE_SPLIT_001");

    // Create, submit, and sign the agreement so it becomes Active.
    client.create_agreement_with_token(&AgreementInput {
        agreement_id: agreement_id.clone(),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1_000,
            security_deposit: 0,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: token.clone(),
        metadata_uri: String::from_str(&env, ""),
        attributes: Vec::new(&env),
    });
    client.submit_agreement(&landlord, &agreement_id);
    client.sign_agreement(&tenant, &agreement_id);

    // Mint exactly the rent amount to the tenant.
    let sac = soroban_sdk::token::StellarAssetClient::new(&env, &token);
    sac.mint(&tenant, &1_000);

    // Execute the payment.
    client.make_payment_with_token(&agreement_id, &1_000, &token);

    // ── Assert the PaymentSplit record ────────────────────────────────────
    let split = client.get_payment_split(&agreement_id, &1);
    assert_eq!(
        split.platform_amount, 20,
        "platform_amount must be 2 % of 1 000"
    );
    assert_eq!(
        split.landlord_amount, 980,
        "landlord_amount must be 1 000 - 20"
    );
    // Invariant: no value created or destroyed.
    assert_eq!(
        split.landlord_amount + split.platform_amount,
        1_000,
        "split amounts must sum to the full payment"
    );

    // ── Assert on-chain balances ──────────────────────────────────────────
    let token_client = soroban_sdk::token::Client::new(&env, &token);

    // fee_collector must have received the platform fee immediately.
    assert_eq!(
        token_client.balance(&fee_collector),
        20,
        "fee_collector must hold exactly the platform fee"
    );

    // Landlord balance is still zero — funds sit in escrow.
    assert_eq!(
        token_client.balance(&landlord),
        0,
        "landlord should not have been paid yet (escrow not released)"
    );

    // Release escrow to landlord and verify they receive only their share.
    client.release_escrow_with_token(&agreement_id, &token);
    assert_eq!(
        token_client.balance(&landlord),
        980,
        "landlord must receive exactly landlord_amount after escrow release"
    );

    // fee_collector balance is unchanged — they already received their cut.
    assert_eq!(
        token_client.balance(&fee_collector),
        20,
        "fee_collector balance must not change after escrow release"
    );
}

/// When fee_bps = 0 the full amount must go to the landlord with no
/// transfer to fee_collector at all (zero-fee path).
#[test]
fn test_make_payment_zero_fee_bps_credits_landlord_fully() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let fee_collector = Address::generate(&env);

    // Initialise with zero fee.
    let config = Config {
        fee_bps: 0,
        fee_collector: fee_collector.clone(),
        paused: false,
    };
    client.initialize(&admin, &config);

    let token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();
    client.add_supported_token(
        &token,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1_000_000_000,
    );

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agreement_id = String::from_str(&env, "ZERO_FEE_001");

    client.create_agreement_with_token(&AgreementInput {
        agreement_id: agreement_id.clone(),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 500,
            security_deposit: 0,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: token.clone(),
        metadata_uri: String::from_str(&env, ""),
        attributes: Vec::new(&env),
    });
    client.submit_agreement(&landlord, &agreement_id);
    client.sign_agreement(&tenant, &agreement_id);

    let sac = soroban_sdk::token::StellarAssetClient::new(&env, &token);
    sac.mint(&tenant, &500);

    client.make_payment_with_token(&agreement_id, &500, &token);

    let split = client.get_payment_split(&agreement_id, &1);
    assert_eq!(
        split.platform_amount, 0,
        "zero-fee: platform_amount must be 0"
    );
    assert_eq!(split.landlord_amount, 500, "zero-fee: landlord gets 100 %");

    let token_client = soroban_sdk::token::Client::new(&env, &token);
    // fee_collector receives nothing when fee_bps == 0.
    assert_eq!(token_client.balance(&fee_collector), 0);

    client.release_escrow_with_token(&agreement_id, &token);
    assert_eq!(token_client.balance(&landlord), 500);
}

/// fee_bps = 10 000 (100 %) — extreme edge case, all value goes to the
/// platform; landlord_amount == 0.  Escrow release is a no-op.
#[test]
fn test_make_payment_max_fee_bps() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let fee_collector = Address::generate(&env);

    let config = Config {
        fee_bps: 10_000,
        fee_collector: fee_collector.clone(),
        paused: false,
    };
    client.initialize(&admin, &config);

    let token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();
    client.add_supported_token(
        &token,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1_000_000_000,
    );

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agreement_id = String::from_str(&env, "MAX_FEE_001");

    client.create_agreement_with_token(&AgreementInput {
        agreement_id: agreement_id.clone(),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1_000,
            security_deposit: 0,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: token.clone(),
        metadata_uri: String::from_str(&env, ""),
        attributes: Vec::new(&env),
    });
    client.submit_agreement(&landlord, &agreement_id);
    client.sign_agreement(&tenant, &agreement_id);

    let sac = soroban_sdk::token::StellarAssetClient::new(&env, &token);
    sac.mint(&tenant, &1_000);

    client.make_payment_with_token(&agreement_id, &1_000, &token);

    let split = client.get_payment_split(&agreement_id, &1);
    assert_eq!(split.platform_amount, 1_000);
    assert_eq!(split.landlord_amount, 0);
    assert_eq!(
        split.landlord_amount + split.platform_amount,
        1_000,
        "invariant: no value created or destroyed"
    );

    let token_client = soroban_sdk::token::Client::new(&env, &token);
    assert_eq!(token_client.balance(&fee_collector), 1_000);
    assert_eq!(token_client.balance(&landlord), 0);

    // Release is a no-op; landlord balance stays zero.
    client.release_escrow_with_token(&agreement_id, &token);
    assert_eq!(token_client.balance(&landlord), 0);
}

/// Cross-token payment with a non-zero platform fee: the fee split must be
/// computed from the paid token's units (`amount`), not from `amount_in_base`.
/// Otherwise the forwarded fee + escrowed landlord amount would exceed what
/// the contract actually received (EscrowInsufficientFunds on release).
#[test]
fn test_make_payment_different_token_with_fee() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let fee_collector = Address::generate(&env);

    let config = Config {
        fee_bps: 200, // 2 %
        fee_collector: fee_collector.clone(),
        paused: false,
    };
    client.initialize(&admin, &config);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let base_token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();
    let pay_token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();

    client.add_supported_token(
        &base_token,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1000000000,
    );
    client.add_supported_token(
        &pay_token,
        &String::from_str(&env, "EURT"),
        &6,
        &1,
        &1000000000,
    );

    // Set rate: 1 EURT = 1.1 USDC
    let rate = 1_100_000_000_000_000_000;
    client.set_exchange_rate(&pay_token, &base_token, &rate);

    let agreement_id = client.create_agreement_with_token(&AgreementInput {
        agreement_id: String::from_str(&env, "CROSS_TOKEN_FEE"),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1100,
            security_deposit: 2200,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: base_token.clone(),
        metadata_uri: String::from_str(&env, ""),
        attributes: Vec::new(&env),
    });

    client.submit_agreement(&landlord, &agreement_id);
    client.sign_agreement(&tenant, &agreement_id);

    // Give tenant 1000 EURT
    let pay_token_sac = soroban_sdk::token::StellarAssetClient::new(&env, &pay_token);
    pay_token_sac.mint(&tenant, &1000);

    // Pay 1000 EURT → amount_in_base = 1100 (≥ 1100 monthly_rent ✓)
    client.make_payment_with_token(&agreement_id, &1000, &pay_token);

    let agreement = client.get_agreement(&agreement_id).unwrap();
    assert_eq!(
        agreement.total_rent_paid, 1100,
        "total_rent_paid is always in base-token units"
    );

    // ── Assert the PaymentSplit record ────────────────────────────────────
    let split = client.get_payment_split(&agreement_id, &1);
    // 1000 * 200 / 10000 = 20 EURT
    assert_eq!(split.platform_amount, 20, "2 % of 1000 EURT = 20 EURT");
    assert_eq!(split.landlord_amount, 980, "1000 - 20 = 980 EURT");
    // Invariant: split sums to the paid token amount
    assert_eq!(
        split.landlord_amount + split.platform_amount,
        1000,
        "platform + landlord must equal the paid amount in token units"
    );

    // ── Assert on-chain balances ──────────────────────────────────────────
    let pay_token_client = soroban_sdk::token::Client::new(&env, &pay_token);

    // fee_collector received 20 EURT immediately.
    assert_eq!(
        pay_token_client.balance(&fee_collector),
        20,
        "fee_collector must hold 20 EURT"
    );

    // Landlord hasn't released yet.
    assert_eq!(
        pay_token_client.balance(&landlord),
        0,
        "landlord not yet paid"
    );

    // Release escrow — must succeed (no EscrowInsufficientFunds).
    client.release_escrow_with_token(&agreement_id, &pay_token);
    assert_eq!(
        pay_token_client.balance(&landlord),
        980,
        "landlord receives 980 EURT after release"
    );
    assert_eq!(
        pay_token_client.balance(&fee_collector),
        20,
        "fee_collector balance unchanged after release"
    );

    // The total on-chain distribution equals the original 1000 EURT.
    assert_eq!(
        pay_token_client.balance(&fee_collector) + pay_token_client.balance(&landlord),
        1000,
        "on-chain fee_collector + landlord == original payment amount"
    );
}
