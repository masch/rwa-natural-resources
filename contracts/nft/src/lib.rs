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
