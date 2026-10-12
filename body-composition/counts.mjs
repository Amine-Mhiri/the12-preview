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
    HEADLINE: `${reviewed} ${noun} products reviewed.`,
    HEADLINE_EMPHASIS: n === 0 ? "None has cleared the bar yet." : `Only ${n} made the cut.`,
    PROMPT:
      n === 0
        ? "Nothing here clears our floor today. We would rather show you an empty shelf than a padded one."
        : `Now choose the ${d.copy.noun} that fits you.`,
    DIRECTOR_COUNT: `${d.director_selection.selected} chosen by hand · ${n} published · ${reviewed} reviewed`,
    REVIEWED: String(reviewed),
    SELECTED: String(n),
    EXCLUDED: String(d.counts.excluded),
    PENDING: String(d.counts.pending),
    EMPTY_NOTE:
      n === 0
        ? "That is what this page is showing you today."
        : "Where a type on this page publishes nothing, it is because nothing in it cleared the floor.",
  };
}

/** Write them into every element that declares which one it shows. */
export function applyCountText(root, d) {
  const text = countText(d);
  for (const el of root.querySelectorAll("[data-count]")) {
    const value = text[el.dataset.count];
    if (value !== undefined) el.textContent = value;
  }
}
