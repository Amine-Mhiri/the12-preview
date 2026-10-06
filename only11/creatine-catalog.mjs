// Creatine data and criteria adapted to the existing whey catalogue components.
import {createCatalogEngine,stockState,chooseFlavor,merchantLink} from './catalog-engine.mjs';
export {stockState,chooseFlavor,merchantLink};
export const DEFAULTS=Object.freeze({query:'',flavor:'all',form:'all',budget:'',priority:'value',simple:false,noStevia:false,sport:false,independent:false});
export const PRIORITIES=Object.freeze({price:'Lowest pack price',value:'Price per 5 g creatine',simple:'Simplest formula'});
export const FLAVORS=Object.freeze({all:'All flavors',unflavored:'Unflavored',fruity:'Fruity'});
export const withAllergyChoice=(s,k,v)=>({...s,[k]:v});
export function adaptCatalog(raw){
 const groups=new Map();
 for(const p of raw.products){
  const range=p.group==='Thorne · Flavored powder'?'Thorne · Powder':p.group;
  const id=range+' · '+p.flavor;
  const name=p.form==='capsules'?'Creatine capsules':p.group.includes('Essentials')?'Essentials Creatine':p.group.includes('Micronized')?'Micronized Creatine':'Creatine Monohydrate';
  if(!groups.has(id))groups.set(id,{id,product_id:range,brand:p.brand,name,flavor:p.flavor,flavor_group:p.flavor==='Unflavored'?'unflavored':'fruity',variants:[]});
  const count=p.single_ingredient?1:p.id==='155734'?7:p.id==='156326'?4:3;
  groups.get(id).variants.push({...p,size:p.pack,net_g:p.monohydrate_g*p.servings,cost_per_5g:p.price_kwd*5/(p.monohydrate_g*p.servings),ingredient_count:count,ingredients_reviewed_at:raw.review_date,availability:{source:'direct',destination:'KW',status:p.stock,observed_at:p.stock_checked_at},label_image:p.label_image?{...p.label_image,reviewed_at:raw.review_date}:null,anti_doping_documented:p.evidence.some(e=>e.kind==='sport_registry'&&e.match==='exact_pack'),independent_documented:p.evidence.some(e=>e.kind==='independent_review'&&e.match==='product_flavor_pack'),stevia:/stevia|rebaudioside/i.test(p.other_ingredients||'')});
 }
 return {...raw,schema_version:1,groups:[...groups.values()],counts:{...raw.counts,selected:raw.products.length,flavor_options:groups.size},product_count:new Set([...groups.values()].map(g=>g.product_id)).size};
}
export function matches(g,v,s){
 if(s.query.startsWith('product:')){if(g.product_id!==s.query.slice(8))return false;}
 else if(s.query.startsWith('brand:')){if(g.brand!==s.query.slice(6))return false;}
 else if(s.query&&!`${g.brand} ${g.name} ${g.flavor}`.toLowerCase().includes(s.query.trim().toLowerCase()))return false;
 return (s.flavor==='all'||g.flavor_group===s.flavor)&&(s.form==='all'||v.form===s.form)&&(s.budget===''||v.price_kwd<=Number(s.budget))&&(!s.simple||v.single_ingredient)&&(!s.noStevia||!v.stevia)&&(!s.sport||v.anti_doping_documented)&&(!s.independent||v.independent_documented);
}
const compare=(a,b,p)=>{const key={price:'price_kwd',value:'cost_per_5g',simple:'ingredient_count'}[p];return (key?(a[key]??Infinity)-(b[key]??Infinity):0)||a.title.localeCompare(b.title)||a.id.localeCompare(b.id);};
export const {selectProducts,recommendations}=createCatalogEngine({matches,compare,groupId:g=>g.product_id});
