(()=>{'use strict';
const id=decodeURIComponent(location.pathname.split('/').pop()||'index.html'),isHome=id==='index.html'||id==='';
const nativePrint=window.print.bind(window);let processing=false;
const isDesktop=!!window.monDesktop;
const bar=document.createElement('nav');bar.className='mon-toolbar';
bar.innerHTML='<button type="button" id="mon-home">← Ana Menü</button><strong>MON Mühendislik</strong><span class="mon-version">4.1 • Çevrimdışı</span><span class="mon-spacer"></span>'+
 (isHome?'':'<button type="button" id="mon-pdf">PDF / Yazdır</button>')+
 '<span id="mon-output-status" role="status"></span>';
document.body.prepend(bar);
const status=document.getElementById('mon-output-status');
function show(s,error=false){if(!status)return;status.textContent=s;status.style.color=error?'#ffb2a9':'#caefdc';}
function go(file){if(window.monDesktop)return window.monDesktop.open(file);location.href=file;}
document.getElementById('mon-home').onclick=()=>go('index.html');
if(isHome)document.querySelectorAll('a[href$=".html"]').forEach(a=>a.addEventListener('click',e=>{if(window.monDesktop){e.preventDefault();go(a.getAttribute('href'));}}));
function validate(){
 const fields=[...document.querySelectorAll('input[type="number"]')].filter(e=>!e.disabled&&e.offsetParent!==null);
 for(let e of fields){if(e.value!==''&&(!Number.isFinite(+e.value)||!e.validity.valid)){e.reportValidity();e.focus();throw new Error('Geçersiz sayısal değeri düzeltin.');}}
 if(id.startsWith('05_')){
  for(let table of ['stocks','parts']){let rows=[...document.querySelectorAll('#'+table+' tr')],total=0;
   for(let row of rows){let inputs=row.querySelectorAll('input'),ns=[...inputs].slice(1).map(e=>Number(e.value));if(ns.some(n=>!Number.isFinite(n)||n<=0))throw new Error('Stok ve parça ölçüleri pozitif olmalı.');let q=ns[ns.length-1];if(!Number.isInteger(q))throw new Error('Adet tam sayı olmalı.');total+=q;}
   if(total>2000)throw new Error('Bir işlemde en fazla 2000 parça / stok plaka kullanın.');}
  let mats=new Set([...document.querySelectorAll('#stocks tr')].map(r=>{let a=r.querySelectorAll('input');return a[0].value.trim().toUpperCase()+'|'+Number(a[1].value)}));
  if(mats.size>1)throw new Error('Bu parça listesinde malzeme eşleştirmesi yok. Her malzeme / kalınlığı ayrı işlemde optimize edin.');
  if(+document.getElementById('gap').value<0||+document.getElementById('margin').value<0)throw new Error('Kesim aralığı ve kenar payı negatif olamaz.');
 }
}
function guarded(fn){return function(...args){try{validate();return fn.apply(this,args)}catch(e){show(e.message,true);alert(e.message);return false;}};}
for(let name of (id.startsWith('05_')?['optimize','recommendGlobal']:id.startsWith('02_')?['optimize']:id.startsWith('03_')?['design']:[])){if(typeof window[name]==='function')window[name]=guarded(window[name]);}
async function prepareExport(){
 if(isHome)return false;validate();
 if(id.startsWith('01_')&&typeof calculate==='function')calculate();
 if(id.startsWith('02_')){if(typeof optimize==='function')optimize();if(!document.querySelector('#plans .bar')&&!document.querySelector('#plans .group'))throw new Error('Önce kesim planını oluşturun.');if(typeof refreshProductionVisibility==='function')refreshProductionVisibility();}
 if(id.startsWith('03_')&&typeof design==='function')design();
 if(id.startsWith('04_')&&typeof ui==='function')ui();
 if(id.startsWith('05_')){if(typeof optimize==='function')optimize();if(Number(document.getElementById('mParts').textContent)<=0)throw new Error('Önce plaka yerleşim planını oluşturun.');}
 if(document.fonts&&document.fonts.ready)await document.fonts.ready;
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true;
}
async function output(){
 if(processing)return;processing=true;show('Çıktı hazırlanıyor…');
 try{
  if(!isDesktop){if(await prepareExport())nativePrint();show('Yazdırma / PDF ekranı açıldı.');return;}
  const result=await window.monDesktop.pdf();
  if(result.ok)show('PDF kaydedildi: '+result.path);else if(result.cancelled)show('İşlem iptal edildi.');else throw new Error(result.error||'Çıktı oluşturulamadı.');
 }catch(e){show(e.message,true);alert('Çıktı alınamadı: '+e.message);}finally{processing=false;}
}
window.MON={prepareExport,savePDF:output,print:output};
if(!isHome)document.getElementById('mon-pdf').onclick=output;

/* Electron masaüstünde eski çıktı düğmelerini native PDF'e yönlendir.
   Web / GitHub / Safari'de mevcut Mac ve iPhone/iPad düğmelerine DOKUNMA. */
if(isDesktop){
 window.print=()=>output();
 for(let b of document.querySelectorAll('button')){
  if(b.closest('.mon-toolbar'))continue;
  let t=b.textContent.trim();
  if(/PDF|Yazdır/i.test(t)){
   const clean=b.cloneNode(true);clean.textContent='PDF Kaydet';clean.removeAttribute('onclick');
   b.replaceWith(clean);clean.onclick=output;
  }
 }
}

/* GitHub Pages/PWA: ilk çevrimiçi açılıştan sonra dosyaları offline önbelleğe al. */
if(!isDesktop && 'serviceWorker' in navigator && location.protocol!=='file:'){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
})();