const states=new WeakMap();
const format=value=>Math.round(value).toLocaleString('en-GB');
export function counterFrame(from,to,progress){
  const t=Math.min(1,Math.max(0,progress));
  return Math.round(from+(to-from)*(1-Math.pow(1-t,2)));
}
function animate(el,state,from){
  if(state.frame)cancelAnimationFrame(state.frame);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){el.textContent=format(state.target);state.current=state.target;return}
  let start;
  const tick=time=>{
    start??=time;
    const progress=Math.min(1,(time-start)/2600);
    state.current=counterFrame(from,state.target,progress);el.textContent=format(state.current);
    state.frame=progress<1?requestAnimationFrame(tick):null;
  };
  state.frame=requestAnimationFrame(tick);
}
export function setCounterValue(el,value){
  const state=states.get(el);
  if(!state){el.textContent=format(value);return}
  el.setAttribute('aria-label',format(value));
  if(state.target===value)return;
  state.target=value;
  if(state.shown)animate(el,state,state.current);
  else el.textContent=format(value);
}
export function initializeCounters(root){
  const elements=[...root.querySelectorAll('.home-counts [data-tally], #hero-title [data-tally]')].filter(el=>!states.has(el));
  if(!elements.length)return;
  const show=el=>{const state=states.get(el);if(state.shown)return;state.shown=true;animate(el,state,0)};
  const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){show(entry.target);observer.unobserve(entry.target)}
  },{threshold:.25}):null;
  for(const el of elements){
    const value=Number(el.textContent.replace(/[^0-9]/g,''));
    states.set(el,{target:value,current:value,shown:false,frame:null});el.setAttribute('aria-label',format(value));
    if(observer)observer.observe(el);else show(el);
  }
}
