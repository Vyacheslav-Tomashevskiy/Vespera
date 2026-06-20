use crate::storage::DataKey;
use crate::types::ErrorContext;
use soroban_sdk::{contracterror, Env, String, Vec};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum RentalError {
    // Already existed
    AlreadyInitialized = 1,
    InvalidConfig = 3,
    AgreementAlreadyExists = 4,
    InvalidAmount = 5,
    InvalidDate = 6,
    InvalidCommissionRate = 7,
    AgreementNotActive = 10,
    AgreementNotFound = 13,
    NotTenant = 14,
    Unauthorized = 18,
    InvalidState = 15,
    Expired = 16,
    ContractPaused = 17,
    TokenNotSupported = 19,
    RateNotFound = 20,
    ConversionError = 21,
    InsufficientPayment = 22,
    InvalidTokenBounds = 23,
    AlreadyPaused = 24,
    NotPaused = 25,
    InterestConfigNotFound = 26,
    InterestAlreadyInitialized = 27,
    NoPrincipal = 28,
    RoyaltyNotFound = 29,

    // Payment errors
    PaymentInsufficientFunds = 201,
    PaymentAlreadyProcessed = 202,
    PaymentFailed = 203,
    PaymentInvalidAmount = 204,

    // Timelock errors (reusing range 301-304, replacing unused dispute codes)
    TimelockNotFound = 301,
    TimelockAlreadyExecuted = 302,
    TimelockAlreadyCancelled = 303,
    TimelockEtaNotReached = 304,

    // Escrow errors
    EscrowNotFound = 401,
    EscrowAlreadyReleased = 402,
    EscrowInsufficientFunds = 403,
    EscrowTimeoutNotReached = 404,

    // Authorization & State
    InsufficientPermissions = 501,
    AdminOnly = 502,
    InvalidTransition = 601,
    InvalidInput = 701,
    InvalidAddress = 702,

    // Rate limiting & Generic
    RateLimitExceeded = 801,
    CooldownNotMet = 802,
    InternalError = 901,
    TimelockDelayTooShort = 902,

    // Multi-sig errors (using range 1100-1105 only)
    MultiSigNotInitialized = 1100,
    ProposalNotFound = 1101,
    ProposalAlreadyExecuted = 1102,
    ProposalExpired = 1103,
    InsufficientApprovals = 1104,
    AlreadyApproved = 1105,
}

impl RentalError {
    pub fn message(&self, env: &Env) -> String {
        let msg = match self {
            RentalError::AlreadyInitialized => "Already initialized",
            RentalError::InvalidConfig => "Invalid config",
            RentalError::AgreementAlreadyExists => "Agreement exists",
            RentalError::InvalidAmount => "Invalid amount",
            RentalError::InvalidDate => "Invalid date",
            RentalError::InvalidCommissionRate => "Invalid rate",
            RentalError::AgreementNotActive => "Not active",
            RentalError::AgreementNotFound => "Not found",
            RentalError::NotTenant => "Not tenant",
            RentalError::Unauthorized => "Unauthorized",
            RentalError::InvalidState => "Invalid state",
            RentalError::Expired => "Expired",
            RentalError::ContractPaused => "Paused",
            RentalError::TokenNotSupported => "Unsupported",
            RentalError::RateNotFound => "No rate",
            RentalError::ConversionError => "Error",
            RentalError::InsufficientPayment => "Insufficient",
            RentalError::InvalidTokenBounds => "Bounds",
            RentalError::AlreadyPaused => "Already paused",
            RentalError::NotPaused => "Not paused",
            RentalError::InterestConfigNotFound => "No config",
            RentalError::InterestAlreadyInitialized => "Initialized",
            RentalError::NoPrincipal => "No deposit",
            RentalError::RoyaltyNotFound => "No royalty",

            RentalError::PaymentInsufficientFunds => "Insufficient funds",
            RentalError::PaymentAlreadyProcessed => "Payment already processed",
            RentalError::PaymentFailed => "Payment transfer failed",
            RentalError::PaymentInvalidAmount => "Invalid payment amount",

            RentalError::TimelockNotFound => "Timelock not found",
            RentalError::TimelockAlreadyExecuted => "Timelock already executed",
            RentalError::TimelockAlreadyCancelled => "Timelock already cancelled",
            RentalError::TimelockEtaNotReached => "Timelock ETA not reached",

            RentalError::EscrowNotFound => "Escrow not found",
            RentalError::EscrowAlreadyReleased => "Escrow already released",
            RentalError::EscrowInsufficientFunds => "Escrow insufficient funds",
            RentalError::EscrowTimeoutNotReached => "Escrow timeout not reached",

            RentalError::InsufficientPermissions => "Insufficient permissions",
            RentalError::AdminOnly => "Admin only operation",
            RentalError::InvalidTransition => "Invalid state transition",
            RentalError::InvalidInput => "Invalid input data",
            RentalError::InvalidAddress => "Invalid address",

            RentalError::RateLimitExceeded => "Rate limit exceeded",
            RentalError::CooldownNotMet => "Cooldown not met",
            RentalError::InternalError => "Internal error",
            RentalError::TimelockDelayTooShort => "Delay below minimum",

            RentalError::MultiSigNotInitialized => "Multi-sig not initialized",
            RentalError::ProposalNotFound => "Proposal not found",
            RentalError::ProposalAlreadyExecuted => "Proposal already executed",
            RentalError::ProposalExpired => "Proposal expired",
            RentalError::InsufficientApprovals => "Insufficient approvals",
            RentalError::AlreadyApproved => "Already approved",
        };
        String::from_str(env, msg)
    }

    pub fn code(&self) -> u32 {
        *self as u32
    }
}

pub fn log_error(
    env: &Env,
    error: RentalError,
    operation: String,
    details: String,
) -> Result<(), RentalError> {
    let mut count: u32 = env
        .storage()
        .instance()
        .get(&DataKey::ErrorLogCount)
        .unwrap_or(0);

    let context = ErrorContext {
        error_code: error.code(),
        error_message: error.message(env),
        details,
        timestamp: env.ledger().timestamp(),
        operation,
    };

    env.storage()
        .persistent()
        .set(&DataKey::ErrorLog(count), &context);

    count += 1;
    env.storage()
        .instance()
        .set(&DataKey::ErrorLogCount, &count);

    // Publish event
    crate::events::error_occurred(
        env,
        context.error_code,
        context.operation,
        context.timestamp,
    );

    Ok(())
}

pub fn get_error_logs(env: &Env, limit: u32) -> Result<Vec<ErrorContext>, RentalError> {
    let count: u32 = env
        .storage()
        .instance()
        .get(&DataKey::ErrorLogCount)
        .unwrap_or(0);
    let mut logs = Vec::new(env);

    let start = count.saturating_sub(limit);

    for i in start..count {
        if let Some(log) = env
            .storage()
            .persistent()
            .get::<DataKey, ErrorContext>(&DataKey::ErrorLog(i))
        {
            logs.push_back(log);
        }
    }

    Ok(logs)
}
