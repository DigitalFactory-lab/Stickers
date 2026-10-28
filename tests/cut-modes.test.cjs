const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '..');
const htmlPath = fs.existsSync(path.join(root, 'dist/index.html')) ? path.join(root, 'dist/index.html') : path.join(root, 'index.html');
const code = fs.readFileSync(htmlPath, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];

function app({width = 1200, height = 600, mode = 'file', transparent = false, size = 80} = {}) {
  const elements = new Map();
  const el = id => {
    if (!elements.has(id)) elements.set(id, {
      value: '', textContent: '', innerHTML: '', hidden: false, disabled: false,
      width: 600, height: 600, listeners: {}, classList: {add(){},remove(){}},
      addEventListener(type, fn) { this.listeners[type] = fn; },
      getContext() { return {clearRect(){},fillRect(){},drawImage(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},stroke(){}}; }
    });
    return elements.get(id);
  };
  Object.entries({maxSize:size,bleedMm:-1,marginMm:5,cutMode:mode}).forEach(([id,v]) => el(id).value = String(v));
  const context = vm.createContext({console, Uint8Array, Math, Map, Set, setTimeout, pako:{deflate:bytes=>zlib.deflateSync(bytes)}, document:{
    getElementById:el,
    createElement(type) {
      assert.equal(type, 'canvas');
      const canvas = {width:0,height:0};
      canvas.getContext = () => ({clearRect(){},drawImage(){},getImageData(){
        const data = new Uint8Array(canvas.width * canvas.height * 4);
        for (let y=0;y<canvas.height;y++) for (let x=0;x<canvas.width;x++) {
          const i=(y*canvas.width+x)*4;
          data[i]=170; data[i+1]=90; data[i+2]=20;
          data[i+3]=!transparent || (x>=canvas.width*.2 && x<canvas.width*.8 && y>=canvas.height*.2 && y<canvas.height*.8) ? 255 : 0;
        }
        return {data};
      }});
      return canvas;
    }
  }});
  vm.runInContext(code, context);
  vm.runInContext(`loadedImage = {width:${width},height:${height}}`, context);
  return {el, context, run:()=>vm.runInContext('runPipeline(); lastResult',context)};
}
function span(poly, axis) { const values=poly.map(p=>p[axis]); return Math.max(...values)-Math.min(...values); }

test('opaque landscape image: exact four-edge cut, original proportions and RGB retained', () => {
  const a=app(); const r=a.run();
  assert.equal(r.cutForPdf.length,1); assert.equal(r.cutForPdf[0].length,4);
  assert.equal(span(r.cutForPdf[0],'x'),80); assert.equal(span(r.cutForPdf[0],'y'),40);
  assert.equal(r.imageSizeMm.w,80); assert.equal(r.imageSizeMm.h,40);
  assert.equal(r.cutForPdf[0][0].x,r.imageOffsetMm.x);
  assert.equal(r.cutForPdf[0][0].y,r.imageOffsetMm.y);
  assert.equal(span(r.perfForPdf[0],'x'),90); assert.equal(span(r.perfForPdf[0],'y'),50);
  assert.equal(r.pageWmm,96); assert.equal(r.pageHmm,56);
  assert.deepEqual(Array.from(r.rgbBuf.slice(0,3)),[170,90,20]);
  assert.ok(r.alphaBuf.every(a=>a===255)); assert.equal(a.el('downloadBtn').disabled,false);
});
test('portrait image retains its orientation and proportions', () => {
  const r=app({width:600,height:1200}).run();
  assert.equal(span(r.cutForPdf[0],'x'),40); assert.equal(span(r.cutForPdf[0],'y'),80);
});
test('square file with transparency still gets a square file cut and keeps alpha', () => {
  const a=app({width:500,height:500,transparent:true}); const r=a.run();
  assert.equal(span(r.cutForPdf[0],'x'),80); assert.equal(span(r.cutForPdf[0],'y'),80);
  assert.ok(r.alphaBuf.includes(0)); assert.ok(r.alphaBuf.includes(255));
  assert.match(a.el('meta').innerHTML,/Carré/);
});
test('file cut ignores subject inset, even when inset would erase the subject', () => {
  const a=app({size:5}); a.el('bleedMm').value='-10'; const r=a.run();
  assert.equal(span(r.cutForPdf[0],'x'),5); assert.equal(span(r.cutForPdf[0],'y'),2.5);
});
test('very narrow file never creates a zero-pixel canvas', () => {
  const r=app({width:10000,height:1}).run();
  assert.equal(r.workH,1); assert.ok(Math.abs(span(r.cutForPdf[0],'y')-.008)<1e-9);
});
test('subject mode still rejects an opaque image with an actionable message', () => {
  const a=app({mode:'subject'}); assert.equal(a.run(),null);
  assert.match(a.el('status').textContent,/Découpe du fichier/);
});
test('subject mode follows the alpha silhouette rather than the file bounds', () => {
  const a=app({mode:'subject',width:100,height:100,transparent:true,size:5});
  a.el('bleedMm').value='0'; const r=a.run();
  assert.equal(span(r.cutForPdf[0],'x'),3); assert.equal(span(r.cutForPdf[0],'y'),3);
});
test('changing mode invalidates export and hides irrelevant inset settings', () => {
  const a=app(); a.run(); a.el('cutMode').listeners.change();
  assert.equal(a.el('cutOffsetField').hidden,true); assert.equal(a.el('bleedMm').disabled,true);
  assert.equal(a.el('downloadBtn').disabled,true); assert.equal(vm.runInContext('lastResult',a.context),null);
  a.el('cutMode').value='subject'; a.el('cutMode').listeners.change();
  assert.equal(a.el('cutOffsetField').hidden,false); assert.equal(a.el('bleedMm').disabled,false);
});
test('rectangle export retains both PDF spot-color separations and a closed four-point path', () => {
  const a=app(); a.run();
  const bytes=vm.runInContext(`buildPrintCutPDF({pageWidthMm:lastResult.pageWmm,pageHeightMm:lastResult.pageHmm,
    imagePxWidth:lastResult.workW,imagePxHeight:lastResult.workH,imageOffsetMm:lastResult.imageOffsetMm,
    imageSizeMm:lastResult.imageSizeMm,rgbBuffer:lastResult.rgbBuf,alphaBuffer:lastResult.alphaBuf,
    cutContourPolysMm:lastResult.cutForPdf,perfCutContourPolysMm:lastResult.perfForPdf})`,a.context);
  const pdf=Buffer.from(bytes).toString('latin1');
  assert.match(pdf,/%PDF-1.4/); assert.match(pdf,/\/Separation \/CutContour/); assert.match(pdf,/\/Separation \/PerfCutContour/);
  assert.match(pdf,/22\.68 136\.06 m\n249\.45 136\.06 l\n249\.45 22\.68 l\n22\.68 22\.68 l\nh\nS/);
});
