use soroban_sdk::{contractevent, contracttype};

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

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ImpactMetricsUpdatedEvent {
    pub asset_id: u32,
    pub biomass: i128,
    pub co2_captured: i128,
    pub health: HealthStatus,
}
