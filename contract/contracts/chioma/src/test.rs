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
}
