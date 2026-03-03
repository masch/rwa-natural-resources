#![no_std]
use soroban_sdk::{contract, contractclient, contractimpl, panic_with_error, Address, Env, String};
use stellar_access::ownable::{self};
use stellar_tokens::non_fungible::{Base, NonFungibleToken};

mod errors;
mod events;
mod types;

// --- Oracle Interface ---
// This allows the NFT contract to call the Oracle contract.

#[contractclient(name = "OracleClient")]
pub trait OracleInterface {
    fn get_metrics(env: Env, asset_id: u32) -> Option<types::ImpactMetrics>;
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
            .set(&types::DataKey::OracleContract, &oracle);
        env.storage()
            .instance()
            .set(&types::DataKey::MaxParcels, &max_parcels);
        env.storage()
            .instance()
            .set(&types::DataKey::PaymentToken, &payment_token);
        env.storage().instance().set(&types::DataKey::Price, &price);

        // Initialize NFT collection metadata (SEP-50)
        Base::set_metadata(
            &env,
            String::from_str(&env, "ipfs://collection-metadata"),
            String::from_str(&env, "Boscora Impacta"),
            String::from_str(&env, "BSCR"),
        );
    }

    /// Mint a new parcel NFT.
    // TODO: Restore #[only_owner] macro. We need to implement backend first
    pub fn mint(env: Env, to: Address, parcels: soroban_sdk::Vec<types::ParcelRequest>) {
        // 1. Require auth from the user minting (to pay for the transaction and the tokens)
        to.require_auth();

        // 2. Limit the max amount of parcels dynamically
        let max_parcels: u32 = env
            .storage()
            .instance()
            .get(&types::DataKey::MaxParcels)
            .unwrap_or_else(|| {
                panic_with_error!(&env, &crate::errors::ContractErrors::MaxParcelsNotSet)
            });

        // 3. Load payment token
        let owner = ownable::get_owner(&env).unwrap_or_else(|| {
            panic_with_error!(&env, &crate::errors::ContractErrors::OwnerNotSet)
        });
        let payment_token_addr: Address = env
            .storage()
            .instance()
            .get(&types::DataKey::PaymentToken)
            .unwrap_or_else(|| {
                panic_with_error!(&env, &crate::errors::ContractErrors::PaymentTokenNotSet)
            });
        let token_client = soroban_sdk::token::Client::new(&env, &payment_token_addr);

        let price: i128 = env
            .storage()
            .instance()
            .get(&types::DataKey::Price)
            .unwrap_or_else(|| {
                panic_with_error!(&env, &crate::errors::ContractErrors::PriceNotSet)
            });

        // 4. Charge payment token
        let amount_to_charge = price * parcels.len() as i128;
        token_client.transfer(&to, &owner, &amount_to_charge);

        // 5. Mint all parcels selected
        for parcel in parcels.iter() {
            let token_id = parcel.token_id;
            if token_id == 0 || token_id > max_parcels {
                panic_with_error!(&env, &crate::errors::ContractErrors::InvalidParcelId);
            }

            // 6. Ensure each parcel is minted only once
            if env
                .storage()
                .persistent()
                .has(&types::DataKey::Geo(token_id))
            {
                panic_with_error!(&env, &crate::errors::ContractErrors::ParcelAlreadyDonated);
            }

            // 7. Mint NFT
            Base::mint(&env, &to, token_id);
            env.storage()
                .persistent()
                .set(&types::DataKey::Geo(token_id), &parcel.geo);

            // 8. Publish mint event
            events::Mint {
                to: to.clone(),
                token_id,
            }
            .publish(&env);
        }
    }

    /// Primary function: Query real-time impact data from the Oracle.
    pub fn get_live_impact(env: Env, token_id: u32) -> types::ImpactMetrics {
        let oracle_addr: Address = env
            .storage()
            .instance()
            .get(&types::DataKey::OracleContract)
            .unwrap_or_else(|| {
                panic_with_error!(&env, &crate::errors::ContractErrors::OracleAddressNotSet)
            });

        let oracle_client = OracleClient::new(&env, &oracle_addr);
        oracle_client.get_metrics(&token_id).unwrap_or_else(|| {
            panic_with_error!(&env, &crate::errors::ContractErrors::MetricsNotFound)
        })
    }

    /// Getter for parcel coordinates.
    pub fn geo_coordinates(env: Env, token_id: u32) -> types::GeoCoordinates {
        env.storage()
            .persistent()
            .get(&types::DataKey::Geo(token_id))
            .unwrap_or_else(|| {
                panic_with_error!(&env, &crate::errors::ContractErrors::NoGeoDataFound)
            })
    }
}

// Implement standard SEP-50 Token interface
#[contractimpl(contracttrait)]
impl NonFungibleToken for BoscoraNFT {
    type ContractType = Base;
}

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
        pub fn get_metrics(env: Env, asset_id: u32) -> Option<types::ImpactMetrics> {
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
                0 => types::HealthStatus::Germinating,
                1 => types::HealthStatus::Sprouted,
                2 => types::HealthStatus::ReadyForTransplant,
                3 => types::HealthStatus::Planted,
                _ => panic!(),
            };
            env.storage().persistent().set(
                &asset_id,
                &types::ImpactMetrics {
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
        let geo = types::GeoCoordinates {
            latitude: -34,
            longitude: -58,
        };

        // Mint mock tokens to the investor
        soroban_sdk::token::StellarAssetClient::new(&env, &payment_token)
            .mint(&investor, &100_000_0000);

        // 3. Mint NFT (Authorized)
        nft_client.mint(
            &investor,
            &soroban_sdk::vec![
                &env,
                types::ParcelRequest {
                    token_id,
                    geo: geo.clone()
                }
            ],
        );
        assert_eq!(nft_client.owner_of(&token_id), investor);
        assert_eq!(nft_client.geo_coordinates(&token_id), geo);

        // 4. Update Oracle Impact Data (Authorized by RPi)
        oracle_client.update_impact_metrics(&token_id, &1500, &450, &3);

        // 5. Verify live impact query through NFT
        let impact = nft_client.get_live_impact(&token_id);
        assert_eq!(impact.biomass, 1500);
        assert_eq!(impact.co2_captured, 450);
        assert_eq!(impact.health, types::HealthStatus::Planted);
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
            &soroban_sdk::vec![
                &env,
                types::ParcelRequest {
                    token_id: 1,
                    geo: types::GeoCoordinates {
                        latitude: 0,
                        longitude: 0,
                    },
                }
            ],
        );
    }
}
