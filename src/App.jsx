import React, { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin, Plus, Sun, Moon, Navigation, LocateFixed, Map as MapIcon,
  Bookmark, ChevronRight, X, Upload, Copy, Trash2
} from "lucide-react";

const initialPlaces = [
  { id: 1, name: "Łazienki Królewskie", address: "Agrykola 1, Warszawa", note: "Хочу погулять здесь весной", status: "want", lat: 52.2152, lng: 21.0351 },
  { id: 2, name: "Muzeum Neonów", address: "Mińska 25, Warszawa", note: "Красивое место, особенно вечером", status: "visited", lat: 52.2501, lng: 21.0547 },
  { id: 3, name: "Ogród Botaniczny UW", address: "Aleje Ujazdowskie 4, Warszawa", note: "Проверить часы работы", status: "want", lat: 52.2167, lng: 21.0275 },
];

const gradient = "linear-gradient(120deg, #4d36d2 0%, #a54de2 50%, #2875ed 100%)";
const mapCenter = [52.2297, 21.0122];

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FlyToPlace({ place }) {
  const map = useMap();
  useEffect(() => {
    if (place) map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 14), { duration: 0.7 });
  }, [place, map]);
  return null;
}

export default function App() {
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState("map");
  const [places, setPlaces] = useState(() => {
    try { return JSON.parse(localStorage.getItem("followscope-places")) || initialPlaces; }
    catch { return initialPlaces; }
  });
  const [selected, setSelected] = useState(places[0]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [form, setForm] = useState({ name: "", address: "", note: "", status: "want", lat: "", lng: "" });
  const fileRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("followscope-places", JSON.stringify(places));
  }, [places]);

  const palette = dark
    ? { app: "#090b16", chrome: "#111421", panel: "#151927", glass: "rgba(21,25,39,.96)", text: "#f7f8ff", muted: "#aab0c2", line: "rgba(255,255,255,.10)", soft: "rgba(255,255,255,.07)" }
    : { app: "#eef1f7", chrome: "#ffffff", panel: "#ffffff", glass: "rgba(255,255,255,.97)", text: "#182033", muted: "#667085", line: "rgba(37,47,72,.11)", soft: "#f2f4f8" };

  const choose = (place) => { setSelected(place); setTab("map"); };
  const openRoute = () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`, "_blank", "noopener,noreferrer");
  const copyCoordinates = () => navigator.clipboard?.writeText(`${selected.lat}, ${selected.lng}`);

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const addPlace = () => {
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!form.name.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const place = { id: Date.now(), ...form, name: form.name.trim(), address: form.address.trim(), note: form.note.trim(), lat, lng, screenshot: imagePreview };
    setPlaces((current) => [...current, place]);
    setSelected(place);
    setForm({ name: "", address: "", note: "", status: "want", lat: "", lng: "" });
    setImagePreview("");
    setAddOpen(false);
    setTab("map");
  };

  const deleteSelected = () => {
    const next = places.filter((place) => place.id !== selected.id);
    setPlaces(next);
    setSelected(next[0] || null);
    setDetailsOpen(false);
  };

  const stateColor = selected?.status === "visited" ? (dark ? "#4adbb6" : "#0b7c69") : dark ? "#bbaaff" : "#6754e8";
  const stateLabel = selected?.status === "visited" ? "Уже была" : "Хочу посетить";
  const inputStyle = { background: palette.soft, color: palette.text, border: `1px solid ${palette.line}` };

  return (
    <div className="h-screen w-full overflow-hidden" style={{ background: palette.app, color: palette.text, fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div className="mx-auto grid h-full max-w-6xl grid-rows-[60px_minmax(0,1fr)_64px] overflow-hidden sm:h-[calc(100vh-24px)] sm:translate-y-3 sm:rounded-[28px]" style={{ background: palette.app, border: `1px solid ${palette.line}`, boxShadow: dark ? "0 28px 80px rgba(0,0,0,.5)" : "0 24px 64px rgba(42,52,82,.14)" }}>
        <header className="flex items-center justify-between gap-3 px-3 sm:px-5" style={{ background: palette.chrome, borderBottom: `1px solid ${palette.line}` }}>
          <div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: gradient }}><MapPin size={18} fill="currentColor" /></div><h1 className="text-lg font-bold">Мои места</h1></div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDark(!dark)} className="grid h-10 w-10 place-items-center rounded-xl" style={inputStyle}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button onClick={() => setAddOpen(true)} className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-white sm:px-4" style={{ background: gradient }}><Plus size={18} /><span className="hidden sm:inline">Добавить место</span></button>
          </div>
        </header>

        <main className="relative min-h-0 overflow-hidden">
          {tab === "map" ? (
            <div className="relative h-full">
              <MapContainer center={mapCenter} zoom={12} scrollWheelZoom className="h-full w-full" zoomControl>
                <TileLayer attribution='&copy; OpenStreetMap contributors &copy; CARTO' url="https://tile.openstreetmap.de/{z}/{x}/{y}.png" />
                {places.map((place) => (
                  <Marker key={place.id} position={[place.lat, place.lng]} icon={markerIcon} eventHandlers={{ click: () => choose(place) }}>
                    <Popup><strong>{place.name}</strong><br />{place.address}</Popup>
                  </Marker>
                ))}
                <FlyToPlace place={selected} />
              </MapContainer>
              <button onClick={() => navigator.geolocation?.getCurrentPosition(({ coords }) => setSelected({ id: "me", name: "Моё местоположение", address: "", note: "", status: "want", lat: coords.latitude, lng: coords.longitude }))} className="absolute right-3 top-3 z-[500] grid h-11 w-11 place-items-center rounded-[14px]" style={{ background: palette.glass, border: `1px solid ${palette.line}`, color: stateColor }}><LocateFixed size={19} /></button>
              {selected && <section className="absolute inset-x-3 bottom-3 z-[500] rounded-[20px] p-4 sm:left-4 sm:right-auto sm:w-[390px]" style={{ background: palette.glass, border: `1px solid ${palette.line}`, boxShadow: "0 14px 34px rgba(35,48,82,.18)", backdropFilter: "blur(18px)" }}>
                <div className="flex items-center justify-between"><span className="text-sm font-semibold" style={{ color: stateColor }}>{stateLabel}</span><button onClick={() => setDetailsOpen(true)} className="flex items-center gap-1 text-sm font-semibold" style={{ color: dark ? "#c8bbff" : "#6754e8" }}>Подробнее <ChevronRight size={16} /></button></div>
                <h2 className="mt-3 text-[22px] font-bold">{selected.name}</h2><p className="mt-1 text-[15px]" style={{ color: palette.muted }}>{selected.address}</p><p className="mt-2 text-[15px]">{selected.note}</p>
                <button onClick={openRoute} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[15px] font-semibold text-white" style={{ background: gradient }}><Navigation size={18} /> Построить маршрут</button>
              </section>}
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-4" style={{ background: dark ? "#0d0f1d" : "#f6f7fb" }}><div className="mx-auto max-w-3xl"><div className="flex items-center justify-between"><h2 className="text-[22px] font-bold">Мои места</h2><span className="text-sm" style={{ color: palette.muted }}>{places.length}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{places.map((place) => <button key={place.id} onClick={() => choose(place)} className="flex w-full items-start gap-3 rounded-[18px] p-4 text-left" style={{ background: palette.panel, border: `1px solid ${palette.line}` }}><MapPin size={24} style={{ color: place.status === "visited" ? "#0b7c69" : "#6754e8" }} /><div><p className="font-bold">{place.name}</p><p className="text-sm" style={{ color: palette.muted }}>{place.address}</p><p className="mt-2 text-sm">{place.note}</p></div></button>)}</div></div></div>
          )}
        </main>

        <nav className="grid grid-cols-2 gap-2 px-3 py-2" style={{ background: palette.chrome, borderTop: `1px solid ${palette.line}` }}>
          <button onClick={() => setTab("map")} className="flex h-12 items-center justify-center gap-2 rounded-[14px] font-semibold" style={tab === "map" ? { background: gradient, color: "white" } : { color: palette.muted }}><MapIcon size={19} /> Карта</button>
          <button onClick={() => setTab("places")} className="flex h-12 items-center justify-center gap-2 rounded-[14px] font-semibold" style={tab === "places" ? { background: gradient, color: "white" } : { color: palette.muted }}><Bookmark size={19} /> Мои места</button>
        </nav>
      </div>

      {detailsOpen && selected && <div className="fixed inset-0 z-[1000] grid place-items-end bg-black/60 sm:place-items-center sm:p-4" onMouseDown={() => setDetailsOpen(false)}><div className="w-full max-w-lg rounded-t-[26px] p-5 sm:rounded-[26px]" style={{ background: palette.panel }} onMouseDown={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><h3 className="text-lg font-bold">Подробности</h3><button onClick={() => setDetailsOpen(false)}><X size={20} /></button></div>{selected.screenshot && <img src={selected.screenshot} alt="Загруженный скриншот" className="mt-4 max-h-52 w-full rounded-xl object-contain" />}<h2 className="mt-4 text-2xl font-bold">{selected.name}</h2><p style={{ color: palette.muted }}>{selected.address}</p><div className="mt-3 flex items-center justify-between rounded-xl p-3" style={{ background: palette.soft }}><span>{selected.lat}, {selected.lng}</span><button onClick={copyCoordinates}><Copy size={17} /></button></div><div className="mt-4 grid grid-cols-[1fr_auto] gap-2"><button onClick={openRoute} className="flex h-12 items-center justify-center gap-2 rounded-xl font-semibold text-white" style={{ background: gradient }}><Navigation size={18} /> Маршрут</button><button onClick={deleteSelected} className="grid h-12 w-12 place-items-center rounded-xl text-red-500" style={{ background: palette.soft }}><Trash2 size={19} /></button></div></div></div>}

      {addOpen && <div className="fixed inset-0 z-[1000] grid place-items-end bg-black/60 sm:place-items-center sm:p-4" onMouseDown={() => setAddOpen(false)}><div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[26px] p-5 sm:rounded-[26px]" style={{ background: palette.panel }} onMouseDown={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><div><h3 className="text-lg font-bold">Добавить место</h3><p className="text-sm" style={{ color: palette.muted }}>Загрузите скриншот и укажите координаты</p></div><button onClick={() => setAddOpen(false)}><X size={20} /></button></div><input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" /><button onClick={() => fileRef.current?.click()} className="mt-4 flex h-32 w-full flex-col items-center justify-center gap-2 rounded-[18px]" style={{ ...inputStyle, borderStyle: "dashed" }}>{imagePreview ? <img src={imagePreview} alt="Предпросмотр" className="h-full w-full rounded-[18px] object-contain" /> : <><Upload size={25} /><span>Выбрать скриншот</span></>}</button><div className="mt-4 grid gap-3"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Название места" className="h-11 rounded-xl px-3" style={inputStyle} /><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Адрес" className="h-11 rounded-xl px-3" style={inputStyle} /><textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Заметка" className="min-h-20 rounded-xl p-3" style={inputStyle} /><div className="grid grid-cols-2 gap-2"><input value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} placeholder="Широта, например 52.2297" className="h-11 rounded-xl px-3" style={inputStyle} /><input value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} placeholder="Долгота, например 21.0122" className="h-11 rounded-xl px-3" style={inputStyle} /></div><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-11 rounded-xl px-3" style={inputStyle}><option value="want">Хочу посетить</option><option value="visited">Уже была</option></select><button onClick={addPlace} className="h-12 rounded-xl font-semibold text-white" style={{ background: gradient }}>Добавить точку на карту</button></div></div></div>}
    </div>
  );
}
