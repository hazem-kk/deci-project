const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);

const routes={
  "school":{num:"08",title:"School Link",stop:"El Shorouk Academy",path:"El Shorouk Academy → School District",eta:"21 min"},
  "city centre":{num:"24",title:"Downtown Express",stop:"El Shorouk Academy",path:"El Shorouk Academy → City Centre",eta:"3 min"},
  "hospital":{num:"41",title:"North Connector",stop:"El Shorouk Academy",path:"El Shorouk Academy → Hospital",eta:"14 min"},
  "library":{num:"17",title:"Central Line",stop:"El Shorouk Academy",path:"El Shorouk Academy → Library",eta:"8 min"},
  "sports centre":{num:"17",title:"Central Line",stop:"El Shorouk Academy",path:"El Shorouk Academy → Sports Centre",eta:"8 min"}
};

const fallbackLocations=[
  {name:"El Shorouk Academy",lat:30.1441,lng:31.6249,type:"Featured stop"},
  {name:"City Centre",lat:30.0444,lng:31.2357,type:"Destination"},
  {name:"Cairo",lat:30.0444,lng:31.2357,type:"City"}
];

function findRoute(q){
  q=(q||"").toLowerCase();
  for(const k in routes) if(q.includes(k)) return routes[k];
  return null;
}
function updateClock(){
  const d=new Date();
  if($("#liveClock")) $("#liveClock").textContent=d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
}
setInterval(updateClock,1000); updateClock();

/* ---------------- JOURNEY PLANNER ---------------- */
async function plan(q){
  q=(q||"").trim()||"City Centre";
  const from=$("#fromField")?.value.trim()||"El Shorouk Academy";
  const r=findRoute(q)||{
    num:"24", title:"Busly Explorer", stop:from,
    path:`${from} → ${q}`, eta:"Check map"
  };
  $("#resultTitle").textContent=r.title;
  $("#resultPath").textContent=r.path;
  $("#resultEta").textContent=r.eta;
  $("#journeyResult").scrollIntoView({behavior:"smooth",block:"center"});
  await showJourneyOnMap(from,q);
}
$("#planBtn")?.addEventListener("click",()=>plan($("#destination").value));
$("#destination")?.addEventListener("keydown",e=>{if(e.key==="Enter")plan($("#destination").value)});
$$(".suggestions button").forEach(b=>b.onclick=()=>{
  $("#destination").value=b.dataset.dest;
  plan(b.dataset.dest);
});
$("#swapBtn")?.addEventListener("click",()=>{
  const from=$("#fromField").value, to=$("#destination").value;
  $("#fromField").value=to||"El Shorouk Academy";
  $("#destination").value=from;
});

/* ---------------- REAL SEARCHABLE MAP ---------------- */
let map, mapMarker, mapFromMarker;
const defaultCenter=[30.1441,31.6249];

function initMap(){
  const el=$("#liveMap");
  if(!el || typeof L==="undefined") return;
  map=L.map(el,{scrollWheelZoom:true}).setView(defaultCenter,12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    maxZoom:19,
    attribution:'&copy; OpenStreetMap contributors'
  }).addTo(map);
  mapMarker=L.marker(defaultCenter).addTo(map).bindPopup("<b>El Shorouk Academy</b><br>BUSLY featured starting point.").openPopup();
  setTimeout(()=>map.invalidateSize(),250);
}
async function geocode(query){
  const url="https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=en&q="+encodeURIComponent(query);
  const res=await fetch(url,{headers:{"Accept":"application/json"}});
  if(!res.ok) throw new Error("Search unavailable");
  const data=await res.json();
  if(!data.length) throw new Error("No location found");
  return {lat:+data[0].lat,lng:+data[0].lon,name:data[0].display_name};
}
async function searchMap(query, fromPlan=true){
  if(!map || !query) return;
  const status=$("#locationStatus");
  status.textContent="Searching the map for "+query+"…";
  try{
    const place=await geocode(query);
    map.setView([place.lat,place.lng],15,{animate:true});
    if(mapMarker) map.removeLayer(mapMarker);
    mapMarker=L.marker([place.lat,place.lng]).addTo(map)
      .bindPopup(`<b>${escapeHtml(query)}</b><br>${escapeHtml(place.name)}`).openPopup();
    status.textContent=`Showing ${place.name}`;
    if(fromPlan) $("#resultPath").textContent=`${$("#fromField").value.trim()||"El Shorouk Academy"} → ${query}`;
  }catch(err){
    status.textContent=`Couldn't find “${query}”. Try a full address, landmark, school or city.`;
  }
}
async function showJourneyOnMap(fromQuery,toQuery){
  if(!map) return;
  const status=$("#locationStatus");
  status.textContent=`Finding ${fromQuery} and ${toQuery}…`;
  try{
    const [from,to]=await Promise.all([geocode(fromQuery),geocode(toQuery)]);
    if(mapMarker) map.removeLayer(mapMarker);
    if(mapFromMarker) map.removeLayer(mapFromMarker);
    mapFromMarker=L.marker([from.lat,from.lng]).addTo(map)
      .bindPopup(`<b>FROM</b><br>${escapeHtml(from.name)}`);
    mapMarker=L.marker([to.lat,to.lng]).addTo(map)
      .bindPopup(`<b>TO</b><br>${escapeHtml(to.name)}`).openPopup();
    const bounds=L.latLngBounds([[from.lat,from.lng],[to.lat,to.lng]]);
    map.fitBounds(bounds.pad(0.25),{animate:true,maxZoom:15});
    status.textContent=`Route map: ${from.name} → ${to.name}`;
  }catch(err){
    // If one place cannot be geocoded, still try the destination alone.
    await searchMap(toQuery,false);
    status.textContent=`Showing the destination. Check the starting-point spelling if the full journey could not be mapped.`;
  }
}
$("#mapSearchBtn")?.addEventListener("click",()=>searchMap($("#destination").value||$("#fromField").value));
$("#mapResetBtn")?.addEventListener("click",()=>{
  if(map){map.setView(defaultCenter,12); if(mapMarker) map.removeLayer(mapMarker);
    mapMarker=L.marker(defaultCenter).addTo(map).bindPopup("<b>El Shorouk Academy</b><br>BUSLY featured starting point.");
    $("#locationStatus").textContent="Map reset to El Shorouk Academy.";
  }
});
$("#refreshStops")?.addEventListener("click",()=>{
  const b=$("#refreshStops"); b.textContent="✓ Updated"; setTimeout(()=>b.textContent="↻ Refresh nearby",1200);
});
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

/* ---------------- CHATBOT ---------------- */
const messages=$("#messages");
function chat(text,type){
  const d=document.createElement("div");
  d.className="chat-msg "+type;
  d.innerHTML=text;
  messages.appendChild(d);
  messages.scrollTop=messages.scrollHeight;
}

const faq=[
  {keys:["hello","hi","hey","yo"],answer:"Hey! 👋 I'm Busly. Ask me about a route, a place, a bus, the map, arrival times, accessibility, safety, or even what this project is about."},
  {keys:["what are you","who are you","what is busly"],answer:"🚌 <b>BUSLY</b> is a smart transport prototype that helps someone choose a starting point, find a destination, explore the map and understand the next bus decision."},
  {keys:["how much","price","cost","fare","ticket"],answer:"💳 This prototype does not contain live fares or ticket sales. For a real version, BUSLY would connect to the official transport operator's fare data."},
  {keys:["safe","safety"],answer:"🛡️ BUSLY can highlight safety information such as clear directions, crossing points and well-used stops when reliable data is available. This prototype does not claim live safety conditions."},
  {keys:["accessibility","wheelchair","disabled","accessible"],answer:"♿ Accessibility matters. BUSLY can label accessible stops and vehicles, but a production version should verify this with official transport data rather than guessing."},
  {keys:["map","location","where","address"],answer:"🗺️ Type any place, address, landmark, school, hospital or city into the planner. The map searches it and moves to that location — no 'use my current location' button is required."},
  {keys:["time","clock","today"],answer:"⏰ The clock at the top of the website shows your device's current time. Bus arrival times in this prototype are example values, not live departures."},
  {keys:["entrepreneurship","project","problem","opportunity"],answer:"💡 The opportunity is the uncertainty around transport points: people may not know the right stop, direction, waiting time or next action. BUSLY turns those questions into one clearer journey."},
  {keys:["thank","thanks"],answer:"You're welcome! 🚌 Safe travels."}
];

function reply(q){
  const x=q.toLowerCase().trim();
  const r=findRoute(x);
  if(x.includes("nearest")||x.includes("closest")){
    return "📍 In this version, BUSLY does <b>not</b> need your GPS. The featured starting point is <b>El Shorouk Academy</b>. Change the FROM field to any place you want, then ask me for a destination.";
  }
  if(x.includes("next bus")||x.includes("arrival")||x.includes("when is")||x.includes("when will")){
    return "⏱️ The prototype board currently shows <b>Bus 24</b> in about <b>3 minutes</b>, Bus 17 in <b>8 minutes</b>, and Bus 41 in <b>14 minutes</b>. These are illustrative values, not live data.";
  }
  if(r) return `🚌 For <b>${escapeHtml(q)}</b>, I suggest <b>Bus ${r.num} · ${r.title}</b>. Start at <b>${r.stop}</b>. Example arrival: <b>${r.eta}</b>. I also moved the map to your destination.`;
  for(const item of faq) if(item.keys.some(k=>x.includes(k))) return item.answer;
  if(x.match(/^(what|why|how|can|is|are|where|when|which|who|tell me|explain)/)){
    return `I can help with that. For transport, ask me something like <b>“How do I get to the hospital?”</b>, <b>“Where is the library?”</b>, <b>“What is Busly?”</b>, or <b>“How does the map work?”</b>. For a truly live answer to a question outside the prototype, BUSLY would need a real AI service or live data connection.`;
  }
  return `Got it. 🚌 I can understand normal questions, not only preset buttons. If you're asking about a journey, include the place name or address and I'll use it as the destination.`;
}
function send(){
  const input=$("#chatInput"),q=input.value.trim(); if(!q)return;
  chat(escapeHtml(q),"user"); input.value="";
  setTimeout(()=>chat(reply(q),"bot"),300);
}
$("#sendBtn")?.addEventListener("click",send);
$("#chatInput")?.addEventListener("keydown",e=>{if(e.key==="Enter")send()});
$$(".quick-chat button").forEach(b=>b.onclick=()=>{
  const text=b.textContent;
  $("#chatInput").value=text==="Get me to school"?"How do I get to school?":text;
  send();
});
$("#clearChat")?.addEventListener("click",()=>{
  messages.innerHTML='<div class="chat-msg bot">Chat cleared. 👋 Ask me anything about BUSLY, your route, a place, the map, safety or accessibility.</div>';
});

document.addEventListener("DOMContentLoaded",initMap);
