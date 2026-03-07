use soroban_sdk::testutils::Address as _;
use soroban_sdk::{contract, contractimpl, Address, Env};
use stellar_access::ownable::{self, Ownable};

use crate::types;

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
    pub fn update_impact_metrics(env: Env, asset_id: u32, biomass: i128, co2: i128, health: u32) {
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
        crate::BoscoraNFT,
        (
            admin.clone(),
            oracle_id.clone(),
            500u32,
            payment_token.clone(),
            50_000_0000_i128,
        ),
    );
    let nft_client = crate::BoscoraNFTClient::new(&env, &nft_id);

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
        crate::BoscoraNFT,
        (admin, oracle, 500u32, payment_token, 50_000_0000_i128),
    );
    let nft_client = crate::BoscoraNFTClient::new(&env, &nft_id);

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
