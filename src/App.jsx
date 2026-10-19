import React, { useEffect, useMemo, useRef, useState } from "react";
import Tesseract from "tesseract.js";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin, Plus, Sun, Moon, Navigation, LocateFixed, Map as MapIcon,
  Bookmark, ChevronRight, X, Upload, Copy, Trash2, LoaderCircle,
  CheckCircle2, Save, Search, Utensils, Shapes, Download, FileUp, Building2
} from "lucide-react";

const initialPlaces = [
  { id: 1, name: "Łazienki Królewskie", address: "Agrykola 1, Warszawa", note: "Хочу погулять здесь весной", status: "want", category: "other", city: "Warszawa", lat: 52.2152, lng: 21.0351 },
  { id: 2, name: "Muzeum Neonów", address: "Mińska 25, Warszawa", note: "Красивое место, особенно вечером", status: "visited", category: "other", city: "Warszawa", lat: 52.2501, lng: 21.0547 },
  { id: 3, name: "Ogród Botaniczny UW", address: "Aleje Ujazdowskie 4, Warszawa", note: "Проверить часы работы", status: "want", category: "other", city: "Warszawa", lat: 52.2167, lng: 21.0275 },
];

const gradient = "linear-gradient(120deg,#4d36d2 0%,#a54de2 50%,#2875ed 100%)";
const mapCenter = [52.2297, 21.0122];
const FOOD_WORDS = /(kebab|restaurant|restauracja|cafe|café|coffee|bar|pizza|bistro|bakery|piekarnia|grill|sushi|burger|ramen|food|jedzenie|lody|ice cream|cukiernia|pub)/i;

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
  useMapEvents({ zoomend: (event) => setZoom(event.target.getZoom()) });
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
    <Marker key={cluster.items[0].id} position={[cluster.lat, cluster.lng]} icon={markerIcon(cluster.items[0].status)} eventHandlers={{ click: () => onSelect(cluster.items[0]) }}>
      <Popup><strong>{cluster.items[0].name}</strong><br />{cluster.items[0].address}</Popup>
    </Marker>
  ) : (
    <Marker key={`cluster-${cluster.lat}-${cluster.lng}-${cluster.items.length}`} position={[cluster.lat, cluster.lng]} icon={clusterIcon(cluster.items.length)} eventHandlers={{ click: () => map.flyTo([cluster.lat, cluster.lng], Math.min(18, zoom + 2), { duration: 0.5 }) }} />
  ));
}

function inferCityFromAddress(address = "") {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  const candidate = parts.find((part) => /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/.test(part) && !/\d{2}-\d{3}|^\d/.test(part));
  return parts.length > 1 ? (parts[parts.length - 1].replace(/^\d{2}-\d{3}\s*/, "").trim() || candidate || "") : (candidate || "");
}

function FlyToPlace({ place }) {
  const map = useMap();
  useEffect(() => {
    if (place?.lat && place?.lng) map.flyTo([place.lat, place.lng], 16, { duration: 0.7 });
  }, [place, map]);
  return null;
}

function cleanLine(value) {
  return value.replace(/[©@|]/g, "").replace(/\s+/g, " ").trim();
}

function extractPlace(text) {
  const lines = text.split(/\r?\n/).map(cleanLine).filter((line) => line.length > 2);
  const addressIndex = lines.findIndex((line) =>
    /\b\d{2}-\d{3}\b/.test(line) ||
    /\b(ul\.?|aleja|al\.?|plac|pl\.?|street|st\.?|road|rd\.?)\b/i.test(line) ||
    /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+\s+\d+[A-Za-z]?(?:\/\d+)?[, ]/.test(line)
  );
  const address = addressIndex >= 0 ? normalizeAddress(lines[addressIndex]) : "";
  const candidates = lines
    .map((line, index) => ({ name: cleanPlaceName(line), score: scoreNameLine(line, index, addressIndex) }))
    .filter((candidate) => candidate.name)
    .sort((a, b) => b.score - a.score);
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
  const addressData = hit.address || {};
  const city = addressData.city || addressData.town || addressData.village || addressData.municipality || inferCityFromAddress(hit.display_name || address);
  return { lat: Number(hit.lat), lng: Number(hit.lon), city };
}

export default function App() {
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState("map");
  const [places, setPlaces] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("followscope-places"));
      return (saved || initialPlaces).map((place) => ({ ...place, category: place.category || (FOOD_WORDS.test(place.name) ? "food" : "other"), city: place.city || inferCityFromAddress(place.address) }));
    } catch { return initialPlaces; }
  });
  const [selected, setSelected] = useState(places[0] || null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [found, setFound] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [edit, setEdit] = useState({ name: "", address: "", city: "", note: "", status: "want", category: "other" });
  const fileRef = useRef(null);
  const importRef = useRef(null);

  useEffect(() => { localStorage.setItem("followscope-places", JSON.stringify(places)); }, [places]);

  const cities = useMemo(() => [...new Set(places.map((place) => place.city).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [places]);

  const filteredPlaces = useMemo(() => places.filter((place) => {
    const textMatches = `${place.name} ${place.address} ${place.note}`.toLowerCase().includes(search.toLowerCase());
    const statusMatches = statusFilter === "all" || place.status === statusFilter;
    const categoryMatches = categoryFilter === "all" || place.category === categoryFilter;
    const cityMatches = cityFilter === "all" || place.city === cityFilter;
    return textMatches && statusMatches && categoryMatches && cityMatches;
  }), [places, search, statusFilter, categoryFilter, cityFilter]);

  const palette = dark
    ? { app: "#090b16", chrome: "#111421", panel: "#151927", glass: "rgba(21,25,39,.96)", text: "#f7f8ff", muted: "#aab0c2", line: "rgba(255,255,255,.10)", soft: "rgba(255,255,255,.07)" }
    : { app: "#eef1f7", chrome: "#fff", panel: "#fff", glass: "rgba(255,255,255,.97)", text: "#182033", muted: "#667085", line: "rgba(37,47,72,.11)", soft: "#f2f4f8" };

  const choose = (place) => { setSelected(place); setTab("map"); };
  const openDetails = (place = selected) => {
    if (!place) return;
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
    if (selected?.id === id) setSelected(next[0] || null);
  };
  const openRoute = () => selected && window.open(`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`, "_blank", "noopener,noreferrer");
  const copyCoordinates = () => selected && navigator.clipboard?.writeText(`${selected.lat}, ${selected.lng}`);
  const exportPlaces = () => {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), places }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `followscope-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  const importPlaces = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const incoming = Array.isArray(parsed) ? parsed : parsed.places;
      if (!Array.isArray(incoming)) throw new Error("Файл не содержит список мест");
      const valid = incoming.filter((place) => place && place.name && Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng))).map((place, index) => ({
        ...place,
        id: place.id || `${Date.now()}-${index}`,
        lat: Number(place.lat), lng: Number(place.lng),
        status: place.status === "visited" ? "visited" : "want",
        category: place.category === "food" ? "food" : "other",
        note: place.note || "", address: place.address || "", city: place.city || inferCityFromAddress(place.address || ""),
      }));
      if (!valid.length) throw new Error("В файле нет корректных мест");
      setPlaces(valid);
      setSelected(valid[0]);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось импортировать файл");
      setAddOpen(true);
    } finally { event.target.value = ""; }
  };

  const handleImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProcessing(true); setProgress(0); setError(""); setFound("");
    try {
      const preview = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
      });
      const result = await Tesseract.recognize(file, "eng", {
        logger: (message) => { if (message.status === "recognizing text") setProgress(Math.round((message.progress || 0) * 100)); },
      });
      const extracted = extractPlace(result.data.text);
      if (!extracted.address) throw new Error("Адрес не распознан. Попробуй более чёткий скриншот.");
      const geo = await geocodePlace(extracted.name, extracted.address);
      const place = {
        id: Date.now(), name: extracted.name || extracted.address.split(",")[0], address: extracted.address,
        note: "", status: "want", category: extracted.category, city: geo.city || inferCityFromAddress(extracted.address), lat: geo.lat, lng: geo.lng, screenshot: preview,
      };
      setPlaces((current) => [...current, place]);
      setSelected(place); setFound(`${place.name} — ${place.address}`);
      setTimeout(() => { setAddOpen(false); setTab("map"); setProcessing(false); }, 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обработать скриншот");
      setProcessing(false);
    } finally { event.target.value = ""; }
  };

  const FilterButton = ({ active, onClick, children }) => (
    <button onClick={onClick} className="h-9 whitespace-nowrap rounded-xl px-3 text-sm font-semibold" style={active ? { background: gradient, color: "white" } : { background: palette.soft, color: palette.muted }}>{children}</button>
  );

  return (
    <div className="h-screen w-full overflow-hidden" style={{ background: palette.app, color: palette.text, fontFamily: "Inter,ui-sans-serif,system-ui,sans-serif" }}>
      <div className="mx-auto grid h-full max-w-6xl grid-rows-[60px_minmax(0,1fr)_64px] overflow-hidden sm:h-[calc(100vh-24px)] sm:translate-y-3 sm:rounded-[28px]" style={{ background: palette.app, border: `1px solid ${palette.line}` }}>
        <header className="flex items-center justify-between gap-3 px-3 sm:px-5" style={{ background: palette.chrome, borderBottom: `1px solid ${palette.line}` }}>
          <div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: gradient }}><MapPin size={18} fill="currentColor" /></div><h1 className="text-lg font-bold">Мои места</h1></div>
          <div className="flex items-center gap-2"><input ref={importRef} type="file" accept="application/json,.json" onChange={importPlaces} className="hidden" /><button onClick={() => importRef.current?.click()} title="Импорт JSON" className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: palette.soft, border: `1px solid ${palette.line}` }}><FileUp size={18} /></button><button onClick={exportPlaces} title="Экспорт JSON" className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: palette.soft, border: `1px solid ${palette.line}` }}><Download size={18} /></button><button onClick={() => setDark(!dark)} className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: palette.soft, border: `1px solid ${palette.line}` }}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button><button onClick={() => { setError(""); setFound(""); setAddOpen(true); }} className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-white" style={{ background: gradient }}><Plus size={18} /><span className="hidden sm:inline">Добавить место</span></button></div>
        </header>

        <main className="relative min-h-0 overflow-hidden">
          {tab === "map" ? <div className="relative h-full">
            <MapContainer center={mapCenter} zoom={12} scrollWheelZoom className="h-full w-full">
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://tile.openstreetmap.de/{z}/{x}/{y}.png" />
              <ClusteredMarkers places={filteredPlaces} onSelect={choose} />
              <FlyToPlace place={selected} />
            </MapContainer>
            <div className="absolute left-3 right-16 top-3 z-[500] flex gap-2 overflow-x-auto rounded-2xl p-2" style={{ background: palette.glass, border: `1px solid ${palette.line}` }}>
              <FilterButton active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>Все</FilterButton>
              <FilterButton active={statusFilter === "want"} onClick={() => setStatusFilter("want")}>Хочу посетить</FilterButton>
              <FilterButton active={statusFilter === "visited"} onClick={() => setStatusFilter("visited")}>Уже была</FilterButton>
              <FilterButton active={categoryFilter === "food"} onClick={() => setCategoryFilter(categoryFilter === "food" ? "all" : "food")}><span className="flex items-center gap-1"><Utensils size={15} /> Еда</span></FilterButton>
              <FilterButton active={categoryFilter === "other"} onClick={() => setCategoryFilter(categoryFilter === "other" ? "all" : "other")}><span className="flex items-center gap-1"><Shapes size={15} /> Остальное</span></FilterButton>{cities.map((city) => <FilterButton key={city} active={cityFilter === city} onClick={() => setCityFilter(cityFilter === city ? "all" : city)}><span className="flex items-center gap-1"><Building2 size={15} /> {city}</span></FilterButton>)}
            </div>
            <button onClick={() => navigator.geolocation?.getCurrentPosition(({ coords }) => setSelected({ id: "me", name: "Моё местоположение", address: "", note: "", status: "want", category: "other", lat: coords.latitude, lng: coords.longitude }))} className="absolute right-3 top-3 z-[500] grid h-11 w-11 place-items-center rounded-[14px]" style={{ background: palette.glass }}><LocateFixed size={19} /></button>
            {selected && <section className="absolute inset-x-3 bottom-3 z-[500] rounded-[20px] p-4 sm:left-4 sm:right-auto sm:w-[390px]" style={{ background: palette.glass, border: `1px solid ${palette.line}` }}><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold" style={{ color: selected.status === "visited" ? "#16a085" : "#4f7df3" }}>{selected.status === "visited" ? "Уже была" : "Хочу посетить"}</span><div className="flex items-center gap-1"><button onClick={() => openDetails(selected)} className="flex items-center gap-1 text-sm font-semibold" style={{ color: "#6754e8" }}>Подробнее <ChevronRight size={16} /></button><button onClick={() => setSelected(null)} aria-label="Закрыть карточку" className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: palette.soft }}><X size={16} /></button></div></div><h2 className="mt-3 text-[22px] font-bold">{selected.name}</h2><p className="mt-1 text-[15px]" style={{ color: palette.muted }}>{selected.address}</p>{selected.note && <p className="mt-2 text-[15px]">{selected.note}</p>}<button onClick={openRoute} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[15px] font-semibold text-white" style={{ background: gradient }}><Navigation size={18} /> Построить маршрут</button></section>}
          </div> : <div className="h-full overflow-y-auto p-4"><div className="mx-auto max-w-4xl"><div className="flex items-center justify-between"><h2 className="text-[22px] font-bold">Мои места</h2><span style={{ color: palette.muted }}>{filteredPlaces.length}</span></div>
            <div className="mt-4 flex items-center gap-2 rounded-xl px-3" style={{ background: palette.panel, border: `1px solid ${palette.line}` }}><Search size={18} style={{ color: palette.muted }} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию, адресу или заметке" className="h-11 w-full bg-transparent outline-none" /></div>
            <div className="mt-3 flex gap-2 overflow-x-auto"><FilterButton active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>Все</FilterButton><FilterButton active={statusFilter === "want"} onClick={() => setStatusFilter("want")}>Хочу посетить</FilterButton><FilterButton active={statusFilter === "visited"} onClick={() => setStatusFilter("visited")}>Уже была</FilterButton><FilterButton active={categoryFilter === "food"} onClick={() => setCategoryFilter(categoryFilter === "food" ? "all" : "food")}>Еда</FilterButton><FilterButton active={categoryFilter === "other"} onClick={() => setCategoryFilter(categoryFilter === "other" ? "all" : "other")}>Остальное</FilterButton>{cities.map((city) => <FilterButton key={city} active={cityFilter === city} onClick={() => setCityFilter(cityFilter === city ? "all" : city)}>{city}</FilterButton>)}</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">{filteredPlaces.map((place) => <div key={place.id} className="flex items-start gap-3 rounded-[18px] p-4" style={{ background: palette.panel, border: `1px solid ${palette.line}` }}><button onClick={() => openDetails(place)} className="flex min-w-0 flex-1 items-start gap-3 text-left">{place.screenshot ? <img src={place.screenshot} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" /> : <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl" style={{ background: palette.soft }}><MapPin size={24} style={{ color: place.status === "visited" ? "#16a085" : "#4f7df3" }} /></div>}<div className="min-w-0"><div className="flex items-center gap-2"><p className="font-bold">{place.name}</p><span className="text-xs" style={{ color: palette.muted }}>{place.category === "food" ? "Еда" : "Остальное"}</span></div><p className="text-sm" style={{ color: palette.muted }}>{place.address}</p>{place.city && <p className="mt-1 text-xs font-semibold" style={{ color: palette.muted }}>{place.city}</p>}{place.note && <p className="mt-2 line-clamp-2 text-sm">{place.note}</p>}</div></button><button onClick={() => deletePlace(place.id)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-red-500" style={{ background: palette.soft }}><Trash2 size={18} /></button></div>)}</div>
          </div></div>}
        </main>

        <nav className="grid grid-cols-2 gap-2 px-3 py-2" style={{ background: palette.chrome, borderTop: `1px solid ${palette.line}` }}><button onClick={() => setTab("map")} className="flex h-12 items-center justify-center gap-2 rounded-[14px] font-semibold" style={tab === "map" ? { background: gradient, color: "white" } : { color: palette.muted }}><MapIcon size={19} /> Карта</button><button onClick={() => setTab("places")} className="flex h-12 items-center justify-center gap-2 rounded-[14px] font-semibold" style={tab === "places" ? { background: gradient, color: "white" } : { color: palette.muted }}><Bookmark size={19} /> Мои места</button></nav>
      </div>

      {detailsOpen && selected && <div className="fixed inset-0 z-[1000] grid place-items-end bg-black/60 sm:place-items-center sm:p-4" onMouseDown={() => setDetailsOpen(false)}><div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[26px] p-5 sm:rounded-[26px]" style={{ background: palette.panel }} onMouseDown={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><h3 className="text-lg font-bold">Редактировать место</h3><button onClick={() => setDetailsOpen(false)}><X size={20} /></button></div>{selected.screenshot && <img src={selected.screenshot} alt="Скриншот" className="mt-4 max-h-48 w-full rounded-xl object-contain" />}
        <label className="mt-4 block text-sm font-semibold">Название</label><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="mt-2 h-11 w-full rounded-xl px-3 outline-none" style={{ background: palette.soft, border: `1px solid ${palette.line}` }} />
        <label className="mt-3 block text-sm font-semibold">Адрес</label><input value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} className="mt-2 h-11 w-full rounded-xl px-3 outline-none" style={{ background: palette.soft, border: `1px solid ${palette.line}` }} />
        <label className="mt-3 block text-sm font-semibold">Город</label><input value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} className="mt-2 h-11 w-full rounded-xl px-3 outline-none" style={{ background: palette.soft, border: `1px solid ${palette.line}` }} />
        <label className="mt-3 block text-sm font-semibold">Категория</label><div className="mt-2 grid grid-cols-2 gap-2"><FilterButton active={edit.category === "food"} onClick={() => setEdit({ ...edit, category: "food" })}>Еда</FilterButton><FilterButton active={edit.category === "other"} onClick={() => setEdit({ ...edit, category: "other" })}>Остальное</FilterButton></div>
        <label className="mt-3 block text-sm font-semibold">Статус</label><div className="mt-2 grid grid-cols-2 gap-2"><FilterButton active={edit.status === "want"} onClick={() => setEdit({ ...edit, status: "want" })}>Хочу посетить</FilterButton><FilterButton active={edit.status === "visited"} onClick={() => setEdit({ ...edit, status: "visited" })}>Уже была</FilterButton></div>
        <label className="mt-3 block text-sm font-semibold">Заметка</label><textarea value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} placeholder="Добавить заметку" className="mt-2 min-h-24 w-full resize-none rounded-xl p-3 outline-none" style={{ background: palette.soft, border: `1px solid ${palette.line}` }} />
        <div className="mt-3 flex items-center justify-between rounded-xl p-3" style={{ background: palette.soft }}><span>{selected.lat}, {selected.lng}</span><button onClick={copyCoordinates}><Copy size={17} /></button></div><div className="mt-4 grid grid-cols-[1fr_auto] gap-2"><button onClick={saveDetails} className="flex h-12 items-center justify-center gap-2 rounded-xl font-semibold text-white" style={{ background: gradient }}><Save size={18} /> Сохранить</button><button onClick={() => { deletePlace(selected.id); setDetailsOpen(false); }} className="grid h-12 w-12 place-items-center rounded-xl text-red-500" style={{ background: palette.soft }}><Trash2 size={19} /></button></div>
      </div></div>}

      {addOpen && <div className="fixed inset-0 z-[1000] grid place-items-end bg-black/60 sm:place-items-center sm:p-4" onMouseDown={() => !processing && setAddOpen(false)}><div className="w-full max-w-lg rounded-t-[26px] p-5 sm:rounded-[26px]" style={{ background: palette.panel }} onMouseDown={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><div><h3 className="text-lg font-bold">Добавить место</h3><p className="text-sm" style={{ color: palette.muted }}>Автоматическое распознавание названия, адреса, категории и координат</p></div><button disabled={processing} onClick={() => setAddOpen(false)}><X size={20} /></button></div><input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" /><button disabled={processing} onClick={() => fileRef.current?.click()} className="mt-4 flex h-40 w-full flex-col items-center justify-center gap-3 rounded-[18px]" style={{ background: palette.soft, border: `1px dashed ${palette.line}` }}>{processing ? <><LoaderCircle className="animate-spin" size={30} /><span className="font-semibold">Распознаю место… {progress}%</span></> : found ? <><CheckCircle2 className="text-emerald-500" size={32} /><span className="text-center font-semibold">{found}</span></> : <><Upload size={28} /><span className="font-semibold">Выбрать скриншот</span></>}</button>{error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}</div></div>}
    </div>
  );
}
