// 2026-10-31: pictures come from the notebook sheets (scripts/pack-catalogue.py); each cell is cut out once.
const sheets=new Map(),cells=new Map();
const sheet=src=>{if(!sheets.has(src))sheets.set(src,fetch(src).then(r=>{if(!r.ok)throw Error(src);return r.blob();}).then(b=>createImageBitmap(b)));return sheets.get(src);};
const cellArt=(cell,fallback)=>{if(!cell||typeof cell==='string')return Promise.resolve(cell??fallback);const key=cell.src+cell.x+','+cell.y;
 if(!cells.has(key))cells.set(key,sheet(cell.src).then(bm=>{const c=document.createElement('canvas');c.width=c.height=cell.size;c.getContext('2d').drawImage(bm,cell.x,cell.y,cell.size,cell.size,0,0,cell.size,cell.size);return new Promise(r=>c.toBlob(b=>r(URL.createObjectURL(b)),'image/png'));}));
 return cells.get(key);};
const data=await fetch('./fish.json').then(r=>{if(!r.ok)throw Error('圖鑑載入失敗');return r.json()}).catch(()=>null);
const grid=document.querySelector('#grid'),search=document.querySelector('#search'),count=document.querySelector('#count'),dialog=document.querySelector('#detail');let point='all';
if(!data){count.textContent='圖鑑載入失敗，請重新整理。'}else{
 for(const f of data){const card=document.createElement('article');card.className='card';card.dataset.id=f.id;
 const art=document.createElement('button');art.className='art';art.setAttribute('aria-label','鑑賞 '+f.name);const img=document.createElement('img');void cellArt(f.thumbnail,f.image).then(u=>{img.src=u;});img.alt=f.name;img.loading='lazy';img.decoding='async';img.width=512;img.height=512;
 const num=document.createElement('span');num.className='number';num.textContent='No. '+String(f.number).padStart(2,'0');art.append(img,num);
 const copy=document.createElement('div');copy.className='card-copy';const name=document.createElement('h3');name.textContent=f.name;const places=document.createElement('p');places.className='points';places.textContent=f.points.map(p=>p.name).join(' · ');copy.append(name,places);card.append(art,copy);grid.append(card);
 art.addEventListener('click',()=>{document.querySelector('#detail-number').textContent='漁獲圖鑑 · No. '+String(f.number).padStart(2,'0');document.querySelector('#detail-name').textContent=f.name;const image=document.querySelector('#detail-image');image.removeAttribute('src');void cellArt(f.detail,f.image).then(u=>{image.src=u;});image.alt=f.name+'插畫';document.querySelector('#detail-points').textContent=f.points.map(p=>p.name+'・'+p.frequency).join(' ／ ');document.querySelector('#detail-range').textContent='遊戲體長：'+f.range.join('–')+' cm';document.querySelector('#detail-hint').textContent=f.hint;document.querySelector('#full-image').href=f.detail??f.image;dialog.showModal();});
 }
 const filter=()=>{const q=search.value.trim();let visible=0;for(const f of data){const show=(!q||f.name.includes(q))&&(point==='all'||f.points.some(p=>p.id===point));grid.querySelector('[data-id='+f.id+']').hidden=!show;if(show)visible++;}count.textContent=visible+' / '+data.length+' 種';document.querySelector('#empty').hidden=visible!==0;};
 for(const button of document.querySelectorAll('[data-point]'))button.addEventListener('click',()=>{point=button.dataset.point;for(const b of document.querySelectorAll('[data-point]'))b.setAttribute('aria-pressed',String(b===button));filter();});search.addEventListener('input',filter);filter();
}
document.querySelector('#close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
