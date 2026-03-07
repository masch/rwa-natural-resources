use soroban_sdk::{contractevent, Address};

use crate::types::HealthStatus;

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ImpactMetricsUpdated {
    #[topic]
    pub asset_id: u32,
    pub biomass: i128,
    pub co2_captured: i128,
    pub health: HealthStatus,
}
