import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export interface LotFeature {
  id: string;
  name: string;
  price: number;
  status: "available" | "donated";
  geometry: any;
}

interface MapComponentProps {
  lots: LotFeature[];
  selectedLots: string[];
  onToggleLot: (lot: LotFeature) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
  lots,
  selectedLots,
  onToggleLot,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  // 1. Init map only once
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [-64.6, -31.4], // Sierras de Córdoba, Argentina
      zoom: 12,
      pitch: 45,
      bearing: -17.6,
    });

    map.current.on("load", () => {
      // Simulate 3D terrain for sierras
      map.current!.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      map.current!.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

      // Empty geojson source initially
      map.current!.addSource("lots", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Fill layer
      map.current!.addLayer({
        id: "lots-fill",
        type: "fill",
        source: "lots",
        paint: {
          "fill-color": [
            "match",
            ["get", "status"],
            "donated",
            "#10b981", // Green for donated (reforested)
            "rgba(255, 255, 255, 0.1)", // Transparent white for available
          ],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.8,
            ["boolean", ["feature-state", "hover"], false],
            0.6,
            0.4,
          ],
        },
      });

      // Outline layer
      map.current!.addLayer({
        id: "lots-outline",
        type: "line",
        source: "lots",
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#3b82f6", // Blue for selected
            [
              "match",
              ["get", "status"],
              "donated",
              "#059669",
              "rgba(255, 255, 255, 0.4)",
            ],
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            3,
            1,
          ],
        },
      });

      let hoveredStateId: string | number | null = null;

      map.current!.on("mousemove", "lots-fill", (e) => {
        if (e.features && e.features.length > 0) {
          if (hoveredStateId !== null) {
            map.current!.setFeatureState(
              { source: "lots", id: hoveredStateId },
              { hover: false },
            );
          }
          hoveredStateId = e.features[0].id!;
          map.current!.setFeatureState(
            { source: "lots", id: hoveredStateId },
            { hover: true },
          );
          map.current!.getCanvas().style.cursor = "pointer";
        }
      });

      map.current!.on("mouseleave", "lots-fill", () => {
        if (hoveredStateId !== null) {
          map.current!.setFeatureState(
            { source: "lots", id: hoveredStateId },
            { hover: false },
          );
        }
        hoveredStateId = null;
        map.current!.getCanvas().style.cursor = "";
      });

      map.current!.on("click", "lots-fill", (e) => {
        if (e.features && e.features.length > 0) {
          const props = e.features[0].properties;
          if (props && props.status === "available") {
            const lot: LotFeature = {
              id: props.id,
              name: props.name,
              price: props.price,
              status: props.status,
              geometry: e.features[0].geometry,
            };
            onToggleLot(lot);
          } else if (props && props.status === "donated") {
            const html = `
                            <div style="color: #333; font-family: 'Outfit', sans-serif;">
                                <h4 style="margin: 0 0 5px 0; font-size: 15px;">🌳 ${props.name}</h4>
                                <p style="margin: 0; font-size: 13px;">Esta parcela es parte de la Reserva Natural.</p>
                                <p style="margin: 5px 0 0 0; font-size: 13px; font-weight: bold; color: #10b981;">Valor ecológico: ${props.price} XLM</p>
                                <p style="margin: 5px 0 0 0; font-size: 11px; color: #666;">Protegido mediante NFT en Stellar</p>
                            </div>
                        `;
            new mapboxgl.Popup({ className: "custom-popup", maxWidth: "300px" })
              .setLngLat(e.lngLat)
              .setHTML(html)
              .addTo(map.current!);
          }
        }
      });
    });
  }, [onToggleLot]); // only run once (onToggleLot might change but usually stable)

  // 2. Sync GeoJSON data and Bounds when KML parses and sets `lots`
  useEffect(() => {
    if (!map.current) return;

    const updateData = () => {
      const source = map.current?.getSource("lots") as mapboxgl.GeoJSONSource;
      if (source && lots.length > 0) {
        const featureCollection: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: lots.map((lot, idx) => ({
            type: "Feature",
            id: idx, // MapBox feature ID
            geometry: lot.geometry,
            properties: {
              name: lot.name,
              status: lot.status,
              price: lot.price,
              id: lot.id,
            },
          })),
        };
        source.setData(featureCollection);

        // Update bounds
        try {
          const bounds = new mapboxgl.LngLatBounds();
          lots.forEach((lot) => {
            const geom = lot.geometry as any;
            if (
              geom.type === "Polygon" &&
              geom.coordinates &&
              geom.coordinates[0]
            ) {
              geom.coordinates[0].forEach((coord: [number, number]) => {
                bounds.extend(coord);
              });
            } else if (geom.type === "MultiPolygon" && geom.coordinates) {
              geom.coordinates.forEach((poly: any) => {
                if (poly[0]) {
                  poly[0].forEach((coord: [number, number]) => {
                    bounds.extend(coord);
                  });
                }
              });
            }
          });
          if (!bounds.isEmpty()) {
            map.current!.fitBounds(bounds, { padding: 40, duration: 1500 });
          }
        } catch (e) {
          console.warn("Could not fit bounds", e);
        }
      }
    };

    if (map.current.isStyleLoaded()) {
      updateData();
    } else {
      map.current.once("load", updateData);
    }
  }, [lots]);

  // 3. Sync selected state
  useEffect(() => {
    if (!map.current) return;

    const updateSelection = () => {
      const sourceData = map.current?.getSource("lots");
      if (sourceData) {
        lots.forEach((l, idx) => {
          map.current!.setFeatureState(
            { source: "lots", id: idx },
            { selected: selectedLots.includes(l.id) },
          );
        });
      }
    };

    if (map.current.isStyleLoaded()) {
      updateSelection();
    } else {
      map.current.once("load", updateSelection);
    }
  }, [selectedLots, lots]);

  return <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />;
};

export default MapComponent;
