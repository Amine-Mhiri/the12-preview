import {validateCatalogue} from './views.mjs';
import {hasDisplayFacets,subcategories} from './subcategories.mjs';
import {applySiteMeta} from './site-meta.mjs?v=3';
import {initializeCounters} from './count-up.mjs?v=2';
initializeCounters(document);
const header=document.getElementById('hdr');
if(header){
  const panel=header.querySelector('#gco-menu');const buttons=[...header.querySelectorAll('[data-menu-toggle]')];
  let openedBy=null;
  function toggle(open,button){
    if(open){openedBy=button||buttons[0];header.style.setProperty('--gco-header-bottom',`${Math.round(header.getBoundingClientRect().bottom)}px`)}panel.hidden=!open;
    for(const b of buttons){b.setAttribute('aria-expanded',String(open));if(b.classList.contains('gco-mobile-toggle'))b.setAttribute('aria-label',open?'Close menu':'Open menu')}
    document.documentElement.classList.toggle('gco-menu-open',open&&matchMedia('(max-width:700px)').matches);
    if(open){const first=[...panel.querySelectorAll('a')].find(el=>el.getClientRects().length);if(first)first.focus()}
  }
  for(const b of buttons)b.addEventListener('click',()=>{const open=panel.hidden;toggle(open,b);if(open)refresh(true)});
  document.addEventListener('keydown',e=>{
    if(panel.hidden)return;
    if(e.key==='Escape'){toggle(false);openedBy?.focus()}
    if(e.key==='Tab'&&matchMedia('(max-width:700px)').matches){
      const focusable=[...header.querySelectorAll('a[href],button')].filter(el=>el.getClientRects().length);
      const first=focusable[0],last=focusable.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
    }
  });
  document.addEventListener('click',e=>{if(!panel.hidden&&!header.contains(e.target))toggle(false)});
  panel.addEventListener('click',e=>{if(e.target.closest('a'))toggle(false)});
  addEventListener('resize',()=>{if(!panel.hidden)toggle(false)});
  const api=document.body.dataset.api;
  let fetching=false,lastSignature='';
  async function refresh(details=false){
    if(!api||fetching||document.hidden)return;
    fetching=true;
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
    try{
      const response=await fetch(`${api.replace(/\/$/,'')}/v1/meta`,{cache:'no-cache',signal:controller.signal});
      if(response.ok){
        const meta=await response.json();
        const signature=JSON.stringify([meta.build,meta.categories]);
        if(details===true||signature!==lastSignature){
          await Promise.all(meta.categories.filter(c=>c.published>0&&hasDisplayFacets(c.slug)).map(async c=>{
            try{
              const response=await fetch(`${api.replace(/\/$/,'')}/v1/catalogue/${c.slug}`,{cache:'no-cache',signal:controller.signal});
              if(!response.ok)return;const d=validateCatalogue(await response.json());
              if(d.build?.id!==meta.build?.id||d.category!==c.slug||d.counts?.selected!==c.published)return;
              c.subcategories=subcategories(d);c.navigation_build=d.build.id;
            }catch{}
          }));
          lastSignature=signature;
        }
        applySiteMeta(document,meta,header.dataset.siteRoot);
      }
    }catch{}finally{clearTimeout(timeout);fetching=false}
  }
  refresh();
  setInterval(refresh,30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  addEventListener('focus',refresh);
}
