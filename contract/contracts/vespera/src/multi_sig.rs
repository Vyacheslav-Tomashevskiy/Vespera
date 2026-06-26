use crate::{
    errors::RentalError,
    events,
    storage::DataKey,
    types::{ActionType, AdminProposal, MultiSigConfig},
};
use soroban_sdk::{Address, Bytes, Env, String, Vec};

const PROPOSAL_EXPIRY_SECONDS: u64 = 7 * 24 * 60 * 60; // 7 days

// ─── ID Generation ────────────────────────────────────────────────────────────

const HEX: [u8; 16] = *b"0123456789abcdef";

/// Generate a unique proposal ID like "prop_0000001a" from a counter value.
///
/// Mirrors `timelock::make_action_id` so every proposal gets a distinct key.
/// Without this each proposal reused the constant "prop_" key and overwrote
/// the previous one.
fn make_proposal_id(env: &Env, count: u32) -> String {
    let b = count.to_be_bytes(); // 4 bytes big-endian
    let encoded: [u8; 13] = [
        b'p',
        b'r',
        b'o',
        b'p',
        b'_',
        HEX[((b[0] >> 4) & 0xf) as usize],
        HEX[(b[0] & 0xf) as usize],
        HEX[((b[1] >> 4) & 0xf) as usize],
        HEX[(b[1] & 0xf) as usize],
        HEX[((b[2] >> 4) & 0xf) as usize],
        HEX[(b[2] & 0xf) as usize],
        HEX[((b[3] >> 4) & 0xf) as usize],
        HEX[(b[3] & 0xf) as usize],
    ];
    String::from_bytes(env, &encoded)
}

/// Initialize multi-sig configuration
pub fn initialize_multisig(
    env: &Env,
    admins: Vec<Address>,
    required_signatures: u32,
) -> Result<(), RentalError> {
    // Check if already initialized
    if env.storage().instance().has(&DataKey::MultiSigConfig) {
        return Err(RentalError::AlreadyInitialized);
    }

    let total_admins = admins.len();
    if total_admins == 0 {
        return Err(RentalError::InvalidConfig);
    }

    if required_signatures == 0 || required_signatures > total_admins {
        return Err(RentalError::InvalidConfig);
    }

    // Verify all admins are unique
    for i in 0..admins.len() {
        for j in (i + 1)..admins.len() {
            if admins.get(i).unwrap() == admins.get(j).unwrap() {
                return Err(RentalError::InvalidConfig);
            }
        }
    }

    let config = MultiSigConfig {
        admins,
        required_signatures,
        total_admins,
    };

    env.storage()
        .instance()
        .set(&DataKey::MultiSigConfig, &config);
    env.storage().instance().extend_ttl(500000, 500000);

    // Initialize proposal count
    env.storage().instance().set(&DataKey::ProposalCount, &0u32);

    events::multisig_initialized(env, total_admins, required_signatures);

    Ok(())
}

/// Get multi-sig configuration
pub fn get_multisig_config(env: &Env) -> Result<MultiSigConfig, RentalError> {
    env.storage()
        .instance()
        .get(&DataKey::MultiSigConfig)
        .ok_or(RentalError::MultiSigNotInitialized)
}

/// Check if an address is an admin
pub fn is_admin(env: &Env, address: &Address) -> Result<bool, RentalError> {
    let config = get_multisig_config(env)?;

    for admin in config.admins.iter() {
        if &admin == address {
            return Ok(true);
        }
    }

    Ok(false)
}

/// Require that the caller is an admin
pub fn require_admin(env: &Env, caller: &Address) -> Result<(), RentalError> {
    if !is_admin(env, caller)? {
        return Err(RentalError::Unauthorized);
    }
    Ok(())
}

/// Propose an admin action
pub fn propose_action(
    env: &Env,
    proposer: Address,
    action_type: ActionType,
    target: Option<Address>,
    data: Bytes,
) -> Result<String, RentalError> {
    proposer.require_auth();
    require_admin(env, &proposer)?;

    // Generate proposal ID
    let mut proposal_count: u32 = env
        .storage()
        .instance()
        .get(&DataKey::ProposalCount)
        .unwrap_or(0);

    proposal_count += 1;
    // Derive a unique proposal ID from the incrementing counter so each
    // proposal is stored under its own DataKey::AdminProposal key. Previously
    // this was a constant "prop_", so every new proposal silently overwrote
    // the prior one and approvals were attributed to the wrong proposal.
    let proposal_id = make_proposal_id(env, proposal_count);

    // Create proposal with single approval from proposer
    let mut approvals = Vec::new(env);
    approvals.push_back(proposer.clone());

    let proposal = AdminProposal {
        id: proposal_id.clone(),
        proposer: proposer.clone(),
        action_type: action_type.clone(),
        target,
        data,
        approvals,
        approval_count: 1,
        executed: false,
        created_at: env.ledger().timestamp(),
        expiry: env.ledger().timestamp() + PROPOSAL_EXPIRY_SECONDS,
    };

    // Store proposal
    env.storage()
        .persistent()
        .set(&DataKey::AdminProposal(proposal_id.clone()), &proposal);
    env.storage().persistent().extend_ttl(
        &DataKey::AdminProposal(proposal_id.clone()),
        500000,
        500000,
    );

    // Update proposal count
    env.storage()
        .instance()
        .set(&DataKey::ProposalCount, &proposal_count);

    // Add to active proposals list
    let mut active_proposals: Vec<String> = env
        .storage()
        .instance()
        .get(&DataKey::ActiveProposals)
        .unwrap_or(Vec::new(env));
    active_proposals.push_back(proposal_id.clone());
    env.storage()
        .instance()
        .set(&DataKey::ActiveProposals, &active_proposals);

    events::action_proposed(env, proposal_id.clone(), proposer, action_type);

    Ok(proposal_id)
}

/// Approve a proposal
pub fn approve_action(
    env: &Env,
    approver: Address,
    proposal_id: String,
) -> Result<(), RentalError> {
    approver.require_auth();
    require_admin(env, &approver)?;

    let mut proposal: AdminProposal = env
        .storage()
        .persistent()
        .get(&DataKey::AdminProposal(proposal_id.clone()))
        .ok_or(RentalError::ProposalNotFound)?;

    // Check if already executed
    if proposal.executed {
        return Err(RentalError::ProposalAlreadyExecuted);
    }

    // Check if expired
    if env.ledger().timestamp() > proposal.expiry {
        return Err(RentalError::ProposalExpired);
    }

    // Check if already approved by this address
    for approval in proposal.approvals.iter() {
        if approval == approver {
            return Err(RentalError::AlreadyApproved);
        }
    }

    // Add approval
    proposal.approvals.push_back(approver.clone());
    proposal.approval_count += 1;

    // Update proposal
    env.storage()
        .persistent()
        .set(&DataKey::AdminProposal(proposal_id.clone()), &proposal);

    events::action_approved(env, proposal_id, approver, proposal.approval_count);

    Ok(())
}

/// Execute a proposal if it has enough approvals
pub fn execute_action(
    env: &Env,
    executor: Address,
    proposal_id: String,
) -> Result<(), RentalError> {
    executor.require_auth();
    require_admin(env, &executor)?;

    let mut proposal: AdminProposal = env
        .storage()
        .persistent()
        .get(&DataKey::AdminProposal(proposal_id.clone()))
        .ok_or(RentalError::ProposalNotFound)?;

    // Check if already executed
    if proposal.executed {
        return Err(RentalError::ProposalAlreadyExecuted);
    }

    // Check if expired
    if env.ledger().timestamp() > proposal.expiry {
        return Err(RentalError::ProposalExpired);
    }

    // Check if has enough approvals
    let config = get_multisig_config(env)?;
    if proposal.approval_count < config.required_signatures {
        return Err(RentalError::InsufficientApprovals);
    }

    // Perform the actual state change for the approved action. Authorization
    // is the multi-sig approval threshold verified above, so the dispatched
    // helpers intentionally do not require a single-admin signature. If the
    // action cannot be applied (malformed payload / unsupported action) this
    // returns Err and the whole transaction reverts, so the proposal is NOT
    // marked executed — governance never silently no-ops.
    dispatch_action(env, &proposal)?;

    // Mark as executed
    proposal.executed = true;
    env.storage()
        .persistent()
        .set(&DataKey::AdminProposal(proposal_id.clone()), &proposal);

    // Remove from active proposals
    let active_proposals: Vec<String> = env
        .storage()
        .instance()
        .get(&DataKey::ActiveProposals)
        .unwrap_or(Vec::new(env));

    let mut new_active = Vec::new(env);
    for id in active_proposals.iter() {
        if id != proposal_id {
            new_active.push_back(id);
        }
    }
    env.storage()
        .instance()
        .set(&DataKey::ActiveProposals, &new_active);

    events::action_executed(env, proposal_id, proposal.action_type);

    Ok(())
}

fn parse_required_signatures(data: &Bytes) -> Result<u32, RentalError> {
    if data.len() != 4 {
        return Err(RentalError::InvalidInput);
    }
    let mut buf = [0u8; 4];
    for (i, b) in buf.iter_mut().enumerate() {
        *b = data.get(i as u32).ok_or(RentalError::InvalidInput)?;
    }
    Ok(u32::from_be_bytes(buf))
}

/// Apply the concrete state change described by an approved proposal.
///
/// The `data` payload (where one is needed) is the XDR encoding of the typed
/// argument for the action, decoded with `FromXdr`; a malformed payload yields
/// `InvalidInput`. Address-only actions read `proposal.target`.
fn dispatch_action(env: &Env, proposal: &AdminProposal) -> Result<(), RentalError> {
    use crate::admin_actions;
    use crate::types::{
        Config as ContractConfig, RateLimitConfig, SupportedToken, TokenExchangeRate,
    };
    use soroban_sdk::xdr::FromXdr;

    match proposal.action_type {
        ActionType::Pause => admin_actions::apply_pause(env),
        ActionType::Unpause => admin_actions::apply_unpause(env),
        ActionType::UpdateConfig => {
            let cfg = ContractConfig::from_xdr(env, &proposal.data)
                .map_err(|_| RentalError::InvalidInput)?;
            admin_actions::apply_update_config(env, cfg)
        }
        ActionType::UpdateRate => {
            let rate = TokenExchangeRate::from_xdr(env, &proposal.data)
                .map_err(|_| RentalError::InvalidInput)?;
            crate::multi_token::set_exchange_rate(
                env.clone(),
                rate.from_token,
                rate.to_token,
                rate.rate,
            )
        }
        ActionType::AddAdmin => {
            let new_admin = proposal.target.clone().ok_or(RentalError::InvalidInput)?;
            add_admin_internal(env, new_admin)
        }
        ActionType::RemoveAdmin => {
            let admin = proposal.target.clone().ok_or(RentalError::InvalidInput)?;
            remove_admin_internal(env, admin)
        }
        ActionType::UpdateRequiredSignatures => {
            let new_required = parse_required_signatures(&proposal.data)?;
            update_required_signatures_internal(env, new_required)
        }
        ActionType::SetRateLimit => {
            let cfg = RateLimitConfig::from_xdr(env, &proposal.data)
                .map_err(|_| RentalError::InvalidInput)?;
            crate::rate_limit::set_rate_limit_config(env, cfg)
        }
        ActionType::AddToken => {
            let token = SupportedToken::from_xdr(env, &proposal.data)
                .map_err(|_| RentalError::InvalidInput)?;
            crate::multi_token::add_supported_token(
                env.clone(),
                token.token_address,
                token.symbol,
                token.decimals,
                token.min_amount,
                token.max_amount,
            )
        }
        ActionType::RemoveToken => {
            let token = proposal.target.clone().ok_or(RentalError::InvalidInput)?;
            crate::multi_token::remove_supported_token(env.clone(), token)
        }
        // No on-chain handler is defined for a free-form emergency action;
        // fail loudly instead of marking the proposal executed with no effect.
        ActionType::EmergencyAction => Err(RentalError::InvalidTransition),
    }
}

/// Reject/cancel a proposal (only proposer can do this before execution)
pub fn reject_action(env: &Env, caller: Address, proposal_id: String) -> Result<(), RentalError> {
    caller.require_auth();
    require_admin(env, &caller)?;

    let proposal: AdminProposal = env
        .storage()
        .persistent()
        .get(&DataKey::AdminProposal(proposal_id.clone()))
        .ok_or(RentalError::ProposalNotFound)?;

    // Only proposer can reject before execution
    if proposal.proposer != caller {
        return Err(RentalError::Unauthorized);
    }

    if proposal.executed {
        return Err(RentalError::ProposalAlreadyExecuted);
    }

    // Remove proposal
    env.storage()
        .persistent()
        .remove(&DataKey::AdminProposal(proposal_id.clone()));

    // Remove from active proposals
    let active_proposals: Vec<String> = env
        .storage()
        .instance()
        .get(&DataKey::ActiveProposals)
        .unwrap_or(Vec::new(env));

    let mut new_active = Vec::new(env);
    for id in active_proposals.iter() {
        if id != proposal_id {
            new_active.push_back(id);
        }
    }
    env.storage()
        .instance()
        .set(&DataKey::ActiveProposals, &new_active);

    events::action_rejected(env, proposal_id);

    Ok(())
}

/// Add a new admin through multi-sig proposal execution
pub fn add_admin_internal(env: &Env, new_admin: Address) -> Result<(), RentalError> {
    let mut config = get_multisig_config(env)?;

    // Check if already admin
    for admin in config.admins.iter() {
        if admin == new_admin {
            return Err(RentalError::InvalidInput);
        }
    }

    // Add new admin
    config.admins.push_back(new_admin.clone());
    config.total_admins += 1;

    // Update storage
    env.storage()
        .instance()
        .set(&DataKey::MultiSigConfig, &config);
    env.storage().instance().extend_ttl(500000, 500000);

    events::admin_added(env, new_admin, config.total_admins);

    Ok(())
}

/// Remove an admin through multi-sig proposal execution
pub fn remove_admin_internal(env: &Env, admin_to_remove: Address) -> Result<(), RentalError> {
    let mut config = get_multisig_config(env)?;

    // Cannot remove last admin
    if config.total_admins <= 1 {
        return Err(RentalError::InvalidConfig);
    }

    // Find and remove admin
    let mut found = false;
    let mut new_admins = Vec::new(env);

    for admin in config.admins.iter() {
        if admin == admin_to_remove {
            found = true;
        } else {
            new_admins.push_back(admin);
        }
    }

    if !found {
        return Err(RentalError::Unauthorized);
    }

    config.admins = new_admins;
    config.total_admins -= 1;

    // Adjust required signatures if needed
    if config.required_signatures > config.total_admins {
        config.required_signatures = config.total_admins;
    }

    // Update storage
    env.storage()
        .instance()
        .set(&DataKey::MultiSigConfig, &config);
    env.storage().instance().extend_ttl(500000, 500000);

    events::admin_removed(env, admin_to_remove, config.total_admins);

    Ok(())
}

/// Update required signatures through multi-sig proposal execution
pub fn update_required_signatures_internal(
    env: &Env,
    new_required: u32,
) -> Result<(), RentalError> {
    let mut config = get_multisig_config(env)?;

    if new_required == 0 || new_required > config.total_admins {
        return Err(RentalError::InvalidConfig);
    }

    let old_required = config.required_signatures;
    config.required_signatures = new_required;

    // Update storage
    env.storage()
        .instance()
        .set(&DataKey::MultiSigConfig, &config);
    env.storage().instance().extend_ttl(500000, 500000);

    events::required_signatures_updated(env, old_required, new_required);

    Ok(())
}

/// Get a proposal by ID
pub fn get_proposal(env: &Env, proposal_id: String) -> Result<AdminProposal, RentalError> {
    env.storage()
        .persistent()
        .get(&DataKey::AdminProposal(proposal_id))
        .ok_or(RentalError::ProposalNotFound)
}

/// Get all active proposals
pub fn get_active_proposals(env: &Env) -> Result<Vec<String>, RentalError> {
    Ok(env
        .storage()
        .instance()
        .get(&DataKey::ActiveProposals)
        .unwrap_or(Vec::new(env)))
}

/// Get proposal count
pub fn get_proposal_count(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::ProposalCount)
        .unwrap_or(0)
}
