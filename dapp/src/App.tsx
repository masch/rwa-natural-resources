import { useState, useEffect } from "react";
import { kml } from "@tmcw/togeojson";
import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit/sdk";
import { defaultModules } from "@creit-tech/stellar-wallets-kit/modules/utils";
import "./App.css";
import MapComponent from "./components/MapComponent";
import type { LotFeature } from "./components/MapComponent";
import BoscoraNFT from "./contracts/soroban_boscora_nft";

// Init the kit globally
StellarWalletsKit.init({
  network: "TESTNET" as any,
  selectedWalletId: "freighter",
  modules: defaultModules(),
});

function App() {
  const [lots, setLots] = useState<LotFeature[]>([]);
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [walletConnected, setWalletConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string>("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const loadKMLData = async () => {
      try {
        const response = await fetch("/Reserva%20Bosques%20de%20Agua.kml");
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
            price: 50 + Math.floor(Math.random() * 50),
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
      alert("Please connect your Stellar wallet and select at least one lot.");
      return;
    }

    try {
      setIsLoading(true);

      for (const lotId of selectedLotIds) {
        const lot = lots.find((l) => l.id === lotId);
        if (!lot) continue;

        const tokenId = parseInt(lotId.replace("lot-", ""), 10);
        // Extract basic centroid/coordinates for geo field
        const geo = {
          latitude: Math.floor(lot.geometry.coordinates[0][0][1] * 1000000),
          longitude: Math.floor(lot.geometry.coordinates[0][0][0] * 1000000),
        };

        // 1. Build & Simulate the transaction
        const tx = await BoscoraNFT.mint(
          {
            to: publicKey,
            token_id: tokenId,
            geo: geo,
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

        console.log(`Donated lot ${tokenId}! Transaction id:`, result);
      }

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
      alert("Failed to mint NFT. See console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <h2>Cargando Bosques de Agua...</h2>
          <p>Sincronizando KMZ y Oracle Datos</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>¡Gracias por tu contribución! 🌿</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>
            <p>
              Tu donación ha sido registrada en la red Stellar. Haz recibido los
              NFTs correspondientes a las parcelas que ahora son parte de la
              reserva natural de las Sierras de Córdoba.
            </p>
            <p style={{ marginTop: "1rem", color: "#10b981", fontWeight: 600 }}>
              Lotes reforestados y asegurados con éxito.
            </p>
            <button
              className="donate-btn"
              style={{ marginTop: "1.5rem" }}
              onClick={() => setShowModal(false)}
            >
              Ver Mapa Actualizado
            </button>
          </div>
        </div>
      )}

      <header className="header">
        <h1>
          <span style={{ fontSize: "1.8rem" }}>🌲</span>
          Bosques de Agua (BDA)
        </h1>
        <button className="connect-wallet-btn" onClick={handleConnectWallet}>
          {walletConnected
            ? `✅ ${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`
            : "🔗 Conectar Wallet Stellar"}
        </button>
      </header>

      <main className="main-content">
        <div className="map-container">
          <MapComponent
            lots={lots}
            selectedLots={selectedLotIds}
            onToggleLot={handleToggleLot}
          />

          <div className="map-legend">
            <div className="legend-item">
              <div className="legend-color donated"></div>
              <span>Donado (Reserva Natural)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color available"></div>
              <span>Disponible para Conservación</span>
            </div>
            <div className="legend-item">
              <div className="legend-color selected"></div>
              <span>Seleccionado</span>
            </div>
          </div>
        </div>

        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>Tu Contribución</h2>
          </div>

          <div className="sidebar-content">
            {selectedLotsCards.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🗺️</div>
                <p>
                  Haz clic en los lotes disponibles del mapa para agregarlos a
                  tu donación.
                </p>
              </div>
            ) : (
              <div className="selected-lots-list">
                {selectedLotsCards.map((lot) => (
                  <div key={lot.id} className="lot-item">
                    <div className="lot-info">
                      <h4>{lot.name}</h4>
                      <p>Parcela Conservación</p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                      }}
                    >
                      <span className="lot-price">{lot.price} XLM</span>
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
              <span className="total-label">Subtotal</span>
              <span className="total-amount">{totalAmount} XLM</span>
            </div>

            <button
              className="donate-btn"
              disabled={selectedLotsCards.length === 0}
              onClick={handleDonate}
            >
              Donar y Obtener NFT
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
