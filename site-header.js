import {applySiteMeta} from './site-meta.mjs';
import {initializeCounters} from './count-up.mjs';
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
  for(const b of buttons)b.addEventListener('click',()=>toggle(panel.hidden,b));
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
  let fetching=false;
  async function refresh(){
    if(!api||fetching||document.hidden)return;
    fetching=true;
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
    try{const response=await fetch(`${api.replace(/\/$/,'')}/v1/meta`,{cache:'no-cache',signal:controller.signal});if(response.ok)applySiteMeta(document,await response.json(),header.dataset.siteRoot)}catch{}finally{clearTimeout(timeout);fetching=false}
  }
  refresh();
  setInterval(refresh,30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  addEventListener('focus',refresh);
}
