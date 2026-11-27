import * as THREE from 'three';
import './style.css';

document.querySelector('#app').innerHTML = `
<div class="world" id="world"></div>
<div class="grain"></div>
<header><div class="brand"><span class="brand-icon">✳</span><span>THE SPACE BETWEEN <small>AN INTERACTIVE SANCTUARY</small></span></div><div class="header-actions"><button class="sound icon-btn" id="backBtn" aria-label="Back to the beginning" title="Back">←</button><button class="sound" id="sound" aria-label="Toggle sound"><span id="soundIcon">◖))</span><span class="txt" id="soundText">SOUND OFF</span></button><button class="sound icon-btn" id="compactToggle" aria-label="Toggle compact view" title="Compact view"><span id="compactIcon">◱</span></button><button class="sound icon-btn" id="fullToggle" aria-label="Toggle fullscreen" title="Fullscreen"><span id="fullIcon">⛶</span></button></div></header>
<main><div class="eyebrow"><span></span> A LITTLE WORLD FOR YOU</div><h1>Take a breath.<br><em>Let yourself wander.</em></h1><p>There’s nowhere to be, and nothing to prove.<br>Just a small world waiting to be noticed.</p><button id="enter" class="enter">ENTER THE GARDEN <span>↗</span></button><div class="hint">BEST EXPERIENCED WITH SOUND <span>✳</span> MADE FOR SLOW MOMENTS</div></main>
<div class="side-note">A QUIETER KIND OF ADVENTURE <span>01 — 03</span></div>
<div class="bottom"><div class="bottom-left"><span class="asterisk">✳</span><div>A WORLD THAT<br><strong>GROWS WITH YOU</strong></div></div><div class="scroll">SCROLL TO EXPLORE <span>↓</span></div><div class="bottom-right">A MOMENT FOR YOURSELF <span>✺</span></div></div>
<div class="game-ui hidden"><div class="game-top"><div><div class="eyebrow"><span></span> YOUR LITTLE SANCTUARY</div><h2>Leave a little <em>light.</em></h2><p>Collect wandering lights, then plant them<br>to make this world your own.</p></div><div class="counter"><span>✦</span><div><strong id="count">0</strong><small> LIGHTS<br> COLLECTED</small></div></div></div><div class="message" id="message">A quiet world, just for you.</div><div class="game-bottom"><div class="controls"><span><b>W A S D</b> MOVE</span><span><b>SHIFT</b> RUN</span><span><b>DRAG</b> LOOK AROUND</span><span><b>SPACE</b> PLANT A LIGHT</span></div><button id="home">← &nbsp; BACK TO THE BEGINNING</button></div></div>
<div class="touch-ui hidden"><div class="stick-base" id="stick"><div class="stick-knob" id="knob"></div></div><div class="touch-actions"><button class="touch-btn" id="runBtn">RUN</button><button class="touch-btn plant" id="plantBtn">✦ PLANT</button></div></div>`;

/* ------------------------------------------------------------------
   TOUCH / MOBILE SETUP
   Coarse pointers get the joystick + buttons; touch devices also get a
   lighter render profile so 6 km of forest stays smooth on a phone.
------------------------------------------------------------------- */
const canHover = matchMedia('(hover:hover)').matches;
const isTouch = matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0;
// "compact" = narrow column layout (phones, small windows); "compactable" = the
// compact view can also be toggled by hand from the header button or the C key
const prefersCompact = !canHover && !isTouch;           // honour the OS "compact" hint
const isLandscapeAndShort = () => innerHeight < 520;
const smallScreen = () => Math.min(innerWidth, innerHeight) <= 700 || innerWidth <= 900 || prefersCompact;
const perf = isTouch || smallScreen()
  ? { pixelRatio: 1.5, shadows: true, shadowMap: 1024, trees: 900, rocks: 700, flowers: 2200, islands: 22 }
  : { pixelRatio: 2,   shadows: true, shadowMap: 2048, trees: 1400, rocks: 1100, flowers: 3600, islands: 34 };

/* ------------------------------------------------------------------
   WORLD SCALE — everything below is in metres.
   The arena is a floating island 6 km across (3 km from the centre).
------------------------------------------------------------------- */
const ARENA_RADIUS = 3000;                  // 6 km across
const EDGE_LIMIT   = ARENA_RADIUS - 70;     // how far the wanderer may roam
const WALK_SPEED   = 34;                    // m/s
const SPRINT_SPEED = 130;                   // m/s (hold Shift)
const UP = new THREE.Vector3(0, 1, 0);

const world = document.querySelector('#world');
const SKY = 0xb6c8bb;
const scene = new THREE.Scene(); scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 1300, 9200);
const camera = new THREE.PerspectiveCamera(38, innerWidth/innerHeight, .5, 16000); camera.position.set(12,10,15);
const renderer = new THREE.WebGLRenderer({antialias:!isTouch, alpha:false, powerPreference:'high-performance'}); renderer.setPixelRatio(Math.min(devicePixelRatio,perf.pixelRatio)); renderer.setSize(innerWidth,innerHeight); renderer.shadowMap.enabled=perf.shadows; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.1; world.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe9f2df,0x536853,2.1));
const sun=new THREE.DirectionalLight(0xffedca,3.1); sun.position.set(-8,16,9); sun.castShadow=true; sun.shadow.mapSize.set(perf.shadowMap,perf.shadowMap); Object.assign(sun.shadow.camera,{left:-70,right:70,top:70,bottom:-70,near:1,far:640}); sun.shadow.camera.updateProjectionMatrix(); sun.shadow.normalBias=.06; sun.shadow.bias=-.0008; scene.add(sun); scene.add(sun.target);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:1,...extra});
const grass=mat(0x799b79), darkGrass=mat(0x638465), stone=mat(0xc7c5a9), bark=mat(0x625f49), leaves=[mat(0x7e9c79),mat(0x96ad87),mat(0xb2c39b),mat(0x6e9275)];
const leafColors=[new THREE.Color(0x7e9c79),new THREE.Color(0x96ad87),new THREE.Color(0xb2c39b),new THREE.Color(0x6e9275)];
function mesh(geo,material,x,y,z,scale=1){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.scale.setScalar(scale);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m}

// deterministic randomness so the landscape is the same each visit
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const rnd=mulberry32(20261127);
const clamp01=v=>Math.min(1,Math.max(0,v));
const groveNoise=(x,z)=>(Math.sin(x*.0007)*Math.cos(z*.0006)+Math.sin(x*.0021+2.3)*Math.cos(z*.0017-1.1)*.6)/1.6;

/* --- the land itself: gentle hills, a flat sanctuary in the middle,
       and a ring of high ground that frames the whole arena --------- */
function heightAt(x,z){
  const r=Math.hypot(x,z);
  const calm=clamp01(Math.pow(r/260,1.5));                    // keep the centre flat
  const rolling=(Math.sin(x*.00105+.4)*Math.cos(z*.00086-.7)*13
               + Math.sin(x*.0032-1.1)*Math.sin(z*.0027+.3)*4.5
               + Math.cos(r*.0019)*3.6)*calm;
  const t=clamp01((r-(ARENA_RADIUS-620))/620);                // ring of framing hills
  return rolling+Math.sin(t*Math.PI)*62;
}
function buildGround(){
  const RINGS=72, SEGS=180, pos=[], col=[], idx=[];
  const cA=new THREE.Color(0x799b79), cB=new THREE.Color(0x94ad86), cC=new THREE.Color(0x5f8163), tmp=new THREE.Color();
  for(let i=0;i<=RINGS;i++){
    const r=ARENA_RADIUS*Math.pow(i/RINGS,1.06);
    for(let j=0;j<=SEGS;j++){
      const a=j/SEGS*Math.PI*2, x=Math.cos(a)*r, z=Math.sin(a)*r;
      pos.push(x,heightAt(x,z),z);
      const n=clamp01(groveNoise(x,z)*.5+.5);
      tmp.copy(cA).lerp(cB,n).lerp(cC,clamp01(groveNoise(x*1.7,z*1.7)*.35+.2));
      col.push(tmp.r,tmp.g,tmp.b);
    }
  }
  const row=SEGS+1;
  for(let i=0;i<RINGS;i++)for(let j=0;j<SEGS;j++){const a=i*row+j,b=a+1,c=a+row,d=c+1;idx.push(a,b,c,b,d,c)}
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  g.setIndex(idx); g.computeVertexNormals();
  const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));
  m.receiveShadow=true; scene.add(m);
}
buildGround();
// the underside of the floating island
[[ARENA_RADIUS+6,ARENA_RADIUS*.94,110,-55,0x858d72],
 [ARENA_RADIUS*.94,ARENA_RADIUS*.72,190,-205,0x7c8470],
 [ARENA_RADIUS*.72,ARENA_RADIUS*.48,280,-430,0x737e69],
 [ARENA_RADIUS*.48,ARENA_RADIUS*.26,380,-740,0x6b7562],
 [ARENA_RADIUS*.26,ARENA_RADIUS*.06,520,-1180,0x62705d],
 [ARENA_RADIUS*.06,10,340,-1580,0x5b6857]].forEach(([rt,rb,h,y,c])=>{
  const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,140,1,true),mat(c,{side:THREE.DoubleSide}));
  m.position.y=y; scene.add(m);
});

/* --- the sanctuary at the centre: pool, stepping stones, arch ----- */
for(let i=0;i<15;i++){let z=8-i*1.08, x=Math.sin(i*.55)*1.15-.3;const s=mesh(new THREE.CylinderGeometry(.5+Math.random()*.25,.58,.12,7),stone,x,.14,z);s.rotation.y=Math.random()*3;}
mesh(new THREE.CylinderGeometry(2.15,2.2,.16,32),mat(0xc7c7ac),.3,.13,-2.5);mesh(new THREE.CylinderGeometry(1.88,1.88,.18,32),mat(0x91b6ad,{metalness:.15,roughness:.25}),.3,.23,-2.5);
for(let i=0;i<18;i++){const a=i/18*Math.PI*2;const rock=mesh(new THREE.IcosahedronGeometry(.3,0),stone,.3+Math.cos(a)*2.02,.26,-2.5+Math.sin(a)*2.02);rock.scale.set(1.1,.55,.8)}
for(const x of [-1.25,1.25]){const p=mesh(new THREE.BoxGeometry(.34,2.7,.42),stone,x,1.38,-6.8);p.rotation.z=x<0?-.06:.06}const top=mesh(new THREE.TorusGeometry(1.25,.19,8,24,Math.PI),stone,0,2.66,-6.8);
// a beacon so you can always find your way home across the kilometres
mesh(new THREE.CylinderGeometry(.6,2.1,72,8),stone,.3,36,-2.5);
const beacon=new THREE.Mesh(new THREE.IcosahedronGeometry(3.2,1),new THREE.MeshBasicMaterial({color:0xffefb0})); beacon.position.set(.3,76,-2.5); scene.add(beacon);
const beaconHalo=new THREE.Mesh(new THREE.SphereGeometry(10,16,12),new THREE.MeshBasicMaterial({color:0xffeeb3,transparent:true,opacity:.1,depthWrite:false})); beaconHalo.position.copy(beacon.position); scene.add(beaconHalo);
// a handful of trees around the sanctuary
for(let i=0;i<9;i++){const a=i/9*Math.PI*2+.4, r=9+rnd()*7;const x=Math.cos(a)*r, z=Math.sin(a)*r;
  const s=.75+rnd()*.5, grp=new THREE.Group(); grp.position.set(x,heightAt(x,z),z); grp.scale.setScalar(s); grp.rotation.y=rnd()*6.28; scene.add(grp);
  const tr=new THREE.Mesh(new THREE.CylinderGeometry(.12,.24,2.1,7),bark); tr.position.y=1.05; tr.castShadow=true; grp.add(tr);
  for(let k=0;k<5;k++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.9,1),leaves[(rnd()*leaves.length)|0]); m.position.set((rnd()-.5)*1.15,2.3+(rnd()-.5)*.7,(rnd()-.5)*1.15); m.scale.setScalar(.8+rnd()*.4); m.castShadow=true; grp.add(m)}}

/* --- scatter helper: uniform across the disc, with rejection ------ */
function scatter(count,accept){
  const out=[]; let guard=count*60;
  while(out.length<count&&guard-->0){
    const a=rnd()*Math.PI*2, r=Math.sqrt(rnd())*ARENA_RADIUS, x=Math.cos(a)*r, z=Math.sin(a)*r;
    if(Math.hypot(x-.3,z+2.5)<6) continue;           // never inside the pool
    if(accept&&!accept(x,z,r)) continue;
    out.push([x,z,r]);
  }
  return out;
}
const dummy=new THREE.Object3D();

/* --- forest: ~1400 trees, instanced so 6 km of woodland stays cheap */
const treeSpots=scatter(perf.trees,(x,z,r)=>r>16&&groveNoise(x,z)>.02);
const trunkGeo=new THREE.CylinderGeometry(.5,1,9,6); trunkGeo.translate(0,4.5,0);
const trunks=new THREE.InstancedMesh(trunkGeo,bark,treeSpots.length);
const canopyGeo=new THREE.IcosahedronGeometry(1,1);
const canopies=new THREE.InstancedMesh(canopyGeo,new THREE.MeshStandardMaterial({roughness:1}),treeSpots.length*3);
treeSpots.forEach(([x,z],i)=>{
  const s=.85+rnd()*.85, y=heightAt(x,z);
  dummy.position.set(x,y,z); dummy.rotation.set(0,rnd()*6.28,0); dummy.scale.setScalar(s); dummy.updateMatrix(); trunks.setMatrixAt(i,dummy.matrix);
  for(let k=0;k<3;k++){
    const idx=i*3+k, cr=(3.1+rnd()*1.6)*s;
    dummy.position.set(x+(rnd()-.5)*4*s, y+(8.4+rnd()*3.4)*s, z+(rnd()-.5)*4*s);
    dummy.rotation.set(rnd()*3,rnd()*3,rnd()*3); dummy.scale.setScalar(cr); dummy.updateMatrix();
    canopies.setMatrixAt(idx,dummy.matrix);
    canopies.setColorAt(idx,leafColors[(rnd()*leafColors.length)|0]);
  }
});
trunks.castShadow=trunks.receiveShadow=true; canopies.castShadow=true;
scene.add(trunks,canopies);

/* --- rocks and wildflowers --- */
const rocks=scatter(perf.rocks);
const rockMesh=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),stone,rocks.length);
rocks.forEach(([x,z],i)=>{const s=1+rnd()*5,y=heightAt(x,z);
  dummy.position.set(x,y+s*.25,z);dummy.rotation.set(rnd()*3,rnd()*6.28,rnd()*3);dummy.scale.set(s,s*(.45+rnd()*.4),s*.9);dummy.updateMatrix();
  rockMesh.setMatrixAt(i,dummy.matrix)});
rockMesh.castShadow=rockMesh.receiveShadow=true; scene.add(rockMesh);

const flowerMats=[mat(0xeed7b3),mat(0xe8b9ad),mat(0xf2e8cc)];
const stems=scatter(perf.flowers,(x,z,r)=>r>8&&groveNoise(x,z)<.35);
const stemMesh=new THREE.InstancedMesh(new THREE.ConeGeometry(.14,.9,4),darkGrass,stems.length);
const bloomGeo=new THREE.IcosahedronGeometry(.34,0);
const blooms=new THREE.InstancedMesh(bloomGeo,new THREE.MeshStandardMaterial({roughness:1}),stems.length);
stems.forEach(([x,z],i)=>{const s=1.4+rnd()*2.2,y=heightAt(x,z);
  dummy.position.set(x,y+.45*s,z);dummy.rotation.set((rnd()-.5)*.4,rnd()*6.28,(rnd()-.5)*.4);dummy.scale.setScalar(s);dummy.updateMatrix();
  stemMesh.setMatrixAt(i,dummy.matrix);
  dummy.position.set(x,y+.95*s,z);dummy.rotation.set(0,rnd()*6.28,0);dummy.scale.setScalar(s*(.8+rnd()*.7));dummy.updateMatrix();
  blooms.setMatrixAt(i,dummy.matrix); blooms.setColorAt(i,new THREE.Color().setHex([0xeed7b3,0xe8b9ad,0xf2e8cc][(rnd()*3)|0]))});
stemMesh.castShadow=true; scene.add(stemMesh,blooms);

/* --- far islands drifting beyond the rim, fading into the haze ---- */
for(let i=0;i<perf.islands;i++){
  const a=rnd()*Math.PI*2, r=ARENA_RADIUS*(1.35+rnd()*1.9), s=120+rnd()*520;
  const y=-320+rnd()*760;
  const g=new THREE.Group(); g.position.set(Math.cos(a)*r,y,Math.sin(a)*r); g.rotation.y=rnd()*6.28; scene.add(g);
  const body=new THREE.Mesh(new THREE.CylinderGeometry(s,s*.55,s*1.5,9),mat(0x76806c)); body.position.y=-s*.75; g.add(body);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(s*1.02,s*.98,s*.12,9),mat(0x7e9c79)); g.add(cap);
  if(rnd()>.35){const spire=new THREE.Mesh(new THREE.ConeGeometry(s*.34,s*2.4,6),mat(0x6e9275)); spire.position.y=s*1.2; g.add(spire)}
}

/* --- the wanderer -------------------------------------------------- */
const player=new THREE.Group();scene.add(player);const body=new THREE.Mesh(new THREE.ConeGeometry(.38,1.05,7),mat(0xe5d9bb));body.position.y=.7;body.castShadow=true;player.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.24,12,8),mat(0x514f43));head.position.y=1.33;head.castShadow=true;player.add(head);player.position.set(0,heightAt(0,6.5),6.5);

/* --- wandering lights to gather, spread across the whole arena ---- */
const lights=[];const glowMat=new THREE.MeshBasicMaterial({color:0xffefb0});
function addLight(x,z){const y=heightAt(x,z);const g=new THREE.Group();g.position.set(x,y+.9,z);
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(.13,1),glowMat));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(.36,12,8),new THREE.MeshBasicMaterial({color:0xffeeb3,transparent:true,opacity:.12,depthWrite:false})));
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.16,.5,26,7,1,true),new THREE.MeshBasicMaterial({color:0xffeeb3,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide}));
  beam.position.y=12.5; g.add(beam);
  scene.add(g);lights.push({g,x,z,baseY:y+.9,phase:Math.random()*6})}
[[-3,4],[3,3],[-4,-1],[4,-3],[0,-5],[7,1],[-6,-3]].forEach(p=>addLight(...p));
scatter(80,(x,z,r)=>r>30).forEach(([x,z])=>addLight(x,z));

let pitch=0;
let playing=false, count=0, planted=0, yaw=0, speed=0, dragging=false, lastX=0, lastY=0, soundOn=false, audio;const keys={};
// joystick state (touch) — x/z in -1..1
const stick={x:0,z:0,active:false,run:false,lastMag:0};
const showMessage=(text)=>{const el=document.querySelector('#message');el.textContent=text;el.classList.add('show');clearTimeout(showMessage.timer);showMessage.timer=setTimeout(()=>el.classList.remove('show'),3000)};

/* ---------- compact mode ---------- */
const bodyEl=document.body;
if(isTouch)bodyEl.classList.add('touch-mode');
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const compactBtn=document.querySelector('#compactToggle');
let userCompact=store.get('sb-compact')===null?null:store.get('sb-compact')==='1';
function applyCompact(){
  const on=userCompact===null?smallScreen():userCompact;
  bodyEl.classList.toggle('compact',on);
  document.querySelector('#compactIcon').textContent=on?'◰':'◱';
  compactBtn.setAttribute('aria-pressed',on?'true':'false');
}
function setCompact(on){userCompact=on;store.set('sb-compact',on?'1':'0');applyCompact()}
applyCompact();
compactBtn.onclick=()=>setCompact(!bodyEl.classList.contains('compact'));

/* ---------- fullscreen (handy on phones, hides browser chrome) ---------- */
const fullBtn=document.querySelector('#fullToggle');
const fullEl=document.documentElement;
const isFull=()=>document.fullscreenElement||document.webkitFullscreenElement;
fullBtn.onclick=()=>{
  if(isFull()){(document.exitFullscreen||document.webkitExitFullscreen).call(document)}
  else{const p=fullEl.requestFullscreen||fullEl.webkitRequestFullscreen;if(p)p.call(fullEl).catch(()=>{})}
};
['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,()=>{document.querySelector('#fullIcon').textContent=isFull()?'⤡':'⛶';onResize()}));

/* ---------- enter / leave the garden ---------- */
document.querySelector('#enter').onclick=()=>{
  playing=true;bodyEl.classList.add('playing');
  document.querySelector('.game-ui').classList.remove('hidden');
  if(isTouch)document.querySelector('.touch-ui').classList.remove('hidden');
  // phones: nudge into fullscreen so the browser bars stop eating the view
  if(isTouch&&!isFull()){const p=fullEl.requestFullscreen||fullEl.webkitRequestFullscreen;try{if(p)p.call(fullEl).catch(()=>{})}catch(err){}}
  showMessage(isTouch?'Drag to look. Joystick to wander.':'A quiet world, six kilometres wide.');
};
function goHome(){
  playing=false;bodyEl.classList.remove('playing');stick.x=stick.z=0;stick.active=false;resetKnob();setRun(false);
  document.querySelector('.game-ui').classList.add('hidden');
  document.querySelector('.touch-ui').classList.add('hidden');
}
document.querySelector('#home').onclick=goHome;
document.querySelector('#backBtn').onclick=goHome;

/* ---------- planting ---------- */
function plant(){if(!playing)return;if(count<1){showMessage('Find a wandering light first ✦');return}count--;planted++;document.querySelector('#count').textContent=count;const x=player.position.x,z=player.position.z,y=heightAt(x,z);mesh(new THREE.CylinderGeometry(.025,.04,.7,5),darkGrass,x,y+.36,z);for(let i=0;i<5;i++){let a=i*Math.PI*2/5;let petal=mesh(new THREE.SphereGeometry(.16,8,6),flowerMats[planted%3],x+Math.cos(a)*.13,y+.78,z+Math.sin(a)*.13);petal.scale.set(.8,.45,1)}mesh(new THREE.SphereGeometry(.1,8,6),glowMat,x,y+.82,z);if(isTouch&&navigator.vibrate)navigator.vibrate(10);showMessage(['Something beautiful begins here.','A little light, left behind.','The garden remembers you.'][planted%3]);}

/* ---------- keyboard ---------- */
window.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(k==='c'&&!e.metaKey&&!e.ctrlKey){setCompact(!bodyEl.classList.contains('compact'));return}
  keys[k]=true;
  if(e.code==='Space'){e.preventDefault();if(!e.repeat)plant()}
  if(k.startsWith('arrow')||e.code==='Space')e.preventDefault();
});
window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
window.addEventListener('blur',()=>{Object.keys(keys).forEach(k=>keys[k]=false);stick.x=stick.z=0;stick.active=false;resetKnob()});

/* ---------- drag to look (mouse + touch) ---------- */
const canvas=renderer.domElement;
let lookId=null;
canvas.addEventListener('pointerdown',e=>{
  if(!playing||e.pointerType==='mouse'&&e.button!==0)return;
  if(lookId!==null)return;
  lookId=e.pointerId;dragging=true;lastX=e.clientX;lastY=e.clientY;
  try{canvas.setPointerCapture(e.pointerId)}catch(err){}
});
canvas.addEventListener('pointermove',e=>{
  if(!dragging||e.pointerId!==lookId)return;
  yaw-=(e.clientX-lastX)*(isTouch?.005:.006);
  // touch devices can also nudge the camera height by dragging vertically
  if(isTouch){pitch=Math.min(.55,Math.max(-.2,pitch+(e.clientY-lastY)*.0025))}
  lastX=e.clientX;lastY=e.clientY;
});
const endLook=e=>{if(e.pointerId===lookId){lookId=null;dragging=false}};
canvas.addEventListener('pointerup',endLook);
canvas.addEventListener('pointercancel',endLook);
// pinch/double-tap zoom and rubber-band scrolling shouldn't fight the game
canvas.addEventListener('gesturestart',e=>e.preventDefault());
canvas.addEventListener('touchmove',e=>{if(playing)e.preventDefault()},{passive:false});

/* ---------- virtual joystick ---------- */
const stickEl=document.querySelector('#stick'),knob=document.querySelector('#knob');
let stickId=null;
function resetKnob(){if(knob)knob.style.transform='translate(0px,0px)'}
function moveKnob(dx,dy){const max=44;const d=Math.hypot(dx,dy)||1;const k=Math.min(1,max/d);knob.style.transform=`translate(${dx*k}px,${dy*k}px)`}
stickEl.addEventListener('pointerdown',e=>{
  e.preventDefault();stickId=e.pointerId;stick.active=true;
  try{stickEl.setPointerCapture(e.pointerId)}catch(err){}
  stickCenter();updateStick(e);
});
stickEl.addEventListener('pointermove',e=>{if(e.pointerId===stickId)updateStick(e)});
const endStick=e=>{if(e.pointerId===stickId){stick.lastMag=Math.hypot(stick.x,stick.z);stickId=null;stick.active=false;stick.x=stick.z=0;resetKnob()}};
stickEl.addEventListener('pointerup',endStick);
stickEl.addEventListener('pointercancel',endStick);
let scx=0,scy=0;
function stickCenter(){const r=stickEl.getBoundingClientRect();scx=r.left+r.width/2;scy=r.top+r.height/2}
function updateStick(e){
  const dx=e.clientX-scx,dy=e.clientY-scy,max=52;
  moveKnob(dx,dy);
  stick.x=Math.max(-1,Math.min(1,dx/max));
  stick.z=Math.max(-1,Math.min(1,dy/max));
}
const runBtn=document.querySelector('#runBtn');
const setRun=on=>{stick.run=on;runBtn.classList.toggle('active',on)};
runBtn.addEventListener('pointerdown',e=>{e.preventDefault();setRun(!stick.run)});
document.querySelector('#plantBtn').addEventListener('pointerdown',e=>{e.preventDefault();plant()});
// double-tap the joystick knob to toggle run, too
let lastStickTap=0;
stickEl.addEventListener('pointerup',e=>{
  if(e.pointerType==='mouse')return;
  const now=performance.now();
  if(now-lastStickTap<320&&stick.lastMag<.3){setRun(!stick.run)}
  lastStickTap=now;
});

/* ---------- sound ---------- */
document.querySelector('#sound').onclick=()=>{soundOn=!soundOn;document.querySelector('#soundText').textContent=soundOn?'SOUND ON':'SOUND OFF';document.querySelector('#soundIcon').textContent=soundOn?'◖))':'◖)';document.querySelector('#sound').classList.toggle('is-on',soundOn);if(soundOn){if(!audio){audio=new (window.AudioContext||window.webkitAudioContext)();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=110;gain.gain.value=.025;osc.connect(gain).connect(audio.destination);osc.start()}audio.resume()}else if(audio)audio.suspend()};

/* ---------- resize / orientation / visibility ---------- */
function onResize(){
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio,perf.pixelRatio));
  renderer.setSize(innerWidth,innerHeight);
  applyCompact();
  if(stick.active)stickCenter();
}
window.addEventListener('resize',onResize);
window.addEventListener('orientationchange',()=>setTimeout(onResize,250));
// pause the render loop when the tab/app is hidden — saves phone battery
let visible=true;
document.addEventListener('visibilitychange',()=>{visible=!document.hidden});
onResize();

const clock=new THREE.Clock();const tmpTarget=new THREE.Vector3(),tmpOffset=new THREE.Vector3(),scratch=new THREE.Vector3(),landPos=new THREE.Vector3(12,10,15),moveDir=new THREE.Vector3();
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;
  if(!visible){renderer.render(scene,camera);return}
  if(playing){
    let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
    let dz=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
    if(stick.active){dx+=stick.x;dz+=stick.z}
    dx=Math.max(-1,Math.min(1,dx));dz=Math.max(-1,Math.min(1,dz));
    const running=keys.shift||stick.run;
    const want=(dx||dz)?(running?SPRINT_SPEED:WALK_SPEED):0;
    speed+=(want-speed)*Math.min(1,dt*4.5);
    if((dx||dz)&&speed>0.5){
      const dir=moveDir.set(dx,0,dz).normalize().applyAxisAngle(UP,yaw);
      const nx=player.position.x+dir.x*speed*dt, nz=player.position.z+dir.z*speed*dt;
      if(Math.hypot(nx,nz)<EDGE_LIMIT){player.position.x=nx;player.position.z=nz}
      player.rotation.y=Math.atan2(dir.x,dir.z);
    }
    player.position.y+= (heightAt(player.position.x,player.position.z)-player.position.y)*Math.min(1,dt*10);
    body.position.y=.7+Math.abs(Math.sin(t*(9+speed*.12)))*.08;
    // camera pulls back as you gather speed, so the world never blurs past you
    tmpTarget.set(player.position.x,player.position.y+1.4,player.position.z);
    const aspect=innerWidth/innerHeight;
    const distMul=aspect<1?1+(1-aspect)*.55:(aspect>2?Math.min(1.25,aspect*.62):1);
    tmpOffset.set(0,9+speed*.05+(pitch*26),13+speed*.08).multiplyScalar(distMul).applyAxisAngle(UP,yaw);
    camera.position.lerp(scratch.copy(tmpTarget).add(tmpOffset),1-Math.exp(-dt*3.6));
    camera.lookAt(tmpTarget);
    // the sun's shadow frustum travels with you
    sun.position.set(player.position.x-90,240,player.position.z+120);
    sun.target.position.set(player.position.x,player.position.y,player.position.z);
    sun.target.updateMatrixWorld();
    for(let i=lights.length-1;i>=0;i--){const l=lights[i];
      l.g.position.y=l.baseY+Math.sin(t*2+l.phase)*.25;l.g.rotation.y+=dt;
      if(Math.hypot(player.position.x-l.x,player.position.z-l.z)<9){scene.remove(l.g);lights.splice(i,1);count++;document.querySelector('#count').textContent=count;if(isTouch&&navigator.vibrate)navigator.vibrate([6,40,8]);showMessage('You found a little light ✦')}}
  }else{
    landPos.set(12+Math.sin(t*.1)*1.5,10,15);camera.position.lerp(landPos,.02);camera.lookAt(0,2,0);
    sun.position.set(-90,240,120); sun.target.position.set(0,0,0); sun.target.updateMatrixWorld();
    lights.forEach(l=>{l.g.position.y=l.baseY+Math.sin(t*2+l.phase)*.25;l.g.rotation.y+=dt});
  }
  beacon.rotation.y+=dt*.3; beaconHalo.scale.setScalar(1+Math.sin(t*.8)*.08);
  renderer.render(scene,camera);
}
animate();
