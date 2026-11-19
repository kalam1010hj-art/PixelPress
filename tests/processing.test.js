import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {PDFDocument} from 'pdf-lib';
import {processFiles} from '../src/process.js';
import {dimensions} from '../src/render.js';
import {tools} from '../src/catalog.js';

// Exercise the same main-thread path with real encoders on hosts without a browser.
globalThis.document={createElement:()=>{
 const surface=createCanvas(1,1);
 surface.convertToBlob=async({type,quality})=>new Blob([await surface.encode(type.split('/')[1],Math.round(quality*100))],{type});
 return surface;
}};
globalThis.FileReader=class{
 async readAsDataURL(blob){this.result='data:'+blob.type+';base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64');this.onload()}
};
const canvas=createCanvas(120,20),ctx=canvas.getContext('2d');
ctx.fillStyle='#008844';ctx.fillRect(60,0,60,20);
const settings={background:'#ffffff',quality:80,width:60,height:10,angle:90,flipX:true,area:{x:60,y:0,width:20,height:20},font:16,color:'#ffffff',text:'AZ',opacity:90,position:'top-left',page:'Custom',pageW:100,pageH:150,orientation:'landscape'};
for(const t of tools)test(t.name,async()=>{
 const type=t.id==='compress'?'image/jpeg':'image/png';
 const buffer=canvas.toBuffer(type),img=await loadImage(buffer),item={file:new File([buffer],'test',{type}),img};
 const out=await processFiles(t.id==='pdf'?[item,item]:[item],t.id,settings);
 assert.ok(out.blob.size>0);
 if(t.id==='pdf'){const pdf=await PDFDocument.load(await out.blob.arrayBuffer());assert.equal(pdf.getPageCount(),2);assert.ok(Math.abs(pdf.getPage(0).getWidth()-150*72/25.4)<0.01);return}
 if(t.id==='base64'){assert.deepEqual(Buffer.from(out.text.split(',')[1],'base64'),buffer);return}
 const decoded=await loadImage(Buffer.from(await out.blob.arrayBuffer()));
 const c=createCanvas(out.width,out.height),g=c.getContext('2d');g.drawImage(decoded,0,0);
 const pixel=[...g.getImageData(0,0,1,1).data];
 if(t.id==='png')assert.equal(pixel[3],0);
 if(t.id==='jpg')assert.ok(pixel[0]>240&&pixel[3]===255);
 if(t.id==='webp')assert.equal(out.blob.type,'image/webp');
 if(t.id==='resize')assert.deepEqual([decoded.width,decoded.height],[60,10]);
 if(t.id==='rotate')assert.deepEqual([decoded.width,decoded.height],[20,120]);
 if(t.id==='crop')assert.ok(decoded.width===20&&pixel[1]>100);
 if(t.id==='watermark')assert.ok(g.getImageData(0,0,50,20).data.some((v,i)=>i%4===3&&v>0));
 if(t.id==='compress')assert.equal(out.blob.type,type);
});
test('Reject excessive dimensions',()=>assert.throws(()=>dimensions(16384,16384)));
