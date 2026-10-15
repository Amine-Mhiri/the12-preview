import {subcategoryId} from './subcategories.mjs';
/** Display projection only: admission, identities and observations remain API-owned. */
const projections = new WeakMap();
const text = value => typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() : '';
const flavorKey = value => text(value).replace(/^unflavou?red$/, 'unflavoured');
const key = parts => encodeURIComponent(JSON.stringify(parts));

export function familyId(group, variant) {
  const brand = text(group.brand), name = text(group.name), type = text(variant.type_slug);
  // Missing family evidence cannot justify combining unrelated references.
  if (!brand || !name || !type) return group.product_id || group.id;
  const declared = text(group.family_id || variant.family_id);
  return 'family-' + key([brand, type, text(variant.form), declared ? ['declared', declared] : ['name', name]]);
}

export function displayCatalogue(data) {
  if (projections.has(data)) return projections.get(data);
  const groups = new Map();
  for (const source of data.groups) {
    for (const variant of source.variants) {
      const product = familyId(source, variant);
      const flavor = variant.flavor || source.flavor || 'Unflavoured';
      const flavorGroup = variant.flavor_group || source.flavor_group;
      // Equal flavours share one selector across pack sizes, not across families.
      const id = product + '-flavor-' + key([flavorKey(flavor), flavorGroup]);
      if (!groups.has(id)) groups.set(id, {...source, id, product_id: product,
        reference_product_id: source.product_id, flavor, flavor_group: flavorGroup, variants: []});
      groups.get(id).variants.push({...variant, reference_group_id: source.id, reference_product_id: source.product_id,
        pack_key: text(variant.size), subcategory_id: subcategoryId(data.category,source,variant), flavor, flavor_group: flavorGroup});
    }
  }
  const projection = {...data, groups: [...groups.values()]};
  projections.set(data, projection);
  return projection;
}

// Only sort declared pack sizes. Never derive doses, portions or a unit cost.
function packGrams(variant) {
  if (Number.isFinite(variant.net_g) && variant.net_g > 0) return variant.net_g;
  const match = String(variant.size || '').match(/(?:^|[\s/(])([\d,]+(?:\.\d+)?)\s*(kg|g)(?=$|[\s)])/i);
  return match ? Number(match[1].replace(/,/g, '')) * (match[2].toLowerCase() === 'kg' ? 1000 : 1) : null;
}
export function comparePackSizes(a, b) {
  const left = packGrams(a), right = packGrams(b);
  if (left !== null && right !== null && left !== right) return left - right;
  return String(a.size || '').localeCompare(String(b.size || ''), 'en', {numeric: true}) || a.id.localeCompare(b.id);
}
export function chooseFlavor(product, flavorId, currentId) {
  const current = product.variants.find(v => v.id === currentId);
  const candidates = product.variants.filter(v => v.flavor_id === flavorId);
  return candidates.find(v => current?.pack_key && v.pack_key === current.pack_key)
    || candidates.find(v => Number.isFinite(current?.net_g) && current.net_g > 0 && v.net_g === current.net_g)
    || candidates[0] || null;
}
