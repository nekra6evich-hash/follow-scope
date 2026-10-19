

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Plus,
  Sun,
  Moon,
  Navigation,
  LocateFixed,
  Map as MapIcon,
  Bookmark,
  ChevronRight,
  X,
  Upload,
  Check,
  Copy,
} from "lucide-react";

const demoPlaces = [
  {
    id: 1,
    name: "Łazienki Królewskie",
    address: "Agrykola 1, Warszawa",
    note: "Хочу погулять здесь весной",
    status: "want",
    lat: 52.2152,
    lng: 21.0351,
    left: "25%",
    top: "27%",
  },
  {
    id: 2,
    name: "Muzeum Neonów",
    address: "Mińska 25, Warszawa",
    note: "Красивое место, особенно вечером",
    status: "visited",
    lat: 52.2501,
    lng: 21.0547,
    left: "73%",
    top: "34%",
  },
  {
    id: 3,
    name: "Ogród Botaniczny UW",
    address: "Aleje Ujazdowskie 4, Warszawa",
    note: "Проверить часы работы",
    status: "want",
    lat: 52.2167,
    lng: 21.0275,
    left: "58%",
    top: "55%",
  },
];

const gradient = "linear-gradient(120deg, #4d36d2 0%, #a54de2 50%, #2875ed 100%)";

export default function App() {
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState("map");
  const [selected, setSelected] = useState(demoPlaces[0]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [status, setStatus] = useState(demoPlaces[0].status);

  const palette = dark
    ? {
        app: "#090b16",
        chrome: "#111421",
        panel: "#151927",
        glass: "rgba(21,25,39,.96)",
        text: "#f7f8ff",
        muted: "#aab0c2",
        line: "rgba(255,255,255,.10)",
        map: "#171c2d",
        road: "rgba(157,167,204,.17)",
        park: "#18372f",
        water: "#18314d",
        soft: "rgba(255,255,255,.07)",
      }
    : {
        app: "#eef1f7",
        chrome: "#ffffff",
        panel: "#ffffff",
        glass: "rgba(255,255,255,.97)",
        text: "#182033",
        muted: "#667085",
        line: "rgba(37,47,72,.11)",
        map: "#e8eee9",
        road: "rgba(255,255,255,.98)",
        park: "#cce8d5",
        water: "#d5e9f5",
        soft: "#f2f4f8",
      };

  const stateColor = status === "visited" ? (dark ? "#4adbb6" : "#0b7c69") : dark ? "#bbaaff" : "#6754e8";
  const stateLabel = status === "visited" ? "Уже была" : "Хочу посетить";

  const choose = (place) => {
    setSelected(place);
    setStatus(place.status);
  };

  const openRoute = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`,
      "_blank"
    );
  };

  return (
    <div
      className="h-screen w-full overflow-hidden"
      style={{
        background: palette.app,
        color: palette.text,
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        className="mx-auto grid h-full max-w-6xl grid-rows-[60px_minmax(0,1fr)_64px] overflow-hidden sm:h-[calc(100vh-24px)] sm:translate-y-3 sm:rounded-[28px]"
        style={{
          background: palette.app,
          border: `1px solid ${palette.line}`,
          boxShadow: dark ? "0 28px 80px rgba(0,0,0,.5)" : "0 24px 64px rgba(42,52,82,.14)",
        }}
      >
        <header
          className="flex items-center justify-between gap-3 px-3 sm:px-5"
          style={{ background: palette.chrome, borderBottom: `1px solid ${palette.line}` }}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white"
              style={{ background: gradient }}
            >
              <MapPin size={18} fill="currentColor" />
            </div>
            <h1 className="truncate text-lg font-bold tracking-tight">Мои места</h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setDark(!dark)}
              className="grid h-10 w-10 place-items-center rounded-xl"
              style={{ background: palette.soft, border: `1px solid ${palette.line}` }}
              aria-label="Переключить тему"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-xl text-white sm:hidden"
              style={{ background: gradient }}
              aria-label="Добавить место"
            >
              <Plus size={20} />
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="hidden h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold text-white sm:flex"
              style={{ background: gradient }}
            >
              <Plus size={18} /> Добавить место
            </button>
          </div>
        </header>

        <main className="relative min-h-0 overflow-hidden">
          {tab === "map" ? (
            <div className="relative h-full overflow-hidden" style={{ background: palette.map }}>
              <div
                className="absolute inset-[-80px]"
                style={{
                  backgroundColor: palette.map,
                  backgroundImage: `linear-gradient(0deg, transparent 45%, ${palette.road} 46%, ${palette.road} 50%, transparent 51%), linear-gradient(90deg, transparent 45%, ${palette.road} 46%, ${palette.road} 50%, transparent 51%)`,
                  backgroundSize: "190px 150px",
                }}
              />
              <div className="absolute left-[3%] top-[5%] h-40 w-64 rounded-[38px]" style={{ background: palette.park }} />
              <div className="absolute right-[-3%] top-[4%] h-52 w-40 rounded-[38px]" style={{ background: palette.water }} />
              <div className="absolute bottom-[2%] left-[42%] h-40 w-64 rounded-[38px]" style={{ background: palette.park }} />

              {demoPlaces.map((place) => {
                const color = place.status === "visited" ? (dark ? "#4adbb6" : "#0b7c69") : dark ? "#bbaaff" : "#6754e8";
                return (
                  <button
                    key={place.id}
                    onClick={() => choose(place)}
                    className="absolute z-10 -translate-x-1/2 -translate-y-full bg-transparent p-2"
                    style={{ left: place.left, top: place.top }}
                    aria-label={place.name}
                  >
                    <div className={`relative transition ${selected.id === place.id ? "-translate-y-1 scale-110" : ""}`}>
                      <MapPin
                        size={38}
                        fill={color}
                        color="white"
                        strokeWidth={2.1}
                        style={{ filter: "drop-shadow(0 6px 7px rgba(30,40,70,.32))" }}
                      />
                      {place.status === "visited" ? (
                        <Check size={15} strokeWidth={3} className="absolute left-3 top-[9px] text-white" />
                      ) : (
                        <span className="absolute left-[14px] top-[10px] h-2.5 w-2.5 rounded-full bg-white" />
                      )}
                    </div>
                  </button>
                );
              })}

              <button
                className="absolute right-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-[14px]"
                style={{ background: palette.glass, border: `1px solid ${palette.line}`, color: stateColor }}
                aria-label="Моё местоположение"
              >
                <LocateFixed size={19} />
              </button>

              <section
                className="absolute inset-x-3 bottom-3 z-20 rounded-[20px] p-4 sm:left-4 sm:right-auto sm:w-[390px]"
                style={{
                  background: palette.glass,
                  border: `1px solid ${palette.line}`,
                  boxShadow: dark ? "0 18px 44px rgba(0,0,0,.48)" : "0 14px 34px rgba(35,48,82,.18)",
                  backdropFilter: "blur(18px)",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2 text-sm font-semibold" style={{ color: stateColor }}>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: stateColor }} />
                    <span className="truncate">{stateLabel}</span>
                  </div>
                  <button
                    onClick={() => setDetailsOpen(true)}
                    className="flex shrink-0 items-center gap-1 bg-transparent text-sm font-semibold"
                    style={{ color: dark ? "#c8bbff" : "#6754e8" }}
                  >
                    Подробнее <ChevronRight size={16} />
                  </button>
                </div>
                <h2 className="mt-3 break-words text-[22px] font-bold leading-7 tracking-tight">{selected.name}</h2>
                <p className="mt-1 break-words text-[15px] leading-5" style={{ color: palette.muted }}>{selected.address}</p>
                <p className="mt-2 break-words text-[15px] leading-5">{selected.note}</p>
                <button
                  onClick={openRoute}
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-[15px] text-[15px] font-semibold text-white"
                  style={{ background: gradient }}
                >
                  <Navigation size={18} /> Построить маршрут
                </button>
              </section>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-4" style={{ background: dark ? "#0d0f1d" : "#f6f7fb" }}>
              <div className="mx-auto max-w-3xl">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[22px] font-bold">Мои места</h2>
                  <span className="shrink-0 text-sm" style={{ color: palette.muted }}>{demoPlaces.length} места</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {demoPlaces.map((place) => {
                    const color = place.status === "visited" ? (dark ? "#4adbb6" : "#0b7c69") : dark ? "#bbaaff" : "#6754e8";
                    return (
                      <button
                        key={place.id}
                        onClick={() => { choose(place); setDetailsOpen(true); }}
                        className="flex w-full items-start gap-3 rounded-[18px] p-4 text-left"
                        style={{ background: palette.panel, color: palette.text, border: `1px solid ${palette.line}` }}
                      >
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: palette.soft, color }}>
                          <MapPin size={22} fill="currentColor" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="m-0 text-[13px] font-semibold" style={{ color }}>{place.status === "visited" ? "Уже была" : "Хочу посетить"}</p>
                          <p className="mt-1 break-words text-[17px] font-bold leading-5">{place.name}</p>
                          <p className="mt-1 break-words text-[14px] leading-5" style={{ color: palette.muted }}>{place.address}</p>
                          <p className="mt-2 text-[13px] leading-4" style={{ color: palette.muted }}>{place.note}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>

        <nav className="grid grid-cols-2 gap-2 px-3 py-2" style={{ background: palette.chrome, borderTop: `1px solid ${palette.line}` }}>
          <button
            onClick={() => setTab("map")}
            className="flex h-12 items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold"
            style={tab === "map" ? { background: gradient, color: "white" } : { background: "transparent", color: palette.muted }}
          >
            <MapIcon size={19} /> Карта
          </button>
          <button
            onClick={() => setTab("places")}
            className="flex h-12 items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold"
            style={tab === "places" ? { background: gradient, color: "white" } : { background: "transparent", color: palette.muted }}
          >
            <Bookmark size={19} /> Мои места
          </button>
        </nav>
      </div>

      {detailsOpen && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" onMouseDown={() => setDetailsOpen(false)}>
          <div className="w-full max-w-lg rounded-t-[26px] p-5 sm:rounded-[26px]" style={{ background: palette.panel, color: palette.text }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Подробности</h3>
              <button onClick={() => setDetailsOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: palette.soft }}><X size={18} /></button>
            </div>
            <h2 className="mt-4 break-words text-2xl font-bold leading-8">{selected.name}</h2>
            <p className="mt-1 text-[15px]" style={{ color: palette.muted }}>{selected.address}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl p-1.5" style={{ background: palette.soft }}>
              <button onClick={() => setStatus("want")} className="h-11 rounded-lg text-sm font-semibold" style={status === "want" ? { background: palette.panel, color: dark ? "#bbaaff" : "#6754e8" } : { color: palette.muted }}>Хочу посетить</button>
              <button onClick={() => setStatus("visited")} className="h-11 rounded-lg text-sm font-semibold" style={status === "visited" ? { background: palette.panel, color: dark ? "#4adbb6" : "#0b7c69" } : { color: palette.muted }}>Уже была</button>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl p-3" style={{ background: palette.soft }}>
              <div><p className="m-0 text-[11px] font-semibold" style={{ color: palette.muted }}>КООРДИНАТЫ</p><p className="mt-1 text-sm">{selected.lat}, {selected.lng}</p></div>
              <button className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: palette.panel }}><Copy size={17} /></button>
            </div>
            <button onClick={openRoute} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[15px] text-[15px] font-semibold text-white" style={{ background: gradient }}><Navigation size={18} /> Построить маршрут</button>
          </div>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 backdrop-blur-sm sm:place-items-center sm:p-4" onMouseDown={() => setAddOpen(false)}>
          <div className="w-full max-w-lg rounded-t-[26px] p-5 sm:rounded-[26px]" style={{ background: palette.panel, color: palette.text }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><div><h3 className="text-lg font-bold">Добавить место</h3><p className="mt-1 text-sm" style={{ color: palette.muted }}>Загрузите скриншот</p></div><button onClick={() => setAddOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: palette.soft }}><X size={18} /></button></div>
            <button className="mt-4 flex h-40 w-full flex-col items-center justify-center gap-3 rounded-[18px]" style={{ background: palette.soft, border: `1px dashed ${palette.line}` }}><span className="grid h-12 w-12 place-items-center rounded-xl text-white" style={{ background: gradient }}><Upload size={21} /></span><span className="text-sm font-semibold">Выбрать скриншот</span></button>
          </div>
        </div>
      )}
    </div>
  );
}
