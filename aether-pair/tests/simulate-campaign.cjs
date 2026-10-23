const E=require('../dist/engine.js'),fs=require('node:fs');
function score(s){
  if(s.phase==='won')return 100000;if(s.phase==='lost')return -100000;
  const enemies=s.enemies.filter(e=>e.hp>0),hp=s.units.reduce((n,u)=>n+u.hp,0),approach=s.units.reduce((n,u)=>n+Math.min(...enemies.map(e=>E.distance(u,e))),0);
  return hp*12-enemies.reduce((n,e)=>n+e.hp*(e.type==='boss'?1.5:1),0)*5-approach*.8+s.combos*.1;
}
function bestRound(s){
  let best=null;
  for(const unit of E.available(s))for(const p of E.moves(s,unit.id)){
    const first={id:unit.id,x:p.x,y:p.y},a=E.move(s,unit.id,p.x,p.y);
    if(a.state.phase!=='play'){const rank=score(a.state);if(!best||rank>best.rank)best={state:a.state,trace:[first],rank};continue;}
    for(const other of E.available(a.state))for(const q of E.moves(a.state,other.id)){
      const b=E.move(a.state,other.id,q.x,q.y),rank=score(b.state);if(!best||rank>best.rank)best={state:b.state,trace:[first,{id:other.id,x:q.x,y:q.y}],rank};
    }
  }return best;
}
function solve(mission){let state=E.create(mission),trace=[];for(let i=0;i<18&&state.phase==='play';i++){const next=bestRound(state);if(!next)break;trace.push(...next.trace);state=next.state;}return{mission,phase:state.phase,round:state.round,hp:state.units.map(u=>u.hp),combos:state.combos,trace};}
if(require.main===module){const runs=E.MISSIONS.map((_,i)=>{const r=solve(i);console.log(JSON.stringify({...r,trace:undefined}));return r;});fs.writeFileSync('artifacts/campaign-simulation.json',JSON.stringify(runs,null,2));}
module.exports={score,bestRound,solve};
