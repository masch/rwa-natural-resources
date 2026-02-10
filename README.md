# Boscora: Reforestation & Dynamic Impact Ecosystem

Boscora is a decentralized ecosystem built on **Stellar Soroban** to tokenize and monitor reforestation projects. By bridging real-world assets (RWA) with on-chain transparency, Boscora allows investors to own specific parcels of land while receiving real-time ecological data.

## 🏗 Architecture Overview

The system is designed with a **Modular Oracle-NFT Architecture** to handle dynamic environmental data efficiently:

1.  **Boscora Oracle (SEP-40)**: Acting as the single source of truth for environmental metrics. It receives data from IoT sensors (e.g., Raspberry Pi) and stores dynamic values like biomass, CO2 capture, and plant health.
2.  **Boscora NFT (SEP-50)**: Represents ownership of a specific reforestation parcel. Instead of relying on static metadata (SEP-11), it performs **Cross-Contract Calls** to the Oracle to provide live impact data.

### 🔄 Data Flow
`[IoT Sensors/RPi]` -> `[JS/Node Signer]` -> `[Oracle (SEP-40)]` <- `[NFT (SEP-50)]` <- `[Investors/Users]`

---

## 🌟 Key Features

-   **Dynamic Impact Tracking**: Real-time monitoring of biomass (grams), CO2 captured (milligrams), and plant health status.
-   **SEP-40 Asset Oracle Interface**: Standardized price/value feed compatibility where biomass maps to the "price" for secondary market integrations.
-   **SEP-50 Ownership**: Standardized Non-Fungible Token interface for seamless wallet and marketplace support.
-   **IoT-Native Security**: Restricted write access via `stellar-access` ensures only authorized sensor nodes can update ecological metrics.
-   **Low Ledger Footprint**: Optimized storage using numerical types (`i128`, `u32`) instead of heavy JSON/String objects.

---

## 🛠 Project Structure

```text
contracts/
├── oracle/          # SEP-40 Oracle Implementation
│   ├── src/lib.rs   # Core logic for impact metrics & price feeds
│   └── Cargo.toml
└── nft/             # SEP-50 NFT Implementation
    ├── src/lib.rs   # Cross-contract logic & ownership management
    └── Cargo.toml
```

---

## 🚀 Getting Started

### Prerequisites

-   Rust & Cargo
-   [Stellar CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup#install-the-stellar-cli)

### Build & Test

The project uses a root-level workspace for simplified management:

```bash
# Clone the repository
git clone https://github.com/boscora/impacta.git
cd impacta/contracts

# Run comprehensive integration tests
make test

# Build all contracts (WASM)
make build
```

---

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
