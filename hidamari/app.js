(()=>{'use strict';const E=window.Hidamari,$=id=>document.getElementById(id),canvas=$('board'),ctx=canvas.getContext('2d'),colors=['#ed9396','#ecc16d','#80bdd8','#8bbb9a','#b49ecf'],dark=['#cd6f7b','#c79b48','#569ab9','#649878','#9077b2'],symbols=['✿','✦','♦','❧','●'],reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let state=E.create(0,Date.now(),true),started=false,selected=null,pointer=null,anim=null,tile=44,size=308,dpr=1,particles=[],now=0,hint=null,modalAction=null,saved=null,muted=false,audio=null,pausedAt=null,drifts=[],revision=0,chainCount=0,pulses=[],beams=[],lastClearAt=-Infinity,motions=[],ghosts=[];
let skin=0;try{skin=localStorage.getItem('puzzle-skin')==='animals'?1:0;}catch{}
function updateSkin(){const S=window.PuzzleSkins;colors.splice(0,5,...S.themes[skin].colors);$('theme').textContent=(skin?'どうぶつ':'フルーツ')+' ⇄';$('theme').setAttribute('aria-label',(skin?'フルーツ':'動物')+'の絵柄に切り替える');$('art').textContent=skin?'🦁 🐘 🐼':'🍒 🍊 🍈';hud();}
try{saved=E.restore(JSON.parse(localStorage.getItem('hidamari-free-v1')||'null'));muted=localStorage.getItem('hidamari-muted')==='1';}catch{}
function save(s=state){try{localStorage.setItem('hidamari-free-v1',JSON.stringify(s));}catch{}}
function tone(chain=1,big=false){if(muted)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});const t=audio.currentTime;for(let k=0;k<(big?3:1);k++){const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=440*Math.pow(2,Math.min(12,chain*2+k*4)/12);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.1,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+.24);o.connect(g);g.connect(audio.destination);o.start(t+k*.045);o.stop(t+.3+k*.045);o.onended=()=>{o.disconnect();g.disconnect();};}}catch{}}
function resize(){const r=$('arena').getBoundingClientRect();size=Math.max(7,Math.min(r.width,r.height-4));tile=size/7;dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(size*dpr);canvas.height=Math.round(size*dpr);canvas.style.width=size+'px';canvas.style.height=size+'px';}
new ResizeObserver(resize).observe($('arena'));window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
function hud(s=state){$('stage').textContent=s.round||1;$('moves').textContent=chainCount||'—';$('score').textContent=s.score.toLocaleString();$('goals').innerHTML=E.stages[s.level].goals.map((n,i)=>n?'<div class="goal '+(!s.goals[i]?'done':'')+'"><img src="'+window.PuzzleSkins.icons[skin][i]+'" alt="'+window.PuzzleSkins.themes[skin].names[i]+'"><b>'+ (s.goals[i]||'✓')+'</b></div>':'').join('');$('sound').textContent=muted?'♩':'♪';}
function round(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function shape(c,x,y,r){ctx.beginPath();if(c===0){const ps=Array.from({length:10},(_,k)=>{const a=k*Math.PI/5-Math.PI/2,rr=k%2?r*.53:r*1.15;return{x:x+Math.cos(a)*rr,y:y+Math.sin(a)*rr};});ctx.moveTo((ps[9].x+ps[0].x)/2,(ps[9].y+ps[0].y)/2);for(let k=0;k<10;k++){const p=ps[k],q=ps[(k+1)%10];ctx.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2);}ctx.closePath();}
else if(c===1){for(let k=0;k<10;k++){const a=k*Math.PI/5-Math.PI/2,rr=k%2?r*.49:r;const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;k?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();}
else if(c===2){ctx.moveTo(x,y-r);ctx.bezierCurveTo(x+r*.2,y-r*.5,x+r*1.2,y+r*.5,x+r*.4,y+r*.8);ctx.bezierCurveTo(x-r*.9,y+r*1.2,x-r*.9,y-r*.1,x,y-r);}
else if(c===3){ctx.moveTo(x-r*.7,y+r*.65);ctx.bezierCurveTo(x-r*1.3,y-r*.6,x-r*.1,y-r,x+r*.8,y-r*.7);ctx.bezierCurveTo(x+r*1.1,y+r*.4,x+r*.1,y+r,x-r*.7,y+r*.65);}
else ctx.roundRect(x-r*.83,y-r*.83,r*1.66,r*1.66,r*.55);}
function gem(p,x,y,scale=1,alpha=1){if(!p)return;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.scale(scale,scale);window.PuzzleSkins.paint(ctx,skin,p,0,0,(skin?tile*.41:tile*.36));ctx.restore();}
function position(i,t=performance.now()){
 const m=motions[i],end={x:i%7+.5,y:Math.floor(i/7)+.5};if(!m||reduced)return end;
 const k=Math.max(0,Math.min(1,(t-m.at)/m.duration)),ease=1-Math.pow(1-k,2);return{x:m.x+(end.x-m.x)*ease,y:m.y+(end.y-m.y)*ease};
}
function hasMotion(t=performance.now()){return motions.some((m,i)=>m&&t<m.at+m.duration&&(Math.abs(m.x-(i%7+.5))>1e-8||Math.abs(m.y-(Math.floor(i/7)+.5))>1e-8));}
function snapshot(){return Array.from({length:49},(_,i)=>position(i));}
function motionAt(i,p,duration=260){motions[i]={x:p.x,y:p.y,at:performance.now(),duration:duration};}
function hit(x,y){let best=-1,dist=.56;for(let i=0;i<49;i++){const p=position(i),d=Math.hypot(p.x-x,p.y-y);if(d<dist){best=i;dist=d;}}return best;}
function inputBoard(){return state;}
function canInput(){return started&&$('modal').hidden;}
function movable(i){return Number.isInteger(i)&&i>=0&&i<49;}
function draw(t){requestAnimationFrame(draw);if(document.hidden)return;now=t;if(anim&&t-anim.at>=anim.duration&&!pointer&&selected===null&&$('modal').hidden)advanceWave();
$('moves').classList.toggle('chain-open',!!anim||hasMotion(t));ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,size,size);round(0,0,size,size,skin?4:14,skin?'#41515e':'#dfd3b8');for(let i=0;i<49;i++){const x=i%7*tile,y=Math.floor(i/7)*tile;round(x+2,y+2,tile-4,tile-4,skin?tile*.11:tile*.17,skin?((i+Math.floor(i/7))%2?'#d4dddd':'#c5cfd0'):((i+Math.floor(i/7))%2?'#f4ebd5':'#eee3ca'));}
const b=state.board;
for(let i=0;i<49;i++){const pos=position(i,t),x=pos.x*tile,y=pos.y*tile,p=pulses.find(p=>p.i===i&&t-p.at<180);const scale=p&&!reduced?1+.1*Math.sin((t-p.at)/180*Math.PI):1;
if(i===selected||hint?.includes(i)){ctx.strokeStyle=i===selected?'#b7915c':'#c2a35f';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(x-tile/2+3,y-tile/2+3,tile-6,tile-6,tile*.2);ctx.stroke();}
gem(b[i],x,y,scale);}
ghosts=ghosts.filter(g=>t-g.at<240);for(const g of ghosts){const k=Math.min(1,(t-g.at)/110),p={x:g.x+(g.toX-g.x)*k,y:g.y+(g.toY-g.y)*k},fade=Math.max(0,(t-g.at-80)/160);gem(g.p,p.x*tile,p.y*tile,1+.15*fade,1-fade);}
beams=beams.filter(e=>t-e.at<240);for(const e of beams){const k=(t-e.at)/240,x=(e.i%7+.5)*tile,y=(Math.floor(e.i/7)+.5)*tile;ctx.save();ctx.globalAlpha=1-k;ctx.strokeStyle='#fff9da';ctx.lineWidth=tile*.16*(1-k);ctx.beginPath();if(e.type==='row'){ctx.moveTo(0,y);ctx.lineTo(size,y);}else if(e.type==='column'){ctx.moveTo(x,0);ctx.lineTo(x,size);}else ctx.arc(x,y,tile*(.4+k*2),0,7);ctx.stroke();ctx.restore();}
particles=particles.filter(p=>t-p.at<650);for(const p of particles){const k=(t-p.at)/650;ctx.globalAlpha=1-k;ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x+p.vx*k,p.y+p.vy*k+40*k*k,p.r*(1-k*.5),0,7);ctx.fill();}ctx.globalAlpha=1;}
function advanceWave(){
 if(!anim)return;
 const a=anim;let clearIndex=a.index;while(clearIndex<a.frames.length&&a.frames[clearIndex].kind!=='clear')clearIndex++;
 if(clearIndex>=a.frames.length){state=a.state;anim=null;hud();save();return;}
 const f=a.frames[clearIndex],drop=a.frames[clearIndex+1],t=performance.now();
 const oldPositions=snapshot();
 for(const i of f.clear){const p=oldPositions[i];ghosts.push({p:f.state.board[i],x:p.x,y:p.y,toX:i%7+.5,toY:Math.floor(i/7)+.5,at:t});}
 if(ghosts.length>150)ghosts.splice(0,ghosts.length-150);
 const previous=motions;motions=[];
 for(const fall of drop.falling){const source=fall.from*7+fall.to%7;if(fall.from>=0){if(source===fall.to){motions[fall.to]=previous[source];}else motionAt(fall.to,oldPositions[source],Math.min(2000,1000+Math.abs(fall.from-Math.floor(fall.to/7))*130));}else motionAt(fall.to,{x:fall.to%7+.5,y:fall.from+.5},Math.min(2200,1100+(Math.floor(fall.to/7)-fall.from)*130));}
 state=E.copy(drop.state);chainCount=f.chain;lastClearAt=t;hint=null;
 tone(f.chain,f.effects.length>0||f.created.length>0);
 for(const i of f.clear)for(let k=0;k<(reduced?1:5);k++)particles.push({x:(i%7+.5)*tile,y:(Math.floor(i/7)+.5)*tile,vx:(Math.random()-.5)*tile*2,vy:(Math.random()-.8)*tile*2,r:2+Math.random()*3,col:colors[f.state.board[i].c]||'#ffe29b',at:t});
 if(particles.length>600)particles.splice(0,particles.length-600);
 pulses=drop.falling.filter(p=>p.from!==Math.floor(p.to/7)).map(p=>({i:p.to,at:t}));
 beams.push(...f.effects.map(e=>({...e,at:t})));if(beams.length>30)beams.splice(0,beams.length-30);
 if(chainCount>1){$('combo').textContent=chainCount+' CHAIN';$('combo').classList.remove('show');void $('combo').offsetWidth;$('combo').classList.add('show');}
 a.index=clearIndex+2;a.at=t;a.duration=reduced?90:Math.max(230,...motions.filter(Boolean).map(m=>m.at+m.duration-t))+60;
 if(!a.frames.slice(a.index).some(f=>f.kind==='clear')){state=a.state;anim=null;}
 hud();save(anim?.state||state);
}
function play(a,z){if(!canInput()||!movable(a)||!movable(z))return;const during=!!anim||hasMotion(),base=E.copy(state),oldPositions=snapshot();hint=null;selected=null;const result=E.turn(base,a,z,during?chainCount:0);
 if(!result){pulses=[{i:a,at:performance.now()},{i:z,at:performance.now()}];return;}
 if(!during)chainCount=0;
 state=E.copy(result.frames[0].state);motionAt(a,oldPositions[z],140);motionAt(z,oldPositions[a],140);anim={...result,index:1,at:performance.now(),duration:180};advanceWave();
}
function finish(){if(anim){state=anim.state;anim=null;}selected=null;hud();save();}
function show(tag,title,message,label,action,secondary=null){$('modal').hidden=false;$('tag').textContent=tag;$('title').textContent=title;$('message').textContent=message;$('message').style.whiteSpace='pre-line';$('primary').textContent=label;modalAction=action;$('secondary').hidden=!secondary;$('secondary').textContent=secondary?.label||'';$('secondary').onclick=secondary?.action||null;}
function start(level=0){state=E.create(level,Date.now(),true);chainCount=0;lastClearAt=-Infinity;motions=[];ghosts=[];drifts=[];pulses=[];beams=[];anim=null;started=true;selected=null;hint=null;pointer=null;particles=[];$('modal').hidden=true;hud();save();resize();}
$('primary').addEventListener('click',()=>modalAction?.());modalAction=()=>{if(saved){state=saved;saved=null;started=true;$('modal').hidden=true;hud();if(state.phase!=='play'){anim={state,frames:[],index:0};finish();}}else start();};if(saved)$('primary').textContent='続きから';
$('retry').addEventListener('click',()=>{if(!started)return;show('やりなおす','新しい盤面にする？','今の盤面を最初から遊びます。','やりなおす',()=>start(state.level),{label:'このまま続ける',action:()=>{$('modal').hidden=true;}});});
$('hint').addEventListener('click',()=>{if(!started||!$('modal').hidden)return;hint=E.moves(state.board)[0]||null;selected=null;});
$('help').addEventListener('click',()=>{show('遊び方','3つそろえるだけ。','隣同士をスワイプして入れ替え。\n連鎖中も盤面全体を操作できます。\n4つ：一列を消すピース。\n5つ：好きな色を全部消すピース。\n時間も手数も制限なし。','戻る',()=>{$('modal').hidden=started;if(!started)show('時間を気にせず、ひと息。','フルーツ＆どうぶつ','同じ色を3つそろえて、花を集めよう。','はじめる',()=>start());});});
$('theme').addEventListener('click',()=>{skin=1-skin;try{localStorage.setItem('puzzle-skin',skin?'animals':'fruit');}catch{}updateSkin();});
$('sound').addEventListener('click',()=>{muted=!muted;try{localStorage.setItem('hidamari-muted',muted?'1':'0');}catch{}if(muted)audio?.suspend().catch(()=>{});hud();});
function cell(e){const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*7,y=(e.clientY-r.top)/r.height*7;if(x<0||y<0||x>=7||y>=7)return -1;return hit(x,y);}
canvas.addEventListener('pointerdown',e=>{if(!canInput()||pointer)return;const i=cell(e);if(!movable(i))return;e.preventDefault();pointer={id:e.pointerId,i,x:e.clientX,y:e.clientY,revision};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const p=pointer;pointer=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(!canInput())return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.hypot(dx,dy)>tile*.28){const target=p.i+(Math.abs(dx)>Math.abs(dy)?Math.sign(dx):Math.sign(dy)*7);play(p.i,target);return;}const i=p.i;if(!movable(i))return;if(selected!==null&&Math.abs(selected%7-i%7)+Math.abs(Math.floor(selected/7)-Math.floor(i/7))===1)play(selected,i);else selected=selected===i?null:i;hint=null;});canvas.addEventListener('pointercancel',()=>{pointer=null;});
document.addEventListener('visibilitychange',()=>{pointer=null;if(document.hidden){pausedAt=performance.now();audio?.suspend().catch(()=>{});}else{if(pausedAt!==null){if(anim)anim.at+=performance.now()-pausedAt;for(const p of particles)p.at+=performance.now()-pausedAt;for(const d of pulses)d.at+=performance.now()-pausedAt;for(const b of beams)b.at+=performance.now()-pausedAt;for(const m of motions)if(m)m.at+=performance.now()-pausedAt;for(const g of ghosts)g.at+=performance.now()-pausedAt;}pausedAt=null;}});window.addEventListener('pagehide',()=>{if(started)save(anim?.state||state);});
window.hidamariDebug=()=>({skin:skin?'animals':'fruit',state:E.copy(state),busy:!!anim,frame:anim?'cascade':null,visible:E.copy(inputBoard()),chain:chainCount,moving:hasMotion(),motionEnds:Math.max(0,...motions.filter(Boolean).map(m=>m.at+m.duration)),pieces:Array.from({length:49},(_,i)=>({i,...position(i)})),ghosts:ghosts.length,movable:Array.from({length:49},(_,i)=>i).filter(movable),selected,hint,modal:!$('modal').hidden});updateSkin();resize();requestAnimationFrame(draw);
})();
