export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const angleDiff=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export const ARENA=28;
export const DIFFICULTIES={pilot:{name:'PILOT',damage:.8,armor:2,warning:1.05,recovery:1.8,broken:2.8},ace:{name:'ACE',damage:1.15,armor:2.4,warning:.7,recovery:1.1,broken:2}};
export const COVERS=[{x:-10,z:-5,w:4,d:5,h:3.4},{x:10,z:5,w:4,d:5,h:3.4},{x:-18,z:10,w:5,d:3,h:2.2},{x:18,z:-10,w:5,d:3,h:2.2},{x:1,z:-19,w:7,d:2,h:2.4},{x:-1,z:19,w:7,d:2,h:2.4}];
export const FRAMES=[{id:'ronin',name:'AKATSUKI',jp:'暁',model:'RONIN / 04',role:'近接強襲型',hp:1200,speed:8.2,melee:155,shot:19,color:0xff794c,accent:'#ff794c',file:'./models/ronin.glb',description:'一瞬の間合いを、勝機に変える。',detail:'高い耐久力と長い刀身。接近戦で優位に立つ。'},{id:'aether',name:'BYAKUYA',jp:'白夜',model:'AETHER / 02',role:'高速射撃型',hp:1050,speed:9.8,melee:120,shot:23,color:0x7be9f5,accent:'#7be9f5',file:'./models/aether.glb',description:'捉えられる前に、撃ち抜く。',detail:'機動力と射撃性能に特化。距離を保って制圧する。'}];
export function segmentCircle(ax,az,bx,bz,cx,cz,r){const dx=bx-ax,dz=bz-az,t=clamp(((cx-ax)*dx+(cz-az)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(ax+dx*t-cx,az+dz*t-cz)<r;}
export function segmentBox(ax,az,bx,bz,b,pad=0){let lo=0,hi=1;for(const [a,d,min,max]of[[ax,bx-ax,b.x-b.w/2-pad,b.x+b.w/2+pad],[az,bz-az,b.z-b.d/2-pad,b.z+b.d/2+pad]]){if(Math.abs(d)<1e-8){if(a<min||a>max)return null;}else{let t1=(min-a)/d,t2=(max-a)/d;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return null;}}return lo;}
export function clearLine(a,b,height=2.4){return !COVERS.some(c=>c.h>height&&segmentBox(a.x,a.z,b.x,b.z,c,.1)!==null);}
export function newUnit(frame,index){return{frame,index,x:index?6:-5,z:index?-11:10,y:0,vy:0,vx:0,vz:0,yaw:index?0:Math.PI,hp:frame.hp,maxHP:frame.hp,energy:100,heat:0,shot:0,plasma:0,meleeCooldown:0,dashCooldown:0,dash:0,invuln:0,stagger:0,guard:false,guardAge:10,attack:0,attackHit:false,meleeBuffer:0,attackSeq:0,boost:false,air:false,jumpCD:0,hit:0,overdrive:0,ultimate:0,damageDealt:0,shots:0,hits:0,telegraph:0,aiTimer:1,aiOrbit:1,aiAttack:null,aiPhase:'approach',aiPhaseTime:1.2,aiKind:'burst',aiFired:false,pressure:0,broken:0,dead:false};}
export class Duel{
 constructor(random=Math.random){this.random=random;this.reset(0);this.phase='hangar';}
 reset(selected=0,difficulty='pilot'){this.difficulty=DIFFICULTIES[difficulty]?difficulty:'pilot';this.rules=DIFFICULTIES[this.difficulty];this.units=[newUnit(FRAMES[selected],0),newUnit(FRAMES[1-selected],1)];this.enemy.hp=this.enemy.maxHP=this.enemy.frame.hp*this.rules.armor;this.player.ultimate=35;this.phase='countdown';this.countdown=3;this.time=120;this.elapsed=0;this.projectiles=[];this.events=[];this.winner=null;this.slow=0;this.lastCount=4;this.nextId=1;this.metrics={dashes:0,parries:0,breaks:0,punishes:0};}
 emit(type,data={}){this.events.push({type,...data});}
 drain(){return this.events.splice(0);}
 get player(){return this.units[0];}get enemy(){return this.units[1];}
 ai(dt){
  const u=this.enemy,t=this.player,d=Math.hypot(t.x-u.x,t.z-u.z),out={forward:0,side:0,fire:false,guard:false};
  if(u.broken>0||u.stagger>0)return out;
  u.aiPhaseTime-=dt;
  if(u.aiPhase==='approach'){
   const preferred=u.frame.id==='ronin'?6:13;
   out.forward=d>preferred+2?.65:d<preferred-3?-.3:0;out.side=u.aiOrbit*.5;
   if(!clearLine(u,t)){out.forward=.45;out.side=u.aiOrbit*.7;}
   if(u.aiPhaseTime<=0){
    if(!clearLine(u,t)){u.aiPhaseTime=.35;return out;}
    u.aiKind=d<9?'melee':u.plasma<=0&&this.random()>.45?'plasma':'burst';
    u.aiPhase='warning';u.aiPhaseTime=this.rules.warning;u.aiFired=false;u.telegraph=this.rules.warning;
    this.emit('warning',{unit:1,kind:u.aiKind,duration:this.rules.warning});
   }
  }else if(u.aiPhase==='warning'){
   if(u.aiPhaseTime<=0){u.aiPhase='attack';u.aiPhaseTime=u.aiKind==='burst'?1.8:.9;}
  }else if(u.aiPhase==='attack'){
   if(u.aiKind==='burst'){out.fire=clearLine(u,t);out.side=u.aiOrbit*.3;}
   else if(!u.aiFired){out[u.aiKind]=true;u.aiFired=true;}
   if(u.aiPhaseTime<=0){u.aiPhase='recover';u.aiPhaseTime=this.rules.recovery;this.emit('opening',{unit:1,duration:u.aiPhaseTime});}
  }else if(u.aiPhase==='recover'&&u.aiPhaseTime<=0){
   u.aiPhase='approach';u.aiPhaseTime=.7+this.random()*.7;u.aiOrbit=this.random()>.5?1:-1;
  }
  return out;
 }
 step(dt,input={}){
  if(this.phase==='hangar'||this.phase==='paused'||this.phase==='result')return;
  dt=Math.min(dt,.04);this.elapsed+=dt;
  if(this.phase==='countdown'){this.countdown-=dt;const n=Math.ceil(this.countdown);if(n!==this.lastCount&&n>0){this.emit('count',{value:n});this.lastCount=n;}for(const u of this.units){const t=this.units[1-u.index];u.yaw=Math.atan2(t.x-u.x,t.z-u.z);}if(this.countdown<=0){this.phase='playing';this.emit('engage');}return;}
  this.time=Math.max(0,this.time-dt);
  const ai=this.ai(dt);this.updateUnit(this.player,this.enemy,input,dt);this.updateUnit(this.enemy,this.player,ai,dt);
  const a=this.player,b=this.enemy,dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d<2&&d>.001&&Math.abs(a.y-b.y)<3){const k=(2-d)*.5;a.x-=dx/d*k;a.z-=dz/d*k;b.x+=dx/d*k;b.z+=dz/d*k;}
  for(const u of this.units)this.collide(u);
  for(let i=this.projectiles.length-1;i>=0;i--){const p=this.projectiles[i],ox=p.x,oz=p.z,oy=p.y;p.life-=dt;p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;let hit=false;
   for(const c of COVERS){const at=segmentBox(ox,oz,p.x,p.z,c,.12);if(at!==null&&lerp(oy,p.y,at)<c.h&&lerp(oy,p.y,at)>0){p.x=lerp(ox,p.x,at);p.z=lerp(oz,p.z,at);hit=true;break;}}
   const target=this.units[1-p.owner];if(!hit&&Math.abs(p.y-target.y-2.2)<2.4&&segmentCircle(ox,oz,p.x,p.z,target.x,target.z,p.radius+1)){this.damage(target,this.units[p.owner],p.damage,'shot');hit=true;}
   if(hit){this.emit('impact',{x:p.x,y:p.y,z:p.z,color:p.color,big:p.big});if(p.big)this.emit('blast',{x:p.x,y:p.y,z:p.z,color:p.color});}
   if(hit||p.life<=0||Math.hypot(p.x,p.z)>65)this.projectiles.splice(i,1);
  }
  if(this.units.some(u=>u.hp<=0)||this.time<=0){const pa=a.hp/a.maxHP,pb=b.hp/b.maxHP;this.winner=pa===pb?-1:pa>pb?0:1;this.phase='result';for(const u of this.units){u.vx=u.vz=0;u.guard=false;u.attack=0;u.dead=u.hp<=0;}this.emit('finish',{winner:this.winner});}
 }
 updateUnit(u,t,input,dt){
  for(const key of['shot','plasma','meleeCooldown','dashCooldown','dash','invuln','stagger','jumpCD','hit','overdrive','telegraph','broken','meleeBuffer'])u[key]=Math.max(0,u[key]-dt);
  u.heat=Math.max(0,u.heat-dt*25);u.ultimate=Math.min(100,u.ultimate+dt*(u.index===0?2:1.1));u.energy=Math.min(100,u.energy+dt*(u.guard?4:u.dash>0?0:23));
  const dx=t.x-u.x,dz=t.z-u.z,dist=Math.hypot(dx,dz)||1,fx=dx/dist,fz=dz/dist,rx=-fz,rz=fx;
  u.yaw+=angleDiff(u.yaw,Math.atan2(dx,dz))*(1-Math.exp(-dt*12));
  if(u.broken>0){input={};u.stagger=Math.max(u.stagger,.08);}
  const guarding=!!input.guard&&u.energy>6&&u.attack<=0&&u.dash<=0&&u.stagger<=0;if(guarding&&!u.guard)u.guardAge=0;else u.guardAge+=dt;u.guard=guarding;
  if(input.ultimate&&u.ultimate>=100&&u.overdrive<=0&&u.stagger<=0){u.ultimate=0;u.overdrive=6;u.energy=100;u.invuln=.65;this.emit('ultimate',{unit:u.index,x:u.x,y:u.y,z:u.z,color:u.frame.color});if(dist<12&&clearLine(u,t))this.damage(t,u,115,'blast');}
  if(input.jump&&!u.air&&u.jumpCD<=0&&u.energy>=15&&u.stagger<=0){u.vy=9;u.air=true;u.energy-=15;u.jumpCD=1.1;this.emit('jump',{unit:u.index,x:u.x,z:u.z});}
  let mx=fx*(input.forward||0)+rx*(input.side||0),mz=fz*(input.forward||0)+rz*(input.side||0);const mag=Math.hypot(mx,mz);if(mag>1){mx/=mag;mz/=mag;}
  if(input.dash&&u.dashCooldown<=0&&u.energy>=20&&(u.stagger<=0||u.index===0)){if(mag<.1){mx=fx;mz=fz;}u.dashX=mx;u.dashZ=mz;u.dash=.22;u.dashCooldown=.55;u.energy-=20;u.invuln=u.index===0?.36:.25;u.stagger=0;u.guard=false;u.attack=0;this.emit('dash',{unit:u.index,color:u.frame.color});if(!u.index)this.metrics.dashes++;}
  if(input.melee)u.meleeBuffer=.2;
  if(u.meleeBuffer>0&&u.meleeCooldown<=0&&u.stagger<=0&&!u.guard&&u.dash<=0){u.meleeBuffer=0;u.attack=.82;u.attackHit=false;u.attackSeq=(u.attackSeq+1)%2;u.meleeCooldown=.9;this.emit('swing',{unit:u.index,color:u.frame.color});}
  if(u.attack>0){const previous=u.attack;u.attack=Math.max(0,u.attack-dt);if(previous>.43&&u.attack<=.43&&!u.attackHit){u.attackHit=true;this.emit('slash',{unit:u.index,x:u.x,y:u.y,z:u.z,yaw:u.yaw,color:u.frame.color});const direction=Math.atan2(t.x-u.x,t.z-u.z);if(dist<(u.frame.id==='ronin'?6.4:4.2)&&Math.abs(angleDiff(u.yaw,direction))<1.2&&Math.abs(u.y-t.y)<3&&clearLine(u,t))this.damage(t,u,u.frame.melee*(u.overdrive>0?1.35:1),'melee');}}
  const speed=u.frame.speed*(u.index===1?.85:1)*(u.guard?.42:u.attack>0?.3:u.overdrive>0?1.2:1);u.boost=u.dash>0;
  if(u.attack>.43&&dist>2.8&&dist<11&&clearLine(u,t)){u.vx=fx*19;u.vz=fz*19;}else if(u.dash>0){u.vx=u.dashX*35;u.vz=u.dashZ*35;}else{const k=1-Math.exp(-dt*(mag>.1?10:7));u.vx=lerp(u.vx,u.stagger>0?0:mx*speed,k);u.vz=lerp(u.vz,u.stagger>0?0:mz*speed,k);}
  u.x+=u.vx*dt;u.z+=u.vz*dt;
  if(u.air){u.vy-=23*dt;u.y+=u.vy*dt;if(u.y<=0){u.y=0;u.vy=0;u.air=false;this.emit('land',{unit:u.index,x:u.x,z:u.z});}}
  if(u.stagger<=0&&u.attack<=0&&!u.guard){if(input.plasma&&u.plasma<=0){this.fire(u,t,true);u.plasma=5.5;}else if(input.fire&&u.shot<=0&&u.heat<90){this.fire(u,t,false);u.shot=u.index===1?.28:u.overdrive>0?.1:.18;u.heat+=7;}}
 }
 fire(u,t,big){const dx=t.x-u.x,dz=t.z-u.z,dist=Math.hypot(dx,dz)||1,speed=u.index===1?(big?27:42):(big?48:72),lead=u.index===0?Math.min(.55,dist/speed)*.85:0;let tx=t.x+t.vx*lead,tz=t.z+t.vz*lead;const len=Math.hypot(tx-u.x,tz-u.z)||1,dy=t.y+2.4-(u.y+2.6);this.projectiles.push({id:this.nextId++,owner:u.index,x:u.x+dx/dist*1.2,z:u.z+dz/dist*1.2,y:u.y+2.6,vx:(tx-u.x)/len*speed,vz:(tz-u.z)/len*speed,vy:dy/len*speed,life:2,damage:(big?130:u.frame.shot)*(u.index===1?this.rules.damage:1),radius:big?.75:u.index===0?.38:.17,color:u.frame.color,big});u.shots++;this.emit('shot',{unit:u.index,big,color:u.frame.color});}
 damage(target,source,amount,type){if(target.hp<=0||target.invuln>0)return false;
  if(source.index===1&&type!=='shot')amount*=this.rules.damage;
  const exposed=target.index===1&&target.broken>0;if(exposed){amount*=type==='melee'?1.75:1.4;if(type==='melee'){this.metrics.punishes++;this.emit('punish',{unit:0});}}
  const facing=Math.abs(angleDiff(target.yaw,Math.atan2(source.x-target.x,source.z-target.z)))<1.3;
  if(target.guard&&facing&&target.energy>6){if(target.guardAge<(target.index===0?.3:.18)&&type==='melee'){target.energy=Math.min(100,target.energy+15);source.stagger=.65;source.attack=0;target.ultimate=Math.min(100,target.ultimate+15);this.emit('parry',{unit:target.index,x:target.x,y:target.y+2.4,z:target.z});if(!target.index){this.metrics.parries++;this.pressure(source,target,65);}return false;}target.energy=Math.max(0,target.energy-amount*.12);amount*=.22;this.emit('block',{unit:target.index,x:target.x,y:target.y+2.3,z:target.z});}
  target.hp=Math.max(0,target.hp-amount);target.hit=.18;target.ultimate=Math.min(100,target.ultimate+amount*.035);source.ultimate=Math.min(100,source.ultimate+amount*.075);source.damageDealt+=amount;source.hits++;if(type==='melee'){target.stagger=target.index===0?.35:exposed?target.broken:target.aiPhase==='warning'||target.aiPhase==='attack'?0:.12;if(target.index===0||exposed)target.attack=0;const d=Math.hypot(target.x-source.x,target.z-source.z)||1;target.vx=(target.x-source.x)/d*13;target.vz=(target.z-source.z)/d*13;}
  this.emit('damage',{unit:target.index,amount,heavy:type==='melee'||amount>80,x:target.x,y:target.y+2.4,z:target.z,color:source.frame.color});if(target.index===1&&!exposed&&target.hp>0)this.pressure(target,source,type==='melee'?30:type==='blast'?30:amount>70?24:4);return true;
 }
 pressure(target,source,amount){
  if(target.index!==1||target.broken>0||target.hp<=0)return;
  target.pressure=Math.min(100,target.pressure+amount);
  if(target.pressure<100)return;
  target.pressure=0;target.broken=this.rules.broken;target.stagger=this.rules.broken;target.attack=0;target.guard=false;target.telegraph=0;target.aiPhase='recover';target.aiPhaseTime=.15;
  source.ultimate=Math.min(100,source.ultimate+20);const heal=Math.min(60,source.maxHP-source.hp);source.hp+=heal;this.metrics.breaks++;
  this.emit('break',{unit:target.index,x:target.x,y:target.y,z:target.z,duration:target.broken,heal});
 }

 collide(u){for(const c of COVERS){if(u.y>c.h+.1)continue;const x=clamp(u.x,c.x-c.w/2,c.x+c.w/2),z=clamp(u.z,c.z-c.d/2,c.z+c.d/2),dx=u.x-x,dz=u.z-z,d=Math.hypot(dx,dz);if(d<.95){if(d>.001){u.x=x+dx/d*.95;u.z=z+dz/d*.95;}else{const ex=c.w/2+.95-Math.abs(u.x-c.x),ez=c.d/2+.95-Math.abs(u.z-c.z);if(ex<ez)u.x+=Math.sign(u.x-c.x||1)*ex;else u.z+=Math.sign(u.z-c.z||1)*ez;}}}const r=Math.hypot(u.x,u.z);if(r>ARENA){u.x*=ARENA/r;u.z*=ARENA/r;}}
}
