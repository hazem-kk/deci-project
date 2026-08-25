const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const routes={
 "school":{num:"08",title:"School Link",stop:"Market Stop",path:"Market Stop → School District",eta:"21 min"},
 "city centre":{num:"24",title:"Downtown Express",stop:"Al Azbakeyia Station",path:"Al Azbakeyia Station → City Centre",eta:"3 min"},
 "hospital":{num:"41",title:"North Connector",stop:"Opera Street Stop",path:"Opera Street Stop → Hospital",eta:"14 min"},
 "library":{num:"17",title:"Central Line",stop:"Central Market Stop",path:"Central Market Stop → Library",eta:"8 min"},
 "sports centre":{num:"17",title:"Central Line",stop:"Central Market Stop",path:"Central Market Stop → Sports Centre",eta:"8 min"}
};
function findRoute(q){q=q.toLowerCase();for(const k in routes)if(q.includes(k))return routes[k];return null}
function updateClock(){let d=new Date();$("#liveClock").textContent=d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
setInterval(updateClock,1000);updateClock();

function locationSuccess(){
 $("#locationBtn").textContent="✓ Location enabled";$("#heroLocation").textContent="✓ Location enabled";
 $("#locationStatus").textContent="GPS permission enabled · nearest-stop demo active";
 $("#heroStop").textContent="Nearest stop found near you";
 $("#fromField").textContent="⌖ Your current location";
}
function requestLocation(){if(!navigator.geolocation){alert("This browser does not support location.");return}navigator.geolocation.getCurrentPosition(locationSuccess,()=>alert("Location permission was not granted. The prototype still works with example stops."))}
$("#locationBtn").onclick=requestLocation;$("#heroLocation").onclick=requestLocation;$("#fromField").onclick=requestLocation;

function plan(q){
 q=q.trim()||"City Centre";let r=findRoute(q)||routes["city centre"];
 $("#resultTitle").textContent=r.title;$("#resultPath").textContent=r.path;$("#resultEta").textContent=r.eta;
 $("#journeyResult").scrollIntoView({behavior:"smooth",block:"center"});
}
$("#planBtn").onclick=()=>plan($("#destination").value);
$("#destination").addEventListener("keydown",e=>{if(e.key==="Enter")plan($("#destination").value)});
$$(".suggestions button").forEach(b=>b.onclick=()=>{$("#destination").value=b.dataset.dest;plan(b.dataset.dest)});
$("#swapBtn").onclick=()=>{let d=$("#destination").value;$("#destination").value=d? "My current location":""};

const messages=$("#messages");
function chat(text,type){let d=document.createElement("div");d.className="chat-msg "+type;d.innerHTML=text;messages.appendChild(d);messages.scrollTop=messages.scrollHeight}
function reply(q){
 let x=q.toLowerCase(),r=findRoute(x);
 if(x.includes("nearest")||x.includes("closest")||x.includes("near me"))
  return "📍 Your nearest example stop is <b>Al Azbakeyia Station</b>, about <b>0.4 km</b> away — roughly a <b>5 minute walk</b>. The next example bus is <b>24</b> in about <b>3 minutes</b>.";
 if(x.includes("next bus")||x.includes("when")||x.includes("arrival"))
  return "⏱️ The next example departure at <b>Al Azbakeyia Station</b> is <b>Bus 24</b> in about <b>3 minutes</b>. Bus 17 follows in about 8 minutes.";
 if(r)return "🚌 For <b>"+q+"</b>, I suggest <b>Bus "+r.num+" · "+r.title+"</b>. Board at <b>"+r.stop+"</b>. The example arrival is <b>"+r.eta+"</b>.";
 if(x.includes("safe")||x.includes("accessibility"))
  return "♿ BUSLY highlights accessibility and safety information where reliable data exists. In this prototype, the nearest featured stop is labelled accessible.";
 if(x.includes("how")||x.includes("work"))
  return "BUSLY follows four steps: <b>share location → choose destination → compare arrival → follow the next action</b>.";
 return "I can help with <b>nearest stop</b>, <b>next bus</b>, or a destination like <b>School</b>, <b>City Centre</b>, <b>Hospital</b>, <b>Library</b> or <b>Sports Centre</b>.";
}
function send(){
 let input=$("#chatInput"),q=input.value.trim();if(!q)return;
 chat(q,"user");input.value="";setTimeout(()=>chat(reply(q),"bot"),350);
}
$("#sendBtn").onclick=send;$("#chatInput").addEventListener("keydown",e=>{if(e.key==="Enter")send()});
$$(".quick-chat button").forEach(b=>b.onclick=()=>{$("#chatInput").value=b.textContent==="Get me to school"?"School":b.textContent;send()});
$("#clearChat").onclick=()=>{messages.innerHTML='<div class="chat-msg bot">Chat cleared. 👋 Where would you like to go?</div>'};
$("#refreshStops").onclick=()=>{let b=$("#refreshStops");b.textContent="✓ Updated";setTimeout(()=>b.textContent="↻ Refresh nearby",1200)};
