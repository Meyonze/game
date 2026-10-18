const test=require('node:test');
const assert=require('node:assert/strict');
const {Game,W,H,UPGRADES}=require('../dist/engine.js');

function empty(){const g=new Game(100);g.enemies=[];g.player={x:3,y:5,hp:8,maxHp:8,dx:0,dy:-1};g.spawnWave=()=>{};g.spawnMedkit=()=>{};return g;}
function choose(g){if(g.phase==='rest')g.nextSector();const order=g.player.hp<=4?['armor','blast','pulse','lance','cross','arc','meteor','drone','flame','frost']:['blast','pulse','lance','cross','arc','meteor','drone','flame','frost','armor'];while(g.phase==='upgrade')g.choose(order.find(id=>g.offers.includes(id)));}
function moves(g){const out=[];for(let y=g.player.y-1;y<=g.player.y+1;y++)for(let x=g.player.x-1;x<=g.player.x+1;x++)if(g.canMove(x,y))out.push({x,y,p:g.preview(x,y)});return out;}

test('first action visibly clears a group and only adjacent cells are legal',()=>{
  const g=new Game(1),state=JSON.stringify(g);assert.equal(g.step(0,0),false);assert.equal(JSON.stringify(g),state);
  const p=g.preview(3,4);assert(p.kills>=3);g.step(3,4);assert.equal(g.turn,1);assert.equal(g.lastKills,p.kills);
});
test('preview does not advance time, change RNG, or mutate any state',()=>{
  const g=new Game(20),before=JSON.stringify(g);
  for(let i=0;i<20;i++)moves(g);
  assert.equal(JSON.stringify(g),before);
});
test('preview predicts kills, boss damage and incoming damage throughout complete runs',()=>{
  for(let seed=1;seed<=8;seed++){
    const g=new Game(seed);
    for(let t=0;t<160&&g.phase==='play';t++){
      const options=moves(g);
      for(const m of options){
        const copy=g.clone();copy.step(m.x,m.y);
        assert.equal(copy.lastKills,m.p.kills);
        assert.equal(copy.events.filter(e=>e.type==='hurt').reduce((s,e)=>s+e.amount,0),m.p.damage);
        assert.equal(copy.events.filter(e=>e.type==='hit'&&e.boss).reduce((s,e)=>s+e.amount,0),m.p.bossDamage);
      }
      options.sort((a,b)=>(b.p.kills*3+b.p.bossDamage*2-b.p.damage*14+b.p.heal*9)-(a.p.kills*3+a.p.bossDamage*2-a.p.damage*14+a.p.heal*9));
      g.step(options[0].x,options[0].y);choose(g);
    }
  }
});
test('killing a threatening enemy cancels its scheduled attack',()=>{
  const g=empty(),e=g.addEnemy(3,4);e.intent={kind:'move',cells:[{x:3,y:5}],x:3,y:5};
  g.step(3,5);assert.equal(g.lastKills,1);assert.equal(g.player.hp,8);assert(!g.events.some(e=>e.type==='hurt'));
});
test('a surviving enemy hits its old telegraph, rather than retargeting the new player position',()=>{
  const g=empty(),e=g.addEnemy(0,0,'gunner');
  e.intent={kind:'shot',cells:[{x:3,y:5}]};g.step(4,5);assert.equal(g.player.hp,8);
  const h=empty(),f=h.addEnemy(0,0,'gunner');f.intent={kind:'shot',cells:[{x:3,y:5}]};h.step(3,5);assert.equal(h.player.hp,7);
});
test('chain explosions propagate outside the initial attack footprint',()=>{
  const g=empty();g.weapons.blast=1;
  [[3,3],[4,3],[5,3],[6,3],[6,2],[6,1]].forEach(([x,y])=>g.addEnemy(x,y));g.planEnemies();g.step(3,5);
  assert.equal(g.lastKills,6);assert.equal(g.events.filter(e=>e.type==='boom').length,6);
  assert(g.events.find(e=>e.type==='death'&&e.x===6&&e.y===1).depth>=3);
});
test('boss receives damage once per weapon area even though its body covers nine cells',()=>{
  const g=empty();g.weapons.pulse=2;g.addEnemy(3,2,'boss');g.planEnemies();g.step(3,4);
  const boss=g.enemies.find(e=>e.type==='boss');assert.equal(boss.hp,81,'2 from lance and 2 from pulse');
});
test('boss arrival leaves the player safe from overlap and preserves board occupancy invariants',()=>{
  for(let seed=1;seed<=15;seed++){
    const g=new Game(seed);
    while(g.turn<160&&g.phase==='play'){
      const options=moves(g).sort((a,b)=>(b.p.kills+b.p.bossDamage-b.p.damage*20)-(a.p.kills+a.p.bossDamage-a.p.damage*20));
      g.step(options[0].x,options[0].y);choose(g);
      const cells=new Set();
      for(const e of g.enemies){assert(e.x>=0&&e.x<W&&e.y>=0&&e.y<H);const size=e.type==='boss'?1:0;for(let dy=-size;dy<=size;dy++)for(let dx=-size;dx<=size;dx++){const k=`${e.x+dx},${e.y+dy}`;assert(!cells.has(k),`overlap at ${k}`);cells.add(k);}}
      if(g.bossSpawned)assert(!g.enemies.some(e=>e.type==='boss'&&g.enemyAt(e,g.player.x,g.player.y)));
    }
  }
});
test('earned upgrade choices pause combat, allow only offered upgrades, and preserve excess XP',()=>{
  const g=new Game(1);g.kills=28;g.checkUpgrade();assert.equal(g.phase,'upgrade');
  assert.equal(g.step(3,4),false);assert.equal(g.choose('armor'),false);
  g.choose('blast');assert.equal(g.phase,'upgrade');g.choose(g.offers[0]);assert.equal(g.phase,'upgrade');g.choose(g.offers[0]);assert.equal(g.phase,'play');assert.equal(g.level,3);
});
test('repair heals and maximum upgrade levels are respected',()=>{
  const g=new Game(2);g.player.hp=1;g.phase='upgrade';g.offers=['armor'];g.choose('armor');assert.equal(g.player.hp,10);assert.equal(g.player.maxHp,10);
  for(const u of UPGRADES)g.weapons[u.id]=u.max;g.kills=999;g.checkUpgrade();assert.equal(g.phase,'play');
});
test('victory cancels pending enemy attacks and cannot be advanced again',()=>{
  const g=empty();g.sectorIndex=4;const boss=g.addEnemy(3,2,'boss');boss.hp=1;g.player.hp=1;boss.intent={kind:'boss',cells:[{x:3,y:4}]};
  g.step(3,4);assert.equal(g.phase,'won');assert.equal(g.player.hp,1);assert.equal(g.step(3,5),false);
});
test('defeat stops further actions',()=>{
  const g=empty(),e=g.addEnemy(0,0,'gunner');g.player.hp=1;e.intent={kind:'shot',cells:[{x:3,y:5}]};
  g.step(3,5);assert.equal(g.phase,'lost');assert.equal(g.player.hp,0);assert.equal(g.step(3,4),false);
});
test('seeded tactical play can finish the campaign without a forced damage trap',()=>{
  for(let seed=1;seed<=20;seed++){
    const g=new Game(seed);
    while(g.turn<180&&g.phase==='play'){
      const options=moves(g).sort((a,b)=>(b.p.kills*3+b.p.bossDamage*2-b.p.damage*14+b.p.heal*9)-(a.p.kills*3+a.p.bossDamage*2-a.p.damage*14+a.p.heal*9));
      g.step(options[0].x,options[0].y);choose(g);
    }
    assert.equal(g.phase,'won',`seed ${seed}`);assert(g.turn>=65&&g.turn<140);assert(g.level>=12);assert.equal(g.bossesDefeated,3);assert.equal(g.clearedSectors,5);
  }
});
