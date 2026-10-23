(() => {
  'use strict';
  const E=window.AetherPair,$=id=>document.getElementById(id),canvas=$('board'),ctx=canvas.getContext('2d');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLOR={aster:'#f49b82',lumiere:'#89e7f0',gold:'#f4d796',danger:'#fc809a',ink:'#11283c'};
  let state=E.create(),started=false,orders=[],draft=null,view=null,animation=null,helpOpen=false,modalOpen=true,focusEnemy=null;
  let tile=38,width=342,height=418,dpr=1,now=0,particles=[],floaters=[],shake=0,saved=null,records={};
  const clamp=n=>Math.min(1,Math.max(0,n));
  try{const data=JSON.parse(localStorage.getItem('aether-pair-save-v1')||'null');saved=E.restore(data?.run);if(data?.records&&typeof data.records==='object')for(let i=0;i<E.MISSIONS.length;i++)if(Number.isInteger(data.records[i])&&data.records[i]>=0&&data.records[i]<=3)records[i]=data.records[i];}catch{}
  let soundOn=true;try{soundOn=localStorage.getItem('aether-pair-sound')!=='off';}catch{}
  class Audio {
    constructor(){this.ctx=null;this.timer=null;this.step=0;this.nodes=new Set();}
    init(){if(!soundOn)return;try{if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=.3;this.master.connect(this.ctx.destination);}if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});}catch{}}
    tone(f,d=.15,type='triangle',v=.12,delay=0,end=null){
      if(!soundOn||!this.ctx||this.ctx.state!=='running')return;
      const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(end)o.frequency.exponentialRampToValueAtTime(Math.max(22,end),t+d);
      g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(v,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(this.master);this.nodes.add(o);o.onended=()=>{o.disconnect();g.disconnect();this.nodes.delete(o);};o.start(t);o.stop(t+d+.03);
    }
    music(){this.init();if(!soundOn||this.timer!==null)return;this.timer=setInterval(()=>{
      if(document.hidden||state.phase!=='plan')return;
      const melody=[0,7,12,14,7,3,10,7,0,7,15,14,12,10,7,3],chords=[0,-2,-5,-2],bar=Math.floor(this.step/16)%4,root=(state.mission===5?146.83:164.81)*Math.pow(2,chords[bar]/12),n=this.step%16;
      this.tone(root*Math.pow(2,melody[n]/12),.32,'triangle',.055);if(n%4===0)this.tone(root/2,.5,'sine',.12);if(n===0)this.tone(root*1.5,1.3,'sine',.035);this.step++;
    },180);}
    stop(){if(this.timer!==null)clearInterval(this.timer);this.timer=null;for(const o of this.nodes){try{o.stop(this.ctx.currentTime+.02);}catch{}}}
    fx(kind){
      if(kind==='select'){this.tone(493.88,.09,'sine',.14);this.tone(739.99,.1,'triangle',.1,.04);}
      if(kind==='move')this.tone(250,.1,'triangle',.1,0,450);
      if(kind==='hit'){this.tone(130,.15,'sine',.35,0,40);this.tone(480,.09,'triangle',.13,0,120);}
      if(kind==='push'){this.tone(110,.23,'triangle',.25,0,40);}
      if(kind==='guard')[329.63,493.88].forEach(f=>this.tone(f,.3,'sine',.1));
      if(kind==='combo'){[164.81,329.63,493.88,659.25].forEach((f,i)=>this.tone(f,.48,'triangle',.17,i*.07));this.tone(82.41,.65,'sine',.5,0,28);}
      if(kind==='win')[329.63,415.3,493.88,659.25,830.61].forEach((f,i)=>this.tone(f,.7,'triangle',.18,i*.13));
      if(kind==='lose')[220,196,146.83].forEach((f,i)=>this.tone(f,.7,'triangle',.14,i*.16));
    }
  }
  const sound=new Audio();
  function updateSound(){$('sound').textContent=soundOn?'♪':'♩';$('sound').setAttribute('aria-pressed',String(soundOn));$('sound').setAttribute('aria-label',soundOn?'音を消す':'音を出す');}
  $('sound').addEventListener('click',()=>{soundOn=!soundOn;try{localStorage.setItem('aether-pair-sound',soundOn?'on':'off');}catch{}if(soundOn&&started&&!document.hidden)sound.music();else{sound.stop();sound.ctx?.suspend().catch(()=>{});}updateSound();});updateSound();
  function storeRun(run=state){try{localStorage.setItem('aether-pair-save-v1',JSON.stringify({run:E.save(run),records}));}catch{}}
  function resize(){const r=$('arena').getBoundingClientRect();tile=Math.max(1,Math.min(r.width/E.W,(r.height-2)/E.H));width=tile*E.W;height=tile*E.H;dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=width+'px';canvas.style.height=height+'px';}
  new ResizeObserver(resize).observe($('arena'));window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
  const point=(x,y)=>({x:(x+.5)*tile,y:(y+.5)*tile});
  function line(x,y,xx,yy,color,w=1){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();}
  function ring(x,y,r,color,w=1){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.arc(x,y,Math.max(.1,r),0,Math.PI*2);ctx.stroke();}
  function box(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=1;ctx.strokeStyle=stroke;ctx.stroke();}}
  function poly(ps,fill,stroke){ctx.beginPath();ps.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function text(str,x,y,size,color,weight=700){ctx.font=`${weight} ${size}px sans-serif`;ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(str,x,y);}
  function sprite(e,x,y,t,alpha=1){
    ctx.save();ctx.translate(x,y);ctx.scale(tile/44,tile/44);ctx.globalAlpha*=alpha;
    ctx.fillStyle='#04172e70';ctx.beginPath();ctx.ellipse(0,16,17,5,0,0,7);ctx.fill();
    const bob=reduced?0:Math.sin(t*.002+(e.id.length||0))*1;ctx.translate(0,bob);
    if(e.id==='aster'){
      poly([[-12,-7],[-21,8],[-11,17],[-5,8],[4,19],[10,6]],'#a64d4e','#ffc3a1');
      box(-10,7,7,12,2,'#c5d9db');box(3,7,7,12,2,'#c5d9db');
      poly([[-12,-8],[0,-14],[12,-8],[10,9],[0,15],[-10,9]],'#ea846d','#ffe1be');
      box(-9,-18,18,15,5,'#e3e9dc','#fff6d0');box(-7,-14,14,5,1,'#1c4055');line(-4,-12,5,-12,'#9ce5e6',2);
      poly([[0,-17],[-2,-26],[4,-20],[5,-14]],'#e8c988');
      poly([[-14,-9],[-23,-5],[-22,14],[-14,20],[-6,11],[-7,-5]],'#bd5b51','#ffe0b3');
      poly([[-15,-3],[-19,0],[-18,10],[-14,14],[-11,8],[-11,0]],'#f5c497');
      line(13,-3,23,-14,'#d9f7f4',3);line(12,0,18,4,'#f2d494',3);
    }else if(e.id==='lumiere'){
      poly([[-9,-9],[-23,-2],[-18,12],[-5,9],[-12,22],[4,13],[14,19],[11,-2]],'#36768d','#a4e9f1');
      box(-8,8,6,12,2,'#bdd8df');box(3,8,6,12,2,'#bdd8df');
      poly([[-10,-8],[0,-13],[11,-6],[9,9],[-8,11]],'#dfe9dc','#fff6d5');
      box(-8,-19,17,14,4,'#e7ebd9','#fff7d5');box(-6,-15,13,5,1,'#254b61');line(-3,-13,5,-13,'#9ff7fc',2);
      poly([[-6,-18],[-16,-24],[-9,-12]],'#88d8e9','#d0fcf4');
      box(7,-4,18,8,2,'#426e81','#bfdfe3');box(17,-8,7,15,1,'#c6e5dd','#fbefd3');line(22,-1,29,-1,'#8cecf2',3);
      ring(3,1,3,'#83cbd3',2);
    }else if(e.id==='beacon'){
      poly([[-15,15],[0,22],[15,15],[11,7],[-11,7]],'#7797a5','#c0d3cc');
      poly([[-7,9],[-5,-10],[5,-10],[7,9]],'#b0cbd0','#e8edcf');box(-8,-16,16,13,3,'#417e96','#c3f0e7');
      ctx.shadowColor='#9beaf1';ctx.shadowBlur=12;poly([[0,-24],[-6,-10],[0,-4],[6,-10]],'#f6e6ad','#fff8d6');ctx.shadowBlur=0;ring(0,-12,14,'#b8eee755',1);
    }else if(e.type==='talon'){
      poly([[-7,-8],[-24,-19],[-19,0],[-9,8],[0,18],[10,7],[21,-3],[25,-17],[7,-8]],'#706995','#d2c5e6');
      poly([[0,-17],[-11,-2],[-6,10],[7,10],[12,-2]],'#c4b8d2','#eee3d5');
      line(-8,-2,7,-2,'#3a294e',4);line(-5,-2,5,-2,'#ffa896',2);poly([[-3,7],[0,14],[5,7]],'#f6cf9d');
    }else if(e.type==='lancer'){
      poly([[-19,9],[-14,-11],[0,-20],[14,-11],[19,9],[0,18]],'#54577a','#c9cbe0');
      poly([[-11,-4],[0,-13],[11,-4],[7,12],[-7,12]],'#a5b5cc','#e8eddb');box(-15,-3,30,7,2,'#28394e','#d0d8e3');
      box(-4,-16,8,27,2,'#dbc7c1','#ffe9cf');box(-2,-22,4,12,1,'#f8d2ad');ring(0,3,5,'#eb969e',2);
    }else if(e.type==='cannon'){
      poly([[-19,5],[-12,-12],[0,-18],[14,-10],[20,5],[9,18],[-11,17]],'#555283','#c6bbe2');
      for(const dx of [-9,8]){box(dx-4,-14,9,20,3,'#a3b8ca','#e7ddcd');ring(dx,-12,3,'#ebadbb',2);}
      poly([[-10,7],[0,1],[11,8],[0,15]],'#eac09b','#fff0ce');
    }else if(e.type==='bulwark'){
      poly([[0,-23],[-19,-13],[-22,9],[0,22],[22,9],[19,-13]],'#536f89','#c9dcd7');
      poly([[0,-16],[-14,-8],[-15,6],[0,16],[15,6],[14,-8]],'#8eabb3','#f3dfbb');
      poly([[-10,-5],[0,-9],[10,-5],[7,2],[-7,2]],'#20364b');line(-6,-3,6,-3,'#f8b795',2);
      poly([[0,1],[-9,8],[0,14],[9,8]],'#e3c497');
    }else{
      ctx.scale(1.55,1.55);ctx.shadowColor='#d3a9eb';ctx.shadowBlur=16;
      poly([[-11,-11],[-32,-24],[-24,1],[-32,14],[-13,11],[0,24],[14,10],[31,16],[24,-3],[32,-23],[10,-12]],'#594e7a','#cdb4df');ctx.shadowBlur=0;
      poly([[0,-26],[-16,-12],[-13,11],[0,24],[14,10],[17,-12]],'#9396b0','#f0dbc5');
      poly([[0,-16],[-9,-6],[0,12],[9,-6]],'#ede2d2','#fff0be');ring(0,-2,5,'#8e5d90',3);line(-11,-9,-3,-6,'#ffba99',2);line(11,-9,3,-6,'#ffba99',2);
    }
    ctx.restore();
  }
  function drawTerrain(s,t){
    ctx.fillStyle='#152e45';ctx.fillRect(0,0,width,height);
    const glow=ctx.createRadialGradient(width*.3,height*.2,0,width*.3,height*.2,height);glow.addColorStop(0,'#6b9da54c');glow.addColorStop(1,'#081b3500');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    for(let i=0;i<8;i++){const x=(i*.173*width+(reduced?0:t*.002))%(width+100)-50,y=(i*.211*height)%height;ctx.fillStyle='#b7d9dc0c';ctx.beginPath();ctx.ellipse(x,y,60,12,0,0,7);ctx.fill();}
    for(let y=0;y<E.H;y++)for(let x=0;x<E.W;x++){
      const px=x*tile,py=y*tile,c=point(x,y),kind=E.tileAt(s,x,y);
      box(px+1,py+2,tile-2,tile-3,3,(x+y)%2?'#36586b':'#3b5f70','#7397a036');
      line(px+4,py+tile-3,px+tile-4,py+tile-3,'#0c283c66');
      if(kind==='wall'){
        box(px+2,py-1,tile-4,tile-2,4,'#1b374e','#60848b');
        poly([[px+3,py+4],[c.x,py-3],[px+tile-3,py+4],[c.x,py+12]],'#5c7b87','#8ca5a1');
        line(c.x,py+12,c.x,py+tile-4,'#78959b77');
      }else if(kind==='cover'){
        box(px+3,py+4,tile-6,tile-8,4,'#b9974b55','#ddca8b99');
        for(let i=-1;i<=1;i++)line(c.x-7,c.y+i*5,c.x,c.y+i*5+3,'#d7c68d88',1.2);
      }else if(kind==='storm'){
        box(px+2,py+3,tile-4,tile-5,4,'#9c79bc55','#c49ef2aa');
        poly([[c.x+3,c.y-10],[c.x-6,c.y+1],[c.x,c.y+1],[c.x-3,c.y+10],[c.x+7,c.y-2],[c.x+1,c.y-2]],'#d8c2ef88');
      }else{ctx.fillStyle='#a5c1bf44';ctx.fillRect(c.x-.6,c.y-.6,1.2,1.2);}
    }
    ctx.globalAlpha=.65;for(let x=0;x<E.W;x++)text(String.fromCharCode(65+x),x*tile+5,9,7,'#c5d9d6',500);ctx.globalAlpha=1;
  }
  function drawOverlay(s,t){
    if(animation)return;
    if(draft){
      const planned=E.playerPlan(state,orders).state;
      for(const p of E.reachable(planned,draft.unitId))box(p.x*tile+2,p.y*tile+3,tile-4,tile-5,3,'#8adcf32a','#b3efff55');
    }
    const threats=view?.telegraphs||[];
    for(const threat of threats){
      if(focusEnemy&&focusEnemy!==threat.id)continue;
      const index=state.enemies.findIndex(e=>e.id===threat.id)+1;
      for(const p of threat.cells){box(p.x*tile+3,p.y*tile+4,tile-6,tile-7,3,'#ff678b18','#ffa1ab66');const c=point(p.x,p.y);line(c.x-2,c.y+tile*.28,c.x+2,c.y+tile*.28,'#ffb4c4',1.3);}
      if(threat.path.length){const from=point(threat.from.x,threat.from.y),to=point(threat.to.x,threat.to.y);ctx.setLineDash([3,3]);line(from.x,from.y,to.x,to.y,'#ffb9b1aa',1.3);ctx.setLineDash([]);}
      if(focusEnemy===threat.id){const p=point(threat.from.x,threat.from.y);ring(p.x,p.y,tile*.48,'#ffc1c5',2);text(String(index),p.x,p.y-tile*.37,10,'#fff0d9');}
    }
    if(draft){
      const u=s.units.find(u=>u.id===draft.unitId),c=point(u.x,u.y),old=state.units.find(v=>v.id===u.id);
      ctx.setLineDash([3,3]);const from=point(old.x,old.y);line(from.x,from.y,c.x,c.y,COLOR[u.id]+'aa',1.5);ctx.setLineDash([]);
      ring(c.x,c.y,tile*.47,COLOR[u.id],2);
      for(const enemy of s.enemies.filter(e=>E.canTarget(s,u,e,draft.skill))){const p=point(enemy.x,enemy.y),combo=draft.skill==='attack'&&E.comboReady(s,u,enemy);ring(p.x,p.y,tile*.45,combo?COLOR.gold:'#e6f3d8',combo?3:1.6);if(combo){text('挟撃',p.x,p.y-tile*.38,Math.max(8,tile*.22),COLOR.gold);const ally=s.units.find(v=>v.id==='aster'),a=point(ally.x,ally.y);line(a.x,a.y,p.x,p.y,COLOR.gold,2);line(p.x,p.y,c.x,c.y,COLOR.gold,2);}}
    }
  }
  function drawEntities(s,t){
    for(const e of [s.objective,...s.enemies,...s.units]){
      if(e.hp<=0)continue;
      let p=point(e.x,e.y);
      if(animation){const move=animation.frames[animation.index].events.find(ev=>(ev.kind==='move'||ev.kind==='push')&&ev.id===e.id);if(move){const u=clamp((t-animation.at)/240),from=point(move.from.x,move.from.y);p={x:from.x+(p.x-from.x)*u,y:from.y+(p.y-from.y)*u};}}
      if(!animation&&state.units.some(v=>v.id===e.id)){
        const old=state.units.find(v=>v.id===e.id);if(old.x!==e.x||old.y!==e.y){const a=point(old.x,old.y);sprite(old,a.x,a.y,t,.18);}
      }
      if(animation&&animation.frames[animation.index].actor===e.id)ring(p.x,p.y,tile*.5,e.id.startsWith('e')?'#ffb2bd':COLOR.gold,2);
      sprite(e,p.x,p.y,t);
      const size=Math.max(7,tile*.19),bar=tile*.68,col=COLOR[e.id]||(e.id==='beacon'?COLOR.gold:'#dbb4d0');
      box(p.x-bar/2,p.y+tile*.36,bar,3,1,'#0c2436');box(p.x-bar/2,p.y+tile*.36,bar*e.hp/e.maxHp,3,1,col);
      if(!animation&&view){const future=[...view.state.units,...view.state.enemies,view.state.objective].find(v=>v.id===e.id);if(future&&future.hp<e.hp){box(p.x-bar/2+bar*future.hp/e.maxHp,p.y+tile*.36,bar*(e.hp-future.hp)/e.maxHp,3,1,'#f9dfad88');}}
      if(e.id.startsWith('e')){
        const index=state.enemies.findIndex(v=>v.id===e.id)+1;box(p.x-tile*.43,p.y-tile*.48,tile*.3,tile*.3,3,'#19273f','#d1a7c4');text(String(index),p.x-tile*.28,p.y-tile*.25,size,'#ffe5d5');text(String(e.hp),p.x+tile*.37,p.y-tile*.23,size,'#fff1df');
      }
      if(!animation&&e.id.startsWith('e')&&view?.state.enemies.find(v=>v.id===e.id)?.hp===0&&!view.telegraphs.some(v=>v.id===e.id)){text('×',p.x+tile*.33,p.y+tile*.1,tile*.4,COLOR.gold);}
      if(e.guard){ring(p.x,p.y,tile*.48,'#b4eee499',2);text('防',p.x+tile*.3,p.y-tile*.3,size,'#d2f6e6');}
      if(!animation&&orders.some(o=>o.unitId===e.id)){const index=orders.findIndex(o=>o.unitId===e.id)+1;text('✓'+index,p.x+tile*.3,p.y-tile*.38,size,COLOR.gold);}
    }
  }
  function emit(x,y,color,count=16,power=1){
    if(reduced)count=Math.min(count,3);
    for(let i=0;i<count;i++){const a=Math.random()*7,v=(.7+Math.random()*2)*power;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,color,born:now,life:350+Math.random()*250,size:1+Math.random()*2});}if(particles.length>300)particles.splice(0,particles.length-300);
  }
  function beginBeat(){
    const frame=animation.frames[animation.index];animation.at=now;animation.duration=reduced?200:frame.events.some(e=>e.kind==='combo')?1000:frame.events.some(e=>e.kind==='enemyAttack')?550:frame.events.every(e=>e.kind==='move')?280:450;
    updateHUD(frame.state);$('instruction').textContent=frame.label;$('step').textContent=frame.actor?.startsWith('e')?'ENEMY PHASE':'ALLY PHASE';
    for(const e of frame.events){
      if(e.kind==='hit'){const p=point(e.x,e.y);floaters.push({x:p.x,y:p.y-tile*.3,born:now,text:e.text,color:e.amount?e.id.startsWith('e')?'#fff0c7':'#ffb5b3':'#9ff3df'});emit(p.x,p.y,e.id.startsWith('e')?COLOR.gold:COLOR.danger,e.amount?10:4);}
      if(e.kind==='down'){const p=point(e.x,e.y);emit(p.x,p.y,'#f5d5b1',32,1.6);shake=reduced?0:4;}
      if(e.kind==='combo'){sound.fx('combo');$('burst').classList.remove('show');void $('burst').offsetWidth;$('burst').classList.add('show');shake=reduced?0:6;}
    }
    if(!frame.events.some(e=>e.kind==='combo'))sound.fx(frame.events.some(e=>e.kind==='hit')?'hit':frame.events.some(e=>e.kind==='guard')?'guard':'move');
  }
  function drawEffects(t){
    if(animation){const frame=animation.frames[animation.index],age=t-animation.at,p=clamp(age/animation.duration);
      for(const e of frame.events){
        ctx.save();ctx.globalAlpha=Math.max(0,1-p);
        if(e.kind==='enemyAttack'){for(const c of e.cells)box(c.x*tile+2,c.y*tile+3,tile-4,tile-5,3,'#ff93a24f','#ffd2b1');}
        if(['attack','combo','beam'].includes(e.kind)){
          const from=point(e.from.x,e.from.y),last=e.to||e.cells[e.cells.length-1];if(last){const to=point(last.x,last.y);ctx.globalCompositeOperation='lighter';ctx.shadowColor=e.kind==='combo'?COLOR.gold:COLOR.lumiere;ctx.shadowBlur=14;line(from.x,from.y,to.x,to.y,e.kind==='combo'?'#ffe0a188':'#99edfb77',tile*(e.kind==='combo'?.35:.13));line(from.x,from.y,to.x,to.y,'#f8fae0',tile*.04);if(e.kind==='combo'){const ally=frame.state.units.find(u=>u.id==='aster'),a=point(ally.x,ally.y);line(a.x,a.y,to.x,to.y,'#ffd49e',tile*.08);ring(to.x,to.y,tile*(.4+p*2),'#ffe4b6',3*(1-p));}}}
        if(e.kind==='guard'){const a=point(e.x,e.y);ring(a.x,a.y,tile*(.4+p*.5),'#b0f1e6',2*(1-p));}
        ctx.restore();
      }
    }
    particles=particles.filter(p=>t-p.born<p.life);ctx.save();ctx.globalCompositeOperation='lighter';
    for(const p of particles){const age=t-p.born,f=age/16;ctx.globalAlpha=1-age/p.life;ctx.fillStyle=p.color;ctx.fillRect(p.x+p.vx*f,p.y+p.vy*f+f*f*.012,p.size,p.size);}ctx.restore();
    floaters=floaters.filter(f=>t-f.born<850);for(const f of floaters){ctx.globalAlpha=1-(t-f.born)/850;text(f.text,f.x,f.y-(t-f.born)*.025,tile*.33,f.color);ctx.globalAlpha=1;}
  }
  function render(t){
    requestAnimationFrame(render);if(document.hidden)return;now=t;
    if(animation&&t-animation.at>=animation.duration){
      // A long frame advances one beat; never dump a whole turn of sounds on resume.
      animation.index++;if(animation.index>=animation.frames.length)finishResolution();else beginBeat();
    }
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.save();
    if(shake>.1&&!reduced){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.86;}
    const s=animation?animation.frames[animation.index].state:view?.display||state;drawTerrain(s,t);if(started&&!modalOpen&&!helpOpen)drawOverlay(s,t);drawEntities(s,t);drawEffects(t);ctx.restore();
  }
  function active(){return started&&!modalOpen&&!helpOpen&&!animation&&state.phase==='plan';}
  function recalc(){
    try{view=E.forecast(state,orders,draft);}catch{view=null;}
    updateHUD();updateCommands();
  }
  function chooseUnit(id){
    if(!active())return;
    const index=orders.findIndex(o=>o.unitId===id);if(index>=0)orders=orders.slice(0,index);
    const p=E.playerPlan(state,orders).state,u=p.units.find(u=>u.id===id);draft={unitId:id,x:u.x,y:u.y,skill:'attack'};focusEnemy=null;sound.init();sound.fx('select');recalc();
  }
  function updateHUD(s=state){
    const m=E.MISSIONS[s.mission];$('mission-number').textContent=`OPERATION ${String(s.mission+1).padStart(2,'0')} / 06`;$('mission-name').textContent=m.name;$('beacon-hp').textContent=s.objective.hp+' / '+s.objective.maxHp;$('round').textContent=String(s.round).padStart(2,'0');
    for(const u of s.units){const next=!animation&&view?.state.units.find(v=>v.id===u.id);$('hp-'+u.id).textContent=u.hp+' / '+u.maxHp+(next&&next.hp<u.hp?' → '+next.hp:'');$('unit-'+u.id).classList.toggle('selected',!animation&&draft?.unitId===u.id);$('unit-'+u.id).classList.toggle('ordered',orders.some(o=>o.unitId===u.id));$('status-'+u.id).textContent=animation?(u.guard?'防御中':'行動中'):orders.some(o=>o.unitId===u.id)?'予約済み':draft?.unitId===u.id?'選択中':'未予約';}
  }
  function orderName(o){const unit=state.units.find(u=>u.id===o.unitId);return unit.name+'：'+({guard:'移動＋防御',special:unit.id==='aster'?'突き押し':'貫通射撃',attack:unit.id==='aster'?'打撃':'射撃'}[o.skill]);}
  function updateCommands(){
    const unit=draft&&state.units.find(u=>u.id===draft.unitId),done=orders.length===2;
    $('instruction').textContent=done?'2機の予約を確認して実行':unit?unit.name+'：移動先 → 敵をタップ':'機体を選んでください';$('step').textContent=done?'READY':(orders.length+1)+' / 2';
    $('attack-name').textContent=unit?.id==='lumiere'?'射撃':'打撃';$('attack-desc').textContent=unit?.id==='lumiere'?'射程2〜4 · 3ダメージ':'隣接 · 3ダメージ';$('special-name').textContent=unit?.id==='lumiere'?'貫通射撃':'突き押し';$('special-desc').textContent=unit?.id==='lumiere'?'直線2〜6 · 味方も貫通':'2ダメージ ＋ 1マス押す';
    for(const skill of ['attack','special','guard']){$('skill-'+skill).disabled=!active()||!draft;$('skill-'+skill).classList.toggle('active',draft?.skill===skill);}
    $('undo').disabled=!active()||!orders.length;$('commit').disabled=!active()||!done;$('commit').innerHTML=done?'2機の行動を実行 → 敵の番 <span>→</span>':'2機の行動を決めてください <span>→</span>';
    $('orders').innerHTML=[0,1].map(i=>'<span class="'+(orders[i]?'ready':'')+'">'+(i+1)+' '+(orders[i]?orderName(orders[i]):'行動を予約してください')+'</span>').join('');
    if(focusEnemy){const enemy=(view?.display||state).enemies.find(e=>e.id===focusEnemy);$('detail').textContent=enemy?`${state.enemies.findIndex(e=>e.id===enemy.id)+1} ${E.TYPES[enemy.type].name} HP ${enemy.hp}${E.TYPES[enemy.type].armor?' 装甲−1':''}｜${({hunt:'接近して薙ぎ払い',ray:'直線砲撃',shell:'予告地点へ投射',storm:'十字全域に天嵐'}[enemy.intent.kind])} ${E.TYPES[enemy.type].damage}ダメージ`:'敵をタップして予告を見る';if(enemy&&view?.state.enemies.find(e=>e.id===enemy.id)?.hp===0&&!view.telegraphs.some(e=>e.id===enemy.id))$('detail').textContent+=' → 先に撃破され、行動なし';}
    else $('detail').textContent=done?'予約した機体をタップすると、その行動から組み直せます':draft?.skill==='special'&&unit?.id==='lumiere'?'直線上の敵をタップ。射線の味方も巻き込みます':draft?.skill==='special'?'隣の敵をタップ。1マス押す／押せないと衝突＋2':'青いマスへ移動 → 白枠の敵をタップで予約。金枠は挟撃';
    const f=$('forecast');f.className='forecast';
    if(view){const d=view.damage,prefix=done?'実行予測':'仮予測（移動のみ）';if(view.state.phase==='won'){f.textContent='勝利予測：2機と風見灯を守って作戦達成';f.classList.add('good');}else{f.textContent=`${prefix}：盾 −${d.aster} / 砲 −${d.lumiere} / 灯 −${d.beacon} · ${view.kills}体撃破`;if(view.state.phase==='lost'){f.textContent='敗北予測：機体か風見灯が失われます。予約を組み直そう';f.classList.add('danger');}else if(d.beacon||d.aster||d.lumiere)f.classList.add('danger');else f.classList.add('good');}}
  }
  function reserve(targetId=null){
    if(!active()||!draft)return;
    const order={...draft,targetId};try{E.playerPlan(state,[...orders,order]);}catch(error){$('detail').textContent=error.message;return;}
    orders.push(order);draft=null;focusEnemy=null;sound.init();sound.fx('select');
    const next=state.units.find(u=>!orders.some(o=>o.unitId===u.id));if(next){const s=E.playerPlan(state,orders).state,u=s.units.find(u=>u.id===next.id);draft={unitId:u.id,x:u.x,y:u.y,skill:'attack'};}recalc();
  }
  function undo(){if(!active()||!orders.length)return;const removed=orders.pop();draft={unitId:removed.unitId,x:removed.x,y:removed.y,skill:removed.skill};focusEnemy=null;recalc();sound.fx('select');}
  function boardTap(x,y,inspect=false){
    if(!active()||!E.inside(x,y))return;
    const s=view?.display||state,enemy=s.enemies.find(e=>e.hp>0&&e.x===x&&e.y===y),unit=s.units.find(u=>u.hp>0&&u.x===x&&u.y===y);
    if(enemy){if(!inspect&&draft&&E.canTarget(s,s.units.find(u=>u.id===draft.unitId),enemy,draft.skill)){reserve(enemy.id);return;}focusEnemy=enemy.id;updateCommands();return;}
    if(unit&&(!draft||unit.id!==draft.unitId)){chooseUnit(unit.id);return;}
    if(draft){const planned=E.playerPlan(state,orders).state;if(E.reachable(planned,draft.unitId).some(p=>p.x===x&&p.y===y)){draft.x=x;draft.y=y;focusEnemy=null;recalc();sound.init();sound.fx('move');}else $('detail').textContent='移動は青いマスまで。壁と敵は通れません。';}
  }
  let pointer=null;
  const cell=e=>{const r=canvas.getBoundingClientRect();return{x:Math.floor((e.clientX-r.left)/r.width*E.W),y:Math.floor((e.clientY-r.top)/r.height*E.H)};};
  canvas.addEventListener('pointerdown',e=>{if(!active()||pointer)return;e.preventDefault();const p=cell(e);pointer={id:e.pointerId,...p,at:performance.now()};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const p=cell(e),old=pointer;pointer=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(p.x===old.x&&p.y===old.y)boardTap(p.x,p.y,performance.now()-old.at>350);});
  canvas.addEventListener('pointercancel',()=>{pointer=null;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
  $('unit-aster').addEventListener('click',()=>chooseUnit('aster'));$('unit-lumiere').addEventListener('click',()=>chooseUnit('lumiere'));
  for(const skill of ['attack','special'])$('skill-'+skill).addEventListener('click',()=>{if(!active()||!draft)return;draft.skill=skill;focusEnemy=null;recalc();});
  $('skill-guard').addEventListener('click',()=>{if(!active()||!draft)return;draft.skill='guard';reserve();});$('undo').addEventListener('click',undo);
  function commit(){
    if(!active()||orders.length!==2)return;
    let result;try{result=E.resolve(state,orders);}catch(error){$('detail').textContent=error.message;return;}
    storeRun(result.state);sound.init();pointer=null;draft=null;focusEnemy=null;animation={frames:result.frames,index:0,at:performance.now(),duration:400,result,pausedAt:null};$('game').classList.add('animating');updateCommands();
    now=performance.now();if(animation.frames.length)beginBeat();else finishResolution();
  }
  $('commit').addEventListener('click',commit);
  function finishResolution(){
    state=animation.result.state;animation=null;orders=[];particles=[];floaters=[];shake=0;$('game').classList.remove('animating');$('burst').classList.remove('show');view=null;
    if(state.phase!=='plan'){showResult();return;}
    draft={unitId:'aster',x:state.units[0].x,y:state.units[0].y,skill:'attack'};recalc();storeRun();banner('ROUND '+String(state.round).padStart(2,'0')+' / ALLY PHASE');
  }
  function banner(label){$('phase-banner').textContent=label;$('phase-banner').classList.remove('show');void $('phase-banner').offsetWidth;$('phase-banner').classList.add('show');}
  function medals(){return[state.objective.hp===state.objective.maxHp,state.totalDamage===0,state.round<=E.MISSIONS[state.mission].par];}
  function showResult(){
    modalOpen=true;sound.stop();const won=state.phase==='won',last=state.mission===E.MISSIONS.length-1;sound.fx(won?'win':'lose');
    if(won)records[state.mission]=Math.max(records[state.mission]||0,medals().filter(Boolean).length);storeRun();updateHUD();updateCommands();
    $('result-screen').hidden=false;$('result-tag').textContent=won?(last?'ALL OPERATIONS COMPLETE':'OPERATION COMPLETE'):'OPERATION FAILED';$('result-title').textContent=won?(last?'ふたりが、空を繋いだ。':'風見灯、防衛成功。'):'次の一手は、変えられる。';
    $('result-copy').textContent=won?(last?'ネブラの嵐が晴れ、島々の灯がふたたび繋がった。ユナとセナの帆装機は、静かな雲海へ翼を向ける。':'先回りした二手が、灯を守った。双機の位置取りを変えれば、別の勝ち方も見つかる。'):(state.objective.hp===0?'風見灯が消え、航路が途絶えた。灯への攻撃を止めるか、盾機を隣に置いて防御してみよう。':'片方の帆装機が航行不能に。赤い攻撃予告と被害予測を見て、攻撃を止める順番を変えよう。');
    $('result-round').textContent=state.round;$('result-combos').textContent=state.combos;$('result-friendly').textContent=state.friendlyKills;
    $('medals').innerHTML=['灯を無傷で守る','双機ノーダメージ',E.MISSIONS[state.mission].par+'ラウンド以内'].map((label,i)=>'<span class="'+(won&&medals()[i]?'earned':'')+'">'+(won&&medals()[i]?'✦ ':'◇ ')+label+'</span>').join('');
    $('journey').innerHTML=E.MISSIONS.map((_,i)=>'<span class="'+(records[i]!==undefined?'done':'')+'"></span>').join('');$('next').hidden=!won||last;$('retry').textContent=last&&won?'最初の作戦から、もう一度':'この作戦をやり直す';
  }
  function newMission(index,brief=true){
    state=E.create(index);started=true;orders=[];draft=null;view=null;animation=null;pointer=null;focusEnemy=null;particles=[];floaters=[];shake=0;helpOpen=false;modalOpen=brief;
    for(const id of ['start-screen','result-screen','help-screen','brief-screen'])$(id).hidden=true;$('game').classList.remove('animating');$('burst').classList.remove('show');$('phase-banner').classList.remove('show');
    const m=E.MISSIONS[index];$('brief-screen').hidden=!brief;$('brief-number').textContent='OPERATION '+String(index+1).padStart(2,'0')+' / 06';$('brief-title').textContent=m.name;$('brief-place').textContent=m.place;$('brief-copy').textContent=m.brief;$('brief-hint').textContent=m.hint;$('brief-goal').textContent=index===5?'ネブラを撃破し、2機と風見灯を守る':'敵を全滅させ、2機と風見灯を守る';
    draft={unitId:'aster',x:state.units[0].x,y:state.units[0].y,skill:'attack'};sound.music();recalc();resize();storeRun();
  }
  $('start').addEventListener('click',()=>{if(animation)return;newMission(0);});$('deploy').addEventListener('click',()=>{if($('brief-screen').hidden||animation)return;modalOpen=false;$('brief-screen').hidden=true;sound.music();recalc();banner('ALLY PHASE / 二手で、変える');});
  $('next').addEventListener('click',()=>{if(state.phase==='won'&&state.mission<5&&!animation)newMission(state.mission+1);});$('retry').addEventListener('click',()=>{if(animation||$('result-screen').hidden)return;newMission(state.phase==='won'&&state.mission===5?0:state.mission);});
  if(saved){$('continue').hidden=false;$('start').classList.add('subtle');$('start').innerHTML='最初の作戦から <span>↗</span>';}
  $('continue').addEventListener('click',()=>{
    if(!saved||started)return;state=saved;saved=null;started=true;orders=[];modalOpen=false;$('start-screen').hidden=true;draft={unitId:'aster',x:state.units[0].x,y:state.units[0].y,skill:'attack'};recalc();resize();if(state.phase!=='plan')showResult();else sound.music();
  });
  $('help').addEventListener('click',()=>{if(animation||helpOpen)return;helpOpen=true;$('help-screen').hidden=false;pointer=null;});$('close-help').addEventListener('click',()=>{helpOpen=false;$('help-screen').hidden=true;recalc();});
  document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;if(helpOpen){if(e.key==='Escape'){helpOpen=false;$('help-screen').hidden=true;recalc();}return;}if(!active())return;if(e.key==='1')chooseUnit('aster');if(e.key==='2')chooseUnit('lumiere');if(e.key==='Escape'||e.key==='Backspace'){e.preventDefault();undo();}if(e.key==='Enter'){e.preventDefault();commit();}if(e.key.toLowerCase()==='g'&&draft){draft.skill='guard';reserve();}});
  document.addEventListener('visibilitychange',()=>{
    pointer=null;if(document.hidden){if(animation)animation.pausedAt=performance.now();sound.stop();sound.ctx?.suspend().catch(()=>{});}else{
      if(animation&&animation.pausedAt!==null){const delay=performance.now()-animation.pausedAt;animation.at+=delay;for(const p of particles)p.born+=delay;for(const f of floaters)f.born+=delay;animation.pausedAt=null;}if(started&&state.phase==='plan')sound.music();
    }
  });
  window.addEventListener('pagehide',()=>{if(started)storeRun(animation?.result.state||state);sound.stop();});
  window.aetherPairDebug=()=>({state:E.copy(state),orders:E.copy(orders),draft:E.copy(draft),forecast:view?{damage:{...view.damage},phase:view.state.phase,kills:view.kills}:null,busy:!!animation,modal:modalOpen,help:helpOpen,canvas:{width,height},audio:{enabled:soundOn,timer:sound.timer!==null,nodes:sound.nodes.size}});
  updateHUD();resize();requestAnimationFrame(render);
})();
