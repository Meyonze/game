import assert from 'node:assert/strict';
import * as T from '../neon-rift-duel/vendor/three.module.js';
import {MeshBVH} from 'three-mesh-bvh';
import {buildAkamaru} from './character.js';

// Inspect the generated mesh, not an assumed edge direction alone: the spine
// curves away from +X, and the +X edge tapers to zero thickness on both faces.
const specimen=buildAkamaru(),g=specimen.parts.blade.geometry,pos=g.attributes.position;
const crossSection=y=>{
 const points=[];for(let i=0;i<pos.count;i++)if(Math.abs(pos.getY(i)-y)<1e-5)points.push(new T.Vector3().fromBufferAttribute(pos,i));
 const spine=Math.min(...points.map(p=>p.x)),edge=Math.max(...points.map(p=>p.x));return{spine,edge,points};
};
const ys=[...new Set(Array.from({length:pos.count},(_,i)=>pos.getY(i)))].sort((a,b)=>a-b);
const base=crossSection(ys[0]),middle=crossSection(ys[Math.floor(ys.length*.6)]),tip=crossSection(ys.at(-1));
assert.ok(tip.spine<base.spine-.15,'The tip must curve toward the spine, not toward the cutting edge');
assert.ok(middle.edge-middle.spine>.10,'The blade must retain width before its tip');
for(const y of ys.slice(0,-1)){
 const section=crossSection(y),edgeVertices=section.points.filter(p=>Math.abs(p.x-section.edge)<1e-5);
 assert.ok(edgeVertices.every(p=>Math.abs(p.z)<1e-6),'Cutting edge must be the thin side');
 assert.ok(section.points.some(p=>p.x<section.edge&&Math.abs(p.z)>.0001),'Blade must retain a thicker spine/face');
}
// Reject collapsed triangles: they can invalidate surface intersection tests.
for(let i=0;i<g.index.count;i+=3){const a=new T.Vector3().fromBufferAttribute(pos,g.index.getX(i)),b=new T.Vector3().fromBufferAttribute(pos,g.index.getX(i+1)),c=new T.Vector3().fromBufferAttribute(pos,g.index.getX(i+2));assert.ok(b.sub(a).cross(c.sub(a)).lengthSq()>1e-16,'Blade triangles must have area');}

let checked=0;
for(const [fps,running]of [[60,false],[240,false],[240,true]]){
 const hero=buildAkamaru(),p=hero.parts,head=[],held=[];
 p.head.traverse(o=>{if(o.isMesh&&o.name!=='outline')head.push(o);});
 for(const root of[p.sword,p.handR,p.handL])root.traverse(o=>{if(o.isMesh&&o.name!=='outline')held.push(o);});
 for(const o of[...head,...held])o.geometry.boundsTree??=new MeshBVH(o.geometry);
 if(running)for(let i=0;i<77;i++)hero.update(1/60,{run:1});
 hero.update(0,{strike:true});
 for(let frame=0;frame<=fps*1.5;frame++){
  if(frame)hero.update(1/fps);
  for(const [hi,o]of head.entries())for(const [wi,w]of held.entries()){
   const relative=new T.Matrix4().copy(o.matrixWorld).invert().multiply(w.matrixWorld);
   assert.equal(o.geometry.boundsTree.intersectsGeometry(w.geometry,relative),false,`Head/weapon overlap at ${frame/fps}s, head ${hi}, held mesh ${wi}, running ${running}`);
  }
  checked++;
 }
}
console.log(JSON.stringify({blade:'passed',checkedPoses:checked,checks:['spine-side curvature','thin cutting edge','non-degenerate blade triangles','whole weapon and both gloves clear head/helmet throughout attack','run-to-attack clearance']},null,2));
