/* Offline 2D DXF contours for nesting. Curves are sampled for preview/placement,
   with 0.05 mm chord tolerance. This does not emit machine cutting paths. */
function parseDXFText(text,name){
 const pairs=dxfPairs(text),entities=[];let sec='',unit=0;
 for(let i=0;i<pairs.length;){
  const [code,value]=pairs[i];
  if(code==='9'&&value==='$INSUNITS'&&pairs[i+1]?.[0]==='70')unit=+pairs[i+1][1];
  if(code==='0'&&value==='SECTION'){sec=pairs[i+1]?.[1]||'';i+=2;continue;}
  if(code==='0'&&value==='ENDSEC'){sec='';i++;continue;}
  if(sec==='ENTITIES'&&code==='0'){let data=[];i++;while(i<pairs.length&&pairs[i][0]!=='0')data.push(pairs[i++]);entities.push({type:value,data});}else i++;
 }
 const factors={0:1,1:25.4,2:304.8,4:1,5:10,6:1000};
 if(!(unit in factors))throw new Error('DXF birimi desteklenmiyor; mm olarak dışa aktarın.');
 const factor=factors[unit],segments=[],loops=[];let poly=null;
 const val=(d,n,def=0)=>{let p=d.find(x=>x[0]===String(n));return p?Number(p[1]):def;};
 const near=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<.001;
 function arc(cx,cy,r,start,sweep){
  if(!Number.isFinite(r)||r<=0)throw new Error('Geçersiz yay yarıçapı.');
  let step=2*Math.acos(Math.max(-1,1-Math.min(.05,r)/r));let n=Math.max(2,Math.ceil(Math.abs(sweep)/Math.min(step,Math.PI/18)));
  if(n>5000)throw new Error('DXF yay çözünürlüğü sınırı aşıldı.');
  return Array.from({length:n+1},(_,i)=>[cx+r*Math.cos(start+sweep*i/n),cy+r*Math.sin(start+sweep*i/n)]);
 }
 function expand(v,closed){
  let result=[];for(let i=0;i<v.length-(closed?0:1);i++){
   let a=v[i],b=v[(i+1)%v.length],bulge=a[2]||0;result.push(a.slice(0,2));
   if(Math.abs(bulge)>1e-10){let dx=b[0]-a[0],dy=b[1]-a[1],chord=Math.hypot(dx,dy);if(chord<1e-9)throw new Error('Sıfır boylu bulge segmenti.');let cx=(a[0]+b[0])/2-dy*(1-bulge*bulge)/(4*bulge),cy=(a[1]+b[1])/2+dx*(1-bulge*bulge)/(4*bulge);let pp=arc(cx,cy,Math.hypot(a[0]-cx,a[1]-cy),Math.atan2(a[1]-cy,a[0]-cx),4*Math.atan(bulge));result.push(...pp.slice(1,-1));}
  }
  if(!closed)result.push(v[v.length-1].slice(0,2));return result;
 }
 function polyline(vertices,closed){
  if(vertices.length<2)return;let pts=expand(vertices,closed);
  if(closed)loops.push({pts});else segments.push(pts);
 }
 for(const {type,data:d} of entities){
  if(entities.length>10000)throw new Error('10.000 öğe sınırı aşıldı.');
  if(['TEXT','MTEXT','DIMENSION','HATCH','POINT','LEADER','MLEADER','SOLID','VIEWPORT'].includes(type))continue;
  if(['INSERT','SPLINE','ELLIPSE','3DFACE','REGION','BODY','3DSOLID'].includes(type))throw new Error(type+' desteklenmiyor; CAD uygulamasında 2B LINE/ARC olarak dışa aktarın.');
  if(type==='POLYLINE'){poly={vertices:[],closed:!!(val(d,70)&1)};if(val(d,70)&(8|16|64))throw new Error('3B POLYLINE desteklenmiyor.');continue;}
  if(type==='VERTEX'&&poly){poly.vertices.push([val(d,10)*factor,val(d,20)*factor,val(d,42)]);if(Math.abs(val(d,30))>.00001)throw new Error('DXF XY düzleminde değil.');continue;}
  if(type==='SEQEND'&&poly){polyline(poly.vertices,poly.closed);poly=null;continue;}
  if(!['LINE','ARC','CIRCLE','LWPOLYLINE'].includes(type))continue;
  if(Math.abs(val(d,30))+Math.abs(val(d,31))+Math.abs(val(d,38))>.00001||val(d,210)!==0||val(d,220)!==0||val(d,230,1)!==1)throw new Error('DXF XY düzleminde değil.');
  if(type==='LINE')segments.push([[val(d,10)*factor,val(d,20)*factor],[val(d,11)*factor,val(d,21)*factor]]);
  if(type==='ARC'){let a=val(d,50)*Math.PI/180,s=((val(d,51)-val(d,50))%360+360)%360*Math.PI/180;if(s<1e-9)throw new Error('Sıfır açılı ARC.');segments.push(arc(val(d,10)*factor,val(d,20)*factor,val(d,40)*factor,a,s));}
  if(type==='CIRCLE'){let cx=val(d,10)*factor,cy=val(d,20)*factor,r=val(d,40)*factor;loops.push({pts:arc(cx,cy,r,0,2*Math.PI).slice(0,-1),circle:{cx,cy,r}});}
  if(type==='LWPOLYLINE'){let v=[];for(let [c,x] of d){if(c==='10')v.push([+x*factor,NaN,0]);if(c==='20'&&v.length)v[v.length-1][1]=+x*factor;if(c==='42'&&v.length)v[v.length-1][2]=+x;}if(v.some(p=>!p.every(Number.isFinite)))throw new Error('Geçersiz poligon koordinatı.');polyline(v,!!(val(d,70)&1));}
 }
 if(poly)throw new Error('Tamamlanmamış POLYLINE.');
 // Join endpoint-connected segments; never invent a bounding rectangle for an open shape.
 const seen=new Set(),unused=[];
 for(let p of segments){if(p.length<2||near(p[0],p[p.length-1])&&p.length===2)continue;let a=p.map(q=>q.map(n=>n.toFixed(6)).join(',')).join(';'),b=[...p].reverse().map(q=>q.map(n=>n.toFixed(6)).join(',')).join(';');let k=a<b?a:b;if(!seen.has(k)){seen.add(k);unused.push(p);}}
 while(unused.length){let chain=unused.pop().slice();let budget=segments.length+1;
  while(!near(chain[0],chain[chain.length-1])&&budget--){let end=chain[chain.length-1],hits=[];unused.forEach((p,i)=>{if(near(end,p[0]))hits.push([i,false]);else if(near(end,p[p.length-1]))hits.push([i,true]);});if(hits.length!==1)throw new Error(hits.length?'DXF konturunda dallanma var.':'DXF konturu açık; önce DXF-CNC temizleyicide kontrol edin.');let [i,rev]=hits[0],p=unused.splice(i,1)[0];if(rev)p=p.slice().reverse();chain.push(...p.slice(1));}
  if(!near(chain[0],chain[chain.length-1]))throw new Error('Kontur birleştirilemedi.');chain.pop();if(chain.length>=3)loops.push({pts:chain});
 }
 function area(p){return polyArea(p);}
 loops.forEach(l=>{l.area=l.circle?Math.PI*l.circle.r*l.circle.r:area(l.pts);l.parent=null;});
 for(let l of loops){let candidates=loops.filter(o=>o!==l&&o.area>l.area+1e-6&&pointInPoly(l.pts[0],o.pts));if(candidates.length)l.parent=candidates.sort((a,b)=>a.area-b.area)[0];}
 function depth(l){let n=0;while(l.parent){l=l.parent;if(++n>loops.length)throw new Error('DXF kontur ağacı hatalı.');}return n;}
 return loops.filter(l=>depth(l)%2===0).map(l=>{let pts=l.pts,minx=Math.min(...pts.map(p=>p[0])),maxx=Math.max(...pts.map(p=>p[0])),miny=Math.min(...pts.map(p=>p[1])),maxy=Math.max(...pts.map(p=>p[1]));if(l.circle){minx=l.circle.cx-l.circle.r;maxx=l.circle.cx+l.circle.r;miny=l.circle.cy-l.circle.r;maxy=l.circle.cy+l.circle.r;}
  let holes=loops.filter(h=>h.parent===l);return {file:name,kind:l.circle&&!holes.length?'circle':'poly',pts,holes:holes.map(h=>h.pts),w:maxx-minx,h:maxy-miny,minx,miny,maxx,maxy,area:l.area-holes.reduce((s,h)=>s+h.area,0),...(l.circle||{})};}).filter(p=>p.w>0&&p.h>0);
}
