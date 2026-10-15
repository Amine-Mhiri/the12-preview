// Common catalogue mechanics. Category profiles own criteria and comparison units.
export function stockState(v, now=Date.now()) {
  const a=v.availability||{}, t=Date.parse(a.observed_at);
  if(a.source!=='direct'||a.destination!=='KW'||!Number.isFinite(t)||t>now||now-t>=86400000)return 'unknown';
  return ['in_stock','out_of_stock','destination_unavailable','discontinued'].includes(a.status)?a.status:'unknown';
}

export function createCatalogEngine({matches,compare,locale,groupId=g=>g.product_id||g.id}) {
  function selectGroups(data,state) {
    return data.groups.map(g=>({...g,variants:g.variants.filter(v=>matches(g,v,state))
      .sort((a,b)=>compare(a,b,state.priority))})).filter(g=>g.variants.length).sort((a,b)=>
      state.priority==='name'?`${a.brand} ${a.name} ${a.flavor}`.localeCompare(`${b.brand} ${b.name} ${b.flavor}`,locale):
        compare(a.variants[0],b.variants[0],state.priority));
  }
  function selectProducts(data,state) {
    const products=new Map();
    for(const g of selectGroups(data,state)){
      const id=groupId(g);
      if(!products.has(id))products.set(id,{id,brand:g.brand,name:g.name,variants:[]});
      products.get(id).variants.push(...g.variants.map(v=>({...v,flavor:g.flavor,flavor_group:g.flavor_group,flavor_id:g.id})));
    }
    const rows=[...products.values()];
    for(const p of rows)p.variants.sort((a,b)=>compare(a,b,state.priority));
    return rows.sort((a,b)=>state.priority==='name'?`${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`,locale):
      compare(a.variants[0],b.variants[0],state.priority));
  }
  function recommendations(data,state,now=Date.now()) {
    const compareAvailable=(a,b)=>(stockState(a,now)==='in_stock'?0:1)-(stockState(b,now)==='in_stock'?0:1)||compare(a,b,state.priority);
    const rows=selectProducts(data,state).map(p=>{
      const variants=p.variants.filter(v=>!['out_of_stock','destination_unavailable','discontinued'].includes(stockState(v,now)));
      variants.sort(compareAvailable);
      return variants.length?{...p,variants,variant:variants[0]}:null;
    }).filter(Boolean);
    return rows.sort((a,b)=>compareAvailable(a.variant,b.variant)).slice(0,3);
  }
  return {selectGroups,selectProducts,recommendations};
}

export function chooseFlavor(product,flavorId,currentId){
  const current=product.variants.find(v=>v.id===currentId);
  const candidates=product.variants.filter(v=>v.flavor_id===flavorId);
  return candidates.find(v=>current&&v.net_g===current.net_g)||candidates[0]||null;
}

export function merchantLink(v){
  const u=new URL(v.url);
  if(u.protocol!=='https:'||u.hostname!=='kw.iherb.com'||!u.pathname.endsWith('/'+v.id))throw Error('Invalid product destination');
  return u.href;
}
