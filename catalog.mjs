/**
 * One category profile, for every category.
 *
 * The reference comparator ships a profile per category — `selection.mjs` for
 * whey, `creatine-catalog.mjs` for creatine — and `app.js` picks between them
 * with a boolean. Six categories cannot be a boolean, and a seventh should not
 * need a file, so the criteria that were per-category code are read from the
 * category's own data instead.
 *
 * `matches` and `compareVariants` keep the shape the comparator's catalogue
 * engine expects, and `catalog-engine.mjs` is used unmodified: it is upstream,
 * already generic, and already correct.
 */
import { createCatalogEngine } from "./catalog-engine.mjs";

export { stockState } from "./catalog-engine.mjs";
export { chooseFlavor, comparePackSizes } from "./product-families.mjs";
import { displayCatalogue } from "./product-families.mjs";

/**
 * The link to the retailer, validated for this catalogue's shape.
 *
 * Upstream's `merchantLink` is not reused, and this is the one place the two
 * genuinely cannot share code. It asserts `pathname.endsWith('/' + v.id)`,
 * because in the reference comparator a variant's `id` IS the iHerb numeric
 * reference. Here `id` is the engine's own product slug, so that assertion
 * could never hold — it threw `Invalid product destination` inside the card
 * renderer, which killed the whole render and showed "The selection could not
 * load" on a page whose data was perfectly fine.
 *
 * The check that matters is kept: https, an iherb.com host, and a path that
 * ends in the retailer's own reference, which the API supplies as
 * `merchant_ref` rather than conflating it with our id.
 */
export function merchantLink(v) {
  const u = new URL(v.url);
  if (u.protocol !== "https:") throw Error("Invalid product destination");
  if (!/(^|\.)iherb\.com$/.test(u.hostname)) throw Error("Invalid product destination");
  if (v.merchant_ref && !u.pathname.endsWith(`/${v.merchant_ref}`)) {
    throw Error("Invalid product destination");
  }
  return u.href;
}

/** The state a page opens on. unit price first; this is a cost comparison, not a quality ranking. */
export const DEFAULTS = Object.freeze({
  query: "",
  flavor: "all",
  budget: "",
  priority: "value",
  director: false,
  milkAllergy: false,
  vegan: false,
  glutenFree: false,
  soy: false,
  noStevia: false,
  sport: false,
  noAllergies: true,
});

/**
 * Every constraint this storefront knows how to answer, and the field that
 * answers it. A category's data lists which of them to offer; one it cannot
 * answer is not shown at all, because a filter that silently matches nothing
 * is worse than a filter that is missing.
 */
const CONSTRAINTS = {
  director: (v) => v.director?.status === "selected",
  // A declared milk allergy needs positive evidence that the product is free
  // of milk, never the absence of a milk tag. Crawled products carry no
  // allergen tagging, so absence means "not established" — and casein, which
  // is milk protein, has no tag at all. Getting this backwards is the one
  // mistake on this page that could hurt somebody.
  milkAllergy: (v) => v.dairy_free_declared === true,
  vegan: (v) => v.vegan_declared === true,
  glutenFree: (v) => v.gluten_free_declared === true,
  soy: (v) => v.soy_free_declared === true,
  noStevia: (v) => v.stevia !== true,
  sport: (v) => v.anti_doping_documented === true,
};

/** Allergy answers are exclusive with "no allergies", as upstream. */
const ALLERGIES = ["milkAllergy", "soy"];

export function matches(g, v, s) {
  if (s.query.startsWith("product:")) {
    if ((g.product_id || g.id) !== s.query.slice(8) && v.reference_product_id !== s.query.slice(8)) return false;
  } else if (s.query.startsWith("brand:")) {
    if (g.brand !== s.query.slice(6)) return false;
  } else if (
    s.query &&
    !`${g.brand} ${g.name} ${g.flavor}`.toLowerCase().includes(s.query.trim().toLowerCase())
  ) {
    return false;
  }
  if (s.flavor !== "all" && g.flavor_group !== s.flavor) return false;
  if (s.budget !== "" && (!Number.isFinite(v.price_kwd) || v.price_kwd > Number(s.budget))) return false;
  for (const [key, holds] of Object.entries(CONSTRAINTS)) {
    if (s[key] && !holds(v)) return false;
  }
  // Missing comparison data stays visible, ordered after calculable costs.
  return true;
}

export function compareVariants(a, b, priority) {
  const metrics = { price: "price_kwd", value: "cost_per_25g", simple: "ingredient_count" };
  const metric = (v) => (metrics[priority] ? v[metrics[priority]] : 0);
  const av = metric(a);
  const bv = metric(b);
  const d = (Number.isFinite(av) ? av : Infinity) - (Number.isFinite(bv) ? bv : Infinity);
  return (Number.isNaN(d) ? 0 : d) || a.title.localeCompare(b.title, "en") || a.id.localeCompare(b.id);
}

const engine = createCatalogEngine({
  matches,
  compare: compareVariants,
  locale: "en",
});

export const selectGroups = (data, state) => engine.selectGroups(displayCatalogue(data), state);
export const selectProducts = (data, state) => engine.selectProducts(displayCatalogue(data), state);
export const recommendations = (data, state, now) => engine.recommendations(displayCatalogue(data), state, now);

// The unrestricted choice clears every allergy constraint; any restriction
// clears it. Upstream behaviour, kept.
export function withAllergyChoice(state, key, checked) {
  const next = { ...state, [key]: checked };
  if (key === "noAllergies" && checked) {
    for (const k of ALLERGIES) next[k] = false;
  } else if (ALLERGIES.includes(key) && checked) {
    next.noAllergies = false;
  }
  return next;
}
