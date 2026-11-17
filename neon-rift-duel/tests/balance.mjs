import assert from 'node:assert/strict';
import {Duel,FRAMES} from '../combat.mjs';
const rows=[];
for(const difficulty of ['pilot','ace'])for(const policy of ['idle','shoot','move','punish'])for(let frame=0;frame<2;frame++){
 let wins=0,health=0,time=0,breaks=0,punishes=0;
 for(let seed=1;seed<=24;seed++){
  let state=seed;const game=new Duel(()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;});game.reset(frame,difficulty);
  for(let i=0;i<7600&&game.phase!=='result';i++){
   const enemy=game.enemy,p=game.player,distance=Math.hypot(enemy.x-p.x,enemy.z-p.z);let input=policy==='idle'?{}:{fire:true};
   if(policy==='move')Object.assign(input,{side:Math.floor(i/240)%2?1:-1,plasma:i%180===0});
   if(policy==='punish')Object.assign(input,{side:enemy.aiPhase==='warning'?.8:0,forward:distance>8?.8:0,melee:distance<11&&i%72===0,plasma:i%210===0,dash:enemy.aiPhase==='warning'&&i%60===0,ultimate:i%120===0});
   game.step(1/60,input);game.drain();
  }
  assert.equal(game.phase,'result','Duel must resolve');wins+=game.winner===0;health+=game.player.hp/game.player.maxHP;time+=120-game.time;breaks+=game.metrics.breaks;punishes+=game.metrics.punishes;
 }
 rows.push({difficulty,policy,frame:FRAMES[frame].id,wins,runs:24,health:Math.round(health/24*100),seconds:Math.round(time/24),breaks:+(breaks/24).toFixed(1),punishes:+(punishes/24).toFixed(1)});
}
for(const row of rows.filter(r=>r.difficulty==='pilot')){
 if(row.policy==='idle'){assert.equal(row.wins,0);assert.ok(row.seconds>25,'New pilots need time to understand the fight');}
 else {assert.ok(row.wins>=18,'Simple active play must usually win on PILOT');assert.ok(row.breaks>0,'Break loop must occur in real AI bouts');}
 if(row.policy==='punish')assert.ok(row.punishes>0,'Closing in must create break follow-ups');
}
for(const frame of FRAMES){const select=(mode,policy)=>rows.find(r=>r.frame===frame.id&&r.difficulty===mode&&r.policy===policy);assert.ok(select('pilot','move').health>=select('pilot','shoot').health,'Movement should reduce incoming damage');assert.ok(select('pilot','punish').seconds<select('pilot','shoot').seconds,'Closing in should shorten the duel');assert.ok(select('ace','shoot').health<select('pilot','shoot').health,'ACE must provide more pressure');}
console.log(JSON.stringify({balance:'passed',note:'Deterministic input policies against the actual AI; not a human playtest.',rows},null,2));
