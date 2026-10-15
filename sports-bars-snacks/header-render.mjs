import {navigationCategory, TYPE_VIEWS} from './views.mjs';
/** One masthead for home, category and credits pages. Registry owns liveness. */
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderLogo(logo) {
  return logo.replace(/ role="[^"]*"| aria-label="[^"]*"/g,'').replace('<svg ','<svg class="gco-mark" aria-hidden="true" focusable="false" ');
}
export function renderWordmark(logo,base='./'){return `<a class="wordmark gco-logo" href="${escapeHtml(base)}" aria-label="Good Choices Only, home">${renderLogo(logo)}</a>`;}
export function renderHeader(categories,{base='./',logo,whatsapp,current=''}) {
  const href=slug=>`${base}${slug}/`;
  categories=categories.map(navigationCategory);
  const entry=c=>c.published>0
    ? `<a class="gco-category is-live" data-category="${escapeHtml(c.slug)}" data-route="${escapeHtml(c.route||c.slug)}" data-label="${escapeHtml(c.name)}" href="${escapeHtml(href(c.route||c.slug))}"${(c.route||c.slug)===current?' aria-current="page"':''}>${escapeHtml(c.name)}</a>`
    : `<span class="gco-category" data-category="${escapeHtml(c.slug)}" data-route="${escapeHtml(c.route||c.slug)}" data-label="${escapeHtml(c.name)}" aria-disabled="true">${escapeHtml(c.name)}<span class="gco-coming">Coming</span></span>`;
  const types=(c)=>(c.types||[]).map(t=>`<li>${t.published>0?`<a class="gco-type" href="${escapeHtml(href(t.slug===TYPE_VIEWS.creatine.type?'creatine':c.slug))}">${escapeHtml(t.name)}<span class="gco-open">Open</span></a>`:`<span class="gco-type" aria-disabled="true">${escapeHtml(t.name)}</span>`}</li>`).join('');
  return `<header class="gco-header" id="hdr" data-site-root="${escapeHtml(base)}">
    <div class="gco-shell gco-bar">${renderWordmark(logo,base)}
      <div class="gco-actions"><button class="gco-browse" type="button" aria-controls="gco-menu" aria-expanded="false" data-menu-toggle>Browse categories <svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg></button>
      <a class="gco-contact" href="https://wa.me/96598964454" target="_blank" rel="noopener noreferrer" aria-label="Contact us on WhatsApp (opens in a new tab)">${whatsapp}<span>Contact us</span></a>
      <span class="gco-market" aria-label="Kuwait, prices in KWD"><span class="gco-location"><span aria-hidden="true">◉</span> Kuwait <span class="gco-divider">/</span></span> KWD</span></div>
      <button class="gco-mobile-toggle" type="button" aria-label="Open menu" aria-controls="gco-menu" aria-expanded="false" data-menu-toggle><span></span><span></span></button>
    </div>
    <div class="gco-menu" id="gco-menu" hidden><div class="gco-shell"><nav aria-label="Browse categories"><div class="gco-menu-heading"><h2>Every category</h2><p>Explore the categories with a published selection. The others are still being reviewed.</p></div><div class="gco-menu-grid">${categories.map(c=>`<section class="gco-menu-col" data-menu-category="${escapeHtml(c.slug)}" data-label="${escapeHtml(c.name)}" data-published="${c.published}">${entry(c)}<ul>${types(c)}</ul></section>`).join('')}</div></nav></div></div>
  </header>`;
}
