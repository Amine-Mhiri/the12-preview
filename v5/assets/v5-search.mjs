export function matchProducts(entries, query) {
  const normalize = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const text = normalize(query).trim();
  if (text.length < 2) return [];
  const terms = text.split(/\s+/);
  return entries.filter(entry => {
    if (!/^\/p\/[a-z0-9-]+\/?$/.test(entry.href)) return false;
    const haystack = normalize([entry.brand, entry.name, entry.type, entry.ingredients].join(' '));
    return terms.every(term => haystack.includes(term));
  });
}

export function productHref(href, pageUrl) {
  if (!/^\/p\/[a-z0-9-]+\/?$/.test(href)) throw new Error('Invalid product route');
  // V5 is also the root home. Preserve a project-site prefix in either layout.
  const page = new URL(pageUrl);
  const relative = /\/v5\/(?:index\.html)?$/.test(page.pathname) ? '../' : './';
  return new URL(relative + href.slice(1).replace(/\/?$/, '/'), page).href;
}

if (typeof document !== 'undefined') {
  const button = document.querySelector('.search');
  const dialog = document.getElementById('product-search');
  const input = document.getElementById('product-search-input');
  const results = document.getElementById('product-search-results');
  const status = document.getElementById('product-search-status');
  const sourceNote = document.getElementById('product-search-source');
  let entries = null, loading = null, failed = false, previousOverflow = '', searchOpen = false;

  function render() {
    results.replaceChildren();
    if (failed) { status.textContent = 'Search could not load. Close and reopen search to try again.'; return; }
    if (!entries) { status.textContent = 'Loading search…'; return; }
    if (input.value.trim().length < 2) {
      status.textContent = 'Type at least two characters to search products, brands or declared ingredients.';
      return;
    }
    const matches = matchProducts(entries, input.value);
    status.textContent = matches.length ? `${matches.length} result${matches.length === 1 ? '' : 's'}${matches.length > 12 ? ' — showing the first 12; refine your search for more' : ''}.`
      : 'No matching products in this catalogue. Try another brand or ingredient.';
    matches.slice(0, 12).forEach(entry => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = productHref(entry.href, location.href);
      const brand = document.createElement('span'); brand.className = 'search-result-brand'; brand.textContent = entry.brand;
      const name = document.createElement('strong'); name.textContent = entry.name;
      const detail = document.createElement('span'); detail.className = 'search-result-detail';
      detail.textContent = `${entry.type} · ${entry.listed ? 'On a shelf' : 'Not on a shelf'}`;
      link.append(brand, name, detail); item.append(link); results.append(item);
    });
  }

  async function loadIndex() {
    if (entries) return;
    if (!loading) {
      failed = false;
      loading = fetch(new URL('search-data.json', import.meta.url)).then(response => {
        if (!response.ok) throw new Error('Search data unavailable');
        return response.json();
      }).then(data => {
        if (data.schema !== 1 || !Array.isArray(data.entries)) throw new Error('Invalid search data');
        entries = data.entries;
        sourceNote.textContent = data.source === 'authored'
          ? 'Product records are authored. Search does not verify current prices or availability.'
          : 'Search covers this catalogue. Check the product page for dated evidence and availability.';
      }).catch(() => { failed = true; }).finally(() => { loading = null; });
    }
    await loading;
    render();
  }

  function openSearch() {
    if (dialog.open) return;
    restorePage();
    const menu = document.getElementById('menu');
    if (menu && !menu.hidden) document.querySelector('.burger').click();
    previousOverflow = document.documentElement.style.overflow;
    searchOpen = true;
    document.documentElement.style.overflow = 'hidden';
    input.value = '';
    dialog.showModal(); button.setAttribute('aria-expanded', 'true'); input.focus();
    render(); loadIndex();
  }

  function restorePage() {
    if (!searchOpen) return;
    searchOpen = false;
    document.documentElement.style.overflow = previousOverflow;
    button.setAttribute('aria-expanded', 'false'); button.focus();
  }

  function closeSearch() {
    dialog.close();
    // Restore synchronously, including when shortcuts close and reopen quickly.
    restorePage();
  }

  button.addEventListener('click', openSearch);
  dialog.querySelector('.search-close').addEventListener('click', closeSearch);
  dialog.addEventListener('close', () => {
    if (!dialog.open) restorePage();
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeSearch();
  });
  document.addEventListener('keydown', event => {
    // A search input can consume Escape to clear itself before the native
    // dialog receives a cancel request. Always close the search in one press.
    if (event.key === 'Escape' && dialog.open) {
      event.preventDefault(); closeSearch(); return;
    }
    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
      event.preventDefault(); if (dialog.open) closeSearch(); else openSearch();
    }
  });
  input.addEventListener('input', render);
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' && results.firstElementChild) {
      event.preventDefault(); results.querySelector('a').focus();
    }
    if (event.key === 'Enter') { event.preventDefault(); results.querySelector('a')?.click(); }
  });
  results.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const links = [...results.querySelectorAll('a')];
    const index = links.indexOf(document.activeElement);
    event.preventDefault();
    const next = index + (event.key === 'ArrowDown' ? 1 : -1);
    if (next < 0) input.focus(); else links[Math.min(next, links.length - 1)]?.focus();
  });
}
