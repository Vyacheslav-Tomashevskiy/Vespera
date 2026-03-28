# Chioma Contract Testing Implementation

This directory contains comprehensive test implementations for all Chioma smart contracts, addressing GitHub issues #645-#648.

## Overview

The Chioma housing protocol consists of five core smart contracts, each with extensive test coverage:

1. **Agent Registry** - Agent registration, verification, and rating
2. **Property Registry** - Property registration and verification
3. **Escrow** - Security deposit management with dispute resolution
4. **Payment** - Rent payment processing with late fee calculation
5. **Rent Obligation** - Tokenized rent obligation NFTs

## Quick Start

### Prerequisites

- Rust 1.70+
- Soroban SDK 23
- Cargo

### Running Tests

Run all contract tests:

```bash
cd contract
cargo test --lib
```

Run tests for a specific contract:

```bash
# Agent Registry
cargo test --lib agent_registry::tests

# Property Registry
cargo test --lib property_registry::tests

# Escrow
cargo test --lib escrow::tests

# Payment
cargo test --lib payment::tests

# Rent Obligation
cargo test --lib rent_obligation::tests
```

Run a specific test:

```bash
cargo test --lib agent_registry::tests::test_successful_initialization
```

## Test Coverage by Issue

### Issue #645: Agent Registry & Property Registry Initialization

**Status**: ✓ Complete

Tests initialization logic for both registries:

- Successful initialization with admin address
- Authorization requirement verification
- Double initialization prevention
- Additional registration and verification tests

**Files**:

- `contract/contracts/agent_registry/src/tests.rs` (23 tests)
- `contract/contracts/property_registry/src/tests.rs` (20 tests)

**Documentation**: See [ISSUE_645_IMPLEMENTATION.md](./ISSUE_645_IMPLEMENTATION.md)

### Issue #646: Escrow Lifecycle & Dispute Resolution

**Status**: ✓ Complete

Tests complete escrow lifecycle including:

- Escrow creation and funding
- Multi-sig approval mechanism (2-of-3)
- Dispute initiation and resolution
- Partial releases and damage deductions
- Timeout handling and automatic refunds

**Files**:

- `contract/contracts/escrow/src/tests.rs` (20 tests)

**Documentation**: See [ISSUE_646_IMPLEMENTATION.md](./ISSUE_646_IMPLEMENTATION.md)

### Issue #647: Payment Processing & Late Fee Calculation

**Status**: ✓ Complete

Tests payment processing including:

- Payment split calculations with agent commissions
- Late fee computation with various scenarios
- Recurring payment management
- Rate limiting enforcement
- Payment execution tracking

**Files**:

- `contract/contracts/payment/src/tests.rs` (17+ tests)

**Documentation**: See [ISSUE_647_IMPLEMENTATION.md](./ISSUE_647_IMPLEMENTATION.md)

### Issue #648: Rent Obligation NFT & Agent Registration

**Status**: ✓ Complete

Tests NFT functionality including:

- Rent obligation NFT minting and transfer
- NFT burning with valid reasons
- Agent registration and verification
- Agent rating and reputation tracking
- Event emission and history tracking

**Files**:

- `contract/contracts/rent_obligation/src/tests.rs` (27 tests)
- `contract/contracts/agent_registry/src/tests.rs` (agent tests)

**Documentation**: See [ISSUE_648_IMPLEMENTATION.md](./ISSUE_648_IMPLEMENTATION.md)

## Test Statistics

| Contract          | Tests    | Status         |
| ----------------- | -------- | -------------- |
| Agent Registry    | 23       | ✓ Complete     |
| Property Registry | 20       | ✓ Complete     |
| Escrow            | 20       | ✓ Complete     |
| Payment           | 17+      | ✓ Complete     |
| Rent Obligation   | 27       | ✓ Complete     |
| **Total**         | **100+** | **✓ Complete** |

## Test Categories

### Authorization Tests

Verify that all sensitive operations require proper authorization:

- Admin-only operations
- Owner-only operations
- Multi-sig requirements
- Authorization failure handling

### State Transition Tests

Verify correct state changes:

- Initial state setup
- State progression through operations
- State immutability where required
- State rollback on errors

### Error Handling Tests

Verify proper error handling:

- Invalid input rejection
- Authorization failures
- Duplicate operation prevention
- Boundary condition handling

### Integration Tests

Verify interactions between components:

- Multi-contract workflows
- Token transfers
- Event emission
- History tracking

### Edge Case Tests

Verify handling of special scenarios:

- Zero amounts
- Maximum amounts
- Timeout scenarios
- Concurrent operations

## Key Testing Patterns

### 1. Authorization Testing

```rust
#[test]
#[should_panic]
fn test_operation_requires_auth() {
    let env = Env::default();
    let client = create_contract(&env);
    let user = Address::generate(&env);

    // No auth mocking - should panic
    client.sensitive_operation(&user);
}
```

### 2. State Verification

```rust
#[test]
fn test_state_transition() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);

    // Perform operation
    client.operation();

    // Verify state
    let state = client.get_state();
    assert_eq!(state.field, expected_value);
}
```

### 3. Error Handling

```rust
#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_error_case() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);

    // Trigger error condition
    client.operation_that_fails();
}
```

### 4. Token Transfer Verification

```rust
#[test]
fn test_token_transfer() {
    let env = Env::default();
    env.mock_all_auths();

    let token = create_token(&env, &admin);
    let token_client = TokenClient::new(&env, &token);

    // Mint tokens
    token_admin.mint(&user, &amount);
    assert_eq!(token_client.balance(&user), amount);

    // Perform transfer
    client.transfer(&user);

    // Verify balances
    assert_eq!(token_client.balance(&user), 0);
    assert_eq!(token_client.balance(&recipient), amount);
}
```

## Test Execution Flow

### Setup Phase

1. Create test environment
2. Register contract
3. Create test addresses
4. Setup tokens if needed
5. Mock authentication

### Execution Phase

1. Perform contract operations
2. Verify state changes
3. Check token transfers
4. Validate events

### Verification Phase

1. Assert expected outcomes
2. Verify state consistency
3. Check error conditions
4. Validate history/events

## Common Test Utilities

### Contract Creation

```rust
fn create_contract(env: &Env) -> ContractClient<'_> {
    let contract_id = env.register(Contract, ());
    ContractClient::new(env, &contract_id)
}
```

### Token Setup

```rust
fn create_token(env: &Env, admin: &Address) -> Address {
    env.register_stellar_asset_contract_v2(admin.clone()).address()
}
```

### Address Generation

```rust
let user = Address::generate(&env);
```

### Time Manipulation

```rust
env.ledger().with_mut(|ledger| {
    ledger.timestamp = 1000;
});
```

## Debugging Tests

### Run with Output

```bash
cargo test --lib -- --nocapture
```

### Run Single Test with Output

```bash
cargo test --lib test_name -- --nocapture --test-threads=1
```

### Enable Logging

```bash
RUST_LOG=debug cargo test --lib
```

## Best Practices

1. **Clear Test Names**: Use descriptive names that explain what is being tested
2. **Single Responsibility**: Each test should verify one behavior
3. **Proper Setup**: Use helper functions for common setup
4. **Comprehensive Coverage**: Test both success and failure paths
5. **Clear Assertions**: Use meaningful assertion messages
6. **Isolation**: Tests should not depend on each other
7. **Documentation**: Include comments explaining complex test logic

## Continuous Integration

Tests are automatically run on:

- Pull requests
- Commits to main branch
- Release builds

See `.github/workflows/contract-ci-cd.yml` for CI configuration.

## Contributing

When adding new tests:

1. Follow existing naming conventions
2. Use helper functions for common operations
3. Test both success and failure cases
4. Include documentation comments
5. Ensure tests are isolated and repeatable
6. Run full test suite before submitting PR

## Troubleshooting

### Test Compilation Errors

```bash
# Clean and rebuild
cargo clean
cargo test --lib
```

### Authorization Failures

Ensure `env.mock_all_auths()` is called before operations requiring auth.

### Token Balance Issues

Verify tokens are minted before transfer operations.

### Timeout Issues

Increase test timeout or check for infinite loops in contract code.

## Related Documentation

- [CONTRACT_TESTING_SUMMARY.md](./CONTRACT_TESTING_SUMMARY.md) - Comprehensive test summary
- [ISSUE_645_IMPLEMENTATION.md](./ISSUE_645_IMPLEMENTATION.md) - Registry initialization tests
- [ISSUE_646_IMPLEMENTATION.md](./ISSUE_646_IMPLEMENTATION.md) - Escrow lifecycle tests
- [ISSUE_647_IMPLEMENTATION.md](./ISSUE_647_IMPLEMENTATION.md) - Payment processing tests
- [ISSUE_648_IMPLEMENTATION.md](./ISSUE_648_IMPLEMENTATION.md) - NFT and agent tests

## Support

For issues or questions about the tests:

1. Check the relevant issue documentation
2. Review test code comments
3. Consult Soroban SDK documentation
4. Open an issue on GitHub

## License

All tests are part of the Chioma project and follow the same license.
