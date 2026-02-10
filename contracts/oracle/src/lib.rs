#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};
use stellar_access::ownable::{self, Ownable};
use stellar_macros::only_owner;

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
    OracleData(u32), // asset_id -> ImpactMetrics
}

// --- Oracle Contract (SEP-40 & Extensions) ---

#[contract]
pub struct BoscoraOracle;

#[contractimpl]
impl BoscoraOracle {
    /// Initialize the contract with an admin (the Raspberry Pi signer).
    pub fn __constructor(env: Env, admin: Address) {
        ownable::set_owner(&env, &admin);
    }

    /// SEP-40 Standard: Returns the biomass as the "price".
    pub fn lastprice(env: Env, asset_id: u32) -> Option<i128> {
        env.storage()
            .persistent()
            .get::<DataKey, ImpactMetrics>(&DataKey::OracleData(asset_id))
            .map(|m| m.biomass)
    }

    /// Add/Update price (biomass) for SEP-40 compatibility.
    #[only_owner]
    pub fn add_price(env: Env, asset_id: u32, price: i128) {
        let mut metrics = env
            .storage()
            .persistent()
            .get::<DataKey, ImpactMetrics>(&DataKey::OracleData(asset_id))
            .unwrap_or(ImpactMetrics {
                biomass: 0,
                co2_captured: 0,
                health: HealthStatus::Germinating,
            });

        metrics.biomass = price;

        env.storage()
            .persistent()
            .set(&DataKey::OracleData(asset_id), &metrics);
    }

    /// Extended function to update all impact metrics.
    /// Only the authorized owner (Raspberry Pi) can call this.
    #[only_owner]
    pub fn update_impact_metrics(env: Env, asset_id: u32, biomass: i128, co2: i128, health: u32) {
        let status = match health {
            0 => HealthStatus::Germinating,
            1 => HealthStatus::Sprouted,
            2 => HealthStatus::ReadyForTransplant,
            3 => HealthStatus::Planted,
            _ => panic!("invalid health status"),
        };

        let metrics = ImpactMetrics {
            biomass,
            co2_captured: co2,
            health: status,
        };

        env.storage()
            .persistent()
            .set(&DataKey::OracleData(asset_id), &metrics);
    }

    /// Get all metrics for a given asset.
    pub fn get_metrics(env: Env, asset_id: u32) -> Option<ImpactMetrics> {
        env.storage()
            .persistent()
            .get(&DataKey::OracleData(asset_id))
    }
}

#[contractimpl]
impl Ownable for BoscoraOracle {}
