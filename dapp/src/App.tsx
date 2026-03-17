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
  const [showMyLots, setShowMyLots] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [myOwnedLots, setMyOwnedLots] = useState<LotFeature[]>([]);
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

        // Target configured lots. Start by estimating the side of each square.
        const TARGET_LOTS =
          Number(import.meta.env.PUBLIC_NUMBER_OF_LOTS) || 500;
        let lotSideKm = Math.sqrt(totalAreaSqM / TARGET_LOTS) / 1000;
        let grid = turf.squareGrid(bbox, lotSideKm, { units: "kilometers" });

        let intersecting = grid.features.filter((cell) =>
          features.some((poly) => turf.booleanIntersects(cell, poly as any)),
        );

        // Adjust resolution if we didn't get enough lots inside the polygon
        let attempts = 0;
        while (intersecting.length < TARGET_LOTS && attempts < 10) {
          lotSideKm *= 0.9;
          grid = turf.squareGrid(bbox, lotSideKm, { units: "kilometers" });
          intersecting = grid.features.filter((cell) =>
            features.some((poly) => turf.booleanIntersects(cell, poly as any)),
          );
          attempts++;
        }

        // Take exactly TARGET_LOTS lots
        const exactLots = intersecting.slice(0, TARGET_LOTS);

        // Let's create an array of donated lots
        const statuses = Array(TARGET_LOTS).fill("available");
        const DONATED_PERCENT =
          Number(import.meta.env.PUBLIC_DONATED_PERCENT) || 16.6;
        const DONATED_LOTS = Math.floor((DONATED_PERCENT / 100) * TARGET_LOTS);
        for (let i = 0; i < DONATED_LOTS; i++) statuses[i] = "donated";
        statuses.sort(() => Math.random() - 0.5);

        const parsedLots: LotFeature[] = exactLots.map((f, idx) => {
          const tokenId = idx + 1; // 1 to TARGET_LOTS since contract prevents token 0
          const lotId = `lot-${tokenId}`;
          let status: "donated" | "available" | "owned" = statuses[idx] as any;

          const savedLotsStr = localStorage.getItem("bda_my_bought_lots");
          if (savedLotsStr) {
            const savedLots: string[] = JSON.parse(savedLotsStr);
            if (savedLots.includes(lotId)) {
              status = "donated"; // Shows as donated to anonymous users
            }
          }

          return {
            id: lotId,
            name: `Parcela BDA-${tokenId.toString().padStart(3, "0")}`,
            price: Number(import.meta.env.PUBLIC_DONATION_PRICE) || 50,
            status,
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
  // Progress calculates ALL unavailable lots (both donated by others + owned by me)
  const donatedLots = lots.filter(
    (l) => l.status === "donated" || l.status === "owned",
  ).length;
  const progressPercentage =
    totalLots > 0 ? (donatedLots / totalLots) * 100 : 0;

  // Apply ownership dynamically when wallet connects/disconnects
  useEffect(() => {
    if (lots.length > 0) {
      setLots((prev) => {
        let hasChanges = false;
        const savedLotsStr = localStorage.getItem("bda_my_bought_lots");
        const savedLots: string[] = savedLotsStr
          ? JSON.parse(savedLotsStr)
          : [];

        const next = prev.map((l) => {
          // Si el lote está en Local Storage
          if (savedLots.includes(l.id)) {
            const targetStatus: "owned" | "donated" = walletConnected
              ? "owned"
              : "donated";
            if (l.status !== targetStatus) {
              hasChanges = true;
              return { ...l, status: targetStatus };
            }
          }
          // Si es un "mock" anterior que forzamos o queremos limpiar
          else if (l.status === "owned" && !walletConnected) {
            hasChanges = true;
            return { ...l, status: "donated" as const };
          }
          return l;
        });

        // Mock 13 own lots si no tienen ningún lote comprado real y conectan, para la Demo.
        if (
          walletConnected &&
          savedLots.length === 0 &&
          !next.some((l) => l.status === "owned")
        ) {
          let count = 0;
          for (let i = 0; i < next.length && count < 13; i++) {
            if (next[i].status === "donated") {
              next[i] = { ...next[i], status: "owned" };
              count++;
              hasChanges = true;
            }
          }
        }

        return hasChanges ? next : prev;
      });
    }
  }, [walletConnected, lots.length]);

  // Sync myOwnedLots purely from local mock state
  useEffect(() => {
    setMyOwnedLots(lots.filter((l) => l.status === "owned"));
  }, [lots]);

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
      // Automatically reflect new donations directly mapping them as "owned"
      setLots((prev) =>
        prev.map((l) =>
          selectedLotIds.includes(l.id) ? { ...l, status: "owned" } : l,
        ),
      );

      // Save to localStorage so they persist on refresh
      const savedLotsStr = localStorage.getItem("bda_my_bought_lots");
      const savedLots: string[] = savedLotsStr ? JSON.parse(savedLotsStr) : [];
      const newSavedLots = Array.from(
        new Set([...savedLots, ...selectedLotIds]),
      );
      localStorage.setItem("bda_my_bought_lots", JSON.stringify(newSavedLots));

      setSelectedLotIds([]);
      setShowModal(true);
    } catch (e: any) {
      console.error("Failed to mint NFT:", e);
      const errorMessage = e?.message || String(e);
      if (
        errorMessage.includes("Account not found") ||
        errorMessage.includes("insufficient balance") ||
        errorMessage.toLowerCase().includes("balance is not sufficient") ||
        errorMessage.toLowerCase().includes("no trustline") ||
        errorMessage.includes("Error(Contract, #13)") ||
        errorMessage.includes("HostError: Error(Contract, #13)")
      ) {
        showAlert(t("sidebar.alert_unfunded"));
      } else {
        showAlert(t("sidebar.alert_fail"));
      }
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
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {t("modal.title")}
                <img
                  src={`${import.meta.env.BASE_URL}tabaquillo.png`}
                  alt="Tabaquillo tree"
                  style={{
                    width: "24px",
                    height: "24px",
                    objectFit: "contain",
                  }}
                />
              </h3>
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

      {showMyLots && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h3
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  margin: 0,
                }}
              >
                {t("modal.my_parcels")}
                {myOwnedLots.length > 0 && (
                  <span
                    style={{
                      fontSize: "1rem",
                      color: "#647558",
                      background: "rgba(100, 117, 88, 0.2)",
                      padding: "2px 10px",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {myOwnedLots.length}
                  </span>
                )}
              </h3>
              <button
                className="close-btn"
                onClick={() => setShowMyLots(false)}
              >
                &times;
              </button>
            </div>

            {myOwnedLots.length === 0 ? (
              <p
                style={{
                  color: "#a1a1aa",
                  textAlign: "center",
                  padding: "2rem",
                }}
              >
                {t("modal.no_parcels")}
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "1rem",
                  maxHeight: "60vh",
                  overflowY: "auto",
                  paddingRight: "0.5rem",
                }}
              >
                {myOwnedLots.map((lot, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(100, 117, 88, 0.4)",
                      borderRadius: "8px",
                      padding: "1rem",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "2rem",
                        marginBottom: "0.5rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <img
                        src={`${import.meta.env.BASE_URL}tabaquillo.png`}
                        alt="Tabaquillo tree"
                        style={{
                          width: "32px",
                          height: "32px",
                          objectFit: "contain",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "#647558",
                          background: "rgba(100, 117, 88, 0.2)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        NFT
                      </span>
                    </div>
                    <h4
                      style={{
                        margin: "0 0 0.5rem 0",
                        color: "#fff",
                        fontSize: "1rem",
                      }}
                    >
                      {lot.name}
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.8rem",
                        color: "#a1a1aa",
                      }}
                    >
                      {t("modal.protected_minted")}
                    </p>
                    <p
                      style={{
                        margin: "0.5rem 0 0 0",
                        fontSize: "0.75rem",
                        color: "#647558",
                        fontWeight: 700,
                      }}
                    >
                      {lot.price} USDC
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showLeaderboard && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>🏆 {t("leaderboard.title")}</h3>
              <button
                className="close-btn"
                onClick={() => setShowLeaderboard(false)}
              >
                &times;
              </button>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "50px 1fr 100px",
                  gap: "10px",
                  padding: "10px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  fontSize: "0.9rem",
                  color: "#a1a1aa",
                }}
              >
                <span>{t("leaderboard.rank")}</span>
                <span>{t("leaderboard.wallet")}</span>
                <span style={{ textAlign: "right" }}>
                  {t("leaderboard.lots")}
                </span>
              </div>
              <div
                style={{
                  maxHeight: "400px",
                  overflowY: "auto",
                  marginTop: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {[
                  { wallet: "GAQP...MZN1", lots: 45 },
                  { wallet: "GBL3...9Q2A", lots: 23 },
                  { wallet: "GCDX...4V8L", lots: 12 },
                  { wallet: "GBZZ...KPW9", lots: 8 },
                  { wallet: "GCFY...7RT5", lots: 5 },
                ].map((donator, index) => (
                  <div
                    key={index}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "50px 1fr 100px",
                      gap: "10px",
                      padding: "12px 10px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "8px",
                      alignItems: "center",
                      border: "1px solid rgba(100, 117, 88, 0.3)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "1.2rem",
                        fontWeight: "bold",
                        color: index < 3 ? "#fbbf24" : "#a1a1aa",
                      }}
                    >
                      #{index + 1}
                    </span>
                    <span style={{ fontFamily: "monospace", color: "#fff" }}>
                      {donator.wallet}
                    </span>
                    <span
                      style={{
                        textAlign: "right",
                        color: "#647558",
                        fontWeight: "bold",
                      }}
                    >
                      {donator.lots}
                    </span>
                  </div>
                ))}
              </div>
            </div>
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
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ lineHeight: 1.1 }}>
              {t("app.title").replace(" (BDA)", "")}
            </span>
            <span
              style={{ fontSize: "0.8rem", color: "#a1a1aa", lineHeight: 1.1 }}
            >
              (BDA)
            </span>
          </div>
        </h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            className="connect-wallet-btn"
            style={{
              background: "transparent",
              color: "white",
              padding: "8px 12px",
              whiteSpace: "nowrap",
              fontSize: "1.2rem",
            }}
            onClick={() => setShowLeaderboard(true)}
            title={t("leaderboard.title")}
          >
            🏆
          </button>
          {myOwnedLots.length > 0 && (
            <button
              className="connect-wallet-btn"
              style={{
                background: "rgba(100, 117, 88, 0.15)",
                borderColor: "#647558",
                color: "#647558",
                whiteSpace: "nowrap",
              }}
              onClick={() => setShowMyLots(true)}
            >
              <span
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <img
                  src={`${import.meta.env.BASE_URL}tabaquillo.png`}
                  alt="Tabaquillo tree"
                  style={{
                    width: "18px",
                    height: "18px",
                    objectFit: "contain",
                  }}
                />
                <span>{myOwnedLots.length}</span>
              </span>
            </button>
          )}
          <button
            className="connect-wallet-btn"
            style={{
              background: "transparent",
              color: "white",
              padding: "8px 12px",
              whiteSpace: "nowrap",
            }}
            onClick={toggleLanguage}
          >
            {currentLanguage === "es" ? "🇪🇸" : "🇺🇸"}
          </button>
          <button
            className="connect-wallet-btn"
            onClick={handleConnectWallet}
            style={{ whiteSpace: "nowrap" }}
          >
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
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1rem",
                    gap: "1.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      flex: 1,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        color: "#fff",
                      }}
                    >
                      {t("map.progress_title")}
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "#a1a1aa" }}>
                      <strong style={{ color: "#fff" }}>{donatedLots}</strong> /{" "}
                      {totalLots} {t("map.progress_subtitle")}
                    </span>
                  </div>
                  <div
                    style={{
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
                      boxShadow: "0 0 15px rgba(100, 117, 88, 0.1)",
                    }}
                  >
                    {progressPercentage.toFixed(0)}%
                  </div>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "10px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "5px",
                    overflow: "hidden",
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
                  }}
                >
                  <div
                    style={{
                      width: `${progressPercentage}%`,
                      height: "100%",
                      backgroundColor: "#647558",
                      background:
                        "linear-gradient(90deg, #4f5c45 0%, #647558 100%)",
                      transition: "width 0.8s ease-in-out",
                    }}
                  ></div>
                </div>
                <hr
                  style={{
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    margin: "1.25rem 0 0.5rem 0",
                    borderWidth: "1px 0 0 0",
                  }}
                />
              </div>
            )}

            <div className="legend-item">
              <div className="legend-color donated"></div>
              <span>{t("map.legend.donated")}</span>
            </div>
            {walletConnected && (
              <div className="legend-item">
                <div
                  className="legend-color"
                  style={{ background: "#fbbf24", border: "1px solid #f59e0b" }}
                ></div>
                <span>{t("map.legend.owned")}</span>
              </div>
            )}
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
