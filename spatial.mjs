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
 const place=document.createElement('button'),exit=document.createElement('button'),credit=document.createElement('a');
 place.textContent='點選畫面放置木都';exit.textContent='退出 AR';credit.textContent='Niantic Spatial · 授權';credit.href='./XR-LICENSE.txt';credit.target='_blank';bar.append(place,exit,credit);document.body.append(bar);
 let active=true,placed=false,normal=false,lastHint='',timer;
 const hint=text=>{if(lastHint!==text){lastHint=text;onStatus(text)}};
 const initialProjection=camera.projectionMatrix.clone();
 root.visible=false;root.scale.setScalar(.025);controls.enabled=false;scene.background=null;document.body.classList.add('ar-mode');
 function stop(){if(!active)return;active=false;clearTimeout(timer);XR8.stop();XR8.clearCameraPipelineModules();feed.remove();bar.remove();host.removeEventListener('pointerup',tap);root.visible=true;root.scale.setScalar(1);root.position.set(0,0,0);root.quaternion.identity();camera.projectionMatrix.copy(initialProjection);camera.projectionMatrixInverse.copy(initialProjection).invert();scene.background=new THREE.Color('#e5e9dc');controls.enabled=true;document.body.classList.remove('ar-mode');onStatus('');onStop();}
 function tap(e){if(placed||!normal)return;const b=host.getBoundingClientRect();const hits=XR8.XrController.hitTest((e.clientX-b.left)/b.width,(e.clientY-b.top)/b.height,['FEATURE_POINT']);if(!hits.length){hint('此處尚未找到定位點，請慢慢移動手機後再點一次。');return}root.position.copy(hits[0].position);root.visible=true;placed=true;place.textContent='重新放置';hint('木都已放置，可以移動手機觀看。小舞者持續即時跳舞。');}
 place.onclick=()=>{placed=false;root.visible=false;place.textContent='點選畫面放置木都';hint('將鏡頭朝向有紋理的桌面或地面，慢慢移動，再點一下畫面。')};exit.onclick=stop;host.addEventListener('pointerup',tap);
 XR8.XrController.configure({disableWorldTracking:false,scale:'absolute'});
 XR8.addCameraPipelineModules([XR8.GlTextureRenderer.pipelineModule(),XR8.XrController.pipelineModule(),{
  name:'picdance-spatial',
  onStart:()=>{clearTimeout(timer);hint('將鏡頭朝向桌面或地面，慢慢移動手機建立追蹤。')},
  onCanvasSizeChange:({canvasWidth,canvasHeight})=>{feed.width=canvasWidth;feed.height=canvasHeight},
  onUpdate:({processCpuResult})=>{if(!active)return;const pose=processCpuResult.reality;if(!pose)return;camera.position.copy(pose.position);camera.quaternion.copy(pose.rotation);camera.projectionMatrix.fromArray(pose.intrinsics);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();normal=pose.trackingStatus==='NORMAL';if(!normal){root.visible=false;hint('追蹤中斷，請增加光線並慢慢移動手機，對準剛才的位置。')}else{root.visible=placed;hint(placed?'木都已放置，可以移動手機觀看。小舞者持續即時跳舞。':'已找到定位點，點選桌面或地面的位置放置木都。')}},
  onCameraStatusChange:({status})=>{if(status==='failed'){stop();onStatus('相機無法開啟，請允許相機權限，並使用 Safari 或 Chrome。')}},
  onException:()=>{stop();onStatus('空間追蹤無法啟動，請重新整理，並使用手機 Safari 或 Chrome。')}
 }]);
 try{timer=setTimeout(()=>{stop();onStatus('相機啟動逾時，請確認相機權限後重試。')},30000);XR8.run({canvas:feed,webgl2:true,allowedDevices:XR8.XrConfig.device().MOBILE_AND_HEADSETS});}catch(e){stop();throw e}
 return stop;
}
