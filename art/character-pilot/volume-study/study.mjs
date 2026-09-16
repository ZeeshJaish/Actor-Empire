import * as THREE from 'three';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {OrbitControls} from '../vendor/controls/OrbitControls.js';

const stage=document.querySelector('#stage'), live=document.querySelector('#live');
const renderImage=document.querySelector('#render'), loading=document.querySelector('#loading');
let view='three-quarter', liveMode=true, renderer, model;
const scene=new THREE.Scene();scene.background=new THREE.Color('#e7e3db');
const camera=new THREE.PerspectiveCamera(26,1,.1,70);
try{renderer=new THREE.WebGLRenderer({antialias:true});}
catch{loading.textContent='Live 3D is unavailable. Use Studio render to inspect each angle.';}

if(renderer){
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.2;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  live.append(renderer.domElement);
}
const controls=renderer?new OrbitControls(camera,renderer.domElement):null;
if(controls){controls.enablePan=false;controls.minDistance=2.6;controls.maxDistance=18;controls.minPolarAngle=.4;controls.maxPolarAngle=1.72;controls.addEventListener('change',draw);}
scene.add(new THREE.HemisphereLight(0xf5f5f7,0x9a8e7c,2.0));
const key=new THREE.DirectionalLight(0xffe8d0,3.2);key.position.set(-3.8,8,5.5);key.castShadow=true;
key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-4,right:4,top:6,bottom:-3,near:.1,far:22});key.shadow.normalBias=.025;key.shadow.bias=-.0001;scene.add(key);
const fill=new THREE.DirectionalLight(0xd1e1ff,.8);fill.position.set(4.8,4.7,2.6);scene.add(fill);
const rim=new THREE.DirectionalLight(0xfff5df,1.8);rim.position.set(1.2,6.3,-3.2);scene.add(rim);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#e7e3db',roughness:1}));
floor.rotation.x=-Math.PI/2;floor.position.y=.014;floor.receiveShadow=true;scene.add(floor);

function draw(){if(renderer&&liveMode&&!document.hidden)renderer.render(scene,camera);}
function resize(){if(!renderer)return;renderer.setSize(stage.clientWidth,stage.clientHeight);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();draw();}
const observer=new ResizeObserver(resize);observer.observe(stage);
const positions={front:[0,3.43,10.7],'three-quarter':[-5.3,4.65,9.7],side:[-10.7,3.43,.35],portrait:[-2.1,4.25,4.5]};
function setView(next){
  view=next;stage.classList.toggle('portrait-view',view==='portrait');camera.position.set(...positions[view]);
  const target=new THREE.Vector3(0,view==='portrait'?3.80:2.28,0);
  if(controls){controls.target.copy(target);controls.update();}else camera.lookAt(target);
  renderImage.src=`renders/${view}.png`;
  document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
  draw();
}
function setMode(liveRequested){
  liveMode=liveRequested;live.hidden=!liveMode;renderImage.hidden=liveMode;
  document.querySelector('#live-mode').setAttribute('aria-pressed',String(liveMode));
  document.querySelector('#render-mode').setAttribute('aria-pressed',String(!liveMode));
  document.querySelector('#stage-label').textContent=liveMode?'Drag to rotate':'Blender studio render';
  loading.hidden=!liveMode||Boolean(model);
  resize();
}
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
document.querySelector('#live-mode').onclick=()=>setMode(true);
document.querySelector('#render-mode').onclick=()=>setMode(false);
document.addEventListener('visibilitychange',draw);
setView(view);resize();

if(renderer){
  try{
    const gltf=await new GLTFLoader().loadAsync('actor-volume-study-03.glb');model=gltf.scene;scene.add(model);
    const outlineMaterial=new THREE.ShaderMaterial({
      side:THREE.BackSide,
      vertexShader:'void main(){vec3 p=position+normal*0.009;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',
      fragmentShader:'void main(){gl_FragColor=vec4(0.012,0.011,0.016,1.0);}',
    });
    const meshes=[];model.traverse(obj=>{if(obj.isMesh){obj.castShadow=true;obj.receiveShadow=true;meshes.push(obj);}});
    for(const mesh of meshes){
      let ancestor=mesh,outline=false;
      while(ancestor&&ancestor!==model){if(ancestor.userData.outline)outline=true;ancestor=ancestor.parent;}
      if(outline){const ink=new THREE.Mesh(mesh.geometry,outlineMaterial);ink.name='Surface contour';mesh.add(ink);}
    }
    loading.hidden=true;draw();
  }catch(error){loading.textContent='Could not load the 3D model. Studio render still shows all four views.';console.error(error);}
}

window.addEventListener('pagehide',()=>{
  observer.disconnect();controls?.dispose();
  const geometries=new Set(),materials=new Set();
  scene.traverse(obj=>{if(obj.geometry)geometries.add(obj.geometry);if(obj.material)(Array.isArray(obj.material)?obj.material:[obj.material]).forEach(m=>materials.add(m));});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer?.dispose();
});
