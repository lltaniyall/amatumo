let player,ready=false,currentTime=0;
const $=s=>document.querySelector(s);
const date=location.pathname.split("/").filter(Boolean).pop();
const archive=ARCHIVES.find(a=>a.date===date);

const fmt=x=>{
  x=Math.floor(x||0);
  let h=Math.floor(x/3600),m=Math.floor(x%3600/60),s=x%60;
  return h
    ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
    : `${m}:${String(s).padStart(2,"0")}`;
};

if(!archive){
  document.body.innerHTML="<p style='padding:40px;color:white'>Archive not found.</p>";
  throw new Error("Archive not found");
}

$("#dateLabel").textContent=archive.date;
$("#archiveTitle").textContent=archive.title;
$("#meta").textContent=`${archive.songs.filter(s=>s.type==="song").length} SONGS`;
$("#footDate").textContent=archive.date;

$("#tracks").innerHTML=archive.songs.map(s=>
  `<button class="track" data-t="${s.time}">
    <span class="time">${fmt(s.time)}</span>
    <span class="trackInfo">
      <span class="trackTitle">${s.title}</span>
      ${s.type==="song"&&s.artist?`<span class="trackArtist"> / ${s.artist}</span>`:""}
    </span>
  </button>`
).join("");

document.querySelectorAll(".track").forEach(b=>{
  b.onclick=()=>seek(+b.dataset.t,true);
});

function seek(t,play=false){
  currentTime=t;
  if(!ready)return;
  player.seekTo(t,true);
  if(play)player.playVideo();
  history.replaceState(null,"",`?t=${t}`);
}

function onYouTubeIframeAPIReady(){
  const t=+new URLSearchParams(location.search).get("t")||0;
  currentTime=t;
  player=new YT.Player("player",{
    videoId:archive.videoId,
    playerVars:{rel:0,start:t},
    events:{
      onReady:()=>{
        ready=true;
        if(t)player.seekTo(t,true);
        setInterval(update,1000);
      }
    }
  });
}

function update(){
  if(!ready)return;
  let n=player.getCurrentTime();
  currentTime=n;
  $("#clock").textContent=fmt(n);

  let idx=0;
  archive.songs.forEach((s,i)=>{
    if(n>=s.time)idx=i;
  });

  document.querySelectorAll(".track").forEach((e,i)=>
    e.classList.toggle("active",i===idx)
  );
}

function getYouTubeShareUrl(seconds){
  const base=`https://www.youtube.com/watch?v=${encodeURIComponent(archive.videoId)}`;
  return seconds>0 ? `${base}&t=${seconds}s` : base;
}

async function copyText(text){
  if(navigator.clipboard && window.isSecureContext){
    await navigator.clipboard.writeText(text);
    return true;
  }

  const ta=document.createElement("textarea");
  ta.value=text;
  ta.setAttribute("readonly","");
  ta.style.position="fixed";
  ta.style.opacity="0";
  ta.style.pointerEvents="none";
  document.body.appendChild(ta);
  ta.select();

  let ok=false;
  try{
    ok=document.execCommand("copy");
  }finally{
    ta.remove();
  }

  if(!ok)throw new Error("copy failed");
  return true;
}

let toastTimer;
function showToast(message,type="success"){
  let toast=document.getElementById("toast");

  if(!toast){
    toast=document.createElement("div");
    toast.id="toast";
    toast.className="toast";
    toast.setAttribute("role","status");
    toast.setAttribute("aria-live","polite");
    document.body.appendChild(toast);
  }

  toast.className=`toast ${type}`;
  toast.textContent=message;

  requestAnimationFrame(()=>{
    toast.classList.add("show");
  });

  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{
    toast.classList.remove("show");
  },2600);
}

$("#share").onclick=async()=>{
  const t=ready ? Math.floor(player.getCurrentTime()) : Math.floor(currentTime||0);
  const url=getYouTubeShareUrl(t);

  try{
    await copyText(url);
    showToast(
      t>0
        ? "現在位置のYouTubeリンクをコピーしました。"
        : "YouTubeアーカイブのリンクをコピーしました。"
    );
  }catch{
    showToast("リンクをコピーできませんでした。","error");
  }
};

let tag=document.createElement("script");
tag.src="https://www.youtube.com/iframe_api";
document.head.appendChild(tag);
