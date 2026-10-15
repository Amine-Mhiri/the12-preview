import {setCounterValue} from './count-up.mjs?v=2';
import {navigationCategory} from './views.mjs';
import {renderMenuCategories} from './header-render.mjs';
/** Published references are distinct from charter passes and from rejected products. */
export function metaCounts(meta) {
  if(!Array.isArray(meta?.categories)||!meta.categories.length)return null;
  let analyzed=0,selected=0;
  for(const c of meta.categories){
    if(!Number.isSafeInteger(c.reviewed)||c.reviewed<0||!Number.isSafeInteger(c.published)||c.published<0)return null;
    analyzed+=c.reviewed;selected+=c.published;
    if(!Number.isSafeInteger(analyzed)||!Number.isSafeInteger(selected))return null;
  }
  return {analyzed,selected};
}
export function applySiteMeta(root,meta,base='./') {
  const counts=metaCounts(meta);if(!counts)return false;
  for(const el of root.querySelectorAll('[data-tally]')){
    const value=counts[el.dataset.tally];if(value!==undefined)setCounterValue(el,value);
  }
  const grid=root.querySelector?.('.gco-menu-grid'),registry=root.querySelector?.('#gco-nav-data');
  if(grid&&registry){
    let previous=[];try{previous=JSON.parse(registry.textContent);if(!Array.isArray(previous))previous=[]}catch{}
    const categories=meta.categories.map(c=>{
      const old=previous.find(p=>p.slug===c.slug);
      const fresh=c.subcategories?c:old?.navigation_build===meta.build?.id&&old.published===c.published&&JSON.stringify((old.types||[]).map(t=>[t.slug,t.published]))===JSON.stringify((c.types||[]).map(t=>[t.slug,t.published]))?{...c,subcategories:old.subcategories,navigation_build:old.navigation_build}:c;
      return fresh;
    });
    const signature=JSON.stringify(categories);
    if(registry.textContent!==signature){
      const focus=grid.ownerDocument?.activeElement?.closest('a')?.getAttribute('href');
      grid.innerHTML=renderMenuCategories(categories,{base,current:root.querySelector?.('#hdr')?.dataset.current||''});
      registry.textContent=signature;
      if(focus)[...grid.querySelectorAll('a')].find(a=>a.getAttribute('href')===focus)?.focus({preventScroll:true});
    }
    return true;
  }
  const bySlug=new Map(meta.categories.map(c=>[c.slug,navigationCategory(c)]));
  for(const el of root.querySelectorAll('[data-menu-category]')){
    const c=bySlug.get(el.dataset.menuCategory);if(c)el.dataset.published=String(c.published);
  }
  for(const el of root.querySelectorAll('.gco-category[data-category]')){
    const c=bySlug.get(el.dataset.category);if(!c)continue;
    const live=c.published>0;
    const route=c.route||c.slug;
    if((el.tagName==='A')===live&&(el.dataset.route||c.slug)===route&&(el.dataset.label||c.name)===c.name)continue;
    const next=el.ownerDocument.createElement(live?'a':'span');
    next.className=`gco-category${live?' is-live':''}`;next.dataset.category=c.slug;next.dataset.route=route;next.dataset.label=c.name;next.append(el.ownerDocument.createTextNode(c.name));
    if(live)next.setAttribute('href',`${base}${next.dataset.route}/`);
    else{next.setAttribute('aria-disabled','true');const mark=el.ownerDocument.createElement('span');mark.className='gco-coming';mark.textContent='Coming';next.append(mark)}
    el.replaceWith(next);
  }
  return true;
}
