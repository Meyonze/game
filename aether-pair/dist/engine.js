/* AETHER PAIR v2 — move, auto-attack, read the red crosses. */
(function(root){
  'use strict';
  const W=7,H=8,DIRS=[[0,-1],[1,0],[0,1],[-1,0]],copy=o=>JSON.parse(JSON.stringify(o));
  const key=(x,y)=>x+','+y,inside=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<W&&y<H;
  const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
  const TYPES={talon:{name:'雲獣',hp:2},bulwark:{name:'大雲獣',hp:3},lancer:{name:'直線砲',hp:2},boss:{name:'ネブラ',hp:6}};
  const MISSIONS=[
    {name:'ふたりで、囲む',hint:'光るマスをタップしてみよう。',start:[[2,5],[4,5]],walls:[],enemies:[['bulwark',3,3]]},
    {name:'赤い×を読む',hint:'赤い×には、敵の番に攻撃が来る。倒せば、その×も消える。',start:[[2,6],[4,6]],walls:[],enemies:[['talon',3,4],['talon',5,2]]},
    {name:'まとめて、連携',hint:'ひとつの場所から、隣の敵をまとめて攻撃できる。',start:[[2,6],[4,6]],walls:[],enemies:[['talon',2,3],['talon',4,3],['bulwark',3,1]]},
    {name:'狭い道の先へ',hint:'直線砲は赤い列を攻撃。横から回り込もう。',start:[[2,6],[4,6]],walls:[[1,3],[5,3],[3,4]],enemies:[['lancer',3,1],['talon',1,2],['talon',5,2],['bulwark',3,3]]},
    {name:'ふたつの射線',hint:'どちらを先に動かすかで、連携できる位置が変わる。',start:[[2,6],[4,6]],walls:[[2,4],[4,4]],enemies:[['lancer',1,2],['lancer',5,2],['bulwark',3,3],['talon',3,0]]},
    {name:'嵐を止める',hint:'ネブラを倒せば勝利。赤い十字を読んで、2機で迫れ。',start:[[2,6],[4,6]],walls:[[0,4],[6,4]],enemies:[['boss',3,2],['talon',1,3],['talon',5,3],['lancer',3,0]]}
  ];
  const wall=(s,x,y)=>!inside(x,y)||s.tiles.some(p=>p.x===x&&p.y===y);
  const alive=s=>[...s.units,...s.enemies].filter(e=>e.hp>0);
  const occupied=(s,x,y,id)=>alive(s).some(e=>e.id!==id&&e.x===x&&e.y===y);
  function create(mission=0){
    const m=MISSIONS[mission];if(!Number.isInteger(mission)||!m)throw Error('未知の面');
    const s={version:2,mission,round:1,phase:'play',acted:[],combos:0,totalDamage:0,units:[
      {id:'aster',name:'赤の機体',x:m.start[0][0],y:m.start[0][1],hp:4,maxHp:4},
      {id:'lumiere',name:'青の機体',x:m.start[1][0],y:m.start[1][1],hp:4,maxHp:4}
    ],enemies:m.enemies.map(([type,x,y],i)=>({id:'e'+i,type,x,y,hp:TYPES[type].hp,maxHp:TYPES[type].hp,dx:0,dy:1})),tiles:m.walls.map(([x,y])=>({x,y,kind:'wall'}))};
    aim(s);return s;
  }
  function aim(s){
    for(const e of s.enemies){if(e.type!=='lancer')continue;const target=s.units.filter(u=>u.hp>0).slice().sort((a,b)=>distance(a,e)-distance(b,e))[0];if(!target)continue;
      const dx=target.x-e.x,dy=target.y-e.y;[e.dx,e.dy]=Math.abs(dx)>Math.abs(dy)?[Math.sign(dx)||1,0]:[0,Math.sign(dy)||1];
    }
  }
  function guide(s){
    if(s.mission!==0||s.phase!=='play'||s.round!==1)return null;
    return s.acted.length===0?{unitId:'aster',x:2,y:3}:s.acted.length===1?{unitId:'lumiere',x:4,y:3}:null;
  }
  function available(s){return s.units.filter(u=>u.hp>0&&!s.acted.includes(u.id));}
  function moves(s,id){
    const unit=s.units.find(u=>u.id===id);if(s.phase!=='play'||!unit||unit.hp<=0||s.acted.includes(id))return [];
    const lesson=guide(s);if(lesson&&lesson.unitId!==id)return [];
    const queue=[{x:unit.x,y:unit.y,path:[]}],seen=new Set([key(unit.x,unit.y)]);
    for(let i=0;i<queue.length;i++){const p=queue[i];if(p.path.length===2)continue;
      for(const [dx,dy] of DIRS){const x=p.x+dx,y=p.y+dy,k=key(x,y);if(seen.has(k)||wall(s,x,y)||occupied(s,x,y,id))continue;
        seen.add(k);queue.push({x,y,path:[...p.path,{x,y}]});
      }
    }
    return lesson?queue.filter(p=>p.x===lesson.x&&p.y===lesson.y):queue;
  }
  function ray(s,e,dx,dy){const cells=[];for(let n=1;n<Math.max(W,H);n++){const x=e.x+dx*n,y=e.y+dy*n;if(wall(s,x,y))break;cells.push({x,y});}return cells;}
  function attackCells(s,e){
    if(e.hp<=0)return [];
    if(e.type==='lancer')return ray(s,e,e.dx,e.dy);
    if(e.type==='boss')return DIRS.flatMap(([dx,dy])=>ray(s,e,dx,dy));
    return DIRS.map(([dx,dy])=>({x:e.x+dx,y:e.y+dy})).filter(p=>!wall(s,p.x,p.y));
  }
  function threats(s){return s.enemies.filter(e=>e.hp>0).map(e=>({id:e.id,from:{x:e.x,y:e.y},cells:attackCells(s,e)}));}
  function finish(s){
    if(s.units.some(u=>u.hp<=0)){s.phase='lost';return true;}
    const boss=s.enemies.find(e=>e.type==='boss');if(boss?boss.hp<=0:s.enemies.every(e=>e.hp<=0)){s.phase='won';return true;}return false;
  }
  function frame(frames,s,events,label,kind){frames.push({state:copy(s),events:copy(events),label,kind});}
  function hit(s,e,n,events,source){
    const amount=Math.min(e.hp,n);if(amount<=0)return;e.hp-=amount;if(s.units.some(u=>u.id===e.id))s.totalDamage+=amount;
    events.push({kind:'hit',id:e.id,x:e.x,y:e.y,amount,source,text:'−'+amount});
    if(e.hp===0)events.push({kind:'down',id:e.id,x:e.x,y:e.y});
  }
  function approach(s,e){
    if(['lancer','boss'].includes(e.type)||s.units.some(u=>u.hp>0&&distance(e,u)===1))return null;
    const targets=s.units.filter(u=>u.hp>0),before=Math.min(...targets.map(u=>distance(u,e)));
    const choices=DIRS.map(([dx,dy])=>({x:e.x+dx,y:e.y+dy})).filter(p=>!wall(s,p.x,p.y)&&!occupied(s,p.x,p.y,e.id));
    choices.sort((a,b)=>Math.min(...targets.map(u=>distance(u,a)))-Math.min(...targets.map(u=>distance(u,b))));
    return choices[0]&&Math.min(...targets.map(u=>distance(u,choices[0])))<before?choices[0]:null;
  }
  function move(state,id,x,y){
    const chosen=moves(state,id).find(p=>p.x===x&&p.y===y);if(!chosen)throw Error('青いマスを選んでください');
    const s=copy(state),unit=s.units.find(u=>u.id===id),ally=s.units.find(u=>u.id!==id),frames=[],events=[];
    let local=[];if(chosen.path.length){local.push({kind:'move',id,from:{x:unit.x,y:unit.y},to:{x,y},path:chosen.path});unit.x=x;unit.y=y;}
    for(const enemy of s.enemies.filter(e=>e.hp>0&&distance(e,unit)===1)){
      const combo=ally.hp>0&&distance(enemy,ally)===1;
      local.push({kind:combo?'combo':'attack',id:enemy.id,from:{x,y},to:{x:enemy.x,y:enemy.y},ally:combo?{x:ally.x,y:ally.y}:null});if(combo)s.combos++;
      hit(s,enemy,combo?2:1,local,'player');
    }
    s.acted.push(id);events.push(...local);frame(frames,s,local,local.some(e=>e.kind==='combo')?'連携！':local.some(e=>e.kind==='attack')?'となりを自動攻撃':unit.name+' 移動','player');
    if(!finish(s)&&s.acted.length===2){
      local=[];
      for(const enemy of s.enemies.filter(e=>e.hp>0)){
        const cells=attackCells(s,enemy);local.push({kind:'enemyAttack',id:enemy.id,from:{x:enemy.x,y:enemy.y},cells});
        for(const u of s.units)if(u.hp>0&&cells.some(p=>p.x===u.x&&p.y===u.y))hit(s,u,1,local,'enemy');
      }
      events.push(...local);frame(frames,s,local,'敵の番','enemy');
      if(!finish(s)){
        local=[];for(const enemy of s.enemies.filter(e=>e.hp>0)){const next=approach(s,enemy);if(next){local.push({kind:'move',id:enemy.id,from:{x:enemy.x,y:enemy.y},to:next});enemy.x=next.x;enemy.y=next.y;}}
        s.round++;s.acted=[];aim(s);events.push(...local);frame(frames,s,local,'次の2手','next');
      }
    }
    return{state:s,frames,events,kills:state.enemies.filter(e=>e.hp>0&&!s.enemies.some(v=>v.id===e.id&&v.hp>0)).length};
  }
  function preview(s,id,x,y){return move(s,id,x,y);}
  function save(s){return{version:2,state:copy(s)};}
  function restore(record){
    try{
      if(record?.version!==2||!record.state)return null;const s=copy(record.state),base=create(s.mission),integer=n=>Number.isSafeInteger(n)&&n>=0;
      if(s.version!==2||!integer(s.round)||s.round<1||!['play','won','lost'].includes(s.phase)||!integer(s.combos)||!integer(s.totalDamage))return null;
      if(!Array.isArray(s.acted)||s.acted.length>2||new Set(s.acted).size!==s.acted.length||s.acted.some(id=>!base.units.some(u=>u.id===id))||(s.phase==='play'&&s.acted.length>1))return null;
      const valid=(e,b)=>e&&e.id===b.id&&inside(e.x,e.y)&&integer(e.hp)&&e.hp<=b.maxHp&&e.maxHp===b.maxHp;
      if(!Array.isArray(s.units)||s.units.length!==2||s.units.some((e,i)=>!valid(e,base.units[i])||e.name!==base.units[i].name))return null;
      if(!Array.isArray(s.enemies)||s.enemies.length!==base.enemies.length||s.enemies.some((e,i)=>!valid(e,base.enemies[i])||e.type!==base.enemies[i].type||!DIRS.some(([dx,dy])=>dx===e.dx&&dy===e.dy)))return null;
      if(JSON.stringify(s.tiles)!==JSON.stringify(base.tiles))return null;
      const entities=alive(s);if(entities.some(e=>wall(s,e.x,e.y))||new Set(entities.map(e=>key(e.x,e.y))).size!==entities.length)return null;
      if(s.phase==='play'&&s.units.some(u=>u.hp===0))return null;
      if(s.mission===0&&s.phase==='play'&&s.round===1&&s.acted.length===1&&s.acted[0]!=='aster')return null;
      return s;
    }catch{return null;}
  }
  const API={W,H,DIRS,TYPES,MISSIONS,copy,key,inside,distance,create,guide,available,moves,attackCells,threats,move,preview,save,restore,wall};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.AetherPair=API;
})(typeof window!=='undefined'?window:globalThis);
