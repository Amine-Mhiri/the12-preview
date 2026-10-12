import {setCounterValue} from './count-up.mjs';
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
  const bySlug=new Map(meta.categories.map(c=>[c.slug,c]));
  for(const el of root.querySelectorAll('[data-menu-category]')){
    const c=bySlug.get(el.dataset.menuCategory);if(c)el.dataset.published=String(c.published);
  }
  for(const el of root.querySelectorAll('.gco-category[data-category]')){
    const c=bySlug.get(el.dataset.category);if(!c)continue;
    const live=c.published>0;
    if((el.tagName==='A')===live)continue;
    const next=el.ownerDocument.createElement(live?'a':'span');
    next.className=`gco-category${live?' is-live':''}`;next.dataset.category=c.slug;next.append(el.ownerDocument.createTextNode(c.name));
    if(live)next.setAttribute('href',`${base}${c.slug}/`);
    else{next.setAttribute('aria-disabled','true');const mark=el.ownerDocument.createElement('span');mark.className='gco-coming';mark.textContent='Coming';next.append(mark)}
    el.replaceWith(next);
  }
  return true;
}
