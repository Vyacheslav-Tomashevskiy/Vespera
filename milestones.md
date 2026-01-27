# 🏠 Chioma Project Roadmap: Inception to Production

This document outlines the development roadmap for **Chioma**, a decentralized rental marketplace on **Stellar**.
It defines the technical strategy, Stellar protocols to utilize, and a step-by-step milestone plan from MVP to Mainnet.

---

## 📚 Table of Contents

- [1️⃣ Technical Stack & Protocols](#1️⃣-technical-stack--protocols)
- [2️⃣ Milestones](#2️⃣-milestones)
  - [Phase 1: Foundation & Prototype (MVP – Local)](#🧪-phase-1-foundation--prototype-mvp--local)
  - [Phase 2: Alpha Release (Testnet)](#🧫-phase-2-alpha-release-testnet)
  - [Phase 3: Beta & Integrations (Testnet → Mainnet)](#🚀-phase-3-beta--integrations-testnet-→-mainnet)
  - [Phase 4: Production (Mainnet Launch)](#🌍-phase-4-production-mainnet-launch)
- [Immediate Next Steps](#⚡-immediate-next-steps)
- [Project Milestones (GitHub-Issue Ready)](#📋-chioma-detailed-project-milestones-github-issue-ready)
- [Definitions & Release Checklist](#definitions--release-checklist)

---

## 1️⃣ Technical Stack & Protocols

### Core Architecture

* **Blockchain:** Stellar Network (Soroban Contracts + Classic Operations)
* **Frontend:** Next.js (React)
* **Backend:** NestJS (Node.js)
* **Smart Contracts:** Rust (Soroban)

---

### Key Stellar Protocols (SEPs)

To build a robust and interoperable application, Chioma will implement the following **Stellar Ecosystem Proposals (SEPs)**:

#### 🔐 SEP-0010: Stellar Web Authentication

* **Usage:** Authenticate users (Landlords, Tenants, Agents) by proving ownership of their Stellar wallet.
* **Benefit:**

  * Non-custodial
  * No passwords
  * Leverages wallet security

#### 💱 SEP-0024: Hosted Deposit & Withdrawal

* **Usage:** Integrate Anchors (e.g. MoneyGram, local exchanges) for:

  * Fiat → USDC (deposit)
  * USDC → Fiat (withdrawal)
* **Benefit:** Enables real-world rent payments using local currency value.

#### 🔗 SEP-0007: URI Scheme

* **Usage:** Generate clickable payment links for rent requests.
* **Benefit:** Simple, wallet-friendly rent payment UX.

---

### Authentication Strategy

**Will it be wallet-based?** → ✅ **YES**

* **Primary Auth:** Wallet Connect (Freighter, Albedo, xBull)
* **Mechanism:**

  1. Frontend connects to wallet
  2. Backend generates SEP-10 challenge transaction
  3. Wallet signs challenge
  4. Backend verifies signature off-chain
* **User Types:**

  * Landlord
  * Tenant
  * Agent
* **Profile Data Storage:**

  * Stored **off-chain** (PostgreSQL via NestJS)
  * Keyed by Stellar Public Key (`G...`)

---

## 2️⃣ Milestones

---

## 🧪 Phase 1: Foundation & Prototype (MVP – Local)

**Goal:** Working end-to-end flow on a local standalone network.

---

### 2.1 Smart Contract Development

* Implement `RentalAgreement` contract

  * Store lease terms (rent amount, due date, tenant/landlord addresses)
* Implement `Escrow` contract

  * Hold security deposits
  * Release on mutual approval
* Write unit tests in Rust

  ```text
  contract/contracts/chioma/src/test.rs
  ```

---

### 2.2 Frontend Setup

* Integrate:

  * `@stellar/freighter-api`
  * `@stellar/stellar-sdk`
* Create **Connect Wallet** button
* Build basic forms:

  * Create Listing
  * Pay Rent (contract interaction)

---

### 2.3 Backend Setup

* Implement **SEP-10 Auth Guard** in NestJS
* Create APIs for off-chain data:

  * Property details
  * Images
* Set up **PostgreSQL** database

---

## 🧫 Phase 2: Alpha Release (Testnet)

**Goal:** Publicly testable version on Stellar Testnet / Futurenet.

---

### 2.4 Deployment & Indexing

* Deploy contracts to **Stellar Testnet**
* Set up an indexer (Mercury or custom ingestion):

  * Track events:

    * New Lease
    * Rent Paid
  * Sync events into backend DB

---

### 2.5 Feature Completion

* **Agent Commissions**

  * Auto-split rent (90% landlord / 10% agent – configurable)
* **Dispute Resolution**

  * `dispute()` function
  * Freeze funds until admin/arbiter resolves

---

### 2.6 User Experience

* Real-time UI updates (WebSockets / subscriptions)
* Tenant Dashboard:

  * Rent history
  * Upcoming due dates
* Landlord Dashboard:

  * Active leases
  * Total income

---

## 🚀 Phase 3: Beta & Integrations (Testnet → Mainnet)

**Goal:** Production-ready features and external integrations.

---

### 3.1 Anchor Integration (SEP-24)

* UI for:

  * Deposit Cash
  * Withdraw Cash
* Seamless flow:

  ```
  Fiat → Wallet → Rent Payment
  ```

---

### 3.2 Profiles & Notifications

* Email / SMS notifications:

  * Rent Due
  * Payment Received
* Verified Profiles

  * Optional KYC integration

---

### 3.3 Security & Optimization

* Gas optimization (Soroban)
* Backend rate limiting

---

## 🌍 Phase 4: Production (Mainnet Launch)

**Goal:** Live real-world transactions.

---

### 4.1 Audits

* Smart contract security audit
* End-to-end user flow testing

---

### 4.2 Mainnet Deployment

* Deploy final contracts to Mainnet
* Lock admin keys or migrate to:

  * DAO
  * Multi-sig

---

### 4.3 Marketing & Onboarding

* Onboard initial landlords & agents
* Launch marketing campaign

---

## ⚡ Immediate Next Steps

* **Contracts:**
  - Flesh out `ChiomaContract` in `src/lib.rs`
  - Implement `create_lease` and add unit + integration tests
* **Frontend:**
  - Install and lock versions for:
    - `@stellar/stellar-sdk`
    - `@stellar/freighter-api`
  - Add `Connect Wallet` component and seed pages for Create Listing and Pay Rent
* **Auth:**
  - Implement full **SEP-10 flow** between Next.js & NestJS
  - Add an end-to-end test (Playwright or Cypress) for the auth flow
* **Project Setup:**
  - Create a GitHub Project board and link milestone issues
  - Add ISSUE_TEMPLATE(s) for feature, bug, and security reports
  - Add `CODEOWNERS` for `contracts/`, `backend/`, `frontend/`
* **CI/CD & DevOps:**
  - Add GitHub Actions for build/test/lint and Soroban contract checks
  - Dockerize services and add `docker-compose` for local dev
* **Security & Releases:**
  - Add a Security policy and SOPS/Secrets management plan
  - Schedule an initial external audit for beta/mainnet

> Each item above should be converted into a GitHub issue with an owner and priority (P0/P1/P2) so the roadmap is actionable and trackable.


---

---

# 📋 Chioma Detailed Project Milestones (GitHub-Issue Ready)

Each bullet below is designed to be a **standalone GitHub issue**.

---

## 🚚 Phase 1: Smart Contract Development (Soroban)

### 1.1 Environment & Setup

* **Issue:** Initialize Soroban Project Structure

  * Setup `soroban-cli`
  * Configure `Cargo.toml`
  * Create `Makefile` (build, test, deploy)

* **Issue:** Define Data Structures

  * `RentalAgreement`
  * `UserProfile` (minimal on-chain)

---

### 1.2 Core Logic Implementation

* **Issue:** Implement `initialize`

  * Set admin & config
  * Callable only once

* **Issue:** Implement `create_rental_agreement`

  * Landlord proposes lease
  * Pending state

* **Issue:** Implement `sign_agreement`

  * Tenant accepts
  * Status → Active

* **Issue:** Implement `pay_rent`

  * Token transfer (USDC/XLM)
  * Auto split (90/10)
  * Emit `RentPaid` event

---

### 1.3 Escrow & Security

* **Issue:** Security Deposit Escrow

  * Hold funds
  * 2-of-3 release (Landlord, Tenant, Admin)

* **Issue:** Dispute Mechanism

  * Freeze funds on dispute

---

### 1.4 Testing

* **Issue:** Happy Path Tests
* **Issue:** Edge Case Tests
* **Issue:** Integration Tests (Sandbox/Testnet)

---

## 🛠 Phase 2: Backend Development (NestJS)

### 2.1 Setup & Auth

* **Issue:** NestJS Project Initialization
* **Issue:** SEP-10 Auth Strategy

  * Challenge
  * Verify
  * JWT issuance

---

### 2.2 Users & Listings

* **Issue:** User Profile API
* **Issue:** Property Listing Schema & CRUD

---

### 2.3 Image & File Uploads

* **Issue:** Storage Provider Setup
* **Issue:** Image Upload Endpoint
* **Issue:** Image Optimization Pipeline (optional)

---

### 2.4 Indexing & Sync

* **Issue:** Stellar Event Indexer

  * Sync `RentPaid` events
  * Store tx hash

---

## 💻 Phase 3: Frontend Development (Next.js)

### 3.1 Foundation

* **Issue:** Project Setup & Tailwind Theme
* **Issue:** Wallet Integration

---

### 3.2 Core Features (Landlord)

* **Issue:** Create Listing Form
* **Issue:** Manage Listings Dashboard

---

### 3.3 Core Features (Tenant)

* **Issue:** Property Discovery Feed
* **Issue:** Rental Agreement View

---

### 3.4 Dashboard & Analytics

* **Issue:** Payment History UI
* **Issue:** Status Indicators & Alerts

---

## 🧱 Phase 4: Production Readiness

### 4.1 DevOps

* **Issue:** Dockerize Application
* **Issue:** CI/CD Pipeline

---

### 4.2 Security

* **Smart Contract Security:**
  * **Issue:** Smart contract security audit (external)
  * **Issue:** Fuzzing & property-based tests
  * **Issue:** Unit & integration tests covering edge cases
* **Backend Security:**
  * **Issue:** Rate Limiting (API gateway / ingress)
  * **Issue:** Input Validation & Sanitization
  * **Issue:** Dependency scanning (Dependabot / Snyk)
  * **Issue:** Secrets management (SOPS / Vault)
* **Key Management & Governance:**
  * **Issue:** Admin key management strategy
  * **Issue:** Multi-sig & timelock for critical operations
  * **Issue:** Migration plan to DAO or governance contract
* **Incident Response & Monitoring:**
  * **Issue:** Incident response plan & runbooks
  * **Issue:** Post-mortem & disclosure process

---

### Observability & Monitoring

* **Issue:** Centralized logging (ELK / Datadog / Grafana Loki)
* **Issue:** Metrics & dashboards (Prometheus + Grafana)
* **Issue:** Distributed Tracing (OpenTelemetry)
* **Issue:** Alerts & SLOs for critical flows (rent payments, contract calls)

---

### Legal, Compliance & Privacy

* **Issue:** Privacy Policy & Terms of Service
* **Issue:** Optional KYC / AML strategy for fiat flows (work with legal)
* **Issue:** Data retention & GDPR compliance checklist

---

### Governance & Ownership

* **Issue:** Define roles (Admin, Arbiter, Auditor)
* **Issue:** Admin key rotation policy
* **Issue:** DAO migration roadmap (if applicable)
* **Issue:** On-chain vs off-chain arbitration rules

---

### Release Checklist & Definition of Done

Use the checklist below as a template for each major release (Testnet/Beta/Mainnet):

* Code merged to `main` and CI passing ✅
* Unit, integration, and E2E tests passing ✅
* Smart contracts audited (or audit scheduled for Mainnet) ✅
* Monitoring & alerts configured ✅
* Docs updated (API & User Guides) ✅
* Security review completed ✅
* Rollback & migration plan documented ✅

> Add this as a `RELEASE_CHECKLIST.md` and reference it in PR templates.

---

### 4.3 Documentation

* **Issue:** API Documentation (Swagger)
* **Issue:** User Guide for Non-Crypto Users

---
