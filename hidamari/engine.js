(function(root){'use strict';
const N=7,copy=o=>JSON.parse(JSON.stringify(o)),stages=[{moves:18,goals:[14,14,0,0,0]},{moves:22,goals:[0,18,18,18,0]},{moves:24,goals:[14,14,14,14,14]}];
function rand(s,n){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return Math.floor(s.seed/4294967296*n);}
function matches(b){const runs=[];for(let axis=0;axis<2;axis++)for(let line=0;line<N;line++){let run=[];for(let k=0;k<=N;k++){const i=axis? k*N+line:line*N+k,c=k<N?b[i]?.c:-2;if(run.length&&c!==b[run[0]].c){if(run.length>=3)runs.push({ids:run,axis});run=[];}if(k<N&&c>=0)run.push(i);}}return runs;}
const adjacent=(a,b)=>Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&b>=0&&a<49&&b<49&&Math.abs(a%N-b%N)+Math.abs(Math.floor(a/N)-Math.floor(b/N))===1;
function legal(b,a,z){if(!adjacent(a,z))return false;if(b[a]?.s==='rainbow'||b[z]?.s==='rainbow')return true;const c=b.slice();[c[a],c[z]]=[c[z],c[a]];return matches(c).some(r=>r.ids.includes(a)||r.ids.includes(z));}
function moves(b){const out=[];for(let i=0;i<49;i++)for(const j of [i+1,i+N])if(adjacent(i,j)&&legal(b,i,j))out.push([i,j]);return out;}
function fresh(s){for(let attempt=0;attempt<200;attempt++){s.board=[];for(let i=0;i<49;i++){let c;do{c=rand(s,5);}while(i%7>=2&&s.board[i-1].c===c&&s.board[i-2].c===c||i>=14&&s.board[i-7].c===c&&s.board[i-14].c===c);s.board.push({c,s:null});}if(moves(s.board).length)return; }throw Error('board generation failed');}
function create(level=0,seed=Date.now(),free=false){if(!stages[level])throw Error('unknown stage');const s={version:1,level,seed:seed>>>0,moves:stages[level].moves,goals:stages[level].goals.slice(),score:0,phase:'play',board:[]};if(free){s.moves=0;s.free=true;s.round=1;s.totalMoves=0;s.bestChain=0;}fresh(s);return s;}
function reshuffle(s){const original=s.board.slice();for(let n=0;n<200;n++){s.board=original.slice();for(let i=48;i>0;i--){const j=rand(s,i+1);[s.board[i],s.board[j]]=[s.board[j],s.board[i]];}if(!matches(s.board).length&&moves(s.board).length)return;}fresh(s);}
function turn(state,a,z,chainBase=0){
 if(state.phase!=='play'||!legal(state.board,a,z))return null;
 const s=copy(state),frames=[],push=(kind,extra={})=>frames.push({kind,state:copy(s),...extra});if(s.free)s.totalMoves++;else s.moves--;[s.board[a],s.board[z]]=[s.board[z],s.board[a]];push('swap',{a,z});
 let forced=null,rainbowUsed=[];const one=s.board[a],two=s.board[z];if(one.s==='rainbow'||two.s==='rainbow'){rainbowUsed=[a,z].filter(i=>s.board[i].s==='rainbow');const c=one.s==='rainbow'?two.c:one.c;forced=s.board.map((p,i)=>p.c===c||i===a||i===z||one.s===two.s&&one.s==='rainbow'?i:-1).filter(i=>i>=0);}
 let chain=chainBase;
 for(let wave=0;wave<100;wave++){
  const runs=matches(s.board);if(!runs.length&&!forced)break;
  chain++;let groups=[];for(const run of runs){let g={ids:new Set(run.ids),runs:[run]};for(let i=groups.length-1;i>=0;i--)if([...g.ids].some(x=>groups[i].ids.has(x))){groups[i].ids.forEach(x=>g.ids.add(x));g.runs.push(...groups[i].runs);groups.splice(i,1);}groups.push(g);}
  const clear=new Set(forced||[]),created=new Map();forced=null;
  for(const g of groups){g.ids.forEach(i=>clear.add(i));let type=null;if(g.runs.some(r=>r.ids.length>=5))type='rainbow';else if(g.runs.length>1)type='bomb';else if(g.ids.size>=4)type=g.runs[0].axis?'column':'row';if(type){const ids=[...g.ids],anchor=wave===0&&ids.includes(z)?z:wave===0&&ids.includes(a)?a:ids[Math.floor(ids.length/2)];created.set(anchor,{c:type==='rainbow'?-1:s.board[anchor].c,s:type});}}
  const fired=new Set(wave===0?rainbowUsed:[]),effects=wave===0?rainbowUsed.map(i=>({i,type:'rainbow'})):[];let changed=true;while(changed){changed=false;for(const i of [...clear]){const p=s.board[i];if(!p?.s||fired.has(i))continue;fired.add(i);effects.push({i,type:p.s});let extra=[];
   if(p.s==='row')extra=Array.from({length:7},(_,x)=>Math.floor(i/7)*7+x);
   if(p.s==='column')extra=Array.from({length:7},(_,y)=>y*7+i%7);
   if(p.s==='bomb')for(let y=Math.max(0,Math.floor(i/7)-1);y<=Math.min(6,Math.floor(i/7)+1);y++)for(let x=Math.max(0,i%7-1);x<=Math.min(6,i%7+1);x++)extra.push(y*7+x);
   if(p.s==='rainbow'){const c=rand(s,5);extra=s.board.map((p,k)=>p.c===c?k:-1).filter(k=>k>=0);}
   for(const k of extra)if(!clear.has(k)){clear.add(k);changed=true;}
  }}
  created.forEach((_,i)=>clear.delete(i));
  const gains=Array(5).fill(0);for(const i of clear){const c=s.board[i]?.c;if(c>=0)gains[c]++;}for(let c=0;c<5;c++)s.goals[c]=Math.max(0,s.goals[c]-gains[c]);s.score+=clear.size*50*chain;if(s.free){s.bestChain=Math.max(s.bestChain,chain);if(s.goals.every(n=>!n)){s.round++;s.level=(s.level+1)%3;s.goals=stages[s.level].goals.slice();}}
  push('clear',{clear:[...clear],created:[...created.keys()],effects,chain,gains});for(const i of clear)s.board[i]=null;created.forEach((p,i)=>s.board[i]=p);
  const falling=[];for(let x=0;x<7;x++){let y=6;for(let old=6;old>=0;old--){const p=s.board[old*7+x];if(p){s.board[y*7+x]=p;falling.push({to:y*7+x,from:old});y--;}}for(let k=y;k>=0;k--){s.board[k*7+x]={c:rand(s,5),s:null};falling.push({to:k*7+x,from:k-y-1});}}
  push('drop',{falling});
  if(wave===99)throw Error('cascade limit');
 }
 s.phase=s.free?'play':s.goals.every(n=>!n)?'won':s.moves===0?'lost':'play';
 if(s.phase==='play'&&!moves(s.board).length){reshuffle(s);push('shuffle');}
 return {state:s,frames,chain};
}
function restore(s){try{s=copy(s);if(s.version!==1||!stages[s.level]||!Number.isInteger(s.seed)||s.seed<0||s.seed>4294967295||!Number.isInteger(s.moves)||s.moves<0||s.moves>stages[s.level].moves||!Number.isSafeInteger(s.score)||s.score<0||!Array.isArray(s.goals)||s.goals.length!==5||s.goals.some((g,i)=>!Number.isInteger(g)||g<0||g>stages[s.level].goals[i])||s.board?.length!==49||s.board.some(p=>!p||!Number.isInteger(p.c)||p.c< -1||p.c>4||![null,'row','column','bomb','rainbow'].includes(p.s)||(p.c===-1)!==(p.s==='rainbow'))||matches(s.board).length)return null;if(s.free&&(!Number.isSafeInteger(s.totalMoves)||s.totalMoves<0||!Number.isSafeInteger(s.round)||s.round<1||!Number.isSafeInteger(s.bestChain)||s.bestChain<0))return null;const phase=s.free?'play':s.goals.every(n=>!n)?'won':s.moves===0?'lost':'play';if(s.phase!==phase||s.phase==='play'&&!moves(s.board).length)return null;return s;}catch{return null;}}
const API={N,stages,copy,create,matches,moves,legal,turn,restore};if(typeof module!=='undefined')module.exports=API;else root.Hidamari=API;
})(typeof window!=='undefined'?window:globalThis);
