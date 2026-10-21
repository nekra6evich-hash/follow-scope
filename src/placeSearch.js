const FOOD=/(kebab|restaurant|restauracja|cafe|café|coffee|bar|pizza|bistro|bakery|piekarnia|grill|sushi|burger|ramen|food|jedzenie|lody|cukiernia|pub|tea|herbaciarnia)/i;
const NOISE=/(реклама|рекламодатель|getyourguide|входные билеты|цена|advert|sponsored|обзор|отзывы|информация|проложить маршрут|сохранить|поделиться|подписаться|смотреть снова|телефон|website|menu|photos?|лайк|комментар|reels?|followers?|following|просмотр|перевод|więcej|obserwuj|polubień|godziny otwarcia)/i;
const GENERIC=new Set(["muzeum","museum","park","villa","hotel","restauracja","restaurant","cafe","coffee","kebab","skit","projekt","centrum","warszawa","warsaw","polska","poland","miejsce","zabytek"]);
const BRANDS={ald1:"ALDI",aldl:"ALDI",aidi:"ALDI",aldi:"ALDI",l1dl:"LIDL",lid1:"LIDL",lidl:"LIDL",bubella:"Bubbella",bubbella:"Bubbella",rostkebab:"Rost Kebab"};
const ENTITY_RULES=[
 {re:/варшавск.*барбакан|барбакан.*варшав|barbakan warszaw/i,names:["Barbakan Warszawski"],kind:"landmark",city:"Warszawa"},
 {re:/музей.*варшавск.*восстан|варшавск.*восстан|muzeum powstania warszaw/i,names:["Muzeum Powstania Warszawskiego"],kind:"landmark",city:"Warszawa"},
 {re:/музей.*польск.*евре|muzeum historii zydow|polin/i,names:["Muzeum Historii Żydów Polskich POLIN","POLIN"],kind:"landmark",city:"Warszawa"},
 {re:/парк.*фонтан|multimedialn.*fontann/i,names:["Multimedialny Park Fontann"],kind:"landmark",city:"Warszawa"},
 {re:/muzeum zabawek.*karpacz|музей игрушек.*карпач/i,names:["Muzeum Zabawek w Karpaczu"],kind:"landmark",city:"Karpacz"},
 {re:/villa la fleur/i,names:["Villa la Fleur"],kind:"landmark",city:"Konstancin-Jeziorna"},
 {re:/villa brzozow.*gaj/i,names:["Villa Brzozowy Gaj"],kind:"lodging",city:""},
 {re:/skit.*odrynk/i,names:["Skit w Odrynkach","Skit Świętych Antoniego i Teodozjusza Pieczerskich w Odrynkach"],kind:"landmark",city:"Odrynki"},
 {re:/projekt riese|góry sowie|gory sowie/i,names:["Projekt Riese Góry Sowie","Osówka Projekt Riese","Włodarz Projekt Riese","Sztolnie Walimskie Rzeczka"],kind:"group",city:""},
 {re:/\bbubb?ella\b/i,names:["Bubbella"],kind:"food",city:""},
 {re:/\brost\s*kebab\b/i,names:["Rost Kebab"],kind:"food",city:""},
 {re:/\b(?:aldi|ald1|aldl|aidi)\b/i,names:["ALDI"],kind:"brand",city:""},
 {re:/\b(?:lidl|l1dl|lid1)\b/i,names:["LIDL"],kind:"brand",city:""},
];
const uniq=a=>[...new Set(a.filter(Boolean).map(x=>String(x).trim()).filter(Boolean))];
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^0-9a-ząćęłńóśźżа-яё ]/gi," ").replace(/\s+/g," ").trim();
const tokens=s=>norm(s).split(" ").filter(x=>x.length>1);
const keyTokens=s=>tokens(s).filter(x=>!GENERIC.has(x)&&!/^[0-9]+$/.test(x));
const clean=s=>String(s||"").replace(/[©®™|]/g," ").replace(/\s+/g," ").trim();
function charDice(a,b){a=norm(a).replace(/\s/g,""),b=norm(b).replace(/\s/g,"");if(!a||!b)return 0;if(a===b)return 1;const grams=x=>{const r=[];for(let i=0;i<x.length-1;i++)r.push(x.slice(i,i+2));return r};const A=grams(a),B=grams(b),used=new Set();let hit=0;for(const g of A){const j=B.findIndex((x,i)=>x===g&&!used.has(i));if(j>=0){used.add(j);hit++}}return 2*hit/Math.max(1,A.length+B.length)}
function similarity(a,b){const A=tokens(a),B=tokens(b);if(!A.length||!B.length)return 0;const tm=A.filter(x=>B.some(y=>x===y||x.startsWith(y)||y.startsWith(x)||charDice(x,y)>.72)).length/A.length;return Math.max(tm,charDice(a,b)*.82)}
function normalizeName(name){const compact=norm(name).replace(/\s/g,"");return BRANDS[compact]||String(name||"").trim()}
function normalizeCity(text){const n=norm(text),forms=[["karpaczu","Karpacz"],["karpacz","Karpacz"],["warszawie","Warszawa"],["warszawa","Warszawa"],["warsaw","Warszawa"],["krakowie","Kraków"],["gdansku","Gdańsk"],["wroclawiu","Wrocław"],["poznaniu","Poznań"],["odrynkach","Odrynki"],["odrynki","Odrynki"],["konstancin jeziorna","Konstancin-Jeziorna"]];for(const [from,to] of forms)if(n.includes(from))return to;return ""}
function matchedRule(text){return ENTITY_RULES.find(x=>x.re.test(text))||null}
export function extractSignals(text){
 const raw=String(text||""),lines=uniq(raw.split(/\r?\n/).map(clean).filter(x=>x.length>1)),rule=matchedRule(raw);
 const postal=lines.filter(x=>/\b\d{2}-\d{3}\b/.test(x));
 const streetRe=/[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźżА-Яа-яЁё]+(?:\s+[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźżА-Яа-яЁё.-]+)*\s+\d+[A-Za-z]?(?:\/[A-Za-z0-9]+)?/;
 const streets=lines.filter(x=>!NOISE.test(x)&&(streetRe.test(x)||/\b(ul\.?|aleja|al\.?|plac|pl\.?|street|road|avenue)\b/i.test(x)));
 const addresses=uniq([...streets,...streets.filter(st=>!/[0-9]{2}-[0-9]{3}/.test(st)).flatMap(st=>postal.map(pc=>`${st}, ${pc}`)),...postal]);
 const scored=lines.map((line,index)=>{const letters=(line.match(/[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźżА-Яа-яЁё]/g)||[]).length;let score=0;if(letters>=3&&!NOISE.test(line))score+=18;if(index<24)score+=4;if(line.length>=3&&line.length<=72)score+=6;if(/^[A-ZĄĆĘŁŃÓŚŹŻ0-9 &.'-]{3,28}$/.test(line))score+=12;if(matchedRule(line))score+=55;if(NOISE.test(line)||/https?:|\d+\s*(zł|pln|€|\$)/i.test(line)||streetRe.test(line)||/\b\d{2}-\d{3}\b/.test(line))score-=60;return{line:normalizeName(line),score}}).filter(x=>x.score>3).sort((a,b)=>b.score-a.score);
 const names=uniq([...(rule?.names||[]),...scored.slice(0,10).map(x=>x.line)]);
 const cities=uniq([rule?.city,...lines.map(normalizeCity)]).filter(Boolean);
 const c=raw.match(/(-?\d{1,2}[.,]\d{4,})\s*[,; ]\s*(-?\d{1,3}[.,]\d{4,})/);
 return{names,addresses,city:cities[0]||"",coords:c?{lat:Number(c[1].replace(",",".")),lng:Number(c[2].replace(",","."))}:null,isFood:FOOD.test(raw),raw,rule};
}
const FETCH_CACHE=new Map();
async function fetchJson(url,timeout=9000){if(FETCH_CACHE.has(url))return FETCH_CACHE.get(url);const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,headers:{"Accept-Language":"pl,en,ru"}});if(!r.ok)return null;const d=await r.json();FETCH_CACHE.set(url,d);return d}catch{return null}finally{clearTimeout(t)}}
function officialAddress(h){const a=h.address||{};return[[a.road||a.pedestrian||a.square||a.neighbourhood,a.house_number].filter(Boolean).join(" "),[a.postcode,a.city||a.town||a.village||a.municipality].filter(Boolean).join(" ")].filter(Boolean).join(", ")||h.display_name||""}
function officialName(h){const a=h.address||{};return h.name||h.namedetails?.name||a.attraction||a.museum||a.amenity||a.historic||""}
export async function reverse(lat,lng){const h=await fetchJson(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=pl,en,ru&lat=${lat}&lon=${lng}`);if(!h)throw Error("Не удалось определить адрес");const a=h.address||{};return{address:officialAddress(h),city:a.city||a.town||a.village||a.municipality||""}}
async function photon(q,poland){const p=new URLSearchParams({q,lang:"pl",limit:"15"});if(poland)p.append("countrycode","PL");const d=await fetchJson(`https://photon.komoot.io/api/?${p}`);return d?.features||[]}
async function nominatim(q,poland){const p=new URLSearchParams({format:"jsonv2",limit:"8",addressdetails:"1",namedetails:"1",q});if(poland)p.set("countrycodes","pl");return await fetchJson(`https://nominatim.openstreetmap.org/search?${p}`)||[]}
async function wiki(q,lang){const p=new URLSearchParams({action:"query",generator:"search",gsrsearch:q,gsrlimit:"6",prop:"coordinates|description",format:"json",origin:"*"});const d=await fetchJson(`https://${lang}.wikipedia.org/w/api.php?${p}`);return Object.values(d?.query?.pages||{}).filter(x=>x.coordinates?.[0])}
function kind(name,rule){if(rule?.kind)return rule.kind;const n=norm(name);if(/aldi|lidl|biedronka|zabka|carrefour/.test(n))return"brand";if(/kebab|cafe|coffee|restaur|bubbella|rost/.test(n))return"food";if(/villa|hotel|apart/.test(n))return"lodging";if(/muzeum|museum|barbakan|park|fontann|zamek|palac|pomnik|skit|riese/.test(n))return"landmark";return"other"}
function resultType(p){return norm([p.osm_value,p.type,p.osm_key].filter(Boolean).join(" "))}
function compatible(type,target){const t=norm(type);if(target==="lodging"&&/museum|muzeum|memorial/.test(t))return false;if((target==="food"||target==="brand")&&/museum|historic|memorial|monument/.test(t))return false;return true}
function nameStrength(query,name,address){const base=similarity(query,`${name} ${address}`),keys=keyTokens(query),hay=norm(`${name} ${address}`),required=keys.length?keys.filter(x=>hay.includes(x)||tokens(hay).some(y=>charDice(x,y)>.75)).length/keys.length:base;return Math.max(base,required*.92)}
function photonCandidate(f,s,polandPass){const p=f.properties||{},c=f.geometry?.coordinates||[],name=p.name||p.street||s.names[0]||"Место",address=[[p.street,p.housenumber].filter(Boolean).join(" "),[p.postcode,p.city||p.town||p.village||p.county].filter(Boolean).join(" ")].filter(Boolean).join(", ")||[name,p.city,p.country].filter(Boolean).join(", "),city=p.city||p.town||p.village||p.county||"",nm=Math.max(...s.names.map(n=>nameStrength(n,name,address)),0),am=Math.max(0,...s.addresses.map(a=>similarity(a,address))),cm=s.city?similarity(s.city,city):0,country=String(p.countrycode||"").toLowerCase();let score=nm*300+am*230+cm*100+(country==="pl"?50:0)+(polandPass?8:0);return{name,address,city,lat:Number(c[1]),lng:Number(c[0]),score,country,type:resultType(p),nameMatch:nm,addressMatch:am}}
function strictEnough(x,s,target){if(!Number.isFinite(x.lat)||!Number.isFinite(x.lng)||!compatible(x.type,target))return false;if(s.city&&x.city&&similarity(s.city,x.city)<.55)return false;const required=target==="brand"?.46:target==="group"?.38:.52;if(x.nameMatch>=required)return true;if(s.addresses.length&&x.addressMatch>=.58)return true;return false}
async function addressFallback(s){for(const raw of s.addresses.slice(0,3)){const variants=uniq([raw,raw.replace(/\/\w+/g,""),[raw,s.city].filter(Boolean).join(", ")]);for(const q of variants){for(const poland of [true,false]){const hits=await nominatim(q,poland);if(hits.length){const h=hits[0],a=h.address||{},address=officialAddress(h);return{name:s.names[0]||officialName(h)||"Место",address,city:a.city||a.town||a.village||a.municipality||s.city||"",lat:Number(h.lat),lng:Number(h.lon),score:220,country:a.country_code||"",type:"address",nameMatch:1,addressMatch:1}}}}return null}}
export async function findCandidates(s){
 if(s.coords){const r=await reverse(s.coords.lat,s.coords.lng).catch(()=>({address:"",city:s.city}));return[{name:s.names[0]||"Место",address:r.address,city:r.city,lat:s.coords.lat,lng:s.coords.lng,score:999,country:"",type:"coordinates",nameMatch:1,addressMatch:1}]}
 const target=kind(s.names[0]||"",s.rule),names=uniq([...(s.rule?.names||[]),...s.names]).slice(0,target==="group"?6:4),queries=uniq(names.flatMap(n=>s.city?[`${n}, ${s.city}`,n]:[n]));let items=[];
 for(const poland of [true,false]){const batch=(await Promise.all(queries.slice(0,6).map(q=>photon(q,poland)))).flat().map(f=>photonCandidate(f,{...s,names},poland)).filter(x=>strictEnough(x,{...s,names},target));items.push(...batch);if(batch.some(x=>x.score>=190))break}
 if(target==="landmark"||target==="group")for(const lang of ["pl","ru","en"]){const pages=(await Promise.all(names.slice(0,4).map(n=>wiki(n,lang)))).flat();for(const p of pages){const label=`${p.title} ${p.description||""}`,nm=Math.max(...names.map(n=>nameStrength(n,p.title,label)),0);if(nm>=(target==="group"?.38:.58))items.push({name:p.title,address:p.description||"",city:s.city,lat:p.coordinates[0].lat,lng:p.coordinates[0].lon,score:nm*290+70,country:"",type:"landmark",nameMatch:nm,addressMatch:0})}}
 if(!items.some(x=>x.score>=175)&&names[0])for(const poland of [true,false]){const q=[names[0],s.city].filter(Boolean).join(", ");for(const h of await nominatim(q,poland)){const a=h.address||{},name=officialName(h)||names[0],address=officialAddress(h),city=a.city||a.town||a.village||a.municipality||"",nm=Math.max(...names.map(n=>nameStrength(n,name,address)),0),am=Math.max(0,...s.addresses.map(x=>similarity(x,address))),candidate={name,address,city,lat:Number(h.lat),lng:Number(h.lon),score:nm*300+am*230+(String(a.country_code||"").toLowerCase()==="pl"?50:0),country:a.country_code||"",type:h.type||h.class||"",nameMatch:nm,addressMatch:am};if(strictEnough(candidate,{...s,names},target))items.push(candidate)}if(items.some(x=>x.score>=175))break}
 const fallback=await addressFallback({...s,names});if(fallback)items.push(fallback);
 return [...new Map(items.map(x=>[`${x.lat.toFixed(5)}|${x.lng.toFixed(5)}`,x])).values()].sort((a,b)=>b.score-a.score).slice(0,target==="group"?8:6)
}
