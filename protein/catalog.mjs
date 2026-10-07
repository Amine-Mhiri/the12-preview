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

export { stockState, chooseFlavor, merchantLink } from "./catalog-engine.mjs";

/** The state a page opens on. `rank` first: our ranking is the default view. */
export const DEFAULTS = Object.freeze({
  query: "",
  flavor: "all",
  budget: "",
  priority: "rank",
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
    if ((g.product_id || g.id) !== s.query.slice(8)) return false;
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
  // Sorting by a number we do not have would put the products we know least
  // about at the top, so they leave the list instead.
  if (s.priority === "value" && !Number.isFinite(v.cost_per_25g)) return false;
  return true;
}

export function compareVariants(a, b, priority) {
  const metrics = { price: "price_kwd", value: "cost_per_25g", simple: "ingredient_count", rank: "rank" };
  const score = (v) => (metrics[priority] ? v[metrics[priority]] : 0);
  const av = score(a);
  const bv = score(b);
  const d = (Number.isFinite(av) ? av : Infinity) - (Number.isFinite(bv) ? bv : Infinity);
  return (Number.isNaN(d) ? 0 : d) || a.title.localeCompare(b.title, "en") || a.id.localeCompare(b.id);
}

export const { selectGroups, selectProducts, recommendations } = createCatalogEngine({
  matches,
  compare: compareVariants,
  locale: "en",
});

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
