#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env};
use stellar_access::ownable::{self, Ownable};
use stellar_macros::only_owner;

mod events;
#[cfg(test)]
mod tests;

pub mod types;
use types::{DataKey, HealthStatus, ImpactMetrics};

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

        events::ImpactMetricsUpdated {
            asset_id,
            biomass: price,
            co2_captured: 0,
            health: HealthStatus::Germinating,
        }
        .publish(&env);
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
            health: status.clone(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::OracleData(asset_id), &metrics);

        events::ImpactMetricsUpdated {
            asset_id,
            biomass,
            co2_captured: co2,
            health: status,
        }
        .publish(&env);
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
