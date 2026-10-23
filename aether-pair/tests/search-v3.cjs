const E=require('../dist/engine.js'),fs=require('node:fs');
function search(style='balanced',mission=0){
 const start=E.create(mission);let beam=[{s:start,path:[]}];let explored=0;
 const score=s=>{
  const hpLoss=(9-s.units[0].hp)+(6-s.units[1].hp)*1.5, boss=s.enemies.find(e=>e.type==='boss');
  const killed=s.enemies.filter(e=>e.hp===0).length;
  const damage=s.enemies.reduce((n,e)=>n+(e.maxHp-e.hp)*(e.type==='boss'?(style==='rush'?2.5:1.3):(style==='rush'?.35:1)),0);
  const proximity=Math.min(...s.units.map(u=>Math.min(...s.enemies.filter(e=>e.hp>0).map(e=>E.distance(u,e)))));
  return damage+killed*2-hpLoss*(style==='careful'?4:1.2)+s.energy*.3+(style==='combo'?s.combos*5:0)-s.round*.45-(Number.isFinite(proximity)?proximity*.2:0);
 };
 for(let depth=0;depth<20;depth++){
  const choices=[],seen=new Set();
  for(const n of beam)for(const u of E.available(n.s))for(const o of E.options(n.s,u.id)){
   if(style==='no-power'&&['power','combo'].includes(o.kind))continue;
   const r=E.action(n.s,o.id,o.x,o.y,o.kind,o.target),s=r.state;explored++;
   if(s.phase==='lost')continue;
   const path=[...n.path,o];if(s.phase==='won')return {style,mission,explored,rounds:s.round,hp:s.units.map(u=>u.hp),combos:s.combos,spent:s.spent,guards:s.guards,actions:path};
   const k=JSON.stringify([s.units,s.enemies,s.energy,s.acted,s.round]);if(seen.has(k))continue;seen.add(k);choices.push({s,path,score:score(s)});
  }
  choices.sort((a,b)=>b.score-a.score);beam=choices.slice(0,50);if(!beam.length)break;
 }
 return {style,mission,explored,failed:true};
}
if(require.main===module){const results=['careful','rush','combo','no-power'].map(s=>search(s));results.push(search('balanced',1));fs.writeFileSync('artifacts/tactical-lines.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(({actions,...r})=>({...r,opening:actions?.slice(0,2)})),null,2));}
module.exports=search;
