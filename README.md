<h1 align="center">⛰️🌱🌳<a href="https://masch.github.io/bda-rwa-natural-resources">BDA RWA Natural Resources</a>🌳💧⛰️</h1>


<div align="center">
  <a href="https://bosquesdeagua.ar/">
    <img src="images/cropped-logo-blanco-big.webp" alt="logo" width="500"/>
  </a>
  </br>
  </br>
</div>

Bosques de Agua is a decentralized ecosystem built on **Stellar Soroban** to tokenize and monitor reforestation projects. By bridging real-world assets (RWA) with on-chain transparency, Bosques de Agua allows investors to own specific parcels of land while receiving real-time ecological data.

## 🏗 Architecture Overview

The system is designed with a **Modular Oracle-NFT Architecture** to handle dynamic environmental data efficiently:

1.  **Bosques de Agua Oracle (SEP-40)**: Acting as the single source of truth for environmental metrics. It receives data from IoT sensors (e.g., Raspberry Pi) and stores dynamic values like biomass, CO2 capture, and plant health.
2.  **Bosques de Agua NFT (SEP-50)**: Represents ownership of a specific reforestation parcel. Instead of relying on static metadata (SEP-11), it performs **Cross-Contract Calls** to the Oracle to provide live impact data.




## 🌟 Key Features
-   **Interactive Map Interface**: Visual frontend tracking parcels, dynamically loading geometries to allow direct geographical selection of real-world land.
-   **Dynamic Impact Tracking (Oracle)**: Real-time monitoring of biomass (grams), CO2 captured (milligrams), and plant health status via IoT endpoints.
-   **Cross-Contract Communication**: The SEP-50 NFT contract performs live cross-contract calls to the SEP-40 Oracle to fetch live metrics directly on-chain.
-   **Seamless Wallet Integration**: Users donate USDC securely to fractionalized parcels acting as a minting trigger, powered by `stellar-wallets-kit` and Freighter.
-   **Multisig Donation Treasury**: Inherent support for multisig collective wallets directly in the architecture to receive, secure, and distribute all incoming donations transparently.
-   **Multilingual Support & Leaderboards**: Fully internationalized (i18n) platform with English/Spanish switching and a global Top Donators chart.
-   **IoT-Native Security**: Restricted write access via `stellar-access` ensures only authorized sensor nodes can update the environmental Oracle metrics.


## 🗺️ Architecture Diagram
```mermaid
---
title: Bosques de Agua - Architecture Diagram
---
flowchart TD
    %% Main Nodes
    UI["🖥️ UI Platform<br/>(React DApp)"]
    Backend["⚙️ Backend / IoT<br/>(Node.js / RPi)"]
    DB[("🗄️ Supabase<br/>(PostgreSQL)")]
    IPNS{{"🌐 IPNS<br/>(Metadata)"}}
    Wallet["👛 Wallet<br/>(Freighter)"]

    %% Integration Kits (Off-chain)
    WalletsKit("🛠️ stellar-wallets-kit")
    StellarSDK("🛠️ stellar-sdk")

    %% Stellar Blockchain Environment
    subgraph StellarNetwork ["🔗 STELLAR 🔗"]
        direction TB
        NFT["📜 NFT Smart Contract<br/>(SEP-50)"]
        Oracle["⚖️ Oracle Smart Contract<br/>(SEP-40)"]
        Multisig["🏦 Multisig Wallet<br/>(Donation Treasury)"]
        
        %% Cross-contract Interactions within Stellar
        NFT -- "Queries metrics (get_live_impact)" --> Oracle
        NFT -- "Sends collected funds" --> Multisig
    end

    %% Frontend and Wallet Relations
    UI -- "Requests connection & signature" --> Wallet
    UI -- "Uses for transaction building" --> WalletsKit
    WalletsKit -- "Submits transaction (mint)" --> NFT
    UI -- "Queries data / Metadata" --> Backend

    %% Backend Relations
    Backend -- "Read / Write" --> DB
    Backend -- "Generates and links Metadata" --> IPNS
    
    %% Backend -> Oracle Relation
    Backend -. "Injects authorized signatures" .-> StellarSDK
    StellarSDK -. "Updates metrics (biomass, CO2)" .-> Oracle

    %% Node Styles
    style UI fill:#f4f4f4,stroke:#333,stroke-width:2px,color:#000
    style Backend fill:#f4f4f4,stroke:#333,stroke-width:2px,color:#000
    style DB fill:#e2e8f0,stroke:#64748b,stroke-width:2px,color:#000
    style IPNS fill:#e2e8f0,stroke:#64748b,stroke-width:2px,color:#000
    style Wallet fill:#fff,stroke:#10b981,stroke-width:2px,color:#000
    
    style StellarNetwork fill:#ecfdf5,stroke:#059669,stroke-width:3px,stroke-dasharray: 5 5,color:#000
    style NFT fill:#a7f3d0,stroke:#047857,stroke-width:2px,color:#000
    style Oracle fill:#a7f3d0,stroke:#047857,stroke-width:2px,color:#000
    style Multisig fill:#fde68a,stroke:#d97706,stroke-width:2px,color:#000
```

## 🛠 Project Structure

```text
/
├── contracts/               # Stellar Soroban Smart Contracts
│   ├── oracle/              # SEP-40 Oracle Implementation
│   │   ├── src/           
│   │   │   ├── lib.rs       # Core logic for impact metrics & price feeds
│   │   │   ├── types.rs     # Data structures (HealthStatus, ImpactMetrics)
│   │   │   ├── errors.rs    # Custom contract error handling
│   │   │   ├── events.rs    # Emitted contract events
│   │   │   └── tests/       # Oracle Unit Tests
│   │   │       └── tests.rs # Coverage for impact metrics updates
│   │   └── Cargo.toml
│   └── nft/                 # SEP-50 NFT Implementation
│       ├── src/
│       │   ├── lib.rs       # SEP-50 standard & Fractionalized geo-minting
│       │   ├── types.rs     # Data structures (Token Metadata)
│       │   ├── errors.rs    # Custom NFT error states
│       │   ├── events.rs    # Mint and burn events
│       │   └── tests/       # NFT Unit Tests
│       │       └── tests.rs # Validations & Cross-contract testing
│       └── Cargo.toml
└── dapp/                    # React Frontend
    ├── src/
    │   ├── components/      # Map and UI widgets
    │   ├── contracts/       # Generated TS bindings for Soroban
    │   ├── hooks/           # Wallets and Translation hooks
    │   ├── App.tsx          # Main interactive interface 
    │   └── i18n.ts          # Multi-language configuration
    └── package.json
```

---

## 🌐 Bosques de Agua Ecosystem

This smart contract and DApp repository operates as part of a larger interoperable ecosystem for direct IoT-to-Blockchain integration. You can explore the hardware and control layers in their respective repositories:

*   **[App Control Firmware (`bda-app-control`)](https://github.com/masch/bda-app-control):** A Go-based web application orchestrating the active monitoring and remote control of environmental appliances (incubators/ovens) with a PostgreSQL database layer.
*   **[Seed Incubators IoT (`bda-seed-incubators`)](https://github.com/masch/bda-seed-incubators):** ESP32 microcontroller firmware using C++ and the Arduino framework to automate seed incubators with PID temperature control loops and OTA Firebase updates.

---

## 🚀 Getting Started

### Prerequisites

-   Rust & Cargo
-   [Stellar CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup#install-the-stellar-cli)

### Core Makefile Commands

We provide a comprehensive `Makefile` in the root folder to automate testing, frontend execution, and testnet deployments. Here are the most important commands:

**DApp (Frontend)**
- `make dapp_install`: Install all frontend dependencies via `bun`.
- `make dapp`: Run the local development server for the React DApp.

**Smart Contracts Lifecycle**
- `make contract_build`: Builds both Oracle and NFT contracts to WASM.
- `make contract_test`: Runs full Rust unit and integration test suites.
- `make contract_build-release`: Optimizes WASM files for deployment.
- `make contract_deploy`: Deploys contracts to the Soroban Testnet and logs their IDs.
- `make contract_bindings`: Auto-generates TypeScript bindings from WASM, installs them into the UI, and formats the code.

**Network & Environment Setup**
- `make prepare`: Configures stellar network CLI, generates keys, and adds fresh testnet accounts.
- `make funds`: Requests Friendbot funds for deployed testnet accounts.
- `make sync-env`: Synchronizes the newly deployed `PUBLIC_BOSCORA_NFT_CONTRACT_ID` into the DApp's `.env` and GitHub Action files.

**The "Do It All" Playbook**
- `make testnet_reset`: Single command to execute the full lifecycle: gets funds, mints trustlines, generates bindings, deploys all contracts, and syncs env variables.

*Run `make help` to see the full list of available commands directly in your terminal.*

## 📊 Technical Specifications

### Impact Metrics (Oracle)
-   **Biomass**: `i128` (Grams)
-   **CO2 Captured**: `i128` (Milligrams)
-   **Health Status**: `Enum` (0: Germinating, 1: Sprouted, 2: Ready for Transplant, 3: Planted)

### Core Functions

| Contract | Function | Description |
| --- | --- | --- |
| **Oracle** | `update_impact_metrics` | Authorized node update for biomass, CO2, and health. |
| **Oracle** | `lastprice` | SEP-40 interface returning biomass. |
| **NFT** | `mint` | Creates a new parcel linked to geographical coordinates. |
| **NFT** | `get_live_impact` | **Cross-contract query** to fetch real-time data from the Oracle. |
| **NFT** | `geo_coordinates` | Retrieves physical parcel location. |

---

## 📄 License

This project is licensed under the MIT License.
