import {comparisonCost} from './views.mjs';
/** Navigation facets only. Never changes an API identity, usage or admission. */
const FACETS = {
  coffee: [
    ['whole-bean','Whole bean',/\bwhole\s+beans?\b/i],
    ['ground','Ground',/\bground\b/i],
    ['instant','Instant',/\binstant\b|\bsoluble\b/i],
    ['capsules','Capsules & pods',/\bcapsules?\b|\bpods?\b|\bk-cups?\b/i],
  ],
  'chocolate-candy': [
    ['chocolate','Chocolate',/\bchocolat\w*\b|\bcacao\b|\bcocoa\b/i],
    ['gum-mints','Gum & mints',/\bgum\b|\bmints?\b/i],
    ['candy','Candy',/\bchews?\b|\bcand(?:y|ies)\b|\bgumm(?:y|ies)\b|\blollipops?\b/i],
  ],
  'sports-bars-snacks': [
    ['protein-bars','Protein bars',/\bprotein\s+bars?\b/i],
    ['energy-bars','Energy bars',/\b(?:energy|endurance)\s+bars?\b/i],
    ['waffles-snacks','Waffles & snacks',/\bwaffles?\b|\bsnacks?\b|\bbites?\b/i],
  ],
  cleaning: [
    ['laundry','Laundry & stain care',/\blaundry\b|\bstain\b/i],
    ['dish-care','Dish care',/\bdish(?:es|washing|washer)?\b/i],
    ['household-cleaners','Household cleaners',/\bsurface\b|\bfloor\b|\ball.purpose\b/i],
    ['cleaning-ingredients','Cleaning ingredients',/\bcitric acid\b|\bbaking soda\b/i],
  ],
  sunscreen: [
    ['face-body','Face & body',/\bface\b.*\bbody\b|\bbody\b.*\bface\b/i],
    ['face','Face',/\bface\b|\bfacial\b/i],
    ['body','Body',/\bbody\b/i],
  ],
  'amino-acids': [
    ['bcaa','BCAA',/\bbcaas?\b|\bbranched.chain\b/i],
    ['eaa','EAA',/\beaas?\b|\bessential amino acids\b/i],
    ['glutamine','Glutamine',/glutamine/i],
    ['arginine-ornithine','Arginine & ornithine',/arginine|ornithine/i],
    ['carnitine','Carnitine',/carnitine/i],
    ['taurine','Taurine',/taurine/i],
  ],
  'muscle-recovery': [['ribose','Ribose',/ribose/i]],
};
const TYPE_LABELS = {
  'whey-protein-isolate':'Whey isolate','whey-protein-concentrate':'Whey concentrate',
  'casein-protein':'Casein','plant-protein':'Plant protein','creatine-monohydrate':'Creatine',
};
export const hasDisplayFacets = category => Object.hasOwn(FACETS,category);
/** A declared title is enough to organise browsing, never to prove composition. */
export function subcategoryId(category,g,v) {
  if(!hasDisplayFacets(category)||v.type_slug!==category)return v.type_slug;
  const name=String(g.name||'');
  return FACETS[category].find(([, ,pattern])=>pattern.test(name))?.[0] || 'other';
}
export function subcategories(data) {
  if(!Array.isArray(data.groups))return (data.types||[]).filter(t=>t.published>0).map(t=>({slug:t.slug,name:TYPE_LABELS[t.slug]||t.name,published:t.published}));
  const counts=new Map();
  for(const g of data.groups)for(const v of g.variants){const id=subcategoryId(data.category,g,v);if(id)counts.set(id,(counts.get(id)||0)+1)}
  const labels=new Map((data.types||[]).map(t=>[t.slug,TYPE_LABELS[t.slug]||t.name]));
  const ordered=hasDisplayFacets(data.category)?FACETS[data.category].map(([slug,name])=>{labels.set(slug,name);return slug}):[...labels.keys()];
  labels.set('other','Other / unspecified');
  return [...new Set([...ordered,...counts.keys()])].filter(slug=>counts.has(slug)).map(slug=>({slug,name:labels.get(slug)||slug,published:counts.get(slug)}));
}
export function subcategoryHref(base,category,slug){
  return `${base}${category}/?type=${encodeURIComponent(slug)}#selection`;
}
export function scopeContext(data,selected,basePriorities) {
  const variants=data.groups.flatMap(g=>g.variants.filter(v=>selected==='all'||subcategoryId(data.category,g,v)===selected||v.type_slug===selected));
  const units=[...new Set(variants.map(v=>v.unit_name).filter(Boolean))];
  const priorities=Object.fromEntries(Object.entries(basePriorities).filter(([key])=>key!=='rank'&&key!=='value'));
  if(units.length===1&&units[0]!=='pack'&&variants.some(v=>Number.isFinite(comparisonCost(v))))priorities.value=`Price per ${units[0]}`;
  return {priorities,unit:units.length===1?units[0]:data.copy.unit_name};
}
