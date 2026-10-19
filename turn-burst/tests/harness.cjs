const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
module.exports=function boot({width=362,height=480,reduced=false,realCanvas=false,noStorage=false,initialStorage=[]}={}){
  let clock=0,serial=1,depth=0,run=null,ctxCalls=0;
  const frames=new Map(),intervals=new Map(),docEvents={},windowEvents={},viewportEvents={},elements=new Map(),storage=new Map(initialStorage),audio=[];
  const nativeCanvas=realCanvas?require('@napi-rs/canvas').createCanvas(362,480):null;
  const state={globalAlpha:1},stack=[];
  const nativeCtx=nativeCanvas?.getContext('2d');
  const context=new Proxy(nativeCtx||state,{
    get(target,k){
      if(typeof target[k]!=='function'&&k in target)return target[k];
      return (...args)=>{
        ctxCalls++;
        for(const n of args)if(typeof n==='number')assert(Number.isFinite(n),`finite ${String(k)}`);
        if(k==='save'){depth++;if(!nativeCtx)stack.push({...state});}
        if(k==='restore'){depth--;assert(depth>=0);if(!nativeCtx)Object.assign(state,stack.pop());}
        if(nativeCtx)return nativeCtx[k](...args);
        if(k==='createRadialGradient')return{addColorStop(){}};
      };
    },set(target,k,value){target[k]=value;return true;}
  });
  const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
  for(const m of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)){
    const id=m[1],classes=new Set(),captures=new Set();
    const el={id,hidden:/\bhidden\b/.test(m[0]),textContent:'',innerHTML:'',attrs:{},style:{},events:{},offsetWidth:362,
      classList:{add(...xs){xs.forEach(x=>classes.add(x));},remove(...xs){xs.forEach(x=>classes.delete(x));},toggle(x,on){if(on===undefined)on=!classes.has(x);on?classes.add(x):classes.delete(x);},contains:x=>classes.has(x)},
      setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,v){this.events[k]=v;},
      setPointerCapture(id){captures.add(id);},releasePointerCapture(id){captures.delete(id);},hasPointerCapture:id=>captures.has(id),
      getContext:()=>context,
      getBoundingClientRect(){const w=this.id==='board'?(parseFloat(this.style.width)||width):width,h=this.id==='board'?(parseFloat(this.style.height)||height):height;return{left:20+(width-w)/2,top:150+(height-h)/2,width:w,height:h};}
    };
    for(const k of ['width','height'])Object.defineProperty(el,k,{set(value){if(nativeCanvas)nativeCanvas[k]=value;},get(){return nativeCanvas?nativeCanvas[k]:k==='width'?width:height;}});
    elements.set(id,el);
  }
  class AudioMock{
    constructor(){this.state='suspended';this.destination={};this.oscillators=[];audio.push(this);}
    get currentTime(){return clock/1000;}
    resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}
    createBuffer(channels,length,rate){return {sampleRate:rate,length,getChannelData:()=>new Float32Array(length)};}
    get sampleRate(){return 22050;}
    createBufferSource(){return this.createOscillator();}
    createBiquadFilter(){return {type:'lowpass',frequency:{value:0},Q:{value:0},connect(){},disconnect(){}};}
    createStereoPanner(){return {pan:{value:0},connect(){},disconnect(){}};}
    createDelay(){return {delayTime:{value:0,setValueAtTime(v){assert(v>=0);}},connect(){},disconnect(){}};}
    createDynamicsCompressor(){return {threshold:{},knee:{},ratio:{},attack:{},release:{},connect(){},disconnect(){}};}
    createGain(){return{gain:{value:1,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(v){assert(v>0);}},connect(){},disconnect(){}};}
    createOscillator(){const o={frequency:{setValueAtTime(v){assert(v>0);},linearRampToValueAtTime(v){assert(v>0);},exponentialRampToValueAtTime(v){assert(v>0);}},connect(){},disconnect(){o.disconnected=true;},start(t){o.startAt=t;},stop(t){o.stopAt=t;assert(Number.isFinite(t)&&t>=0);}};this.oscillators.push(o);return o;}
  }
  const doc={hidden:false,getElementById:id=>elements.get(id),addEventListener:(k,f)=>docEvents[k]=f};
  class FakeDate extends Date{static now(){return 100;}}
  const sandbox={document:doc,window:{devicePixelRatio:1,matchMedia:()=>({matches:reduced}),AudioContext:AudioMock,addEventListener:(k,f)=>windowEvents[k]=f,visualViewport:{addEventListener:(k,f)=>viewportEvents[k]=f}},console,Date:FakeDate,performance:{now:()=>clock},localStorage:{getItem(k){if(noStorage)throw Error('blocked');return storage.get(k)||null;},setItem(k,v){if(noStorage)throw Error('blocked');storage.set(k,v);}},ResizeObserver:class{constructor(f){this.f=f;}observe(){}},requestAnimationFrame:f=>{const id=serial++;frames.set(id,f);return id;},setInterval:(f,ms)=>{const id=serial++;intervals.set(id,{f,ms,next:clock+ms});return id;},clearInterval:id=>intervals.delete(id)};
  const vmContext=vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root,'dist/engine.js'),'utf8'),vmContext);
  const Base=sandbox.window.TurnBurst.Game;
  sandbox.window.TurnBurst.Game=class extends Base{constructor(...args){super(...args);run=this;}};
  vm.runInContext(fs.readFileSync(path.join(root,'dist/music.js'),'utf8'),vmContext);
  vm.runInContext(fs.readFileSync(path.join(root,'dist/app.js'),'utf8'),vmContext);
  const $=id=>elements.get(id);
  function tick(ms=16){clock+=ms;for(const i of intervals.values())if(clock>=i.next){i.next=clock+i.ms;i.f();}const jobs=[...frames.values()];frames.clear();jobs.forEach(f=>f(clock));assert.equal(depth,0,'balanced canvas saves');for(const a of audio)for(const o of a.oscillators)if(!o.ended&&o.stopAt<=a.currentTime){o.ended=true;o.onended?.();}}
  function event(x,y,extra={}){const r=$('board').getBoundingClientRect();return{pointerId:1,pointerType:'touch',clientX:r.left+(x+.5)*r.width/7,clientY:r.top+(y+.5)*r.height/9,preventDefault(){},...extra};}
  const api={$,doc,docEvents,windowEvents,storage,audio,intervals,tick,get game(){return run;},get calls(){return ctxCalls;},debug:()=>sandbox.window.turnBurstDebug(),click:id=>$(id).events.click({}),down:(x,y,extra)=>$('board').events.pointerdown(event(x,y,extra)),move:(x,y,extra)=>$('board').events.pointermove(event(x,y,extra)),up:(x,y,extra)=>$('board').events.pointerup(event(x,y,extra)),cancel:()=>$('board').events.pointercancel({}),key:key=>docEvents.keydown({key,preventDefault(){}}),choose(id){api.tick(550);api.choiceDown(id);api.choiceUp(id);api.choiceClick(id);},resize(w,h){width=w;height=h;windowEvents.resize();},save(file){fs.writeFileSync(file,nativeCanvas.toBuffer('image/png'));}};
  const choiceEvent=(id,extra={})=>({target:{closest:()=>({dataset:{upgrade:id}})},pointerId:1,isPrimary:true,button:0,detail:1,preventDefault(){},...extra});
  api.choiceDown=(id,extra)=>$('choices').events.pointerdown(choiceEvent(id,extra));
  api.choiceUp=(id,extra)=>$('choices').events.pointerup(choiceEvent(id,extra));
  api.choiceClick=(id,extra)=>$('choices').events.click(choiceEvent(id,extra));
  api.choiceCancel=(extra={})=>$('choices').events.pointercancel({pointerId:1,...extra});
  api.tap=(x,y)=>{api.down(x,y);api.up(x,y);};
  return api;
};
