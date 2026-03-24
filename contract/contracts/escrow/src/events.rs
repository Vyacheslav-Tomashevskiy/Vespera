//! Contract events for escrow lifecycle and timeout handling.
use soroban_sdk::{contractevent, BytesN, Env};

#[contractevent(topics = ["escrow_timeout"])]
pub struct EscrowTimeout {
    #[topic]
    pub escrow_id: BytesN<32>,
}

#[contractevent(topics = ["dispute_timeout"])]
pub struct DisputeTimeout {
    #[topic]
    pub escrow_id: BytesN<32>,
}

pub(crate) fn escrow_timeout(env: &Env, escrow_id: BytesN<32>) {
    EscrowTimeout { escrow_id }.publish(env);
}

pub(crate) fn dispute_timeout(env: &Env, escrow_id: BytesN<32>) {
    DisputeTimeout { escrow_id }.publish(env);
}
