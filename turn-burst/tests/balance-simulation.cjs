const {Game,dist}=require('../dist/engine.js');
const builds={blast:['blast','pulse','lance','cross','flame','arc','meteor','drone','frost'],marksman:['lance','cross','drone','meteor','blast','arc','frost','pulse','flame'],storm:['arc','drone','frost','lance','cross','meteor','blast','pulse','flame'],fire:['flame','pulse','meteor','blast','lance','cross','arc','drone','frost']};
function play(seed,build,policy='tactical',initialState=null){
 const g=initialState||new Game(seed),row={seed,build,policy},stageData=[];let bound=0,blocked=0;
 while(!['won','lost'].includes(g.phase)&&g.turn<650&&bound++<1400){
  if(g.phase==='rest'){stageData.push({sector:g.sector,turn:g.turn,hp:g.player.hp,level:g.level});g.nextSector();continue;}
  if(g.phase==='upgrade'){const p=g.player.hp<=4?['armor','overclock',...builds[build]]:['overclock',...builds[build],'armor'];const id=p.find(id=>g.offers.includes(id));if(!id||!g.choose(id)){throw Error('stuck upgrade');}continue;}
  const options=[];const boss=g.enemies.find(e=>e.type==='boss');
  for(let y=g.player.y-1;y<=g.player.y+1;y++)for(let x=g.player.x-1;x<=g.player.x+1;x++)if(g.canMove(x,y)){
   const p=g.preview(x,y);let v=p.kills*3+p.bossDamage*2-p.damage*(g.player.hp<=3?40:16)+p.heal*10;
   if(boss)v-=dist({x,y},boss)*.5;
   options.push({x,y,v});
  }
  options.sort((a,b)=>b.v-a.v);let m=options[0];
  if(policy==='still')m=options.find(m=>m.x===g.player.x&&m.y===g.player.y)||m;
  if(policy==='random')m=options[(g.turn*13+seed*37)%options.length];
  g.step(m.x,m.y);
 }
 return {...row,phase:g.phase,sector:g.sector,turn:g.turn,hp:g.player.hp,kills:g.kills,xp:g.experience,level:g.level,owned:g.ownedWeapons.map(u=>u.id),weapons:g.weapons,bosses:g.bossesDefeated,stageData};
}
if(require.main===module){
 const rows=[];
 for(const build of Object.keys(builds))for(let seed=1;seed<=5;seed++)rows.push(play(seed,build));
 for(const policy of ['still','random'])for(let seed=1;seed<=3;seed++)rows.push(play(seed,'blast',policy));
 require('fs').writeFileSync(require('path').join(__dirname,'../artifacts/balance-v5.json'),JSON.stringify(rows,null,2));
 for(const row of rows)console.log(JSON.stringify({...row,stageData:undefined,weapons:undefined}));
}
module.exports={play,builds};
