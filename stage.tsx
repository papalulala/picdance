// @ts-nocheck
"use client";
import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {dancerMotion} from './motion.mjs';
export function Stage({works,serverOffset,energy,enterAR,resetView,onAR,onStatus}){
 const host=useRef(null),state=useRef(null),latest=useRef(works);latest.current=works;const offsetRef=useRef(serverOffset);offsetRef.current=serverOffset;
 useEffect(()=>{
  const el=host.current;let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{onStatus('這台裝置無法開啟 3D，請使用支援 WebGL 的瀏覽器。');onAR('AR 不支援');return;}
  let alive=true;renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.xr.enabled=true;el.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e5e9dc');const camera=new THREE.PerspectiveCamera(38,1,.01,400);camera.position.set(36,32,47);const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,-1);controls.enableDamping=true;controls.minDistance=16;controls.maxDistance=100;controls.maxPolarAngle=Math.PI*.47;controls.enablePan=false;
  const root=new THREE.Group();scene.add(root);scene.add(new THREE.HemisphereLight(0xffffec,0x668475,2.8));const sun=new THREE.DirectionalLight(0xfff1da,3);sun.position.set(-20,35,20);scene.add(sun);
  const dancers=new Map(),loader=new THREE.TextureLoader();const s={root,dancers,loader};state.current=s;
  function dispose(o){o.traverse?.(m=>{m.geometry?.dispose();for(const material of (Array.isArray(m.material)?m.material:[m.material])){material?.map?.dispose();material?.dispose()}})}
  function sync(){
   const desired=new Set(latest.current.map(w=>w.id));for(const [id,d] of dancers)if(!desired.has(id)){root.remove(d.mesh);dispose(d.mesh);dancers.delete(id);}
   for(const w of latest.current){
    if(dancers.has(w.id))continue;
    const uniforms={waveTime:{value:0},waveStrength:{value:.12}};
    const material=new THREE.MeshBasicMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,alphaTest:.01});
    material.onBeforeCompile=shader=>{
     shader.uniforms.waveTime=uniforms.waveTime;shader.uniforms.waveStrength=uniforms.waveStrength;
     shader.vertexShader='uniform float waveTime;\nuniform float waveStrength;\n'+shader.vertexShader;
     shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float sway = sin(uv.y * 7.5 - waveTime);
      float weight = 0.25 + uv.y * 0.75;
      transformed.x += sway * waveStrength * weight;
      transformed.z += cos(uv.y * 7.5 - waveTime) * waveStrength * 0.4;
      transformed.y += sin(uv.x * 6.0 + waveTime) * waveStrength * 0.16;`);
    };
    material.customProgramCacheKey=()=> 'picdance-wave-v1';
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.25,16,24),material);
    mesh.frustumCulled=false;root.add(mesh);
    const d={mesh,uniforms,createdAt:w.createdAt,sequence:w.seq};dancers.set(w.id,d);
    loader.load(w.image,tex=>{if(!alive||!dancers.has(w.id)){tex.dispose();return}tex.colorSpace=THREE.SRGBColorSpace;material.map=tex;material.needsUpdate=true;},undefined,()=>{if(alive)onStatus('部分作品載入失敗，請重新整理。')});
   }
  }
  new GLTFLoader().load(new URL('./chiayi-v3.glb',document.baseURI).href,g=>{if(!alive){dispose(g.scene);return}root.add(g.scene);onStatus('');},undefined,()=>{if(alive)onStatus('小鎮載入失敗，請重新整理再試。')});
  const resize=()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()};resize();const ro=new ResizeObserver(resize);ro.observe(el);
  resetView.current=()=>{if(renderer.xr.isPresenting)return;camera.position.set(36,32,47);controls.target.set(0,1,-1);controls.update()};
  let session=null,hitSource=null,reference=null,placed=false;const reticle=new THREE.Mesh(new THREE.RingGeometry(.08,.10,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xdee9ae}));reticle.matrixAutoUpdate=false;reticle.visible=false;scene.add(reticle);
  async function startAR(){
   if(!navigator.xr)throw Error();session=await navigator.xr.requestSession('immersive-ar',{optionalFeatures:['hit-test','dom-overlay'],domOverlay:{root:document.body}});document.body.classList.add('ar-mode');controls.enabled=false;scene.background=null;root.scale.setScalar(.025);root.position.set(0,-.4,-1.25);placed=false;await renderer.xr.setSession(session);reference=await session.requestReferenceSpace('local');try{const view=await session.requestReferenceSpace('viewer');hitSource=await session.requestHitTestSource({space:view})}catch{}
   session.addEventListener('select',()=>{if(reticle.visible){root.position.setFromMatrixPosition(reticle.matrix);placed=true;reticle.visible=false;onStatus('');}});
   session.addEventListener('end',()=>{document.body.classList.remove('ar-mode');hitSource?.cancel();hitSource=null;session=null;root.scale.setScalar(1);root.position.set(0,0,0);reticle.visible=false;scene.background=new THREE.Color('#e5e9dc');controls.enabled=true;resetView.current?.();onStatus('');onAR('開啟 AR')},{once:true});onStatus('移動手機尋找平面，點一下放置木都。');
  }
  enterAR.current=null;onAR('AR 不支援');if(navigator.xr&&window.isSecureContext)navigator.xr.isSessionSupported('immersive-ar').then(ok=>{if(!alive)return;if(ok){enterAR.current=startAR;onAR('開啟 AR')}else onAR('此裝置不支援 AR')});
  let lastSync=0;renderer.setAnimationLoop((t,frame)=>{if(!alive)return;if(t-lastSync>150){sync();lastSync=t;}if(!renderer.xr.isPresenting)controls.update();else if(frame&&hitSource&&!placed){const hits=frame.getHitTestResults(hitSource);reticle.visible=!!hits.length;if(hits[0])reticle.matrix.fromArray(hits[0].getPose(reference).transform.matrix);}
   for(const d of dancers.values()){
    const age=Math.max(0,(Date.now()+offsetRef.current-d.createdAt)/1000),e=energy.current;
    const motion=dancerMotion(d.sequence,age,e);
    d.mesh.position.set(motion.x,motion.y,motion.z);
    d.uniforms.waveTime.value=motion.waveTime;d.uniforms.waveStrength.value=motion.waveStrength;
    const fade=Math.min(1,age*3,Math.max(0,(60-age)*2));
    d.mesh.scale.setScalar(fade*(1+Math.sin(age*5+d.sequence)*e*.1));
    d.mesh.quaternion.copy(renderer.xr.isPresenting?renderer.xr.getCamera().quaternion:camera.quaternion);
    d.mesh.rotateZ(motion.roll);
   }renderer.render(scene,camera);});
  return()=>{alive=false;document.body.classList.remove('ar-mode');session?.end();ro.disconnect();renderer.setAnimationLoop(null);controls.dispose();dispose(root);dispose(reticle);renderer.dispose();renderer.domElement.remove();enterAR.current=null;resetView.current=null;state.current=null;};
 },[]);
 return <div className="stage-canvas" ref={host}/>;
}




