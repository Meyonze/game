const E=require('./engine.js'),boot=require('./harness.cjs'),assert=require('node:assert/strict'),plain=o=>JSON.parse(JSON.stringify(o));
const s=E.create(0,23,true),h=boot({realCanvas:true,initialStorage:[['hidamari-free-v1',JSON.stringify(s)]]});h.click('primary');
function resolveFirst(result){const index=result.frames.findIndex(f=>f.kind==='clear'),next=index+2;return result.frames.slice(next).some(f=>f.kind==='clear')?result.frames[index+1].state:result.state;}
// One hundred swaps without advancing a single animation frame. No queued/rejected valid moves.
for(let n=0;n<100;n++){const d=h.debug(),base=d.state,[a,b]=E.moves(base.board)[0],expected=resolveFirst(E.turn(base,a,b,d.chain));h.down(a%7,Math.floor(a/7));h.up(b%7,Math.floor(b/7));assert.equal(h.debug().state.totalMoves,n+1);assert.deepEqual(plain(h.debug().state),expected);assert.equal(h.debug().movable.length,49);assert(!h.debug().modal);assert(h.debug().chain>=n+1);}
h.tick(16);h.save('live.png');
// Every cell remains selectable even with pending automatic cascades and active clear effects.
for(let i=0;i<49;i++){h.tap(i%7,Math.floor(i/7));assert.equal(h.debug().selected,i);h.tap(i%7,Math.floor(i/7));assert.equal(h.debug().selected,null);}
// A finger held through the cascade deadline is not cancelled; board stays under it.
const d=h.debug(),[a,b]=E.moves(d.state.board)[0];h.down(a%7,Math.floor(a/7));h.tick(1000);assert.deepEqual(plain(h.debug().state),plain(d.state));h.up(b%7,Math.floor(b/7));assert.equal(h.debug().state.totalMoves,101);
for(let i=0;i<150&&h.debug().busy;i++)h.tick(300);assert(!h.debug().busy);assert(E.restore(h.debug().state));const b2=boot({initialStorage:[...h.storage]});b2.click('primary');assert.deepEqual(plain(b2.debug().state),plain(h.debug().state));
// Invalid swaps never block further input or change accounting.
const q=h.debug().state;let bad;for(let i=0;i<48;i++)if(i%7<6&&!E.legal(q.board,i,i+1))bad=[i,i+1];for(const i of bad)h.tap(i%7,Math.floor(i/7));assert.equal(h.debug().state.totalMoves,101);assert.equal(h.debug().movable.length,49);
console.log('100 swaps without animation ticks; all 49 cells accessible; held gestures, pending cascades, exact accounting and resume passed.');
