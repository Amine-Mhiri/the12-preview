import {navigationCategory, TYPE_VIEWS} from './views.mjs';
import {subcategories,subcategoryHref} from './subcategories.mjs';
/** One masthead for home, category and credits pages. Registry owns liveness. */
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderLogo(logo) {
  return logo.replace(/ role="[^"]*"| aria-label="[^"]*"/g,'').replace('<svg ','<svg class="gco-mark" aria-hidden="true" focusable="false" ');
}
export function renderWordmark(logo,base='./'){return `<a class="wordmark gco-logo" href="${escapeHtml(base)}" aria-label="Good Choices Only, home">${renderLogo(logo)}</a>`;}
export function renderMenuCategories(categories,{base='./',current=''}={}) {
  const verticals={'sport-nutrition':'Sport & Nutrition','food-drinks':'Food & Drinks','body-hygiene':'Body & Hygiene','home-essentials':'Home Essentials','fresh-raw':'Fresh & Raw'};
  return categories.filter(c=>c.published>0).map(navigationCategory).map(c=>{
    const route=c.route||c.slug,rows=c.subcategories||subcategories(c);
    const children=rows.length>1?rows.filter(t=>t.published>0).map(t=>{
      const href=t.slug===TYPE_VIEWS.creatine.type?`${base}creatine/#selection`:subcategoryHref(base,c.slug,t.slug);
      return `<li><a class="gco-type" href="${escapeHtml(href)}">${escapeHtml(t.name)}<span class="gco-reference-count" title="${t.published} published references">${t.published}</span></a></li>`;
    }).join(''):'';
    return `<section class="gco-menu-col" data-menu-category="${escapeHtml(c.slug)}" data-label="${escapeHtml(c.name)}" data-published="${c.published}">${verticals[c.presentation?.vertical_slug]?`<p class="gco-menu-vertical">${escapeHtml(verticals[c.presentation.vertical_slug])}</p>`:''}<a class="gco-category is-live" data-category="${escapeHtml(c.slug)}" data-route="${escapeHtml(route)}" data-label="${escapeHtml(c.name)}" href="${escapeHtml(`${base}${route}/`)}"${route===current?' aria-current="page"':''}>${escapeHtml(c.name)}</a>${children?`<ul>${children}</ul>`:''}</section>`;
  }).join('');
}
export function renderHeader(categories,{base='./',logo,whatsapp,current=''}) {
  const json=JSON.stringify(categories).replace(/</g,'\\u003c');
  return `<header class="gco-header" id="hdr" data-site-root="${escapeHtml(base)}" data-current="${escapeHtml(current)}">
    <div class="gco-shell gco-bar">${renderWordmark(logo,base)}
      <div class="gco-actions"><button class="gco-browse" type="button" aria-controls="gco-menu" aria-expanded="false" data-menu-toggle>Browse categories <svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg></button>
      <a class="gco-contact" href="https://wa.me/96598964454" target="_blank" rel="noopener noreferrer" aria-label="Contact us on WhatsApp (opens in a new tab)">${whatsapp}<span>Contact us</span></a>
      <span class="gco-market" aria-label="Kuwait, prices in KWD"><span class="gco-location"><span aria-hidden="true">◉</span> Kuwait <span class="gco-divider">/</span></span> KWD</span></div>
      <button class="gco-mobile-toggle" type="button" aria-label="Open menu" aria-controls="gco-menu" aria-expanded="false" data-menu-toggle><span></span><span></span></button>
    </div>
    <div class="gco-menu" id="gco-menu" hidden><div class="gco-shell"><nav aria-label="Browse categories"><div class="gco-menu-heading"><h2>Browse the selection</h2><p>Choose a category, then find the type that fits your needs.</p></div><div class="gco-menu-grid">${renderMenuCategories(categories,{base,current})}</div></nav></div></div>
    <script type="application/json" id="gco-nav-data">${json}</script>
  </header>`;
}
