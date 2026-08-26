(function(){
"use strict";

/* ============================= DATA ============================= */
const ROUTES = [
  {num:24, name:'Downtown Express', dest:'Downtown Cairo',      color:'blue',   freq:'Every 8 min',  accessible:true,  covered:true,  stops:['Tahrir Square','Maadi Corniche','Ramses Square','Downtown Cairo']},
  {num:18, name:'Central Line',     dest:'Ramses Station',      color:'cyan',   freq:'Every 10 min', accessible:true,  covered:false, stops:['Tahrir Square','Ramses Square','Attaba','Ramses Station']},
  {num:31, name:'School Link',      dest:'School',               color:'purple', freq:'Every 12 min', accessible:true,  covered:true,  stops:['Ramses Square','Nasr City','Abbassia','School']},
  {num:7,  name:'Riverside Runner', dest:'City Stars Mall',      color:'pink',   freq:'Every 15 min', accessible:false, covered:false, stops:['Maadi Corniche','Zamalek','Garden City','City Stars Mall']},
  {num:12, name:'Library Connector',dest:'Cairo Public Library', color:'mint',   freq:'Every 9 min',  accessible:true,  covered:true,  stops:['Zamalek','Nasr City','Heliopolis','Cairo Public Library']},
];
const routeByNum = n => ROUTES.find(r => r.num === Number(n));

const STOPS = [
  {id:'tahrir-square', name:'Tahrir Square Stop',       baseDist:120, walk:2,  x:150, y:330, routes:[24,18], accessible:true,  covered:true},
  {id:'ramses',         name:'Ramses Square Stop',       baseDist:350, walk:5,  x:300, y:250, routes:[18,31], accessible:true,  covered:false},
  {id:'zamalek',        name:'Zamalek Stop',             baseDist:480, walk:7,  x:470, y:310, routes:[7,12],  accessible:false, covered:true},
  {id:'nasr-city',      name:'Nasr City Stop',           baseDist:610, walk:9,  x:400, y:130, routes:[31,12], accessible:true,  covered:true},
  {id:'maadi',          name:'Maadi Corniche Stop',      baseDist:740, walk:11, x:610, y:220, routes:[7,24],  accessible:true,  covered:false},
];
const stopById = id => STOPS.find(s => s.id === id);

// destination -> best journey mapping
const DESTINATIONS = [
  {name:'School',              keys:['school'],                                     routeNum:31, stopId:'nasr-city',    arrive:9,  duration:16, numStops:6,  transfer:null},
  {name:'Downtown Cairo',      keys:['downtown cairo','downtown','city centre','city center','tahrir','centre'], routeNum:24, stopId:'tahrir-square', arrive:4,  duration:18, numStops:8,  transfer:null},
  {name:'Cairo Public Library',keys:['library','cairo public library'],             routeNum:12, stopId:'zamalek',      arrive:11, duration:14, numStops:5,  transfer:null},
  {name:'City Stars Mall',     keys:['city stars','shopping centre','shopping center','mall','shops'], routeNum:7, stopId:'maadi', arrive:14, duration:22, numStops:9, transfer:null},
  {name:'Hospital',            keys:['hospital'],                                   routeNum:18, stopId:'ramses',       arrive:8,  duration:20, numStops:7,  transfer:'Transfer at Ramses Station to Route 31'},
  {name:'Cairo Stadium',       keys:['stadium','sports centre','sports center','sport centre','cairo stadium'], routeNum:24, stopId:'tahrir-square', arrive:4, duration:26, numStops:11, transfer:'Transfer at Downtown Cairo to Route 7'},
];

const ARRIVALS_SEED = [
  {num:24, minutesFromNow:4,  delayed:false},
  {num:18, minutesFromNow:9,  delayed:false},
  {num:31, minutesFromNow:14, delayed:true},
  {num:7,  minutesFromNow:22, delayed:false},
  {num:12, minutesFromNow:6,  delayed:false},
];

const colorClass = c => 'rb-' + c;

/* ============================= STATE ============================= */
const LS_KEY = 'busbuddy_v1';
function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return {savedStops:[], recentDestinations:[], hasLocation:false};
}
let state = loadState();
function persist(){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch(e){}
}

let nearestStopId = 'green-street';
let currentDestination = null; // {name, routeNum, stopId, arrive, duration, numStops, transfer}
let sortedStops = STOPS.slice();

/* ============================= UTIL ============================= */
function $(sel, ctx){ return (ctx||document).querySelector(sel); }
function $all(sel, ctx){ return Array.from((ctx||document).querySelectorAll(sel)); }
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function showToast(msg, iconOk){
  const stack = $('#toastStack');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = (iconOk!==false ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M20 6L9 17l-5-5"/></svg>' : '') + '<span>'+escapeHtml(msg)+'</span>';
  stack.appendChild(t);
  setTimeout(()=>{ t.classList.add('leaving'); setTimeout(()=>t.remove(), 320); }, 3200);
}

/* ============================= NEAREST / STOP LIST RENDER ============================= */
function renderStopList(){
  const list = $('#stopList');
  list.innerHTML = '';
  sortedStops.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'stop-item glass' + (s.id === nearestStopId ? ' selected' : '');
    el.tabIndex = 0;
    el.setAttribute('role','button');
    el.setAttribute('aria-label', 'View ' + s.name + ', ' + s.baseDist + ' metres away');
    const routeChips = s.routes.map(n => {
      const r = routeByNum(n);
      return '<span class="tag">'+r.num+'</span>';
    }).join(' ');
    el.innerHTML =
      '<div class="stop-item__rank">'+(i+1)+'</div>'+
      '<div class="stop-item__body"><h4>'+escapeHtml(s.name)+'</h4>'+
      '<div class="sub">'+routeChips+(s.accessible?' <span class="tag">♿ Accessible</span>':'')+(s.covered?' <span class="tag">☂ Covered</span>':'')+'</div></div>'+
      '<div class="stop-item__dist">'+s.baseDist+' m<small>'+s.walk+' min walk</small></div>';
    el.addEventListener('click', () => selectStop(s.id, true));
    el.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' '){ e.preventDefault(); selectStop(s.id, true);} });
    list.appendChild(el);
  });
  $('#stopCount').textContent = sortedStops.length + ' stops';
}

function selectStop(id, userInitiated){
  nearestStopId = id;
  renderNearestCard();
  renderStopList();
  renderMap();
  if(userInitiated){
    document.getElementById('nearest').scrollIntoView({behavior:'smooth', block:'start'});
  }
}

function nextBusForStop(stop){
  // pick the soonest arrival among the routes serving this stop
  let best = null;
  stop.routes.forEach(n => {
    const seed = ARRIVALS_SEED.find(a => a.num === n);
    if(seed && (!best || seed.minutesFromNow < best.minutesFromNow)) best = seed;
  });
  return best || ARRIVALS_SEED[0];
}

function renderNearestCard(){
  const stop = stopById(nearestStopId);
  const nb = nextBusForStop(stop);
  const route = routeByNum(nb.num);
  $('#nearestName').textContent = stop.name;
  $('#nearestDist').textContent = stop.baseDist + ' m';
  $('#nearestWalk').textContent = stop.walk + ' min';
  const badge = $('#nearestBusBadge');
  badge.textContent = route.num;
  badge.className = 'route-badge ' + colorClass(route.color);
  $('#nearestBusNum').textContent = 'Route ' + route.num + ' · ' + route.name;
  $('#nearestBusTo').textContent = '→ ' + route.dest;
  $('#nearestBusTime').innerHTML = nb.minutesFromNow + '<span style="font-size:12px;">min</span>';
  updateSaveButtonState();
}

/* ============================= SAVED STOPS ============================= */
function updateSaveButtonState(){
  const saved = state.savedStops.includes(nearestStopId);
  const btn2 = $('#saveStopBtn2');
  btn2.textContent = saved ? 'Saved ✓' : 'Save Stop';
  btn2.classList.toggle('btn--secondary', saved);
  btn2.classList.toggle('btn--primary', !saved);
}
function toggleSaveStop(id){
  const idx = state.savedStops.indexOf(id);
  const stop = stopById(id);
  if(idx === -1){
    state.savedStops.push(id);
    showToast(stop.name + ' saved to your stops');
  }else{
    state.savedStops.splice(idx,1);
    showToast(stop.name + ' removed from saved stops');
  }
  persist();
  updateSaveButtonState();
  renderSavedChips();
}
function renderSavedChips(){
  const row = $('#savedChipRow');
  if(state.savedStops.length === 0){
    row.innerHTML = '<span style="font-size:13px;color:var(--text-faint);">No saved stops yet — tap "Save Stop" on any stop to pin it here.</span>';
    return;
  }
  row.innerHTML = '';
  state.savedStops.forEach(id => {
    const s = stopById(id);
    if(!s) return;
    const chip = document.createElement('div');
    chip.className = 'saved-chip';
    chip.innerHTML = '<span>'+escapeHtml(s.name)+'</span><button aria-label="Remove '+escapeHtml(s.name)+' from saved stops">&times;</button>';
    chip.querySelector('span').addEventListener('click', () => selectStop(id, true));
    chip.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); toggleSaveStop(id); });
    row.appendChild(chip);
  });
}

/* ============================= ARRIVAL BOARD (live countdown) ============================= */
let arrivalTargets = []; // {num, target(ms), delayed}
function seedArrivals(){
  const now = Date.now();
  arrivalTargets = ARRIVALS_SEED.map(a => ({num:a.num, target: now + a.minutesFromNow*60000, delayed:a.delayed}));
}
const arrivalEls = new Map(); // num -> {countdownEl, statusEl}
function renderArrivalBoard(){
  const list = $('#arrivalList');
  list.innerHTML = '';
  arrivalEls.clear();
  const frag = document.createDocumentFragment();
  arrivalTargets.sort((a,b)=>a.target-b.target).forEach(a => {
    const route = routeByNum(a.num);
    const row = document.createElement('div');
    row.className = 'arrival-row';
    row.dataset.num = a.num;
    row.innerHTML =
      '<span class="rt-badge '+colorClass(route.color)+'">'+route.num+'</span>'+
      '<div><div class="rt-name">'+route.name+'</div><div class="rt-dest">'+route.dest.split(' → ').pop()+' via Route '+route.num+'</div></div>'+
      '<div class="countdown-wrap"><span class="countdown" data-num="'+a.num+'"></span></div>'+
      '<span class="status-badge" data-status-num="'+a.num+'"></span>';
    frag.appendChild(row);
    arrivalEls.set(a.num, {
      countdownEl: row.querySelector('.countdown'),
      statusEl: row.querySelector('.status-badge')
    });
  });
  list.appendChild(frag);
  updateArrivalCountdowns();
}
function updateArrivalCountdowns(){
  const now = Date.now();
  arrivalTargets.forEach(a => {
    let diffSec = Math.round((a.target - now)/1000);
    if(diffSec <= 0){
      // loop: reschedule a fresh arrival
      const mins = 5 + Math.floor(Math.random()*20);
      a.target = now + mins*60000;
      a.delayed = Math.random() < 0.18;
      diffSec = mins*60;
    }
    const mins = Math.max(0, Math.ceil(diffSec/60));
    const refs = arrivalEls.get(a.num);
    if(!refs) return;
    const {countdownEl, statusEl} = refs;
    if(countdownEl){
      countdownEl.textContent = mins <= 0 ? 'Now' : mins + ' min';
      countdownEl.classList.toggle('pulse', mins <= 2 && !a.delayed);
    }
    if(statusEl){
      let cls, label;
      if(a.delayed){ cls='status-delayed'; label = '2 min late'; }
      else if(mins <= 2){ cls='status-arriving'; label='Arriving'; }
      else { cls='status-ontime'; label='On time'; }
      statusEl.className = 'status-badge ' + cls;
      statusEl.textContent = label;
    }
  });
}
setInterval(updateArrivalCountdowns, 1000);

/* ============================= ROUTES GRID ============================= */
function renderRoutesGrid(){
  const grid = $('#routesGrid');
  grid.innerHTML = '';
  ROUTES.forEach(r => {
    const card = document.createElement('div');
    card.className = 'glass route-card';
    card.innerHTML =
      '<div class="route-card__head">'+
        '<span class="route-badge '+colorClass(r.color)+'">'+r.num+'</span>'+
        '<div><h3>'+r.name+'</h3><div class="dest">→ '+r.dest+'</div></div>'+
      '</div>'+
      '<div class="route-card__stops">'+r.stops.map(s=>'<span class="tag">'+s+'</span>').join('')+'</div>'+
      '<div class="route-card__foot">'+
        '<span class="freq">'+r.freq+'</span>'+
        '<span class="a11y">'+
          (r.accessible? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v1M9 12h6M10 12l1 7M14 12l-1 7"/></svg>' : '')+
          (r.covered? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 6 0 0118 0M4 12v6M20 12v6"/></svg>' : '')+
        '</span>'+
      '</div>'+
      '<div class="route-detail" data-detail>'+
        '<div class="sched-row"><span>Frequency</span><b>'+r.freq+'</b></div>'+
        '<div class="sched-row"><span>Accessible vehicle</span><b>'+(r.accessible?'Yes':'Not on this route')+'</b></div>'+
        '<div class="sched-row"><span>Shelter at boarding stop</span><b>'+(r.covered?'Yes':'No')+'</b></div>'+
        '<div class="sched-row"><span>Full stop order</span><b style="font-family:var(--font-body);font-weight:600;">'+r.stops.join(' → ')+'</b></div>'+
      '</div>';
    card.addEventListener('click', (e)=>{
      const detail = card.querySelector('[data-detail]');
      detail.classList.toggle('open');
    });
    card.setAttribute('tabindex','0');
    card.setAttribute('role','button');
    card.setAttribute('aria-expanded','false');
    card.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault(); card.click();} });
    grid.appendChild(card);
  });
}

/* ============================= MAP (simulated SVG) ============================= */
let userMarkerPos = null; // {x,y}
let selectedDestForMap = null;

function renderMap(){
  const svg = $('#mapSvg');
  const W=800,H=450;
  let html = '';
  // background road grid
  html += '<defs><radialGradient id="mapGlow" cx="50%" cy="50%" r="60%"><stop offset="0%" stop-color="rgba(168,85,247,.14)"/><stop offset="100%" stop-color="rgba(168,85,247,0)"/></radialGradient></defs>';
  html += '<rect width="'+W+'" height="'+H+'" fill="url(#mapGlow)"/>';
  const roadColorMinor = 'rgba(255,255,255,.07)', roadColorMajor='rgba(255,255,255,.14)';
  for(let x=0;x<=W;x+=80){ html += '<line x1="'+x+'" y1="0" x2="'+x+'" y2="'+H+'" stroke="'+roadColorMinor+'" stroke-width="1"/>'; }
  for(let y=0;y<=H;y+=75){ html += '<line x1="0" y1="'+y+'" x2="'+W+'" y2="'+y+'" stroke="'+roadColorMinor+'" stroke-width="1"/>'; }
  html += '<line x1="0" y1="225" x2="'+W+'" y2="225" stroke="'+roadColorMajor+'" stroke-width="3"/>';
  html += '<line x1="400" y1="0" x2="400" y2="'+H+'" stroke="'+roadColorMajor+'" stroke-width="3"/>';

  // route line to selected destination stop
  const destStop = stopById(nearestStopId);
  const upos = userMarkerPos || {x: destStop.x - 60, y: destStop.y + 50};
  html += '<path d="M'+upos.x+' '+upos.y+' Q '+((upos.x+destStop.x)/2)+' '+(Math.min(upos.y,destStop.y)-40)+', '+destStop.x+' '+destStop.y+'" stroke="url(#railGrad)" stroke-width="3" fill="none" stroke-dasharray="7 7" opacity="0.9"/>';

  // stops
  STOPS.forEach(s => {
    const isSel = s.id === nearestStopId;
    html += '<g transform="translate('+s.x+','+s.y+')" style="cursor:pointer;" data-stop="'+s.id+'">';
    if(isSel){ html += '<circle r="16" fill="rgba(168,85,247,.18)"><animate attributeName="r" values="14;20;14" dur="2.2s" repeatCount="indefinite"/></circle>'; }
    html += '<circle r="9" fill="'+(isSel?'#7c3aed':'#f5f3ff')+'" stroke="#0a0d18" stroke-width="2.5"/>';
    html += '<text x="0" y="-16" text-anchor="middle" font-family="JetBrains Mono" font-size="11" fill="'+(isSel?'#e9d5ff':'#a3acc7')+'">'+s.name.replace(' Stop','')+'</text>';
    html += '</g>';
  });

  // user marker
  html += '<g transform="translate('+upos.x+','+upos.y+')">';
  html += '<circle r="15" fill="rgba(255,255,255,.22)"><animate attributeName="r" values="12;20;12" dur="1.8s" repeatCount="indefinite"/></circle>';
  html += '<circle r="7" fill="#f5f3ff" stroke="#0a0d18" stroke-width="2.5"/>';
  html += '<text x="0" y="-20" text-anchor="middle" font-family="JetBrains Mono" font-size="11" fill="#ffffff">You</text>';
  html += '</g>';

  // destination marker if a journey destination selected
  if(currentDestination){
    const dStop = stopById(currentDestination.stopId);
    html += '<g transform="translate('+(dStop.x+60)+','+(dStop.y-45)+')">';
    html += '<circle r="8" fill="#34d399" stroke="#0a0d18" stroke-width="2.5"/>';
    html += '<text x="0" y="-16" text-anchor="middle" font-family="JetBrains Mono" font-size="11" fill="#6ee7b7">'+currentDestination.name+'</text>';
    html += '</g>';
  }

  svg.innerHTML = html;
  $all('[data-stop]', svg).forEach(g => {
    g.addEventListener('click', () => selectStop(g.getAttribute('data-stop'), false));
  });
}

$('#mapSearchBtn').addEventListener('click', () => {
  const val = $('#mapSearchInput').value.trim();
  if(!val){ showToast('Type a place to search on the map', false); return; }
  // move user marker to a pseudo-random but deterministic position based on text
  let hash = 0; for(let i=0;i<val.length;i++) hash = (hash*31 + val.charCodeAt(i)) % 10000;
  userMarkerPos = { x: 90 + (hash % 620), y: 70 + ((hash*7) % 300) };
  renderMap();
  showToast('Showing results near "'+val+'" (simulated)');
});
$('#mapResetBtn').addEventListener('click', () => {
  userMarkerPos = null;
  $('#mapSearchInput').value='';
  renderMap();
  showToast('Map reset', true);
});

/* ============================= GEOLOCATION ============================= */
function seededJitter(seedStr, range){
  let h=0; for(let i=0;i<seedStr.length;i++) h = (h*31 + seedStr.charCodeAt(i)) >>> 0;
  return (h % (range*2)) - range;
}
function useMyLocation(){
  const banner = $('#locationBanner');
  banner.style.display='flex';
  banner.className='location-banner';
  banner.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" stroke-dasharray="4 3"/></svg><span>Locating you…</span>';

  if(!('geolocation' in navigator)){
    handleLocationError();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => handleLocationSuccess(pos),
    err => handleLocationError(),
    {enableHighAccuracy:false, timeout:8000, maximumAge:60000}
  );
}
function handleLocationSuccess(pos){
  const lat = pos.coords.latitude.toFixed(3), lng = pos.coords.longitude.toFixed(3);
  const seed = lat+','+lng;
  sortedStops = STOPS.map(s => ({...s, baseDist: Math.max(40, s.baseDist + seededJitter(seed+s.id, 90))}))
                     .sort((a,b)=>a.baseDist-b.baseDist);
  nearestStopId = sortedStops[0].id;
  state.hasLocation = true;
  persist();

  const banner = $('#locationBanner');
  banner.className='location-banner';
  banner.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg><span>Location found — approx '+lat+', '+lng+'. Nearby stops sorted by distance. <strong>This uses sample transport data, not a live feed.</strong></span>';

  $('#fromInput').value = 'Your current location';
  userMarkerPos = { x: sortedStops[0].x - 55, y: sortedStops[0].y + 45 };

  renderNearestCard(); renderStopList(); renderMap(); updateDashboard();
  showToast('Location detected — stops updated');
}
function handleLocationError(){
  const banner = $('#locationBanner');
  banner.className='location-banner warn';
  banner.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.3 3.9L2.5 18a2 2 0 001.7 3h15.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg><span>No worries — location wasn\'t available. Enter your starting point manually below instead.</span>';
  $('#fromInput').removeAttribute('readonly');
  $('#fromInput').value='';
  $('#fromInput').placeholder='Type your starting point…';
  $('#fromInput').focus();
}
$('#useLocationBtn').addEventListener('click', useMyLocation);
$('#navLocationBtn').addEventListener('click', () => { document.getElementById('planner').scrollIntoView({behavior:'smooth'}); useMyLocation(); });

/* ============================= JOURNEY FINDER ============================= */
function findDestination(query){
  const q = query.trim().toLowerCase();
  if(!q) return null;
  return DESTINATIONS.find(d => d.keys.some(k => q.includes(k)) || q.includes(d.name.toLowerCase())) || null;
}

function runSearch(destName){
  const toInput = $('#toInput');
  const query = destName || toInput.value;
  toInput.value = query;
  const resultArea = $('#resultArea');
  resultArea.innerHTML = '<div class="skeleton-row"></div><div class="skeleton-row" style="width:80%;"></div>';

  $all('.chip', $('#chipRow')).forEach(c => c.classList.toggle('active', c.dataset.dest && query.toLowerCase().includes(c.dataset.dest.toLowerCase())));

  setTimeout(() => {
    const dest = findDestination(query);
    if(!dest){
      resultArea.innerHTML =
        '<div class="empty-state">'+
        
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>'+
        '<h4>No matching bus in this prototype</h4>'+
        '<p>Try one of the popular destinations below, like Downtown Cairo or Cairo Public Library.</p>'+
        '</div>';
      return;
    }
    currentDestination = dest;
    const route = routeByNum(dest.routeNum);
    const stop = stopById(dest.stopId);
    let status = 'status-ontime', statusLabel='On time';
    const seed = ARRIVALS_SEED.find(a=>a.num===dest.routeNum);
    if(seed && seed.delayed){ status='status-delayed'; statusLabel='2 min late'; }
    else if(dest.arrive <= 5){ status='status-arriving'; statusLabel='Arriving'; }

    resultArea.innerHTML =
      '<div class="route-result glass">'+
        '<span class="route-badge '+colorClass(route.color)+'">'+route.num+'</span>'+
        '<div class="route-result__body">'+
          '<h3>'+route.name+'</h3>'+
          '<div class="route-result__dest">'+stop.name+' → '+dest.name+'</div>'+
          '<div class="route-result__meta">'+
            '<span class="meta-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 4a2 2 0 11-2-2M4 21l4.5-9L13 15l3-6M17 4l4 2-4 2"/></svg>'+stop.walk+' min walk</span>'+
            '<span class="meta-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'+dest.duration+' min total</span>'+
            '<span class="meta-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>'+dest.numStops+' stops</span>'+
            '<span class="meta-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s7-7.4 7-12.5A7 7 0 105 9.5C5 14.6 12 22 12 22z"/></svg>'+stop.name+'</span>'+
          '</div>'+
          (dest.transfer ? '<div class="route-result__transfer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/></svg>'+dest.transfer+'</div>' : '')+
        '</div>'+
        '<div class="route-result__status">'+
          '<span class="status-badge '+status+'">'+statusLabel+'</span>'+
          '<div class="route-result__arrival">'+dest.arrive+' min</div>'+
        '</div>'+
      '</div>';

    // remember recent destination
    state.recentDestinations = [dest.name, ...state.recentDestinations.filter(d=>d!==dest.name)].slice(0,5);
    persist();

    nearestStopId = dest.stopId;
    renderNearestCard(); renderStopList(); renderMap();
    updateDashboard();
  }, 220);
}

function updateDashboard(){
  if(!currentDestination) return;
  const dest = currentDestination;
  const route = routeByNum(dest.routeNum);
  const stop = stopById(dest.stopId);
  $('#dashStop').textContent = stop.name.replace(' Stop','');
  $('#dashBus').textContent = route.num + ' → ' + route.dest;
  $('#dashDest').textContent = dest.name;
  $('#dashWalk').textContent = stop.walk + ' min';
  $('#dashArrival').textContent = dest.arrive + ' min';
  $('#dashDuration').textContent = dest.duration + ' min';
}

$('#searchBtn').addEventListener('click', () => runSearch());
$('#toInput').addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); runSearch(); } });
$all('.chip[data-dest]').forEach(chip => {
  chip.addEventListener('click', () => { $('#toInput').value = chip.dataset.dest; runSearch(chip.dataset.dest); });
});
$('#swapBtn').addEventListener('click', () => {
  const from = $('#fromInput'), to = $('#toInput');
  const tmp = from.value; from.value = to.value || 'Set my location…'; to.value = (tmp === 'Set my location…' || tmp==='Your current location') ? '' : tmp;
  showToast('Swapped starting point and destination', true);
});
$('#heroFindBtn').addEventListener('click', () => { document.getElementById('planner').scrollIntoView({behavior:'smooth'}); $('#toInput').focus(); });
$('#navFindBtn').addEventListener('click', () => { document.getElementById('planner').scrollIntoView({behavior:'smooth'}); $('#toInput').focus(); });
$('#heroExploreBtn').addEventListener('click', () => document.getElementById('nearest').scrollIntoView({behavior:'smooth'}));

/* ============================= DIRECTIONS / VIEW STOP MODAL ============================= */
function openModal(title, sub, bodyHtml){
  $('#modalTitle').textContent = title;
  $('#modalSub').textContent = sub || '';
  $('#modalBody').innerHTML = bodyHtml;
  $('#modalOverlay').classList.add('open');
  $('#modalCloseBtn').focus();
}
function closeModal(){ $('#modalOverlay').classList.remove('open'); }
$('#modalCloseBtn').addEventListener('click', closeModal);
$('#modalOverlay').addEventListener('click', e => { if(e.target.id==='modalOverlay') closeModal(); });
document.addEventListener('keydown', e => { if(e.key==='Escape'){ closeModal(); closeChat(); } });

function showDirections(){
  const stop = stopById(nearestStopId);
  const steps = [
    {t:'Head toward '+stop.name, d:'Leave your current position and walk toward the main road.', dur:'~'+Math.max(1,Math.round(stop.walk*0.4))+' min'},
    {t:'Continue straight for '+Math.round(stop.baseDist*0.6)+'m', d:'Keep to the pavement, crossing at any marked crossing points.', dur:'~'+Math.max(1,Math.round(stop.walk*0.5))+' min'},
    {t:'Arrive at '+stop.name, d:'Look for the '+stop.routes.map(n=>'Route '+n).join(' / ')+' signage'+(stop.covered?' — this stop has shelter':'')+'.', dur:'~1 min'},
  ];
  const html = steps.map((s,i)=>'<div class="direction-step"><div class="n">'+(i+1)+'</div><div><p>'+s.t+'</p><div style="font-size:12.5px;color:var(--text-dim);margin-top:2px;">'+s.d+'</div><div class="dur">'+s.dur+'</div></div></div>').join('');
  openModal('Walking directions', 'Simulated directions to '+stop.name+' · '+stop.baseDist+'m total', html);
}
function viewStopDetail(){
  const stop = stopById(nearestStopId);
  const nb = nextBusForStop(stop);
  const route = routeByNum(nb.num);
  const html =
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">'+
      (stop.accessible? '<span class="tag">♿ Accessible</span>':'')+
      (stop.covered? '<span class="tag">☂ Covered</span>':'')+
      '<span class="tag">'+stop.baseDist+'m away</span>'+
    '</div>'+
    '<div style="font-size:12px;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-bottom:10px;">Routes serving this stop</div>'+
    stop.routes.map(n=>{
      const r = routeByNum(n);
      return '<div class="direction-step"><div class="n" style="background:none;">'+ '<span class="route-badge '+colorClass(r.color)+'" style="width:30px;height:30px;font-size:12px;border-radius:8px;">'+r.num+'</span></div><div><p>'+r.name+'</p><div style="font-size:12.5px;color:var(--text-dim);">→ '+r.dest+' · '+r.freq+'</div></div></div>';
    }).join('');
  openModal(stop.name, 'Stop details · prototype data', html);
  document.getElementById('map').scrollIntoView({behavior:'smooth'});
  setTimeout(()=>{ closeModal(); }, 10);
  // re-open modal after scroll settles for smoother feel
  setTimeout(()=>openModal(stop.name, 'Stop details · prototype data', html), 420);
}

$('#directionsBtn').addEventListener('click', showDirections);
$('#viewStopBtn').addEventListener('click', viewStopDetail);
$('#saveStopBtn').addEventListener('click', () => toggleSaveStop(nearestStopId));
$('#saveStopBtn2').addEventListener('click', () => toggleSaveStop(nearestStopId));

/* ============================= CHATBOT NLU ============================= */
const chatCtx = { awaitingDestination:false };

function botName(){ return 'Buddy'; }

function findBusNumberMention(text){
  const m = text.match(/\bbus\s*#?\s*(\d{1,2})\b/i) || text.match(/\broute\s*#?\s*(\d{1,2})\b/i);
  if(m) return Number(m[1]);
  const bare = text.match(/\b(24|18|31|12|7)\b/);
  return bare ? Number(bare[1]) : null;
}

function processMessage(raw){
  const text = raw.trim();
  const q = text.toLowerCase();

  if(chatCtx.awaitingDestination){
    chatCtx.awaitingDestination = false;
    const dest = findDestination(q);
    if(dest){
      runSearch(dest.name);
      return replyPlan(dest);
    }
    return {text:"I couldn't match that to a destination in this prototype. Try School, Downtown Cairo, Cairo Public Library, City Stars Mall, Hospital or Cairo Stadium.", quick:['School','Downtown Cairo','Cairo Public Library']};
  }

  // greetings
  if(/^(hi|hello|hey|yo|sup|good morning|good afternoon|good evening)\b/.test(q)){
    return {text:"Hey there 👋 I'm Buddy. Ask me about your nearest stop, the next bus, or where you're headed — or really, anything else too, I'll do my best.", quick:['Nearest bus stop','Next bus','Plan my journey']};
  }
  if(/thank/.test(q)){
    return {text:"Anytime! Safe travels 🚍"};
  }
  if(/^(bye|goodbye|see ya|see you|later)\b/.test(q)){
    return {text:"See you soon! Have a smooth ride. 🚍"};
  }
  if(/how are you/.test(q)){
    return {text:"Running smoothly, thanks for asking! 😄 How can I help with your journey today?", quick:['Nearest bus stop','Plan my journey']};
  }
  if(/(who are you|what are you)\??/.test(q)){
    return {text:"I'm Buddy 🚍 — the Busly assistant. I help you find stops, routes, arrivals and directions. I'll also chat about pretty much anything else you bring up, just don't expect a transit app to know everything!"};
  }
  if(/(what can you do|what do you do|help me|^help$|what should i ask|what can i ask)/.test(q)){
    return {text:"I'm best at bus stuff — nearest stops, next arrivals, delays, transfers, and planning journeys. But ask me anything and I'll give it an honest shot.", quick:['Nearest bus stop','Next bus','Plan my journey']};
  }
  if(/(tell me a joke|make me laugh|joke)/.test(q)){
    return {text:"Why did the bus break up with the bike? It said, \"I need someone who can keep up with my schedule.\" 🚍😄"};
  }
  if(/(weather)/.test(q)){
    return {text:"I can't check live weather in this prototype, but if it looks like rain, the covered stops on the map are a good bet while you wait for your bus."};
  }

  // bus number lookup — "where does bus 24 go?"
  const busNum = findBusNumberMention(q);
  if(busNum && /(where does|go(es)?|route|about|tell me about)/.test(q)){
    const r = routeByNum(busNum);
    if(r) return {text:'🚌 Bus '+r.num+' ('+r.name+') runs to <b>'+r.dest+'</b>, stopping at '+r.stops.join(' → ')+'. It runs '+r.freq.toLowerCase()+'.'};
    return {text:"I don't have Bus "+busNum+" in this prototype network. Try 7, 12, 18, 24 or 31."};
  }

  // delay status
  if(/(delay|late|on time\??|running late)/.test(q)){
    const num = busNum || (currentDestination ? currentDestination.routeNum : nextBusForStop(stopById(nearestStopId)).num);
    const seed = ARRIVALS_SEED.find(a=>a.num===num);
    const r = routeByNum(num);
    if(seed && seed.delayed) return {text:'⚠️ Bus '+r.num+' ('+r.name+') is showing as about 2 minutes late in this demo board. I\'d suggest checking the arrival board before you leave.', quick:['Nearest bus stop']};
    return {text:'✅ Bus '+r.num+' ('+r.name+') is showing "On time" on the demo arrival board right now.'};
  }

  // fastest bus
  if(/(fastest|quickest|shortest|which bus.*first|soonest)/.test(q)){
    const soonest = arrivalTargets.slice().sort((a,b)=>a.target-b.target)[0];
    const r = routeByNum(soonest.num);
    const mins = Math.max(0, Math.round((soonest.target-Date.now())/60000));
    return {text:'⚡ Right now, <b>Bus '+r.num+'</b> ('+r.name+' → '+r.dest+') is arriving first, in about '+mins+' min.'};
  }

  // transfer / change buses
  if(/(change bus|transfer|switch bus)/.test(q)){
    if(currentDestination){
      return currentDestination.transfer
        ? {text:'🔁 Yes — for '+currentDestination.name+', you\'ll need to transfer: '+currentDestination.transfer+'.'}
        : {text:'🙂 No transfer needed — Bus '+currentDestination.routeNum+' goes straight to '+currentDestination.name+'.'};
    }
    return {text:"Tell me your destination and I'll check whether you need a transfer.", quick:['Downtown Cairo','School','Cairo Public Library']};
  }

  // missed the bus
  if(/(missed|miss my bus|what.*if.*miss)/.test(q)){
    return {text:"No stress — check the arrival board for the next departure on the same route, it's usually only a few minutes behind. Want me to show your nearest stop's next bus?", quick:['Next bus','Nearest bus stop']};
  }

  // which stop to get off / alight
  if(/(get off|alight|which stop should i)/.test(q)){
    if(currentDestination) return {text:'🛑 Get off at the stop closest to <b>'+currentDestination.name+'</b> — that\'s the last stop on Route '+currentDestination.routeNum+': '+routeByNum(currentDestination.routeNum).stops.slice(-1)[0]+'.'};
    return {text:"Tell me your destination first and I'll tell you exactly which stop to get off at.", quick:['Plan my journey']};
  }

  // walk to a different stop
  if(/(walk to another|different stop|other stop|another stop)/.test(q)){
    const alt = sortedStops.find(s=>s.id!==nearestStopId);
    return {text:'🚶 Sure — the next closest option is <b>'+alt.name+'</b>, about '+alt.baseDist+'m away ('+alt.walk+' min walk). It serves Route'+(alt.routes.length>1?'s':'')+' '+alt.routes.join(' & ')+'.'};
  }

  // how many stops
  if(/(how many stops|number of stops)/.test(q)){
    if(currentDestination) return {text:'🔢 It\'s about '+currentDestination.numStops+' stops from '+stopById(currentDestination.stopId).name+' to '+currentDestination.name+'.'};
    return {text:"Tell me your destination and I'll count the stops for you.", quick:['Plan my journey']};
  }

  // nearby buses / stops
  if(/(near me|nearby|around me|is there a bus)/.test(q)){
    const near = sortedStops.slice(0,2).map(s=>s.name+' ('+s.baseDist+'m, routes '+s.routes.join(' & ')+')').join(' and ');
    return {text:'📍 Yes! Nearby you\'ve got '+near+'. Want directions to the closer one?', quick:['Directions','Nearest bus stop']};
  }

  // distance to nearest / closest stop / where is nearest
  if(/(nearest|closest).*(stop)|how far.*(stop)|(stop).*(nearest|closest)/.test(q)){
    const s = stopById(nearestStopId);
    return {text:'🚍 Your nearest stop is <b>'+s.name+'</b>, about '+s.baseDist+'m away ('+s.walk+' min walk). Want walking directions?', quick:['Yes please','No thanks']};
  }

  // yes please -> directions follow-up
  if(/^yes( please)?$/.test(q)){
    showDirections();
    return {text:"Here you go — I've opened walking directions for you. 🧭"};
  }
  if(/^no( thanks)?$/.test(q)){
    return {text:"No problem! Ask me anything else, anytime."};
  }

  // "what bus goes to X" / "show me buses going to X" / "bus to school"
  if(/(what bus|which bus|bus (goes|going)? ?to|buses (going|heading) to|show me bus)/.test(q)){
    const dest = findDestination(q);
    if(dest){
      runSearch(dest.name);
      const r = routeByNum(dest.routeNum);
      return {text:'🚌 Take <b>Bus '+r.num+'</b> ('+r.name+') from '+stopById(dest.stopId).name+' — arriving in about '+dest.arrive+' min, '+dest.duration+' min total to '+dest.name+'.'+(dest.transfer?' '+dest.transfer+'.':'')};
    }
    chatCtx.awaitingDestination = true;
    return {text:"Where are you headed? I can match you with the right bus.", quick:['School','Downtown Cairo','Cairo Public Library']};
  }

  // "how do I get to X" -> directions/journey
  if(/(how do i get to|get me to|directions to|how to reach)/.test(q)){
    const dest = findDestination(q);
    if(dest){
      runSearch(dest.name);
      return replyPlan(dest);
    }
    chatCtx.awaitingDestination = true;
    return {text:"Where would you like to go? I'll plan the journey.", quick:['School','Downtown Cairo','Hospital']};
  }

  // next bus (general) / what time does bus arrive
  if(/(next bus|when is the (next )?bus|what time does the bus)/.test(q)){
    const s = stopById(nearestStopId);
    const nb = nextBusForStop(s);
    const r = routeByNum(nb.num);
    return {text:'⏱️ The next bus from <b>'+s.name+'</b> is <b>Bus '+r.num+'</b> → '+r.dest+', arriving in about '+nb.minutesFromNow+' min.'};
  }
  if(/next bus from this stop/.test(q)){
    const s = stopById(nearestStopId);
    const nb = nextBusForStop(s);
    const r = routeByNum(nb.num);
    return {text:'From '+s.name+', that\'s <b>Bus '+r.num+'</b> → '+r.dest+' in about '+nb.minutesFromNow+' min.'};
  }

  // plan my journey
  if(/(plan (my )?journey|help me plan|plan a trip)/.test(q)){
    chatCtx.awaitingDestination = true;
    return {text:"Happy to help! Where are you headed today?", quick:['School','Downtown Cairo','Cairo Public Library','City Stars Mall']};
  }

  // "what bus should I take" (generic)
  if(/(what bus should i take|which bus should i take)/.test(q)){
    if(currentDestination) return replyPlan(currentDestination);
    chatCtx.awaitingDestination = true;
    return {text:"That depends on where you're going — what's your destination?", quick:['School','Downtown Cairo','Cairo Public Library']};
  }

  // fallback: try destination anywhere in the message
  const anyDest = findDestination(q);
  if(anyDest){
    runSearch(anyDest.name);
    return replyPlan(anyDest);
  }

  // generic catch-all — still tries to be useful on anything off-topic
  return {
    text: "That's outside what I can check for certain in this prototype, but here's my honest take: " + genericTake(text) + " If you'd rather stick to buses, I'm great with those too.",
    quick: ['Nearest bus stop','Next bus','Plan my journey']
  };
}

function genericTake(text){
  const q = text.toLowerCase();
  if(/\?$/.test(text)){
    return "I don't have a reliable way to verify that from here, so take anything I say on it with a pinch of salt.";
  }
  if(q.length < 12){
    return "Could you say a bit more about what you mean?";
  }
  return "I'll try my best with it, but I'm really tuned for stops, routes and arrivals rather than general knowledge.";
}

function replyPlan(dest){
  const r = routeByNum(dest.routeNum);
  const stop = stopById(dest.stopId);
  return {text:'🚍 For <b>'+dest.name+'</b>, take <b>Bus '+r.num+'</b> ('+r.name+') from '+stop.name+' ('+stop.walk+' min walk). Arrives in about '+dest.arrive+' min, '+dest.duration+' min total.'+(dest.transfer?' '+dest.transfer+'.':'')+' Want walking directions to the stop?', quick:['Yes please','No thanks']};
}

/* ============================= CHAT UI (dual surfaces: inline + widget) ============================= */
function createMsgEl(text, who){
  const el = document.createElement('div');
  el.className = 'msg ' + who;
  el.innerHTML = text;
  return el;
}
function createQuickReplies(bodyEl, options, sendFn){
  const wrap = document.createElement('div');
  wrap.className = 'msg-quick';
  options.forEach(opt => {
    const b = document.createElement('button');
    b.className = 'chip btn--sm';
    b.style.padding = '8px 14px';
    b.textContent = opt;
    b.addEventListener('click', () => sendFn(opt));
    wrap.appendChild(b);
  });
  bodyEl.appendChild(wrap);
}

const chatBodies = [];
function registerChatSurface(bodyId, inputId, sendId){
  const body = document.getElementById(bodyId);
  const input = document.getElementById(inputId);
  const send = document.getElementById(sendId);
  chatBodies.push(body);

  function send_message(text){
    if(!text || !text.trim()) return;
    body.appendChild(createMsgEl(escapeHtml(text), 'user'));
    body.scrollTop = body.scrollHeight;
    input.value = '';
    const typingEl = document.createElement('div');
    typingEl.className = 'typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(typingEl);
    body.scrollTop = body.scrollHeight;
    setTimeout(() => {
      typingEl.remove();
      const res = processMessage(text);
      const msgEl = createMsgEl(res.text, 'bot');
      body.appendChild(msgEl);
      if(res.quick && res.quick.length){
        createQuickReplies(body, res.quick, send_message);
      }
      body.scrollTop = body.scrollHeight;
    }, 180 + Math.random()*150);
  }

  send.addEventListener('click', () => send_message(input.value));
  input.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); send_message(input.value); } });

  return send_message;
}

const sendInline = registerChatSurface('chatBodyInline','chatInputInline','chatSendInline');
const sendWidget = registerChatSurface('chatBodyWidget','chatInputWidget','chatSendWidget');

// seed initial greeting in both surfaces
[ ['chatBodyInline'], ['chatBodyWidget'] ].forEach(([id]) => {
  const body = document.getElementById(id);
  body.appendChild(createMsgEl("Hi! I'm Buddy 👋 Ask me things like <b>“What is my nearest stop?”</b> or <b>“Bus to school”</b> — I'll do my best to help.", 'bot'));
});

$all('.chip-prompt').forEach(btn => {
  btn.addEventListener('click', () => {
    const prompt = btn.dataset.prompt;
    // route to whichever surface is most relevant: widget if open, else inline
    if($('#chatWidget').classList.contains('open')) sendWidget(prompt);
    else sendInline(prompt);
  });
});

/* Floating widget open/close */
function openChat(){
  $('#chatWidget').classList.add('open');
  $('#chatWidget').setAttribute('aria-hidden','false');
  $('#chatFab').setAttribute('aria-expanded','true');
  setTimeout(()=>$('#chatInputWidget').focus(), 200);
}
function closeChat(){
  $('#chatWidget').classList.remove('open');
  $('#chatWidget').setAttribute('aria-hidden','true');
  $('#chatFab').setAttribute('aria-expanded','false');
}
$('#chatFab').addEventListener('click', () => {
  $('#chatWidget').classList.contains('open') ? closeChat() : openChat();
});
$('#chatCloseBtn').addEventListener('click', closeChat);
$('#navChatLink').addEventListener('click', (e)=>{ e.preventDefault(); document.getElementById('chat').scrollIntoView({behavior:'smooth'}); });
$('#footerChatLink').addEventListener('click', (e)=>{ e.preventDefault(); openChat(); });
$('#bottomNavChat').addEventListener('click', openChat);

/* ============================= NAV / SCROLL EFFECTS (rAF-throttled) ============================= */
const navEl = $('#siteNav');
let scrollTicking = false;
function onScrollFrame(){
  navEl.classList.toggle('scrolled', window.scrollY > 30);
  updateRail();
  updateBottomNavActive();
  scrollTicking = false;
}
window.addEventListener('scroll', () => {
  if(!scrollTicking){
    requestAnimationFrame(onScrollFrame);
    scrollTicking = true;
  }
}, {passive:true});

$all('.bottom-nav button[data-scroll]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector(btn.dataset.scroll).scrollIntoView({behavior:'smooth'});
  });
});
function updateBottomNavActive(){
  const sections = ['#top','#planner','#nearest','#arrivals'];
  let current = sections[0];
  sections.forEach(id => {
    const el = document.querySelector(id);
    if(el && el.getBoundingClientRect().top < 140) current = id;
  });
  $all('.bottom-nav button[data-scroll]').forEach(b => b.classList.toggle('active', b.dataset.scroll === current));
}

/* route rail progress */
const railPath = document.getElementById('railTrack');
let railLen = 800;
function updateRail(){
  const doc = document.documentElement;
  const scrolled = doc.scrollTop;
  const max = doc.scrollHeight - doc.clientHeight;
  const pct = max > 0 ? Math.min(1, scrolled/max) : 0;
  const fill = document.getElementById('railFill');
  const bus = document.getElementById('railBus');
  if(fill){
    fill.style.strokeDashoffset = String(railLen - railLen*pct);
  }
  if(bus){
    bus.setAttribute('cy', String(pct*800));
  }
}

/* scroll-triggered animation */
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if(entry.isIntersecting){ entry.target.classList.add('in-view'); io.unobserve(entry.target); }
  });
}, {threshold:0.12});
$all('[data-animate]').forEach(el => io.observe(el));

/* ============================= INIT ============================= */
function init(){
  seedArrivals();
  renderArrivalBoard();
  renderRoutesGrid();
  renderNearestCard();
  renderStopList();
  renderMap();
  renderSavedChips();
  updateBottomNavActive();
  railLen = document.getElementById('railFill').getTotalLength ? document.getElementById('railFill').getTotalLength() : 800;
  updateRail();
}
init();

})();