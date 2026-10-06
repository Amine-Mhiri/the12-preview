export const stockState=(p,now=Date.now())=>{const t=Date.parse(p.stock_checked_at);return p.stock==='in_stock'&&Number.isFinite(t)&&now>=t&&now-t<=86400000?'in_stock':'check_stock';};
export const unitPrice=p=>Number.isFinite(p.price_kwd)&&p.price_kwd>0&&Number.isFinite(p.servings)&&p.servings>0&&Number.isFinite(p.monohydrate_g)&&p.monohydrate_g>0?p.price_kwd*5/(p.servings*p.monohydrate_g):null;
export const certified=p=>p.evidence.some(e=>e.kind==='sport_registry'&&e.match==='exact_pack');
export const independentlyTested=p=>p.evidence.some(e=>e.kind==='independent_review'&&e.match==='product_flavor_pack');
export function matches(p,f={}){return (!f.brand||p.brand===f.brand)&&(!f.form||p.form===f.form)&&(!f.flavor||p.flavor===f.flavor)&&(!f.simple||p.single_ingredient)&&(!f.sport||certified(p))&&(!f.independent||independentlyTested(p))&&(!f.search||p.title.toLowerCase().includes(f.search.toLowerCase()));}
export function selectGroups(products,f={},sort='unit'){
 const groups=new Map(); for(const p of products.filter(p=>matches(p,f))){if(!groups.has(p.group))groups.set(p.group,[]);groups.get(p.group).push(p);}
 const metric=p=>sort==='pack'?p.price_kwd:unitPrice(p);
 const compare=(a,b)=>(metric(a)??Infinity)-(metric(b)??Infinity)||a.title.localeCompare(b.title)||a.id.localeCompare(b.id);
 return [...groups].map(([name,variants])=>({name,variants:variants.sort(compare)})).sort((a,b)=>sort==='brand'?a.name.localeCompare(b.name):compare(a.variants[0],b.variants[0]));
}
export function recommend(products,{form='powder',flavor='',sport=false,independent=false}={},now=Date.now()){
 return selectGroups(products,{form,flavor,sport,independent},'unit').map(g=>({...g,variants:[...g.variants].sort((a,b)=>(stockState(a,now)==='in_stock'?0:1)-(stockState(b,now)==='in_stock'?0:1)||(unitPrice(a)??Infinity)-(unitPrice(b)??Infinity))})).sort((a,b)=>(stockState(a.variants[0],now)==='in_stock'?0:1)-(stockState(b.variants[0],now)==='in_stock'?0:1)||(unitPrice(a.variants[0])??Infinity)-(unitPrice(b.variants[0])??Infinity)).slice(0,3);
}
