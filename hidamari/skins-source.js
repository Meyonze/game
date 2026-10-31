(function(root){'use strict';
const themes=[{id:'round-fruit',colors:['#ef6a6f','#f3a344','#b38bd1','#f0d55c','#91c765'],names:['さくらんぼ','みかん','ぶどう','レモン','メロン']},{id:'block-animals',colors:['#ffdb25','#259fdf','#c35449','#ffffff','#30b76b'],names:['ライオン','ゾウ','レッサーパンダ','パンダ','ワニ']}];
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
else{
// Rounded animal blocks, with distinct ears, masks and a side-profile crocodile.
if(p.c===0){box(-26,-25,52,50,'#de9816',true,10);oval(-17,-17,7,7,color);oval(17,-17,7,7,color);box(-20,-19,40,39,color,true,8);box(-8,5,16,12,'#fff0a4',false,6);poly([[-4,2],[4,2],[0,7]],ink,false);}
if(p.c===1){box(-27,-17,15,32,'#197fb5',true,7);box(12,-17,15,32,'#197fb5',true,7);box(-18,-24,36,44,color,true,8);box(-6,3,12,24,color,true,5);box(-3,20,6,5,'#a5e0e5',false,2);poly([[-15,2],[-8,7],[-13,13]],'#fff2cf');poly([[15,2],[8,7],[13,13]],'#fff2cf');}
if(p.c===2){oval(-16,-22,8,9,'#fff2d9');oval(16,-22,8,9,'#fff2d9');oval(-16,-22,4.5,5.5,'#9d5346',false);oval(16,-22,4.5,5.5,'#9d5346',false);box(-23,-19,46,43,color,true,14);poly([[-6,-17],[0,-23],[3,-17],[9,-21],[10,-15]],color,false);oval(-10,-6,5.5,3,'#fff1d4',false);oval(10,-6,5.5,3,'#fff1d4',false);oval(-16,10,6.5,7,'#fff1d4',false);oval(16,10,6.5,7,'#fff1d4',false);oval(0,13,10,7,'#fff1d4',false);oval(0,8,3.2,2.2,ink,false);line(0,10,0,12,ink,1);ctx.strokeStyle=ink;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-4,13);ctx.quadraticCurveTo(0,17,4,13);ctx.stroke();}

if(p.c===3){oval(-17,-22,9,8,'#27323e');oval(17,-22,9,8,'#27323e');box(-24,-19,48,43,color,true,11);oval(-10,-4,7,9,'#27323e',false);oval(10,-4,7,9,'#27323e',false);poly([[-4,9],[4,9],[0,14]],ink,false);}
if(p.c===4){box(-26,-17,34,40,color,true,9);poly([[-23,-17],[-18,-25],[-13,-17]],'#23975a');box(-9,-5,36,28,color,true,8);box(-7,11,31,10,'#91e0af',false,4);oval(-14,-11,5,7,'#fff7dc');oval(-13,-10,1.8,3,ink,false);oval(18,1,1.5,1.2,'#176d43',false);oval(23,1,1.2,1,'#176d43',false);ctx.strokeStyle=ink;ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-14,8);ctx.quadraticCurveTo(7,15,25,9);ctx.stroke();for(const x of [-2,11])poly([[x,10],[x+6,10],[x+3,17]],'#fff9de');poly([[18,10],[23,10],[21,5]],'#fff9de');}
if(p.c!==4){const eyeY=p.c===2?1:-4;for(const dx of [-9,9]){if(p.c===3){oval(dx,eyeY,3,3.7,'#fff8df',false);oval(dx+.3,eyeY+.6,1.3,2,ink,false);oval(dx-.5,eyeY-1,.7,.8,'#fff',false);}else{oval(dx,eyeY,2.7,3.5,ink,false);oval(dx-.8,eyeY-1.3,.9,1,'#fff7e6',false);}}
const blush=p.c===1?'#edb0ab':p.c===2?'#e88f86':'#efb398';oval(-15,p.c===2?7:4,3,1.6,blush,false);oval(15,p.c===2?7:4,3,1.6,blush,false);
if(p.c===0||p.c===3){ctx.strokeStyle=ink;ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(-4,14);ctx.quadraticCurveTo(0,18,4,14);ctx.stroke();}}


}
if(p.s&&p.s!=='rainbow'){box(10,10,17,17,'#fff8da',true,3);if(p.s==='row')line(13,18,24,18);else if(p.s==='column')line(18,13,18,24);else oval(18,18,4,4,'#fff8da');}
ctx.restore();}
const API={themes,paint,icons:[]};if(typeof module!=='undefined')module.exports=API;else root.PuzzleSkins=API;
})(typeof window!=='undefined'?window:globalThis);
