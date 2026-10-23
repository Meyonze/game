(() => {
  'use strict';
  const E=window.AetherPair,$=id=>document.getElementById(id),canvas=$('board'),ctx=canvas.getContext('2d');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLOR={aster:'#f49b82',lumiere:'#89e7f0',gold:'#f4d796',danger:'#ff829e',ink:'#11283c'};
  let state=E.create(),started=false,selected='aster',animation=null,helpOpen=false,modalOpen=true,hover=null,pointer=null;
  let tile=48,width=336,height=384,dpr=1,now=0,particles=[],floaters=[],shake=0,history=[],saved=null,unlocked=0;
  const clamp=n=>Math.min(1,Math.max(0,n));
  try{const data=JSON.parse(localStorage.getItem('aether-pair-save-v2')||'null');saved=E.restore(data?.run);if(Number.isInteger(data?.unlocked)&&data.unlocked>=0&&data.unlocked<6)unlocked=data.unlocked;}catch{}
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
      ctx.scale(1.12,1.12);ctx.shadowColor='#d3a9eb';ctx.shadowBlur=16;
      poly([[-11,-11],[-32,-24],[-24,1],[-32,14],[-13,11],[0,24],[14,10],[31,16],[24,-3],[32,-23],[10,-12]],'#594e7a','#cdb4df');ctx.shadowBlur=0;
      poly([[0,-26],[-16,-12],[-13,11],[0,24],[14,10],[17,-12]],'#9396b0','#f0dbc5');
      poly([[0,-16],[-9,-6],[0,12],[9,-6]],'#ede2d2','#fff0be');ring(0,-2,5,'#8e5d90',3);line(-11,-9,-3,-6,'#ffba99',2);line(11,-9,3,-6,'#ffba99',2);
    }
    ctx.restore();
  }
  function storeRun(run=state){try{localStorage.setItem('aether-pair-save-v2',JSON.stringify({run:E.save(run),unlocked}));}catch{}}
  function resize(){const r=$('arena').getBoundingClientRect();tile=Math.max(1,Math.min(r.width/E.W,(r.height-2)/E.H));width=tile*E.W;height=tile*E.H;dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=width+'px';canvas.style.height=height+'px';}
  new ResizeObserver(resize).observe($('arena'));window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
  function terrain(s,t){
    ctx.fillStyle='#163348';ctx.fillRect(0,0,width,height);
    const glow=ctx.createRadialGradient(width*.3,height*.1,0,width*.3,height*.1,height);glow.addColorStop(0,'#80b7b742');glow.addColorStop(1,'#10274000');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    for(let y=0;y<E.H;y++)for(let x=0;x<E.W;x++){
      const px=x*tile,py=y*tile,c=point(x,y);
      box(px+1,py+2,tile-2,tile-3,4,(x+y)%2?'#365d70':'#3c6375','#8bb1b63a');line(px+5,py+tile-3,px+tile-5,py+tile-3,'#12374b88');
      if(E.wall(s,x,y)){box(px+2,py-1,tile-4,tile-2,4,'#19394e','#77969f');poly([[px+3,py+4],[c.x,py-3],[px+tile-3,py+4],[c.x,py+14]],'#5d7e8b','#a1b6b3');line(c.x,py+14,c.x,py+tile-5,'#739ba688');}
      else{ctx.fillStyle='#b1cdca44';ctx.fillRect(c.x-.7,c.y-.7,1.4,1.4);}
    }
  }
  function indicators(s,t){
    if(animation||!started||modalOpen||helpOpen)return;
    const available=E.moves(state,selected),lesson=E.guide(state);
    for(const p of available){const guide=lesson&&p.x===lesson.x&&p.y===lesson.y;box(p.x*tile+3,p.y*tile+4,tile-6,tile-7,4,guide?'#f3d49755':'#87dff32d',guide?'#ffe5a8':'#8adef488');}
    const counts=new Map();for(const threat of E.threats(s))for(const p of threat.cells){const k=E.key(p.x,p.y);counts.set(k,(counts.get(k)||0)+1);}
    for(const [k,n] of counts){const [x,y]=k.split(',').map(Number),p=point(x,y);box(x*tile+3,y*tile+4,tile-6,tile-7,4,'#ff759220','#ff9da06a');text('×',p.x+tile*.31,p.y-tile*.22,tile*.3,'#ffb3b9',900);if(n>1)text(String(n),p.x+tile*.3,p.y+tile*.28,tile*.18,'#ffc6bb');}
    if(lesson){
      const p=point(lesson.x,lesson.y),unit=state.units.find(u=>u.id===selected),from=point(unit.x,unit.y),pulse=reduced?1:1+.06*Math.sin(t*.006);
      ring(p.x,p.y,tile*.36*pulse,'#ffe5a9',3);line(from.x,from.y-tile*.35,p.x,p.y+tile*.35,'#ffe6a28c',3);
      poly([[p.x-6,p.y+tile*.46],[p.x+6,p.y+tile*.46],[p.x,p.y+tile*.3]],'#ffe4a3');
    }
    if(hover){
      const unit=s.units.find(u=>u.id===selected),p=point(unit.x,unit.y),combo=hover.result.events.some(e=>e.kind==='combo');
      ring(p.x,p.y,tile*.45,combo?COLOR.gold:COLOR[selected],2.5);
      for(const event of hover.result.frames[0].events.filter(e=>['attack','combo'].includes(e.kind))){const q=point(event.to.x,event.to.y);line(p.x,p.y,q.x,q.y,event.kind==='combo'?COLOR.gold:'#e6f2e8',3);if(event.ally){const ally=point(event.ally.x,event.ally.y);line(ally.x,ally.y,q.x,q.y,COLOR.gold,3);}}
    }
  }
  function entities(s,t){
    for(const e of [...s.enemies,...s.units]){
      if(e.hp<=0)continue;let p=point(e.x,e.y);
      if(animation){const move=animation.frames[animation.index].events.find(v=>v.kind==='move'&&v.id===e.id);if(move){const a=point(move.from.x,move.from.y),k=1-Math.pow(1-clamp((t-animation.at)/210),3);p={x:a.x+(p.x-a.x)*k,y:a.y+(p.y-a.y)*k};}}
      if(!animation&&hover&&e.id===selected){const old=state.units.find(u=>u.id===selected),from=point(old.x,old.y);if(old.x!==e.x||old.y!==e.y)sprite(old,from.x,from.y,t,.2);}
      if(e.id===selected&&!animation&&started&&!modalOpen)ring(p.x,p.y,tile*.48,COLOR[selected],2.5);
      sprite(e,p.x,p.y,t);
      const count=e.maxHp,gap=tile*.095,pip=tile*.07,total=count*pip+(count-1)*(gap-pip),col=COLOR[e.id]||COLOR.gold;
      for(let i=0;i<count;i++)box(p.x-total/2+i*gap,p.y+tile*.35,pip,tile*.07,1.5,i<e.hp?col:'#163347','#a8c5c333');
      if(e.type==='lancer'){
        const dx=e.dx,dy=e.dy,cx=p.x+dx*tile*.35,cy=p.y+dy*tile*.35;ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.atan2(dy,dx));poly([[-4,-5],[5,0],[-4,5]],'#ffa7ad','#fff0c7');ctx.restore();
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
    const shown=animation?animation.frames[animation.index].state:hover?hover.result.frames[0].state:state;terrain(shown,t);indicators(shown,t);entities(shown,t);effects(t);ctx.restore();
  }
  function active(){return started&&!modalOpen&&!helpOpen&&!animation&&state.phase==='play';}
  function updateHUD(s=state){
    $('mission-name').textContent=String(s.mission+1).padStart(2,'0')+' / 06　'+E.MISSIONS[s.mission].name;$('remaining').textContent='敵 '+s.enemies.filter(e=>e.hp>0).length+'体';$('game').style.setProperty?.('--active',COLOR[selected]);
    // style is also readable in minimal DOM test environments.
    $('active-dot').style.background=COLOR[selected];
    for(const u of s.units){$('hp-'+u.id).innerHTML=Array.from({length:u.maxHp},(_,i)=>'<i class="'+(i<u.hp?'on':'')+'"></i>').join('');$('hp-'+u.id).setAttribute('aria-label','HP '+u.hp+' / '+u.maxHp);$('unit-'+u.id).classList.toggle('selected',u.id===selected&&!s.acted.includes(u.id));$('unit-'+u.id).classList.toggle('acted',s.acted.includes(u.id));$('status-'+u.id).textContent=s.acted.includes(u.id)?'✓ 行動済み':u.id===selected?'動かす番':'まだ動ける';}
    $('undo').disabled=!!animation||history.length===0;$('stay').disabled=!active()||!E.moves(state,selected).some(p=>p.x===state.units.find(u=>u.id===selected).x&&p.y===state.units.find(u=>u.id===selected).y);
    const lesson=E.guide(s);$('lesson').hidden=!lesson||!started||modalOpen||helpOpen||!!animation;$('lesson').textContent=lesson?.unitId==='aster'?'① 赤を、光るマスへ':'② 青も、光るマスへ';$('bottom-buttons').style.visibility=lesson?'hidden':'visible';
    if(animation)return;
    $('instruction').textContent=selected==='aster'?'赤：青いマスをタップ':'青：青いマスをタップ';$('detail').className='detail';
    $('detail').textContent=lesson?(lesson.unitId==='aster'?'置くだけで、となりの敵を自動攻撃。':'ふたりで囲むと、自動で連携！'):'動くと、上下左右の敵を自動攻撃。';
    if(hover){const r=hover.result,combo=r.events.some(e=>e.kind==='combo'),danger=E.threats(r.frames[0].state).some(v=>v.cells.some(p=>{const u=r.frames[0].state.units.find(u=>u.id===selected);return p.x===u.x&&p.y===u.y;}));
      if(r.kills){$('detail').textContent=(combo?'連携！ ':'')+r.kills+'体を倒せる';$('detail').className='detail good';}
      else if(r.state.phase==='lost'){$('detail').textContent='ここに動くと、機体が倒される';$('detail').className='detail danger';}
      else if(danger){$('detail').textContent=state.acted.length?'ここは敵の攻撃が当たる':'この場所は敵の攻撃範囲。次の1機で敵を倒そう';$('detail').className='detail danger';}
      else $('detail').textContent=r.events.some(e=>e.kind==='attack')?'となりを自動攻撃':'ここへ移動する';
    }
  }
  function choose(id){
    if(!active()||pointer)return;const lesson=E.guide(state);if(lesson&&lesson.unitId!==id)return;
    if(state.acted.includes(id)){$('detail').textContent='その機体は行動済み。もう1機を動かそう。';return;}
    selected=id;hover=null;sound.init();sound.fx('select');updateHUD();
  }
  function showPreview(x,y){
    if(!active())return;try{hover={x,y,result:E.preview(state,selected,x,y)};}catch{hover=null;}updateHUD();
  }
  function act(x,y){
    if(!active())return;let result;try{result=E.move(state,selected,x,y);}catch{return;}
    history.push({state:E.copy(state),selected});if(history.length>16)history.shift();sound.init();storeRun(result.state);hover=null;pointer=null;
    animation={result,frames:result.frames,index:0,at:performance.now(),duration:400,pausedAt:null,fired:false};$('game').classList.add('animating');now=performance.now();beginBeat();
  }
  function finishMove(){
    state=animation.result.state;animation=null;hover=null;particles=[];floaters=[];shake=0;$('game').classList.remove('animating');$('burst').classList.remove('show');$('phase-banner').classList.remove('show');
    if(state.phase!=='play'){showResult();return;}
    selected=E.guide(state)?.unitId||E.available(state)[0].id;storeRun();updateHUD();
  }
  function undo(){
    if(animation||!history.length||helpOpen)return;const previous=history.pop();state=previous.state;selected=previous.selected;modalOpen=false;$('result-screen').hidden=true;hover=null;pointer=null;particles=[];floaters=[];shake=0;sound.music();sound.fx('select');storeRun();updateHUD();
  }
  const cell=e=>{const r=canvas.getBoundingClientRect();return{x:Math.floor((e.clientX-r.left)/r.width*E.W),y:Math.floor((e.clientY-r.top)/r.height*E.H)};};
  canvas.addEventListener('pointerdown',e=>{
    if(!active()||pointer)return;e.preventDefault();const p=cell(e),unit=state.units.find(u=>u.x===p.x&&u.y===p.y);let selectOnly=false;
    if(unit&&unit.id!==selected){choose(unit.id);selectOnly=true;if(selected!==unit.id)return;}
    if(!E.moves(state,selected).some(v=>v.x===p.x&&v.y===p.y)&&!unit){$('detail').textContent=state.enemies.some(v=>v.hp>0&&v.x===p.x&&v.y===p.y)?'敵のとなりの青いマスへ。攻撃は自動です。':'光っているマスを選んでください。';return;}
    sound.init();pointer={id:e.pointerId,x:p.x,y:p.y,selectOnly};canvas.setPointerCapture(e.pointerId);if(!selectOnly)showPreview(p.x,p.y);
  });
  canvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId||!active())return;const p=cell(e);if(p.x!==pointer.x||p.y!==pointer.y)pointer.selectOnly=false;showPreview(p.x,p.y);});
  canvas.addEventListener('pointerup',e=>{
    if(!pointer||pointer.id!==e.pointerId)return;const old=pointer,p=cell(e);pointer=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    if(!old.selectOnly&&active()&&E.moves(state,selected).some(v=>v.x===p.x&&v.y===p.y))act(p.x,p.y);else{hover=null;updateHUD();}
  });
  canvas.addEventListener('pointercancel',()=>{pointer=null;hover=null;updateHUD();});canvas.addEventListener('contextmenu',e=>e.preventDefault());
  $('unit-aster').addEventListener('click',()=>choose('aster'));$('unit-lumiere').addEventListener('click',()=>choose('lumiere'));$('undo').addEventListener('click',undo);$('result-undo').addEventListener('click',undo);
  $('stay').addEventListener('click',()=>{if(!active())return;const u=state.units.find(u=>u.id===selected);act(u.x,u.y);});
  function showResult(){
    modalOpen=true;const win=state.phase==='won',last=state.mission===5,lesson=state.mission===0;if(win)unlocked=Math.max(unlocked,Math.min(5,state.mission+1));storeRun();sound.stop();sound.fx(win?'win':'lose');updateHUD();
    $('result-screen').hidden=false;$('result-tag').textContent=win?(last?'ALL CLEAR':'CLEAR'):'もう一度、考えよう';$('result-title').textContent=win?(lesson?'動かすだけで、連携。':last?'ふたりで、嵐を越えた。':'突破！'):'一手、変えてみよう。';
    $('result-copy').textContent=win?(lesson?'次は、赤い×を読みながら敵を倒そう。':last?'全6面クリア。ふたりの機体は、晴れた雲海へ。':'敵を先に倒せば、その攻撃も消える。次の面へ進もう。'):'赤い×には、敵の攻撃が来ます。先に敵を倒すか、別のマスへ。';
    $('journey').innerHTML=E.MISSIONS.map((_,i)=>'<span class="'+(i<unlocked||win&&i===state.mission?'done':'')+'"></span>').join('');$('next').hidden=!win||last;$('result-undo').hidden=win||!history.length;$('retry').textContent=last&&win?'最初から、もう一度':'この面をやり直す';
  }
  function newMission(index){
    if(animation)return;state=E.create(index);started=true;selected=E.guide(state)?.unitId||'aster';history=[];hover=null;pointer=null;helpOpen=false;modalOpen=false;particles=[];floaters=[];
    for(const id of ['start-screen','result-screen','help-screen'])$(id).hidden=true;$('game').classList.remove('animating');$('burst').classList.remove('show');$('phase-banner').classList.remove('show');sound.music();storeRun();resize();updateHUD();if(index>0)$('detail').textContent=E.MISSIONS[index].hint;
  }
  $('start').addEventListener('click',()=>newMission(0));$('next').addEventListener('click',()=>{if(state.phase==='won'&&state.mission<5&&!animation)newMission(state.mission+1);});$('retry').addEventListener('click',()=>{if(!animation&&!$('result-screen').hidden)newMission(state.phase==='won'&&state.mission===5?0:state.mission);});
  if(saved){$('continue').hidden=false;$('start').classList.add('subtle');$('start').innerHTML='最初から試す <span>→</span>';}
  $('continue').addEventListener('click',()=>{if(!saved||started)return;state=saved;saved=null;started=true;modalOpen=false;$('start-screen').hidden=true;selected=E.guide(state)?.unitId||E.available(state)[0]?.id||'aster';history=[];updateHUD();resize();if(state.phase==='play')sound.music();else showResult();});
  function closeHelp(){helpOpen=false;$('help-screen').hidden=true;updateHUD();}
  $('help').addEventListener('click',()=>{if(animation||helpOpen)return;pointer=null;hover=null;helpOpen=true;$('help-screen').hidden=false;updateHUD();});$('close-help').addEventListener('click',closeHelp);
  document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;if(helpOpen){if(e.key==='Escape')closeHelp();return;}if(!active())return;if(e.key==='1')choose('aster');if(e.key==='2')choose('lumiere');if(e.key==='Escape'||e.key==='Backspace'){e.preventDefault();undo();}if(e.key===' '){e.preventDefault();const u=state.units.find(u=>u.id===selected);act(u.x,u.y);}});
  document.addEventListener('visibilitychange',()=>{
    pointer=null;hover=null;if(document.hidden){if(animation&&animation.pausedAt===null)animation.pausedAt=performance.now();sound.stop();sound.ctx?.suspend().catch(()=>{});}else{
      if(animation&&animation.pausedAt!==null){const delay=performance.now()-animation.pausedAt;animation.at+=delay;for(const p of particles)p.born+=delay;for(const f of floaters)f.born+=delay;animation.pausedAt=null;}if(started&&state.phase==='play')sound.music();
    }
  });
  window.addEventListener('pagehide',()=>{if(started)storeRun(animation?.result.state||state);sound.stop();});
  window.aetherPairDebug=()=>({state:E.copy(state),selected,preview:hover?{x:hover.x,y:hover.y,kills:hover.result.kills,phase:hover.result.state.phase}:null,history:history.length,busy:!!animation,modal:modalOpen,help:helpOpen,canvas:{width,height},audio:{enabled:soundOn,timer:sound.timer!==null,nodes:sound.nodes.size}});
  updateHUD();resize();requestAnimationFrame(render);
})();
