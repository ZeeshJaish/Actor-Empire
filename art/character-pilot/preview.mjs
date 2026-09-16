import * as THREE from 'three';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { OPTIONS, normalizeRecipe, enumerateRecipes, encodeRecipe, decodeRecipe } from './appearance.mjs';

const $ = selector => document.querySelector(selector);
const storageKey = 'actor-empire-character-art-pilot-v1';
let recipe = normalizeRecipe(), model, head, mixer, action, turning = false, galleryReady = false;
try { const saved = localStorage.getItem(storageKey); if (saved) recipe = decodeRecipe(saved); } catch { $('#save-status').textContent = 'The saved preview could not be opened. Choose a new look.'; }
const stage = $('#viewport');
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); }
catch { $('#loading').textContent = '3D preview unavailable. Open renders/first-character.png to see the Blender model.'; throw new Error('WebGL is unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
stage.append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#d3e0df');
const camera = new THREE.PerspectiveCamera(32, 1, .1, 60);
const portraitCamera = new THREE.OrthographicCamera(-.94,.94,.94,-.94,.1,30);
portraitCamera.position.set(.38,2.62,6); portraitCamera.lookAt(0,2.50,0);
const orbit = new OrbitControls(camera,renderer.domElement);
orbit.enablePan = false; orbit.minDistance = 2.8; orbit.maxDistance = 11;
orbit.minPolarAngle = .55; orbit.maxPolarAngle = 1.8;
orbit.addEventListener('change', render);
scene.add(new THREE.HemisphereLight(0xe3efff,0x756250,2));
const key = new THREE.DirectionalLight(0xffe5c9,3);key.position.set(-3,6,5);key.castShadow=true;
key.shadow.mapSize.set(1024,1024); key.shadow.camera.left=-3; key.shadow.camera.right=3;key.shadow.camera.top=4;key.shadow.camera.bottom=-2; key.shadow.normalBias=.035;
scene.add(key);
const fill=new THREE.DirectionalLight(0xb8d8ff,1.3);fill.position.set(4,3,2);scene.add(fill);
const rim=new THREE.DirectionalLight(0xffdb9e,1.8);rim.position.set(1,4,-3);scene.add(rim);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#d3e0df',roughness:1}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.01;ground.receiveShadow=true;scene.add(ground);

function render(){ if(!document.hidden) renderer.render(scene,camera); }
function resize(){ renderer.setSize(stage.clientWidth,stage.clientHeight);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();render(); }
new ResizeObserver(resize).observe(stage);
function setView(mode){
  if(mode==='full'){camera.position.set(3.6,3.15,7.6);orbit.target.set(0,1.70,0);}
  else{camera.position.set(.5,2.65,3.8);orbit.target.set(0,2.48,0);}
  $('#full').setAttribute('aria-pressed',String(mode==='full'));$('#headshot').setAttribute('aria-pressed',String(mode==='headshot'));
  orbit.update();render();
}
function takePortrait(){
  if(!model)return '';
  const size=renderer.getSize(new THREE.Vector2()),ratio=renderer.getPixelRatio();
  const headRotation=head?.quaternion.clone(); if(head) head.quaternion.identity();
  renderer.setPixelRatio(1);renderer.setSize(256,256,false);renderer.render(scene,portraitCamera);
  const data=renderer.domElement.toDataURL('image/png');
  if(head&&headRotation)head.quaternion.copy(headRotation);
  renderer.setPixelRatio(ratio);renderer.setSize(size.x,size.y,false);render();return data;
}
function apply(){
  if(!model)return;
  model.traverse(obj=>{const {category,option}=obj.userData;if(OPTIONS[category])obj.visible=recipe[category]===option;});
  for(const group of document.querySelectorAll('[data-category]'))for(const button of group.querySelectorAll('button'))button.setAttribute('aria-pressed',String(recipe[group.dataset.category]===button.dataset.value));
  $('#look-name').textContent=[recipe.face,recipe.hair,recipe.brows].map(v=>v[0].toUpperCase()+v.slice(1)).join(' / ');
  const portrait=$('#portrait');portrait.src=takePortrait();portrait.hidden=false;render();
}
function download(data,name){const link=document.createElement('a');link.href=data;link.download=name;link.click();}
for(const group of document.querySelectorAll('[data-category]'))group.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  recipe=normalizeRecipe({...recipe,[group.dataset.category]:button.dataset.value});
  $('#save-status').textContent='Unsaved look. Save it to keep it on this device.';apply();
});
$('#randomize').onclick=()=>{
  const choices=enumerateRecipes().filter(r=>encodeRecipe(r)!==encodeRecipe(recipe));
  recipe=choices[Math.floor(Math.random()*choices.length)];apply();$('#save-status').textContent='New look. Save it to keep it on this device.';
};
$('#full').onclick=()=>setView('full');$('#headshot').onclick=()=>setView('headshot');
let animationFrame=0,lastTime=performance.now();
function tick(now){if(!turning||document.hidden)return;const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;mixer?.update(dt);render();animationFrame=requestAnimationFrame(tick);}
function startAnimation(){cancelAnimationFrame(animationFrame);lastTime=performance.now();animationFrame=requestAnimationFrame(tick);}
$('#turn').onclick=()=>{turning=!turning;$('#turn').setAttribute('aria-pressed',String(turning));if(turning){action?.reset().play();startAnimation();}else{cancelAnimationFrame(animationFrame);action?.stop();if(head)head.quaternion.identity();render();}};
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(animationFrame);if(!document.hidden){if(turning)startAnimation();else render();}});
$('#save').onclick=()=>{try{localStorage.setItem(storageKey,encodeRecipe(recipe));$('#save-status').textContent='Look saved on this device.';}catch{$('#save-status').textContent='Device storage unavailable. Use Export recipe to keep your look.';}};
$('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([encodeRecipe(recipe)],{type:'application/json'}));download(url,'actor-empire-appearance.json');setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#import').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{recipe=decodeRecipe(await file.text());apply();$('#save-status').textContent='Recipe imported. Save look to keep it here.';}catch{$('#save-status').textContent='This file is not a supported appearance recipe.';}event.target.value='';};
$('#download-portrait').onclick=()=>download(takePortrait(),'actor-empire-portrait.png');

$('.gallery-section').addEventListener('toggle',()=>{
  if(!$('.gallery-section').open||galleryReady||!model)return;
  const previous=recipe;
  for(const item of enumerateRecipes()){
    recipe=item;apply();
    const button=document.createElement('button');button.type='button';
    const image=document.createElement('img');image.src=$('#portrait').src;image.alt=`${item.face}, ${item.hair}, ${item.brows}`;
    const label=document.createElement('span');label.textContent=`${item.face} / ${item.hair} / ${item.brows}`;
    button.append(image,label);button.onclick=()=>{recipe=item;apply();$('#save-status').textContent='Unsaved look. Save it to keep it on this device.';};$('#gallery').append(button);
  }
  recipe=previous;apply();galleryReady=true;
});

setView('full');resize();
try{
  const gltf=await new GLTFLoader().loadAsync('./exports/actor-empire-character.glb');
  model=gltf.scene;scene.add(model);head=model.getObjectByName('HeadPivot');
  const meshes=[];model.traverse(obj=>{if(obj.isMesh){obj.castShadow=true;obj.receiveShadow=true;meshes.push(obj);}});
  const lineMaterial=new THREE.LineBasicMaterial({color:0x15202a,transparent:true,opacity:.34});
  for(const mesh of meshes){const lines=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,38),lineMaterial);mesh.add(lines);}
  mixer=new THREE.AnimationMixer(model);if(gltf.animations[0])action=mixer.clipAction(gltf.animations[0]);
  $('#loading').hidden=true;$('#live-label').textContent='Live 3D · 27 combinations';apply();
}catch(error){$('#loading').textContent='Could not open the 3D asset. Refresh the preview or view renders/first-character.png.';console.error(error);}

window.addEventListener('pagehide',()=>{turning=false;cancelAnimationFrame(animationFrame);orbit.dispose();scene.traverse(obj=>{obj.geometry?.dispose();const materials=Array.isArray(obj.material)?obj.material:[obj.material];materials.forEach(mat=>mat?.dispose());});renderer.dispose();});
