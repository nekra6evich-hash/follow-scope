import React, { useEffect, useMemo, useRef, useState } from "react";
import Tesseract from "tesseract.js";
import { MapContainer, Marker, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin, Plus, Sun, Moon, Navigation, LocateFixed, Map as MapIcon,
  Bookmark, ChevronRight, X, Upload, Copy, Trash2, LoaderCircle,
  CheckCircle2, Save, Search, Utensils, Shapes, Download, FileUp
} from "lucide-react";

const initialPlaces = [
  { id: 1, name: "Łazienki Królewskie", address: "Agrykola 1, Warszawa", note: "Хочу погулять здесь весной", status: "want", category: "other", city: "Warszawa", lat: 52.2152, lng: 21.0351 },
  { id: 2, name: "Muzeum Neonów", address: "Mińska 25, Warszawa", note: "Красивое место, особенно вечером", status: "visited", category: "other", city: "Warszawa", lat: 52.2501, lng: 21.0547 },
  { id: 3, name: "Ogród Botaniczny UW", address: "Aleje Ujazdowskie 4, Warszawa", note: "Проверить часы работы", status: "want", category: "other", city: "Warszawa", lat: 52.2167, lng: 21.0275 },
];

const gradient = "linear-gradient(120deg,#4d36d2 0%,#a54de2 50%,#2875ed 100%)";
const mapCenter = [52.2297, 21.0122];
const FOOD_WORDS = /(kebab|restaurant|restauracja|cafe|café|coffee|bar|pizza|bistro|bakery|piekarnia|grill|sushi|burger|ramen|food|jedzenie|lody|ice cream|cukiernia|pub|nero)/i;
const GENERIC_NAMES = /^(бургерная|кафе|кофейня|ресторан|бар|пиццерия|restaurant|coffee shop|cafe|café|bar|kawiarnia|restauracja|pizzeria|jedzenie|food|overview|menu|reviews?|photos?|about)$/i;

function markerIcon(status) {
  const color = status === "visited" ? "#16a085" : "#4f7df3";
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid white;box-shadow:0 5px 12px rgba(0,0,0,.28)"><span style="display:block;width:8px;height:8px;margin:7px;border-radius:50%;background:white"></span></div>`,
    iconSize: [28, 38], iconAnchor: [14, 36], popupAnchor: [0, -34],
  });
}

function clusterIcon(count) {
  return L.divIcon({
    className: "",
    html: `<div style="width:42px;height:42px;display:grid;place-items:center;border-radius:999px;background:linear-gradient(135deg,#7040e8,#2f76ef);color:white;font:700 14px system-ui;border:3px solid white;box-shadow:0 5px 14px rgba(0,0,0,.3)">${count}</div>`,
    iconSize: [42, 42], iconAnchor: [21, 21],
  });
}

function ClusteredMarkers({ places, onSelect }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on("zoomend", onZoom);
    return () => map.off("zoomend", onZoom);
  }, [map]);

  const clusters = useMemo(() => {
    const cell = zoom < 9 ? 1.2 : zoom < 11 ? 0.35 : zoom < 13 ? 0.1 : zoom < 15 ? 0.025 : 0.006;
    const groups = new Map();
    places.forEach((place) => {
      const key = `${Math.round(place.lat / cell)}:${Math.round(place.lng / cell)}`;
      const group = groups.get(key) || [];
      group.push(place);
      groups.set(key, group);
    });
    return [...groups.values()].map((items) => ({
      items,
      lat: items.reduce((sum, item) => sum + item.lat, 0) / items.length,
      lng: items.reduce((sum, item) => sum + item.lng, 0) / items.length,
    }));
  }, [places, zoom]);

  return clusters.map((cluster) => cluster.items.length === 1 ? (
    <Marker
      key={cluster.items[0].id}
      position={[cluster.lat, cluster.lng]}
      icon={markerIcon(cluster.items[0].status)}
      eventHandlers={{ click: () => onSelect(cluster.items[0]) }}
    />
  ) : (
    <Marker key={`cluster-${cluster.lat}-${cluster.lng}-${cluster.items.length}`} position={[cluster.lat, cluster.lng]} icon={clusterIcon(cluster.items.length)} eventHandlers={{ click: () => map.flyTo([cluster.lat, cluster.lng], Math.min(18, zoom + 2), { duration: 0.5 }) }} />
  ));
}

function FlyToPlace({ place }) {
  const map = useMap();
  useEffect(() => {
    if (place?.lat && place?.lng) map.flyTo([place.lat, place.lng], 16, { duration: 0.7 });
  }, [place, map]);
  return null;
}

function LongPressMap({ onLongPress }) {
  const map = useMap();
  const callbackRef = useRef(onLongPress);
  const touchRef = useRef({ timer: null, startX: 0, startY: 0, fired: false });

  useEffect(() => { callbackRef.current = onLongPress; }, [onLongPress]);

  useMapEvents({
    contextmenu(event) {
      callbackRef.current(event.latlng);
    },
  });

  useEffect(() => {
    const container = map.getContainer();
    const clearTouch = () => {
      if (touchRef.current.timer) clearTimeout(touchRef.current.timer);
      touchRef.current.timer = null;
      touchRef.current.fired = false;
    };
    const touchStart = (event) => {
      if (event.touches.length !== 1) return;
      if (event.target.closest('.leaflet-marker-icon, .leaflet-control, button, input, textarea, select')) return;
      const touch = event.touches[0];
      touchRef.current.startX = touch.clientX;
      touchRef.current.startY = touch.clientY;
      touchRef.current.fired = false;
      touchRef.current.timer = setTimeout(() => {
        const rect = container.getBoundingClientRect();
        const point = L.point(touchRef.current.startX - rect.left, touchRef.current.startY - rect.top);
        touchRef.current.fired = true;
        map.dragging.disable();
        callbackRef.current(map.containerPointToLatLng(point));
      }, 700);
    };
    const touchMove = (event) => {
      const touch = event.touches[0];
      if (!touch || !touchRef.current.timer) return;
      if (Math.hypot(touch.clientX - touchRef.current.startX, touch.clientY - touchRef.current.startY) > 10) clearTouch();
    };
    const touchEnd = (event) => {
      const wasFired = touchRef.current.fired;
      clearTouch();
      if (!map.dragging.enabled()) map.dragging.enable();
      if (wasFired) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    container.addEventListener('touchstart', touchStart, { capture: true, passive: true });
    container.addEventListener('touchmove', touchMove, { capture: true, passive: true });
    container.addEventListener('touchend', touchEnd, { capture: true, passive: false });
    container.addEventListener('touchcancel', touchEnd, { capture: true, passive: false });
    return () => {
      clearTouch();
      container.removeEventListener('touchstart', touchStart, true);
      container.removeEventListener('touchmove', touchMove, true);
      container.removeEventListener('touchend', touchEnd, true);
      container.removeEventListener('touchcancel', touchEnd, true);
    };
  }, [map]);

  return null;
}

function cleanLine(value) {
  return value.replace(/[©@|®™]/g, " ").replace(/\s+/g, " ").trim();
}

function cleanPlaceName(value) {
  const parts = value
    .replace(/[…]/g, "")
    .replace(/[^0-9A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż&'’+.-]+/g, " ")
    .replace(/\s+/g, " ").trim().split(" ")
    .filter((token, index, all) => !(index >= all.length - 2 && /^(q|x|qx|b|a|i|l|o|0|1)$/i.test(token)));
  const result = parts.join(" ").trim();
  return result.length >= 3 && !GENERIC_NAMES.test(result) ? result : "";
}

function normalizeAddress(value) {
  return value.replace(/\s*,\s*/g, ", ").replace(/\s*\/\s*/g, "/").replace(/\bO(?=\d)/g, "0").replace(/(?<=\d)O\b/g, "0").replace(/\s+/g, " ").trim();
}

function inferCityFromAddress(address = "") {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  return (parts[parts.length - 1] || "").replace(/^\d{2}-\d{3}\s*/, "").trim();
}

function extractPlace(text) {
  const lines = text.split(/\r?\n/).map(cleanLine).filter((line) => line.length > 2);
  const streetIndex = lines.findIndex((line) =>
    /\b(ul\.?|aleja|al\.?|plac|pl\.?|street|st\.?|road|rd\.?)\b/i.test(line) ||
    /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+(?:\s+[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+)*\s+\d+[A-Za-z]?(?:\/\d+)?/.test(line)
  );
  const postalIndex = lines.findIndex((line) => /\b\d{2}-\d{3}\b/.test(line));
  let address = "";
  if (streetIndex >= 0 && postalIndex >= 0 && streetIndex !== postalIndex) address = `${lines[streetIndex]}, ${lines[postalIndex]}`;
  else if (postalIndex >= 0) address = lines[postalIndex];
  else if (streetIndex >= 0) address = lines[streetIndex];
  address = normalizeAddress(address);

  const candidates = lines.slice(0, 18).map((line, index) => {
    const name = cleanPlaceName(line);
    let score = 0;
    if (name) score += 4;
    if (index < 8) score += 5;
    if (streetIndex >= 0 && index < streetIndex) score += 3;
    if (FOOD_WORDS.test(name)) score += 4;
    if (GENERIC_NAMES.test(name)) score -= 20;
    if (/\b\d{2}-\d{3}\b|https?:|www\.|\+?\d{7,}|reviews?|open|closed|menu|route|directions|save|share|website|call|overview/i.test(line)) score -= 15;
    return { name, score };
  }).filter((item) => item.name).sort((a, b) => b.score - a.score);

  const name = candidates[0]?.name || "";
  return { name, address, category: FOOD_WORDS.test(`${name} ${text}`) ? "food" : "other" };
}

async function geocodePlace(name, address) {
  const search = async (query) => {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers: { "Accept-Language": "pl,en" } });
    return response.ok ? response.json() : [];
  };
  let results = await search([name, address].filter(Boolean).join(", "));
  if (!results.length && address) results = await search(address);
  if (!results.length) throw new Error("Не удалось найти адрес на карте");
  const hit = results[0];
  const data = hit.address || {};
  return {
    lat: Number(hit.lat), lng: Number(hit.lon),
    city: data.city || data.town || data.village || data.municipality || inferCityFromAddress(hit.display_name || address),
  };
}

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`;
  const response = await fetch(url, { headers: { "Accept-Language": "pl,en" } });
  if (!response.ok) throw new Error("Не удалось определить адрес");
  const hit = await response.json();
  const data = hit.address || {};
  const road = data.road || data.pedestrian || data.footway || data.neighbourhood || "";
  const house = data.house_number || "";
  const city = data.city || data.town || data.village || data.municipality || "";
  const postcode = data.postcode || "";
  const address = [
    [road, house].filter(Boolean).join(" "),
    [postcode, city].filter(Boolean).join(" "),
  ].filter(Boolean).join(", ") || hit.display_name || "";
  return { address, city };
}

async function cropImage(file, startRatio, heightRatio) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = Math.round(bitmap.height * heightRatio);
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, Math.round(bitmap.height * startRatio), bitmap.width, canvas.height, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export default function App() {
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState("map");
  const [places, setPlaces] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("followscope-places"));
      return (saved || initialPlaces)
        .filter((place) =>
          place.id !== "me" &&
          place.name !== "Моё местоположение" &&
          place.type !== "current-location" &&
          place.isCurrentLocation !== true &&
          place.temporary !== true
        )
        .map((place) => ({ ...place, category: place.category || (FOOD_WORDS.test(place.name) ? "food" : "other"), city: place.city || inferCityFromAddress(place.address) }));
    } catch { return initialPlaces; }
  });
  const [selected, setSelected] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [manual, setManual] = useState({ name: "", address: "", city: "", note: "", status: "want", category: "other", lat: 0, lng: 0 });
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [found, setFound] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [edit, setEdit] = useState({ name: "", address: "", city: "", note: "", status: "want", category: "other" });
  const fileRef = useRef(null);
  const importRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const cleanPlaces = places.filter((place) =>
      place.id !== "me" &&
      place.name !== "Моё местоположение" &&
      place.type !== "current-location" &&
      place.isCurrentLocation !== true &&
      place.temporary !== true
    );
    if (cleanPlaces.length !== places.length) {
      setPlaces(cleanPlaces);
      if (selected && !cleanPlaces.some((place) => place.id === selected.id)) setSelected(null);
      return;
    }
    localStorage.setItem("followscope-places", JSON.stringify(cleanPlaces));
  }, [places, selected]);

  const savedPlaces = useMemo(() => places.filter((place) =>
    place.id !== "me" &&
    place.name !== "Моё местоположение" &&
    place.type !== "current-location" &&
    place.isCurrentLocation !== true &&
    place.temporary !== true
  ), [places]);

  const filteredPlaces = useMemo(() => savedPlaces.filter((place) => {
    const textMatches = `${place.name} ${place.address} ${place.note}`.toLowerCase().includes(search.toLowerCase());
    return textMatches && (statusFilter === "all" || place.status === statusFilter) && (categoryFilter === "all" || place.category === categoryFilter);
  }), [savedPlaces, search, statusFilter, categoryFilter]);

  const palette = dark
    ? { app: "#090b16", chrome: "#111421", panel: "#151927", glass: "rgba(21,25,39,.96)", text: "#f7f8ff", muted: "#aab0c2", line: "rgba(255,255,255,.10)", soft: "rgba(255,255,255,.07)" }
    : { app: "#eef1f7", chrome: "#fff", panel: "#fff", glass: "rgba(255,255,255,.97)", text: "#182033", muted: "#667085", line: "rgba(37,47,72,.11)", soft: "#f2f4f8" };

  const choose = (place) => {
    setSelected({ ...place });
    setDetailsOpen(false);
    setTab("map");
  };
  const openDetails = (place) => {
    setSelected(place);
    setEdit({ name: place.name, address: place.address, city: place.city || "", note: place.note || "", status: place.status, category: place.category || "other" });
    setDetailsOpen(true);
  };
  const updatePlace = (id, patch) => {
    setPlaces((current) => current.map((place) => place.id === id ? { ...place, ...patch } : place));
    setSelected((current) => current?.id === id ? { ...current, ...patch } : current);
  };
  const saveDetails = () => {
    if (!selected || !edit.name.trim()) return;
    updatePlace(selected.id, { ...edit, name: edit.name.trim(), address: edit.address.trim(), note: edit.note.trim() });
    setDetailsOpen(false);
  };
  const deletePlace = (id) => {
    const next = places.filter((place) => place.id !== id);
    setPlaces(next);
    if (selected?.id === id) setSelected(null);
  };
  const openRoute = () => selected && window.open(`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`, "_blank", "noopener,noreferrer");
  const copyCoordinates = () => selected && navigator.clipboard?.writeText(`${selected.lat}, ${selected.lng}`);

  const locateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setSelected(null);
        mapRef.current?.flyTo([coords.latitude, coords.longitude], 16, { duration: 0.7 });
      },
      () => setError("Браузер не дал доступ к геолокации")
    );
  };

  const startManualPlace = async ({ lat, lng }) => {
    setManual({ name: "", address: "", city: "", note: "", status: "want", category: "other", lat, lng });
    setManualOpen(true);
    setManualLoading(true);
    try {
      const result = await reverseGeocode(lat, lng);
      setManual((current) => ({ ...current, address: result.address, city: result.city }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось определить адрес");
    } finally { setManualLoading(false); }
  };

  const saveManualPlace = () => {
    if (!manual.name.trim()) return;
    const place = { ...manual, id: Date.now(), name: manual.name.trim(), note: manual.note.trim() };
    setPlaces((current) => [...current, place]);
    setSelected(place);
    setManualOpen(false);
  };

  const exportPlaces = () => {
    const blob = new Blob([JSON.stringify({ version: 1, places }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `followscope-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
  };

  const importPlaces = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const incoming = Array.isArray(parsed) ? parsed : parsed.places;
      const valid = incoming.filter((place) => place?.name && Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng))).map((place, index) => ({ ...place, id: place.id || `${Date.now()}-${index}`, lat: Number(place.lat), lng: Number(place.lng), status: place.status === "visited" ? "visited" : "want", category: place.category === "food" ? "food" : "other", city: place.city || inferCityFromAddress(place.address || ""), note: place.note || "" }));
      if (!valid.length) throw new Error("В файле нет корректных мест");
      setPlaces(valid); setSelected(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось импортировать файл"); setAddOpen(true); }
    finally { event.target.value = ""; }
  };

  const handleImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProcessing(true); setProgress(0); setError(""); setFound("");
    try {
      const preview = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
      });
      const runOcr = (image) => Tesseract.recognize(image, "eng+pol", { logger: (message) => { if (message.status === "recognizing text") setProgress(Math.round((message.progress || 0) * 100)); } });
      const fullResult = await runOcr(file);
      let combinedText = fullResult.data.text;
      let extracted = extractPlace(combinedText);
      if (!extracted.address) {
        const bottom = await cropImage(file, 0.5, 0.5);
        if (bottom) combinedText += `\n${(await runOcr(bottom)).data.text}`;
        extracted = extractPlace(combinedText);
      }
      if (!extracted.address) throw new Error("Адрес не распознан. Попробуй более чёткий скриншот.");
      const geo = await geocodePlace(extracted.name, extracted.address);
      const place = { id: Date.now(), name: extracted.name || extracted.address.split(",")[0], address: extracted.address, note: "", status: "want", category: extracted.category, city: geo.city || inferCityFromAddress(extracted.address), lat: geo.lat, lng: geo.lng, screenshot: preview };
      setPlaces((current) => [...current, place]); setSelected(place); setFound(`${place.name} — ${place.address}`);
      setTimeout(() => { setAddOpen(false); setTab("map"); setProcessing(false); }, 600);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось обработать скриншот"); setProcessing(false); }
    finally { event.target.value = ""; }
  };

  const FilterButton = ({ active, onClick, children }) => <button onClick={onClick} className="h-9 whitespace-nowrap rounded-xl px-3 text-sm font-semibold" style={active ? { background: gradient, color: "white" } : { background: palette.soft, color: palette.muted }}>{children}</button>;

  return (
    <div className="h-screen w-full overflow-hidden" style={{ background: palette.app, color: palette.text, fontFamily: "Inter,ui-sans-serif,system-ui,sans-serif" }}>
      <div className="mx-auto grid h-full max-w-6xl grid-rows-[60px_minmax(0,1fr)_64px] overflow-hidden sm:h-[calc(100vh-24px)] sm:translate-y-3 sm:rounded-[28px]" style={{ background: palette.app, border: `1px solid ${palette.line}` }}>
        <header className="flex items-center justify-between gap-3 px-3 sm:px-5" style={{ background: palette.chrome, borderBottom: `1px solid ${palette.line}` }}>
          <div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: gradient }}><MapPin size={18} fill="currentColor" /></div><h1 className="text-lg font-bold">Мои места</h1></div>
          <div className="flex items-center gap-2"><input ref={importRef} type="file" accept="application/json,.json" onChange={importPlaces} className="hidden" /><button onClick={() => importRef.current?.click()} className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: palette.soft }}><FileUp size={18} /></button><button onClick={exportPlaces} className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: palette.soft }}><Download size={18} /></button><button onClick={() => setDark(!dark)} className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: palette.soft }}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button><button onClick={() => { setError(""); setFound(""); setAddOpen(true); }} className="flex h-10 items-center gap-2 rounded-xl px-3 text-white" style={{ background: gradient }}><Plus size={18} /></button></div>
        </header>

        <main className="relative min-h-0 overflow-hidden">
          {tab === "map" ? <div className="relative h-full">
            <MapContainer ref={mapRef} center={mapCenter} zoom={12} scrollWheelZoom zoomControl={false} className="h-full w-full">
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://tile.openstreetmap.de/{z}/{x}/{y}.png" />
              <ZoomControl position="bottomright" />
              <ClusteredMarkers places={filteredPlaces} onSelect={choose} />
              <FlyToPlace place={selected} />
              <LongPressMap onLongPress={startManualPlace} />
            </MapContainer>
            <div className="absolute left-3 right-16 top-3 z-[700] flex gap-2 overflow-x-auto rounded-2xl p-2" style={{ background: palette.glass }}><FilterButton active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>Все</FilterButton><FilterButton active={statusFilter === "want"} onClick={() => setStatusFilter("want")}>Хочу посетить</FilterButton><FilterButton active={statusFilter === "visited"} onClick={() => setStatusFilter("visited")}>Уже была</FilterButton><FilterButton active={categoryFilter === "food"} onClick={() => setCategoryFilter(categoryFilter === "food" ? "all" : "food")}><span className="flex items-center gap-1"><Utensils size={15} /> Еда</span></FilterButton><FilterButton active={categoryFilter === "other"} onClick={() => setCategoryFilter(categoryFilter === "other" ? "all" : "other")}><span className="flex items-center gap-1"><Shapes size={15} /> Остальное</span></FilterButton></div>
            <button onClick={locateMe} className="absolute right-3 top-3 z-[750] grid h-11 w-11 place-items-center rounded-[14px]" style={{ background: palette.glass }}><LocateFixed size={19} /></button>
            {selected && savedPlaces.some((place) => place.id === selected.id) && <section className="absolute inset-x-3 bottom-3 z-[750] rounded-[20px] p-4 sm:left-4 sm:right-auto sm:w-[390px]" style={{ background: palette.glass, border: `1px solid ${palette.line}` }}><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold" style={{ color: selected.status === "visited" ? "#16a085" : "#4f7df3" }}>{selected.status === "visited" ? "Уже была" : "Хочу посетить"}</span><div className="flex items-center gap-1"><button onClick={() => openDetails(selected)} className="flex items-center gap-1 text-sm font-semibold text-violet-600">Подробнее <ChevronRight size={16} /></button><button onClick={() => setSelected(null)} className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: palette.soft }}><X size={16} /></button></div></div><h2 className="mt-3 text-[22px] font-bold">{selected.name}</h2><p className="mt-1 text-[15px]" style={{ color: palette.muted }}>{selected.address}</p>{selected.note && <p className="mt-2 text-[15px]">{selected.note}</p>}<button onClick={openRoute} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[15px] font-semibold text-white" style={{ background: gradient }}><Navigation size={18} /> Построить маршрут</button></section>}
          </div> : <div className="h-full overflow-y-auto p-4"><div className="mx-auto max-w-4xl"><div className="flex items-center justify-between"><h2 className="text-[22px] font-bold">Мои места</h2><span style={{ color: palette.muted }}>{filteredPlaces.length}</span></div><div className="mt-4 flex items-center gap-2 rounded-xl px-3" style={{ background: palette.panel }}><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск" className="h-11 w-full bg-transparent outline-none" /></div><div className="mt-3 flex gap-2 overflow-x-auto"><FilterButton active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>Все</FilterButton><FilterButton active={statusFilter === "want"} onClick={() => setStatusFilter("want")}>Хочу посетить</FilterButton><FilterButton active={statusFilter === "visited"} onClick={() => setStatusFilter("visited")}>Уже была</FilterButton><FilterButton active={categoryFilter === "food"} onClick={() => setCategoryFilter(categoryFilter === "food" ? "all" : "food")}>Еда</FilterButton><FilterButton active={categoryFilter === "other"} onClick={() => setCategoryFilter(categoryFilter === "other" ? "all" : "other")}>Остальное</FilterButton></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{filteredPlaces.map((place) => <div key={place.id} className="flex items-start gap-3 rounded-[18px] p-4" style={{ background: palette.panel }}><button onClick={() => openDetails(place)} className="flex min-w-0 flex-1 items-start gap-3 text-left">{place.screenshot ? <img src={place.screenshot} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" /> : <MapPin size={24} style={{ color: place.status === "visited" ? "#16a085" : "#4f7df3" }} />}<div><p className="font-bold">{place.name}</p><p className="text-sm" style={{ color: palette.muted }}>{place.address}</p>{place.note && <p className="mt-2 text-sm">{place.note}</p>}</div></button><button onClick={() => deletePlace(place.id)} className="grid h-10 w-10 place-items-center rounded-xl text-red-500" style={{ background: palette.soft }}><Trash2 size={18} /></button></div>)}</div></div></div>}
        </main>

        <nav className="relative z-[2000] grid grid-cols-2 gap-2 px-3 py-2" style={{ background: palette.chrome, borderTop: `1px solid ${palette.line}`, pointerEvents: "auto" }}><button onClick={() => setTab("map")} className="flex h-12 items-center justify-center gap-2 rounded-[14px] font-semibold" style={tab === "map" ? { background: gradient, color: "white" } : { color: palette.muted }}><MapIcon size={19} /> Карта</button><button onClick={() => setTab("places")} className="flex h-12 items-center justify-center gap-2 rounded-[14px] font-semibold" style={tab === "places" ? { background: gradient, color: "white" } : { color: palette.muted }}><Bookmark size={19} /> Мои места</button></nav>
      </div>

      {detailsOpen && selected && <div className="fixed inset-0 z-[3000] grid place-items-end bg-black/60 sm:place-items-center sm:p-4" onMouseDown={() => setDetailsOpen(false)}><div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[26px] p-5 sm:rounded-[26px]" style={{ background: palette.panel }} onMouseDown={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><h3 className="text-lg font-bold">Редактировать место</h3><button onClick={() => setDetailsOpen(false)}><X size={20} /></button></div>{selected.screenshot && <img src={selected.screenshot} alt="Скриншот" className="mt-4 max-h-48 w-full rounded-xl object-contain" />}<label className="mt-4 block text-sm font-semibold">Название</label><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="mt-2 h-11 w-full rounded-xl px-3" style={{ background: palette.soft }} /><label className="mt-3 block text-sm font-semibold">Адрес</label><input value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} className="mt-2 h-11 w-full rounded-xl px-3" style={{ background: palette.soft }} /><label className="mt-3 block text-sm font-semibold">Категория</label><div className="mt-2 grid grid-cols-2 gap-2"><FilterButton active={edit.category === "food"} onClick={() => setEdit({ ...edit, category: "food" })}>Еда</FilterButton><FilterButton active={edit.category === "other"} onClick={() => setEdit({ ...edit, category: "other" })}>Остальное</FilterButton></div><label className="mt-3 block text-sm font-semibold">Статус</label><div className="mt-2 grid grid-cols-2 gap-2"><FilterButton active={edit.status === "want"} onClick={() => setEdit({ ...edit, status: "want" })}>Хочу посетить</FilterButton><FilterButton active={edit.status === "visited"} onClick={() => setEdit({ ...edit, status: "visited" })}>Уже была</FilterButton></div><label className="mt-3 block text-sm font-semibold">Заметка</label><textarea value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} className="mt-2 min-h-24 w-full rounded-xl p-3" style={{ background: palette.soft }} /><div className="mt-4 grid grid-cols-[1fr_auto] gap-2"><button onClick={saveDetails} className="flex h-12 items-center justify-center gap-2 rounded-xl text-white" style={{ background: gradient }}><Save size={18} /> Сохранить</button><button onClick={() => { deletePlace(selected.id); setDetailsOpen(false); }} className="grid h-12 w-12 place-items-center rounded-xl text-red-500" style={{ background: palette.soft }}><Trash2 size={19} /></button></div></div></div>}

      {manualOpen && <div className="fixed inset-0 z-[3000] grid place-items-end bg-black/60 sm:place-items-center sm:p-4" onMouseDown={() => setManualOpen(false)}><div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[26px] p-5 sm:rounded-[26px]" style={{ background: palette.panel }} onMouseDown={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><div><h3 className="text-lg font-bold">Новое место</h3><p className="text-sm" style={{ color: palette.muted }}>{manualLoading ? "Определяю адрес…" : "Координаты и адрес заполнены автоматически"}</p></div><button onClick={() => setManualOpen(false)}><X size={20} /></button></div><label className="mt-4 block text-sm font-semibold">Название</label><input autoFocus value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} placeholder="Название места" className="mt-2 h-11 w-full rounded-xl px-3" style={{ background: palette.soft }} /><label className="mt-3 block text-sm font-semibold">Адрес</label><input value={manual.address} onChange={(e) => setManual({ ...manual, address: e.target.value })} className="mt-2 h-11 w-full rounded-xl px-3" style={{ background: palette.soft }} /><label className="mt-3 block text-sm font-semibold">Категория</label><div className="mt-2 grid grid-cols-2 gap-2"><FilterButton active={manual.category === "food"} onClick={() => setManual({ ...manual, category: "food" })}>Еда</FilterButton><FilterButton active={manual.category === "other"} onClick={() => setManual({ ...manual, category: "other" })}>Остальное</FilterButton></div><label className="mt-3 block text-sm font-semibold">Заметка</label><textarea value={manual.note} onChange={(e) => setManual({ ...manual, note: e.target.value })} className="mt-2 min-h-20 w-full rounded-xl p-3" style={{ background: palette.soft }} /><button disabled={!manual.name.trim() || manualLoading} onClick={saveManualPlace} className="mt-4 h-12 w-full rounded-xl font-semibold text-white disabled:opacity-50" style={{ background: gradient }}>Сохранить место</button></div></div>}

      {addOpen && <div className="fixed inset-0 z-[3000] grid place-items-end bg-black/60 sm:place-items-center sm:p-4" onMouseDown={() => !processing && setAddOpen(false)}><div className="w-full max-w-lg rounded-t-[26px] p-5 sm:rounded-[26px]" style={{ background: palette.panel }} onMouseDown={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><div><h3 className="text-lg font-bold">Добавить место</h3><p className="text-sm" style={{ color: palette.muted }}>Автоматическое распознавание названия, адреса и координат</p></div><button disabled={processing} onClick={() => setAddOpen(false)}><X size={20} /></button></div><input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" /><button disabled={processing} onClick={() => fileRef.current?.click()} className="mt-4 flex h-40 w-full flex-col items-center justify-center gap-3 rounded-[18px]" style={{ background: palette.soft }}>{processing ? <><LoaderCircle className="animate-spin" size={30} /><span>{progress}%</span></> : <><Upload size={28} /><span>Выбрать скриншот</span></>}</button>{error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}</div></div>}
    </div>
  );
}
