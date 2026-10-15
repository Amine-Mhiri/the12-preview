import {initializeCounters,setCounterValue} from './count-up.mjs?v=2';
/**
 * Every sentence on a category page that contains a count, from one payload.
 *
 * Used twice, and the reason this file exists is that it used to be used once.
 * `scripts/build.mjs` wrote these into the HTML when the page was built, and
 * `app.js` fetched the live API afterwards and re-rendered the products from it
 * — but never these sentences. So a founder unticked two products in NocoDB,
 * the shelf below the headline went from 10 cards to 8 within seconds, and the
 * headline above it went on saying "Only 10 made the cut." until the next
 * deploy (2026-10-12). The page contradicted itself in its largest type.
 *
 * Now the build calls this for the HTML it ships and the page calls it again
 * with whatever the API returns, so the two can only differ for the moment
 * between the HTML arriving and the fetch finishing.
 *
 * Every value is a string, because every one lands in `textContent`.
 */
export function countText(d) {
  const n = d.counts.selected;
  const reviewed = d.counts.reviewed;
  const noun = d.category_name.toLowerCase();
  return {
    HEADLINE: Number.isSafeInteger(reviewed)?`${reviewed} ${noun} products reviewed.`:`${d.category_name} selection.`,
    HEADLINE_EMPHASIS: n === 0 ? "No publishable references yet." : `Only ${n} made the cut.`,
    PROMPT:
      n === 0
        ? "No references currently meet ingredient admission and Kuwait offer requirements."
        : `Now choose the ${d.copy.noun} that fits you.`,
    DIRECTOR_COUNT: `${d.director_selection.selected} chosen by hand · ${n} published${Number.isSafeInteger(reviewed)?` · ${reviewed} reviewed`:''}`,
    REVIEW_LEDGER: Number.isSafeInteger(reviewed)
      ? `${reviewed} ${noun} references reviewed against one ingredient standard. ${n} are published, ${d.counts.excluded} were excluded and ${d.counts.pending} remain unresolved. Different pack sizes count as separate references.`
      : `${n} ${d.copy.noun} ${n===1?'reference is':'references are'} published. Separate totals of reviewed, excluded and unresolved references are not yet available for this type.`,
    REVIEWED: reviewed===null?'Not supplied for this type':String(reviewed),
    SELECTED: String(n),
    EXCLUDED: d.counts.excluded===null?'Not supplied for this type':String(d.counts.excluded),
    PENDING: d.counts.pending===null?'Not supplied for this type':String(d.counts.pending),
    EMPTY_NOTE:
      n === 0
        ? "That is what this page is showing you today."
        : "An empty type can reflect unresolved ingredients, no available Kuwait offer.",
  };
}

/** Write them into every element that declares which one it shows. */
export function applyCountText(root, d) {
  const text = countText(d);
  root.querySelector?.('#hero-title')?.setAttribute('aria-label',`${text.HEADLINE} ${text.HEADLINE_EMPHASIS}`);
  for (const el of root.querySelectorAll("[data-count]")) {
    const value = text[el.dataset.count];
    if (value !== undefined) {
      const parts=headlineCounterParts(value,el.dataset.count);
      if(parts && el.ownerDocument?.createElement){
        const {prefix,number,suffix}=parts;
        let counter=el.querySelector('[data-tally]');
        if(!counter || (counter.previousSibling?.textContent??'')!==prefix || (counter.nextSibling?.textContent??'')!==suffix){
          counter=el.ownerDocument.createElement('data');
          counter.dataset.tally='hero-'+el.dataset.count;
          counter.setAttribute('aria-hidden','true');
          el.replaceChildren(el.ownerDocument.createTextNode(prefix),counter,el.ownerDocument.createTextNode(suffix));
        }
        counter.style.setProperty('--counter-width',`${number.toLocaleString('en-GB').length}ch`);
        setCounterValue(counter,number);
      }else el.textContent=value;
    }
  }
  initializeCounters(root);
}

/** Split only the two hero counts; empty shelves keep their honest sentence. */
export function headlineCounterParts(text,key){
  const match=key==='HEADLINE'?text.match(/^(\d+)(.*)$/):key==='HEADLINE_EMPHASIS'?text.match(/^(Only )(\d+)(.*)$/):null;
  if(!match)return null;
  return key==='HEADLINE'?{prefix:'',number:Number(match[1]),suffix:match[2]}:{prefix:match[1],number:Number(match[2]),suffix:match[3]};
}
const escape=text=>text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
/** Static HTML retains final numbers if scripts cannot run. */
export function headlineCounterMarkup(text,key){
  const parts=headlineCounterParts(text,key);if(!parts)return escape(text);
  const formatted=parts.number.toLocaleString('en-GB');
  return `${escape(parts.prefix)}<data data-tally="hero-${key}" aria-hidden="true" style="--counter-width:${formatted.length}ch">${formatted}</data>${escape(parts.suffix)}`;
}
