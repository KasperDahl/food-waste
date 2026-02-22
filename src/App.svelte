<script>
  import { onMount } from 'svelte'

  /* global __API_URL__ */
  // In dev: /api/food-waste (Vite proxy adds the auth header, no token in browser).
  // In prod: the Cloudflare Worker URL (worker adds the auth header server-side).
  const API_URL = __API_URL__

  let clearances = []
  let loading = false
  let error = null
  let lastFetched = null

  // Controls
  let searchQuery = ''
  let categoryFilter = ''
  let sortKey = null
  let sortDir = 1 // 1 = ascending, -1 = descending

  async function fetchData() {
    loading = true
    error = null
    try {
      const res = await fetch(API_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status} – ${res.statusText}`)
      const data = await res.json()
      clearances = data.clearances ?? []
      lastFetched = new Date()
    } catch (e) {
      error = e.message
      clearances = []
    } finally {
      loading = false
    }
  }

  onMount(fetchData)

  // ── Sorting ────────────────────────────────────────────────────────────────
  function sortBy(key) {
    if (sortKey === key) {
      sortDir = -sortDir
    } else {
      sortKey = key
      sortDir = 1
    }
  }

  function getValue(item, key) {
    switch (key) {
      case 'description':   return item.product.description
      case 'categories':    return item.product.categories?.da ?? ''
      case 'originalPrice': return item.offer.originalPrice
      case 'newPrice':      return item.offer.newPrice
      case 'discount':      return item.offer.percentDiscount
      case 'lastUpdate':    return item.offer.lastUpdate
      case 'stock':         return item.offer.stock
      default:              return ''
    }
  }

  function sortIcon(key) {
    if (sortKey !== key) return '⇅'
    return sortDir === 1 ? '↑' : '↓'
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  $: topCategories = [
    ...new Set(clearances.map((c) => (c.product.categories?.da ?? '').split('>')[0].trim())),
  ].filter(Boolean).sort((a, b) => a.localeCompare(b, 'da'))

  $: filtered = clearances.filter((item) => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      item.product.description.toLowerCase().includes(q) ||
      (item.product.categories?.da ?? '').toLowerCase().includes(q)
    const matchesCat =
      !categoryFilter || (item.product.categories?.da ?? '').startsWith(categoryFilter)
    return matchesSearch && matchesCat
  })

  $: rows = sortKey
    ? [...filtered].sort((a, b) => {
        const av = getValue(a, sortKey)
        const bv = getValue(b, sortKey)
        if (typeof av === 'number') return (av - bv) * sortDir
        return String(av).localeCompare(String(bv), 'da') * sortDir
      })
    : filtered

  // ── Formatters ─────────────────────────────────────────────────────────────
  function formatPrice(p) {
    return p.toLocaleString('da-DK', { style: 'currency', currency: 'DKK' })
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString('da-DK', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  function formatStock(item) {
    const unit = item.offer.stockUnit === 'each' ? 'stk.' : item.offer.stockUnit
    return `${item.offer.stock} ${unit}`
  }

  function formatCategories(da) {
    return da.replace(/>/g, ' › ')
  }
</script>

<main>
  <header>
    <div class="header-left">
      <h1>Fødevarespild</h1>
      {#if lastFetched}
        <span class="last-fetched">Sidst hentet: {formatDate(lastFetched.toISOString())}</span>
      {/if}
    </div>
    <button class="refresh-btn" on:click={fetchData} disabled={loading}>
      <span class="refresh-icon" class:spinning={loading}>↻</span>
      {loading ? 'Henter…' : 'Opdater'}
    </button>
  </header>

  <div class="controls">
    <input
      type="search"
      placeholder="Søg på produkt eller kategori…"
      bind:value={searchQuery}
      aria-label="Søg"
    />
    <select bind:value={categoryFilter} aria-label="Filtrer kategori">
      <option value="">Alle kategorier</option>
      {#each topCategories as cat}
        <option value={cat}>{cat}</option>
      {/each}
    </select>
    {#if !loading}
      <span class="count">
        {rows.length}
        {rows.length === 1 ? 'produkt' : 'produkter'}
      </span>
    {/if}
  </div>

  {#if error}
    <div class="error" role="alert">
      <strong>Fejl:</strong> {error}
    </div>
  {:else if loading}
    <div class="status-message">Henter tilbud…</div>
  {:else if rows.length === 0}
    <div class="status-message">Ingen produkter fundet.</div>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="col-img">Billede</th>
            <th
              class="sortable"
              on:click={() => sortBy('description')}
              aria-sort={sortKey === 'description' ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}
            >
              Navn <span class="sort-icon">{sortIcon('description')}</span>
            </th>
            <th
              class="sortable"
              on:click={() => sortBy('categories')}
              aria-sort={sortKey === 'categories' ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}
            >
              Kategori <span class="sort-icon">{sortIcon('categories')}</span>
            </th>
            <th
              class="sortable num"
              on:click={() => sortBy('originalPrice')}
              aria-sort={sortKey === 'originalPrice' ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}
            >
              Originalpris <span class="sort-icon">{sortIcon('originalPrice')}</span>
            </th>
            <th
              class="sortable num"
              on:click={() => sortBy('newPrice')}
              aria-sort={sortKey === 'newPrice' ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}
            >
              Nypris <span class="sort-icon">{sortIcon('newPrice')}</span>
            </th>
            <th
              class="sortable num"
              on:click={() => sortBy('discount')}
              aria-sort={sortKey === 'discount' ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}
            >
              Rabat <span class="sort-icon">{sortIcon('discount')}</span>
            </th>
            <th
              class="sortable"
              on:click={() => sortBy('lastUpdate')}
              aria-sort={sortKey === 'lastUpdate' ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}
            >
              Sidst opdateret <span class="sort-icon">{sortIcon('lastUpdate')}</span>
            </th>
            <th
              class="sortable num"
              on:click={() => sortBy('stock')}
              aria-sort={sortKey === 'stock' ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}
            >
              Lager <span class="sort-icon">{sortIcon('stock')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each rows as item (item.offer.ean)}
            <tr>
              <td class="col-img">
                <img
                  src={item.product.image}
                  alt={item.product.description}
                  loading="lazy"
                  width="60"
                  height="60"
                />
              </td>
              <td class="col-name">{item.product.description}</td>
              <td class="col-cat">{formatCategories(item.product.categories?.da ?? '')}</td>
              <td class="num col-orig">{formatPrice(item.offer.originalPrice)}</td>
              <td class="num col-new">{formatPrice(item.offer.newPrice)}</td>
              <td class="num col-discount">
                <span class="badge-pct">{item.offer.percentDiscount.toFixed(0)}%</span>
                <span class="discount-amt">−{formatPrice(item.offer.discount)}</span>
              </td>
              <td class="col-date">{formatDate(item.offer.lastUpdate)}</td>
              <td class="num col-stock">{formatStock(item)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</main>

<style>
  /* ── Reset / base ───────────────────────────────────────────────────────── */
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }
  :global(body) {
    margin: 0;
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    background: #f0f4f8;
    color: #1e293b;
    font-size: 15px;
  }

  /* ── Layout ─────────────────────────────────────────────────────────────── */
  main {
    max-width: 1440px;
    margin: 0 auto;
    padding: 1.25rem 1.5rem;
  }

  /* ── Header ─────────────────────────────────────────────────────────────── */
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }

  .header-left {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    flex-wrap: wrap;
  }

  h1 {
    margin: 0;
    font-size: 1.6rem;
    font-weight: 700;
    color: #1e293b;
  }

  .last-fetched {
    font-size: 0.8rem;
    color: #94a3b8;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1.1rem;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
  }
  .refresh-btn:hover:not(:disabled) {
    background: #1d4ed8;
  }
  .refresh-btn:disabled {
    opacity: 0.65;
    cursor: default;
  }

  .refresh-icon {
    display: inline-block;
    font-size: 1rem;
    transition: transform 0.6s linear;
  }
  .refresh-icon.spinning {
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ── Controls ───────────────────────────────────────────────────────────── */
  .controls {
    display: flex;
    gap: 0.625rem;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  input[type='search'] {
    flex: 1;
    min-width: 200px;
    padding: 0.475rem 0.75rem;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 0.9rem;
    background: #fff;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  input[type='search']:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }

  select {
    padding: 0.475rem 0.75rem;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 0.9rem;
    background: #fff;
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  select:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }

  .count {
    font-size: 0.82rem;
    color: #64748b;
    white-space: nowrap;
  }

  /* ── Table wrapper ──────────────────────────────────────────────────────── */
  .table-wrap {
    overflow-x: auto;
    border-radius: 12px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.05);
    background: #fff;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  /* ── Table head ─────────────────────────────────────────────────────────── */
  thead {
    background: #f8fafc;
    border-bottom: 2px solid #e2e8f0;
    position: sticky;
    top: 0;
    z-index: 2;
  }

  th {
    padding: 0.7rem 0.9rem;
    text-align: left;
    font-weight: 600;
    color: #475569;
    white-space: nowrap;
    user-select: none;
  }
  th.num {
    text-align: right;
  }
  th.sortable {
    cursor: pointer;
  }
  th.sortable:hover {
    background: #f1f5f9;
    color: #1e293b;
  }

  .sort-icon {
    display: inline-block;
    width: 1em;
    opacity: 0.4;
    font-size: 0.75em;
    vertical-align: middle;
  }
  th.sortable:hover .sort-icon {
    opacity: 0.8;
  }

  /* ── Table body ─────────────────────────────────────────────────────────── */
  tbody tr {
    border-bottom: 1px solid #f1f5f9;
    transition: background 0.1s;
  }
  tbody tr:last-child {
    border-bottom: none;
  }
  tbody tr:hover {
    background: #f8fafc;
  }

  td {
    padding: 0.55rem 0.9rem;
    vertical-align: middle;
  }
  td.num {
    text-align: right;
  }

  /* ── Column styles ──────────────────────────────────────────────────────── */
  .col-img img {
    width: 60px;
    height: 60px;
    object-fit: contain;
    border-radius: 6px;
    display: block;
  }

  .col-name {
    font-weight: 500;
    color: #1e293b;
  }

  .col-cat {
    color: #64748b;
    font-size: 0.8rem;
    max-width: 220px;
  }

  .col-orig {
    color: #94a3b8;
    text-decoration: line-through;
  }

  .col-new {
    font-weight: 600;
    color: #16a34a;
  }

  .col-discount {
    white-space: nowrap;
  }

  .badge-pct {
    display: inline-block;
    background: #fef2f2;
    color: #dc2626;
    border-radius: 5px;
    padding: 0.1rem 0.35rem;
    font-weight: 700;
    font-size: 0.8rem;
  }

  .discount-amt {
    display: block;
    font-size: 0.77rem;
    color: #dc2626;
    margin-top: 0.15rem;
  }

  .col-date {
    color: #64748b;
    white-space: nowrap;
    font-size: 0.82rem;
  }

  .col-stock {
    font-weight: 500;
  }

  /* ── Status messages ────────────────────────────────────────────────────── */
  .status-message {
    text-align: center;
    padding: 4rem 1rem;
    color: #94a3b8;
    font-size: 1rem;
  }

  .error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    border-radius: 8px;
    padding: 0.9rem 1rem;
    margin: 0.5rem 0 1rem;
    font-size: 0.9rem;
  }
</style>
