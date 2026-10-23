const fs=require('node:fs'),E=require('../dist/engine.js');
function options(s,id){const u=s.units.find(u=>u.id===id),out=[];for(const p of E.reachable(s,id)){const at={...u,x:p.x,y:p.y};out.push({unitId:id,x:p.x,y:p.y,skill:'guard'});for(const target of s.enemies.filter(e=>e.hp>0))for(const skill of ['attack','special'])if(E.canTarget(s,at,target,skill))out.push({unitId:id,x:p.x,y:p.y,skill,targetId:target.id});}return out;}
function score(s,policy=0){
  if(s.phase==='won')return 100000;if(s.phase==='lost')return -100000;
  const e=s.enemies.filter(e=>e.hp>0),threat=e.reduce((v,x)=>v+x.hp*({boss:2.1,cannon:1.6,lancer:1.3}[x.type]||1),0);
  const approach=s.units.reduce((v,u)=>v+Math.min(...e.map(x=>Math.abs(E.distance(u,x)-(u.id==='aster'?1:3)))),0);
  return s.objective.hp*(policy===1?13:9)+s.units.reduce((v,u)=>v+u.hp*(u.id==='aster'?2.2:3),0)-threat*(policy===2?5:3.6)-approach*.9+s.combos*.4+s.friendlyKills*.3;
}
function bestTurn(state,policy=0,keep=14){
  const first=[];for(const u of state.units)for(const o of options(state,u.id)){const p=E.simulate(state,[o]);first.push({o,score:score(p.state,policy),project:E.playerPlan(state,[o]).state});}
  first.sort((a,b)=>b.score-a.score);
  const finalists=first.slice(0,keep);let best=null;
  for(const f of finalists){const other=state.units.find(u=>u.id!==f.o.unitId);for(const second of options(f.project,other.id)){
    const orders=[f.o,second],result=E.resolve(state,orders),value=score(result.state,policy);
    if(!best||value>best.score)best={orders,result,score:value};
  }}return best;
}
async function main(){const summary=[];for(let mission=0;mission<E.MISSIONS.length;mission++){
  let best=null;for(let policy=0;policy<3;policy++){
    let state=E.create(mission),trace=[];const seen=new Map();while(state.phase==='plan'&&state.round<=18){const next=bestTurn(state,policy);if(!next)break;trace.push(next.orders);state=next.result.state;const signature=JSON.stringify([state.units.map(u=>[u.x,u.y,u.hp]),state.enemies.map(e=>[e.x,e.y,e.hp]),state.objective.hp]);seen.set(signature,(seen.get(signature)||0)+1);if(seen.get(signature)>2)break;}
    const run={mission,policy,phase:state.phase,round:state.round,beacon:state.objective.hp,units:state.units.map(u=>u.hp),combos:state.combos,friendlyKills:state.friendlyKills,trace};if(!best||run.phase==='won'||score(state,policy)>best.value)best={...run,value:score(state,policy)};if(run.phase==='won')break;
  }
  summary.push(best);console.log(JSON.stringify({...best,trace:undefined}));fs.writeFileSync('artifacts/campaign-simulation.json',JSON.stringify(summary,null,2));
} }
if(require.main===module)main();module.exports={options,bestTurn,score};
