"use client";
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { useApi } from "@/hooks/use-api";

// Standard fix for Leaflet marker icon paths in Next.js/Webpack
const fixLeafletIcon = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
};

interface PlantMarker {
  name: string;
  lat: string;
  lng: string;
  address: string;
  kodePlant: string;
  phase?: number;
}

interface InteractiveLeafletMapProps {
  externalData?: PlantMarker[];
}

// Fallback coordinate data in case API is unavailable or empty
const FALLBACK_PLANTS: PlantMarker[] = [
  { name: "Petrokimia Gresik (PKG)", lat: "-7.1593", lng: "112.6489", address: "Gresik, Jawa Timur", kodePlant: "PKG", phase: 1 },
  { name: "Pupuk Kujang Cikampek (PKC)", lat: "-6.3905", lng: "107.4478", address: "Karawang, Jawa Barat", kodePlant: "PKC", phase: 2 },
  { name: "Pupuk Iskandar Muda (PIM)", lat: "5.2347", lng: "97.0864", address: "Lhokseumawe, Aceh", kodePlant: "PIM", phase: 2 },
  { name: "UPP Meneng Banyuwangi", lat: "-8.1364", lng: "114.3942", address: "Banyuwangi, Jawa Timur", kodePlant: "LOG4MENENG", phase: 1 },
  { name: "DC Makassar DSP", lat: "-5.1476", lng: "119.4327", address: "Makassar, Sulawesi Selatan", kodePlant: "D243", phase: 3 },
  { name: "UPP Semarang", lat: "-6.9575", lng: "110.4283", address: "Semarang, Jawa Tengah", kodePlant: "F207", phase: 1 },
  { name: "GD Romokalisari Surabaya", lat: "-7.1983", lng: "112.6789", address: "Surabaya, Jawa Timur", kodePlant: "ROMO", phase: 1 },
  { name: "DC Medan", lat: "3.5952", lng: "98.6722", address: "Medan, Sumatera Utara", kodePlant: "MEDAN", phase: 2 },
  { name: "DC Cilacap", lat: "-7.7183", lng: "109.0158", address: "Cilacap, Jawa Tengah", kodePlant: "CILACAP", phase: 1 },
  { name: "DC Lampung", lat: "-5.4292", lng: "105.2611", address: "Bandar Lampung, Lampung", kodePlant: "B205", phase: 3 },
];

function InteractiveLeafletMap({ externalData }: InteractiveLeafletMapProps) {
  const { apiJson, token } = useApi();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [plants, setPlants] = useState<PlantMarker[]>(FALLBACK_PLANTS);
  const [isSimulated, setIsSimulated] = useState(false);

  useEffect(() => {
    fixLeafletIcon();

    // If parent provides SSE-driven map data, skip internal fetch
    if (externalData && externalData.length > 0) {
      setPlants(prev => {
        if (JSON.stringify(prev) === JSON.stringify(externalData)) return prev;
        return externalData;
      });
      setIsSimulated(false);
      return;
    }

    // Fetch plant coordinate markers from the backend
    const fetchMarkers = async () => {
      try {
        const resObj = await apiJson("/api/Home/MonitorMapData");
        
        if (resObj && resObj.Success && Array.isArray(resObj.data)) {
          const parsedPlants: PlantMarker[] = resObj.data.map((p: any) => {
            let cleanLat = p.lat || "0";
            let cleanLng = p.lng || "0";
            
            // Robust parsing for European/Indonesian decimal comma vs thousand separator
            if (cleanLat.includes(",") && cleanLat.includes(".")) {
              cleanLat = cleanLat.replace(/,/g, "");
            } else if (cleanLat.includes(",")) {
              cleanLat = cleanLat.replace(/,/g, ".");
            }
            
            if (cleanLng.includes(",") && cleanLng.includes(".")) {
              cleanLng = cleanLng.replace(/,/g, "");
            } else if (cleanLng.includes(",")) {
              cleanLng = cleanLng.replace(/,/g, ".");
            }
            
            // Phase coloring: if there's a queue, mark as Phase 1 (indigo pulse), otherwise Phase 2 (green pulse)
            const phaseNum = p.antrian > 0 ? 1 : 2;

            return {
              name: p.name || p.company_code,
              lat: cleanLat,
              lng: cleanLng,
              address: `Antrian Aktif: ${p.antrian} Truk`,
              kodePlant: p.company_code || "UNKNOWN",
              phase: phaseNum
            };
          });

          if (parsedPlants.length > 0) {
            setPlants(parsedPlants);
            setIsSimulated(false);
          } else {
            setPlants(FALLBACK_PLANTS);
            setIsSimulated(true);
          }
        } else {
          setPlants(FALLBACK_PLANTS);
          setIsSimulated(true);
        }
      } catch (err) {
        console.warn("Failed to fetch map markers from API. Using simulated high-fidelity fallbacks.", err);
        setPlants(FALLBACK_PLANTS);
        setIsSimulated(true);
      }
    };

    if (!token) return; // Wait for session token before fetching

    fetchMarkers();
  }, [apiJson, token, externalData]);

  // Initialize and update the leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy map if it already exists to prevent duplication
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize Leaflet Map centered over Central Indonesia (exactly matching Index.cshtml)
    const map = L.map(mapContainerRef.current, {
      center: [-3.690002449856211, 112.672204628869],
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    });

    mapInstanceRef.current = map;

    // Load a sleek, modern CartoDB Positron / Voyage style tile layer (much more premium than standard OSM)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    // Create a group layer for markers
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Plot markers whenever plants data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    // Clear existing markers
    markersLayer.clearLayers();

    plants.forEach((plant) => {
      const latVal = parseFloat(plant.lat);
      const lngVal = parseFloat(plant.lng);

      if (isNaN(latVal) || isNaN(lngVal)) return;

      // Color scheme based on status phase:
      // Phase 1 = Completed (Indigo / Primary)
      // Phase 2 = Stabilizing (Emerald Green)
      // Phase 3 = Rollout (Amber Orange)
      let markerColor = "#3C50E0"; // default indigo
      let phaseLabel = "Phase 1 (Selesai)";
      if (plant.phase === 2) {
        markerColor = "#10B981"; // emerald
        phaseLabel = "Phase 2 (Stabil)";
      } else if (plant.phase === 3) {
        markerColor = "#F59E0B"; // amber
        phaseLabel = "Phase 3 (Rollout)";
      }

      // Create a premium glowing pulse HTML div marker instead of default pin
      const pulseHtml = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-6 h-6 rounded-full opacity-35 animate-ping" style="background-color: ${markerColor}"></div>
          <div class="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md relative z-10" style="background-color: ${markerColor}"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: pulseHtml,
        className: "custom-leaflet-pulse",
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([latVal, lngVal], { icon: customIcon });

      // Clean, premium design popup window with tailwind styling
      const popupContent = `
        <div class="p-1 font-sans" style="min-width: 200px;">
          <div class="font-bold text-sm text-gray-900 mb-1">${plant.name}</div>
          <div class="text-xs text-gray-500 mb-2">${plant.address}</div>
          <div class="flex items-center gap-1.5 mb-2.5">
            <span class="inline-block w-2.5 h-2.5 rounded-full" style="background-color: ${markerColor}"></span>
            <span class="text-xs font-semibold" style="color: ${markerColor}">${phaseLabel}</span>
          </div>
          <a href="/dashboard/report?company=${plant.kodePlant}" 
             class="block text-center py-1.5 px-3 bg-brand-500 hover:bg-brand-600 text-white rounded text-xs font-medium transition-all no-underline shadow-sm hover:shadow"
             style="color: white !important;">
             Lihat Laporan Plant
          </a>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.addTo(markersLayer);
    });

  }, [plants]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full z-0 rounded-xl" />
      {isSimulated && (
        <div className="absolute top-3 right-3 z-10 bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-900/60 rounded-full px-3 py-1 text-[10px] font-medium text-yellow-800 dark:text-yellow-400 shadow-sm flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
          Simulasi Koneksi Lokal (High-Fidelity)
        </div>
      )}
    </div>
  );
}

export default React.memo(InteractiveLeafletMap);
