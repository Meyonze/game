/* AETHER PAIR — deterministic two-unit tactics. */
(function(root){
  'use strict';
  const W=9,H=11,DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
  const copy=o=>JSON.parse(JSON.stringify(o)),key=(x,y)=>x+','+y,inside=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<W&&y<H;
  const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
  const TYPES={talon:{name:'爪翼',hp:5,damage:3,move:2},lancer:{name:'穿風砲',hp:6,damage:3,move:0},cannon:{name:'雲投げ',hp:5,damage:2,move:0},bulwark:{name:'鎧翼',hp:9,damage:3,move:1,armor:1},boss:{name:'嵐喰い・ネブラ',hp:18,damage:3,move:0}};
  const MISSIONS=[
    {name:'雲上の初陣',place:'白帆の桟橋',brief:'風見灯を狙う雲獣が現れた。双機で桟橋を守れ。',hint:'砲の赤い射線から外れ、盾機と砲機で敵を挟もう。',par:5,beacon:[4,9],start:[[3,7],[5,8]],walls:[[1,5],[7,5]],cover:[[2,6],[6,6]],storm:[],enemies:[['talon',4,5],['lancer',4,1],['talon',7,3]]},
    {name:'砲列を抜けて',place:'風渡りの回廊',brief:'長い回廊を、穿風砲が封鎖している。射線を読んで踏み込め。',hint:'赤い砲撃は敵にも当たる。突き押しで射線に入れてみよう。',par:6,beacon:[4,9],start:[[3,7],[5,8]],walls:[[1,4],[2,4],[6,4],[7,4],[4,6]],cover:[[2,7],[6,7]],storm:[],enemies:[['lancer',0,3],['talon',3,3],['lancer',8,5],['talon',5,2],['cannon',4,0]]},
    {name:'誘い風',place:'蒼い風見台',brief:'灯を狙う投射体が飛来する。倒す順番を組み替え、砲撃を逆用せよ。',hint:'敵は数字の順に行動。先の砲撃で倒れた敵は、その番が来ても動かない。',par:6,beacon:[4,9],start:[[3,7],[5,7]],walls:[[2,4],[6,4],[4,5]],cover:[[1,6],[7,6]],storm:[[3,3],[5,3]],enemies:[['lancer',0,2],['bulwark',4,3],['cannon',7,1],['talon',2,2],['talon',6,5]]},
    {name:'灯のそばで',place:'落日の係留塔',brief:'両翼から灯が狙われている。守る機体と、討つ機体を見極めろ。',hint:'盾機が防御すると、隣の味方と風見灯も守れる。倒せない攻撃は受け止めよう。',par:7,beacon:[4,8],start:[[3,8],[5,9]],walls:[[2,5],[6,5],[4,3]],cover:[[3,7],[5,7]],storm:[[0,6],[8,6]],enemies:[['cannon',1,2],['cannon',7,2],['bulwark',4,5],['talon',0,4],['talon',8,4],['lancer',4,0]]},
    {name:'二重の包囲',place:'星屑の船渠',brief:'鎧翼が前を塞ぎ、その後ろで砲が灯を捉えた。挟撃で装甲を破れ。',hint:'挟撃は装甲を無視して7ダメージ。盾機の攻撃から砲機の射撃へ繋げよう。',par:8,beacon:[4,9],start:[[2,7],[6,7]],walls:[[1,3],[2,3],[6,3],[7,3],[4,6]],cover:[[2,5],[6,5]],storm:[[3,4],[5,4]],enemies:[['lancer',0,5],['lancer',8,5],['bulwark',3,3],['bulwark',5,3],['cannon',4,0],['talon',1,1],['talon',7,1]]},
    {name:'嵐を裂く双翼',place:'天穹の風見灯',brief:'雲海を呑むネブラが姿を現した。灯が消える前に、その嵐を断て。',hint:'ネブラを倒せば決着。雑魚をすべて倒す必要はない。2機の位置取りで連携を狙え。',par:8,beacon:[4,9],start:[[3,7],[5,7]],walls:[[1,5],[7,5],[2,2],[6,2]],cover:[[2,6],[6,6]],storm:[[0,4],[8,4],[4,5]],enemies:[['boss',4,2],['lancer',0,2],['lancer',8,2],['bulwark',3,4],['bulwark',5,4],['talon',1,0],['talon',7,0]]}
  ];
  function create(mission=0){
    if(!Number.isInteger(mission)||!MISSIONS[mission])throw Error('未知の作戦');
    const m=MISSIONS[mission],state={version:1,mission,round:1,phase:'plan',turnDamage:0,combos:0,friendlyKills:0,totalDamage:0,units:[
      {id:'aster',name:'アステル',pilot:'ユナ',role:'盾機',x:m.start[0][0],y:m.start[0][1],hp:12,maxHp:12,guard:false},
      {id:'lumiere',name:'リュミエ',pilot:'セナ',role:'砲機',x:m.start[1][0],y:m.start[1][1],hp:9,maxHp:9,guard:false}
    ],objective:{id:'beacon',x:m.beacon[0],y:m.beacon[1],hp:8,maxHp:8},enemies:m.enemies.map(([type,x,y],i)=>({id:'e'+i,type,x,y,hp:TYPES[type].hp,maxHp:TYPES[type].hp,intent:null})),tiles:[]};
    for(const kind of ['walls','cover','storm'])for(const [x,y] of m[kind])state.tiles.push({x,y,kind:kind==='walls'?'wall':kind});
    planEnemies(state);return state;
  }
  const tileAt=(s,x,y)=>s.tiles.find(t=>t.x===x&&t.y===y)?.kind;
  const wall=(s,x,y)=>!inside(x,y)||tileAt(s,x,y)==='wall';
  const alive=(s)=>[...s.units,...s.enemies,s.objective].filter(e=>e.hp>0);
  const occupant=(s,x,y,ignore)=>alive(s).find(e=>e.id!==ignore&&e.x===x&&e.y===y);
  function reachable(s,id){
    const unit=s.units.find(u=>u.id===id);if(!unit||unit.hp<=0)return [];
    const found=new Map([[key(unit.x,unit.y),{x:unit.x,y:unit.y,path:[]}]]),queue=[found.values().next().value];
    for(let i=0;i<queue.length;i++){
      const p=queue[i];if(p.path.length>=3)continue;
      for(const [dx,dy] of DIRS){const x=p.x+dx,y=p.y+dy,k=key(x,y);if(found.has(k)||wall(s,x,y))continue;
        const other=occupant(s,x,y,id);if(other&&!s.units.some(u=>u.id===other.id))continue;
        const next={x,y,path:[...p.path,{x,y}]};found.set(k,next);queue.push(next);
      }
    }
    return [...found.values()].filter(p=>!occupant(s,p.x,p.y,id));
  }
  function sight(s,a,b){
    let x=a.x,y=a.y;const dx=Math.abs(b.x-a.x),dy=Math.abs(b.y-a.y),sx=Math.sign(b.x-a.x),sy=Math.sign(b.y-a.y);let error=dx-dy;
    for(let n=0;n<W+H;n++){
      if(x===b.x&&y===b.y)return true;const e=2*error;if(e>-dy){error-=dy;x+=sx;}if(e<dx){error+=dx;y+=sy;}
      if(wall(s,x,y))return false;
    }return false;
  }
  function canTarget(s,unit,target,skill='attack'){
    if(!unit||!target||target.hp<=0||!s.enemies.some(e=>e.id===target.id))return false;
    const d=distance(unit,target);if(unit.id==='aster')return d===1;
    return skill==='special'?d>=2&&d<=6&&(unit.x===target.x||unit.y===target.y)&&sight(s,unit,target):d>=2&&d<=4&&sight(s,unit,target);
  }
  function comboReady(s,unit,target){
    if(unit.id!=='lumiere'||!canTarget(s,unit,target))return false;
    const ally=s.units.find(u=>u.id==='aster'&&u.hp>0);if(!ally||distance(ally,target)!==1)return false;
    return (ally.x-target.x)*(unit.x-target.x)+(ally.y-target.y)*(unit.y-target.y)<0;
  }
  function cardinal(a,b){const dx=b.x-a.x,dy=b.y-a.y;return Math.abs(dx)>Math.abs(dy)?[Math.sign(dx)||1,0]:[0,Math.sign(dy)||1];}
  function ray(s,x,y,dx,dy,range){const cells=[];for(let i=1;i<=range;i++){const xx=x+dx*i,yy=y+dy*i;if(wall(s,xx,yy))break;cells.push({x:xx,y:yy});}return cells;}
  function fan(s,p,dx,dy){return [-1,0,1].map(k=>({x:p.x+dx+(dy?k:0),y:p.y+dy+(dx?k:0)})).filter(p=>!wall(s,p.x,p.y));}
  function planEnemies(s){
    for(const e of s.enemies.filter(e=>e.hp>0)){
      const candidates=[...s.units.filter(u=>u.hp>0),s.objective].map(p=>({p,d:distance(e,p)+(p.id==='beacon'?(e.type==='cannon'||e.type==='boss'?-5:1):0)})).sort((a,b)=>a.d-b.d);
      const target=candidates[0].p,[dx,dy]=cardinal(e,target);
      if(e.type==='cannon')e.intent={kind:'shell',target:{x:target.x,y:target.y},targetName:target.id==='beacon'?'風見灯':target.name};
      else if(e.type==='boss')e.intent={kind:s.round%2?'storm':'shell',target:{x:target.x,y:target.y},targetName:target.id==='beacon'?'風見灯':target.name};
      else if(e.type==='lancer')e.intent={kind:'ray',dx,dy,targetName:target.id==='beacon'?'風見灯':target.name};
      else e.intent={kind:'hunt',dx,dy,steps:distance(e,target)>1?TYPES[e.type].move:0,targetName:target.id==='beacon'?'風見灯':target.name};
    }
  }
  function intentView(s,e){
    const i=e.intent,p={x:e.x,y:e.y},path=[];let cells=[];
    if(i.kind==='hunt'){
      for(let n=0;n<i.steps;n++){const x=p.x+i.dx,y=p.y+i.dy;if(wall(s,x,y)||occupant(s,x,y,e.id))break;p.x=x;p.y=y;path.push({...p});}
      cells=fan(s,p,i.dx,i.dy);
    }else if(i.kind==='ray')cells=ray(s,e.x,e.y,i.dx,i.dy,8);
    else if(i.kind==='shell')cells=[i.target,...DIRS.map(([dx,dy])=>({x:i.target.x+dx,y:i.target.y+dy}))].filter(p=>!wall(s,p.x,p.y));
    else for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(!wall(s,x,y)&&(x===i.target.x||y===i.target.y))cells.push({x,y});
    return{path,cells,from:{x:e.x,y:e.y},to:p};
  }
  function hurt(s,target,amount,source,events,ignoreArmor=false){
    if(target.hp<=0)return;
    let block=0;
    if(s.units.some(u=>u.id===target.id)){
      if(tileAt(s,target.x,target.y)==='cover')block++;
      if(target.guard)block+=2;
      if(target.id!=='aster'&&s.units.some(u=>u.id==='aster'&&u.guard&&u.hp>0&&distance(u,target)===1))block++;
    }else if(target.id==='beacon'){
      if(s.units.some(u=>u.id==='aster'&&u.guard&&u.hp>0&&distance(u,target)===1))block+=2;
    }else if(!ignoreArmor)block=TYPES[target.type].armor||0;
    const dealt=Math.min(target.hp,Math.max(0,amount-block));target.hp-=dealt;
    if(s.units.some(u=>u.id===target.id)){s.turnDamage+=dealt;s.totalDamage+=dealt;}
    events.push({kind:'hit',id:target.id,x:target.x,y:target.y,amount:dealt,blocked:Math.min(amount,block),source,text:dealt?'−'+dealt:'防御'});
    if(target.hp<=0){events.push({kind:'down',id:target.id,x:target.x,y:target.y,text:target.type?TYPES[target.type].name+' 撃破':target.name||'風見灯 消失'});if(source==='enemy'&&target.type)s.friendlyKills++;}
  }
  function outcome(s){
    if(s.units.some(u=>u.hp<=0)||s.objective.hp<=0){s.phase='lost';return true;}
    const boss=s.enemies.find(e=>e.type==='boss');
    if(boss?boss.hp<=0:s.enemies.every(e=>e.hp<=0)){s.phase='won';return true;}
    return false;
  }
  function pushFrame(frames,s,events,label,actor){frames.push({state:copy(s),events:copy(events),label,actor});}
  function applyOrder(s,order,frames,events){
    const unit=s.units.find(u=>u.id===order.unitId),dest=reachable(s,order.unitId).find(p=>p.x===order.x&&p.y===order.y);
    if(!unit||unit.hp<=0||!dest||!['attack','special','guard'].includes(order.skill))throw Error('行動を組み直してください');
    // Validate the target at the chosen destination before changing any state.
    const at={...unit,x:order.x,y:order.y},target=s.enemies.find(e=>e.id===order.targetId);
    if(order.skill!=='guard'&&!canTarget(s,at,target,order.skill))throw Error('その敵は射程外です');
    let local=[];
    if(dest.path.length){local.push({kind:'move',id:unit.id,from:{x:unit.x,y:unit.y},to:{x:order.x,y:order.y},path:dest.path});unit.x=order.x;unit.y=order.y;pushFrame(frames,s,local,unit.name+' 移動',unit.id);events.push(...local);}
    local=[];
    if(order.skill==='guard'){
      unit.guard=true;local.push({kind:'guard',id:unit.id,x:unit.x,y:unit.y,text:unit.id==='aster'?'防御・隣接援護':'防御'});
    }else if(unit.id==='lumiere'&&order.skill==='special'){
      const [dx,dy]=cardinal(unit,target),cells=ray(s,unit.x,unit.y,dx,dy,6);
      local.push({kind:'beam',from:{x:unit.x,y:unit.y},cells,text:'貫通射撃'});
      for(const victim of alive(s).filter(e=>cells.some(p=>p.x===e.x&&p.y===e.y)))hurt(s,victim,3,'player',local);
    }else{
      const combo=order.skill==='attack'&&comboReady(s,unit,target);
      local.push({kind:combo?'combo':'attack',from:{x:unit.x,y:unit.y},to:{x:target.x,y:target.y},id:target.id,text:combo?'双機挟撃 / CROSS BURST':unit.id==='aster'?(order.skill==='special'?'突き押し':'打撃'):'射撃'});
      if(combo)s.combos++;
      hurt(s,target,combo?7:order.skill==='special'?2:3,'player',local,combo);
      if(unit.id==='aster'&&order.skill==='special'&&target.hp>0){
        const dx=target.x-unit.x,dy=target.y-unit.y,x=target.x+dx,y=target.y+dy;
        if(!wall(s,x,y)&&!occupant(s,x,y,target.id)){
          local.push({kind:'push',id:target.id,from:{x:target.x,y:target.y},to:{x,y},text:'押し出し'});target.x=x;target.y=y;
        }else{local.push({kind:'collision',id:target.id,x:target.x,y:target.y,text:'衝突 ＋2'});hurt(s,target,2,'player',local,true);}
      }
    }
    events.push(...local);pushFrame(frames,s,local,local.find(e=>e.text)?.text||unit.name+' 行動',unit.id);
  }
  function playerPlan(state,orders){
    if(state.phase!=='plan'||!Array.isArray(orders)||orders.length>2||new Set(orders.map(o=>o.unitId)).size!==orders.length)throw Error('2機を1回ずつ行動させます');
    const s=copy(state),frames=[],events=[];for(const u of s.units)u.guard=false;s.turnDamage=0;
    for(const order of orders)applyOrder(s,order,frames,events);
    return{state:s,frames,events};
  }
  function enemyPhase(s,frames,events){
    const telegraphs=[];
    for(const e of s.enemies){
      if(e.hp<=0)continue;
      const view=intentView(s,e),local=[];telegraphs.push({id:e.id,...view});
      if(view.path.length){const from={x:e.x,y:e.y};e.x=view.to.x;e.y=view.to.y;local.push({kind:'move',id:e.id,from,to:view.to,path:view.path});}
      local.push({kind:'enemyAttack',id:e.id,from:{x:e.x,y:e.y},cells:view.cells,text:TYPES[e.type].name+' / '+({hunt:'接近・薙ぎ払い',ray:'直線砲撃',shell:'投射',storm:'天嵐'}[e.intent.kind])});
      for(const victim of alive(s).filter(v=>v.id!==e.id&&view.cells.some(p=>p.x===v.x&&p.y===v.y)))hurt(s,victim,TYPES[e.type].damage,'enemy',local);
      events.push(...local);pushFrame(frames,s,local,local.find(e=>e.kind==='enemyAttack').text,e.id);
      if(outcome(s))break;
    }
    if(s.phase==='plan'){
      const local=[];for(const target of alive(s))if(tileAt(s,target.x,target.y)==='storm')hurt(s,target,2,'storm',local,true);
      if(local.length){events.push(...local);pushFrame(frames,s,local,'帯電雲',null);}outcome(s);
    }
    return telegraphs;
  }
  function simulate(state,orders,finish=true){
    const result=playerPlan(state,orders),s=result.state;
    if(!outcome(s)&&finish)result.telegraphs=enemyPhase(s,result.frames,result.events);else result.telegraphs=[];
    result.damage=Object.fromEntries([...state.units,state.objective].map(u=>[u.id,Math.max(0,u.hp-[...s.units,s.objective].find(v=>v.id===u.id).hp)]));
    result.kills=state.enemies.filter(e=>e.hp>0&&!s.enemies.some(v=>v.id===e.id&&v.hp>0)).length;
    return result;
  }
  function forecast(state,orders,draft=null){
    const plan=playerPlan(state,orders),display=copy(plan.state);
    if(draft&&!orders.some(o=>o.unitId===draft.unitId)){
      const u=display.units.find(u=>u.id===draft.unitId),dest=reachable(display,draft.unitId).find(p=>p.x===draft.x&&p.y===draft.y);
      if(u&&dest){u.x=dest.x;u.y=dest.y;}
    }
    const s=copy(display),events=[],frames=[];
    const telegraphs=outcome(s)?[]:enemyPhase(s,frames,events);
    const damage=Object.fromEntries([...state.units,state.objective].map(u=>[u.id,Math.max(0,u.hp-[...s.units,s.objective].find(v=>v.id===u.id).hp)]));
    return{display,state:s,telegraphs,damage,kills:state.enemies.filter(e=>e.hp>0&&!s.enemies.some(v=>v.id===e.id&&v.hp>0)).length,events:[...plan.events,...events]};
  }
  function resolve(state,orders){
    if(orders.length!==2)throw Error('2機の行動を決めてください');
    const result=simulate(state,orders);if(result.state.phase==='plan'){result.state.round++;for(const u of result.state.units)u.guard=false;planEnemies(result.state);}return result;
  }
  function save(state){return{version:1,state:copy(state)};}
  function restore(record){
    try{
      if(record?.version!==1||!record.state)return null;const s=copy(record.state),base=create(s.mission);
      if(s.version!==1||!Number.isSafeInteger(s.round)||s.round<1||s.round>10000||!['plan','won','lost'].includes(s.phase)||!Array.isArray(s.units)||s.units.length!==2||!Array.isArray(s.enemies)||s.enemies.length!==base.enemies.length)return null;
      const validEntity=(e,b)=>e&&e.id===b.id&&inside(e.x,e.y)&&Number.isInteger(e.hp)&&e.hp>=0&&e.hp<=b.maxHp&&e.maxHp===b.maxHp;
      if(s.units.some((e,i)=>!validEntity(e,base.units[i])||e.name!==base.units[i].name)||!validEntity(s.objective,base.objective)||s.objective.x!==base.objective.x||s.objective.y!==base.objective.y)return null;
      if(s.enemies.some((e,i)=>!validEntity(e,base.enemies[i])||e.type!==base.enemies[i].type))return null;
      for(const k of ['combos','friendlyKills','totalDamage','turnDamage'])if(!Number.isSafeInteger(s[k])||s[k]<0)return null;
      if(JSON.stringify(s.tiles)!==JSON.stringify(base.tiles))return null;
      const entities=alive(s);if(new Set(entities.map(e=>key(e.x,e.y))).size!==entities.length||entities.some(e=>wall(s,e.x,e.y)))return null;
      // Regenerate public intentions; stored arbitrary scripts or coordinates are never trusted.
      planEnemies(s);if(s.phase==='plan'&&(s.units.some(u=>u.hp===0)||s.objective.hp===0))return null;
      return s;
    }catch{return null;}
  }
  const API={W,H,DIRS,TYPES,MISSIONS,copy,key,inside,distance,create,reachable,canTarget,comboReady,planEnemies,intentView,playerPlan,simulate,forecast,resolve,save,restore,tileAt,sight};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.AetherPair=API;
})(typeof window!=='undefined'?window:globalThis);
