import React, { useEffect, useMemo, useRef, useState } from "react";
import Tesseract from "tesseract.js";
import { MapContainer, Marker, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin, Plus, Sun, Moon, Navigation, LocateFixed, Map as MapIcon,
  Bookmark, ChevronRight, X, Upload, Copy, Trash2, LoaderCircle,
  Save, Search, Utensils, Download, FileUp, Check, Camera
} from "lucide-react";

const seedPlaces = [
  { id: 1, name: "Łazienki Królewskie", address: "Agrykola 1, Warszawa", note: "Хочу погулять здесь весной", status: "want", isFood: false, city: "Warszawa", lat: 52.2152, lng: 21.0351 },
  { id: 2, name: "Muzeum Neonów", address: "Mińska 25, Warszawa", note: "Красивое место, особенно вечером", status: "visited", isFood: false, city: "Warszawa", lat: 52.2501, lng: 21.0547 },
  { id: 3, name: "Ogród Botaniczny UW", address: "Aleje Ujazdowskie 4, Warszawa", note: "Проверить часы работы", status: "want", isFood: false, city: "Warszawa", lat: 52.2167, lng: 21.0275 },
];

const gradient = "linear-gradient(120deg,#6336df 0%,#9d48e8 50%,#3478ed 100%)";
const center = [52.2297, 21.0122];
const FOOD = /(kebab|restaurant|restauracja|cafe|café|coffee|bar|pizza|bistro|bakery|piekarnia|grill|sushi|burger|ramen|food|jedzenie|lody|cukiernia|pub|aldi|market|supermarket)/i;
const NOISE = /(реклама|рекламодатель|getyourguide|входные билеты|цена|advert|sponsored|обзор|отзывы|информация|проложить маршрут|сохранить|поделиться|телефон|website|menu|photos?)/i;

function pinIcon(status, isFood) {
  const color = isFood ? "#f28c28" : status === "visited" ? "#139c7d" : "#4778ee";
  return L.divIcon({className:"",html:`<div style="width:29px;height:29px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid white;box-shadow:0 5px 13px #0005"><i style="display:block;width:8px;height:8px;border-radius:50%;background:white;margin:7px"></i></div>`,iconSize:[29,39],iconAnchor:[15,37]});
}
function clusterIcon(count) {
  return L.divIcon({className:"",html:`<div style="width:42px;height:42px;display:grid;place-items:center;border-radius:50%;background:linear-gradient(135deg,#7040e8,#2f76ef);color:#fff;font:700 14px system-ui;border:3px solid white;box-shadow:0 5px 14px #0005">${count}</div>`,iconSize:[42,42],iconAnchor:[21,21]});
}
function Fly({ place }) { const map=useMap(); useEffect(()=>{ if(place?.lat&&place?.lng) map.flyTo([place.lat,place.lng],16,{duration:.6}); },[place,map]); return null; }
function Markers({ places, onSelect }) {
  const map=useMap(); const [zoom,setZoom]=useState(map.getZoom());
  useEffect(()=>{const fn=()=>setZoom(map.getZoom());map.on("zoomend",fn);return()=>map.off("zoomend",fn)},[map]);
  const groups=useMemo(()=>{const cell=zoom<10?.45:zoom<12?.13:zoom<14?.035:.006;const m=new Map();places.forEach(p=>{const k=`${Math.round(p.lat/cell)}:${Math.round(p.lng/cell)}`;m.set(k,[...(m.get(k)||[]),p]);});return[...m.values()].map(items=>({items,lat:items.reduce((a,p)=>a+p.lat,0)/items.length,lng:items.reduce((a,p)=>a+p.lng,0)/items.length}));},[places,zoom]);
  return groups.map(g=>g.items.length===1?<Marker key={g.items[0].id} position={[g.lat,g.lng]} icon={pinIcon(g.items[0].status, g.items[0].isFood)} eventHandlers={{click:()=>onSelect(g.items[0])}}/>:<Marker key={`${g.lat}-${g.lng}`} position={[g.lat,g.lng]} icon={clusterIcon(g.items.length)} eventHandlers={{click:()=>map.flyTo([g.lat,g.lng],Math.min(18,zoom+2))}}/>);
}
function LongPress({ onLongPress }) {
  const map=useMap(); const cb=useRef(onLongPress); useEffect(()=>{cb.current=onLongPress},[onLongPress]);
  useMapEvents({contextmenu:e=>cb.current(e.latlng)});
  useEffect(()=>{const el=map.getContainer();let timer=null,start=null;
    const clear=()=>{if(timer)clearTimeout(timer);timer=null;start=null};
    const begin=e=>{if(e.touches.length!==1||e.target.closest(".leaflet-marker-icon,.leaflet-control,button,input,textarea"))return;const t=e.touches[0];start={x:t.clientX,y:t.clientY};timer=setTimeout(()=>{const r=el.getBoundingClientRect();cb.current(map.containerPointToLatLng(L.point(start.x-r.left,start.y-r.top)));clear();},700)};
    const move=e=>{if(!start||!e.touches[0])return;const t=e.touches[0];if(Math.hypot(t.clientX-start.x,t.clientY-start.y)>12)clear()};
    el.addEventListener("touchstart",begin,{capture:true,passive:true});el.addEventListener("touchmove",move,{capture:true,passive:true});el.addEventListener("touchend",clear,true);el.addEventListener("touchcancel",clear,true);
    return()=>{clear();el.removeEventListener("touchstart",begin,true);el.removeEventListener("touchmove",move,true);el.removeEventListener("touchend",clear,true);el.removeEventListener("touchcancel",clear,true)};
  },[map]); return null;
}

const uniq=a=>[...new Set(a.filter(Boolean).map(x=>x.trim()).filter(Boolean))];
const words=s=>(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^0-9a-ząćęłńóśźżа-яё ]/gi," ").split(/\s+/).filter(x=>x.length>2);
function clean(s){return(s||"").replace(/[©®™|]/g," ").replace(/\s+/g," ").trim()}
function bad(s){const letters=(s.match(/[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźżА-Яа-яЁё]/g)||[]).length;return letters<3||NOISE.test(s)||/^(кафе|ресторан|музей|парк|магазин|исторический памятник|coffee shop|restaurant|museum|park)$/i.test(s)}
function signals(text){
  const lines=uniq(text.split(/\r?\n/).map(clean).filter(x=>x.length>2));
  const postal=lines.filter(x=>/\b\d{2}-\d{3}\b/.test(x));
  const streets=lines.filter(x=>/\b(ul\.?|aleja|al\.?|plac|pl\.?|street|road|avenue)\b/i.test(x)||/[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźżА-Яа-яЁё]+(?:\s+[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźżА-Яа-яЁё]+)*\s+\d+[A-Za-z]?(?:\/\d+)?/.test(x)).filter(x=>!NOISE.test(x));
  const addresses=uniq([...streets.flatMap(s=>[s,...postal.map(p=>`${s}, ${p}`)]),...postal]);
  const names=lines.slice(0,45).map((line,i)=>{let score=0;if(!bad(line))score+=10;if(i<12)score+=7;if(line.length>=3&&line.length<80)score+=3;if(/^[A-ZĄĆĘŁŃÓŚŹŻ0-9 &.-]{3,20}$/.test(line))score+=10;if(/barbakan|барбакан|polin|muzeum|museum|villa|fleur|fontann|фонтан|aldi|kebab|rost/i.test(line))score+=14;if(NOISE.test(line)||/\b\d{2}-\d{3}\b|https?:|\d+\s*(zł|pln|€|\$)/i.test(line))score-=30;return{name:line,score}}).filter(x=>!bad(x.name)).sort((a,b)=>b.score-a.score).slice(0,10).map(x=>x.name);
  const city=uniq(lines.flatMap(x=>[(x.match(/\b\d{2}-\d{3}\s+([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźżА-Яа-яЁё -]{3,})/)||[])[1],(x.match(/\b(Warszawa|Warsaw|Варшава|Konstancin-Jeziorna|Kraków|Gdańsk|Wrocław|Poznań)\b/i)||[])[1]]));if(!city.length)city.push("Warszawa");
  const c=text.match(/(-?\d{1,2}[.,]\d{4,})\s*[,; ]\s*(-?\d{1,3}[.,]\d{4,})/); const coords=c?{lat:Number(c[1].replace(",",".")),lng:Number(c[2].replace(",","."))}:null;
  return{names:uniq(names),addresses,city,coords,isFood:FOOD.test(text)};
}
async function search(query,pl=true){const c=new AbortController(),t=setTimeout(()=>c.abort(),7000);try{const u=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&addressdetails=1&namedetails=1&accept-language=pl,en,ru${pl?"&countrycodes=pl":""}&q=${encodeURIComponent(query)}`;const r=await fetch(u,{signal:c.signal,headers:{"Accept-Language":"pl,en,ru"}});return r.ok?r.json():[]}catch{return[]}finally{clearTimeout(t)}}
function officialName(h){const a=h.address||{};return h.name||h.namedetails?.name||a.attraction||a.museum||a.amenity||a.historic||""}
function officialAddress(h){const a=h.address||{};const line=[[a.road||a.pedestrian||a.square||a.neighbourhood,a.house_number].filter(Boolean).join(" "),[a.postcode,a.city||a.town||a.village||a.municipality].filter(Boolean).join(" ")].filter(Boolean).join(", ");return line||h.display_name||""}
function score(h,names,addresses){const hay=words(`${h.display_name||""} ${officialName(h)}`);let s=Number(h.importance||0)*5;if(h.address?.country_code==="pl")s+=100;names.forEach((n,i)=>{const w=words(n),m=w.filter(x=>hay.includes(x)).length;s+=m*(i?4:9);if(w.length&&m/w.length>=.6)s+=30});addresses.forEach(a=>s+=words(a).filter(x=>hay.includes(x)).length*4);return s}
async function reverse(lat,lng){const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=pl,en,ru&lat=${lat}&lon=${lng}`);if(!r.ok)throw Error("Не удалось определить адрес");const h=await r.json(),a=h.address||{};return{address:officialAddress(h),city:a.city||a.town||a.village||a.municipality||""}}
async function findCandidates(s){
  if(s.coords){const r=await reverse(s.coords.lat,s.coords.lng);return[{...s.coords,name:s.names[0]||r.address,address:r.address,city:r.city,score:999,country:"pl"}]}
  const goodNames=uniq(s.names.filter(x=>!bad(x))).slice(0,6),goodAddr=uniq(s.addresses.filter(x=>!NOISE.test(x))).slice(0,3),city=s.city[0]||"Warszawa";
  const queries=uniq([
    ...goodNames.flatMap(n=>[
      `${n}, ${city}, Polska`,
      goodAddr[0]?`${n}, ${goodAddr[0]}`:"",
      `${n}, Polska`,
    ]),
    ...goodAddr.map(a=>`${a}, Polska`),
  ]).slice(0,9);
  let hits=[];
  for(let i=0;i<queries.length;i++){
    const r=await search(queries[i],true);
    hits.push(...r);
    if(i<queries.length-1)await new Promise(x=>setTimeout(x,300));
  }
  if(!hits.length){
    for(let i=0;i<Math.min(4,queries.length);i++){
      const r=await search(queries[i],false);hits.push(...r);if(r.length)break;
    }
  }
  hits=[...new Map(hits.map(h=>[`${h.osm_type}-${h.osm_id}`,h])).values()];
  return hits.map(h=>{const a=h.address||{},base=score(h,goodNames,goodAddr),hay=words(h.display_name||"");let extra=0;
    goodAddr.forEach(addr=>{const aw=words(addr);const matched=aw.filter(x=>hay.includes(x)).length;if(aw.length&&matched/aw.length>=.5)extra+=80;});
    if((a.city||a.town||a.village||a.municipality||"").toLowerCase().includes(city.toLowerCase()))extra+=30;
    return{name:officialName(h)||goodNames[0]||h.display_name,address:officialAddress(h),city:a.city||a.town||a.village||a.municipality||"",lat:Number(h.lat),lng:Number(h.lon),score:base+extra,country:a.country_code||""};
  }).sort((a,b)=>b.score-a.score).slice(0,8);
}
async function imageBlob(file,start=0,height=1,max=1000){const b=await createImageBitmap(file),y=Math.round(b.height*start),sh=Math.max(1,Math.round(b.height*height)),scale=Math.min(1,max/b.width),c=document.createElement("canvas");c.width=Math.round(b.width*scale);c.height=Math.round(sh*scale);c.getContext("2d").drawImage(b,0,y,b.width,sh,0,0,c.width,c.height);b.close();return new Promise(r=>c.toBlob(r,"image/jpeg",.82))}
async function preview(file){const b=await createImageBitmap(file),scale=Math.min(1,480/b.width),c=document.createElement("canvas");c.width=Math.round(b.width*scale);c.height=Math.round(b.height*scale);c.getContext("2d").drawImage(b,0,0,c.width,c.height);b.close();return c.toDataURL("image/jpeg",.58)}

export default function App(){
  const [dark,setDark]=useState(false),[tab,setTab]=useState("map"),[places,setPlaces]=useState(()=>{try{return (JSON.parse(localStorage.getItem("places-data"))||seedPlaces).map(p=>({...p,isFood:p.isFood??p.category==="food"}))}catch{return seedPlaces}}),[selected,setSelected]=useState(null),[editOpen,setEditOpen]=useState(false),[addOpen,setAddOpen]=useState(false),[manualOpen,setManualOpen]=useState(false),[processing,setProcessing]=useState(false),[stage,setStage]=useState(""),[progress,setProgress]=useState(0),[error,setError]=useState(""),[candidates,setCandidates]=useState([]),[candidateOpen,setCandidateOpen]=useState(false),[pending,setPending]=useState(null),[searchText,setSearchText]=useState(""),[statusFilter,setStatusFilter]=useState("all"),[foodOnly,setFoodOnly]=useState(false),[edit,setEdit]=useState({}),[manual,setManual]=useState({name:"",address:"",note:"",status:"want",isFood:false,lat:0,lng:0});
  const fileRef=useRef(null),cameraRef=useRef(null),importRef=useRef(null),mapRef=useRef(null);
  useEffect(()=>{try{localStorage.setItem("places-data",JSON.stringify(places))}catch{localStorage.setItem("places-data",JSON.stringify(places.map(({screenshot,...p})=>p))) }},[places]);
  const filtered=useMemo(()=>places.filter(p=>(statusFilter==="all"||p.status===statusFilter)&&(!foodOnly||p.isFood)&&`${p.name} ${p.address} ${p.note}`.toLowerCase().includes(searchText.toLowerCase())),[places,statusFilter,foodOnly,searchText]);
  const pal=dark?{app:"#090b16",chrome:"#111421",panel:"#151927",glass:"#151927f5",text:"#f7f8ff",muted:"#aab0c2",line:"#ffffff1a",soft:"#ffffff12"}:{app:"#eef1f7",chrome:"#fff",panel:"#fff",glass:"#fffffff5",text:"#182033",muted:"#667085",line:"#252f481c",soft:"#f2f4f8"};
  const closeAll=()=>{setEditOpen(false);setAddOpen(false);setManualOpen(false);setCandidateOpen(false)};
  const switchTab=t=>{closeAll();setSelected(null);setTab(t)};
  const openEdit=p=>{setSelected(p);setEdit({...p});setEditOpen(true)};
  const saveEdit=()=>{setPlaces(a=>a.map(p=>p.id===selected.id?{...p,...edit}:p));setSelected({...selected,...edit});setEditOpen(false)};
  const del=id=>{setPlaces(a=>a.filter(p=>p.id!==id));if(selected?.id===id)setSelected(null)};
  const route=()=>selected&&window.open(`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`,"_blank");
  const useCandidate=c=>{const p={id:Date.now(),name:c.name,address:c.address,city:c.city,note:"",status:pending.status||"want",isFood:pending.isFood,lat:c.lat,lng:c.lng,screenshot:pending.screenshot};setPlaces(a=>[...a,p]);setSelected(p);setCandidateOpen(false);setPending(null);setTab("map")};
  const processImage=async e=>{const file=e.target.files?.[0];if(!file)return;setProcessing(true);setError("");setProgress(0);try{setStage("Распознаю название и адрес");const pv=await preview(file),main=await imageBlob(file,0,1,1000),result=await Tesseract.recognize(main,"eng+pol+rus",{logger:m=>m.status==="recognizing text"&&setProgress(Math.round((m.progress||0)*100))});let sig=signals(result.data.text);if(!sig.names.length||(!sig.addresses.length&&!sig.coords)){setStage("Уточняю данные");const top=await imageBlob(file,0,.42,1000),bottom=await imageBlob(file,.55,.45,1000);const a=await Tesseract.recognize(top,"eng+pol+rus"),b=await Tesseract.recognize(bottom,"eng+pol+rus");sig=signals(`${result.data.text}\n${a.data.text}\n${b.data.text}`)}if(!sig.names.length&&!sig.addresses.length&&!sig.coords)throw Error("Не удалось распознать данные");setStage("Ищу варианты в Польше");const list=await findCandidates(sig);if(!list.length)throw Error("Место не найдено");setPending({screenshot:pv,isFood:sig.isFood,status:"want"});setCandidates(list);setCandidateOpen(true);setAddOpen(false)}catch(x){setError(x.message||"Ошибка распознавания")}finally{setProcessing(false);e.target.value=""}};
  const longPress=async ll=>{setManual({name:"",address:"",note:"",status:"want",isFood:false,lat:ll.lat,lng:ll.lng});setManualOpen(true);try{const r=await reverse(ll.lat,ll.lng);setManual(m=>({...m,address:r.address,city:r.city}))}catch{}};
  const saveManual=()=>{if(!manual.name.trim())return;const p={...manual,id:Date.now()};setPlaces(a=>[...a,p]);setSelected(p);setManualOpen(false)};
  const locate=()=>navigator.geolocation?.getCurrentPosition(({coords})=>{setSelected(null);mapRef.current?.flyTo([coords.latitude,coords.longitude],16)});
  const exportData=()=>{const blob=new Blob([JSON.stringify({places},null,2)],{type:"application/json"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download="places.json";a.click();URL.revokeObjectURL(u)};
  const importData=async e=>{try{const x=JSON.parse(await e.target.files[0].text()),a=Array.isArray(x)?x:x.places;if(Array.isArray(a))setPlaces(a.map(p=>({...p,isFood:p.isFood??p.category==="food"})))}catch{}e.target.value=""};
  const Chip=({on,click,children})=><button onClick={click} className="h-9 whitespace-nowrap rounded-xl px-3 text-sm font-semibold" style={on?{background:gradient,color:"white"}:{background:pal.soft,color:pal.muted}}>{children}</button>;
  const hiddenNav=editOpen||addOpen||manualOpen||candidateOpen;

  return <div className="h-[100dvh] w-full overflow-hidden" style={{background:pal.app,color:pal.text,fontFamily:"Inter,system-ui,sans-serif"}}><div className={`mx-auto grid h-full max-w-6xl overflow-hidden sm:h-[calc(100dvh-24px)] sm:translate-y-3 sm:rounded-[28px] ${hiddenNav?"grid-rows-[60px_minmax(0,1fr)]":"grid-rows-[60px_minmax(0,1fr)_64px]"}`} style={{background:pal.app,border:`1px solid ${pal.line}`}}>
    <header className="flex items-center justify-between px-3 sm:px-5" style={{background:pal.chrome,borderBottom:`1px solid ${pal.line}`}}><div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{background:gradient}}><MapPin size={18} fill="currentColor"/></div><h1 className="text-xl font-bold">MyPins</h1></div><div className="flex gap-2"><input ref={importRef} type="file" accept=".json" className="hidden" onChange={importData}/><button onClick={()=>importRef.current?.click()} className="grid h-10 w-10 place-items-center rounded-xl" style={{background:pal.soft}}><FileUp size={18}/></button><button onClick={exportData} className="grid h-10 w-10 place-items-center rounded-xl" style={{background:pal.soft}}><Download size={18}/></button><button onClick={()=>setDark(!dark)} className="grid h-10 w-10 place-items-center rounded-xl" style={{background:pal.soft}}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button><button onClick={()=>setAddOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{background:gradient}}><Plus size={19}/></button></div></header>
    <main className="relative min-h-0 overflow-hidden">{tab==="map"?<div className="relative h-full"><MapContainer ref={mapRef} center={center} zoom={12} zoomControl={false} className="h-full w-full"><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.de/{z}/{x}/{y}.png"/><ZoomControl position="bottomright"/><Markers places={filtered} onSelect={p=>setSelected(p)}/><Fly place={selected}/><LongPress onLongPress={longPress}/></MapContainer><div className="absolute left-3 right-16 top-3 z-[700] flex gap-2 overflow-x-auto rounded-2xl p-2" style={{background:pal.glass}}><Chip on={statusFilter==="all"} click={()=>setStatusFilter("all")}>Все</Chip><Chip on={statusFilter==="want"} click={()=>setStatusFilter("want")}>Хочу</Chip><Chip on={statusFilter==="visited"} click={()=>setStatusFilter("visited")}>Была</Chip><Chip on={foodOnly} click={()=>setFoodOnly(!foodOnly)}>Еда</Chip></div><button onClick={locate} className="absolute right-3 top-3 z-[750] grid h-11 w-11 place-items-center rounded-xl" style={{background:pal.glass}}><LocateFixed size={19}/></button>{selected&&<section className="absolute inset-x-3 bottom-3 z-[750] rounded-[20px] p-4 sm:left-4 sm:right-auto sm:w-[390px]" style={{background:pal.glass,border:`1px solid ${pal.line}`}}><div className="flex justify-between"><b style={{color:selected.status==="visited"?"#139c7d":"#4778ee"}}>{selected.status==="visited"?"Была":"Хочу"}</b><div className="flex gap-1"><button onClick={()=>openEdit(selected)} className="text-violet-600">Подробнее <ChevronRight className="inline" size={16}/></button><button onClick={()=>setSelected(null)}><X size={17}/></button></div></div><h2 className="mt-3 text-[22px] font-bold">{selected.name}</h2><p style={{color:pal.muted}}>{selected.address}</p><button onClick={route} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-white" style={{background:gradient}}><Navigation size={18}/>Маршрут</button></section>}</div>:<div className="h-full overflow-y-auto p-4"><div className="mx-auto max-w-4xl"><h2 className="text-2xl font-bold">Места</h2><div className="mt-3 flex items-center gap-2 rounded-xl px-3" style={{background:pal.panel}}><Search size={18}/><input value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder="Поиск" className="h-11 w-full bg-transparent outline-none"/></div><div className="mt-3 flex gap-2 overflow-auto"><Chip on={statusFilter==="all"} click={()=>setStatusFilter("all")}>Все</Chip><Chip on={statusFilter==="want"} click={()=>setStatusFilter("want")}>Хочу</Chip><Chip on={statusFilter==="visited"} click={()=>setStatusFilter("visited")}>Была</Chip><Chip on={foodOnly} click={()=>setFoodOnly(!foodOnly)}>Еда</Chip></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{filtered.map(p=><div key={p.id} className="flex gap-3 rounded-2xl p-4" style={{background:pal.panel}}><button onClick={()=>openEdit(p)} className="flex min-w-0 flex-1 gap-3 text-left">{p.screenshot?<img src={p.screenshot} className="h-16 w-16 rounded-xl object-cover"/>:<MapPin style={{color:p.isFood?"#f28c28":p.status==="visited"?"#139c7d":"#4778ee"}}/>}<div><b>{p.name}</b><p className="text-sm" style={{color:pal.muted}}>{p.address}</p></div></button><button onClick={()=>del(p.id)} className="text-red-500"><Trash2 size={18}/></button></div>)}</div></div></div>}</main>
    {!hiddenNav&&<nav className="relative z-[5000] grid grid-cols-2 gap-2 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2" style={{background:pal.chrome,borderTop:`1px solid ${pal.line}`}}><button onPointerUp={e=>{e.preventDefault();switchTab("map")}} className="h-12 rounded-xl font-semibold" style={tab==="map"?{background:gradient,color:"white"}:{color:pal.muted}}><MapIcon className="mr-2 inline" size={19}/>Карта</button><button onPointerUp={e=>{e.preventDefault();switchTab("places")}} className="h-12 rounded-xl font-semibold" style={tab==="places"?{background:gradient,color:"white"}:{color:pal.muted}}><Bookmark className="mr-2 inline" size={19}/>Места</button></nav>}
  </div>
  {editOpen&&selected&&<Modal pal={pal} close={()=>setEditOpen(false)} title="Редактировать место"><PlaceForm data={edit} setData={setEdit} pal={pal}/><div className="mt-3 flex items-center justify-between rounded-xl p-3" style={{background:pal.soft}}><span>{Number(selected.lat).toFixed(6)}, {Number(selected.lng).toFixed(6)}</span><button onClick={()=>navigator.clipboard?.writeText(`${selected.lat}, ${selected.lng}`)}><Copy size={17}/></button></div><div className="mt-4 grid grid-cols-[1fr_auto] gap-2"><Primary click={saveEdit}><Save size={18}/>Сохранить</Primary><button onClick={()=>{del(selected.id);setEditOpen(false)}} className="grid h-12 w-12 place-items-center rounded-xl text-red-500" style={{background:pal.soft}}><Trash2/></button></div></Modal>}
  {manualOpen&&<Modal pal={pal} close={()=>setManualOpen(false)} title="Новое место"><PlaceForm data={manual} setData={setManual} pal={pal}/><Primary click={saveManual} disabled={!manual.name.trim()}>Сохранить место</Primary></Modal>}
  {addOpen&&<Modal pal={pal} close={()=>!processing&&setAddOpen(false)} title="Добавить место"><input ref={fileRef} type="file" accept="image/*" onChange={processImage} className="hidden"/><input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={processImage} className="hidden"/>{processing?<div className="flex h-44 w-full flex-col items-center justify-center gap-3 rounded-2xl" style={{background:pal.soft}}><LoaderCircle className="animate-spin"/><b>{stage}</b><span>{progress}%</span></div>:<div className="grid grid-cols-2 gap-3"><button onClick={()=>fileRef.current?.click()} className="flex h-40 flex-col items-center justify-center gap-3 rounded-2xl" style={{background:pal.soft}}><Upload size={30}/><b className="text-center">Выбрать скриншот</b></button><button onClick={()=>cameraRef.current?.click()} className="flex h-40 flex-col items-center justify-center gap-3 rounded-2xl" style={{background:pal.soft}}><Camera size={30}/><b className="text-center">Сделать фото</b></button></div>}{error&&<p className="mt-3 rounded-xl bg-red-50 p-3 text-red-600">{error}</p>}</Modal>}
  {candidateOpen&&<Modal pal={pal} close={()=>setCandidateOpen(false)} title="Выберите найденное место"><p className="mb-3 text-sm" style={{color:pal.muted}}>Сначала показаны наиболее подходящие варианты в Польше.</p><div className="grid gap-2">{candidates.map((c,i)=><button key={`${c.lat}-${c.lng}-${i}`} onClick={()=>useCandidate(c)} className="rounded-xl p-3 text-left" style={{background:i===0?"#ede9fe":pal.soft,border:i===0?"2px solid #7c3aed":"1px solid transparent"}}><div className="flex justify-between gap-2"><b>{c.name}</b>{i===0&&<Check size={18} className="text-violet-600"/>}</div><p className="mt-1 text-sm" style={{color:pal.muted}}>{c.address}</p>{c.country==="pl"&&<span className="mt-1 inline-block text-xs font-bold text-violet-600">Польша</span>}</button>)}</div></Modal>}
  </div>
}

function Modal({pal,close,title,children}){return <div className="fixed inset-0 z-[6000] grid place-items-end bg-black/60 sm:place-items-center sm:p-4" onMouseDown={close}><div className="max-h-[100dvh] w-full max-w-lg overflow-y-auto rounded-t-[26px] p-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:rounded-[26px]" style={{background:pal.panel}} onMouseDown={e=>e.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-bold">{title}</h3><button onClick={close}><X/></button></div>{children}</div></div>}
function Primary({click,disabled,children}){return <button disabled={disabled} onClick={click} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold text-white disabled:opacity-50" style={{background:gradient}}>{children}</button>}
function PlaceForm({data,setData,pal}){return <div className="grid gap-3"><label><b>Название</b><input value={data.name||""} onChange={e=>setData({...data,name:e.target.value})} className="mt-2 h-11 w-full rounded-xl px-3" style={{background:pal.soft}}/></label><label><b>Адрес</b><input value={data.address||""} onChange={e=>setData({...data,address:e.target.value})} className="mt-2 h-11 w-full rounded-xl px-3" style={{background:pal.soft}}/></label><div><b>Метка</b><button onClick={()=>setData({...data,isFood:!data.isFood})} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl font-semibold" style={data.isFood?{background:"#f28c28",color:"white"}:{background:pal.soft,color:pal.muted}}><Utensils size={18}/>Еда</button></div><div><b>Статус</b><div className="mt-2 grid grid-cols-2 gap-2"><button onClick={()=>setData({...data,status:"want"})} className="h-11 rounded-xl" style={data.status!=="visited"?{background:gradient,color:"white"}:{background:pal.soft}}>Хочу</button><button onClick={()=>setData({...data,status:"visited"})} className="h-11 rounded-xl" style={data.status==="visited"?{background:gradient,color:"white"}:{background:pal.soft}}>Была</button></div></div><label><b>Заметка</b><textarea value={data.note||""} onChange={e=>setData({...data,note:e.target.value})} className="mt-2 min-h-24 w-full rounded-xl p-3" style={{background:pal.soft}}/></label></div>}
