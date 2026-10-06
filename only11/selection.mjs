import {createCatalogEngine} from './catalog-engine.mjs';
export {stockState,chooseFlavor,merchantLink} from './catalog-engine.mjs';
export const DEFAULTS = Object.freeze({query:'',flavor:'all',budget:'',priority:'value',lactose:false,soy:false,noStevia:false,sport:false,milkAllergy:false,noAllergies:true,director:false,native:false,grassFed:false});
export const PRIORITIES = Object.freeze({price:'Lowest pot price',value:'Price per 25 g protein',simple:'Cleanest product'});
export const FLAVORS = Object.freeze({all:'All flavors',unflavored:'Unflavored',vanilla:'Vanilla',chocolate:'Chocolate',fruity:'Fruity',other:'Other'});

export function matches(g,v,s) {
  if(s.milkAllergy)return false;
  if(s.director&&v.director?.status!=='selected')return false;
  if(s.query.startsWith('product:')){if((g.product_id||g.id)!==s.query.slice(8))return false;}
  else if(s.query.startsWith('brand:')){if(g.brand!==s.query.slice(6))return false;}
  else if(s.query&&!`${g.brand} ${g.name} ${g.flavor}`.toLowerCase().includes(s.query.trim().toLowerCase()))return false;
  if(s.flavor!=='all'&&g.flavor_group!==s.flavor)return false;
  if(s.budget!==''&&(!Number.isFinite(v.price_kwd)||v.price_kwd>Number(s.budget)))return false;
  if(s.lactose&&!v.lactose_free_declared)return false;
  if(s.soy&&!v.soy_free_declared)return false;
  if(s.native&&!v.claims?.some(c=>c.type==='native'))return false;
  if(s.grassFed&&!v.claims?.some(c=>['grassfed','truly_grassfed'].includes(c.type)))return false;
  if(s.noStevia&&v.stevia)return false;
  if(s.sport&&!v.anti_doping_documented)return false;
  if(s.priority==='value'&&!Number.isFinite(v.cost_per_25g))return false;
  return true;
}
export function compareVariants(a,b,priority) {
  const metrics={price:'price_kwd',value:'cost_per_25g',simple:'ingredient_count'};
  const score=v=>priority==='evidence'?v.evidence.rank:(metrics[priority]?v[metrics[priority]]:0);
  const av=score(a),bv=score(b);
  const d=(Number.isFinite(av)?av:Infinity)-(Number.isFinite(bv)?bv:Infinity);
  return (Number.isNaN(d)?0:d)||a.title.localeCompare(b.title,'en')||a.id.localeCompare(b.id);
}
export const {selectGroups,selectProducts,recommendations}=createCatalogEngine({matches,compare:compareVariants,locale:'en'});

// The unrestricted choice clears all allergy constraints; any restriction clears it.
export function withAllergyChoice(state,key,checked){
  const next={...state,[key]:checked};
  if(key==='noAllergies'&&checked)Object.assign(next,{milkAllergy:false,soy:false,lactose:false});
  else if(['milkAllergy','soy','lactose'].includes(key)&&checked)next.noAllergies=false;
  return next;
}
