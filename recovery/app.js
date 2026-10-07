/**
 * The storefront, derived from the reference comparator's app.js.
 *
 * Upstream v28, commit c2ba4b3768bdb8611bb7d0b46a26050c87ebac1d, taken as it
 * stood and changed in three ways only. The markup, the classes, the
 * stylesheet, the interactions, the dialogs and the four-step guide are the
 * comparator's, so the two look and behave the same.
 *
 *   1. **The two-category boolean is gone.** `CREATINE` branched between whey
 *      and creatine. Six categories cannot be a boolean, so every page loads
 *      one generic profile (`catalog.mjs`) and reads its criteria from its own
 *      category data.
 *   2. **The category's words come from data, not code.** "25 g protein",
 *      "How do you like your whey?" and the milk-allergy empty state were
 *      literals; they are now `data.copy`, so a seventh category needs no
 *      code. The milk-allergy case also stops being an automatic dead end:
 *      on a category page there may be products that declare no milk, and if
 *      there are, they are shown.
 *   3. **The catalogue is the published build.** A product appears because the
 *      charter admitted it and either it cleared the listing floor or somebody
 *      ticked it in the database. "Our pick" is that tick.
 *
 * `catalog-engine.mjs` and `style.css` are copied from upstream byte for byte
 * by the build and are never edited here.
 */
const CATEGORY=document.body.dataset.category;
const catalog=await import('./catalog.mjs');
const {DEFAULTS,stockState,selectProducts,chooseFlavor,recommendations,merchantLink,withAllergyChoice}=catalog;
// Assigned from the category's own data before the first render, because the
// comparator held these as per-category code and six categories cannot be a
// boolean. Every read happens inside a render, which runs after the bootstrap.
let COPY={},PRIORITIES={},FLAVORS={},constraintNames={},unitName='serving';
const unitCost=v=>v.cost_per_25g;

const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=x=>{try{const u=new URL(x);return u.protocol==='https:'?u.href:'#';}catch{return '#';}};
// Product images are not all remote. A retailer photograph is an absolute
// https URL and goes through safeUrl unchanged; a generated pack drawing is a
// path on this site and a last-resort placeholder is an inline SVG, and
// `new URL` throws on the first and rejects the second — which rendered both
// as `#`, a broken image on exactly the products we know least about.
// Relative so it also resolves under the /the12-preview/ prefix that GitHub
// Pages serves, where a root-absolute path would 404.
const imgSrc=x=>{
  const v=String(x??'');
  if(/^https:\/\//.test(v))return safeUrl(v);
  if(/^data:image\/svg\+xml[,;]/.test(v))return v;
  if(/^\/[^/]/.test(v))return '..'+v;
  return '#';
};
const money=x=>`KWD ${Number(x).toFixed(3)}`;
const date=x=>x?new Date(x).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kuwait'}):'Not checked';
const stamp=x=>x?new Date(x).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kuwait'})+' Kuwait time':'Not checked';
let displayMode='grid';
const mobileView=matchMedia('(max-width:767px)');
mobileView.addEventListener('change',()=>{if(data)renderView();});
let data,state={...DEFAULTS},limit=16,guided=false,step=0,draft={...DEFAULTS},choices=new Map(),activeDetail=null,stockSignature='';
const checkboxes=(s,prefix)=>Object.entries(constraintNames).filter(([k])=>k!=='milkAllergy'&&(k!=='director'||prefix==='guide')).map(([k,label])=>`<label class="check"><input type="checkbox" id="${prefix}-${k}" data-constraint="${k}" ${s[k]?'checked':''}><span>${label}</span></label>`).join('');
const options=(items,selected)=>Object.entries(items).map(([v,label])=>`<option value="${v}" ${v===selected?'selected':''}>${esc(label)}</option>`).join('');

function catalogChoices(){
  const products=selectProducts(data,{...DEFAULTS,priority:'name'});
  const brands=[...new Set(products.map(p=>p.brand))].sort((a,b)=>a.localeCompare(b,'en'));
  return {brands:Object.fromEntries(brands.map(b=>['brand:'+b,b])),products:Object.fromEntries(products.map(p=>['product:'+p.id,`${p.brand} — ${p.name}`]))};
}
function queryLabel(){const choices=catalogChoices();return choices.brands[state.query]||choices.products[state.query]||state.query;}
function catalogOptions(){
  const c=catalogChoices();
  const custom=state.query&&!Object.hasOwn(c.brands,state.query)&&!Object.hasOwn(c.products,state.query)?`<option value="${esc(state.query)}" selected>${esc(state.query)}</option>`:'';
  return `<option value="" ${state.query===''?'selected':''}>All brands & products</option>${custom}<optgroup label="Brands">${options(c.brands,state.query)}</optgroup><optgroup label="Products">${options(c.products,state.query)}</optgroup>`;
}
function renderFilters(){
  $('#filters').innerHTML=`<label class="search-label">Brand or product<select id="search">${catalogOptions()}</select></label><label>Flavor<select id="flavor">${options(FLAVORS,state.flavor)}</select></label><label>Your priority<select id="priority">${options(PRIORITIES,state.priority)}</select></label>`;
  if(!$('#extra-filters'))$('#filters').insertAdjacentHTML('afterend','<details id="extra-filters" class="extra-filters"></details>');
  $('#extra-filters').innerHTML=`<summary>Preferences <span aria-hidden="true" class="preference-toggle"></span></summary><div class="preference-pills" role="group" aria-label="Dietary preferences">${checkboxes(state,'filter')}${constraintNames.milkAllergy?`<label class="check"><input type="checkbox" data-constraint="milkAllergy" ${state.milkAllergy?'checked':''}><span>${constraintNames.milkAllergy}</span></label>`:''}</div>`;
  $('#search').onchange=e=>{state.query=e.target.value;filterChanged();};
  $('#flavor').onchange=e=>{state.flavor=e.target.value;filterChanged();};
  $('#priority').onchange=e=>{state.priority=e.target.value;filterChanged();};
  $('#extra-filters').onchange=e=>{if(e.target.dataset.constraint){state[e.target.dataset.constraint]=e.target.checked;filterChanged();}};
}

function renderScope(){
  $('#scope-director span').textContent=data.director_selection.selected;
  $('#scope-director').setAttribute('aria-pressed',String(state.director));
  $('#director-intro').hidden=!state.director;
  $('#scope-director').onclick=()=>{state.director=!state.director;filterChanged();};
}
function directorDetail(v){
  if(v.director?.status!=='selected')return '';
  const gumNote=v.director.gums.length?`Contains ${v.director.gums.map(esc).join(', ')} gum. Admitted under our conditional gum rule: only two references meet the gum-free profile.`:'No gums in the reviewed declaration.';
  return `<section class="director-detail"><p class="eyebrow">OUR PICK · LABEL-BASED SELECTION</p><h3>Why we chose this formula</h3><ul><li>${v.director.protein_per_100g.toFixed(2)} g declared protein / 100 g.</li><li>${v.ingredient_count} declared ingredient entries.</li><li>No added sugar, oil or maltodextrin in the reviewed declaration.</li><li>${esc(v.director.origin)}.</li><li>${gumNote}</li></ul>${v.director.notes.map(note=>`<p>${esc(note)}</p>`).join('')}<p class="detail-small">Full analytical validation is pending. Exact batch reports and residual lactose remain unconfirmed. The gum exception does not lower our analytical requirements or upgrade the evidence below.</p></section>`;
}
function filterChanged(){limit=16;choices.clear();renderResults();}
function clearAll(){state={...DEFAULTS};guided=false;limit=16;choices.clear();renderFilters();renderResults();}
function chips(){
  const items=[];
  if(state.query)items.push(['query',`Brand / product: ${queryLabel()}`]);
  if(state.flavor!=='all')items.push(['flavor',FLAVORS[state.flavor]]);
  if(state.budget!=='')items.push(['budget',`Up to ${money(state.budget)}`]);
  for(const [key,label] of Object.entries(constraintNames))if(state[key])items.push([key,label]);
  $('#active-filters').innerHTML=items.map(([key,label])=>`<button class="chip" data-remove="${key}" aria-label="Remove filter: ${esc(label)}">${esc(label)} <span aria-hidden="true">×</span></button>`).join('')+(items.length?'<button class="reset-link" data-reset>Reset filters</button>':'');
}
function stockLabel(v){
  return {in_stock:'In stock · iHerb Kuwait',out_of_stock:'Currently out of stock',destination_unavailable:'Unavailable for Kuwait',discontinued:'Discontinued on iHerb',unknown:'Check availability on iHerb'}[stockState(v)];
}
function reasons(g,v){
  const out=[];
  if(state.director)out.push('Meets our editorial selection criteria on the reviewed declarations.');
  if(state.flavor!=='all')out.push(`${v.flavor} fits your flavor preference.`);
  if(state.budget!=='')out.push(`This ${v.size} format is within your ${money(state.budget)} budget.`);
  if(state.lactose)out.push('Explicitly declared lactose-free.');
  if(state.soy)out.push('Explicitly declared soy-free.');
  if(state.native)out.push('Native whey explicitly declared for this reference.');
  if(state.grassFed)out.push('Grass-fed origin declared for this reference.');
  if(state.noStevia)out.push('No stevia in the reviewed ingredient list.');
  if(state.sport)out.push('Sports testing documented for the product / flavor; check your batch.');
  if(state.priority==='price')out.push(`${money(v.price_kwd)} per pot, ordered from the lowest price.`);
  if(state.vegan)out.push('Declared vegan.');
  if(state.glutenFree)out.push('Declared gluten-free.');
  if(state.milkAllergy)out.push('Declares no milk.');
  if(state.priority==='rank')out.push(`Ranked ${v.rank} on our shelf for ${v.type_name}.`);
  if(state.priority==='value')out.push(`${money(unitCost(v))} per ${unitName}. ${COPY.unit_basis}`);
  if(state.priority==='simple')out.push(`${v.ingredient_count} declared ingredient entries, with named blend ingredients included.`);
  if(state.priority==='evidence')out.push(`${v.evidence.title}. ${v.evidence.category==='proteines_antidopage'?'Exact pack-size match is still pending.':''}`);
  if(!out.length)out.push('Passes our ingredient screen. No extra preferences selected; shown alphabetically.');
  return out;
}
function flavorTone(v){
  const name=v.flavor.toLowerCase();
  if(/strawberry|watermelon/.test(name))return 'berry';
  if(/lime|lemon/.test(name))return 'citrus';
  return ['chocolate','vanilla','unflavored','fruity'].includes(v.flavor_group)?v.flavor_group:'neutral';
}
function reviewLinks(v,expanded=false){
  if(!v.review_links?.length)return '';
  return `<div class="review-links ${expanded?'review-expanded':''}">${v.review_links.map(r=>`<div><a href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener noreferrer">${esc(r.label)} ↗</a><small>${esc(r.scope)}</small>${expanded?`<p>${esc(r.note)}</p><small>Match reviewed ${date(r.reviewed_at)}</small>`:''}</div>`).join('')}</div>`;
}
function card(g,recommended=false){
  const v=g.variants.find(x=>x.id===choices.get(g.id))||(recommended?g.variant:g.variants[0]);
  const prefix=recommended?'match':'list',st=stockState(v);
  const flavors=[...new Map(g.variants.map(x=>[x.flavor_id,x])).values()];
  const sizes=g.variants.filter(x=>x.flavor_id===v.flavor_id).sort((a,b)=>a.net_g-b.net_g);
  const shortStock={in_stock:'In stock · Kuwait',out_of_stock:'Out of stock',destination_unavailable:'Unavailable in Kuwait',discontinued:'Discontinued',unknown:'Check Kuwait stock'}[st];
  return `<article class="product-card ${recommended?'match-card':''}" data-card="${g.id}" data-variant="${v.id}">
    <div class="product-photo">${v.director?.status==='selected'?'<span class="director-badge" title="Label-based editorial selection">Our pick</span>':''}${recommended?'<span class="photo-tag">MATCHES YOUR PREFERENCES</span>':''}<button class="photo-open" data-detail="${v.id}" aria-label="Open photo and details for ${esc(g.brand+' '+g.name+' · '+v.flavor+' · '+v.size)}"><img src="${esc(imgSrc(v.image))}" alt="${esc(v.title)}" onerror="this.onerror=null;this.src='${esc(v.placeholder||'')}'" loading="lazy" decoding="async" width="260" height="260"></button><span class="image-fallback" hidden>${esc(g.brand)}<br>${esc(g.name)}</span><button class="label-photo-button" data-detail="${v.id}" aria-label="View details for ${esc(g.brand+' '+g.name+' · '+v.flavor+' · '+v.size)}">Details</button></div>
    <div class="card-body"><div class="product-identity"><p class="brand">${esc(g.brand)}</p><h3>${esc(g.name)}</h3></div>
      <div class="product-options"><div class="flavor-options" role="group" aria-label="Flavor for ${esc(g.brand+' '+g.name)}">${flavors.map(x=>flavors.length>1?`<button class="flavor-pill tone-${flavorTone(x)}" id="${prefix}-flavor-${x.flavor_id}" data-flavor-product="${g.id}" data-flavor-id="${x.flavor_id}" aria-pressed="${x.flavor_id===v.flavor_id}" aria-label="${esc(x.flavor)} for ${esc(g.brand+' '+g.name)}">${esc(x.flavor)}</button>`:`<span class="flavor-pill tone-${flavorTone(x)}">${esc(x.flavor)}</span>`).join('')}</div>
      <div class="size-options" role="group" aria-label="Pack size for ${esc(g.brand+' '+g.name)}"><span class="size-caption">Pack size</span>${sizes.map(x=>sizes.length>1?`<button class="size-pill" id="${prefix}-size-${x.id}" data-size="${g.id}" value="${x.id}" aria-pressed="${x.id===v.id}" aria-label="${esc(x.size)} for ${esc(g.brand+' '+g.name)}">${esc(x.size)}</button>`:`<span class="size-pill">${esc(x.size)}</span>`).join('')}</div></div>
      ${recommended?`<div class="match-reason"><strong>Why it matches</strong><ul>${reasons(g,v).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}
      <div class="purchase"><a class="purchase-link" href="${esc(merchantLink(v))}" target="_blank" rel="noopener noreferrer" aria-label="${esc(money(v.price_kwd)+' · '+shortStock+' · '+g.brand+' '+g.name+' · '+v.flavor+' · '+v.size+' on iHerb')}"><span class="purchase-price">${money(v.price_kwd)}<span class="purchase-stock ${st==='in_stock'?'in-stock':''}">${esc(shortStock)}</span></span><span class="purchase-action">${st==='in_stock'?'iHerb':'Check iHerb'} <span aria-hidden="true">↗</span></span></a><p class="purchase-meta">${Number.isFinite(unitCost(v))?`${money(unitCost(v))} / ${unitName}`:'Unit cost not calculable'}<span>Price observed ${date(v.price_observed_at)}</span></p></div>
    </div></article>`;
}
function renderView(){
  const effectiveMode=mobileView.matches?'list':displayMode;
  $('.view-switch').hidden=mobileView.matches;
  $('#products').classList.toggle('list-view',effectiveMode==='list');
  $('#recommendations .product-grid')?.classList.toggle('list-view',effectiveMode==='list');
  for(const mode of ['grid','list']){
    $(`#view-${mode}`).setAttribute('aria-pressed',String(effectiveMode===mode));
    $(`#view-${mode}`).onclick=()=>{displayMode=mode;renderView();};
  }
}
function renderResults(){
  const rows=selectProducts(data,state),refCount=rows.reduce((n,g)=>n+g.variants.length,0);
  renderScope();chips();$('#result-count').textContent=`${rows.length} product${rows.length===1?'':'s'} · ${refCount} reference${refCount===1?'':'s'}`;
  const matches=guided?recommendations(data,state):[];
  $('#recommendations').innerHTML=guided&&matches.length?`<section class="matches-panel" aria-labelledby="matches-title"><div class="matches-heading"><div><p class="eyebrow">MADE PERSONAL</p><h3 id="matches-title">${matches.length===1?'Your match':'Your matches'}</h3><p>Chosen by your preferences. ${state.priority==='name'?'Listed alphabetically.':`Priority: ${esc(PRIORITIES[state.priority].toLowerCase())}.`} Current stock comes first.</p></div><button class="text-button" data-guide>Edit my answers ↗</button></div><div class="product-grid">${matches.map(g=>card(g,true)).join('')}</div><button class="button secondary all-results" id="all-results">Browse ${rows.length===1?'the matching option':`all ${rows.length} matching options`} ↓</button></section>`:'';
  let visibleRows=guided&&matches.length?rows.filter(g=>!matches.some(m=>m.id===g.id)):rows;
  $('#products').innerHTML=visibleRows.slice(0,limit).map(g=>card(g)).join('')||(!rows.length?emptyState():guided?'':'<div class="empty">No additional options.</div>');
  if(guided&&!matches.length&&rows.length)$('#recommendations').innerHTML='<div class="empty"><h3>No currently available match</h3><p>Your preferences match these options, but their latest checks show they are unavailable. The shortlist remains below for reference.</p></div>';
  $('#products').setAttribute('aria-label',guided?'More matching products':'Matching products');
  $('#load-more').innerHTML=visibleRows.length>limit?`<button class="button secondary" id="show-more">Show ${Math.min(16,visibleRows.length-limit)} more options <span aria-hidden="true">＋</span></button>`:'';
  if($('#show-more'))$('#show-more').onclick=()=>{const previous=limit;limit+=16;renderResults();const firstNew=$('#products').children[previous];firstNew?.querySelector('button,select,a')?.focus({preventScroll:true});};
  if($('#all-results'))$('#all-results').onclick=()=>{guided=false;renderResults();$('#products').scrollIntoView({behavior:'smooth',block:'start'});};
  renderView();
  bindDynamic();
}
function emptyState(){
  if(state.milkAllergy&&!selectProducts(data,state).length)return `<div class="empty"><h3>${esc(COPY.milk_allergy_empty.title)}</h3><p>${esc(COPY.milk_allergy_empty.body)}</p><button class="button secondary" data-guide>Review my answers</button></div>`;
  const constraints=Object.entries(constraintNames).filter(([k])=>state[k]).map(([,v])=>v.toLowerCase());
  return `<div class="empty"><h3>No exact match. Let’s adjust.</h3><p>No option satisfies all your current filters${constraints.length?`: ${esc(constraints.join(', '))}`:''}${state.flavor!=='all'?`, ${esc(FLAVORS[state.flavor].toLowerCase())}`:''}${state.budget!==''?`, up to ${money(state.budget)}`:''}.<br>Try another flavor or a higher budget. Your dietary constraints stay in place until you change them.${state.priority==='value'?` Only products whose declared nutrition supports a ${unitName} comparison qualify.`:''}</p><button class="button secondary" data-guide>Edit my preferences</button><button class="text-button" data-reset>Reset all filters</button></div>`;
}
function bindDynamic(){
  document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>openDetail(b.dataset.detail));
  document.querySelectorAll('[data-guide]').forEach(b=>b.onclick=openGuide);
  document.querySelectorAll('[data-reset]').forEach(b=>b.onclick=clearAll);
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{state[b.dataset.remove]=DEFAULTS[b.dataset.remove];choices.clear();limit=16;renderFilters();renderResults();});
  document.querySelectorAll('.product-photo img').forEach(img=>{img.onerror=()=>{img.hidden=true;const fallback=img.closest(".product-photo")?.querySelector(".image-fallback");if(fallback)fallback.hidden=false;};});
  document.querySelectorAll('[data-size],[data-flavor-product]').forEach(control=>{
    const change=()=>{
      const article=control.closest('.product-card'),isMatch=article.classList.contains('match-card');
      const rows=isMatch?recommendations(data,state):selectProducts(data,state);
      const product=rows.find(g=>g.id===article.dataset.card);if(!product)return;
      const v=control.dataset.flavorId?chooseFlavor(product,control.dataset.flavorId,article.dataset.variant):product.variants.find(v=>v.id===control.value);
      if(!v)return;choices.set(product.id,v.id);
      const focusId=control.id;renderResults();document.getElementById(focusId)?.focus({preventScroll:true});
    };
    if(control.tagName==='SELECT')control.onchange=change;else control.onclick=change;
  });
}
function findVariant(id){for(const g of data.groups){const v=g.variants.find(x=>x.id===id);if(v)return {g,v};}return null;}
function openDetail(id){
  const found=findVariant(id);if(!found)return;const {g,v}=found;activeDetail=id;
  const n=v.nutrition;const domains={protein:'Protein content',metals:'Metals',microbiology:'Microbiology',anti_doping:'Banned substances'};
  $('#product-detail').innerHTML=`<p class="eyebrow detail-eyebrow">WHY THIS MADE THE SHORTLIST</p><div class="detail-hero"><img src="${esc(imgSrc(v.image))}" alt="${esc(v.title)}" onerror="this.onerror=null;this.src='${esc(v.placeholder||'')}'" width="140" height="160"><div><p class="brand">${esc(g.brand)}</p><h2 id="product-title">${esc(g.name)}</h2><p class="flavor">${esc(g.flavor)} · ${esc(v.size)}</p><p class="detail-price">${money(v.price_kwd)}</p></div></div><div class="size-options detail-format" role="group" aria-label="Product detail pack size"><span class="size-caption">Pack size</span>${g.variants.map(x=>g.variants.length>1?`<button class="size-pill" id="detail-size-${x.id}" data-detail-size="${x.id}" aria-pressed="${x.id===id}">${esc(x.size)}</button>`:`<span class="size-pill">${esc(x.size)}</span>`).join('')}</div><div class="detail-pass"><span aria-hidden="true">✓</span><div><strong>Passed our ingredient screen</strong><p>No artificial colors, flavors or sweeteners in the reviewed ingredient list. Natural flavors and stevia are accepted. Reviewed ${date(v.ingredients_reviewed_at)}.</p></div></div>${directorDetail(v)}${v.lead_warning?`<aside class="detail-warning"><strong>Manufacturer lead warning</strong><p>${esc(v.warning_note)}</p></aside>`:''}<section class="detail-section" id="label-section"><h3 tabindex="-1" id="label-heading">The ingredients we reviewed</h3><figure class="composition-photo"><a href="${esc(v.label_image.url)}" target="_blank" rel="noopener noreferrer" aria-label="Enlarge composition label for ${esc(v.title)}"><img id="composition-image" src="${esc(v.label_image.url)}" alt="Ingredient and composition label for ${esc(g.brand+' '+g.name+' · '+g.flavor+' · '+v.size)}" loading="lazy" decoding="async"></a><p id="label-unavailable" hidden>Photo could not load. Please reopen the product details to try again.</p><figcaption><strong>${esc(g.flavor)} · ${esc(v.size)}</strong></figcaption><p class="detail-small">Label photo used for our review · ${date(v.label_image.reviewed_at)}. Packaging may change.</p></figure><p class="ingredients">${esc(v.ingredients)}</p><p class="detail-small">${v.ingredient_count} declared ingredient entries, including named blend constituents. Undisclosed flavor components are not counted as known ingredients.</p><p class="detail-small"><strong>Contains milk-derived protein.</strong> ${typeof v.allergen_statement==='string'?esc(v.allergen_statement):''}</p></section><section class="detail-section"><h3>What the evidence supports</h3>${reviewLinks(v,true)}<p class="evidence-title">${esc(v.evidence.title)}</p><p>${esc(v.evidence.note)}</p><dl class="evidence-grid">${Object.entries(domains).map(([key,label])=>`<div><dt>${label}</dt><dd>${esc(v.evidence.domains[key])}</dd></div>`).join('')}</dl><p class="detail-small">${esc(v.evidence.batch_note)} Documentation reviewed 29 Sep 2026. No overall health score is assigned.</p><div class="source-links">${v.evidence.sources.map(s=>`<a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a>`).join('')}</div></section>${v.claims.length?`<details class="claims-details"><summary>What the manufacturer declares <span aria-hidden="true">＋</span></summary><p class="detail-small">These are recorded claims, not automatically verified certifications. See the evidence section above for what we could establish.</p>${v.claims.map(c=>`<div class="claim-row"><strong>${esc(c.name)}</strong><p>${esc(c.quote)}</p><a href="${esc(safeUrl(c.source_url))}" target="_blank" rel="noopener noreferrer">Declaration source ↗</a></div>`).join('')}</details>`:''}<section class="detail-section"><h3>The price, put in perspective</h3>${n?`<dl class="nutrition-grid"><div><dt>Serving size</dt><dd>${n.serving_g} g</dd></div><div><dt>Protein per serving</dt><dd>${n.protein_g} g</dd></div><div><dt>Net weight</dt><dd>${v.net_g} g</dd></div><div><dt>Cost / 25 g protein</dt><dd>${Number.isFinite(v.cost_per_25g)?money(v.cost_per_25g):'Not calculable'}</dd></div></dl><p class="detail-small">Calculated from the declared nutrition for this exact reference: price × 25 × serving weight ÷ (net weight × protein per serving). This compares protein cost, not overall product quality.</p>`:'<p>Nutrition data is incomplete for this exact reference, so we do not calculate a protein cost.</p>'}<p class="detail-small">Price observed ${stamp(v.price_observed_at)}. Product only; delivery and checkout charges are additional.</p></section><div class="detail-buy"><p class="stock-note ${stockState(v)==='in_stock'?'in-stock':''}">${esc(stockLabel(v))}</p><p class="detail-small">${v.availability.observed_at?`Stock checked ${stamp(v.availability.observed_at)}, country set to Kuwait. Status expires after 24 hours.`:'Current Kuwait stock has not been confirmed.'} Final delivery options are confirmed at checkout.</p><a class="button primary" href="${esc(merchantLink(v))}" target="_blank" rel="noopener noreferrer">View this exact ${esc(v.size)} on iHerb <span aria-hidden="true">↗</span></a></div>`;
  document.querySelectorAll('[data-detail-size]').forEach(b=>b.onclick=()=>{const pid=b.dataset.detailSize;openDetail(pid);document.getElementById('detail-size-'+pid)?.focus({preventScroll:true});});
  if($('#composition-image'))$('#composition-image').onerror=()=>{$('#composition-image').hidden=true;$('#label-unavailable').hidden=false;};
  if(!$('#product-dialog').open)$('#product-dialog').showModal();
  $('#product-dialog').scrollTop=0;
}

function openGuide(){draft={...state,noAllergies:state.noAllergies&&!state.milkAllergy&&!state.soy};step=0;renderGuide();if(!$('#guide-dialog').open)$('#guide-dialog').showModal();}
function renderGuide(){
  const headings=['Any allergies or intolerances?','What do you like?',COPY.guide_heading,COPY.guide_open];
  const subtitles=['Choose all that apply, or select No allergies.','Choose a flavor family, or keep your options open.','Choose the qualities you prefer. Leave unchecked to keep all options open.','We will explain your matches using this priority.'];
  let content='';
  if(step===0)content=`<fieldset class="choice-grid"><legend class="screenreader">Allergies and intolerances</legend>${[['noAllergies','No allergies'],['milkAllergy','Milk allergy'],['soy','Soy allergy']].filter(([k])=>k==='noAllergies'||constraintNames[k]).map(([key,label])=>`<label class="choice"><input type="checkbox" data-constraint="${key}" ${draft[key]?'checked':''}><span>${label}</span></label>`).join('')}</fieldset>`;
  if(step===1)content=`<fieldset class="choice-grid"><legend class="screenreader">Flavor preference</legend>${Object.entries(FLAVORS).map(([value,label])=>`<label class="choice"><input type="radio" name="guide-flavor" value="${value}" ${draft.flavor===value?'checked':''}><span>${value==='all'?'No preference':esc(label)}</span></label>`).join('')}</fieldset>`;
  if(step===2)content=`<fieldset class="choice-grid"><legend class="screenreader">Preferences</legend>${Object.entries(constraintNames).filter(([k])=>!['milkAllergy','soy','director'].includes(k)).map(([key,label])=>`<label class="choice"><input type="checkbox" data-constraint="${key}" ${draft[key]?'checked':''}><span>${label}</span></label>`).join('')}</fieldset>`;
  if(step===3)content=`<fieldset class="priority-options"><legend class="screenreader">Ranking priority</legend>${Object.entries(PRIORITIES).map(([value,label])=>`<label class="priority-choice"><input type="radio" name="guide-priority" value="${value}" ${draft.priority===value?'checked':''}><span><strong>${value==='name'?'No preference':esc(label)}</strong><small>${{name:'Show my matches alphabetically.',price:'Spend less on the pot I buy today.',rank:'Show our shelf order.',value:`Compare the cost for the same amount of ${unitName}.`,simple:'Favor fewer declared ingredient entries.'}[value]}</small></span></label>`).join('')}</fieldset>`;
  $('#guide-content').innerHTML=`<p class="eyebrow">FIND MY ${esc((COPY.noun||CATEGORY).toUpperCase())} <span class="step-count">${step+1} / 4</span></p><div class="progress-track" aria-hidden="true">${[0,1,2,3].map(i=>`<span class="${i<=step?'done':''}"></span>`).join('')}</div><h2 id="guide-title" tabindex="-1">${headings[step]}</h2><p class="guide-subtitle">${subtitles[step]}</p>${content}<div class="guide-footer"><button class="text-button" id="guide-back">${step===0?'Cancel':'← Back'}</button><button class="button primary" id="guide-next">${draft.milkAllergy?'Finish':step===3?'Show my matches':'Continue'} <span aria-hidden="true">→</span></button></div><p class="guide-privacy">Your answers stay in this page. No account. No tracking.</p>`;
  $('#guide-content').querySelectorAll('[data-constraint]').forEach(i=>i.onchange=()=>{
    const key=i.dataset.constraint;
    if(step===0){
      draft=withAllergyChoice(draft,key,i.checked);
      $('#guide-content').querySelectorAll('[data-constraint]').forEach(input=>input.checked=Boolean(draft[input.dataset.constraint]));
      $('#milk-message').hidden=!draft.milkAllergy;
      $('#guide-next').innerHTML=`${draft.milkAllergy?'Finish':'Continue'} <span aria-hidden="true">→</span>`;
    }else draft[key]=i.checked;
  });
  $('#guide-content').querySelectorAll('[name="guide-form"]').forEach(i=>i.onchange=()=>draft.form=i.value);
  $('#guide-content').querySelectorAll('[name="guide-flavor"]').forEach(i=>i.onchange=()=>draft.flavor=i.value);
  $('#guide-content').querySelectorAll('[name="guide-priority"]').forEach(i=>i.onchange=()=>draft.priority=i.value);
  $('#guide-back').onclick=()=>{if(step===0)$('#guide-dialog').close();else{step--;renderGuide();$('#guide-title').focus();}};
  $('#guide-next').onclick=()=>{if(step===3||draft.milkAllergy){state={...draft};guided=true;limit=16;choices.clear();$('#guide-dialog').close();renderFilters();renderResults();$('#selection').scrollIntoView({behavior:'smooth'});$('#selection-title').setAttribute('tabindex','-1');$('#selection-title').focus({preventScroll:true});}else{step++;renderGuide();$('#guide-title').focus();}};
}

for(const dialog of document.querySelectorAll('dialog')){
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
}
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());
$('#product-dialog').addEventListener('close',()=>{activeDetail=null;});


function registerTools(){
  if(!document.modelContext?.registerTool)return;
  const controller=new AbortController();addEventListener('pagehide',()=>controller.abort(),{once:true});
  const registration=document.modelContext.registerTool({name:`filter_${CATEGORY.replace(/-/g,'_')}_selection`,description:'Apply visible catalogue filters and return matching references. Does not order or add items to a cart.',annotations:{readOnlyHint:false,untrustedContentHint:true},inputSchema:{type:'object',properties:{...(constraintNames.director?{director:{type:'boolean'}}:{}),query:{type:'string',maxLength:100},flavor:{type:'string',enum:Object.keys(FLAVORS)},budget:{type:'number',minimum:0,maximum:1000},priority:{type:'string',enum:Object.keys(PRIORITIES)}},additionalProperties:false},execute:async input=>{
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['director','query','flavor','budget','priority'].includes(k)))throw Error('Invalid filters');
    if(input.director!==undefined&&(!constraintNames.director||typeof input.director!=='boolean'))throw Error('Invalid director filter');
    if(input.flavor!==undefined&&!Object.hasOwn(FLAVORS,input.flavor)||input.priority!==undefined&&!Object.hasOwn(PRIORITIES,input.priority)||input.query!==undefined&&(typeof input.query!=='string'||input.query.length>100)||input.budget!==undefined&&(!Number.isFinite(input.budget)||input.budget<0||input.budget>1000))throw Error('Invalid filter value');
    Object.assign(state,input);if(input.budget!==undefined)state.budget=String(input.budget);choices.clear();limit=16;renderFilters();renderResults();
    return {content:[{type:'text',text:JSON.stringify({options:selectProducts(data,state).length,reference_ids:selectProducts(data,state).flatMap(g=>g.variants.map(v=>v.id))})}]};
  }},{signal:controller.signal});
  Promise.resolve(registration).catch(e=>console.warn('Optional page tools unavailable:',e.message));
}

// The API first, the file beside the page second. The API is the point — it
// reads the live database, so a founder's tick and a price change reach a
// visitor without anybody rebuilding — but a site that shows nothing when the
// API is briefly unreachable would be worse than one showing this morning's
// catalogue, so the build still writes a copy next to the page.
const SOURCES=[document.body.dataset.api?`${document.body.dataset.api}/v1/catalogue/${CATEGORY}`:null,`./data/${CATEGORY}.json`].filter(Boolean);
(async()=>{
  let last;
  for(const url of SOURCES){
    try{
      const r=await fetch(url,{cache:'no-cache'});
      if(!r.ok)throw Error(`${r.status} from ${url}`);
      return await r.json();
    }catch(e){last=e;if(url!==SOURCES[SOURCES.length-1])console.warn('[storefront] falling back:',e.message);}
  }
  throw last??Error('Selection unavailable');
})().then(d=>{
  COPY=d.copy;PRIORITIES=d.priorities;FLAVORS=d.flavors;constraintNames=d.constraints;unitName=d.copy.unit_name;
  if(d.schema_version!==1||!Array.isArray(d.groups)||d.groups.length!==d.counts.flavor_options||d.groups.reduce((n,g)=>n+g.variants.length,0)!==d.counts.selected)throw Error('Incomplete selection');
  data=d;renderFilters();renderResults();try{registerTools();}catch(e){console.warn('Optional page tools unavailable:',e.message);}
  stockSignature=data.groups.flatMap(g=>g.variants.map(v=>stockState(v))).join('|');
  const refreshAvailability=()=>{
    if(document.hidden)return;
    const current=data.groups.flatMap(g=>g.variants.map(v=>stockState(v))).join('|');
    if(current===stockSignature)return;
    stockSignature=current;renderResults();if(activeDetail)openDetail(activeDetail);
  };
  setInterval(refreshAvailability,60000);
  document.addEventListener('visibilitychange',refreshAvailability);
}).catch(()=>{
  $('.view-switch').hidden=true;$('.selection-tools').hidden=true;if($('#director-intro'))$('#director-intro').hidden=true;$('#filters').hidden=true;$('#result-count').textContent='Selection unavailable';$('#products').innerHTML='<div class="empty"><h3>The selection could not load.</h3><p>Please reload to retrieve the reviewed products and their prices.</p><button class="button primary" id="reload">Reload the selection</button></div>';$('#reload').onclick=()=>location.reload();document.querySelectorAll('[data-guide]').forEach(b=>b.disabled=true);
});
