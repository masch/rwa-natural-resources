import { useState, useEffect } from "react";
import { kml } from "@tmcw/togeojson";
import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit/sdk";
import { defaultModules } from "@creit-tech/stellar-wallets-kit/modules/utils";
import "./App.css";
import MapComponent from "./components/MapComponent";
import type { LotFeature } from "./components/MapComponent";
import { useAlertDialog } from "./hooks/useAlertDialog";
import BoscoraNFT from "./contracts/soroban_boscora_nft";
import { useAppTranslation } from "./hooks/useAppTranslation";

// Init the kit globally
StellarWalletsKit.init({
  network: "TESTNET" as any,
  selectedWalletId: "freighter",
  modules: defaultModules(),
});

function App() {
  const [lots, setLots] = useState<LotFeature[]>([]);
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-64.6, -31.4]);
  const [isLoading, setIsLoading] = useState(true);
  const [walletConnected, setWalletConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const { showAlert, AlertDialogComponent } = useAlertDialog();
  const { t, currentLanguage, toggleLanguage } = useAppTranslation();

  useEffect(() => {
    const loadKMLData = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}Reserva%20Bosques%20de%20Agua.kml`,
        );
        if (!response.ok) throw new Error("Network response was not ok");
        const text = await response.text();
        const kmlDoc = new DOMParser().parseFromString(text, "text/xml");
        const geojson = kml(kmlDoc);

        // Filter valid polygon features
        const features = geojson.features.filter(
          (f) =>
            f.geometry &&
            (f.geometry.type === "Polygon" ||
              f.geometry.type === "MultiPolygon"),
        );

        if (features.length === 0) return;

        // Use dynamic import for turf to avoid potential vite build issues, or just import at top.
        const turf = await import("@turf/turf");
        const polyFc = turf.featureCollection(features as any);

        const centerPt = turf.center(polyFc);
        if (centerPt.geometry && centerPt.geometry.coordinates) {
          setMapCenter(centerPt.geometry.coordinates as [number, number]);
        }

        const bbox = turf.bbox(polyFc);
        const totalAreaSqM = turf.area(polyFc);

        // Target 500 lots. Start by estimating the side of each square.
        let lotSideKm = Math.sqrt(totalAreaSqM / 500) / 1000;
        let grid = turf.squareGrid(bbox, lotSideKm, { units: "kilometers" });

        let intersecting = grid.features.filter((cell) =>
          features.some((poly) => turf.booleanIntersects(cell, poly as any)),
        );

        // Adjust resolution if we didn't get enough lots inside the polygon
        let attempts = 0;
        while (intersecting.length < 500 && attempts < 10) {
          lotSideKm *= 0.9;
          grid = turf.squareGrid(bbox, lotSideKm, { units: "kilometers" });
          intersecting = grid.features.filter((cell) =>
            features.some((poly) => turf.booleanIntersects(cell, poly as any)),
          );
          attempts++;
        }

        // Take exactly 500 lots
        const exact500 = intersecting.slice(0, 500);

        // Shuffle arrays to scatter the donated ones, or just randomly set 83 donated.
        // Let's create an array of 83 true and 417 false, then shuffle.
        const statuses = Array(500).fill("available");
        for (let i = 0; i < 83; i++) statuses[i] = "donated";
        statuses.sort(() => Math.random() - 0.5);

        const parsedLots: LotFeature[] = exact500.map((f, idx) => {
          return {
            id: `lot-${idx}`,
            name: `Parcela BDA-${(idx + 1).toString().padStart(3, "0")}`,
            price: Number(import.meta.env.PUBLIC_DONATION_PRICE) || 50,
            status: statuses[idx] as "donated" | "available",
            geometry: f.geometry,
          };
        });

        setLots(parsedLots);
      } catch (err) {
        console.error("Failed to load KML:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadKMLData();
  }, []);

  const handleToggleLot = (lot: LotFeature) => {
    if (lot.status === "donated") return; // Cannot select donated

    setSelectedLotIds((prev) =>
      prev.includes(lot.id)
        ? prev.filter((id) => id !== lot.id)
        : [...prev, lot.id],
    );
  };

  const selectedLotsCards = lots.filter((l) => selectedLotIds.includes(l.id));
  const totalAmount = selectedLotsCards.reduce(
    (acc, curr) => acc + curr.price,
    0,
  );

  const totalLots = lots.length;
  const donatedLots = lots.filter((l) => l.status === "donated").length;
  const progressPercentage = totalLots > 0 ? (donatedLots / totalLots) * 100 : 0;

  const handleConnectWallet = async () => {
    try {
      const { address } = await StellarWalletsKit.authModal();
      setPublicKey(address);
      setWalletConnected(true);
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  const handleDonate = async () => {
    if (!walletConnected || selectedLotIds.length === 0) {
      showAlert(t("sidebar.alert_connect"));
      return;
    }

    try {
      setIsLoading(true);

      const parcels = selectedLotIds.map((lotId) => {
        const lot = lots.find((l) => l.id === lotId)!;
        const tokenId = parseInt(lotId.replace("lot-", ""), 10);
        return {
          token_id: tokenId,
          geo: {
            latitude: Math.floor(lot.geometry.coordinates[0][0][1] * 1000000),
            longitude: Math.floor(lot.geometry.coordinates[0][0][0] * 1000000),
          },
        };
      });

      // 1. Build & Simulate the transaction
      const tx = await BoscoraNFT.mint(
        {
          to: publicKey,
          parcels: parcels,
        },
        { publicKey: publicKey },
      );

      // 2. Sign and Send using Stellar Wallets Kit
      const result = await tx.signAndSend({
        signTransaction: async (xdr: string) => {
          const res = await StellarWalletsKit.signTransaction(xdr, {
            networkPassphrase: import.meta.env
              .PUBLIC_SOROBAN_NETWORK_PASSPHRASE,
          });
          return { signedTxXdr: res.signedTxXdr };
        },
      });

      console.log(`Donated ${parcels.length} lots! Transaction id:`, result);

      // Process "donation/buy" -> update local state -> show success
      setLots((prev) =>
        prev.map((l) =>
          selectedLotIds.includes(l.id) ? { ...l, status: "donated" } : l,
        ),
      );
      setSelectedLotIds([]);
      setShowModal(true);
    } catch (e) {
      console.error("Failed to mint NFT:", e);
      showAlert(t("sidebar.alert_fail"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <h2>{t("app.loading")}</h2>
          <p>{t("app.syncing")}</p>
        </div>
      )}

      <AlertDialogComponent />

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{t("modal.title")}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>
            <p>{t("modal.p1")}</p>
            <p style={{ marginTop: "1rem", color: "#647558", fontWeight: 600 }}>
              {t("modal.p2")}
            </p>
            <button
              className="donate-btn"
              style={{ marginTop: "1.5rem" }}
              onClick={() => setShowModal(false)}
            >
              {t("modal.btn")}
            </button>
          </div>
        </div>
      )}

      <header className="header">
        <h1>
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="Logo"
            style={{
              height: "40px",
              width: "40px",
              objectFit: "contain",
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              borderRadius: "50%",
              padding: "4px",
              boxShadow: "0 0 15px rgba(16, 185, 129, 0.2)",
            }}
          />
          {t("app.title")}
        </h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="connect-wallet-btn"
            style={{
              background: "transparent",
              color: "white",
              padding: "8px 12px",
            }}
            onClick={toggleLanguage}
          >
            {currentLanguage === "es" ? "🇺🇸 EN" : "🇪🇸 ES"}
          </button>
          <button className="connect-wallet-btn" onClick={handleConnectWallet}>
            {walletConnected
              ? `${t("app.connected")} ${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`
              : `🔗 ${t("app.connect")}`}
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="map-container">
          {!isLoading && (
            <MapComponent
              lots={lots}
              selectedLots={selectedLotIds}
              initialCenter={mapCenter}
              onToggleLot={handleToggleLot}
            />
          )}

          <div className="map-legend" style={{ minWidth: "300px" }}>
            {totalLots > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", gap: "1.5rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                    <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff" }}>
                      {t("map.progress_title")}
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "#a1a1aa" }}>
                      <strong style={{ color: "#fff" }}>{donatedLots}</strong> / {totalLots}{" "}
                      {t("map.progress_subtitle")}
                    </span>
                  </div>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(100, 117, 88, 0.15)",
                    border: "1px solid rgba(100, 117, 88, 0.5)",
                    color: "#798c6a",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    height: "56px",
                    width: "56px",
                    minWidth: "56px",
                    flexShrink: 0,
                    borderRadius: "50%",
                    boxShadow: "0 0 15px rgba(100, 117, 88, 0.1)"
                  }}>
                    {progressPercentage.toFixed(1)}%
                  </div>
                </div>
                <div style={{ width: "100%", height: "10px", backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: "5px", overflow: "hidden", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)" }}>
                  <div style={{ width: `${progressPercentage}%`, height: "100%", backgroundColor: "#647558", background: "linear-gradient(90deg, #4f5c45 0%, #647558 100%)", transition: "width 0.8s ease-in-out" }}></div>
                </div>
                <hr style={{ borderColor: "rgba(255, 255, 255, 0.1)", margin: "1.25rem 0 1rem 0", borderWidth: "1px 0 0 0" }} />
              </div>
            )}

            <div className="legend-item">
              <div className="legend-color donated"></div>
              <span>{t("map.legend.donated")}</span>
            </div>
            <div className="legend-item">
              <div className="legend-color available"></div>
              <span>{t("map.legend.available")}</span>
            </div>
            <div className="legend-item">
              <div className="legend-color selected"></div>
              <span>{t("map.legend.selected")}</span>
            </div>
          </div>
        </div>

        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>{t("sidebar.title")}</h2>
          </div>

          <div className="sidebar-content">
            {selectedLotsCards.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🗺️</div>
                <p>
                  {t("sidebar.empty_line1")} <br /> {t("sidebar.empty_line2")}
                </p>
              </div>
            ) : (
              <div className="selected-lots-list">
                {selectedLotsCards.map((lot) => (
                  <div key={lot.id} className="lot-item">
                    <div className="lot-info">
                      <h4>{lot.name}</h4>
                      <p>{t("sidebar.lot_subtitle")}</p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                      }}
                    >
                      <span className="lot-price">
                        {lot.price}{" "}
                        {import.meta.env.PUBLIC_DONATION_ASSET || "USDC"}
                      </span>
                      <button
                        className="remove-btn"
                        onClick={() => handleToggleLot(lot)}
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sidebar-footer">
            <div className="total-section">
              <span className="total-label">{t("sidebar.subtotal")}</span>
              <span className="total-amount">
                {totalAmount} {import.meta.env.PUBLIC_DONATION_ASSET || "USDC"}
              </span>
            </div>

            <button
              className="donate-btn"
              disabled={selectedLotsCards.length === 0}
              onClick={handleDonate}
            >
              {t("sidebar.donate_btn")}
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
