(() => {
  'use strict';
  const E=window.AetherPair,$=id=>document.getElementById(id),canvas=$('board'),ctx=canvas.getContext('2d');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLOR={aster:'#f49b82',lumiere:'#89e7f0',gold:'#ffdb8b',danger:'#ff829e',ink:'#11283c'};
  let state=E.create(),started=false,selected='aster',animation=null,helpOpen=false,modalOpen=true,hover=null,pointer=null,draft=null,mode='attack',target=null;
  let tile=48,width=336,height=384,dpr=1,now=0,particles=[],floaters=[],shake=0,history=[],saved=null,unlocked=0;
  const clamp=n=>Math.min(1,Math.max(0,n));
  try{const data=JSON.parse(localStorage.getItem('aether-pair-save-v3')||'null');saved=E.restore(data?.run);}catch{}
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
      if(document.hidden||state.phase!=='play')return;
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
  const point=(x,y)=>({x:(x+.5)*tile,y:(y+.5)*tile});
  function line(x,y,xx,yy,color,w=1){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();}
  function ring(x,y,r,color,w=1){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.arc(x,y,Math.max(.1,r),0,Math.PI*2);ctx.stroke();}
  function box(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=1;ctx.strokeStyle=stroke;ctx.stroke();}}
  function poly(ps,fill,stroke){ctx.beginPath();ps.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function text(str,x,y,size,color,weight=700){ctx.font=`${weight} ${size}px sans-serif`;ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(str,x,y);}
  // Readable silhouettes: cats have ears/faces; robots have one red lens.
  function sprite(e,x,y,t,alpha=1){
    ctx.save();ctx.translate(x,y);ctx.scale(tile/52,tile/52);ctx.globalAlpha*=alpha;
    ctx.fillStyle='#142b3b55';ctx.beginPath();ctx.ellipse(0,18,19,4,0,0,7);ctx.fill();
    const bob=reduced?0:Math.sin(t*.002)*.5;ctx.translate(0,bob);
    if(e.id==='aster'||e.id==='lumiere'){
      const red=e.id==='aster',fur=red?'#e7aa58':'#b7c5ce',light=red?'#fff0ca':'#f0f3ed',cloth=red?'#c95940':'#318da4';
      // Curled tail, boots, overalls.
      ctx.strokeStyle=fur;ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-9,11);ctx.quadraticCurveTo(-24,18,-19,4);ctx.stroke();
      box(-10,10,8,10,3,'#334456','#162a3a');box(3,10,8,10,3,'#334456','#162a3a');
      box(-12,-2,24,20,6,cloth,'#f3dfb4');box(-6,1,13,13,2,red?'#9e463b':'#26758b');line(-6,0,-6,12,'#edd39a',2);line(7,0,7,12,'#edd39a',2);box(-3,7,7,5,1,'#e6c889');
      // Triangular ears, round face, muzzle, eyes and whiskers.
      poly([[-13,-10],[-16,-25],[-3,-17]],fur,'#4d4b45');poly([[4,-17],[16,-25],[13,-9]],fur,'#4d4b45');
      poly([[-12,-15],[-13,-22],[-7,-17]],'#db8f83');poly([[8,-17],[13,-22],[12,-14]],'#db8f83');
      box(-14,-20,28,23,9,fur,'#4d4b45');
      if(red){poly([[-5,-20],[-2,-11],[0,-20]],'#ac7439');poly([[2,-20],[5,-12],[7,-19]],'#ac7439');}
      else{box(-13,-20,27,6,3,'#276a88');poly([[-13,-15],[-20,-13],[-9,-12]],'#64b2c2','#234759');}
      box(-9,-6,18,8,4,light);box(-8,-12,3,5,1.5,'#263c43');box(5,-12,3,5,1.5,'#263c43');
      poly([[-2,-6],[2,-6],[0,-3]],'#a76a65');line(0,-3,-3,-1,'#725949',.8);line(0,-3,3,-1,'#725949',.8);
      line(-10,-5,-17,-7,'#fff1ce',1);line(-10,-2,-17,-1,'#fff1ce',1);line(10,-5,17,-7,'#fff1ce',1);line(10,-2,17,-1,'#fff1ce',1);
      if(red){
        // A large, unmistakable shield made from a red workshop sign.
        poly([[-15,-2],[-25,1],[-24,14],[-17,22],[-8,14],[-7,1]],'#b44337','#ffe0a2');
        poly([[-16,2],[-21,4],[-20,12],[-16,16],[-12,11],[-12,4]],'#e4a247');line(-17,5,-17,12,'#ffe9bc',2);line(-20,8,-14,8,'#ffe9bc',2);
        line(14,12,21,-1,'#765b3e',4);box(15,-8,12,7,2,'#c4d2cf','#344b56');
      }else{
        // Brass repair cannon, blue pressure tank, glowing round muzzle.
        box(8,1,17,11,3,'#d4a850','#ffe5a5');box(18,-2,9,15,2,'#416374','#b9d5d6');ring(24,5,4,'#6fe0e7',2);box(7,-1,7,7,2,'#5eb9ca','#b7edef');
      }
    }else if(e.type==='talon'){
      // Low wheeled patrol drone, not another humanoid.
      box(-18,9,9,9,3,'#253340','#162733');box(9,9,9,9,3,'#253340','#162733');
      poly([[-17,-8],[-8,-16],[8,-16],[18,-7],[15,13],[-15,13]],'#687b82','#d2c8ad');
      box(-13,-5,26,11,5,'#243744','#a6aaa0');box(-7,-3,14,6,3,'#f18f69','#ffe0a8');
      line(-18,1,-24,8,'#ad9d7c',3);line(18,1,24,8,'#ad9d7c',3);box(-8,9,16,5,1,'#b9a67e');
      line(0,-16,0,-23,'#b7c3ba',2);ring(0,-23,2,'#f5c27b',2);
    }else if(e.type==='bulwark'){
      box(-22,6,11,15,3,'#293c49','#a3aaa0');box(11,6,11,15,3,'#293c49','#a3aaa0');
      box(-18,-17,36,33,6,'#ab8d60','#f0d4a2');box(-13,-13,26,10,3,'#233b48','#d8bf8b');
      box(-8,-10,16,4,2,'#ff9a6b');box(-14,1,28,14,2,'#57717a','#bfc5b6');
      for(const i of [-8,0,8])line(i,3,i+3,12,'#203b4a',2);line(-18,-1,-24,-3,'#d6cdb1',4);line(18,-1,24,-3,'#d6cdb1',4);
      poly([[-5,-21],[5,-21],[8,-17],[-8,-17]],'#e9c979');
    }else{
      // The boss is a lighthouse furnace: striped tower + red Fresnel lens.
      ctx.save();ctx.scale(.78,.78);
      box(-21,14,42,8,2,'#3b5a66','#d7c8a3');poly([[-13,15],[-10,-12],[10,-12],[13,15]],'#eadcbb','#344d5a');
      poly([[-12,3],[11,-2],[12,6],[-13,11]],'#c16c50');box(-7,9,14,10,2,'#344c58','#f2d7a0');
      box(-16,-19,32,14,3,'#375b6b','#eed4a0');box(-12,-17,24,10,2,'#ac514b','#efb378');
      const pulse=reduced?1:1+.07*Math.sin(t*.004);ctx.shadowColor='#ffb26f';ctx.shadowBlur=9;ring(0,-12,6*pulse,'#ffe09c',3);ctx.shadowBlur=0;
      poly([[-20,-19],[0,-28],[20,-19]],'#355a69','#d3c9aa');line(0,-28,0,-31,'#e6d2a5',2);
      line(-19,-4,19,-4,'#e6c98e',2);line(-18,-8,-18,-1,'#e6c98e',1);line(18,-8,18,-1,'#e6c98e',1);ctx.restore();
    }
    ctx.restore();
  }
  function resize(){const r=$('arena').getBoundingClientRect();tile=Math.max(1,Math.min(r.width/E.W,(r.height-2)/E.H));width=tile*E.W;height=tile*E.H;dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=width+'px';canvas.style.height=height+'px';}
  new ResizeObserver(resize).observe($('arena'));window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
  function terrain(s,t){
    ctx.fillStyle='#385761';ctx.fillRect(0,0,width,height);
    for(let y=0;y<E.H;y++)for(let x=0;x<E.W;x++){
      const px=x*tile,py=y*tile,c=point(x,y);
      box(px+1,py+1,tile-2,tile-2,3,(x+y)%2?'#718b88':'#7d9690','#263f4877');
      line(px+4,py+tile*.34,px+tile-4,py+tile*.34,'#405e6266');line(px+4,py+tile*.67,px+tile-4,py+tile*.67,'#405e6266');
      ctx.fillStyle='#cbd0b2';for(const dx of [5,tile-6])for(const dy of [5,tile-6])ctx.fillRect(px+dx,py+dy,1.5,1.5);
      if(E.wall(s,x,y)){
        box(px+3,py+3,tile-6,tile-6,4,'#b39366','#f0d3a0');box(px+8,py+8,tile-16,tile-16,2,'#93744f','#624f3b');line(px+9,py+9,px+tile-9,py+tile-9,'#d7b780',4);line(px+tile-9,py+9,px+9,py+tile-9,'#d7b780',4);
      }
      if(y===0&&!E.wall(s,x,y)){line(px+2,py+2,px+tile-2,py+2,'#e6cc91',3);}
    }
  }
  function staged(){const u=state.units.find(u=>u.id===selected),p=draft||u;try{return E.positioned(state,selected,p.x,p.y);}catch{return state;}}
  function arrow(a,b,color){const p=point(a.x,a.y),q=point(b.x,b.y);if(p.x===q.x&&p.y===q.y)return;line(p.x,p.y,q.x,q.y,color,2);const angle=Math.atan2(q.y-p.y,q.x-p.x);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(angle);poly([[-9,-5],[0,0],[-9,5]],color);ctx.restore();}
  function indicators(s,t){
    if(animation||!started||modalOpen||helpOpen)return;
    for(const p of E.moves(state,selected))box(p.x*tile+3,p.y*tile+3,tile-6,tile-6,4,'#87dff320','#8adef466');
    const f=E.forecast(s);
    for(const threat of s.phase==='won'?[]:f.threats){
      arrow(threat.from,threat.to,'#ffb7b5aa');
      for(const p of threat.cells){box(p.x*tile+4,p.y*tile+4,tile-8,tile-8,3,'#ff759214','#ff9da05a');text('×',p.x*tile+tile*.83,p.y*tile+tile*.26,tile*.23,'#ffb3b9');}
      const p=point(threat.from.x,threat.from.y);
    }
    for(const e of E.targets(staged(),selected,mode)){const p=point(e.x,e.y);ring(p.x,p.y,tile*.43,e.id===target?'#fff3ba':'#f4d79699',e.id===target?3:1.5);}
    const u=s.units.find(u=>u.id===selected),original=state.units.find(u=>u.id===selected);
    if(draft&&(u.x!==original.x||u.y!==original.y))arrow(original,u,COLOR[selected]+'99');
    if(hover)for(const e of hover.result.frames[0].events.filter(e=>['attack','combo'].includes(e.kind))){arrow(e.from,e.to,COLOR.gold);if(e.ally)arrow(e.ally,e.to,COLOR.gold);}
    for(const u of s.units)if(u.guard){const p=point(u.x,u.y);ring(p.x,p.y,tile*.48,'#b8ffe1',3);if(u.id==='aster')for(const other of s.units)if(other.id!==u.id&&E.distance(u,other)===1){const q=point(other.x,other.y);ring(q.x,q.y,tile*.46,'#b8ffe1',2);}}
  }
  function entities(s,t){
    for(const e of [...s.enemies,...s.units]){
      if(e.hp<=0)continue;let p=point(e.x,e.y);
      if(animation){const move=animation.frames[animation.index].events.find(v=>v.kind==='move'&&v.id===e.id);if(move){const a=point(move.from.x,move.from.y),k=1-Math.pow(1-clamp((t-animation.at)/210),3);p={x:a.x+(p.x-a.x)*k,y:a.y+(p.y-a.y)*k};}}
      if(!animation&&hover&&e.id===selected){const old=state.units.find(u=>u.id===selected),from=point(old.x,old.y);if(old.x!==e.x||old.y!==e.y)sprite(old,from.x,from.y,t,.2);}
      if(e.id===selected&&!animation&&started&&!modalOpen)ring(p.x,p.y,tile*.48,COLOR[selected],2.5);
      sprite(e,p.x,p.y,t);
      if(e.type)text('攻'+E.TYPES[e.type].damage,p.x-tile*.27,p.y-tile*.30,tile*.16,'#ffd1c1');
      const col=COLOR[e.id]||COLOR.gold;box(p.x-tile*.34,p.y+tile*.30,tile*.68,tile*.13,2,'#102838');box(p.x-tile*.34,p.y+tile*.30,tile*.68*e.hp/e.maxHp,tile*.13,2,col);text(String(e.hp),p.x,p.y+tile*.43,tile*.18,'#fff');
      if(e.type==='boss'){
        const dx=e.plan.dx,dy=e.plan.dy,cx=p.x+dx*tile*.35,cy=p.y+dy*tile*.35;ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.atan2(dy,dx));poly([[-4,-5],[5,0],[-4,5]],'#ffa7ad','#fff0c7');ctx.restore();
      }
      if(!animation&&state.acted.includes(e.id))text('✓',p.x+tile*.34,p.y-tile*.28,tile*.28,'#e5f4db');
    }
    if(!animation&&hover){for(const e of state.enemies.filter(e=>e.hp>0&&!s.enemies.some(v=>v.id===e.id&&v.hp>0))){const p=point(e.x,e.y);sprite(e,p.x,p.y,t,.18);text('×',p.x,p.y+tile*.13,tile*.7,COLOR.gold);}}
  }
  function emit(x,y,color,n=15,power=1){
    if(reduced)n=Math.min(3,n);for(let i=0;i<n;i++){const a=Math.random()*7,v=(.6+Math.random()*2)*power;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,color,born:now,life:350+Math.random()*250,size:1+Math.random()*3});}if(particles.length>300)particles.splice(0,particles.length-300);
  }
  function beatFX(){
    const a=animation;if(!a||a.fired)return;a.fired=true;const frame=a.frames[a.index],combo=frame.events.some(e=>e.kind==='combo');
    if(frame.events.some(e=>e.kind==='guard'))sound.fx('guard');
    if(combo){sound.fx('combo');$('burst').classList.remove('show');void $('burst').offsetWidth;$('burst').classList.add('show');shake=reduced?0:6;}
    else if(frame.events.some(e=>e.kind==='hit'))sound.fx('hit');
    for(const e of frame.events){if(e.kind==='hit'){const p=point(e.x,e.y);emit(p.x,p.y,e.source==='player'?COLOR.gold:COLOR.danger,10);floaters.push({x:p.x,y:p.y-tile*.3,text:e.text,born:now,color:e.source==='player'?'#fff1c9':'#ffbac0'});}if(e.kind==='down'){const p=point(e.x,e.y);emit(p.x,p.y,COLOR.gold,38,1.6);shake=Math.max(shake,reduced?0:3);}}
  }
  function effects(t){
    if(animation){const frame=animation.frames[animation.index],age=t-animation.at,p=clamp((age-90)/Math.max(1,animation.duration-90));
      if(age>=110)for(const e of frame.events){
        ctx.save();ctx.globalAlpha=1-p;
        if(e.kind==='enemyAttack')for(const c of e.cells)box(c.x*tile+2,c.y*tile+3,tile-4,tile-5,4,'#ff9ca755','#ffd3c4aa');
        if(e.kind==='attack'||e.kind==='combo'){
          const from=point(e.from.x,e.from.y),to=point(e.to.x,e.to.y);ctx.globalCompositeOperation='lighter';ctx.shadowColor=COLOR.gold;ctx.shadowBlur=16;
          line(from.x,from.y,to.x,to.y,e.kind==='combo'?'#ffe3a677':'#c0eef080',tile*(e.kind==='combo'?.23:.11));line(from.x,from.y,to.x,to.y,'#fff8d9',tile*.035);
          if(e.ally){const ally=point(e.ally.x,e.ally.y);line(ally.x,ally.y,to.x,to.y,'#ffe5ad',tile*.08);ring(to.x,to.y,tile*(.35+p*1.5),'#ffdfa4',3*(1-p));}
        }
        ctx.restore();
      }
    }
    particles=particles.filter(p=>t-p.born<p.life);ctx.save();ctx.globalCompositeOperation='lighter';for(const p of particles){const age=t-p.born,f=age/16;ctx.globalAlpha=1-age/p.life;ctx.fillStyle=p.color;ctx.fillRect(p.x+p.vx*f,p.y+p.vy*f+f*f*.01,p.size,p.size);}ctx.restore();
    floaters=floaters.filter(f=>t-f.born<700);for(const f of floaters){ctx.globalAlpha=1-(t-f.born)/700;text(f.text,f.x,f.y-(t-f.born)*.03,tile*.36,f.color);ctx.globalAlpha=1;}
  }
  function beginBeat(){
    const a=animation,frame=a.frames[a.index];a.at=now;a.fired=false;a.duration=reduced?220:frame.events.some(e=>e.kind==='combo')?680:frame.kind==='enemy'?520:frame.kind==='next'?260:390;
    updateHUD(frame.state);$('instruction').textContent=frame.label;$('lesson').hidden=true;
    if(frame.kind==='enemy'){$('phase-banner').textContent='敵の番';$('phase-banner').classList.remove('show');void $('phase-banner').offsetWidth;$('phase-banner').classList.add('show');}else sound.fx('move');
  }
  function render(t){
    requestAnimationFrame(render);if(document.hidden)return;now=t;
    if(animation){if(t-animation.at>=110)beatFX();if(t-animation.at>=animation.duration){animation.index++;if(animation.index>=animation.frames.length)finishMove();else beginBeat();}}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.save();if(shake>.1&&!reduced){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.86;}
    const shown=animation?animation.frames[animation.index].state:hover?hover.result.frames[0].state:started&&!modalOpen?staged():state;terrain(shown,t);indicators(shown,t);entities(shown,t);effects(t);ctx.restore();
  }
  function active(){return started&&!modalOpen&&!helpOpen&&!animation&&state.phase==='play';}
  function storeRun(run=state){try{localStorage.setItem('aether-pair-save-v3',JSON.stringify({run:E.save(run)}));}catch{}}
  function resetDraft(){draft=null;target=null;mode='attack';hover=null;pointer=null;}
  function refresh(){
    hover=null;if(active()){
      const u=state.units.find(u=>u.id===selected),p=draft||u;
      try{if(mode==='guard'||target)hover={x:p.x,y:p.y,result:E.action(state,selected,p.x,p.y,mode,target)};}catch{}
    }updateHUD();
  }
  function updateHUD(s=state){
    $('mission-name').textContent='TURN '+s.round+'　'+E.MISSIONS[s.mission].name;
    const boss=s.enemies.find(e=>e.type==='boss');$('remaining').textContent=boss?'灯台 '+boss.hp+'/'+boss.maxHp:'敵 '+s.enemies.filter(e=>e.hp>0).length+'体';
    $('energy').textContent='◆'.repeat(s.energy)+'◇'.repeat(5-s.energy);$('energy').setAttribute('aria-label','共有バッテリー '+s.energy+' / 5');
    $('energy-note').textContent='共有 '+s.energy+'/5 · 毎ターン＋2';
    $('game').style.setProperty?.('--active',COLOR[selected]);$('active-dot').style.background=COLOR[selected];
    for(const u of s.units){$('hp-'+u.id).textContent='HP '+u.hp+' / '+u.maxHp;$('unit-'+u.id).classList.toggle('selected',u.id===selected&&!s.acted.includes(u.id));$('unit-'+u.id).classList.toggle('acted',s.acted.includes(u.id));$('status-'+u.id).textContent=s.acted.includes(u.id)?'✓ 行動済み':u.id===selected?'選択中':'未行動';}
    $('undo').disabled=!!animation||history.length===0;
    const a=active(),isRed=selected==='aster';
    for(const kind of ['attack','power','guard','combo']){$('mode-'+kind).classList.toggle('chosen',mode===kind);$('mode-'+kind).disabled=!a||s.energy<E.COST[kind]||(kind==='combo'&&s.acted.length>0);}
    $('mode-power').innerHTML=isRed?'薙ぎ払い<small>周囲に3 · ◆2</small>':'チャージ砲<small>4ダメージ · ◆2</small>';
    $('mode-attack').innerHTML='攻撃<small>2ダメージ · 無料</small>';
    $('mode-guard').innerHTML='守ってためる<small>'+(isRed?'自分と隣を守る':'自分を守る')+' · ◆＋1</small>';
    $('confirm').disabled=!a||!hover;
    $('lesson').hidden=true;$('bottom-buttons').style.visibility='visible';
    if(animation){$('forecast').textContent='';return;}
    const display=hover?hover.result.frames[0].state:a?staged():state;
    const f=E.forecast(display),safe=display.phase==='won';
    $('forecast').textContent=safe?'この手で勝利！':'この配置で敵の番なら：赤 −'+f.damage[0]+' / 青 −'+f.damage[1];
    $('forecast').className='forecast'+(!safe&&f.state.phase==='lost'?' fatal':'');
    $('instruction').textContent=hover?'未確定：下のボタンで実行':isRed?'トト：盾とハンマーで接近戦':'ミオ：工具砲で2〜4マス先へ';
    $('detail').className='detail';
    $('detail').textContent=mode==='guard'?(isRed?'次の敵の番、自分と隣の味方の被害を1ずつ減らす。':'次の敵の番、自分の被害を1ずつ減らす。'):mode==='combo'?'赤の隣＋青の射程内の敵へ8。2匹とも行動終了。':mode==='power'?(isRed?'隣の敵すべてに3。金色の敵を選んで確認。':'射程内の1体に4。金色の敵を選んで確認。'):'青いマスで移動を試す → 金色の敵を選ぶ。';
    if(!hover&&a&&mode!=='guard'&&!E.targets(staged(),selected,mode).length)$('detail').textContent=mode==='combo'?'赤を敵の隣へ。青が2〜4マス先にいれば連携可能。':'射程内に敵がいません。移動するか、守ってためる。';
    $('confirm').textContent=hover?(mode==='guard'?'守ってためる ＋1 を確定':mode==='combo'?'連携8 を確定 · ◆3 / 2匹行動':mode==='power'?'大技を確定 · ◆2':'攻撃2 を確定'):'敵を選ぶ / 守ってためる';
    if(hover&&hover.result.kills)$('confirm').textContent+=' · '+hover.result.kills+'体撃破';
    if(hover&&hover.result.state.phase==='lost'){$('detail').textContent='この手で敵の番にネコが倒れます。一手戻すこともできます。';$('detail').className='detail danger';}
  }
  function choose(id){if(!active()||state.acted.includes(id))return;selected=id;resetDraft();sound.init();sound.fx('select');refresh();}
  function chooseMode(kind){if(!active()||state.energy<E.COST[kind]||kind==='combo'&&state.acted.length)return;mode=kind;target=null;refresh();sound.fx('select');}
  function pick(x,y){
    if(!active())return;
    const unit=state.units.find(u=>u.hp>0&&u.x===x&&u.y===y);
    if(unit&&unit.id!==selected){choose(unit.id);return;}
    const enemy=state.enemies.find(e=>e.hp>0&&e.x===x&&e.y===y);
    if(enemy){
      if(E.targets(staged(),selected,mode).some(e=>e.id===enemy.id)){target=enemy.id;refresh();sound.fx('select');}
      else{$('detail').textContent=E.TYPES[enemy.type].name+' HP '+enemy.hp+' / 攻撃'+E.TYPES[enemy.type].damage+'。'+(mode==='guard'?'守る行動を確定できます。':'今の位置・技では攻撃できません。');}
      return;
    }
    if(E.moves(state,selected).some(p=>p.x===x&&p.y===y)){draft={x,y};target=null;refresh();sound.fx('move');}
  }
  function commit(){
    if(!active()||!hover)return;
    const result=hover.result;history.push({state:E.copy(state),selected});if(history.length>30)history.shift();sound.init();storeRun(result.state);resetDraft();
    animation={result,frames:result.frames,index:0,at:performance.now(),duration:400,pausedAt:null,fired:false};$('game').classList.add('animating');now=performance.now();beginBeat();
  }
  function finishMove(){
    state=animation.result.state;animation=null;resetDraft();particles=[];floaters=[];shake=0;$('game').classList.remove('animating');$('burst').classList.remove('show');$('phase-banner').classList.remove('show');
    if(state.phase!=='play'){showResult();return;}selected=E.available(state)[0].id;storeRun();refresh();
  }
  function undo(){
    if(animation||!history.length||helpOpen)return;const previous=history.pop();state=previous.state;selected=previous.selected;modalOpen=false;$('result-screen').hidden=true;resetDraft();particles=[];floaters=[];shake=0;sound.music();sound.fx('select');storeRun();refresh();
  }
  const cell=e=>{const r=canvas.getBoundingClientRect();return{x:Math.floor((e.clientX-r.left)/r.width*E.W),y:Math.floor((e.clientY-r.top)/r.height*E.H)};};
  canvas.addEventListener('pointerdown',e=>{if(!active()||pointer)return;e.preventDefault();const p=cell(e);pointer={id:e.pointerId,...p};canvas.setPointerCapture(e.pointerId);sound.init();});
  canvas.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;pointer=null;const p=cell(e);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(E.inside(p.x,p.y))pick(p.x,p.y);});
  canvas.addEventListener('pointercancel',()=>{pointer=null;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
  for(const id of ['aster','lumiere'])$('unit-'+id).addEventListener('click',()=>choose(id));
  for(const kind of ['attack','power','guard','combo'])$('mode-'+kind).addEventListener('click',()=>chooseMode(kind));
  $('confirm').addEventListener('click',commit);$('undo').addEventListener('click',undo);$('result-undo').addEventListener('click',undo);
  function showResult(){
    modalOpen=true;const win=state.phase==='won';storeRun();sound.stop();sound.fx(win?'win':'lose');updateHUD();$('result-screen').hidden=false;
    $('result-tag').textContent=win?'MISSION COMPLETE':'RETRY';$('result-title').textContent=win?(state.mission===1?'操作は、これで全部。':'港に、灯りが戻った。'):'次は、どの一手を変える？';
    $('result-copy').textContent=win?(state.mission===1?'本番では、警備ロボを残して灯台の制御炉だけを壊しても勝利。':'暴走が止まり、警備ロボも静かに。トトとミオは、夜明けの港へ帰ります。'):'戻して考え直せます。受けるダメージは、確定前に下へ表示されます。';
    $('journey').innerHTML='<div>'+state.round+'ターン · 被ダメージ '+state.totalDamage+'</div><div>連携 '+state.combos+'回 · 防御 '+state.guards+'回 · 消費 ◆'+state.spent+'</div>';
    $('next').hidden=!(win&&state.mission===1);$('result-undo').hidden=!history.length;$('retry').textContent='同じ一戦を、もう一度';
  }
  function newMission(index){
    if(animation)return;state=E.create(index);started=true;selected='aster';history=[];resetDraft();helpOpen=false;modalOpen=false;particles=[];floaters=[];
    for(const id of ['start-screen','result-screen','help-screen'])$(id).hidden=true;$('game').classList.remove('animating');sound.music();storeRun();resize();refresh();
  }
  $('start').addEventListener('click',()=>newMission(0));$('practice').addEventListener('click',()=>newMission(1));$('next').addEventListener('click',()=>newMission(0));$('retry').addEventListener('click',()=>{if(!animation&&!$('result-screen').hidden)newMission(state.mission);});
  $('restart').addEventListener('click',()=>{if(!active())return;history.push({state:E.copy(state),selected});state=E.create(state.mission);selected='aster';resetDraft();storeRun();refresh();});
  if(saved){$('continue').hidden=false;$('start').classList.add('subtle');$('start').textContent='本番を最初から';}
  $('continue').addEventListener('click',()=>{if(!saved||started)return;state=saved;saved=null;started=true;modalOpen=false;$('start-screen').hidden=true;selected=E.available(state)[0]?.id||'aster';history=[];resetDraft();refresh();resize();if(state.phase==='play')sound.music();else showResult();});
  function closeHelp(){helpOpen=false;$('help-screen').hidden=true;refresh();}
  $('help').addEventListener('click',()=>{if(animation||helpOpen)return;pointer=null;helpOpen=true;$('help-screen').hidden=false;updateHUD();});$('close-help').addEventListener('click',closeHelp);
  document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;if(helpOpen){if(e.key==='Escape')closeHelp();return;}if(!active())return;if(e.key==='1')choose('aster');if(e.key==='2')choose('lumiere');if(e.key==='Escape'){resetDraft();refresh();}if(e.key==='Backspace'){e.preventDefault();undo();}if(e.key==='Enter'){e.preventDefault();commit();}});
  document.addEventListener('visibilitychange',()=>{
    pointer=null;if(document.hidden){if(animation&&animation.pausedAt===null)animation.pausedAt=performance.now();sound.stop();sound.ctx?.suspend().catch(()=>{});}else{
      if(animation&&animation.pausedAt!==null){const delay=performance.now()-animation.pausedAt;animation.at+=delay;for(const p of particles)p.born+=delay;for(const f of floaters)f.born+=delay;animation.pausedAt=null;}if(started&&state.phase==='play')sound.music();
    }
  });
  window.addEventListener('pagehide',()=>{if(started)storeRun(animation?.result.state||state);sound.stop();});
  window.aetherPairDebug=()=>({state:E.copy(state),selected,draft:E.copy(draft),mode,target,preview:hover?{x:hover.x,y:hover.y,kills:hover.result.kills,phase:hover.result.state.phase}:null,history:history.length,busy:!!animation,modal:modalOpen,help:helpOpen,canvas:{width,height},audio:{enabled:soundOn,timer:sound.timer!==null,nodes:sound.nodes.size}});
  updateHUD();resize();requestAnimationFrame(render);
})();
