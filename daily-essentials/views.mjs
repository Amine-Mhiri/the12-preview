/** Display views only: canonical category, identities and verdicts stay in API. */
export const TYPE_VIEWS=Object.freeze({
  creatine:{source:'performance',type:'creatine-monohydrate',name:'Creatine',unit:'5 g creatine'},
});
export function validateCatalogue(d){
  if(d?.schema_version!==1||!Array.isArray(d.groups)||d.groups.length!==d.counts?.flavor_options||d.groups.reduce((n,g)=>n+g.variants.length,0)!==d.counts.selected)throw Error('Incomplete selection');
  return d;
}
export function catalogueView(d,view){
  validateCatalogue(d);
  const definition=TYPE_VIEWS[view];
  if(!definition)return comparableCatalogue(d);
  if(d.category!==definition.source)throw Error('Incorrect source category for view');
  const type=d.types.find(t=>t.slug===definition.type);
  if(!type)throw Error('Type not supplied by canonical catalogue');
  if(type.unit!==definition.unit)throw Error('Comparison unit differs from the approved view');
  const groups=d.groups.map(g=>({...g,variants:g.variants.filter(v=>v.type_slug===definition.type)})).filter(g=>g.variants.length);
  const selected=groups.reduce((n,g)=>n+g.variants.length,0);
  if(groups.some(g=>g.variants.some(v=>v.unit_name!==definition.unit)))throw Error('Reference unit differs from the approved view');
  const known=key=>Number.isSafeInteger(type.counts?.[key])&&type.counts[key]>=0?type.counts[key]:null;
  const noun=definition.name.toLowerCase();
  const copy={...d.copy,noun,guide_heading:`How do you like your ${noun}?`,unit_name:definition.unit,
    unit_basis:`Based on the canonical catalogue's declared amount, per ${definition.unit}.`,
    empty_title:`No ${noun} is published today.`,empty_body:`The promoted catalogue currently publishes no ${noun}. Other types are not included in this view.`};
  const result={...d,view,category_name:definition.name,tagline:`Compare the ${noun} selected for Kuwait.`,
    comparison_unit:definition.unit,comparison_units:[definition.unit],types:[type],groups,copy,
    counts:{reviewed:known('reviewed'),excluded:known('excluded'),pending:known('pending'),selected,flavor_options:groups.length},
    director_selection:{...d.director_selection,selected:groups.reduce((n,g)=>n+g.variants.filter(v=>v.director?.status==='selected').length,0)},
    priorities:{...d.priorities,value:`Price per ${definition.unit}`}};
  return comparableCatalogue(result);
}
/** The API owns unit costs; do not rank incompatible units against each other. */
export function comparableCatalogue(d){
  const units=new Set(d.groups.flatMap(g=>g.variants.map(v=>v.unit_name)).filter(Boolean));
  const hasValue=d.groups.some(g=>g.variants.some(v=>Number.isFinite(comparisonCost(v))));
  if(units.size<=1&&(hasValue||!d.groups.length))return d;
  const {value,...priorities}=d.priorities;
  return {...d,priorities};
}
/** Legacy cost_per_25g is protein-only. Other units need an explicit API cost. */
export function comparisonCost(v){
  if(v.unit_name&&Number.isFinite(v.cost_per_unit_kwd)&&v.cost_per_unit_kwd>=0)return v.cost_per_unit_kwd;
  return v.unit_name==='25 g protein'&&Number.isFinite(v.cost_per_25g)?v.cost_per_25g:null;
}
export function navigationCategory(c){
  if(c.slug!=='performance')return c;
  const type=c.types?.find(t=>t.slug===TYPE_VIEWS.creatine.type);
  const other=c.types?.some(t=>t.slug!==TYPE_VIEWS.creatine.type&&t.published>0);
  return type&&!other?{...c,name:'Creatine',route:'creatine',published:type.published,types:[type]}:c;
}
