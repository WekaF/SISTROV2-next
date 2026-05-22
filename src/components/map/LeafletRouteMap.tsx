"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface RouteMapProps {
  latAsal?: number;
  lngAsal?: number;
  latTruk: number;
  lngTruk: number;
  latTujuan?: number;
  lngTujuan?: number;
  namaAsal?: string;
  namaTujuan?: string;
  nopol?: string;
}

export default function LeafletRouteMap({
  latAsal,
  lngAsal,
  latTruk,
  lngTruk,
  latTujuan,
  lngTujuan,
  namaAsal = "Pabrik Asal",
  namaTujuan = "Gudang Tujuan",
  nopol = "Truk",
}: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  if (typeof window === "undefined") {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-2xl">
        <span className="text-sm font-bold text-slate-400">Loading Peta...</span>
      </div>
    );
  }

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if not already done
    if (!mapInstanceRef.current) {
      const initialLat = latTruk || -7.25;
      const initialLng = lngTruk || 112.75;
      
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([initialLat, initialLng], 10);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
    } else {
      // Invalidate size to ensure map renders correctly in modals
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 200);
    }

    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;

    if (!map || !layerGroup) return;

    // Clear previous markers & polylines
    layerGroup.clearLayers();

    const waypoints: L.LatLng[] = [];

    // 1. Create Origin Marker (Emerald Premium Circle with a Warehouse style)
    if (latAsal && lngAsal && !isNaN(latAsal) && !isNaN(lngAsal)) {
      const originLatLng = L.latLng(latAsal, lngAsal);
      waypoints.push(originLatLng);

      const iconAsal = L.divIcon({
        className: "custom-leaflet-icon",
        html: `
          <div class="relative flex items-center justify-center w-9 h-9 bg-emerald-500 rounded-full border-2 border-white shadow-lg animate-in zoom-in duration-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <div class="absolute -bottom-1 w-2 h-2 bg-emerald-500 rotate-45 border-r border-b border-white"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36]
      });

      L.marker([latAsal, lngAsal], { icon: iconAsal })
        .bindPopup(`<div class="font-sans p-1"><b class="text-emerald-600 block text-xs uppercase font-extrabold tracking-wider mb-1">TITIK ASAL</b><span class="font-bold text-slate-800">${namaAsal}</span></div>`)
        .addTo(layerGroup);
    }

    // 2. Create Truck Marker (Blue Pulse Premium Circle with Truck front view style)
    if (latTruk && lngTruk && !isNaN(latTruk) && !isNaN(lngTruk)) {
      const truckLatLng = L.latLng(latTruk, lngTruk);
      waypoints.push(truckLatLng);

      const iconTruk = L.divIcon({
        className: "custom-leaflet-icon",
        html: `
          <div class="relative flex items-center justify-center w-11 h-11 bg-sky-500 rounded-full border-2 border-white shadow-xl">
            <span class="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75 animate-ping -z-10"></span>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white"><rect width="14" height="8" x="5" y="2" rx="2"/><rect width="20" height="8" x="2" y="10" rx="2"/><path d="M14 18H6"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
            <div class="absolute -bottom-1 w-2.5 h-2.5 bg-sky-500 rotate-45 border-r border-b border-white"></div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 44]
      });

      L.marker([latTruk, lngTruk], { icon: iconTruk })
        .bindPopup(`
          <div class="font-sans p-1.5 min-w-[160px]">
            <b class="text-sky-600 block text-xs uppercase font-extrabold tracking-wider mb-1">POSISI ARMADA</b>
            <span class="font-black text-slate-900 text-sm tracking-widest block bg-slate-100 px-2 py-0.5 rounded text-center mb-2">${nopol}</span>
            <a href="http://maps.google.com/maps?q=${latTruk},${lngTruk}" target="_blank" class="inline-flex items-center gap-1.5 text-xs text-sky-500 font-extrabold hover:underline">
              Buka Google Maps
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
            </a>
          </div>
        `)
        .addTo(layerGroup)
        .openPopup();
    }

    // 3. Create Destination Marker (Rose Premium Circle with a Checkered Flag style)
    if (latTujuan && lngTujuan && !isNaN(latTujuan) && !isNaN(lngTujuan)) {
      const destLatLng = L.latLng(latTujuan, lngTujuan);
      waypoints.push(destLatLng);

      const iconTujuan = L.divIcon({
        className: "custom-leaflet-icon",
        html: `
          <div class="relative flex items-center justify-center w-9 h-9 bg-rose-500 rounded-full border-2 border-white shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
            <div class="absolute -bottom-1 w-2 h-2 bg-rose-500 rotate-45 border-r border-b border-white"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36]
      });

      L.marker([latTujuan, lngTujuan], { icon: iconTujuan })
        .bindPopup(`<div class="font-sans p-1"><b class="text-rose-600 block text-xs uppercase font-extrabold tracking-wider mb-1">TITIK TUJUAN</b><span class="font-bold text-slate-800">${namaTujuan}</span></div>`)
        .addTo(layerGroup);
    }

    // 4. Draw Road-Matching Route using public OSRM router
    if (waypoints.length > 1) {
      const coordString = waypoints.map(w => `${w.lng},${w.lat}`).join(";");
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

      fetch(osrmUrl)
        .then(res => res.json())
        .then(data => {
          if (data && data.routes && data.routes[0]) {
            const coordinates = data.routes[0].geometry.coordinates;
            // OSRM returns coordinates as [lng, lat], convert to [lat, lng] for Leaflet
            const leafletCoords = coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);

            const polyline = L.polyline(leafletCoords, {
              color: "#0284c7", // Sky blue premium path
              weight: 5,
              opacity: 0.7,
              lineCap: "round",
              lineJoin: "round"
            }).addTo(layerGroup);

            // Fit map bounds to show full route nicely
            map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
          } else {
            // Fallback straight lines
            const polyline = L.polyline(waypoints.map(w => [w.lat, w.lng]), {
              color: "#f43f5e",
              weight: 4,
              opacity: 0.5,
              dashArray: "6, 6"
            }).addTo(layerGroup);
            map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
          }
        })
        .catch(err => {
          console.warn("OSRM routing failed, drawing fallback line:", err);
          const polyline = L.polyline(waypoints.map(w => [w.lat, w.lng]), {
            color: "#f43f5e",
            weight: 4,
            opacity: 0.5,
            dashArray: "6, 6"
          }).addTo(layerGroup);
          map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
        });
    } else if (waypoints.length === 1) {
      map.setView(waypoints[0], 12);
    }

  }, [latAsal, lngAsal, latTruk, lngTruk, latTujuan, lngTujuan, namaAsal, namaTujuan, nopol]);

  // Handle resizing inside containers
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return <div ref={mapContainerRef} className="h-full w-full rounded-2xl shadow-inner border border-slate-200 dark:border-slate-800" />;
}
