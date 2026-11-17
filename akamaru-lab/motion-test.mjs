import assert from 'node:assert/strict';import * as T from '../neon-rift-duel/vendor/three.module.js';import {buildAkamaru,STRIKE_DURATION} from './character.js';
const hero=buildAkamaru(),p=hero.parts,frames=[];let maxGripError=0,maxBladeJump=0,maxFootError=0,last=null;
hero.update(0);hero.update(0,{strike:true});
for(let i=0;i<=360;i++){
 const result=hero.update(i?1/240:0);const right=new T.Vector3(0,.13,0).applyMatrix4(p.sword.matrixWorld),left=new T.Vector3(0,-.29,0).applyMatrix4(p.sword.matrixWorld);
 for(const [hand,grip]of[[p.handR,right],[p.handL,left]])maxGripError=Math.max(maxGripError,hand.getWorldPosition(new T.Vector3()).distanceTo(grip));
 for(const foot of[p.footR,p.footL]){const up=new T.Vector3(0,1,0).applyQuaternion(foot.getWorldQuaternion(new T.Quaternion()));assert.ok(up.y>.999,'Feet should stay level during the cut');const y=foot.getWorldPosition(new T.Vector3()).y;assert.ok(y>=.279&&y<.35,'Step must not penetrate the ground');}
 const backFoot=p.footL.getWorldPosition(new T.Vector3());maxFootError=Math.max(maxFootError,backFoot.distanceTo(new T.Vector3(.39,.28,.02)));
 if(last)maxBladeJump=Math.max(maxBladeJump,result.tip.distanceTo(last));last=result.tip.clone();frames.push({...result,t:i/240,right,left,edge:new T.Vector3(1,0,0).applyQuaternion(p.sword.getWorldQuaternion(new T.Quaternion()))});
}
assert.ok(maxGripError<.001,'Both palms must stay attached to the same handle');assert.ok(maxFootError<.002,'Rear foot must remain planted');assert.ok(maxBladeJump<.14,'No per-frame wrist teleport or sudden reset');
const cut=frames.filter(f=>f.cutting);assert.ok(cut.length>=45);assert.ok(cut[0].tip.y-cut.at(-1).tip.y>2,'Blade must descend decisively');assert.ok(cut.every((f,i)=>i===0||f.tip.y<=cut[i-1].tip.y+.002),'One downward cut, no windmilling');
for(let i=2;i<cut.length-2;i++){const velocity=cut[i+1].tip.clone().sub(cut[i-1].tip).normalize();assert.ok(velocity.dot(cut[i].edge)>.65,'Cutting edge must lead the stroke, not the blade flat');}
const held=frames.filter(f=>f.t>=.65&&f.t<=.86);assert.ok(held.every(f=>f.tip.distanceTo(held[0].tip)<.002),'Follow-through should settle before recovery');assert.ok(frames.some(f=>f.phase==='残心'));hero.update(.02);assert.equal(hero.isStriking,false);assert.equal(hero.update(0).phase,'構え');
// Frame-rate changes and repeated strike input cannot restart an active cut.
for(const fps of[30,60,120]){const h=buildAkamaru();h.update(0,{strike:true});let duration=0;while(h.isStriking&&duration<2){h.update(1/fps,{strike:true});duration+=1/fps;}assert.ok(Math.abs(duration-STRIKE_DURATION)<.04);}
console.log(JSON.stringify({motion:'passed',maxGripError,maxFootError,maxBladeJump,checks:['two-hand grip throughout','level planted feet','single downward edge-leading stroke','settled follow-through','continuous recovery','frame-rate independent duration']},null,2));
