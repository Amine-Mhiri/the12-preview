/** Presentation only. The catalogue engine and its criteria remain unchanged. */
export function selectionLabels(data){
  const category=data.view==='creatine'?'creatine':data.category;
  const titles={protein:'Find your protein.',performance:'Find your performance essentials.',creatine:'Find your creatine.',
    'amino-acids':'Find your amino acids.','muscle-recovery':'Explore the recovery selection.',coffee:'Find your coffee.',
    'chocolate-candy':'Find your next treat.','sports-bars-snacks':'Find your next snack.',sunscreen:'Find your sunscreen.',cleaning:'Find your home essentials.'};
  return {title:data.counts?.selected===0?'Explore the selection.':titles[category]||'Find what fits you.',
    description:data.presentation?.domain==='non_oral'?'Ingredients reviewed for their intended use. Choose what fits you.':'Ingredients reviewed. Choose what fits you.',
    typeLabel:category==='protein'?'Protein type':category==='coffee'?'Coffee type':'Product type',
    allLabel:category==='protein'?'All protein':category==='coffee'?'All coffee':'All types'};
}
/** Move the same live controls between sidebar and dialogs: no duplicate fields. */
export function initializeSelectionLayout(root,compact){
  const byId=id=>root.getElementById(id),nav=byId('subcategory-nav'),controls=byId('filter-controls');
  if(!nav||!controls||!byId('type-dialog'))return {update(){}};
  const typeHome=byId('type-home'),filterHome=byId('filter-home');
  const dialogs={type:byId('type-dialog'),filters:byId('filters-dialog')};
  let opener=null;
  const closeAll=()=>Object.values(dialogs).forEach(d=>{if(d.open)d.close()});
  function place(){
    closeAll();
    (compact.matches?byId('type-dialog-body'):typeHome).appendChild(nav);
    (compact.matches?byId('filter-dialog-body'):filterHome).appendChild(controls);
  }
  for(const [name,dialog] of Object.entries(dialogs)){
    const button=byId(name==='type'?'type-toggle':'filter-toggle');
    button.addEventListener('click',()=>{
      if(!compact.matches)return;
      opener=button;dialog.showModal();
      (name==='type'?nav.querySelector('[aria-current="page"]')||nav.querySelector('a'):controls.querySelector('select,button,input'))?.focus();
    });
    dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus({preventScroll:true});opener=null});
    dialog.addEventListener('click',event=>{
      if(event.target!==dialog)return;
      const box=dialog.getBoundingClientRect();
      if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();
    });
  }
  for(const button of root.querySelectorAll('[data-selection-close]'))button.addEventListener('click',()=>dialogs[button.dataset.selectionClose]?.close());
  // Real links retain modified-click behaviour; an ordinary choice closes its sheet.
  nav.addEventListener('click',event=>{if(event.target.closest('[data-subcategory]')&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey&&dialogs.type.open)dialogs.type.close()});
  compact.addEventListener('change',place);place();
  return {update({labels,typeName,hasTypes,filterCount,resultText}){
    byId('selection-title').textContent=labels.title;byId('selection-description').textContent=labels.description;
    byId('type-heading').textContent=labels.typeLabel;byId('type-dialog-title').textContent=labels.typeLabel;
    byId('type-toggle-label').textContent=labels.typeLabel;byId('current-type').textContent=typeName;
    byId('type-toggle').hidden=!hasTypes;typeHome.hidden=!hasTypes;
    byId('filter-toggle-count').textContent=String(filterCount);byId('filter-toggle-count').hidden=filterCount===0;
    byId('filter-result-preview').textContent=resultText;
    byId('mobile-selection-actions').classList.toggle('single-control',!hasTypes);
    if(!hasTypes&&dialogs.type.open)dialogs.type.close();
  }};
}
