import * as THREE from 'three';
// A gentle six-minute cycle, starting in the morning. Original compositions
// of light only: dancers keep their existing unlit materials.
const dayKeys=[
 [0,0xffe2b8,2.4,0xffefda,1.7,0x829078,0xe6e5d4],
 [.25,0xfff5e5,3.2,0xf5fbff,1.9,0x708876,0xe5e9dc],
 [.48,0xffac70,2.0,0xffd8bd,1.25,0x71677e,0xd7b9a8],
 [.62,0xabc6fa,.12,0x9cb9e5,.65,0x394c60,0x26384e],
 [.8,0xabc6fa,.12,0x9cb9e5,.65,0x394c60,0x26384e],
 [.92,0xffc594,1.1,0xffe2cc,1.1,0x737c83,0xd2d6d0],
 [1,0xffe2b8,2.4,0xffefda,1.7,0x829078,0xe6e5d4]
].map(([p,sun,power,sky,fill,ground,bg])=>({p,sun:new THREE.Color(sun),power,sky:new THREE.Color(sky),fill,ground:new THREE.Color(ground),bg:new THREE.Color(bg)}));
export function townDayPhase(seconds){
 const phase=((seconds%360)+360)%360/360;
 let i=0;while(i<dayKeys.length-2&&phase>dayKeys[i+1].p)i++;
 const a=dayKeys[i],b=dayKeys[i+1];let blend=(phase-a.p)/(b.p-a.p);blend=blend*blend*(3-2*blend);
 const angle=phase*Math.PI*2;
 return {a,b,blend,power:THREE.MathUtils.lerp(a.power,b.power,blend),fill:THREE.MathUtils.lerp(a.fill,b.fill,blend),x:-Math.cos(angle),y:.28+.9*Math.max(0,Math.sin(angle)),z:.45};
}
export function townLighting(renderer,scene,mobile=false){
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 const ambient=new THREE.HemisphereLight(0xffffec,0x668475,1.9),sun=new THREE.DirectionalLight(0xfff1da,3.2);
 sun.castShadow=true;const resolution=Math.min(mobile?1024:2048,renderer.capabilities.maxTextureSize);sun.shadow.mapSize.set(resolution,resolution);sun.shadow.bias=-.00015;
 scene.add(ambient,sun,sun.target);
 let sphere=null,lastMatrix=null,lastShadow=-Infinity,mode=null,cycleStart=null;
 const center=new THREE.Vector3(),scale=new THREE.Vector3(),direction=new THREE.Vector3(-.65,1,.6).normalize();
 function attach(town){
  town.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  sphere=new THREE.Box3().setFromObject(town).getBoundingSphere(new THREE.Sphere());lastMatrix=null;
 }
 function update(root,time=0,ar=true){
  const switched=mode!==ar;mode=ar;
  if(cycleStart===null)cycleStart=time;
  if(ar){
   // Restore the exact pre-cycle lighting for both spatial and WebXR AR.
   if(switched){ambient.color.set(0xffffec);ambient.groundColor.set(0x668475);ambient.intensity=1.9;sun.color.set(0xfff1da);sun.intensity=3.2;direction.set(-.65,1,.6).normalize();}
  }else{
   const day=townDayPhase((time-cycleStart)/1000);
   sun.color.copy(day.a.sun).lerp(day.b.sun,day.blend);sun.intensity=day.power;
   ambient.color.copy(day.a.sky).lerp(day.b.sky,day.blend);ambient.groundColor.copy(day.a.ground).lerp(day.b.ground,day.blend);ambient.intensity=day.fill;
   if(scene.background?.isColor)scene.background.copy(day.a.bg).lerp(day.b.bg,day.blend);
   direction.set(day.x,day.y,day.z).normalize();
  }
  if(!sphere)return;root.updateWorldMatrix(true,false);
  const moved=!lastMatrix?.equals(root.matrixWorld);
  if(!moved&&!switched&&(ar||time-lastShadow<(mobile?1500:900)))return;
  lastShadow=time;
  if(!lastMatrix)lastMatrix=new THREE.Matrix4();lastMatrix.copy(root.matrixWorld);
  center.copy(sphere.center).applyMatrix4(root.matrixWorld);root.getWorldScale(scale);
  const radius=Math.max(sphere.radius*Math.max(scale.x,scale.y,scale.z),.01),extent=radius*1.08;
  sun.target.position.copy(center);sun.position.copy(center).addScaledVector(direction,radius*2.6);
  const c=sun.shadow.camera;c.left=c.bottom=-extent;c.right=c.top=extent;c.near=radius*.1;c.far=radius*5;c.updateProjectionMatrix();
  sun.shadow.normalBias=radius*.0006;renderer.shadowMap.needsUpdate=true;
 }
 function dispose(){scene.remove(ambient,sun,sun.target);sun.shadow.dispose()}
 return {attach,update,dispose};
}
