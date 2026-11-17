import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {Actor} from '../visuals.js';
import {FRAMES,newUnit} from '../combat.mjs';
globalThis.self=globalThis;
export async function parseFrame(frame){const data=fs.readFileSync(new URL('../'+frame.file.replace('./',''),import.meta.url));const loader=new GLTFLoader();loader.register(()=>({name:'NodeTextureStub',loadTexture:()=>Promise.resolve(new T.Texture())}));return loader.parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');}
const report=[];
for(const frame of FRAMES){const gltf=await parseFrame(frame),scene=new T.Scene(),actor=new Actor(gltf,frame,scene),u=newUnit(frame,0);u.x=u.z=0;u.yaw=0;assert.ok(actor.muzzle,'Muzzle attachment must resolve');assert.ok(actor.sword,'Hand/sword attachment must resolve');assert.ok(actor.fireAction?.getClip().tracks.length>0,'Ranged upper-body animation must have tracks');let meshes=0,triangles=0;actor.model.traverse(m=>{if(m.isMesh){meshes++;triangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;}});
 const modes=[['idle',{}],['run',{vx:7}],['attack',{attack:.82}],['guard',{guard:true}],['hit',{stagger:.4}],['jump',{air:true}],['death',{dead:true}]];
 for(const [name,settings]of modes){actor.reset();Object.assign(u,newUnit(frame,0),{x:0,z:0,yaw:0},settings);for(let i=0;i<60;i++){if(name==='attack')u.attack=Math.max(0,.82-i/60);if(name==='jump')u.y=Math.sin(i/60*Math.PI)*1.5;actor.update(u,1/60,i/60);actor.model.traverse(m=>{assert.ok(m.matrixWorld.elements.every(Number.isFinite),'Non-finite matrix: '+m.name);if(m.isSkinnedMesh)m.skeleton.update();});}
 const p=actor.muzzlePosition();assert.ok(p.toArray().every(Number.isFinite));assert.ok(p.distanceTo(actor.root.position)<14,'Muzzle outside plausible frame bounds in '+name);
 }
 actor.reset();Object.assign(u,newUnit(frame,0),{x:0,z:0,yaw:0});actor.update(u,.016,0);let minY=Infinity,maxY=-Infinity;actor.model.traverse(m=>{if(m.isSkinnedMesh){m.computeBoundingBox();const b=m.boundingBox.clone().applyMatrix4(m.matrixWorld);minY=Math.min(minY,b.min.y);maxY=Math.max(maxY,b.max.y);}});assert.ok(minY>-.7&&minY<1.5,'Idle frame must be on the floor');assert.ok(maxY>3&&maxY<9,'Frame must have expected human-scale height');
 report.push({frame:frame.id,clips:gltf.animations.length,meshes,triangles,fireTracks:actor.fireAction.getClip().tracks.length,bladeTipLength:actor.tipLocal.length()*actor.scale,idleBounds:[+minY.toFixed(2),+maxY.toFixed(2)],muzzle:actor.muzzle.name,states:modes.map(m=>m[0])});
}
console.log(JSON.stringify({models:'passed',report},null,2));
