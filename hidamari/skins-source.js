(function(root){'use strict';
const themes=[{id:'round-fruit',colors:['#ef6a6f','#f3a344','#b38bd1','#fff0a3','#91c765'],names:['さくらんぼ','みかん','ぶどう','レモン','メロン']}];
function paint(ctx,skin,p,x,y,r){ctx.save();ctx.translate(x,y);ctx.scale(r/25,r/25);ctx.lineJoin='round';ctx.lineCap='round';const ink=skin?'#3b3c37':'#68453b',color=themes[skin].colors[p.c];
function box(x,y,w,h,c,stroke=true,rad=0){ctx.beginPath();ctx.roundRect(x,y,w,h,rad);ctx.fillStyle=c;ctx.fill();if(stroke){ctx.strokeStyle=ink;ctx.lineWidth=1.8;ctx.stroke();}}
function oval(x,y,rx,ry,c,stroke=true){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,7);ctx.fillStyle=c;ctx.fill();if(stroke){ctx.strokeStyle=ink;ctx.lineWidth=1.6;ctx.stroke();}}
function line(x,y,xx,yy,c=ink,w=1.5){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();}
function poly(points,c,stroke=true){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=c;ctx.fill();if(stroke){ctx.strokeStyle=ink;ctx.lineWidth=1.6;ctx.stroke();}}
if(p.s==='rainbow'){for(let c=0;c<5;c++){ctx.fillStyle=themes[skin].colors[c];ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,25,c*Math.PI*2/5,(c+1)*Math.PI*2/5);ctx.closePath();ctx.fill();}ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,25,0,7);ctx.stroke();oval(0,0,7,7,'#fff6cf',false);}
else if(!skin){
// Round fruit with a heavy contour and a tiny face; five distinct silhouettes.
if(p.c===0){line(-1,-13,6,-29,'#57734c',2);line(14,-10,6,-29,'#57734c',2);oval(11,-26,8,3,'#79a557');oval(-10,5,14,16,'#ee6570');oval(12,7,14,16,'#f0787b');oval(-13,-2,3,4,'#ffb0af',false);}
if(p.c===1){oval(0,3,24,23,color);line(0,-22,1,-28,'#747149',2);oval(9,-23,10,4,'#80a65b');oval(-10,-8,4,6,'#ffd293',false);for(const [a,b] of [[-15,10],[15,7],[9,-11]])oval(a,b,.7,.7,'#d78b37',false);}
if(p.c===2){for(const [a,b] of [[-10,-9],[10,-9],[-15,7],[0,4],[15,7],[-8,20],[9,20]])oval(a,b,10,10,color);poly([[-3,-18],[-13,-28],[0,-31],[13,-25],[4,-17]],'#7eaa68');oval(-12,-12,2,3,'#d8c0ee',false);}
if(p.c===3){oval(0,3,25,21,color);oval(-23,1,3,4,color);oval(23,4,3,4,color);oval(7,-20,10,4,'#80aa5e');oval(-10,-7,4,5,'#fff19c',false);}
if(p.c===4){oval(0,2,25,25,color);ctx.strokeStyle='#618e4e';ctx.lineWidth=3;for(const dx of [-12,0,12]){ctx.beginPath();ctx.moveTo(dx*.6,-20);ctx.bezierCurveTo(dx-5,-7,dx-5,13,dx*.8,24);ctx.stroke();}line(0,-23,0,-29,'#70925d',3);}
const faceX=p.c===0?9:0,faceY=p.c===0?10:9;oval(faceX-5,faceY-2,2,2.6,ink,false);oval(faceX+5,faceY-2,2,2.6,ink,false);oval(faceX-5.6,faceY-3,.6,.8,'#fff9e5',false);oval(faceX+4.4,faceY-3,.6,.8,'#fff9e5',false);oval(faceX-10,faceY+2,2.6,1.4,'#eda19b',false);oval(faceX+10,faceY+2,2.6,1.4,'#eda19b',false);ctx.strokeStyle=ink;ctx.lineWidth=1;ctx.beginPath();ctx.arc(faceX,faceY+1,3,0,Math.PI);ctx.stroke();
}
if(p.s&&p.s!=='rainbow'){box(10,10,17,17,'#fff8da',true,3);if(p.s==='row')line(13,18,24,18);else if(p.s==='column')line(18,13,18,24);else oval(18,18,4,4,'#fff8da');}
ctx.restore();}
const API={themes,paint,icons:[]};if(typeof module!=='undefined')module.exports=API;else root.PuzzleSkins=API;
})(typeof window!=='undefined'?window:globalThis);
