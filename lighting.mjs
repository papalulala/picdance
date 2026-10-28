import * as THREE from 'three';
export function townLighting(renderer,scene,mobile=false){
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 const ambient=new THREE.HemisphereLight(0xffffec,0x668475,1.9),sun=new THREE.DirectionalLight(0xfff1da,3.2);
 sun.castShadow=true;const resolution=Math.min(mobile?1024:2048,renderer.capabilities.maxTextureSize);sun.shadow.mapSize.set(resolution,resolution);sun.shadow.bias=-.00015;
 scene.add(ambient,sun,sun.target);
 let sphere=null,lastMatrix=null;const center=new THREE.Vector3(),scale=new THREE.Vector3(),direction=new THREE.Vector3(-.65,1,.6).normalize();
 function attach(town){
  town.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  sphere=new THREE.Box3().setFromObject(town).getBoundingSphere(new THREE.Sphere());lastMatrix=null;
 }
 function update(root){
  if(!sphere)return;root.updateWorldMatrix(true,false);
  if(lastMatrix?.equals(root.matrixWorld))return;
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
