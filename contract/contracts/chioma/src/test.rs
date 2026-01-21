#[cfg(test)]
mod test {
    use crate::{ChiomaContract, ChiomaContractClient};

    use super::*; // Now used by ChiomaContract
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Address, Env, String};

    // Added <'_> to the client to satisfy the lifetime requirement
    fn setup_env() -> (Env, ChiomaContractClient<'static>, Address) {
        let env = Env::default();

        // Use .register() instead of the deprecated .register_contract()
        let contract_id = env.register(ChiomaContract, ());
        let client = ChiomaContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        (env, client, admin)
    }

    #[test]
    fn test_initialize_contract() {
        let (env, client, admin) = setup_env();

        client.initialize(&admin);

        assert_eq!(client.version(), String::from_str(&env, "1.0.0"));
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #1)")]
    fn test_cannot_reinitialize() {
        let (_env, client, admin) = setup_env();

        client.initialize(&admin);
        client.initialize(&admin);
    }

    #[test]
    fn test_version() {
        let (env, client, _) = setup_env();
        assert_eq!(client.version(), String::from_str(&env, "1.0.0"));
    }
    use crate::types::{AgreementStatus, RentAgreement};
    use soroban_sdk::token;

    fn create_token<'a>(
        env: &Env,
        admin: &Address,
    ) -> (token::Client<'a>, token::StellarAssetClient<'a>) {
        let token = env.register_stellar_asset_contract_v2(admin.clone());
        let token_addr = token.address();
        (
            token::Client::new(env, &token_addr),
            token::StellarAssetClient::new(env, &token_addr),
        )
    }

    #[test]
    fn test_deposit_security_success() {
        let (env, client, admin) = setup_env();
        client.initialize(&admin);
        let token_admin = Address::generate(&env);
        let (token_client, token_admin_client) = create_token(&env, &token_admin);
        let tenant = Address::generate(&env);
        let landlord = Address::generate(&env);

        env.mock_all_auths();

        token_admin_client.mint(&tenant, &1000);

        let agreement = RentAgreement {
            agreement_id: String::from_str(&env, "AGR-001"),
            landlord: landlord.clone(),
            tenant: tenant.clone(),
            agent: None,
            monthly_rent: 500,
            security_deposit: 1000,
            start_date: 0,
            end_date: 100,
            agent_commission_rate: 1000,
            status: AgreementStatus::Draft,
            escrow_balance: 0,
            total_paid: 0,
            last_payment_date: 0,
        };
        client.test_set_agreement(&agreement);

        client.deposit_security(&agreement.agreement_id, &token_client.address, &1000);

        // Verify balance
        assert_eq!(token_client.balance(&tenant), 0);
        // Verify contract balance (using contract address)
        assert_eq!(token_client.balance(&client.address), 1000);

        // Verify agreement status
        let updated_agreement = client.test_get_agreement(&agreement.agreement_id);
        assert_eq!(updated_agreement.status, AgreementStatus::Active);
        assert_eq!(updated_agreement.escrow_balance, 1000);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #10)")] // InvalidAmount
    fn test_wrong_deposit_amount() {
        let (env, client, admin) = setup_env();
        client.initialize(&admin);
        let token_admin = Address::generate(&env);
        let (token_client, token_admin_client) = create_token(&env, &token_admin);
        let tenant = Address::generate(&env);
        let landlord = Address::generate(&env);

        env.mock_all_auths();

        token_admin_client.mint(&tenant, &1000);

        let agreement = RentAgreement {
            agreement_id: String::from_str(&env, "AGR-001"),
            landlord: landlord.clone(),
            tenant: tenant.clone(),
            agent: None,
            monthly_rent: 500,
            security_deposit: 1000,
            start_date: 0,
            end_date: 100,
            agent_commission_rate: 1000,
            status: AgreementStatus::Draft,
            escrow_balance: 0,
            total_paid: 0,
            last_payment_date: 0,
        };
        client.test_set_agreement(&agreement);

        client.deposit_security(&agreement.agreement_id, &token_client.address, &500);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #9)")] // InvalidStatus
    fn test_deposit_when_already_active() {
        let (env, client, admin) = setup_env();
        client.initialize(&admin);
        let token_admin = Address::generate(&env);
        let (token_client, token_admin_client) = create_token(&env, &token_admin);
        let tenant = Address::generate(&env);
        let landlord = Address::generate(&env);

        env.mock_all_auths();

        token_admin_client.mint(&tenant, &1000);

        let agreement = RentAgreement {
            agreement_id: String::from_str(&env, "AGR-001"),
            landlord: landlord.clone(),
            tenant: tenant.clone(),
            agent: None,
            monthly_rent: 500,
            security_deposit: 1000,
            start_date: 0,
            end_date: 100,
            agent_commission_rate: 1000,
            status: AgreementStatus::Active, // Already Active
            escrow_balance: 1000,
            total_paid: 0,
            last_payment_date: 0,
        };
        client.test_set_agreement(&agreement);

        client.deposit_security(&agreement.agreement_id, &token_client.address, &1000);
    }
}
