let enginePromise;
export function loadSpatialEngine(){
 if(window.XR8)return Promise.resolve(window.XR8);
 if(enginePromise)return enginePromise;
 enginePromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/@8thwall/engine-binary@1.0.0/dist/xr.js';script.async=true;script.crossOrigin='anonymous';
  const done=()=>{clearTimeout(timer);window.removeEventListener('xrloaded',ready)};
  const ready=()=>{done();resolve(window.XR8)};
  const timer=setTimeout(()=>{done();script.remove();enginePromise=null;reject(Error('追蹤引擎載入逾時，請確認網路後重試。'))},45000);
  window.addEventListener('xrloaded',ready,{once:true});script.onerror=()=>{done();enginePromise=null;reject(Error('追蹤引擎載入失敗，請確認網路。'))};document.head.appendChild(script);
 });return enginePromise;
}
// XR Engine Copyright © 2026 Niantic Spatial, Inc. See XR-LICENSE.txt.
export async function startSpatialTracking({THREE,host,root,scene,camera,controls,onStatus,onStop}){
 const XR8=await loadSpatialEngine();await XR8.loadChunk('slam');
 const feed=document.createElement('canvas');feed.className='spatial-feed';host.prepend(feed);
 const bar=document.createElement('div');bar.className='spatial-controls';
 const reset=document.createElement('button');reset.textContent='重設大小與方向';reset.disabled=true;
 const instructions=document.createElement('span');instructions.className='spatial-gesture-hint';instructions.textContent='放置後：雙指捏合縮放・雙指轉動旋轉';
 const place=document.createElement('button'),exit=document.createElement('button'),credit=document.createElement('a');
 place.textContent='在畫面中央放置木都';exit.textContent='退出 AR';credit.textContent='Niantic Spatial · 授權';credit.href='./XR-LICENSE.txt';credit.target='_blank';bar.append(place,reset,exit,instructions,credit);document.body.append(bar);
 let active=true,placed=false,normal=false,hasPose=false,lastHint='',timer;
 const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const modelScale=.75/Math.max(size.x,size.z,1);
 const pivot=new THREE.Vector3(center.x,bounds.min.y,center.z),anchor=new THREE.Vector3();
 let scaleFactor=1,yaw=0,gesture=null;
 function transform(){root.scale.setScalar(modelScale*scaleFactor);root.rotation.set(0,yaw,0);root.position.copy(anchor).sub(pivot.clone().multiplyScalar(modelScale*scaleFactor).applyQuaternion(root.quaternion))}
 function pair(touches){const dx=touches[1].clientX-touches[0].clientX,dy=touches[1].clientY-touches[0].clientY;return {distance:Math.hypot(dx,dy),angle:Math.atan2(dy,dx)}}
 function beginGesture(e){if(!placed||e.touches.length!==2){gesture=null;return}e.preventDefault();const p=pair(e.touches);gesture=p.distance>5?{...p,scale:scaleFactor,yaw}:null}
 function moveGesture(e){if(!placed||e.touches.length!==2){gesture=null;return}e.preventDefault();if(!gesture){beginGesture(e);return}const p=pair(e.touches);scaleFactor=Math.min(4,Math.max(.2,gesture.scale*p.distance/gesture.distance));const delta=p.angle-gesture.angle;yaw=gesture.yaw+Math.atan2(Math.sin(delta),Math.cos(delta));transform()}
 function endGesture(e){gesture=null;if(e.touches.length===2)beginGesture(e)}
 host.addEventListener('touchstart',beginGesture,{passive:false});host.addEventListener('touchmove',moveGesture,{passive:false});host.addEventListener('touchend',endGesture);host.addEventListener('touchcancel',endGesture);
 reset.onclick=()=>{scaleFactor=1;yaw=0;gesture=null;if(placed)transform()};
 const hint=text=>{if(lastHint!==text){lastHint=text;onStatus(text)}};
 const initialProjection=camera.projectionMatrix.clone();
 root.visible=false;root.scale.setScalar(modelScale);controls.enabled=false;scene.background=null;document.body.classList.add('ar-mode');
 function stop(){if(!active)return;active=false;clearTimeout(timer);XR8.stop();XR8.clearCameraPipelineModules();feed.remove();bar.remove();host.removeEventListener('pointerup',tap);host.removeEventListener('touchstart',beginGesture);host.removeEventListener('touchmove',moveGesture);host.removeEventListener('touchend',endGesture);host.removeEventListener('touchcancel',endGesture);root.visible=true;root.scale.setScalar(1);root.position.set(0,0,0);root.quaternion.identity();camera.projectionMatrix.copy(initialProjection);camera.projectionMatrixInverse.copy(initialProjection).invert();scene.background=new THREE.Color('#e5e9dc');controls.enabled=true;document.body.classList.remove('ar-mode');onStatus('');onStop();}
 function placeAt(x=.5,y=.5){
  if(!hasPose){hint('相機正在建立定位，請慢慢移動手機，稍後再按放置。');return}
  let hits=[];if(normal)try{hits=XR8.XrController.hitTest(x,y)||[]}catch{}
  const hit=hits.find(h=>h.position&&Number.isFinite(h.position.x)&&Number.isFinite(h.position.y)&&Number.isFinite(h.position.z)&&h.distance!==0);
  if(hit){anchor.copy(hit.position);hint('木都已放置，可以移動手機觀看。小舞者持續即時跳舞。')}
  else{camera.updateMatrixWorld(true);const point=new THREE.Vector3((x-.5)*2,(.5-y)*2,.5).unproject(camera);point.sub(camera.position).normalize().multiplyScalar(1.25).add(camera.position);anchor.copy(point);hint('已放在前方約一公尺的位置（手動定位）。仍會追蹤手機移動，可按「重新放置」調整。')}
  transform();root.visible=true;placed=true;reset.disabled=false;place.textContent='重新放置';
 }
 function tap(e){if(placed)return;const b=host.getBoundingClientRect();placeAt((e.clientX-b.left)/b.width,(e.clientY-b.top)/b.height)}
 place.onclick=()=>placeAt();exit.onclick=stop;host.addEventListener('pointerup',tap);
 XR8.XrController.configure({disableWorldTracking:false,scale:'absolute'});
 XR8.addCameraPipelineModules([XR8.GlTextureRenderer.pipelineModule(),XR8.XrController.pipelineModule(),{
  name:'picdance-spatial',
  onStart:()=>{clearTimeout(timer);camera.position.set(0,0,0);camera.quaternion.identity();XR8.XrController.updateCameraProjectionMatrix({origin:camera.position,facing:camera.quaternion});hint('將鏡頭朝向桌面或地面，慢慢移動手機建立追蹤。')},
  onCanvasSizeChange:({canvasWidth,canvasHeight})=>{feed.width=canvasWidth;feed.height=canvasHeight},
  onUpdate:({processCpuResult})=>{
   if(!active)return;const pose=processCpuResult.reality;if(!pose)return;
   if(!pose.position||!pose.rotation||!pose.intrinsics||pose.intrinsics.length!==16||!Array.from(pose.intrinsics).every(Number.isFinite))return;
   if(![pose.position.x,pose.position.y,pose.position.z,pose.rotation.x,pose.rotation.y,pose.rotation.z,pose.rotation.w].every(Number.isFinite))return;
   normal=pose.trackingStatus==='NORMAL';
   if(normal||!hasPose){camera.position.copy(pose.position);camera.quaternion.copy(pose.rotation);camera.projectionMatrix.fromArray(pose.intrinsics);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();hasPose=true}
   root.visible=placed;
   if(!normal)hint(placed?'定位暫時不穩，已保留木都。請慢慢移動手機，對準剛才的位置。':'慢慢移動手機建立追蹤；也可按「在畫面中央放置木都」手動定位。');
   else if(!placed)hint('已找到定位點，可按「在畫面中央放置木都」，或點選桌面放置。');
  },
  onCameraStatusChange:({status})=>{if(status==='failed'){stop();onStatus('相機無法開啟，請允許相機權限，並使用 Safari 或 Chrome。')}},
  onException:()=>{stop();onStatus('空間追蹤無法啟動，請重新整理，並使用手機 Safari 或 Chrome。')}
 }]);
 try{timer=setTimeout(()=>{stop();onStatus('相機啟動逾時，請確認相機權限後重試。')},30000);XR8.run({canvas:feed,webgl2:true,allowedDevices:XR8.XrConfig.device().MOBILE_AND_HEADSETS});}catch(e){stop();throw e}
 return stop;
}
