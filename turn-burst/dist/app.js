/* TURN BURST — no external assets, no timers advancing the simulation. */
(() => {
  'use strict';
  const {Game,UPGRADES,STAGES,BOSS_NAMES,W,H,dist}=window.TurnBurst;
  const $=id=>document.getElementById(id),canvas=$('board'),ctx=canvas.getContext('2d');
  const C={lime:'#d7ff6c',cyan:'#7eeaff',pink:'#ff577e',purple:'#c19aff',orange:'#ffbd65',green:'#8df2be'};
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let game=new Game(3863),started=false,helpOpen=false,selection=null,pointer=null,animation=null;
  let tile=48,width=336,height=432,dpr=1,now=0,particles=[],floats=[],shake=0,announcedSector=1;
  const UPGRADE_SETTLE_MS=350;
  let upgradeReadyAt=Infinity,upgradePress=null,upgradeSawPointer=false;
  const sectorLabel=n=>String(n).padStart(2,'0');
  let soundEnabled=true;
  let savedRun=null;try{savedRun=Game.restore(JSON.parse(localStorage.getItem('turn-burst-run-v2')||'null'));}catch{}
  if(savedRun){$('continue').hidden=false;$('start').classList.add('secondary-button');$('start').innerHTML='最初から出撃 <span>↗</span>';}
  function saveRun(){
    if(!started)return;try{localStorage.setItem('turn-burst-run-v2',JSON.stringify(['won','lost'].includes(game.phase)?null:game.save()));}catch{}
  }
  try{soundEnabled=localStorage.getItem('turn-burst-sound')!=='off';}catch{}

  class Sound {
    constructor(){this.ctx=null;this.timer=null;this.note=0;this.next=0;}
    init(){
      if(!soundEnabled)return;
      try {
        if(!this.ctx){this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=.22;this.master.connect(this.ctx.destination);}
        if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
      }catch{}
    }
    tone(freq,duration=.1,type='sine',volume=.2,delay=0,endFreq=null){
      if(!soundEnabled||!this.ctx||this.ctx.state!=='running')return;
      const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();
      o.type=type;o.frequency.setValueAtTime(freq,t);if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+duration);
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.007);g.gain.exponentialRampToValueAtTime(.001,t+duration);
      o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
    }
    fx(type,n=1){
      if(type==='step'){this.tone(380,.13,'triangle',.32,0,1100);this.tone(95,.15,'sine',.4,0,45);}
      if(type==='kill'){this.tone(580+Math.min(n,10)*72,.11,'triangle',.24);this.tone(120,.09,'sine',.23,0,65);}
      if(type==='boom'){this.tone(85,.24,'sine',.5,0,30);this.tone(240,.13,'sawtooth',.1,0,65);}
      if(type==='hurt'){this.tone(170,.2,'triangle',.32,0,65);this.tone(85,.25,'sine',.35);}
      if(type==='upgrade')[523,659,784,1046].forEach((f,i)=>this.tone(f,.24,'triangle',.3,i*.075));
      if(type==='select')[440,660,880].forEach((f,i)=>this.tone(f,.12,'sine',.3,i*.04));
      if(type==='win')[523,659,784,1046,1318].forEach((f,i)=>this.tone(f,.55,'triangle',.3,i*.12));
      if(type==='lose')[220,196,164].forEach((f,i)=>this.tone(f,.5,'triangle',.22,i*.15));
    }
    start(){
      this.init();if(this.timer||!soundEnabled||!this.ctx)return;
      this.next=this.ctx.currentTime+.05;
      this.timer=setInterval(()=>{
        if(!this.ctx||this.ctx.state!=='running'||!soundEnabled)return;
        const t=this.ctx.currentTime;
        if(this.next<t-.1)this.next=t+.05;
        while(this.next<t+.16){
          const n=this.note++,beat=n%16,bar=Math.floor(n/16)%4,root=[130.81,110,146.83,98][bar];
          const delay=Math.max(0,this.next-t);
          if(beat%4===0)this.tone(root,.34,'triangle',.16,delay);
          const seq=[0,7,12,19,12,7,15,12];
          if(beat%2===0)this.tone(root*2*Math.pow(2,seq[(beat/2)%8]/12),.22,'sine',.07,delay);
          if(beat%4===0)this.tone(65,.1,'sine',.16,delay,30);
          if(beat%4===2)this.tone(930,.035,'triangle',.025,delay,400);
          this.next+=60/112/4;
        }
      },80);
    }
    stop(){if(this.timer)clearInterval(this.timer);this.timer=null;}
  }
  const sound=new Sound();
  function updateSound(){ $('sound').setAttribute('aria-pressed',String(soundEnabled));$('sound').textContent=soundEnabled?'♪':'♩'; }
  updateSound();
  $('sound').addEventListener('click',()=>{soundEnabled=!soundEnabled;try{localStorage.setItem('turn-burst-sound',soundEnabled?'on':'off');}catch{}if(soundEnabled){sound.init();if(started&&!['won','lost'].includes(game.phase))sound.start();}else{sound.stop();if(sound.ctx)sound.ctx.suspend().catch(()=>{});}updateSound();});

  function resize(){
    const r=$('arena').getBoundingClientRect();
    tile=Math.min(r.width/W,(r.height-2)/H);width=tile*W;height=tile*H;
    dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    canvas.style.width=width+'px';canvas.style.height=height+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  const observer=new ResizeObserver(resize);observer.observe($('arena'));
  window.addEventListener('resize',resize);if(window.visualViewport)window.visualViewport.addEventListener('resize',resize);
  function center(x,y){return{x:(x+.5)*tile,y:(y+.5)*tile};}
  function rr(x,y,w,h,r,fill,stroke=null){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function line(x1,y1,x2,y2,color,size=1){ctx.strokeStyle=color;ctx.lineWidth=size;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  function ring(x,y,r,color,size=1){ctx.strokeStyle=color;ctx.lineWidth=size;ctx.beginPath();ctx.arc(x,y,Math.max(.1,r),0,Math.PI*2);ctx.stroke();}
  function polygon(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}

  function enemySprite(e,x,y,t,alpha=1){
    const s=tile/48;ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.globalAlpha*=alpha;
    const bob=Math.sin(t*.002+e.id)*1.5;ctx.translate(0,bob);
    ctx.fillStyle='#03071288';ctx.beginPath();ctx.ellipse(0,13,e.type==='boss'?45:14,5,0,0,7);ctx.fill();
    if(e.type==='mite'){
      ctx.lineWidth=1.2;
      polygon([[-15,3],[-18,-7],[-9,-5],[-6,-15],[1,-10],[10,-15],[12,-6],[18,-5],[13,7],[7,13],[-7,13]],'#75233f','#ff7597');
      polygon([[-10,-2],[-4,-10],[3,-6],[9,-10],[12,1],[7,9],[-7,9]],'#e14870');
      ctx.fillStyle='#fff1d7';ctx.fillRect(-8,-1,5,4);ctx.fillRect(4,-1,5,4);
      ctx.fillStyle='#4b1738';ctx.fillRect(-2,6,4,2);
    }else if(e.type==='brute'){
      polygon([[-18,-9],[-14,-20],[-6,-13],[6,-13],[14,-20],[18,-9],[18,12],[9,18],[-9,18],[-18,12]],'#593761','#d6a2ff');
      rr(-13,-9,26,23,5,'#9962b1');rr(-11,-4,22,9,3,'#291e3c');
      ctx.fillStyle='#f1c9ff';ctx.fillRect(-8,-1,5,3);ctx.fillRect(3,-1,5,3);
      line(-5,11,5,11,'#e7c6f8',2);
    }else if(e.type==='gunner'){
      polygon([[0,-19],[18,0],[0,18],[-18,0]],'#674c2e','#ffe2a0');
      polygon([[0,-12],[12,0],[0,12],[-12,0]],'#f0ad5f');
      ring(0,0,6,'#502d37',3);ctx.fillStyle='#fff9dd';ctx.fillRect(-2,-2,4,4);
      const a=Math.atan2(game.player.y-e.y,game.player.x-e.x);line(Math.cos(a)*6,Math.sin(a)*6,Math.cos(a)*20,Math.sin(a)*20,'#ffe9a9',4);
    }else if(e.type==='runner'){
      polygon([[-18,5],[-12,-9],[-5,-4],[0,-19],[8,-6],[18,-12],[14,9],[0,16]],'#25664c','#9cf7b6');
      polygon([[-8,-3],[9,-5],[5,7],[-7,7]],'#77dba2');line(-6,0,7,0,'#0c3c3e',4);
      polygon([[-18,9],[-25,13],[-14,13]],'#b9ffd1');
    }else if(e.type==='splitter'){
      ctx.fillStyle='#a66cca';ctx.beginPath();ctx.arc(0,0,17,0,7);ctx.fill();ring(0,0,18,'#e0adff',1.2);
      for(const dx of [-7,7]){ctx.fillStyle='#47275e';ctx.beginPath();ctx.arc(dx,1,6,0,7);ctx.fill();ctx.fillStyle='#ffe3ff';ctx.fillRect(dx-2,-1,4,4);}
      polygon([[-3,-16],[0,-23],[4,-16]],'#efbeff');line(0,-9,0,11,'#eac5ff',1);
    }else if(e.type==='mortar'){
      rr(-17,-11,34,28,5,'#97573b','#ffd498');rr(-12,-18,9,20,3,'#e8ac71');rr(3,-18,9,20,3,'#e8ac71');
      rr(-9,3,18,8,2,'#3a2835');ctx.fillStyle='#ffe4a7';ctx.fillRect(-5,5,10,3);
      line(-19,15,-24,20,'#dda47c',4);line(19,15,24,20,'#dda47c',4);
    }else{
      ctx.shadowColor='#ff375f';ctx.shadowBlur=22;
      polygon([[-49,-16],[-40,-44],[-24,-29],[0,-43],[24,-29],[40,-44],[49,-16],[41,25],[23,44],[-23,44],[-41,25]],'#4e203c','#ff5b86');
      ctx.shadowBlur=0;
      polygon([[-33,-14],[-20,-26],[0,-18],[20,-26],[33,-14],[28,20],[0,34],[-28,20]],'#8f3457');
      polygon([[-27,-5],[-7,0],[-10,10],[-25,6]],'#ffd5b6');polygon([[27,-5],[7,0],[10,10],[25,6]],'#ffd5b6');
      polygon([[-11,20],[0,12],[11,20],[0,26]],'#ff7e9c');
      ring(0,0,52+Math.sin(t*.004)*2,'#ff65832b',1);
      if(e.variant==='gate'){rr(-42,-10,84,12,3,'#b29a80');rr(-16,-25,32,13,3,'#eec87c');rr(-7,-23,14,8,2,'#633c3b');}
      if(e.variant==='storm'){polygon([[-45,-10],[-61,-29],[-56,2],[-68,17],[-41,9]],'#9692d3','#e0cbff');polygon([[45,-10],[61,-29],[56,2],[68,17],[41,9]],'#9692d3','#e0cbff');}
      if(e.variant==='reaper'){line(-43,19,-61,-29,'#a7f4bd',5);polygon([[-62,-28],[-40,-48],[-10,-44],[-39,-35]],'#bdffe1','#e7fff2');rr(-14,-13,28,11,3,'#173d36');line(-9,-7,9,-7,'#b6ffb8',3);}
      if(e.variant==='prism'){polygon([[0,-62],[21,-39],[0,-20],[-21,-39]],'#8ee6ff88','#c8f6ff');ring(0,0,56,'#aeeeff',1.5);}
      if(e.variant==='core'){ring(0,0,58,'#ffdaa4',3);ring(0,0,48,'#fff0c7',1);polygon([[0,-25],[22,0],[0,25],[-22,0]],'#ffd9a4','#fff5d5');ring(0,0,9,'#853756',5);}
    }
    if(e.type!=='mite'&&e.type!=='boss'){
      rr(-16,23,32,3,1,'#343043');rr(-16,23,32*Math.max(0,e.hp/e.maxHp),3,1,'#e6cee9');
    }
    if(e.frozen>0){ctx.strokeStyle='#b8f2ff';ctx.lineWidth=1.5;polygon([[-20,-13],[0,-22],[20,-12],[19,17],[-2,22],[-20,12]],'#a8eaff33','#b8f2ff');}
    ctx.restore();
  }
  function heroSprite(x,y,t,dx,dy){
    const s=tile/48;ctx.save();ctx.translate(x,y);ctx.scale(s,s);
    ctx.fillStyle='#0006';ctx.beginPath();ctx.ellipse(0,16,17,5,0,0,7);ctx.fill();
    const bob=Math.sin(t*.003)*1.2;
    ctx.translate(0,bob);
    const angle=Math.atan2(dy,dx);
    ctx.save();ctx.rotate(angle+Math.PI/2);
    polygon([[-10,3],[-15,22],[0,18],[10,23],[10,3]],'#75a643');
    ctx.restore();
    rr(-10,5,7,12,2,'#73869d');rr(3,5,7,12,2,'#73869d');
    rr(-14,-9,28,23,8,'#d3e5d7','#eaffd5');
    rr(-12,-6,24,12,5,'#172e3e');
    ctx.shadowColor=C.lime;ctx.shadowBlur=12;
    rr(-8,-3,16,5,2,C.lime);ctx.shadowBlur=0;
    polygon([[-3,-10],[0,-17],[4,-10]],'#e7ffb5');
    rr(-18,2,6,10,2,'#9aaeb5');rr(12,2,6,10,2,'#9aaeb5');
    ctx.save();ctx.rotate(angle);rr(11,-3,16,6,2,'#a9d7db');rr(21,-4,6,8,2,'#e4ffef');ctx.restore();
    ctx.restore();
  }

  function drawGrid(t){
    ctx.fillStyle='#0b1423';ctx.fillRect(0,0,width,height);
    const g=ctx.createRadialGradient(width*.5,height*.4,0,width*.5,height*.4,height*.7);g.addColorStop(0,'#21304a55');g.addColorStop(1,'#090f1e00');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const c=center(x,y);rr(x*tile+2,y*tile+2,tile-4,tile-4,4,(x+y)%2?'#13203675':'#17243a75');
      ctx.fillStyle='#2e3e5555';ctx.fillRect(c.x-.8,c.y-.8,1.6,1.6);
    }
    ctx.fillStyle=game.stage.color+'0b';ctx.fillRect(0,0,width,height);
    ctx.lineWidth=1;
    for(let y=0;y<=H;y++)for(let x=0;x<=W;x++){
      line(x*tile-2,y*tile,x*tile+2,y*tile,'#3b4a6133');line(x*tile,y*tile-2,x*tile,y*tile+2,'#3b4a6133');
    }
    const visibleGame=animation?animation.before:game;
    for(const f of visibleGame.fires){const c=center(f.x,f.y);rr(f.x*tile+4,f.y*tile+4,tile-8,tile-8,5,'#ff7a3a30','#ffad5f50');ctx.globalAlpha=.5+.15*Math.sin(t*.005+f.x);polygon([[c.x-tile*.12,c.y+tile*.2],[c.x-tile*.16,c.y],[c.x,c.y-tile*.22],[c.x+tile*.15,c.y+tile*.1]],'#ffb972');ctx.globalAlpha=1;}
    if(started&&!animation&&!helpOpen){
      const danger=new Map();
      for(const e of game.enemies){
        if(e.frozen>0)continue;
        if(!e.intent)continue;
        for(const p of e.intent.cells){
          if(e.intent.kind!=='move'||dist(p,game.player)<=1)danger.set(`${p.x},${p.y}`,p);
        }
      }
      for(const p of danger.values()){
        ctx.lineWidth=.8;rr(p.x*tile+3,p.y*tile+3,tile-6,tile-6,4,'#ff47751b','#ff698b55');
        const c=center(p.x,p.y);line(c.x-3,c.y+tile*.32,c.x+3,c.y+tile*.32,'#ff6b8e99',1.5);
      }
      for(let yy=game.player.y-1;yy<=game.player.y+1;yy++)for(let xx=game.player.x-1;xx<=game.player.x+1;xx++)if(game.canMove(xx,yy)){
        const sel=selection&&selection.x===xx&&selection.y===yy;
        ctx.lineWidth=sel?2:1;rr(xx*tile+3,yy*tile+3,tile-6,tile-6,5,sel?'#d7ff6c33':null,sel?C.lime:'#d9f2ff77');
        if(!game.occupied(xx,yy)&&(xx!==game.player.x||yy!==game.player.y)){
          const c=center(xx,yy),dx=xx-game.player.x,dy=yy-game.player.y;
          ctx.save();ctx.translate(c.x,c.y);ctx.rotate(Math.atan2(dy,dx));ctx.globalAlpha=.3;line(-4,0,4,0,'#d9f2ff',1.3);line(1,-3,4,0,'#d9f2ff',1.3);line(1,3,4,0,'#d9f2ff',1.3);ctx.restore();
        }
      }
      if(selection&&selection.preview){
        const preview=selection.preview;
        for(const p of preview.pulse)rr(p.x*tile+4,p.y*tile+4,tile-8,tile-8,4,'#c39aff16');
        for(const cells of preview.beams)for(const p of cells)rr(p.x*tile+3,p.y*tile+3,tile-6,tile-6,4,'#7eeaff35','#7eeaff70');
        for(const e of preview.events.filter(e=>e.type==='death')){const c=center(e.x,e.y);ring(c.x,c.y,tile*.38,'#d7ff6c',1.7);}
      }
    }
    for(const p of visibleGame.pickups){const c=center(p.x,p.y);ctx.save();ctx.translate(c.x,c.y);const s=tile/48;ctx.scale(s,s);rr(-10,-10,20,20,5,'#164f47','#8df2be');rr(-2,-6,4,12,1,C.green);rr(-6,-2,12,4,1,C.green);ctx.restore();}
  }

  function drawActors(t){
    const a=animation,elapsed=a?t-a.start:0;
    const before=a?a.before:null;
    const live=new Map(game.enemies.map(e=>[e.id,e]));
    const enemies=a?[...before.enemies,...game.enemies.filter(e=>!before.enemies.some(b=>b.id===e.id))]:game.enemies;
    for(const e of enemies){
      let x=e.x,y=e.y,alpha=1;
      if(a){
        const after=live.get(e.id),old=before.enemies.find(b=>b.id===e.id),death=a.events.find(ev=>ev.type==='death'&&ev.id===e.id);
        if(old&&!after){const dt=death?eventTime(death):220;if(elapsed>=dt)continue;}
        if(!old){alpha=Math.max(0,Math.min(1,(elapsed-540)/180));if(alpha===0)continue;}
        else if(after){const p=Math.max(0,Math.min(1,(elapsed-440)/190));x=old.x+(after.x-old.x)*p;y=old.y+(after.y-old.y)*p;}
        const hit=a.events.find(ev=>ev.type==='hit'&&ev.id===e.id&&Math.abs(elapsed-eventTime(ev))<60);
        if(hit)alpha=.5+.5*Math.sin(elapsed*.12);
      }
      const c=center(x,y);enemySprite(e,c.x,c.y,t,alpha);
    }
    let px=game.player.x,py=game.player.y;
    if(a){const p=1-Math.pow(1-Math.min(1,elapsed/110),3);px=before.player.x+(game.player.x-before.player.x)*p;py=before.player.y+(game.player.y-before.player.y)*p;}
    const p=center(px,py);
    if(a&&elapsed<180&&!reduced){
      const from=center(before.player.x,before.player.y);
      ctx.save();ctx.globalCompositeOperation='lighter';
      line(from.x,from.y,p.x,p.y,'#caff6555',tile*.42*(1-elapsed/180));
      line(from.x,from.y,p.x,p.y,'#eaffb499',tile*.12*(1-elapsed/180));
      ctx.restore();
    }
    if(!a&&started){ring(p.x,p.y,tile*.44,'#d7ff6c55',1.2);ring(p.x,p.y,tile*(.47+.02*Math.sin(t*.003)),'#d7ff6c16',1);}
    heroSprite(p.x,p.y,t,game.player.dx,game.player.dy);
  }

  const eventTime=e=>e.type==='hurt'||e.type==='enemyAttack'?460:e.type==='heal'?90:e.type==='bossEnter'?650:130+Math.min(8,e.depth||0)*38;
  function emit(x,y,color,n=15,power=1){
    if(reduced)n=Math.min(4,n);
    for(let i=0;i<n;i++){
      const a=Math.random()*Math.PI*2,s=(.6+Math.random()*2.2)*power;
      particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,color,size:1+Math.random()*3,born:now,life:260+Math.random()*300});
    }
    if(particles.length>500)particles.splice(0,particles.length-500);
  }
  function emitEvent(e){
    const p=center(e.x||0,e.y||0);
    if(e.type==='death'){
      emit(p.x,p.y,e.kind==='brute'?C.purple:C.pink,e.kind==='boss'?80:17,e.kind==='boss'?3:1.3);
      if(e.kind==='boss'){shake=9;sound.fx('boom');}
      else if(animation.soundedKills++<6)sound.fx('kill',animation.soundedKills);
      shake=Math.max(shake,game.lastKills>=5?3.5:1.7);
    }
    if(e.type==='boom'){emit(p.x,p.y,C.orange,12,1.3);if(animation.soundedBooms++<3)sound.fx('boom');}
    if(e.type==='hurt'){shake=6;sound.fx('hurt');floats.push({x:p.x,y:p.y-tile*.45,text:'−'+e.amount,color:C.pink,born:now});}
    if(e.type==='heal'){emit(p.x,p.y,C.green,18);floats.push({x:p.x,y:p.y-tile*.45,text:'+3',color:C.green,born:now});}
    if(e.type==='hit'&&e.boss){
      animation.bossFloats??=new Set();
      if(!animation.bossFloats.has(e.id)){
        animation.bossFloats.add(e.id);
        const total=animation.events.filter(v=>v.type==='hit'&&v.id===e.id).reduce((sum,v)=>sum+v.amount,0);
        floats.push({x:p.x,y:p.y-tile*.3,text:'−'+total,color:'#fff2c5',born:now});
      }
    }
  }
  function drawEffects(t){
    const a=animation;
    if(a){
      const elapsed=t-a.start;
      for(let i=0;i<a.events.length;i++){
        const e=a.events[i],at=eventTime(e),age=elapsed-at;
        if(age>=0&&!a.fired.has(i)){a.fired.add(i);emitEvent(e);}
        if(age<0||age>350)continue;
        const life=1-age/350;ctx.save();ctx.globalAlpha=life;
        if(e.type==='beam'&&e.cells.length){
          const from=center(e.x,e.y),to=center(e.cells[e.cells.length-1].x,e.cells[e.cells.length-1].y);
          ctx.globalCompositeOperation='lighter';ctx.shadowColor=C.cyan;ctx.shadowBlur=15;
          line(from.x,from.y,to.x,to.y,'#239ca588',tile*.29*life);line(from.x,from.y,to.x,to.y,C.cyan,tile*.12*life);line(from.x,from.y,to.x,to.y,'#f3fff2',tile*.04*life);
          ctx.shadowBlur=0;
        }
        if(e.type==='pulse'||e.type==='boom'){
          const p=center(e.x,e.y),r=tile*(e.type==='pulse'?e.r+.45:game.weapons.blast===3?2.2:1.2)*Math.min(1,age/220);
          ctx.globalCompositeOperation='lighter';const color=e.type==='boom'?C.orange:C.purple;
          ring(p.x,p.y,r,color,3*life);ring(p.x,p.y,r*.8,color,1*life);
          if(age<90){ctx.fillStyle=e.type==='boom'?'#ffd57d33':'#c3a2ff22';ctx.beginPath();ctx.arc(p.x,p.y,r,0,7);ctx.fill();}
        }
        if(e.type==='death'&&age<160){
          const p=center(e.x,e.y),k=1-age/160;
          ctx.globalCompositeOperation='lighter';ctx.globalAlpha=k;
          ring(p.x,p.y,tile*(.16+age/500),e.kind==='boss'?C.orange:'#ffb8cc',2*k);
          if(age<70){ctx.fillStyle='#fff5dd';ctx.beginPath();ctx.arc(p.x,p.y,tile*.19*k,0,7);ctx.fill();}
          line(p.x-tile*.33*k,p.y,p.x+tile*.33*k,p.y,'#ffe1bd',2*k);
          line(p.x,p.y-tile*.33*k,p.x,p.y+tile*.33*k,'#ffe1bd',2*k);
        }
        if(e.type==='arc'||e.type==='drone'){
          const from=center(e.from.x,e.from.y),to=center(e.to.x,e.to.y),color=e.type==='arc'?C.lime:'#ff91d4';
          ctx.globalCompositeOperation='lighter';ctx.lineWidth=2;ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=9;
          ctx.beginPath();ctx.moveTo(from.x,from.y);
          for(let j=1;j<5;j++)ctx.lineTo(from.x+(to.x-from.x)*j/5+Math.sin(j*17+Math.floor(age/40))*7,from.y+(to.y-from.y)*j/5+Math.cos(j*13)*5);
          ctx.lineTo(to.x,to.y);ctx.stroke();
        }
        if(e.type==='enemyAttack')for(const p of e.cells){ctx.globalAlpha=life*.5;rr(p.x*tile+4,p.y*tile+4,tile-8,tile-8,3,'#ff567e');}
        if(e.type==='meteor'){
          const p=center(e.x,e.y);ctx.globalCompositeOperation='lighter';line(p.x+tile*.8*life,p.y-tile*2*life,p.x,p.y,'#ffbb7966',tile*.4*life);ring(p.x,p.y,tile*(1.4-life),C.orange,4*life);
        }
        if(e.type==='freeze'){const p=center(e.x,e.y);ring(p.x,p.y,tile*.43,'#b5f2ff',2*life);}
        if(e.type==='fire')for(const p of e.cells){ctx.globalAlpha=life*.25;rr(p.x*tile+5,p.y*tile+5,tile-10,tile-10,4,'#ffad65');}
        if(e.type==='hurt'){ctx.globalAlpha=life*.15;ctx.fillStyle=C.pink;ctx.fillRect(0,0,width,height);}
        ctx.restore();
      }
    }
    particles=particles.filter(p=>t-p.born<p.life);
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(const p of particles){const age=t-p.born,frames=age/16;ctx.globalAlpha=Math.pow(1-age/p.life,1.5);ctx.fillStyle=p.color;const x=p.x+p.vx*frames,y=p.y+p.vy*frames+frames*frames*.014;line(x-p.vx*1.8,y-p.vy*1.8,x,y,p.color,p.size*.6);ctx.fillRect(x-p.size/2,y-p.size/2,p.size,p.size);}
    ctx.restore();floats=floats.filter(f=>t-f.born<800);
    for(const f of floats){const age=t-f.born;ctx.globalAlpha=1-age/800;ctx.font=`800 ${tile*.4}px sans-serif`;ctx.textAlign='center';ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y-age*.035);ctx.globalAlpha=1;}
  }

  function render(t){
    now=t;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.save();
    if(shake>.1&&!reduced){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.88;}
    drawGrid(t);drawActors(t);drawEffects(t);ctx.restore();
    if(animation){
      const elapsed=t-animation.start;
      if(elapsed>170&&!animation.comboShown){animation.comboShown=true;updateHUD();if(game.lastKills>=3)showCombo(game.lastKills);}
      if(elapsed>animation.duration){animation=null;finishTurn();}
    }
    if(game.phase==='upgrade'&&t>=upgradeReadyAt&&!$('upgrade-screen').hidden){$('choices').classList.remove('choices-locked');$('choices').setAttribute('aria-disabled','false');}
    requestAnimationFrame(render);
  }
  function showCombo(n){
    const el=$('combo');el.innerHTML=`<strong>${n}</strong><span>撃破</span><small>${n>=12?'TOTAL ANNIHILATION':n>=7?'CHAIN REACTION':'BURST KILL'}</small>`;
    el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
  }
  function banner(text){const el=$('sector-banner');el.textContent=text;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');}

  function updateHUD(){
    $('health').innerHTML=Array.from({length:game.player.maxHp},(_,i)=>`<i class="${i<game.player.hp?'on':''}"></i>`).join('');
    $('health').classList.toggle('low',game.player.hp<=3);$('hp-number').textContent=`${game.player.hp} / ${game.player.maxHp}`;
    $('score').textContent=game.score.toLocaleString();$('turn').textContent=`TURN ${String(game.turn).padStart(2,'0')}`;
    $('sector').innerHTML=`${sectorLabel(game.sector)}/${STAGES.length} <b>${game.stage.name}</b>`;
    $('turn').textContent=game.bossSpawned?'BOSS BATTLE':`WAVE ${String(game.sectorTurn).padStart(2,'0')}/${game.stage.turns}`;
    $('level').textContent=`CORE ${String(game.level+1).padStart(2,'0')}`;
    const prev=game.thresholds[game.xpLevel-1]||0,next=game.thresholds[game.xpLevel]||game.kills;
    $('xp').style.width=`${next===prev?100:Math.min(100,(game.kills-prev)/(next-prev)*100)}%`;
    const maxed=UPGRADES.every(u=>game.weapons[u.id]>=u.max);
    $('next-upgrade').textContent=maxed||game.xpLevel>=game.thresholds.length?'MAX CORE':`あと${Math.max(0,next-game.kills)}撃破で強化`;
    if(maxed)$('xp').style.width='100%';
    const boss=game.enemies.find(e=>e.type==='boss');$('boss-health').hidden=!boss;
    if(boss){$('boss-name').textContent=BOSS_NAMES[boss.variant]||BOSS_NAMES.king;$('boss-hp').textContent=`${boss.hp} / ${boss.maxHp}`;$('boss-fill').style.width=boss.hp/boss.maxHp*100+'%';}
    $('loadout').innerHTML='<button class="weapon-chip base" aria-label="基本装備を見る">↟ 射撃 ＋ ◎ 衝撃波</button>'+UPGRADES.filter(u=>game.weapons[u.id]).map(u=>`<button class="weapon-chip" style="color:${u.color}" aria-label="${u.name} レベル${game.weapons[u.id]}">${u.icon}<small>${game.weapons[u.id]}</small></button>`).join('');
  }
  function updateHint(){
    const el=$('hint');el.className='hint';
    if(selection&&selection.preview){
      const p=selection.preview;el.classList.add(p.damage?'danger':'preview');
      const dmg=p.damage?`HP −${p.damage}`:'ダメージなし';
      el.textContent=`この一手：${p.kills}撃破${p.bossDamage?` / ボス −${p.bossDamage}`:''} · ${dmg}`;
    }else if(animation)el.textContent='BURST IN PROGRESS';
    else if(game.turn===0)el.textContent='上の敵へ踏み込んでみよう。隣のマスをタップ';
    else if(game.turn<3)el.textContent='長押しで結果を確認。指を外へずらすとキャンセル';
    else if(game.player.hp<=3)el.textContent='HPが残りわずか。緑の救急箱で回復';
    else el.textContent='隣へ移動して攻撃 · 自分をタップでその場撃ち';
  }
  function interactive(){return started&&!helpOpen&&!animation&&game.phase==='play';}
  function point(event){const r=canvas.getBoundingClientRect();return{x:Math.floor((event.clientX-r.left)/r.width*W),y:Math.floor((event.clientY-r.top)/r.height*H)};}
  function select(x,y){
    if(selection&&selection.x===x&&selection.y===y)return;
    selection=game.canMove(x,y)?{x,y,preview:game.preview(x,y)}:null;updateHint();
  }
  canvas.addEventListener('pointerdown',e=>{
    if(!interactive()||pointer!==null)return;e.preventDefault();sound.init();pointer=e.pointerId;canvas.setPointerCapture(e.pointerId);
    const p=point(e);select(p.x,p.y);
    if(!selection){$('hint').textContent='白い枠のある、隣のマスを選んでください';}
  });
  canvas.addEventListener('pointermove',e=>{if(!interactive())return;if(pointer!==null&&pointer!==e.pointerId)return;if(pointer!==null||e.pointerType==='mouse'){const p=point(e);select(p.x,p.y);}});
  canvas.addEventListener('pointerup',e=>{
    if(pointer!==e.pointerId)return;pointer=null;
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    const p=point(e),chosen=selection;selection=null;
    if(interactive()&&chosen&&chosen.x===p.x&&chosen.y===p.y)act(p.x,p.y);else updateHint();
  });
  canvas.addEventListener('pointercancel',()=>{pointer=null;selection=null;updateHint();});
  canvas.addEventListener('pointerleave',()=>{if(pointer===null){selection=null;updateHint();}});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('keydown',e=>{
    if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;
    if(helpOpen){if(e.key==='Escape')closeHelp();return;}
    if(game.phase==='upgrade'&&started){const n=Number(e.key);if(n>=1&&n<=3)chooseUpgrade(game.offers[n-1]);return;}
    if(!interactive())return;
    const directions={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],q:[-1,-1],w:[0,-1],e:[1,-1],a:[-1,0],s:[0,0],d:[1,0],z:[-1,1],x:[0,1],c:[1,1],' ':[0,0]};
    const dir=directions[e.key];if(dir){e.preventDefault();selection=null;act(game.player.x+dir[0],game.player.y+dir[1]);}
  });
  function act(x,y){
    if(!interactive()||!game.canMove(x,y))return;
    const before=game.clone();sound.init();sound.fx('step');game.step(x,y);
    saveRun();
    animation={before,events:game.events.slice(),start:performance.now(),duration:reduced?700:800,fired:new Set(),comboShown:false,soundedKills:0,soundedBooms:0};
    $('clock-state').classList.add('running');$('clock-state').innerHTML='<i></i> BURST';updateHint();
  }
  function finishTurn(){
    updateHUD();updateHint();$('clock-state').classList.remove('running');$('clock-state').innerHTML='<i></i> TIME STOPPED';
    if(game.events.some(e=>e.type==='bossEnter'))banner('WARNING / '+BOSS_NAMES[game.stage.boss]);
    if(game.phase==='rest')showRest();
    if(game.phase==='upgrade')showUpgrade();
    if(game.phase==='won'||game.phase==='lost')showResult();
  }
  function showUpgrade(){
    upgradeReadyAt=performance.now()+UPGRADE_SETTLE_MS;upgradePress=null;upgradeSawPointer=false;
    $('choices').classList.add('choices-locked');$('choices').setAttribute('aria-disabled','true');
    sound.fx('upgrade');$('upgrade-screen').hidden=false;$('upgrade-level').textContent=`${String(game.level+1).padStart(2,'0')} → ${String(game.level+2).padStart(2,'0')}`;
    $('choices').innerHTML=game.offers.map(id=>{const u=UPGRADES.find(u=>u.id===id),level=game.weapons[id],awaken=level===2&&u.max===3;return `<button class="upgrade-card${awaken?' awaken':''}" data-upgrade="${id}" style="--card:${u.color}"><span class="upgrade-icon">${u.icon}</span><span class="upgrade-copy"><span class="upgrade-top"><b>${u.name}</b><small>${awaken?'覚醒 LV.3':level?'LV.'+(level+1):'NEW'}</small></span><span class="upgrade-short">${awaken?'AWAKENING':level?'さらに強化':u.short}</span><p>${u.desc[level]}</p></span></button>`;}).join('');
  }
  function chooseUpgrade(id){
    if(animation||helpOpen||$('upgrade-screen').hidden||performance.now()<upgradeReadyAt||!game.choose(id))return;sound.init();sound.fx('select');updateHUD();selection=null;
    upgradePress=null;
    saveRun();
    if(game.phase==='upgrade')showUpgrade();else{$('upgrade-screen').hidden=true;updateHint();}
  }
  $('choices').addEventListener('pointerdown',e=>{
    upgradeSawPointer=true;
    if(e.isPrimary===false||(e.button!==undefined&&e.button!==0))return;
    upgradePress=null;
    const b=e.target.closest('[data-upgrade]');
    if(b&&game.phase==='upgrade'&&!helpOpen&&!animation&&performance.now()>=upgradeReadyAt)upgradePress={id:b.dataset.upgrade,pointerId:e.pointerId,released:false};
  });
  $('choices').addEventListener('pointerup',e=>{
    if(!upgradePress||e.pointerId!==upgradePress.pointerId)return;
    const b=e.target.closest('[data-upgrade]');
    if(b&&b.dataset.upgrade===upgradePress.id)upgradePress.released=true;else upgradePress=null;
  });
  $('choices').addEventListener('pointercancel',e=>{if(upgradePress?.pointerId===e.pointerId)upgradePress=null;});
  $('choices').addEventListener('click',e=>{
    const b=e.target.closest('[data-upgrade]');if(!b)return;
    const fresh=upgradePress?.released&&upgradePress.id===b.dataset.upgrade&&(e.pointerId===undefined||e.pointerId===upgradePress.pointerId);
    const accessible=e.detail===0&&!upgradeSawPointer;
    if(fresh||accessible)chooseUpgrade(b.dataset.upgrade);
    upgradePress=null;
  });
  $('choices').addEventListener('keydown',e=>{
    if(e.repeat||!['Enter',' '].includes(e.key))return;
    const b=e.target.closest('[data-upgrade]');if(b){e.preventDefault();chooseUpgrade(b.dataset.upgrade);}
  });
  function showRest(){
    $('rest-screen').hidden=false;sound.fx('upgrade');$('clear-number').textContent=`${sectorLabel(game.sector)} / ${STAGES.length}`;
    $('clear-title').textContent=game.stage.name+'、突破。';$('journey').innerHTML=STAGES.map((_,i)=>`<span class="${i<game.sector?'done':''}"></span>`).join('');
    const next=STAGES[game.sector];$('next-name').textContent=`${sectorLabel(game.sector+1)} / ${next.name}`;$('next-description').textContent=next.subtitle+(game.sector+1===3?'。主力武器の覚醒が解禁。':'');
    $('supply-note').textContent=UPGRADES.every(u=>game.weapons[u.id]>=u.max)?'HPを3回復 / 全武器の強化が完了':'HPを3回復 ＋ 武器強化を1回獲得';
  }
  $('next-sector').addEventListener('click',()=>{
    if(animation||!game.nextSector())return;$('rest-screen').hidden=true;selection=null;pointer=null;announcedSector=game.sector;
    saveRun();
    updateHUD();updateHint();banner(`SECTOR ${sectorLabel(game.sector)} / ${game.stage.name}`);if(game.phase==='upgrade')showUpgrade();
  });
  function showResult(){
    sound.stop();const win=game.phase==='won';sound.fx(win?'win':'lose');$('result-screen').hidden=false;
    $('result-tag').textContent=win?'OPERATION COMPLETE':'SIGNAL LOST';
    $('result-title').innerHTML=win?'創世の核を、砕いた。':'次の一手が、ある。';
    $('result-copy').textContent=win?`全${STAGES.length}エリアと${STAGES.filter(s=>s.boss).length}体のボスを突破。その組み合わせが、群れを砕いた。`:`エリア${game.sector} / ${game.stage.name}。長押しで被ダメージを確認して、次の突破へ。`;
    $('result-score').textContent=game.score.toLocaleString();$('result-turn').textContent=game.turn;$('result-kills').textContent=game.kills;$('result-combo').textContent=game.bestCombo;
    $('result-build').innerHTML=UPGRADES.filter(u=>game.weapons[u.id]).map(u=>`<span>${u.icon} ${u.name} ${game.weapons[u.id]}</span>`).join('');
    let best=game.score;try{best=Math.max(game.score,Number(localStorage.getItem('turn-burst-best-v3'))||0);localStorage.setItem('turn-burst-best-v3',String(best));}catch{}
    $('best').textContent=`BEST SCORE ${best.toLocaleString()}`;
  }
  function start(){
    game=new Game(Date.now());started=true;selection=null;pointer=null;animation=null;particles=[];floats=[];announcedSector=1;
    for(const id of ['start-screen','upgrade-screen','result-screen','help-screen','rest-screen'])$(id).hidden=true;
    helpOpen=false;$('combo').classList.remove('show');$('sector-banner').classList.remove('show');
    sound.start();updateHUD();updateHint();banner('READY / 一手ずつ、進め');resize();saveRun();
  }
  $('start').addEventListener('click',start);$('retry').addEventListener('click',start);
  $('continue').addEventListener('click',()=>{
    if(!savedRun)return;game=savedRun;savedRun=null;started=true;helpOpen=false;selection=null;pointer=null;animation=null;
    for(const id of ['start-screen','upgrade-screen','result-screen','help-screen','rest-screen'])$(id).hidden=true;
    sound.start();updateHUD();updateHint();resize();
    if(game.phase==='upgrade')showUpgrade();else if(game.phase==='rest')showRest();else banner(`RESUME / ${game.stage.name}`);
  });
  function openHelp(){
    if(animation)return;helpOpen=true;selection=null;pointer=null;$('help-screen').hidden=false;
    $('equipment-help').innerHTML='<div class="eyebrow accent" style="margin-top:20px">現在の装備</div><div class="equipment-row" style="--card:#7eeaff"><span>↟ 貫通射撃 ＋ ◎ 衝撃波</span><p>進んだ方向に射程4・2ダメージの貫通弾。自分と周囲8マスに1ダメージ。</p></div>'+UPGRADES.filter(u=>game.weapons[u.id]).map(u=>`<div class="equipment-row" style="--card:${u.color}"><span>${u.icon} ${u.name} LV.${game.weapons[u.id]}</span><p>${u.desc[game.weapons[u.id]-1]}</p></div>`).join('');
  }
  function closeHelp(){helpOpen=false;$('help-screen').hidden=true;updateHint();}
  $('help').addEventListener('click',openHelp);$('close-help').addEventListener('click',closeHelp);$('loadout').addEventListener('click',openHelp);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){sound.stop();if(sound.ctx)sound.ctx.suspend().catch(()=>{});pointer=null;selection=null;upgradePress=null;}
    else if(started&&!['won','lost'].includes(game.phase))sound.start();
  });
  window.addEventListener('pagehide',()=>{saveRun();sound.stop();});
  updateHUD();resize();requestAnimationFrame(render);
  // Read-only diagnostics help check viewport fit and turn progression without an autoplay mode.
  window.turnBurstDebug=()=>({turn:game.turn,sector:game.sector,sectorTurn:game.sectorTurn,bossesDefeated:game.bossesDefeated,phase:game.phase,started,busy:!!animation,player:{...game.player},enemies:game.enemies.map(e=>({...e})),weapons:{...game.weapons},kills:game.kills,score:game.score,canvas:{width,height},offers:[...game.offers]});
})();
