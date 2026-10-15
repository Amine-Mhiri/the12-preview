import {escapeHtml} from './header-render.mjs';
/** Profile text comes from the approved API, never from storefront admission rules. */
export function profileText(d){
  const food=d.presentation?.domain==='food';
  const validText=key=>typeof d.copy?.[key]==='string'&&d.copy[key].trim().length>0;
  if(food&&(!validText('screening_note')||!validText('audience_note'))){
    if(d.counts?.selected===0)return {
      SCREENING_NOTE:'No selection is currently published in this category. A review status is not a product admission.',
      AUDIENCE_NOTE:'No claim of individual dietary suitability is made.',
    };
    throw Error('Food presentation requires its approved screening and audience text');
  }
  return {
    SCREENING_NOTE:d.copy?.screening_note??`This shortlist follows our ingredient charter ${d.charter}. Every published product passes the applicable category ingredient screen. This is not a laboratory certification, and it is not a claim that every current batch has been tested.`,
    AUDIENCE_NOTE:d.copy?.audience_note??'This shortlist is for adults and does not determine individual medical suitability.',
  };
}
export function applyProfileText(root,d){
  const text=profileText(d);
  const card=root.querySelector?.('#ingredient-standards-card');
  if(card)card.innerHTML=exclusionContent(d);
  for(const el of root.querySelectorAll('[data-profile-copy]')){
    if(Object.hasOwn(text,el.dataset.profileCopy))el.textContent=text[el.dataset.profileCopy];
  }
}

/** The shared card describes the actual usage, without transplanting food claims. */
export function exclusionContent(d){
  const nonOral=d.presentation?.domain==='non_oral';
  const title=nonOral?'Ingredients checked for their intended use.':'We’re selective about every ingredient.';
  const labels=nonOral?['Readable ingredient declarations','Documented ingredient identities','Restrictions for this product type','Unresolved formulas held for review','Sources kept with each decision','Updates recorded over time']
    :['Artificial colors, flavors & sweeteners','Selected thickeners & stabilizers','Selected anti-caking agents','Selected sweeteners—even natural ones','Selected preservatives & antioxidants','Hydrogenated fats'];
  const tally=nonOral?'<strong>Use</strong> appropriate ingredient checks':`<strong>${escapeHtml(String(d.exclusion_rules||'Hundreds of'))}</strong> ingredients &amp; ingredient groups excluded`;
  return `<h2 id="exclusions-title">${escapeHtml(title)}</h2><div class="exclusion-tally"><span>${tally}</span></div><ul>${labels.map(label=>`<li><span aria-hidden="true">${nonOral?'✓':'×'}</span> ${escapeHtml(label)}</li>`).join('')}</ul><div class="exclusion-footer"><strong>${nonOral?'Every decision stays traceable.':'Every exclusion has a reason.'}</strong></div>`;
}
