const FOOD = /\b(kebab|restaurant|restauracja|cafe|café|coffee|bar|pizza|bistro|bakery|piekarnia|grill|sushi|burger|ramen|food|jedzenie|lody|cukiernia|cukierniczy|pub|tea|herbaciarnia|fit\s*cake)\b/i;

const NOISE = /(реклама|рекламодатель|getyourguide|входные билеты|advert|sponsored|обзор|отзывы|информация|проложить маршрут|сохранить|поделиться|подписаться|смотреть снова|телефон|website|menu|photos?|лайк|комментар|reels?|followers?|following|просмотр|перевод|więcej|obserwuj|polubień|godziny otwarcia|open now|closed|закрыто|откроется|круглосуточно|посещение магазина|самовывоз|магазин сувениров|можно с собаками|я владелец компании|ваша история карт|скачать приложение)/i;
const NAV_UI = /^(обзор|билеты|отзывы|информация|меню|overview|reviews?|information|tickets?|route|save|share|photos?)$/i;
const CATEGORY = /(достопримечательност|историческ.*памятник|природн.*заповедник|музей истории|супермаркет|кондитерск.*магазин|морской музей|museum|nature reserve|historic|tourist attraction)/i;
const GENERIC = new Set(["muzeum","museum","park","villa","hotel","restauracja","restaurant","cafe","coffee","kebab","skit","projekt","centrum","warszawa","warsaw","polska","poland","miejsce","zabytek","reserve","nature"]);
const BRANDS = {ald1:"ALDI",aldl:"ALDI",aidi:"ALDI",aldi:"ALDI",l1dl:"LIDL",lid1:"LIDL",lidl:"LIDL",bubella:"Bubbella",bubbella:"Bubbella",rostkebab:"Rost Kebab",fitcake:"Fit Cake"};

const ENTITY_RULES = [
  {re:/museum of martyrdom of polish vill|mauzoleum martyrologii wsi polsk|michni[oó]w/i,names:["Mauzoleum Martyrologii Wsi Polskich w Michniowie","Museum of Martyrdom of Polish Village Michniów"],kind:"landmark",city:"Michniów"},
  {re:/kadzielnia nature reserve|rezerwat przyrody kadzielnia|\bkadzielnia\b/i,names:["Rezerwat przyrody Kadzielnia","Kadzielnia Nature Reserve"],kind:"landmark",city:"Kielce"},
  {re:/варшавск.*цитадел|cytadela warszaw/i,names:["Cytadela Warszawska"],kind:"landmark",city:"Warszawa"},
  {re:/варшавск.*барбакан|барбакан.*варшав|barbakan warszaw/i,names:["Barbakan Warszawski"],kind:"landmark",city:"Warszawa"},
  {re:/музей.*варшавск.*восстан|варшавск.*восстан|muzeum powstania warszaw/i,names:["Muzeum Powstania Warszawskiego"],kind:"landmark",city:"Warszawa"},
  {re:/музей.*польск.*евре|muzeum historii (?:ż|z)yd[oó]w|polin/i,names:["Muzeum Historii Żydów Polskich POLIN","POLIN"],kind:"landmark",city:"Warszawa"},
  {re:/парк.*фонтан|multimedialn.*fontann/i,names:["Multimedialny Park Fontann"],kind:"landmark",city:"Warszawa"},
  {re:/muzeum zabawek.*karpacz|музей игрушек.*карпач/i,names:["Muzeum Zabawek w Karpaczu"],kind:"landmark",city:"Karpacz"},
  {re:/villa la fleur/i,names:["Villa la Fleur"],kind:"landmark",city:"Konstancin-Jeziorna"},
  {re:/villa brzozow.*gaj/i,names:["Villa Brzozowy Gaj"],kind:"lodging",city:""},
  {re:/skit.*odrynk/i,names:["Skit w Odrynkach","Skit Świętych Antoniego i Teodozjusza Pieczerskich w Odrynkach"],kind:"landmark",city:"Odrynki"},
  {re:/projekt riese|g[oó]ry sowie/i,names:["Projekt Riese Góry Sowie","Osówka Projekt Riese","Włodarz Projekt Riese","Sztolnie Walimskie Rzeczka"],kind:"group",city:""},
  {re:/\bmorskie oko\b/i,names:["Morskie Oko"],kind:"landmark",city:"Zakopane"},
  {re:/czarny staw (?:under|pod) rys/i,names:["Czarny Staw pod Rysami"],kind:"landmark",city:"Zakopane"},
  {re:/дар поморья|dar pomorza/i,names:["Dar Pomorza"],kind:"landmark",city:"Gdynia"},
  {re:/emigration museum gdynia|muzeum emigracji w gdyni/i,names:["Muzeum Emigracji w Gdyni","Emigration Museum Gdynia"],kind:"landmark",city:"Gdynia"},
  {re:/\bfit\s*cake\b/i,names:["Fit Cake"],kind:"food",city:"Warszawa"},
  {re:/\bbubb?ella\b/i,names:["Bubbella"],kind:"food",city:"Warszawa"},
  {re:/\brost\s*kebab\b/i,names:["Rost Kebab"],kind:"food",city:"Warszawa"},
  {re:/\b(?:aldi|ald1|aldl|aidi)\b/i,names:["ALDI"],kind:"brand",city:""},
  {re:/\b(?:lidl|l1dl|lid1)\b/i,names:["LIDL"],kind:"brand",city:""},
];

const uniq = values => [...new Set(values.filter(Boolean).map(v=>String(v).trim()).filter(Boolean))];
const norm = value => String(value||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^0-9a-ząćęłńóśźżа-яё /+.'-]/gi," ").replace(/\s+/g," ").trim();
const tokens = value => norm(value).split(" ").filter(v=>v.length>1);
const keyTokens = value => tokens(value).filter(v=>!GENERIC.has(v)&&!/^\d+$/.test(v));
const clean = value => String(value||"").replace(/[©®™|]/g," ").replace(/\s+/g," ").trim();
const normalizeName = value => BRANDS[norm(value).replace(/\s/g,"")] || clean(value);

function charDice(a,b){
  a=norm(a).replace(/\s/g,""); b=norm(b).replace(/\s/g,"");
  if(!a||!b) return 0; if(a===b) return 1;
  const grams=x=>{const out=[];for(let i=0;i<x.length-1;i++)out.push(x.slice(i,i+2));return out};
  const A=grams(a), B=grams(b), used=new Set(); let hit=0;
  for(const g of A){const index=B.findIndex((x,i)=>x===g&&!used.has(i));if(index>=0){used.add(index);hit++}}
  return 2*hit/Math.max(1,A.length+B.length);
}
function similarity(a,b){
  const A=tokens(a), B=tokens(b); if(!A.length||!B.length) return 0;
  const hit=A.filter(x=>B.some(y=>x===y||x.startsWith(y)||y.startsWith(x)||charDice(x,y)>.72)).length/A.length;
  return Math.max(hit,charDice(a,b)*.82);
}

function normalizeCity(text){
  const n=norm(text);
  const forms=[["karpaczu","Karpacz"],["karpacz","Karpacz"],["warszawie","Warszawa"],["warszawa","Warszawa"],["warsaw","Warszawa"],["krakowie","Kraków"],["gdyni","Gdynia"],["gdynia","Gdynia"],["gdansku","Gdańsk"],["kielce","Kielce"],["zakopane","Zakopane"],["michniowie","Michniów"],["michniow","Michniów"],["odrynkach","Odrynki"],["odrynki","Odrynki"],["konstancin jeziorna","Konstancin-Jeziorna"]];
  for(const [from,to] of forms) if(n.includes(from)) return to;
  return "";
}
const matchedRule = text => ENTITY_RULES.find(rule=>rule.re.test(text)) || null;

function looksLikeAddress(line){
  return /\b\d{2}-\d{3}\b/.test(line) || /\b(?:ul\.?|aleja|al\.?|plac|pl\.?|street|road|avenue|dolina)\b/i.test(line) || /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźżА-Яа-яЁё.-]+(?:\s+[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźżА-Яа-яЁё.-]+)*\s+\d+[A-Za-z]?(?:\/[A-Za-z0-9]+)?/.test(line);
}
function lineScore(line,index,rule){
  const letters=(line.match(/[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźżА-Яа-яЁё]/g)||[]).length;
  let score=0;
  if(letters>=3) score+=15;
  if(index<12) score+=10;
  if(line.length>=3&&line.length<=68) score+=8;
  if(/^[A-ZĄĆĘŁŃÓŚŹŻА-ЯЁ0-9][\p{L}0-9 &.'()\/-]{2,60}$/u.test(line)) score+=8;
  if(rule?.re.test(line)) score+=100;
  if(NOISE.test(line)||NAV_UI.test(line)||CATEGORY.test(line)||looksLikeAddress(line)||/https?:|\d+\s*(zł|pln|€|\$)|\(?\d[\d\s]{5,}\)?/.test(line)) score-=100;
  if(line.split(" ").length>9) score-=20;
  return score;
}

export function extractSignals(text){
  const raw=String(text||"");
  const lines=uniq(raw.split(/\r?\n/).map(clean).filter(line=>line.length>1));
  const rule=matchedRule(raw);
  const postal=lines.filter(line=>/\b\d{2}-\d{3}\b/.test(line));
  const streetLines=lines.filter(line=>!NOISE.test(line)&&looksLikeAddress(line));
  const addresses=uniq([
    ...(rule?.address?[rule.address]:[]),
    ...streetLines,
    ...streetLines.flatMap(street=>postal.filter(post=>post!==street).map(post=>`${street}, ${post}`)),
    ...postal,
  ]);
  const scored=lines.map((line,index)=>({line:normalizeName(line),score:lineScore(line,index,rule)})).filter(x=>x.score>4).sort((a,b)=>b.score-a.score);
  const names=uniq([...(rule?.names||[]),...scored.slice(0,8).map(x=>x.line)]);
  const cities=uniq([rule?.city,...lines.map(normalizeCity)]).filter(Boolean);
  const coordMatch=raw.match(/(-?\d{1,2}[.,]\d{4,})\s*[,; ]\s*(-?\d{1,3}[.,]\d{4,})/);
  return {names,addresses,city:cities[0]||"",coords:coordMatch?{lat:Number(coordMatch[1].replace(",",".")),lng:Number(coordMatch[2].replace(",","."))}:null,isFood:FOOD.test(raw),raw,rule};
}

const FETCH_CACHE=new Map();
async function fetchJson(url,timeout=10000){
  if(FETCH_CACHE.has(url)) return FETCH_CACHE.get(url);
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),timeout);
  try{const response=await fetch(url,{signal:controller.signal,headers:{"Accept-Language":"pl,en,ru"}});if(!response.ok)return null;const data=await response.json();FETCH_CACHE.set(url,data);return data}catch{return null}finally{clearTimeout(timer)}
}
function officialAddress(item){const a=item.address||{};return [[a.road||a.pedestrian||a.square||a.neighbourhood,a.house_number].filter(Boolean).join(" "),[a.postcode,a.city||a.town||a.village||a.municipality].filter(Boolean).join(" ")].filter(Boolean).join(", ")||item.display_name||""}
function officialName(item){const a=item.address||{};return item.name||item.namedetails?.name||a.attraction||a.museum||a.amenity||a.historic||""}
export async function reverse(lat,lng){const item=await fetchJson(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=pl,en,ru&lat=${lat}&lon=${lng}`);if(!item)throw Error("Не удалось определить адрес");const a=item.address||{};return{address:officialAddress(item),city:a.city||a.town||a.village||a.municipality||""}}
async function photon(query,poland){const params=new URLSearchParams({q:query,lang:"pl",limit:"15"});if(poland)params.append("countrycode","PL");const data=await fetchJson(`https://photon.komoot.io/api/?${params}`);return data?.features||[]}
async function nominatim(query,poland){const params=new URLSearchParams({format:"jsonv2",limit:"8",addressdetails:"1",namedetails:"1",q:query});if(poland)params.set("countrycodes","pl");return await fetchJson(`https://nominatim.openstreetmap.org/search?${params}`)||[]}
async function wiki(query,lang){const params=new URLSearchParams({action:"query",generator:"search",gsrsearch:query,gsrlimit:"6",prop:"coordinates|description",format:"json",origin:"*"});const data=await fetchJson(`https://${lang}.wikipedia.org/w/api.php?${params}`);return Object.values(data?.query?.pages||{}).filter(page=>page.coordinates?.[0])}

function kind(name,rule){if(rule?.kind)return rule.kind;const n=norm(name);if(/aldi|lidl|biedronka|zabka|carrefour/.test(n))return"brand";if(/kebab|cafe|coffee|restaur|bubbella|rost|fit cake/.test(n))return"food";if(/villa|hotel|apart/.test(n))return"lodging";if(/muzeum|museum|barbakan|park|fontann|zamek|palac|pomnik|skit|riese|reserve|rezerwat|citadel|cytadela|morskie oko|czarny staw|dar pomorza/.test(n))return"landmark";return"other"}
function resultType(properties){return norm([properties.osm_value,properties.type,properties.osm_key].filter(Boolean).join(" "))}
function compatible(type,target){const t=norm(type);if(target==="lodging"&&/museum|muzeum|memorial/.test(t))return false;if((target==="food"||target==="brand")&&/museum|historic|memorial|monument/.test(t))return false;return true}
function nameStrength(query,name,address){const base=similarity(query,`${name} ${address}`),keys=keyTokens(query),hay=norm(`${name} ${address}`),required=keys.length?keys.filter(x=>hay.includes(x)||tokens(hay).some(y=>charDice(x,y)>.75)).length/keys.length:base;return Math.max(base,required*.92)}
function photonCandidate(feature,signals,polandPass){const p=feature.properties||{},coords=feature.geometry?.coordinates||[],name=p.name||p.street||signals.names[0]||"Место",address=[[p.street,p.housenumber].filter(Boolean).join(" "),[p.postcode,p.city||p.town||p.village||p.county].filter(Boolean).join(" ")].filter(Boolean).join(", ")||[name,p.city,p.country].filter(Boolean).join(", "),city=p.city||p.town||p.village||p.county||"",nameMatch=Math.max(...signals.names.map(n=>nameStrength(n,name,address)),0),addressMatch=Math.max(0,...signals.addresses.map(a=>similarity(a,address))),cityMatch=signals.city?similarity(signals.city,city):0,country=String(p.countrycode||"").toLowerCase();return{name,address,city,lat:Number(coords[1]),lng:Number(coords[0]),score:nameMatch*300+addressMatch*250+cityMatch*110+(country==="pl"?45:0)+(polandPass?5:0),country,type:resultType(p),nameMatch,addressMatch}}
function strictEnough(item,signals,target){if(!Number.isFinite(item.lat)||!Number.isFinite(item.lng)||!compatible(item.type,target))return false;if(signals.city&&item.city&&similarity(signals.city,item.city)<.55)return false;const threshold=target==="brand"?.42:target==="group"?.35:.48;return item.nameMatch>=threshold||(signals.addresses.length&&item.addressMatch>=.55)}

async function addressFallback(signals){
  for(const raw of signals.addresses.slice(0,4)){
    const variants=uniq([raw,raw.replace(/\/\w+/g,""),[raw,signals.city].filter(Boolean).join(", ")]);
    for(const query of variants){
      for(const poland of [true,false]){
        const hits=await nominatim(query,poland);
        if(hits.length){const h=hits[0],a=h.address||{};return{name:signals.names[0]||officialName(h)||"Место",address:officialAddress(h),city:a.city||a.town||a.village||a.municipality||signals.city||"",lat:Number(h.lat),lng:Number(h.lon),score:245,country:a.country_code||"",type:"address",nameMatch:1,addressMatch:1}}
      }
    }
  }
  return null;
}

export async function findCandidates(signals){
  if(signals.coords){const result=await reverse(signals.coords.lat,signals.coords.lng).catch(()=>({address:"",city:signals.city}));return[{name:signals.names[0]||"Место",address:result.address,city:result.city,lat:signals.coords.lat,lng:signals.coords.lng,score:999,country:"",type:"coordinates",nameMatch:1,addressMatch:1}]}
  const target=kind(signals.names[0]||"",signals.rule);
  const names=uniq([...(signals.rule?.names||[]),...signals.names]).slice(0,target==="group"?7:5);
  const queries=uniq(names.flatMap(name=>[
    [name,signals.city].filter(Boolean).join(", "),
    signals.addresses[0]?[name,signals.addresses[0]].join(", "):"",
    name,
  ])).filter(Boolean);
  let items=[];
  for(const poland of [true,false]){
    const responses=await Promise.all(queries.slice(0,10).map(query=>photon(query,poland)));
    const batch=responses.flat().map(feature=>photonCandidate(feature,{...signals,names},poland)).filter(item=>strictEnough(item,{...signals,names},target));
    items.push(...batch);
    if(batch.some(item=>item.score>=190)) break;
  }
  if(target==="landmark"||target==="group"){
    for(const lang of ["pl","en","ru"]){
      const pages=(await Promise.all(names.slice(0,5).map(name=>wiki(name,lang)))).flat();
      for(const page of pages){const label=`${page.title} ${page.description||""}`,nameMatch=Math.max(...names.map(name=>nameStrength(name,page.title,label)),0);if(nameMatch>=(target==="group"?.36:.56))items.push({name:page.title,address:page.description||"",city:signals.city,lat:page.coordinates[0].lat,lng:page.coordinates[0].lon,score:nameMatch*290+65,country:"",type:"landmark",nameMatch,addressMatch:0})}
    }
  }
  if(!items.some(item=>item.score>=175)){
    for(const poland of [true,false]){
      for(const query of queries.slice(0,6)){
        const results=await nominatim(query,poland);
        for(const h of results){const a=h.address||{},name=officialName(h)||names[0],address=officialAddress(h),city=a.city||a.town||a.village||a.municipality||"",nameMatch=Math.max(...names.map(value=>nameStrength(value,name,address)),0),addressMatch=Math.max(0,...signals.addresses.map(value=>similarity(value,address))),candidate={name,address,city,lat:Number(h.lat),lng:Number(h.lon),score:nameMatch*300+addressMatch*250+(String(a.country_code||"").toLowerCase()==="pl"?45:0),country:a.country_code||"",type:h.type||h.class||"",nameMatch,addressMatch};if(strictEnough(candidate,{...signals,names},target))items.push(candidate)}
      }
      if(items.some(item=>item.score>=175)) break;
    }
  }
  const fallback=await addressFallback({...signals,names});if(fallback)items.push(fallback);
  return [...new Map(items.map(item=>[`${item.lat.toFixed(5)}|${item.lng.toFixed(5)}`,item])).values()].sort((a,b)=>b.score-a.score).slice(0,target==="group"?8:6);
}
