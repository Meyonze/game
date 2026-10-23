const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),E=require('../dist/engine.js'),boot=require('./harness.cjs');
const runs=JSON.parse(fs.readFileSync(path.join(__dirname,'../artifacts/campaign-simulation.json'),'utf8'));
for(const run of runs)test('mission '+(run.mission+1)+' has a legal clear and exact per-turn damage forecasts',()=>{
  let s=E.create(run.mission);for(const orders of run.trace){const initial=JSON.stringify(s),f=E.forecast(s,orders),r=E.resolve(s,orders);assert.equal(JSON.stringify(s),initial);assert.deepEqual(f.damage,r.damage);assert.equal(f.state.phase,r.state.phase);assert.equal(f.kills,r.kills);assert(E.restore(E.save(r.state)));s=r.state;}
  assert.equal(s.phase,'won');assert(s.units.every(u=>u.hp>0));assert(s.objective.hp>0);assert.equal(s.round,run.round);
});
test('a full six-mission campaign is playable through taps, results, next missions and saved records',()=>{
  const h=boot();h.click('start');h.click('deploy');
  for(const run of runs){
    for(const orders of run.trace){
      for(const order of orders){h.click('unit-'+order.unitId);h.tap(order.x,order.y);if(order.skill==='guard')h.click('skill-guard');else{
        h.click('skill-'+order.skill);const s=E.playerPlan(h.debug().state,h.debug().orders).state,target=s.enemies.find(e=>e.id===order.targetId);h.tap(target.x,target.y);
      }}
      assert.deepEqual(JSON.parse(JSON.stringify(h.debug().orders)).map(o=>{if(o.targetId===null)delete o.targetId;return o;}),orders);h.click('commit');for(let i=0;i<100&&h.debug().busy;i++)h.tick(200);assert(!h.debug().busy);
    }
    assert.equal(h.debug().state.phase,'won');assert(!h.$('result-screen').hidden);if(run.mission<5){h.click('next');assert(!h.$('brief-screen').hidden);h.click('deploy');}
  }
  assert(h.$('result-title').textContent.includes('空を繋いだ'));assert(h.$('next').hidden);const save=JSON.parse(h.storage.get('aether-pair-save-v1'));assert.equal(Object.keys(save.records).length,6);assert.equal(save.run.state.phase,'won');assert(h.calls>100000);
});
