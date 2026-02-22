#![no_std]

use soroban_sdk::{contract, contractclient, contractimpl, contracttype, Address, Env, String};
use stellar_access::ownable::{self, Ownable};
use stellar_tokens::non_fungible::{Base, NonFungibleToken};

// --- Data Structures ---

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum HealthStatus {
    Germinating = 0,
    Sprouted = 1,
    ReadyForTransplant = 2,
    Planted = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ImpactMetrics {
    pub biomass: i128,      // In grams
    pub co2_captured: i128, // In milligrams
    pub health: HealthStatus,
}

#[contracttype]
pub enum DataKey {
    OracleContract, // Address of the Oracle contract
    Geo(u32),       // token_id -> GeoCoordinates
    MaxParcels,     // Maximum number of parcels
    PaymentToken,   // Address of the USDC/Payment token
    Price,          // Price per parcel in payment token
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GeoCoordinates {
    pub latitude: i32,
    pub longitude: i32,
}

// --- Oracle Interface ---
// This allows the NFT contract to call the Oracle contract.

#[contractclient(name = "OracleClient")]
pub trait OracleInterface {
    fn get_metrics(env: Env, asset_id: u32) -> Option<ImpactMetrics>;
}

// --- NFT Contract (SEP-50) ---

#[contract]
pub struct BoscoraNFT;

#[contractimpl]
impl BoscoraNFT {
    pub fn __constructor(
        env: Env,
        admin: Address,
        oracle: Address,
        max_parcels: u32,
        payment_token: Address,
        price: i128,
    ) {
        ownable::set_owner(&env, &admin);
        env.storage()
            .instance()
            .set(&DataKey::OracleContract, &oracle);
        env.storage()
            .instance()
            .set(&DataKey::MaxParcels, &max_parcels);
        env.storage()
            .instance()
            .set(&DataKey::PaymentToken, &payment_token);
        env.storage().instance().set(&DataKey::Price, &price);

        // Initialize NFT collection metadata (SEP-50)
        Base::set_metadata(
            &env,
            String::from_str(&env, "ipfs://collection-metadata"),
            String::from_str(&env, "Boscora Impacta"),
            String::from_str(&env, "BSCR"),
        );
    }

    /// Mint a new parcel NFT.
    pub fn mint(env: Env, to: Address, token_id: u32, geo: GeoCoordinates) {
        // 1. Require auth from the user minting (to pay for the transaction and the tokens)
        to.require_auth();

        // 2. Limit the max amount of parcels dynamically
        let max_parcels: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MaxParcels)
            .expect("max parcels not set");
        if token_id == 0 || token_id > max_parcels {
            panic!("invalid parcel id: only 1 to max are allowed in the reserve");
        }

        // 3. Ensure each parcel is minted only once
        if env.storage().persistent().has(&DataKey::Geo(token_id)) {
            panic!("duplicate id: parcel already donated/minted");
        }

        // 4. Charge 50 payment token configured
        let owner = ownable::get_owner(&env).expect("owner not set");

        let payment_token_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::PaymentToken)
            .expect("payment token not set");
        let token_client = soroban_sdk::token::Client::new(&env, &payment_token_addr);

        let amount_to_charge: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Price)
            .expect("price not set");

        // Transfer native token from user to owner (requires auth from user)
        token_client.transfer(&to, &owner, &amount_to_charge);

        Base::mint(&env, &to, token_id);
        env.storage()
            .persistent()
            .set(&DataKey::Geo(token_id), &geo);
    }

    /// Primary function: Query real-time impact data from the Oracle.
    pub fn get_live_impact(env: Env, token_id: u32) -> ImpactMetrics {
        let oracle_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::OracleContract)
            .expect("oracle address not set");

        let oracle_client = OracleClient::new(&env, &oracle_addr);
        oracle_client
            .get_metrics(&token_id)
            .expect("metrics not found in oracle")
    }

    /// Getter for parcel coordinates.
    pub fn geo_coordinates(env: Env, token_id: u32) -> GeoCoordinates {
        env.storage()
            .persistent()
            .get(&DataKey::Geo(token_id))
            .expect("no geo data found")
    }

    /// Explicitly expose owner_of for the client.
    pub fn owner_of(env: Env, token_id: u32) -> Address {
        Base::owner_of(&env, token_id)
    }
}

// Implement standard SEP-50 Token interface
#[contractimpl]
impl NonFungibleToken for BoscoraNFT {
    type ContractType = Base;

    fn token_uri(env: &Env, _token_id: u32) -> String {
        // Pointing to a static explanation of why this NFT uses an Oracle
        String::from_str(env, "ipfs://boscora-dynamic-impact-oracle")
    }
}

#[contractimpl]
impl Ownable for BoscoraNFT {}

// --- Tests ---

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Env;

    #[contract]
    pub struct MockOracle;
    #[contractimpl]
    impl MockOracle {
        pub fn __constructor(env: Env, admin: Address) {
            ownable::set_owner(&env, &admin);
        }
        pub fn get_metrics(env: Env, asset_id: u32) -> Option<ImpactMetrics> {
            env.storage().persistent().get(&asset_id)
        }
        pub fn update_impact_metrics(
            env: Env,
            asset_id: u32,
            biomass: i128,
            co2: i128,
            health: u32,
        ) {
            let status = match health {
                0 => HealthStatus::Germinating,
                1 => HealthStatus::Sprouted,
                2 => HealthStatus::ReadyForTransplant,
                3 => HealthStatus::Planted,
                _ => panic!(),
            };
            env.storage().persistent().set(
                &asset_id,
                &ImpactMetrics {
                    biomass,
                    co2_captured: co2,
                    health: status,
                },
            );
        }
    }
    #[contractimpl]
    impl Ownable for MockOracle {}

    #[test]
    fn test_complete_boscora_flow() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let rpi_signer = Address::generate(&env); // Raspberry Pi
        let investor = Address::generate(&env);

        // 1. Deploy Oracle
        let oracle_id = env.register(MockOracle, (rpi_signer.clone(),));
        let oracle_client = MockOracleClient::new(&env, &oracle_id);

        // Create a mock token for testing
        let payment_token = env
            .register_stellar_asset_contract_v2(admin.clone())
            .address();

        // 2. Deploy NFT
        let nft_id = env.register(
            BoscoraNFT,
            (
                admin.clone(),
                oracle_id.clone(),
                500u32,
                payment_token.clone(),
                50_000_0000_i128,
            ),
        );
        let nft_client = BoscoraNFTClient::new(&env, &nft_id);

        let token_id = 101;
        let geo = GeoCoordinates {
            latitude: -34,
            longitude: -58,
        };

        // Mint mock tokens to the investor
        soroban_sdk::token::StellarAssetClient::new(&env, &payment_token)
            .mint(&investor, &100_000_0000);

        // 3. Mint NFT (Authorized)
        nft_client.mint(&investor, &token_id, &geo);
        assert_eq!(nft_client.owner_of(&token_id), investor);
        assert_eq!(nft_client.geo_coordinates(&token_id), geo);

        // 4. Update Oracle Impact Data (Authorized by RPi)
        oracle_client.update_impact_metrics(&token_id, &1500, &450, &3);

        // 5. Verify live impact query through NFT
        let impact = nft_client.get_live_impact(&token_id);
        assert_eq!(impact.biomass, 1500);
        assert_eq!(impact.co2_captured, 450);
        assert_eq!(impact.health, HealthStatus::Planted);
    }

    #[test]
    #[should_panic]
    fn test_unauthorized_mint() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let attacker = Address::generate(&env);
        let oracle = Address::generate(&env);

        let payment_token = env
            .register_stellar_asset_contract_v2(admin.clone())
            .address();

        let nft_id = env.register(
            BoscoraNFT,
            (admin, oracle, 500u32, payment_token, 50_000_0000_i128),
        );
        let nft_client = BoscoraNFTClient::new(&env, &nft_id);

        // Attacker tries to mint
        nft_client.mint(
            &attacker,
            &1,
            &GeoCoordinates {
                latitude: 0,
                longitude: 0,
            },
        );
    }
}
