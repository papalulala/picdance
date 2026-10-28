"use client";
import {useEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import {Stage} from './stage';
type Artwork={id:string;image:string;createdAt:number;seq:number};
const colors=['#203e31','#ffffff','#ed684a','#e4b54e','#65a088','#6a91b6','#9977a9','#714d32'];
function TitleFireflies(){
 const [dots,setDots]=useState<{id:number;x:number;y:number;size:number;drift:number;duration:number}[]>([]);
 useEffect(()=>{
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');let timer:ReturnType<typeof setTimeout>;let id=0;
  const spawn=()=>{if(!motion.matches){const dot={id:++id,x:5+Math.random()*90,y:24+Math.random()*55,size:(1.5+Math.random())*3,drift:(Math.random()-.5)*9,duration:1.8+Math.random()*1.2};setDots(previous=>[...previous.slice(-3),dot]);}timer=setTimeout(spawn,700+Math.random()*1300);};
  timer=setTimeout(spawn,500);return()=>clearTimeout(timer);
 },[]);
 return <span className="title-fireflies" aria-hidden="true">{dots.map(dot=><i key={dot.id} className="title-firefly" style={{left:dot.x+'%',top:dot.y+'%',width:dot.size,height:dot.size,'--firefly-drift':dot.drift+'px',animationDuration:dot.duration+'s'} as CSSProperties}/>)}</span>;
}
export default function Page(){
 const canvas=useRef<HTMLCanvasElement>(null),drawing=useRef(false),last=useRef<{x:number,y:number}|null>(null),history=useRef<ImageData[]>([]),pendingId=useRef<string|null>(null),sendLock=useRef(false),lastSubmittedImage=useRef<string|null>(null);
 const [color,setColor]=useState(colors[0]),[size,setSize]=useState(9),[eraser,setEraser]=useState(false),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[works,setWorks]=useState<Artwork[]>([]),[online,setOnline]=useState(false),[room,setRoom]=useState('chiayi'),[clock,setClock]=useState(0),[now,setNow]=useState(Date.now()),[help,setHelp]=useState(false),[panel,setPanel]=useState(true),[audioName,setAudioName]=useState(''),[playing,setPlaying]=useState(false),[arStatus,setArStatus]=useState('正在檢查 AR'),[sceneStatus,setSceneStatus]=useState('正在走進木都…');
 const [submitted,setSubmitted]=useState(false);
 const energy=useRef(0),audioRef=useRef<HTMLAudioElement|null>(null),audioCtx=useRef<AudioContext|null>(null),analyser=useRef<AnalyserNode|null>(null),enterAR=useRef<null|(()=>Promise<void>)>(null),resetView=useRef<null|(()=>void)>(null),audioUrl=useRef('');
 useEffect(()=>{const q=new URLSearchParams(location.search).get('room');if(q&&/^[a-zA-Z0-9_-]{1,32}$/.test(q))setRoom(q);const c=canvas.current!;const ctx=c.getContext('2d')!;ctx.lineCap='round';ctx.lineJoin='round';return()=>{audioRef.current?.pause();if(audioUrl.current)URL.revokeObjectURL(audioUrl.current);audioCtx.current?.close();};},[]);
 function accept(data:any){if(!Array.isArray(data.artworks))throw Error();setWorks(data.artworks);setClock(data.serverTime-Date.now());setOnline(true);}
 useEffect(()=>{let active=true,inflight=false;const controller=new AbortController();async function poll(){if(inflight)return;inflight=true;try{const r=await fetch('https://picdance.easyflame18.chatgpt.site/api/artworks?room='+encodeURIComponent(room),{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error();const data=await r.json();if(active)accept(data);}catch{if(active)setOnline(false);}finally{inflight=false;}}poll();const id=setInterval(poll,1200);return()=>{active=false;controller.abort();clearInterval(id)}},[room]);
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(id)},[]);
 useEffect(()=>{let frame=0;function tick(){if(analyser.current&&playing){const a=new Uint8Array(analyser.current.frequencyBinCount);analyser.current.getByteFrequencyData(a);energy.current=a.slice(0,24).reduce((a,b)=>a+b,0)/(24*255);}else energy.current=0;frame=requestAnimationFrame(tick);}tick();return()=>cancelAnimationFrame(frame)},[playing]);
 const visible=works.filter(w=>w.createdAt+180000>now+clock);
 function point(e:React.PointerEvent<HTMLCanvasElement>){const b=e.currentTarget.getBoundingClientRect();return{x:(e.clientX-b.left)*512/b.width,y:(e.clientY-b.top)*512/b.height};}
 function snapshot(){const ctx=canvas.current!.getContext('2d')!;history.current.push(ctx.getImageData(0,0,512,512));if(history.current.length>20)history.current.shift();pendingId.current=null;}
 function stroke(e:React.PointerEvent<HTMLCanvasElement>,start=false){if(busy||sendLock.current)return;const ctx=e.currentTarget.getContext('2d')!,p=point(e);if(start){snapshot();drawing.current=true;e.currentTarget.setPointerCapture(e.pointerId);last.current=p;}if(!drawing.current)return;ctx.globalCompositeOperation=eraser?'destination-out':'source-over';ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=size;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(last.current!.x,last.current!.y);ctx.lineTo(p.x,p.y);ctx.stroke();if(start){ctx.beginPath();ctx.arc(p.x,p.y,size/2,0,Math.PI*2);ctx.fill();}last.current=p;setDirty(true);setSubmitted(false);}
 function recalc(){const d=canvas.current!.getContext('2d')!.getImageData(0,0,512,512).data;setDirty(d.some((v,i)=>i%4===3&&v>0));}
 function undo(){const image=history.current.pop();if(image){canvas.current!.getContext('2d')!.putImageData(image,0,0);pendingId.current=null;setSubmitted(false);recalc();}}
 function clear(){snapshot();canvas.current!.getContext('2d')!.clearRect(0,0,512,512);setDirty(false);setSubmitted(false);}
 async function send(){
  if(!dirty||submitted||sendLock.current||drawing.current)return;sendLock.current=true;setBusy(true);setMessage('');
  try{
   const small=document.createElement('canvas');small.width=small.height=256;small.getContext('2d')!.drawImage(canvas.current!,0,0,256,256);const image=small.toDataURL('image/png');
   if(image.length>130000)throw Error('這張畫的細節太多，請簡化後再送出。');
   if(image===lastSubmittedImage.current){setSubmitted(true);setMessage('這張作品已送出，修改畫作後才能再次送出。');return}
   const id=pendingId.current??crypto.randomUUID();pendingId.current=id;
   const r=await fetch('https://picdance.easyflame18.chatgpt.site/api/artworks?room='+encodeURIComponent(room),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,image})});const data:any=await r.json();
   if(!r.ok)throw Error(data.error||'送出失敗，請再試一次。');accept(data);lastSubmittedImage.current=image;setSubmitted(true);
   setMessage(data.duplicate?'這張作品已在木都中，沒有重複加入。':'你的作品已加入木都，一起跳舞吧！修改畫作後可再次送出。');
  }catch(e:any){setMessage(e.message||'連線中斷，畫作已保留。');}finally{sendLock.current=false;setBusy(false)}
 }
 async function loadAudio(file:File){if(!file)return;audioRef.current?.pause();if(audioUrl.current)URL.revokeObjectURL(audioUrl.current);audioUrl.current=URL.createObjectURL(file);if(!audioRef.current){const audio=new Audio();audioRef.current=audio;audio.onended=()=>setPlaying(false);audio.onerror=()=>{setPlaying(false);setMessage('無法播放這個音樂檔案，請換一個。')};}audioRef.current.src=audioUrl.current;setAudioName(file.name);setPlaying(false);}
 async function toggleAudio(){if(!audioRef.current){setMessage('先選擇一個音樂檔案，作品就能跟著節奏跳舞。');return}try{if(playing){audioRef.current.pause();setPlaying(false);return}if(!audioCtx.current){audioCtx.current=new AudioContext();analyser.current=audioCtx.current.createAnalyser();analyser.current.fftSize=256;audioCtx.current.createMediaElementSource(audioRef.current).connect(analyser.current);analyser.current.connect(audioCtx.current.destination);}await audioCtx.current.resume();await audioRef.current.play();setPlaying(true);}catch{setMessage('音樂播放失敗，請重新選擇音樂。')}}
 return <main>
  <svg className="lettering-filters" width="0" height="0" aria-hidden="true" focusable="false"><defs><filter id="mudu-title-wave" x="-10%" y="-20%" width="120%" height="140%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.004" numOctaves="1" seed="4" result="title-noise"><animate attributeName="baseFrequency" values="0.012 0.004;0.018 0.006;0.012 0.004" dur="6s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="title-noise" scale="3" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>
  <div className="scene"><Stage works={visible} serverOffset={clock} energy={energy} enterAR={enterAR} resetView={resetView} onAR={setArStatus} onStatus={setSceneStatus}/></div>
  <header><a className="brand brand-headline" href="./" aria-label="木都繪舞"><span className="brand-title-text" aria-hidden="true" /><TitleFireflies/></a><div className="room"><i className={online?'live':''}/>{online?'共同場景已連線':'正在連接共同場景'}<b>嘉義木都</b></div><button className="round" onClick={()=>setHelp(true)} aria-label="玩法說明">?</button></header>
  <section className="intro"><div className="eyebrow">CHIAYI · A LITTLE CITY OF IMAGINATION</div><h1 className="sr-only">木都繪舞</h1><p className="tagline-lettering"><span className="sr-only">一筆想像，三分鐘的相遇。</span><span className="tagline-art" aria-hidden="true"/></p><div className="count"><span className="pulse"/>{visible.length}<small> / 50 位小小舞者</small></div></section>
  <aside className={'draw-panel '+(!panel?'collapsed':'')}><div className="panel-heading"><div><span className="eyebrow">YOUR LITTLE DANCER</span><h2>今天，想畫什麼？</h2></div><button className="text-button" onClick={()=>setPanel(!panel)}>{panel?'收起':'開始畫畫 ↗'}</button></div><div className="panel-content"><div className="canvas-wrap"><canvas ref={canvas} width={512} height={512} aria-label="自由繪圖板" onPointerDown={e=>stroke(e,true)} onPointerMove={e=>stroke(e)} onPointerUp={()=>{drawing.current=false;last.current=null;recalc()}} onPointerCancel={()=>{drawing.current=false;last.current=null;recalc()}}/>{!dirty&&<div className="canvas-hint"><span>✳</span>在這裡畫下你的想像<small>滑鼠或手指都可以</small></div>}</div>
  <div className="palette">{colors.map(c=><button key={c} aria-label={'畫筆顏色 '+c} aria-pressed={!eraser&&color===c} style={{background:c}} className={!eraser&&color===c?'selected':''} onClick={()=>{setColor(c);setEraser(false)}} disabled={busy}/>)}</div>
  <div className="tools"><label>筆刷大小 <input aria-label="筆刷大小" type="range" min="3" max="32" value={size} onChange={e=>setSize(+e.target.value)} disabled={busy}/></label><button className={eraser?'active':''} onClick={()=>setEraser(!eraser)} disabled={busy} aria-pressed={eraser}>橡皮擦</button><button onClick={undo} disabled={busy||!history.current.length}>復原</button><button onClick={clear} disabled={busy||!dirty}>清空</button></div>
  <button className="send" disabled={!dirty||busy||submitted||!online} onClick={send}>{busy?'正在走進木都…':submitted?'已送出':'送進木都，開始跳舞'}<span>↗</span></button><p className="fine">停留 180 秒 · 滿 50 張時，最早的作品先離場</p><div className="message" role="status">{message}</div></div></aside>
  {!online&&<div className="connection" role="status">共同場景暫未連線。你可以先畫畫，連線後再送出。</div>}
  <footer><div className="audio"><button className={'play '+(playing?'on':'')} onClick={toggleAudio} aria-label={playing?'暫停音樂':'播放音樂'}>{playing?'Ⅱ':'▶'}</button><label className="music-picker"><strong>{audioName||'為木都加一點節奏'}</strong><span>{audioName?'更換音樂 · 僅在這台裝置播放':'選擇音樂 · 跟著節拍跳舞'}</span><input type="file" accept="audio/*" onChange={e=>e.target.files?.[0]&&loadAudio(e.target.files[0])}/></label></div><div className="view-tools"><button onClick={()=>resetView.current?.()}>重設視角</button><button disabled={!enterAR.current} onClick={()=>enterAR.current?.().catch(()=>setMessage('AR 開啟失敗，請確認相機權限與裝置支援。'))}>{arStatus}</button></div></footer>
  {sceneStatus&&<div className="scene-status" role="status">{sceneStatus}</div>}
  {help&&<div className="modal" onClick={()=>setHelp(false)}><article role="dialog" aria-modal="true" aria-label="玩法說明" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setHelp(false)} aria-label="關閉說明">×</button><span className="eyebrow">WELCOME TO PICDANCE</span><h2>讓你的想像，<br/>在木都相遇。</h2><ol><li>用畫筆畫一個角色、圖形或心情。</li><li>按「送進木都」，所有人都能看到你的作品。</li><li>作品停留約 180 秒；場景滿 50 張時，最早的作品先離場。</li></ol><p>拖曳旋轉小鎮，滾輪或雙指縮放。音樂由本機選擇與播放；沒有音樂時也會輕輕擺動。</p><p>AR：請用 iPhone Safari 或 Android Chrome，允許相機權限後，慢慢移動手機掃描環境，再點選桌面或地面放置木都。放置後，單指左右拖曳可旋轉、雙指捏合可縮放；可按「重設大小與方向」恢復。小舞者會繼續跳舞與同步；按「重新放置」可選擇新位置。光線不足或表面缺少紋理時，追蹤可能不穩。</p><button className="send" onClick={()=>setHelp(false)}>開始畫畫 ↗</button></article></div>}
 </main>
}








