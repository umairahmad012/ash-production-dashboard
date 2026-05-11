/* ==========================================================================
   Views · renderers for each page
   Each view returns HTML. Post-render hooks wire up charts & interactions.
   ========================================================================== */

const Views = {};
const CHARTS = {}; // registered chart instances keyed by canvas id

/* ---------------- Icon library ----------------
   Minimal line-style SVG icons. Stroke currentColor so they inherit
   the surrounding text color. Return string; embed with innerHTML. */

const ICONS = {
  dashboard: '<path d="M3 12h7V3H3v9Zm0 9h7v-6H3v6Zm11 0h7v-9h-7v9Zm0-18v6h7V3h-7Z"/>',
  deals: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6M9 9h2"/>',
  agents: '<circle cx="9" cy="7" r="3.5"/><path d="M2.5 21a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15 21a5 5 0 0 1 7 0"/>',
  expenses: '<path d="M12 2v20M18 6H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6"/>',
  monthly: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h2M8 18h2M14 14h2M14 18h2"/>',
  goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3"/>',
  underwriters: '<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
  // Lender icon — bank columns over a base, a dollar sign sketched on the
  // pediment. Same visual weight as the underwriters shield so they read
  // as a sibling section in the sidebar.
  lenders: '<path d="M3 21h18"/><path d="M5 21V10M9 21V10M15 21V10M19 21V10"/><path d="M2 10h20L12 3 2 10Z"/><path d="M12 14v3M11 15h2"/>',
  data: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6"/>',
  // Expense categories
  marketing: '<path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1Z"/><path d="M17 8a5 5 0 0 1 0 8M20 5a9 9 0 0 1 0 14"/>',
  gift: '<rect x="3" y="8" width="18" height="4"/><path d="M12 8v14"/><path d="M5 12v10h14V12"/><path d="M12 8c0-2-1-4-3-4s-3 1-3 2 1 2 3 2h3Zm0 0c0-2 1-4 3-4s3 1 3 2-1 2-3 2h-3Z"/>',
  meal: '<path d="M7 2v10M4 2v4a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V2"/><path d="M7 12v10M17 22V13a4 4 0 0 1 4-4h-1a4 4 0 0 0-4 4v9Z"/>',
  event: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><circle cx="12" cy="15" r="2.5" fill="currentColor"/>',
  sponsorship: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-2 7 5.5-3 5.5 3-2-7"/>',
  referral: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5"/><path d="m7 13 2 2 4-4"/>',
  other: '<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>',
  // Transaction types
  purchase: '<path d="M3 10h18l-2 10H5L3 10Z"/><path d="M8 10V6a4 4 0 1 1 8 0v4"/>',
  refinance: '<path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5"/>',
  subordinate: '<path d="M4 7h16M4 12h10M4 17h16"/>',
  // Actions
  upload: '<path d="M12 3v13M7 8l5-5 5 5M5 21h14"/>',
  download: '<path d="M12 3v13M7 11l5 5 5-5M5 21h14"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14M10 11v6M14 11v6"/>',
  edit: '<path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h0a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5h0a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v0a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'
};

function icon(name, size = 18) {
  const body = ICONS[name];
  if (!body) return '';
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

function expenseIconFor(t) {
  const map = {
    'Marketing': 'marketing', 'Gift': 'gift', 'Meal': 'meal',
    'Event': 'event', 'Sponsorship': 'sponsorship',
    'Referral Fee': 'referral', 'Other': 'other'
  };
  return map[t] || 'other';
}

function txIconFor(t) {
  if (t === 'Purchase') return 'purchase';
  if (t === 'Refinance') return 'refinance';
  if (t === 'Subordinate Order') return 'subordinate';
  return 'deals';
}

/* Common helpers */

/**
 * Render a sortable table header cell.
 * @param {string} field    - key used for data-sort-field
 * @param {string} label    - visible label
 * @param {object} query    - current route query object ({ sort, dir })
 * @param {string} cls      - extra th class (e.g., 'num', 'center')
 */
function sortableTH(field, label, query, cls = '') {
  const active = query.sort === field;
  const dir = active ? (query.dir || 'asc') : null;
  const arrow = active
    ? (dir === 'asc' ? '<span class="sort-arrow is-active">▲</span>' : '<span class="sort-arrow is-active">▼</span>')
    : '<span class="sort-arrow">⇅</span>';
  return `<th class="sortable ${active ? 'is-sorted' : ''} ${cls}" data-sort-field="${field}"><span class="th-label">${label}</span>${arrow}</th>`;
}

/**
 * Sort an array of objects by a field getter.
 * @param {Array}    items
 * @param {Function} getter - (item) => comparable value
 * @param {string}   dir    - 'asc' | 'desc'
 */
function sortItems(items, getter, dir = 'asc') {
  const arr = items.slice();
  arr.sort((a, b) => {
    const av = getter(a);
    const bv = getter(b);
    const aNull = av === null || av === undefined || av === '';
    const bNull = bv === null || bv === undefined || bv === '';
    if (aNull && bNull) return 0;
    if (aNull) return 1;   // empty values last
    if (bNull) return -1;
    if (typeof av === 'number' && typeof bv === 'number') {
      return dir === 'asc' ? av - bv : bv - av;
    }
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
    return dir === 'asc' ? cmp : -cmp;
  });
  return arr;
}

/**
 * Wire up click handlers on sortable th elements.
 * Clicks update the route query with sort+dir (toggles asc↔desc).
 */
function wireSortableHeaders(route, currentQuery) {
  document.querySelectorAll('th[data-sort-field]').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.getAttribute('data-sort-field');
      const curSort = currentQuery.sort;
      const curDir  = currentQuery.dir || 'asc';
      const newDir  = (curSort === field && curDir === 'asc') ? 'desc' : 'asc';
      App.navigate(route, { ...currentQuery, sort: field, dir: newDir });
    });
  });
}

function el(tag, attrs = {}, children = []) {
  // lightweight helper — used sparingly
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  }
  for (const c of children) e.append(c);
  return e;
}

function destroyAllCharts() {
  for (const id of Object.keys(CHARTS)) {
    try { CHARTS[id].destroy(); } catch {}
    delete CHARTS[id];
  }
}

// Chart.js theme constants
const CHART_COLORS = {
  forestDeep: '#0F2922',
  forestPrimary: '#1A3C34',
  forestMid: '#2D5A4E',
  forestLight: '#3D7A6B',
  gold: '#C9A84C',
  goldMid: '#D4AF37',
  goldLight: '#E8C97A',
  goldPale: '#F5E9C8',
  cream: '#F8F4EF',
  grey: '#6B6B6B',
  line: 'rgba(26, 60, 52, 0.12)'
};

const CHART_FONT = { family: 'Montserrat', size: 11, weight: '400' };

/* ========================================================================
   Dashboard
   ======================================================================== */

Views.dashboard = function(query = {}) {
  const years = Store.getYearsInData();
  const thisYear = new Date().getFullYear();
  // Default: current calendar year if it has data, else latest available, else current year
  const defaultYear = years.includes(thisYear) ? thisYear : (years[years.length - 1] || thisYear);

  // 'all' = no filter; otherwise a numeric year string
  const rawScope = query.year || String(defaultYear);
  const scopeYear = rawScope === 'all' ? null : Number(rawScope);
  const scopeLabel = scopeYear == null ? 'All Time' : String(scopeYear);

  const o = Store.getOverview(scopeYear);
  const agents = scopeYear == null ? Store.getAgents() : Store.getAgentsForYear(scopeYear);
  const topByRevenue = agents.filter(a => a.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  const topByDeals = agents.filter(a => a.dealCount > 0).sort((a, b) => b.dealCount - a.dealCount).slice(0, 8);

  // Title-company routing breakdown — respects the year filter (Q15).
  const tcBreakdown = Store.getTitleCompanyBreakdown(scopeYear);
  const tcMaxRev = Math.max(1, ...tcBreakdown.rows.map(r => r.revenue));
  const tcTotalRev = tcBreakdown.rows.reduce((s, r) => s + r.revenue, 0);
  const tcTotalDeals = tcBreakdown.rows.reduce((s, r) => s + r.dealCount, 0);

  // Chart year: if filter is All Time, default the chart to most recent year with data
  const chartYear = scopeYear != null ? scopeYear : (years[years.length - 1] || thisYear);

  const recentDeals = Store.getDeals()
    .filter(d => {
      if (!d.disbursementDate) return false;
      if (scopeYear == null) return true;
      return new Date(d.disbursementDate).getFullYear() === scopeYear;
    })
    .sort((a, b) => b.disbursementDate.localeCompare(a.disbursementDate))
    .slice(0, 6);

  // Build year options — current year first, then every year with data desc, then All Time
  const yearSet = new Set(years.map(String));
  yearSet.add(String(thisYear));  // always include current year even if no data
  const orderedYears = Array.from(yearSet).map(Number).sort((a, b) => b - a).map(String);
  const yearOptions = [...orderedYears, 'all'];
  const yearOptionsHTML = yearOptions.map(y => {
    const label = y === 'all' ? 'All Time' : y;
    const selected = String(rawScope) === y ? 'selected' : '';
    return `<option value="${y}" ${selected}>${label}</option>`;
  }).join('');

  return `
    <section class="view">
      <header class="view-header">
        <div class="view-header__left">
          <div class="eyebrow">Business Intelligence</div>
          <h1>Welcome, <em>Ashraf Abusamak.</em></h1>
        </div>
        <div class="view-header__right">
          <a href="#/deals" class="btn btn--ghost">View Deals</a>
          <button class="btn btn--gold" data-action="open-deal-modal">+ Log New Deal</button>
        </div>
      </header>

      <div class="master-filter" data-animate="hero">
        <label class="master-filter__pickerLabel" for="dashYearSelect">
          <span class="master-filter__eyebrow">Filter by Year</span>
          <div class="master-filter__picker">
            <select class="master-filter__select" id="dashYearSelect">
              ${yearOptionsHTML}
            </select>
            <span class="master-filter__caret">▾</span>
          </div>
        </label>
        <div class="master-filter__summary">
          <span class="master-filter__summaryScope">${scopeLabel}</span>
          <span class="master-filter__summaryMeta">${o.totalDeals} deal${o.totalDeals === 1 ? '' : 's'} · ${fmtMoney(o.totalRevenue, { decimals: 0 })}</span>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi">
          <div class="kpi__label">${scopeLabel} Revenue</div>
          <div class="kpi__value">${fmtMoney(o.totalRevenue, { decimals: 0 })}</div>
          <div class="kpi__delta">Across <strong>${fmtNumber(o.totalDeals)}</strong> deal${o.totalDeals === 1 ? '' : 's'}</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">${scopeLabel} Deals</div>
          <div class="kpi__value">${fmtNumber(o.totalDeals)}</div>
          <div class="kpi__delta"><strong>${o.purchaseCt}</strong> purchase · <strong>${o.refinanceCt}</strong> refi · <strong>${o.subordinateCt}</strong> sub</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Active Realtors</div>
          <div class="kpi__value">${fmtNumber(o.activeClients)}</div>
          <div class="kpi__delta">${scopeYear == null ? `of <strong>${fmtNumber(o.totalAgents)}</strong> in the database` : `with ≥1 deal in ${scopeLabel}`}</div>
        </div>
        <div class="kpi" title="Attributed revenue (${fmtMoney(o.attributedRevenue, { decimals: 0 })}) ÷ client expenses (${fmtMoney(o.totalExpenses, { decimals: 0 })}). Direct business is excluded to pair apples-to-apples with client spend.">
          <div class="kpi__label">Client ROI</div>
          <div class="kpi__value">${o.overallRoi !== null ? fmtRoi(o.overallRoi) : '—'}</div>
          <div class="kpi__delta">${fmtMoney(o.attributedRevenue, { decimals: 0 })} attributed ÷ ${fmtMoney(o.totalExpenses, { decimals: 0 })} spend</div>
        </div>
      </div>

      <!-- Where deals went — title company routing breakdown.
           Always renders both ATOZ + ATG rows so the layout is stable
           even before any deals are tagged. Bars are scaled relative to
           the larger of the two so the contrast is readable. -->
      <div class="panel title-co-breakdown">
        <div class="panel__head">
          <div>
            <h3 class="panel__title">${icon('check', 16)} Where ${scopeLabel} Deals Went</h3>
            <div class="panel__subtitle">Revenue routed to each title company · ${fmtNumber(tcTotalDeals)} deals · ${fmtMoney(tcTotalRev, { decimals: 0 })}${tcBreakdown.unassigned.dealCount ? ` · <span class="muted">${tcBreakdown.unassigned.dealCount} unassigned</span>` : ''}</div>
          </div>
        </div>
        <div class="panel__body">
          <div class="title-co-grid">
            ${tcBreakdown.rows.map(r => {
              const pct = round2((r.revenue / tcMaxRev) * 100);
              const tone = r.name === 'ATOZ Title' ? 'forest' : 'gold';
              return `
                <a href="#/deals?titleCo=${encodeURIComponent(r.name)}${scopeYear != null ? `&year=${scopeYear}` : ''}" class="title-co-card title-co-card--${tone}">
                  <div class="title-co-card__head">
                    <span class="title-co-card__badge">${r.name === 'ATOZ Title' ? 'ATOZ' : 'ATG'}</span>
                    <span class="title-co-card__name">${escapeHtml(r.name)}</span>
                  </div>
                  <div class="title-co-card__metric">
                    <div class="title-co-card__value">${fmtMoney(r.revenue, { decimals: 0 })}</div>
                    <div class="title-co-card__sub">${fmtNumber(r.dealCount)} deal${r.dealCount === 1 ? '' : 's'}${r.loanVolume ? ` · ${fmtMoney(r.loanVolume, { decimals: 0 })} loan vol` : ''}</div>
                  </div>
                  <div class="title-co-card__bar"><div class="title-co-card__bar-fill" data-target-width="${pct}" style="width:0%;"></div></div>
                </a>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel__head">
            <div>
              <h3 class="panel__title">${icon('monthly', 16)} Monthly Revenue</h3>
              <div class="panel__subtitle" id="monthlySubtitle">${chartYear} Production</div>
            </div>
          </div>
          <div class="panel__body">
            <div class="chart-wrap"><canvas id="monthlyRevenueChart"></canvas></div>
          </div>
        </div>

        <div class="panel">
          <div class="panel__head">
            <div>
              <h3 class="panel__title">${icon('deals', 16)} Transaction Mix</h3>
              <div class="panel__subtitle">Portfolio Composition</div>
            </div>
          </div>
          <div class="panel__body">
            <div class="chart-wrap"><canvas id="txMixChart"></canvas></div>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel__head">
            <div>
              <h3 class="panel__title">${icon('agents', 16)} Top Clients by Revenue</h3>
              <div class="panel__subtitle">The Front-Runners</div>
            </div>
            <a href="#/agents" class="btn btn--ghost btn--sm">All Realtors →</a>
          </div>
          <div class="panel__body">
            <div class="leaderboard">
              ${topByRevenue.length === 0 ? '<div class="empty__body">No deals yet.</div>' : topByRevenue.map((a, i) => `
                <div class="lb-row" data-agent="${escapeHtml(a.name)}">
                  <div class="lb-row__rank">0${i + 1}</div>
                  <div>
                    <div class="lb-row__name">${escapeHtml(a.name)}</div>
                    <div class="lb-row__meta">${a.dealCount} ${a.dealCount === 1 ? 'deal' : 'deals'} · ${escapeHtml(a.clientType)}</div>
                  </div>
                  <div class="lb-row__value">${fmtMoney(a.revenue, { decimals: 0 })}</div>
                  <div class="lb-row__link">View →</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel__head">
            <div>
              <h3 class="panel__title">${icon('agents', 16)} Most Active Clients</h3>
              <div class="panel__subtitle">By Deal Count</div>
            </div>
          </div>
          <div class="panel__body">
            <div class="leaderboard">
              ${topByDeals.length === 0 ? '<div class="empty__body">No deals yet.</div>' : topByDeals.map((a, i) => `
                <div class="lb-row" data-agent="${escapeHtml(a.name)}">
                  <div class="lb-row__rank">0${i + 1}</div>
                  <div>
                    <div class="lb-row__name">${escapeHtml(a.name)}</div>
                    <div class="lb-row__meta">${escapeHtml(a.clientType)} · ${fmtMoney(a.revenue, { decimals: 0 })}</div>
                  </div>
                  <div class="lb-row__value">${fmtNumber(a.dealCount)}</div>
                  <div class="lb-row__link">View →</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel__head">
          <div>
            <h3 class="panel__title">${icon('deals', 16)} Recent Deals</h3>
            <div class="panel__subtitle">Latest Disbursements</div>
          </div>
          <a href="#/deals" class="btn btn--ghost btn--sm">All Deals →</a>
        </div>
        <div class="panel__body panel__body--tight">
          <div class="table-wrap">
            <table class="data">
              <thead><tr>
                <th>Order #</th>
                <th>Property</th>
                <th>Client</th>
                <th>Type</th>
                <th>Date</th>
                <th class="num">Revenue</th>
              </tr></thead>
              <tbody>
                ${recentDeals.length === 0 ? '<tr><td colspan="6" class="center muted">No deals recorded yet.</td></tr>' : recentDeals.map(d => `
                  <tr class="is-clickable" data-deal="${d.id}">
                    <td class="cell-strong">${escapeHtml(d.orderNumber || '—')}</td>
                    <td>${escapeHtml(d.propertyAddress || '—')}</td>
                    <td>${escapeHtml(d.client || '—')}</td>
                    <td>${dealTypeTag(d.transactionType)}</td>
                    <td class="muted">${fmtDate(d.disbursementDate)}</td>
                    <td class="num cell-strong">${fmtMoney(d.revenue)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  `;
};

Views.dashboardPost = function(query = {}) {
  const years = Store.getYearsInData();
  const thisYear = new Date().getFullYear();
  const defaultYear = years.includes(thisYear) ? thisYear : (years[years.length - 1] || thisYear);
  const rawScope = query.year || String(defaultYear);
  const scopeYear = rawScope === 'all' ? null : Number(rawScope);
  const chartYear = scopeYear != null ? scopeYear : (years[years.length - 1] || thisYear);

  // Overview for scoped metrics (tx mix chart pulls from here)
  const o = Store.getOverview(scopeYear);

  buildMonthlyChart(chartYear);
  buildTxMixChart(o);

  // Animate master filter in
  Animate.heroIn('[data-animate="hero"]');
  // Animate title-company comparison bars
  Animate.growBars('.title-co-card__bar-fill[data-target-width]', { stagger: 0.08, baseDelay: 0.15 });

  // Wire year dropdown — drive route query to re-render everything
  document.getElementById('dashYearSelect')?.addEventListener('change', (e) => {
    const y = e.target.value;
    App.navigate('dashboard', y === String(defaultYear) ? {} : { year: y });
  });

  document.querySelectorAll('.lb-row').forEach(row => {
    row.addEventListener('click', () => {
      const name = row.getAttribute('data-agent');
      if (name) location.hash = '#/agent/' + encodeURIComponent(name);
    });
  });

  document.querySelectorAll('tr[data-deal]').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.getAttribute('data-deal');
      App.openDealModal(id);
    });
  });

  document.querySelector('[data-action="open-deal-modal"]')?.addEventListener('click', () => App.openDealModal());
};

function buildMonthlyChart(year) {
  const rows = Store.getMonthlyProduction(year);
  const ctx = document.getElementById('monthlyRevenueChart');
  if (!ctx) return;
  if (CHARTS.monthlyRevenueChart) CHARTS.monthlyRevenueChart.destroy();

  CHARTS.monthlyRevenueChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: rows.map(r => r.month),
      datasets: [{
        label: 'Revenue',
        data: rows.map(r => r.revenue),
        backgroundColor: CHART_COLORS.forestPrimary,
        hoverBackgroundColor: CHART_COLORS.gold,
        borderRadius: 2,
        borderSkipped: false,
        barThickness: 22
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: CHART_COLORS.forestDeep,
          titleColor: CHART_COLORS.goldLight,
          bodyColor: CHART_COLORS.cream,
          padding: 12,
          displayColors: false,
          titleFont: { family: 'Montserrat', weight: '600', size: 11 },
          bodyFont: { family: 'Cormorant Garamond', size: 18 },
          callbacks: { label: (c) => fmtMoney(c.parsed.y, { decimals: 0 }) }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: CHART_COLORS.grey, font: CHART_FONT }
        },
        y: {
          grid: { color: CHART_COLORS.line, drawBorder: false },
          ticks: {
            color: CHART_COLORS.grey,
            font: CHART_FONT,
            callback: v => fmtMoney(v, { decimals: 0, abbrev: true })
          }
        }
      }
    }
  });
}

function buildTxMixChart(o) {
  const ctx = document.getElementById('txMixChart');
  if (!ctx) return;
  if (CHARTS.txMixChart) CHARTS.txMixChart.destroy();

  CHARTS.txMixChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Purchase', 'Refinance', 'Subordinate'],
      datasets: [{
        data: [o.purchaseCt, o.refinanceCt, o.subordinateCt],
        backgroundColor: [CHART_COLORS.forestPrimary, CHART_COLORS.gold, CHART_COLORS.forestLight],
        borderColor: CHART_COLORS.cream,
        borderWidth: 4,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: CHART_COLORS.forestPrimary,
            font: { family: 'Montserrat', size: 11, weight: '600' },
            padding: 18,
            boxWidth: 10,
            boxHeight: 10
          }
        },
        tooltip: {
          backgroundColor: CHART_COLORS.forestDeep,
          titleColor: CHART_COLORS.goldLight,
          bodyColor: CHART_COLORS.cream,
          padding: 12,
          titleFont: { family: 'Montserrat', weight: '600', size: 11 },
          bodyFont: { family: 'Cormorant Garamond', size: 16 },
          callbacks: {
            label: (c) => {
              const total = c.dataset.data.reduce((s, v) => s + v, 0);
              const pct = total ? ((c.parsed / total) * 100).toFixed(0) : 0;
              return `${c.parsed} deals · ${pct}%`;
            }
          }
        }
      }
    }
  });
}

function dealTypeTag(t) {
  if (!t) return '<span class="tag tag--subordinate">—</span>';
  const cls = t === 'Purchase' ? 'purchase' : t === 'Refinance' ? 'refinance' : 'subordinate';
  return `<span class="tag tag--${cls}">${icon(txIconFor(t), 12)}<span>${escapeHtml(t)}</span></span>`;
}

// Title-company badge — strict color coding so the deals table is scannable:
// ATOZ = forest (primary brand), ATG = gold (accent). Anything else (legacy
// untagged deals) → subdued slate "Unassigned" tag.
function titleCompanyTag(tc) {
  if (tc === 'ATOZ Title') return '<span class="tag tag--forest">ATOZ</span>';
  if (tc === 'ATG Title')  return '<span class="tag tag--gold">ATG</span>';
  return '<span class="tag tag--subordinate">Unassigned</span>';
}

// Compact contact strip rendered under the entity name on detail pages.
// Skips silently when nothing's set, so legacy entries don't show empty
// chrome. Used by realtor + lender details (underwriters don't get one
// since they don't carry contact metadata).
function entityContactStripHTML(entity) {
  if (!entity) return '';
  const parts = [];
  if (entity.brokerage) parts.push(`<span><strong>${escapeHtml(entity.brokerage)}</strong></span>`);
  if (entity.phone)     parts.push(`<a href="tel:${escapeHtml(entity.phone)}">${escapeHtml(entity.phone)}</a>`);
  if (entity.email)     parts.push(`<a href="mailto:${escapeHtml(entity.email)}">${escapeHtml(entity.email)}</a>`);
  if (Array.isArray(entity.stateLicenses) && entity.stateLicenses.length) {
    parts.push(`<span class="muted">Licensed: ${entity.stateLicenses.map(s => escapeHtml(s)).join(', ')}</span>`);
  }
  if (entity.leadSource) {
    const tone = entity.leadSource === 'Direct' ? 'forest' : 'gold';
    parts.push(`<span class="tag tag--${tone}">${escapeHtml(entity.leadSource)}</span>`);
  }
  if (entity.referredBy) parts.push(`<span class="muted">Referred by ${escapeHtml(entity.referredBy)}</span>`);
  if (!parts.length) return '';
  return `<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:14px;align-items:center;font-size:13px;color:var(--charcoal,#1d1d1d);">${parts.join('<span class="muted" style="opacity:0.4;">·</span>')}</div>`;
}

/* ========================================================================
   Deals
   ======================================================================== */

Views.deals = function(query = {}) {
  const deals = Store.getDeals();
  const agents = Store.getAgents();
  const years = Store.getYearsInData();

  const search = (query.q || '').toLowerCase();
  const yearF = query.year || '';
  const typeF = query.type || '';
  const monthF = query.month || '';
  const agentF = query.agent || '';
  const titleCoF = query.titleCo || '';   // 'ATOZ Title' | 'ATG Title' | 'Unassigned' | ''

  let filtered = deals.filter(d => {
    if (yearF && d.disbursementDate) {
      if (String(new Date(d.disbursementDate).getFullYear()) !== yearF) return false;
    }
    if (monthF && d.disbursementDate) {
      const mIdx = new Date(d.disbursementDate).getMonth();
      if (MONTHS_SHORT[mIdx] !== monthF) return false;
    }
    if (typeF && d.transactionType !== typeF) return false;
    if (agentF && d.client !== agentF && d.listingAgent !== agentF && d.sellingAgent !== agentF) return false;
    if (titleCoF) {
      const dealTc = TITLE_COMPANIES.includes(d.titleCompany) ? d.titleCompany : 'Unassigned';
      if (dealTc !== titleCoF) return false;
    }
    if (search) {
      // Lender name is searchable so the user can quickly find every deal
      // funded by a particular institution.
      const blob = [d.orderNumber, d.propertyAddress, d.client, d.listingAgent, d.sellingAgent, d.lenderName]
        .filter(Boolean).join(' ').toLowerCase();
      if (!blob.includes(search)) return false;
    }
    return true;
  });

  // Apply column sort (default: disbursement DESC — newest first)
  const sortField = query.sort || 'disbursementDate';
  const sortDir   = query.dir   || (query.sort ? 'asc' : 'desc');
  const DEAL_SORT_GETTERS = {
    orderNumber:       d => d.orderNumber || '',
    listingAgent:      d => d.listingAgent || '',
    sellingAgent:      d => d.sellingAgent || '',
    client:            d => d.client || '',
    clientAttribution: d => d.clientAttribution || computeClientSource(d),
    propertyAddress:   d => d.propertyAddress || '',
    disbursementDate:  d => d.disbursementDate || '',
    transactionType:   d => d.transactionType || '',
    settlementFee:     d => Number(d.settlementFee || 0),
    lendersPolicy:     d => Number(d.lendersPolicy || 0),
    ownersPolicy:      d => Number(d.ownersPolicy || 0),
    fileFee:           d => Number(d.fileFee || 0),
    revenue:           d => Number(d.revenue || 0),
    month:             d => d.disbursementDate ? new Date(d.disbursementDate).getMonth() : -1,
    year:              d => d.disbursementDate ? new Date(d.disbursementDate).getFullYear() : 0,
    underwriter:       d => d.underwriter || '',
    lenderName:        d => d.lenderName || '',
    loanAmount:        d => Number(d.loanAmount || 0),
    purchasePrice:     d => Number(d.purchasePrice || 0),
    titleCompany:      d => d.titleCompany || ''
  };
  const getter = DEAL_SORT_GETTERS[sortField] || DEAL_SORT_GETTERS.disbursementDate;
  filtered = sortItems(filtered, getter, sortDir);

  const totalRev = filtered.reduce((s, d) => s + Number(d.revenue || 0), 0);

  return `
    <section class="view">
      <header class="view-header">
        <div class="view-header__left">
          <div class="eyebrow">Transactions</div>
          <h1>Every deal, <em>documented.</em></h1>
        </div>
        <div class="view-header__right">
          <button class="btn btn--ghost" data-action="export-all-deals">${icon('download', 14)} Export All CSV</button>
          <button class="btn btn--ghost" data-action="open-import-modal">⤒ Import CSV / Excel</button>
          <button class="btn btn--gold" data-action="open-deal-modal">+ New Deal</button>
        </div>
      </header>

      <div class="panel">
        <div class="filters">
          <div class="filters__search">
            <input type="search" id="dealSearch" value="${escapeHtml(query.q || '')}" placeholder="Search order #, address, agent, client" />
          </div>
          <select id="filterYear">
            <option value="">All years</option>
            ${years.map(y => `<option value="${y}" ${String(y) === yearF ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
          <select id="filterMonth">
            <option value="">All months</option>
            ${MONTHS_SHORT.map(m => `<option value="${m}" ${m === monthF ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
          <select id="filterType">
            <option value="">All types</option>
            ${TRANSACTION_TYPES.map(t => `<option value="${t}" ${t === typeF ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
          <select id="filterAgent">
            <option value="">All clients</option>
            ${agents.map(a => `<option value="${escapeHtml(a.name)}" ${a.name === agentF ? 'selected' : ''}>${escapeHtml(a.name)}</option>`).join('')}
          </select>
          <select id="filterTitleCo">
            <option value="">All title companies</option>
            ${TITLE_COMPANIES.map(t => `<option value="${t}" ${t === titleCoF ? 'selected' : ''}>${t}</option>`).join('')}
            <option value="Unassigned" ${titleCoF === 'Unassigned' ? 'selected' : ''}>Unassigned</option>
          </select>
        </div>

        <div class="panel__body" style="padding: 16px 32px; background: var(--forest-primary); color: var(--off-white); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="color: var(--rich-gold); font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; font-weight: 600; margin-right: 12px;">Showing</span>
            <span style="font-family: var(--serif); font-size: 22px; color: var(--off-white); font-weight: 400;">${filtered.length}</span>
            <span style="opacity: 0.7; font-size: 12px; margin-left: 6px;">of ${deals.length} deals</span>
          </div>
          <div>
            <span style="color: var(--rich-gold); font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; font-weight: 600; margin-right: 12px;">Total Revenue</span>
            <span style="font-family: var(--serif); font-size: 26px; color: var(--off-white); font-weight: 400;">${fmtMoney(totalRev, { decimals: 0 })}</span>
          </div>
        </div>

        <div class="table-wrap">
          <table class="data data--wide">
            <thead><tr>
              <th class="select-col"><input type="checkbox" class="ra-check" id="bulkSelectAll" aria-label="Select all" /></th>
              ${sortableTH('orderNumber',       'Order #',           query)}
              ${sortableTH('titleCompany',      'Title Co.',         query)}
              ${sortableTH('listingAgent',      'Listing Agent',     query)}
              ${sortableTH('sellingAgent',      'Selling Agent',     query)}
              ${sortableTH('client',            'Client',            query)}
              ${sortableTH('clientAttribution', 'Client Attribution',query)}
              ${sortableTH('propertyAddress',   'Property Address',  query)}
              ${sortableTH('disbursementDate',  'Disbursement',      query)}
              ${sortableTH('transactionType',   'Type',              query)}
              ${sortableTH('settlementFee',     'Settlement',        query, 'num')}
              ${sortableTH('lendersPolicy',     "Lender's",          query, 'num')}
              ${sortableTH('ownersPolicy',      "Owner's",           query, 'num')}
              ${sortableTH('fileFee',           'File Fee',          query, 'num')}
              ${sortableTH('revenue',           'Revenue',           query, 'num')}
              ${sortableTH('month',             'Month',             query)}
              ${sortableTH('year',              'Year',              query)}
              ${sortableTH('underwriter',       'Underwriter',       query)}
              ${sortableTH('lenderName',        'Lender',            query)}
              ${sortableTH('purchasePrice',     'Purchase Price',    query, 'num')}
              ${sortableTH('loanAmount',        'Loan Amt',          query, 'num')}
              <th class="cell-actions">Actions</th>
            </tr></thead>
            <tbody>
              ${filtered.length === 0 ? `<tr><td colspan="22" class="center muted" style="padding: 64px 20px;">No deals match your filters.</td></tr>` : filtered.map(d => {
                const attr = d.clientAttribution || computeClientSource(d);
                const attrClass = attr === 'Direct' ? 'forest' : 'gold';
                const listing = (d.listingAgent || '').trim();
                const selling = (d.sellingAgent || '').trim();
                const client  = (d.client || '').trim();
                const isListingClient = listing && (client.toLowerCase() === listing.toLowerCase() || attr === 'Both');
                const isSellingClient = selling && (client.toLowerCase() === selling.toLowerCase() || attr === 'Both');
                const dt = d.disbursementDate ? new Date(d.disbursementDate) : null;
                const month = dt && !isNaN(dt) ? dt.toLocaleString('en-US', { month: 'short' }) : '—';
                const year  = dt && !isNaN(dt) ? dt.getFullYear() : '—';
                const lender = (d.lenderName || '').trim();
                return `
                <tr class="is-clickable" data-bulk-row data-deal-row="${d.id}">
                  <td class="select-col"><input type="checkbox" class="ra-check" data-bulk-id="${d.id}" aria-label="Select ${escapeHtml(d.orderNumber || '')}" /></td>
                  <td class="cell-strong">${escapeHtml(d.orderNumber || '—')}</td>
                  <td>${titleCompanyTag(d.titleCompany)}</td>
                  <td>${listing ? `<button class="cell-agent ${isListingClient ? 'is-client' : ''}" data-set-client="${d.id}:listing" title="${isListingClient ? 'Current client' : 'Click to set as client'}">${isListingClient ? '<span class="cell-agent__star">★</span>' : ''}<span class="cell-agent__name">${escapeHtml(listing)}</span></button>` : '<span class="muted">—</span>'}</td>
                  <td>${selling ? `<button class="cell-agent ${isSellingClient ? 'is-client' : ''}" data-set-client="${d.id}:selling" title="${isSellingClient ? 'Current client' : 'Click to set as client'}">${isSellingClient ? '<span class="cell-agent__star">★</span>' : ''}<span class="cell-agent__name">${escapeHtml(selling)}</span></button>` : '<span class="muted">—</span>'}</td>
                  <td>${client ? `<a href="#/agent/${encodeURIComponent(client)}" class="cell-client-link">${escapeHtml(client)}</a>` : '<span class="muted">—</span>'}</td>
                  <td><span class="tag tag--${attrClass}">${escapeHtml(attr)}</span></td>
                  <td>${escapeHtml(d.propertyAddress || '—')}</td>
                  <td class="muted">${fmtDate(d.disbursementDate)}</td>
                  <td>${dealTypeTag(d.transactionType)}</td>
                  <td class="num">${d.settlementFee ? fmtMoney(d.settlementFee) : '—'}</td>
                  <td class="num">${d.lendersPolicy ? fmtMoney(d.lendersPolicy) : '—'}</td>
                  <td class="num">${d.ownersPolicy ? fmtMoney(d.ownersPolicy) : '—'}</td>
                  <td class="num muted">${d.fileFee ? fmtMoney(d.fileFee) : '—'}</td>
                  <td class="num cell-strong">${fmtMoney(d.revenue)}</td>
                  <td class="muted">${month}</td>
                  <td class="muted">${year}</td>
                  <td class="muted">${escapeHtml(d.underwriter || '—')}</td>
                  <td>${lender ? `<a href="#/lender/${encodeURIComponent(lender)}" class="cell-client-link">${escapeHtml(lender)}</a>` : '<span class="muted">—</span>'}</td>
                  <td class="num">${d.purchasePrice ? fmtMoney(d.purchasePrice, { decimals: 0 }) : '—'}</td>
                  <td class="num">${d.loanAmount ? fmtMoney(d.loanAmount, { decimals: 0 }) : '—'}</td>
                  <td class="cell-actions">
                    <div class="inline-actions">
                      <button class="icon-btn" data-edit-deal="${d.id}">Edit</button>
                      <button class="icon-btn icon-btn--danger" data-delete-deal="${d.id}">Delete</button>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
};

Views.dealsPost = function() {
  const apply = () => {
    const q = {
      q: document.getElementById('dealSearch').value.trim(),
      year: document.getElementById('filterYear').value,
      month: document.getElementById('filterMonth').value,
      type: document.getElementById('filterType').value,
      agent: document.getElementById('filterAgent').value,
      titleCo: document.getElementById('filterTitleCo').value,
      sort: App.currentParams?.sort || '',
      dir:  App.currentParams?.dir  || ''
    };
    App.navigate('deals', q);
  };

  document.getElementById('dealSearch').addEventListener('input', debounce(apply, 250));
  ['filterYear', 'filterMonth', 'filterType', 'filterAgent', 'filterTitleCo'].forEach(id => {
    document.getElementById(id).addEventListener('change', apply);
  });

  document.querySelector('[data-action="open-deal-modal"]')?.addEventListener('click', () => App.openDealModal());
  document.querySelector('[data-action="open-import-modal"]')?.addEventListener('click', () => App.openImportModal());
  document.querySelector('[data-action="export-all-deals"]')?.addEventListener('click', () => {
    const deals = Store.getDeals();
    if (!deals.length) return App.toast('No deals to export');
    const rows = [
      ['Order #', 'Title Company',
       'Listing Agent', 'Selling Agent', 'Client', 'Client Attribution',
       'Property Address', 'Disbursement Date', 'Transaction Type',
       'Settlement Fee', "Lender's Policy", "Owner's Policy", 'File Fee', 'Revenue',
       'Month', 'Year', 'Underwriter',
       'Lender Name', 'Purchase Price', 'Loan Amount'],
      ...deals.map(d => {
        const dt = d.disbursementDate ? new Date(d.disbursementDate) : null;
        const month = dt && !isNaN(dt) ? dt.toLocaleString('en-US', { month: 'short' }) : '';
        const year  = dt && !isNaN(dt) ? dt.getFullYear() : '';
        return [
          d.orderNumber || '', d.titleCompany || '',
          d.listingAgent || '', d.sellingAgent || '',
          d.client || '', d.clientAttribution || computeClientSource(d),
          d.propertyAddress || '', d.disbursementDate || '', d.transactionType || '',
          d.settlementFee || 0, d.lendersPolicy || 0, d.ownersPolicy || 0,
          d.fileFee || 0, d.revenue || 0,
          month, year, d.underwriter || '',
          d.lenderName || '', d.purchasePrice || 0, d.loanAmount || 0
        ];
      })
    ];
    downloadCSV(`deals-all-${new Date().toISOString().slice(0,10)}.csv`, rows);
    App.toast(`${deals.length} deal${deals.length === 1 ? '' : 's'} exported`);
  });

  // Wire clickable sort headers
  wireSortableHeaders('deals', {
    q: document.getElementById('dealSearch')?.value?.trim() || '',
    year: document.getElementById('filterYear')?.value || '',
    month: document.getElementById('filterMonth')?.value || '',
    type: document.getElementById('filterType')?.value || '',
    agent: document.getElementById('filterAgent')?.value || '',
    titleCo: document.getElementById('filterTitleCo')?.value || '',
    sort: App.currentParams?.sort,
    dir:  App.currentParams?.dir
  });
  document.querySelectorAll('[data-edit-deal]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      App.openDealModal(b.getAttribute('data-edit-deal'));
    });
  });
  // Whole-row click → opens edit. Skips when the user is interacting with
  // the bulk-select checkbox, an inline button, or a link, and skips when
  // there's an active bulk selection (so they can keep checking rows).
  document.querySelectorAll('[data-deal-row]').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.select-col, input, button, a')) return;
      if (BulkSelect.selected && BulkSelect.selected.size > 0) return;
      App.openDealModal(row.getAttribute('data-deal-row'));
    });
  });

  // Click agent name in table to set as client.
  // Behavior (simple & predictable):
  //   - Click an agent → they become the single client (★ moves)
  //   - Click the already-active agent → no-op (already the client)
  //   - To set "Both Sides" → use Edit Deal modal chip picker
  document.querySelectorAll('[data-set-client]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const [id, which] = btn.getAttribute('data-set-client').split(':');
      const d = Store.getDeal(id);
      if (!d) return;
      const listing = (d.listingAgent || '').trim();
      const selling = (d.sellingAgent || '').trim();
      const target  = which === 'listing' ? listing : selling;
      if (!target) return;

      const current     = (d.client || '').trim();
      const currentAttr = d.clientAttribution || computeClientSource(d);

      // If this agent is already the single client, no-op
      if (currentAttr !== 'Both' && current.toLowerCase() === target.toLowerCase()) return;

      const newClient = target;
      const newAttr   = which === 'listing' ? 'Listing Agent' : 'Selling Agent';

      Store.saveDeal({ ...d, client: newClient, clientAttribution: newAttr });
      App.toast(`Client set: ${newClient}`);
      App.render({ preserveScroll: true });
    });
  });
  document.querySelectorAll('[data-delete-deal]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = b.getAttribute('data-delete-deal');
      const d = Store.getDeal(id);
      if (!d) return;
      if (confirm(`Delete deal ${d.orderNumber || ''}? This cannot be undone.`)) {
        Store.deleteDeal(id);
        App.toast('Deal removed');
        App.render();
      }
    });
  });

  BulkSelect.init({
    scope: 'deals',
    itemNoun: 'deal',
    actions: [
      {
        label: 'Tag Title Co.',
        icon: 'check',
        onClick: (ids) => {
          App.openBulkTagTitleCompanyModal(ids);
        }
      },
      {
        label: 'Export CSV',
        icon: 'download',
        onClick: (ids) => {
          const deals = ids.map(id => Store.getDeal(id)).filter(Boolean);
          const rows = [
            ['Order #', 'Title Company', 'Disbursement', 'Property Address', 'Client', 'Listing Agent', 'Selling Agent', 'Source', 'Type', 'Settlement Fee', 'Lender Policy', 'Owner Policy', 'File Fee', 'Revenue', 'Lender Name', 'Purchase Price', 'Loan Amount'],
            ...deals.map(d => [
              d.orderNumber || '', d.titleCompany || '',
              d.disbursementDate || '', d.propertyAddress || '',
              d.client || '', d.listingAgent || '', d.sellingAgent || '',
              d.clientAttribution || computeClientSource(d),
              d.transactionType || '',
              d.settlementFee || 0, d.lendersPolicy || 0, d.ownersPolicy || 0,
              d.fileFee || 0, d.revenue || 0,
              d.lenderName || '', d.purchasePrice || 0, d.loanAmount || 0
            ])
          ];
          downloadCSV(`deals-export-${new Date().toISOString().slice(0,10)}.csv`, rows);
          App.toast(`${deals.length} deal${deals.length === 1 ? '' : 's'} exported`);
        }
      },
      {
        label: 'Recalculate',
        icon: 'settings',
        onClick: (ids) => {
          let changed = 0;
          for (const id of ids) {
            const d = Store.getDeal(id);
            if (!d) continue;
            const newFee = computeFileFee(d.transactionType);
            const newRev = computeRevenue(d);
            if (d.fileFee !== newFee || d.revenue !== newRev) {
              Store.saveDeal({ ...d, fileFee: newFee, revenue: newRev });
              changed++;
            }
          }
          App.toast(`${changed} deal${changed === 1 ? '' : 's'} recalculated`);
          App.render();
        }
      },
      {
        label: 'Delete',
        icon: 'trash',
        danger: true,
        onClick: (ids) => {
          if (!confirm(`Delete ${ids.length} deal${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
          const n = Store.deleteDeals(ids);
          App.toast(`${n} deal${n === 1 ? '' : 's'} removed`);
          App.render();
        }
      }
    ]
  });
};

/* ========================================================================
   Agents (Realtor Database)
   ======================================================================== */

Views.agents = function(query = {}) {
  const years = Store.getYearsInData();
  // Year filter: '' = all-time (default), otherwise a numeric year string.
  // Year-scoped rollups (revenue/expenses/ROI) reflect only deals + expenses
  // dated in that year; all-time uses the standard aggregator.
  const yearF = query.year || '';
  const agents = yearF
    ? Store.getAgentsForYear(Number(yearF))
    : Store.getAgents();
  const search = (query.q || '').toLowerCase();

  let filtered = agents.filter(a => !search || a.name.toLowerCase().includes(search));

  const sortField = query.sort || 'revenue';
  const sortDir   = query.dir  || (query.sort ? 'asc' : 'desc');
  const AGENT_SORT_GETTERS = {
    name:       a => a.name || '',
    clientType: a => a.clientType || '',
    isActive:   a => a.isActive ? 1 : 0,
    dealCount:  a => Number(a.dealCount || 0),
    revenue:    a => Number(a.revenue || 0),
    avgRevenue: a => Number(a.avgRevenue || 0),
    expenses:   a => Number(a.expenses || 0),
    roi:        a => Number(a.roi || 0),
    firstDeal:  a => a.firstDeal || '',
    lastDeal:   a => a.lastDeal || ''
  };
  const getter = AGENT_SORT_GETTERS[sortField] || AGENT_SORT_GETTERS.revenue;
  filtered = sortItems(filtered, getter, sortDir);

  const activeCount = agents.filter(a => a.isActive).length;

  return `
    <section class="view">
      <header class="view-header">
        <div class="view-header__left">
          <div class="eyebrow">Realtor Database</div>
          <h1>The <em>people</em> behind the production.</h1>
        </div>
        <div class="view-header__right">
          <span class="muted" style="font-size: 12px; letter-spacing: 1px; margin-right: 12px;">${activeCount} active · ${agents.length} total${yearF ? ` in ${yearF}` : ''}</span>
          <button class="btn btn--ghost" data-action="export-all-agents">${icon('download', 14)} Export All CSV</button>
        </div>
      </header>

      <div class="panel">
        <div class="filters">
          <div class="filters__search">
            <input type="search" id="agentSearch" value="${escapeHtml(query.q || '')}" placeholder="Search by name" />
          </div>
          <select id="filterAgentYear">
            <option value="">All time</option>
            ${years.map(y => `<option value="${y}" ${String(y) === yearF ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
          <div class="filters__hint muted" style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; padding: 0 6px;">Click any column header to sort</div>
        </div>

        <div class="table-wrap">
          <table class="data">
            <thead><tr>
              <th class="select-col"><input type="checkbox" class="ra-check" id="bulkSelectAll" aria-label="Select all" /></th>
              ${sortableTH('name',       'Name',       query)}
              ${sortableTH('clientType', 'Type',       query)}
              ${sortableTH('isActive',   'Active',     query, 'center')}
              ${sortableTH('dealCount',  'Deals',      query, 'num')}
              ${sortableTH('revenue',    'Revenue',    query, 'num')}
              ${sortableTH('avgRevenue', 'Avg / Deal', query, 'num')}
              ${sortableTH('expenses',   'Expenses',   query, 'num')}
              ${sortableTH('roi',        'ROI',        query, 'num')}
              ${sortableTH('firstDeal',  'First Deal', query)}
              ${sortableTH('lastDeal',   'Last Deal',  query)}
              <th class="cell-actions">Actions</th>
            </tr></thead>
            <tbody>
              ${filtered.length === 0 ? '<tr><td colspan="12" class="center muted" style="padding: 64px 20px;">No realtors match.</td></tr>' : filtered.map(a => `
                <tr class="is-clickable" data-agent="${escapeHtml(a.name)}" data-bulk-row>
                  <td class="select-col"><input type="checkbox" class="ra-check" data-bulk-id="${escapeHtml(a.name)}" aria-label="Select ${escapeHtml(a.name)}" /></td>
                  <td class="cell-strong">${escapeHtml(a.name)}</td>
                  <td><span class="tag tag--${a.clientType === 'Both' ? 'gold' : 'forest'}">${escapeHtml(a.clientType)}</span></td>
                  <td class="center">${a.isActive ? '●' : '<span class="muted">—</span>'}</td>
                  <td class="num">${fmtNumber(a.dealCount)}</td>
                  <td class="num cell-strong">${fmtMoney(a.revenue, { decimals: 0 })}</td>
                  <td class="num">${a.avgRevenue ? fmtMoney(a.avgRevenue, { decimals: 0 }) : '—'}</td>
                  <td class="num muted">${a.expenses ? fmtMoney(a.expenses, { decimals: 0 }) : '—'}</td>
                  <td class="num">${fmtRoi(a.roi)}</td>
                  <td class="muted">${fmtDate(a.firstDeal)}</td>
                  <td class="muted">${fmtDate(a.lastDeal)}</td>
                  <td class="cell-actions"><button class="icon-btn" data-edit-agent="${escapeHtml(a.name)}" title="Rename / set budget">Edit</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
};

Views.agentsPost = function() {
  const apply = () => {
    App.navigate('agents', {
      q: document.getElementById('agentSearch').value.trim(),
      year: document.getElementById('filterAgentYear')?.value || '',
      sort: App.currentParams?.sort || '',
      dir:  App.currentParams?.dir  || ''
    });
  };
  document.getElementById('agentSearch').addEventListener('input', debounce(apply, 250));
  document.getElementById('filterAgentYear')?.addEventListener('change', apply);

  wireSortableHeaders('agents', {
    q: document.getElementById('agentSearch')?.value?.trim() || '',
    year: document.getElementById('filterAgentYear')?.value || '',
    sort: App.currentParams?.sort,
    dir:  App.currentParams?.dir
  });

  document.querySelector('[data-action="export-all-agents"]')?.addEventListener('click', () => {
    const agents = Store.getAgents();
    if (!agents.length) return App.toast('No realtors to export');
    const rows = [
      ['Name', 'Type', 'Active', 'Deal Count', 'Purchase', 'Refinance', 'Subordinate',
       'Revenue', 'Avg per Deal', 'Expenses', 'Cost per Deal', 'ROI',
       'First Deal', 'Last Deal', 'Days Active'],
      ...agents.map(a => [
        a.name, a.clientType, a.isActive ? 'Active' : 'Inactive',
        a.dealCount, a.purchase, a.refinance, a.subordinate,
        a.revenue, a.avgRevenue, a.expenses, a.costPerDeal,
        a.roi === 999 ? 'Infinite' : a.roi,
        a.firstDeal || '', a.lastDeal || '', a.daysAsClient
      ])
    ];
    downloadCSV(`realtors-all-${new Date().toISOString().slice(0,10)}.csv`, rows);
    App.toast(`${agents.length} realtor${agents.length === 1 ? '' : 's'} exported`);
  });

  document.querySelectorAll('tr[data-agent]').forEach(row => {
    row.addEventListener('click', (e) => {
      // Don't navigate when interacting with the checkbox or when a selection is active
      if (e.target.closest('.select-col, input, button, a')) return;
      if (BulkSelect.selected && BulkSelect.selected.size > 0) return;
      location.hash = '#/agent/' + encodeURIComponent(row.getAttribute('data-agent'));
    });
  });
  document.querySelectorAll('[data-edit-agent]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      App.openEntityEditModal('realtor', btn.getAttribute('data-edit-agent'));
    });
  });

  BulkSelect.init({
    scope: 'agents',
    itemNoun: 'realtor',
    actions: [
      {
        label: 'Export CSV',
        icon: 'download',
        onClick: (names) => {
          const agents = names.map(n => Store.getAgent(n)).filter(Boolean);
          const rows = [
            ['Name', 'Type', 'Active', 'Deal Count', 'Purchase', 'Refinance', 'Subordinate', 'Revenue', 'Avg per Deal', 'Expenses', 'Cost per Deal', 'ROI', 'First Deal', 'Last Deal', 'Days Active'],
            ...agents.map(a => [
              a.name, a.clientType, a.isActive ? 'Active' : 'Inactive',
              a.dealCount, a.purchase, a.refinance, a.subordinate,
              a.revenue, a.avgRevenue, a.expenses, a.costPerDeal,
              a.roi === 999 ? 'Infinite' : a.roi,
              a.firstDeal || '', a.lastDeal || '', a.daysAsClient
            ])
          ];
          downloadCSV(`realtors-export-${new Date().toISOString().slice(0,10)}.csv`, rows);
          App.toast(`${agents.length} realtor${agents.length === 1 ? '' : 's'} exported`);
        }
      },
      {
        label: 'View Their Deals',
        icon: 'deals',
        primary: true,
        onClick: (names) => {
          if (names.length === 1) {
            location.hash = '#/agent/' + encodeURIComponent(names[0]);
          } else {
            App.toast('Tip: click a single realtor to open their profile');
          }
        }
      },
      {
        label: 'Delete All Deals',
        icon: 'trash',
        danger: true,
        onClick: (names) => {
          const dealIds = Store.getDeals()
            .filter(d => names.includes(d.client))
            .map(d => d.id);
          if (dealIds.length === 0) {
            App.toast('No credited deals to delete for the selected realtors');
            return;
          }
          if (!confirm(`Delete ${dealIds.length} deal${dealIds.length === 1 ? '' : 's'} credited to ${names.length} realtor${names.length === 1 ? '' : 's'}? Realtors with no remaining activity will disappear. This cannot be undone.`)) return;
          const n = Store.deleteDeals(dealIds);
          App.toast(`${n} deal${n === 1 ? '' : 's'} removed`);
          App.render();
        }
      }
    ]
  });
};

/* ========================================================================
   Underwriters database (list)
   ======================================================================== */

Views.underwriters = function(query = {}) {
  const years = Store.getYearsInData();
  const yearF = query.year || '';
  const underwriters = yearF
    ? Store.getUnderwritersForYear(Number(yearF))
    : Store.getUnderwriters();
  const search = (query.q || '').toLowerCase();

  let filtered = underwriters.filter(u => !search || u.name.toLowerCase().includes(search));

  const sortField = query.sort || 'dealCount';
  const sortDir   = query.dir  || (query.sort ? 'asc' : 'desc');
  const UW_SORT_GETTERS = {
    name:         u => u.name || '',
    dealCount:    u => Number(u.dealCount || 0),
    revenue:      u => Number(u.revenue || 0),
    ownersPolicy: u => Number(u.ownersPolicy || 0),
    lendersPolicy:u => Number(u.lendersPolicy || 0),
    totalPremium: u => Number(u.totalPremium || 0),
    avgPremium:   u => Number(u.avgPremium || 0),
    firstDeal:    u => u.firstDeal || '',
    lastDeal:     u => u.lastDeal || ''
  };
  const getter = UW_SORT_GETTERS[sortField] || UW_SORT_GETTERS.dealCount;
  filtered = sortItems(filtered, getter, sortDir);

  const totalDeals = underwriters.reduce((s, u) => s + u.dealCount, 0);
  const totalPremium = underwriters.reduce((s, u) => s + u.totalPremium, 0);

  return `
    <section class="view">
      <header class="view-header">
        <div class="view-header__left">
          <div class="eyebrow">Title Insurance Partners</div>
          <h1>Every policy, <em>underwritten.</em></h1>
        </div>
        <div class="view-header__right">
          <span class="muted" style="font-size: 12px; letter-spacing: 1px; margin-right: 12px;">${underwriters.length} underwriter${underwriters.length === 1 ? '' : 's'} · ${totalDeals} total deals${yearF ? ` in ${yearF}` : ''}</span>
          <button class="btn btn--ghost" data-action="export-all-underwriters">${icon('download', 14)} Export All CSV</button>
        </div>
      </header>

      <div class="panel">
        <div class="panel__body panel__body--summary">
          <div class="summary-hero" data-animate="hero">
            <div class="summary-hero__label">Total Premium Volume</div>
            <div class="summary-hero__value" data-countup="${totalPremium.toFixed(0)}">${fmtMoney(totalPremium, { decimals: 0 })}</div>
            <div class="summary-hero__meta">
              <span class="summary-hero__metaItem"><span class="summary-hero__metaValue">${totalDeals}</span> deals</span>
              <span class="summary-hero__metaDot"></span>
              <span class="summary-hero__metaItem">Across <span class="summary-hero__metaValue">${underwriters.length}</span> underwriters</span>
            </div>
          </div>
        </div>

        <div class="filters">
          <div class="filters__search">
            <input type="search" id="uwSearch" value="${escapeHtml(query.q || '')}" placeholder="Search by underwriter name" />
          </div>
          <select id="filterUwYear">
            <option value="">All time</option>
            ${years.map(y => `<option value="${y}" ${String(y) === yearF ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
          <div class="filters__hint muted" style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; padding: 0 6px;">Click a row for detail</div>
        </div>

        <div class="table-wrap">
          <table class="data">
            <thead><tr>
              ${sortableTH('name',         'Underwriter',    query)}
              ${sortableTH('dealCount',    'Deals',          query, 'num')}
              ${sortableTH('ownersPolicy', "Owner's Policy", query, 'num')}
              ${sortableTH('lendersPolicy', "Lender's Policy", query, 'num')}
              ${sortableTH('totalPremium', 'Total Premium',  query, 'num')}
              ${sortableTH('avgPremium',   'Avg / Deal',     query, 'num')}
              ${sortableTH('revenue',      'Revenue',        query, 'num')}
              ${sortableTH('firstDeal',    'First Deal',     query)}
              ${sortableTH('lastDeal',     'Last Deal',      query)}
              <th class="cell-actions">Actions</th>
            </tr></thead>
            <tbody>
              ${filtered.length === 0 ? `<tr><td colspan="10" class="center muted" style="padding: 64px 20px;">No underwriters recorded yet. Add an underwriter name to any deal to start tracking.</td></tr>` : filtered.map(u => `
                <tr class="is-clickable" data-underwriter="${escapeHtml(u.name)}">
                  <td class="cell-strong">${escapeHtml(u.name)}</td>
                  <td class="num cell-strong">${fmtNumber(u.dealCount)}</td>
                  <td class="num">${u.ownersPolicy ? fmtMoney(u.ownersPolicy, { decimals: 0 }) : '—'}</td>
                  <td class="num">${u.lendersPolicy ? fmtMoney(u.lendersPolicy, { decimals: 0 }) : '—'}</td>
                  <td class="num cell-strong">${u.totalPremium ? fmtMoney(u.totalPremium, { decimals: 0 }) : '—'}</td>
                  <td class="num muted">${u.avgPremium ? fmtMoney(u.avgPremium, { decimals: 0 }) : '—'}</td>
                  <td class="num">${fmtMoney(u.revenue, { decimals: 0 })}</td>
                  <td class="muted">${fmtDate(u.firstDeal)}</td>
                  <td class="muted">${fmtDate(u.lastDeal)}</td>
                  <td class="cell-actions"><button class="icon-btn" data-edit-uw="${escapeHtml(u.name)}" title="Rename">Edit</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
};

Views.underwritersPost = function() {
  Animate.heroIn('[data-animate="hero"]');
  Animate.countUp('.summary-hero__value[data-countup]', { duration: 1.2 });

  const apply = () => App.navigate('underwriters', {
    q: document.getElementById('uwSearch')?.value?.trim() || '',
    year: document.getElementById('filterUwYear')?.value || '',
    sort: App.currentParams?.sort || '',
    dir:  App.currentParams?.dir  || ''
  });
  document.getElementById('uwSearch')?.addEventListener('input', debounce(apply, 250));
  document.getElementById('filterUwYear')?.addEventListener('change', apply);

  wireSortableHeaders('underwriters', {
    q: document.getElementById('uwSearch')?.value?.trim() || '',
    year: document.getElementById('filterUwYear')?.value || '',
    sort: App.currentParams?.sort,
    dir:  App.currentParams?.dir
  });

  document.querySelector('[data-action="export-all-underwriters"]')?.addEventListener('click', () => {
    const rows = [
      ['Underwriter', 'Deals', "Owner's Policy", "Lender's Policy", 'Total Premium', 'Avg Premium / Deal', 'Purchase Volume', 'Avg Purchase / Deal', 'Revenue', 'Purchase', 'Refinance', 'Subordinate', 'First Deal', 'Last Deal'],
      ...Store.getUnderwriters().map(u => [
        u.name, u.dealCount, u.ownersPolicy, u.lendersPolicy, u.totalPremium,
        u.avgPremium,
        u.purchaseVolume || 0, u.avgPurchase || 0,
        u.revenue,
        u.purchase, u.refinance, u.subordinate,
        u.firstDeal || '', u.lastDeal || ''
      ])
    ];
    downloadCSV(`underwriters-all-${new Date().toISOString().slice(0,10)}.csv`, rows);
    App.toast(`${Store.getUnderwriters().length} underwriter${Store.getUnderwriters().length === 1 ? '' : 's'} exported`);
  });

  document.querySelectorAll('tr[data-underwriter]').forEach(row => {
    row.addEventListener('click', () => {
      location.hash = '#/underwriter/' + encodeURIComponent(row.getAttribute('data-underwriter'));
    });
  });
  document.querySelectorAll('[data-edit-uw]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      App.openEntityEditModal('underwriter', btn.getAttribute('data-edit-uw'));
    });
  });
};

/* ========================================================================
   Underwriter detail
   ======================================================================== */

Views.underwriterDetail = function(name) {
  const uw = Store.getUnderwriter(name);
  if (!uw) {
    return `
      <section class="view">
        <header class="view-header">
          <div class="view-header__left">
            <a href="#/underwriters" class="breadcrumb">← All Underwriters</a>
            <h1>Underwriter not found.</h1>
          </div>
        </header>
      </section>
    `;
  }

  const deals = Store.getDealsForUnderwriter(name)
    .slice()
    .sort((a, b) => (b.disbursementDate || '').localeCompare(a.disbursementDate || ''));

  return `
    <section class="view">
      <header class="view-header">
        <div class="view-header__left">
          <a href="#/underwriters" class="breadcrumb">← All Underwriters</a>
          <div class="eyebrow">Title Insurance Underwriter</div>
          <h1>${escapeHtml(uw.name)}</h1>
        </div>
        <div class="view-header__right">
          <button class="btn btn--ghost" data-action="edit-uw">${icon('settings', 14)} Edit</button>
          <button class="btn btn--ghost" data-action="export-uw-deals">${icon('download', 14)} Export Deals</button>
        </div>
      </header>

      <div class="stat-cards">
        <div class="stat-card" data-animate="card">
          <div class="stat-card__label">Total Deals</div>
          <div class="stat-card__value" data-countup="${uw.dealCount}">${fmtNumber(uw.dealCount)}</div>
          <div class="stat-card__meta">${uw.purchase} Purchase · ${uw.refinance} Refi · ${uw.subordinate} Sub</div>
        </div>
        <div class="stat-card" data-animate="card">
          <div class="stat-card__label">Total Purchase Volume</div>
          <div class="stat-card__value" data-countup="${(uw.purchaseVolume || 0).toFixed(0)}">${fmtMoney(uw.purchaseVolume || 0, { decimals: 0 })}</div>
          <div class="stat-card__meta">Avg ${fmtMoney(uw.avgPurchase || 0, { decimals: 0 })} / deal</div>
        </div>
        <div class="stat-card" data-animate="card">
          <div class="stat-card__label">Owner's Policy Volume</div>
          <div class="stat-card__value" data-countup="${uw.ownersPolicy.toFixed(0)}">${fmtMoney(uw.ownersPolicy, { decimals: 0 })}</div>
        </div>
        <div class="stat-card" data-animate="card">
          <div class="stat-card__label">Lender's Policy Volume</div>
          <div class="stat-card__value" data-countup="${uw.lendersPolicy.toFixed(0)}">${fmtMoney(uw.lendersPolicy, { decimals: 0 })}</div>
        </div>
        <div class="stat-card stat-card--featured" data-animate="card">
          <div class="stat-card__label">Total Premium</div>
          <div class="stat-card__value" data-countup="${uw.totalPremium.toFixed(0)}">${fmtMoney(uw.totalPremium, { decimals: 0 })}</div>
          <div class="stat-card__meta">Avg ${fmtMoney(uw.avgPremium, { decimals: 0 })} / deal</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel__head">
          <div>
            <h3 class="panel__title">${icon('deals', 16)} All Deals Underwritten</h3>
            <div class="panel__subtitle">${deals.length} deal${deals.length === 1 ? '' : 's'} sent to ${escapeHtml(uw.name)}</div>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data">
            <thead><tr>
              <th>Underwriter</th>
              <th>File Number</th>
              <th>Disbursement</th>
              <th>Type</th>
              <th class="num">Owner's Policy</th>
              <th class="num">Lender's Policy</th>
              <th class="num">Total</th>
            </tr></thead>
            <tbody>
              ${deals.length === 0 ? '<tr><td colspan="7" class="center muted" style="padding: 48px 20px;">No deals on file for this underwriter.</td></tr>' : deals.map(d => {
                const total = Number(d.ownersPolicy || 0) + Number(d.lendersPolicy || 0);
                return `
                <tr>
                  <td class="muted">${escapeHtml(uw.name)}</td>
                  <td class="cell-strong">${escapeHtml(d.orderNumber || '—')}</td>
                  <td class="muted">${fmtDate(d.disbursementDate)}</td>
                  <td>${dealTypeTag(d.transactionType)}</td>
                  <td class="num">${d.ownersPolicy ? fmtMoney(d.ownersPolicy) : '—'}</td>
                  <td class="num">${d.lendersPolicy ? fmtMoney(d.lendersPolicy) : '—'}</td>
                  <td class="num cell-strong">${total ? fmtMoney(total) : '—'}</td>
                </tr>`;
              }).join('')}
              ${deals.length > 0 ? `
                <tr class="totals-row">
                  <td colspan="4" class="num"><strong>Totals</strong></td>
                  <td class="num cell-strong">${fmtMoney(uw.ownersPolicy)}</td>
                  <td class="num cell-strong">${fmtMoney(uw.lendersPolicy)}</td>
                  <td class="num cell-strong">${fmtMoney(uw.totalPremium)}</td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
};

Views.underwriterDetailPost = function(name) {
  Animate.staggerIn('[data-animate="card"]', { stagger: 0.06 });
  Animate.countUp('.stat-card__value[data-countup]', { duration: 0.9 });

  document.querySelector('[data-action="export-uw-deals"]')?.addEventListener('click', () => {
    const uw = Store.getUnderwriter(name);
    const deals = Store.getDealsForUnderwriter(name);
    if (!deals.length) return App.toast('No deals to export');
    const rows = [
      ['Underwriter', 'File Number', 'Disbursement Date', 'Transaction Type', "Owner's Policy", "Lender's Policy", 'Total'],
      ...deals.map(d => [
        uw.name,
        d.orderNumber || '',
        d.disbursementDate || '',
        d.transactionType || '',
        Number(d.ownersPolicy || 0),
        Number(d.lendersPolicy || 0),
        Number(d.ownersPolicy || 0) + Number(d.lendersPolicy || 0)
      ])
    ];
    const filename = `underwriter-${name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`;
    downloadCSV(filename, rows);
    App.toast(`${deals.length} deal${deals.length === 1 ? '' : 's'} exported`);
  });

  document.querySelector('[data-action="edit-uw"]')?.addEventListener('click', () => {
    App.openEntityEditModal('underwriter', name);
  });
};

/* ========================================================================
   Lenders database (list)
   Mirrors the Realtor Database structure but the headline metric is total
   loan volume, not revenue. Lenders also carry a sidecar `budgetTarget`
   (set via the rename/edit modal) so each profile can show spend-vs-budget.
   ======================================================================== */

Views.lenders = function(query = {}) {
  const years = Store.getYearsInData();
  const yearF = query.year || '';
  const lenders = yearF
    ? Store.getLendersForYear(Number(yearF))
    : Store.getLenders();
  const search = (query.q || '').toLowerCase();

  let filtered = lenders.filter(l => !search || l.name.toLowerCase().includes(search));

  const sortField = query.sort || 'loanAmount';
  const sortDir   = query.dir  || (query.sort ? 'asc' : 'desc');
  const LENDER_SORT_GETTERS = {
    name:           l => l.name || '',
    dealCount:      l => Number(l.dealCount || 0),
    loanAmount:     l => Number(l.loanAmount || 0),
    purchaseVolume: l => Number(l.purchaseVolume || 0),
    avgLoan:        l => Number(l.avgLoan || 0),
    revenue:        l => Number(l.revenue || 0),
    expenses:       l => Number(l.expenses || 0),
    roi:            l => Number(l.roi || 0),
    costPerDeal:    l => Number(l.costPerDeal || 0),
    firstDeal:      l => l.firstDeal || '',
    lastDeal:       l => l.lastDeal || ''
  };
  const getter = LENDER_SORT_GETTERS[sortField] || LENDER_SORT_GETTERS.loanAmount;
  filtered = sortItems(filtered, getter, sortDir);

  const totalLoan = lenders.reduce((s, l) => s + l.loanAmount, 0);
  const totalDeals = lenders.reduce((s, l) => s + l.dealCount, 0);
  const totalSpent = lenders.reduce((s, l) => s + l.expenses, 0);

  return `
    <section class="view">
      <header class="view-header">
        <div class="view-header__left">
          <div class="eyebrow">Lender Partners</div>
          <h1>Every loan, <em>partnered.</em></h1>
        </div>
        <div class="view-header__right">
          <span class="muted" style="font-size: 12px; letter-spacing: 1px; margin-right: 12px;">${lenders.length} lender${lenders.length === 1 ? '' : 's'} · ${totalDeals} total deals${yearF ? ` in ${yearF}` : ''}</span>
          <button class="btn btn--ghost" data-action="export-all-lenders">${icon('download', 14)} Export All CSV</button>
        </div>
      </header>

      <div class="panel">
        <div class="panel__body panel__body--summary">
          <div class="summary-hero" data-animate="hero">
            <div class="summary-hero__label">Total Loan Volume</div>
            <div class="summary-hero__value" data-countup="${totalLoan.toFixed(0)}">${fmtMoney(totalLoan, { decimals: 0 })}</div>
            <div class="summary-hero__meta">
              <span class="summary-hero__metaItem"><span class="summary-hero__metaValue">${totalDeals}</span> deals funded</span>
              <span class="summary-hero__metaDot"></span>
              <span class="summary-hero__metaItem">Across <span class="summary-hero__metaValue">${lenders.length}</span> lenders</span>
              <span class="summary-hero__metaDot"></span>
              <span class="summary-hero__metaItem"><span class="summary-hero__metaValue">${fmtMoney(totalSpent, { decimals: 0 })}</span> invested in relationships</span>
            </div>
          </div>
        </div>

        <div class="filters">
          <div class="filters__search">
            <input type="search" id="lenderSearch" value="${escapeHtml(query.q || '')}" placeholder="Search by lender name" />
          </div>
          <select id="filterLenderYear">
            <option value="">All time</option>
            ${years.map(y => `<option value="${y}" ${String(y) === yearF ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
          <div class="filters__hint muted" style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; padding: 0 6px;">Click a row for detail · Edit to rename or set a budget</div>
        </div>

        <div class="table-wrap">
          <table class="data">
            <thead><tr>
              ${sortableTH('name',           'Lender',          query)}
              ${sortableTH('dealCount',      'Deals',           query, 'num')}
              ${sortableTH('loanAmount',     'Loan Volume',     query, 'num')}
              ${sortableTH('purchaseVolume', 'Purchase Volume', query, 'num')}
              ${sortableTH('avgLoan',        'Avg Loan',        query, 'num')}
              ${sortableTH('revenue',        'Revenue',         query, 'num')}
              ${sortableTH('expenses',       'Spent',           query, 'num')}
              ${sortableTH('roi',            'ROI',             query, 'num')}
              ${sortableTH('costPerDeal',    'Cost / Deal',     query, 'num')}
              ${sortableTH('firstDeal',      'First Deal',      query)}
              ${sortableTH('lastDeal',       'Last Deal',       query)}
              <th class="cell-actions">Actions</th>
            </tr></thead>
            <tbody>
              ${filtered.length === 0 ? `<tr><td colspan="12" class="center muted" style="padding: 64px 20px;">No lenders yet. Add a lender name to any deal to start tracking.</td></tr>` : filtered.map(l => `
                <tr class="is-clickable" data-lender="${escapeHtml(l.name)}">
                  <td class="cell-strong">${escapeHtml(l.name)}</td>
                  <td class="num cell-strong">${fmtNumber(l.dealCount)}</td>
                  <td class="num cell-strong">${l.loanAmount ? fmtMoney(l.loanAmount, { decimals: 0 }) : '—'}</td>
                  <td class="num">${l.purchaseVolume ? fmtMoney(l.purchaseVolume, { decimals: 0 }) : '—'}</td>
                  <td class="num muted">${l.avgLoan ? fmtMoney(l.avgLoan, { decimals: 0 }) : '—'}</td>
                  <td class="num">${fmtMoney(l.revenue, { decimals: 0 })}</td>
                  <td class="num">${l.expenses ? fmtMoney(l.expenses, { decimals: 0 }) : '—'}</td>
                  <td class="num">${fmtRoi(l.roi)}</td>
                  <td class="num muted">${l.costPerDeal ? fmtMoney(l.costPerDeal, { decimals: 0 }) : '—'}</td>
                  <td class="muted">${fmtDate(l.firstDeal)}</td>
                  <td class="muted">${fmtDate(l.lastDeal)}</td>
                  <td class="cell-actions"><button class="icon-btn" data-edit-lender="${escapeHtml(l.name)}" title="Rename / set budget">Edit</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
};

Views.lendersPost = function() {
  Animate.heroIn('[data-animate="hero"]');
  Animate.countUp('.summary-hero__value[data-countup]', { duration: 1.2 });

  const apply = () => App.navigate('lenders', {
    q: document.getElementById('lenderSearch')?.value?.trim() || '',
    year: document.getElementById('filterLenderYear')?.value || '',
    sort: App.currentParams?.sort || '',
    dir:  App.currentParams?.dir  || ''
  });
  document.getElementById('lenderSearch')?.addEventListener('input', debounce(apply, 250));
  document.getElementById('filterLenderYear')?.addEventListener('change', apply);

  wireSortableHeaders('lenders', {
    q: document.getElementById('lenderSearch')?.value?.trim() || '',
    year: document.getElementById('filterLenderYear')?.value || '',
    sort: App.currentParams?.sort,
    dir:  App.currentParams?.dir
  });

  document.querySelector('[data-action="export-all-lenders"]')?.addEventListener('click', () => {
    const lenders = Store.getLenders();
    if (!lenders.length) return App.toast('No lenders to export');
    const rows = [
      ['Lender', 'Deals', 'Loan Volume', 'Purchase Volume', 'Avg Loan', 'Avg Purchase', 'Revenue', 'Spent', 'ROI', 'Cost / Deal', 'Budget Target', 'Purchase', 'Refinance', 'Subordinate', 'First Deal', 'Last Deal', 'Notes'],
      ...lenders.map(l => [
        l.name, l.dealCount, l.loanAmount, l.purchaseVolume,
        l.avgLoan, l.avgPurchase,
        l.revenue, l.expenses, l.roi,
        l.costPerDeal, l.budgetTarget != null ? l.budgetTarget : '',
        l.purchase, l.refinance, l.subordinate,
        l.firstDeal || '', l.lastDeal || '', l.notes || ''
      ])
    ];
    downloadCSV(`lenders-all-${new Date().toISOString().slice(0,10)}.csv`, rows);
    App.toast(`${lenders.length} lender${lenders.length === 1 ? '' : 's'} exported`);
  });

  // Row click → detail. Bound to the row but excludes the Edit button (it
  // stops propagation) so the inline action doesn't navigate.
  document.querySelectorAll('tr[data-lender]').forEach(row => {
    row.addEventListener('click', () => {
      location.hash = '#/lender/' + encodeURIComponent(row.getAttribute('data-lender'));
    });
  });
  document.querySelectorAll('[data-edit-lender]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      App.openEntityEditModal('lender', btn.getAttribute('data-edit-lender'));
    });
  });
};

/* ========================================================================
   Lender detail
   ======================================================================== */

Views.lenderDetail = function(name) {
  const l = Store.getLender(name);
  if (!l) {
    return `
      <section class="view">
        <header class="view-header">
          <div class="view-header__left">
            <a href="#/lenders" class="breadcrumb">← All Lenders</a>
            <h1>Lender not found.</h1>
          </div>
        </header>
      </section>
    `;
  }

  const deals = Store.getDealsForLender(name)
    .slice()
    .sort((a, b) => (b.disbursementDate || '').localeCompare(a.disbursementDate || ''));
  const expenses = Store.getExpensesForLender(name)
    .slice()
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Budget meter — only renders when a target is set in lenderMeta.
  const budgetBar = (l.budgetTarget && l.budgetTarget > 0) ? `
    <div class="panel">
      <div class="panel__head">
        <div>
          <h3 class="panel__title">${icon('expenses', 16)} Budget</h3>
          <div class="panel__subtitle">${fmtMoney(l.expenses, { decimals: 0 })} spent of ${fmtMoney(l.budgetTarget, { decimals: 0 })} target</div>
        </div>
        <div class="muted" style="font-size:12px;">${l.budgetPct}% used</div>
      </div>
      <div class="panel__body" style="padding: 8px 24px 24px;">
        <div class="progress-track">
          <div class="progress-bar ${l.budgetPct > 100 ? 'progress-bar--over' : ''}" data-target-width="${Math.min(100, l.budgetPct)}" style="width:0%;"></div>
        </div>
      </div>
    </div>
  ` : '';

  return `
    <section class="view">
      <header class="view-header">
        <div class="view-header__left">
          <a href="#/lenders" class="breadcrumb">← All Lenders</a>
          <div class="eyebrow">Lender Partner</div>
          <h1>${escapeHtml(l.name)}</h1>
          ${entityContactStripHTML(l)}
          ${l.notes ? `<div class="muted" style="margin-top:10px;max-width:60ch;">${escapeHtml(l.notes)}</div>` : ''}
        </div>
        <div class="view-header__right">
          <button class="btn btn--ghost" data-action="edit-lender">${icon('settings', 14)} Edit</button>
          <button class="btn btn--ghost" data-action="export-lender-deals">${icon('download', 14)} Export Deals</button>
        </div>
      </header>

      <div class="stat-cards">
        <div class="stat-card stat-card--featured" data-animate="card">
          <div class="stat-card__label">Total Loan Volume</div>
          <div class="stat-card__value" data-countup="${l.loanAmount.toFixed(0)}">${fmtMoney(l.loanAmount, { decimals: 0 })}</div>
          <div class="stat-card__meta">Avg ${fmtMoney(l.avgLoan, { decimals: 0 })} / deal</div>
        </div>
        <div class="stat-card" data-animate="card">
          <div class="stat-card__label">Total Purchase Volume</div>
          <div class="stat-card__value" data-countup="${l.purchaseVolume.toFixed(0)}">${fmtMoney(l.purchaseVolume, { decimals: 0 })}</div>
          <div class="stat-card__meta">Avg ${fmtMoney(l.avgPurchase, { decimals: 0 })} / deal</div>
        </div>
        <div class="stat-card" data-animate="card">
          <div class="stat-card__label">Total Deals</div>
          <div class="stat-card__value" data-countup="${l.dealCount}">${fmtNumber(l.dealCount)}</div>
          <div class="stat-card__meta">${l.purchase} Purchase · ${l.refinance} Refi · ${l.subordinate} Sub</div>
        </div>
        <div class="stat-card" data-animate="card">
          <div class="stat-card__label">Revenue Contributed</div>
          <div class="stat-card__value" data-countup="${l.revenue.toFixed(0)}">${fmtMoney(l.revenue, { decimals: 0 })}</div>
          <div class="stat-card__meta">Avg ${fmtMoney(l.avgRevenue, { decimals: 0 })} / deal</div>
        </div>
        <div class="stat-card" data-animate="card">
          <div class="stat-card__label">Spent on Relationship</div>
          <div class="stat-card__value" data-countup="${l.expenses.toFixed(0)}">${fmtMoney(l.expenses, { decimals: 0 })}</div>
          <div class="stat-card__meta">${fmtRoi(l.roi)} ROI · ${fmtMoney(l.costPerDeal, { decimals: 0 })} / deal</div>
        </div>
      </div>

      ${budgetBar}

      <div class="panel">
        <div class="panel__head">
          <div>
            <h3 class="panel__title">${icon('deals', 16)} Deals Funded</h3>
            <div class="panel__subtitle">${deals.length} deal${deals.length === 1 ? '' : 's'} funded by ${escapeHtml(l.name)}</div>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data">
            <thead><tr>
              <th>Order #</th>
              <th>Title Co.</th>
              <th>Disbursement</th>
              <th>Type</th>
              <th>Property</th>
              <th class="num">Purchase Price</th>
              <th class="num">Loan Amt</th>
              <th class="num">Revenue</th>
            </tr></thead>
            <tbody>
              ${deals.length === 0 ? '<tr><td colspan="8" class="center muted" style="padding: 48px 20px;">No deals on file for this lender.</td></tr>' : deals.map(d => `
                <tr>
                  <td class="cell-strong">${escapeHtml(d.orderNumber || '—')}</td>
                  <td>${titleCompanyTag(d.titleCompany)}</td>
                  <td class="muted">${fmtDate(d.disbursementDate)}</td>
                  <td>${dealTypeTag(d.transactionType)}</td>
                  <td class="muted">${escapeHtml(d.propertyAddress || '—')}</td>
                  <td class="num">${d.purchasePrice ? fmtMoney(d.purchasePrice, { decimals: 0 }) : '—'}</td>
                  <td class="num">${d.loanAmount ? fmtMoney(d.loanAmount, { decimals: 0 }) : '—'}</td>
                  <td class="num cell-strong">${fmtMoney(d.revenue, { decimals: 0 })}</td>
                </tr>
              `).join('')}
              ${deals.length > 0 ? `
                <tr class="totals-row">
                  <td colspan="5" class="num"><strong>Totals</strong></td>
                  <td class="num cell-strong">${fmtMoney(l.purchaseVolume, { decimals: 0 })}</td>
                  <td class="num cell-strong">${fmtMoney(l.loanAmount, { decimals: 0 })}</td>
                  <td class="num cell-strong">${fmtMoney(l.revenue, { decimals: 0 })}</td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <div class="panel__head">
          <div>
            <h3 class="panel__title">${icon('expenses', 16)} Relationship Investments</h3>
            <div class="panel__subtitle">${expenses.length} expense${expenses.length === 1 ? '' : 's'} tagged to ${escapeHtml(l.name)}</div>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data">
            <thead><tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Realtor</th>
              <th class="num">Amount</th>
            </tr></thead>
            <tbody>
              ${expenses.length === 0 ? '<tr><td colspan="5" class="center muted" style="padding: 48px 20px;">No relationship investments tagged to this lender yet.</td></tr>' : expenses.map(e => `
                <tr>
                  <td class="muted">${fmtDate(e.date)}</td>
                  <td>${escapeHtml(e.expenseType || '—')}</td>
                  <td>${escapeHtml(e.description || '—')}</td>
                  <td class="muted">${e.client ? escapeHtml(e.client) : '—'}</td>
                  <td class="num cell-strong">${fmtMoney(e.amount, { decimals: 0 })}</td>
                </tr>
              `).join('')}
              ${expenses.length > 0 ? `
                <tr class="totals-row">
                  <td colspan="4" class="num"><strong>Total Spent</strong></td>
                  <td class="num cell-strong">${fmtMoney(l.expenses, { decimals: 0 })}</td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
};

Views.lenderDetailPost = function(name) {
  Animate.staggerIn('[data-animate="card"]', { stagger: 0.06 });
  Animate.countUp('.stat-card__value[data-countup]', { duration: 0.9 });
  Animate.growBars('.progress-bar[data-target-width]', { stagger: 0.04 });

  document.querySelector('[data-action="edit-lender"]')?.addEventListener('click', () => {
    App.openEntityEditModal('lender', name);
  });

  document.querySelector('[data-action="export-lender-deals"]')?.addEventListener('click', () => {
    const l = Store.getLender(name);
    const deals = Store.getDealsForLender(name);
    if (!deals.length) return App.toast('No deals to export');
    const rows = [
      ['Lender', 'Order #', 'Title Company', 'Disbursement', 'Type', 'Property', 'Purchase Price', 'Loan Amount', 'Revenue'],
      ...deals.map(d => [
        l.name, d.orderNumber || '', d.titleCompany || '',
        d.disbursementDate || '', d.transactionType || '',
        d.propertyAddress || '',
        Number(d.purchasePrice || 0), Number(d.loanAmount || 0), Number(d.revenue || 0)
      ])
    ];
    const filename = `lender-${name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`;
    downloadCSV(filename, rows);
    App.toast(`${deals.length} deal${deals.length === 1 ? '' : 's'} exported`);
  });
};

/* ========================================================================
   Agent detail
   ======================================================================== */

Views.agentDetail = function(name) {
  const a = Store.getAgent(name);
  if (!a) {
    return `
      <section class="view">
        <a href="#/agents" class="back-link">← Back to Realtor Database</a>
        <div class="empty">
          <h3 class="empty__title">Not found</h3>
          <div class="empty__body">No realtor named "${escapeHtml(name)}" exists in the database.</div>
        </div>
      </section>
    `;
  }

  const deals = Store.getDealsForAgent(name).sort((x, y) => (y.disbursementDate || '').localeCompare(x.disbursementDate || ''));
  const expenses = Store.getExpensesForAgent(name);

  // Tag each deal with the agent's role
  const roleFor = (d) => {
    const roles = [];
    if (d.client === name) roles.push('Client');
    if (d.listingAgent === name) roles.push('Listing');
    if (d.sellingAgent === name) roles.push('Selling');
    return roles;
  };
  const creditedCount = deals.filter(d => d.client === name).length;
  const participatedCount = deals.filter(d => d.client !== name).length;

  return `
    <section class="view">
      <a href="#/agents" class="back-link">← Back to Realtor Database</a>

      <div class="profile-header">
        <div class="profile-header__eyebrow">Realtor Profile</div>
        <h2 class="profile-header__name">${escapeHtml(a.name)}</h2>
        ${entityContactStripHTML(a)}
        <div style="margin-top:12px;">
          <button class="btn btn--ghost" data-action="edit-agent">${icon('settings', 14)} Edit / Rename</button>
        </div>
        ${a.notes ? `<div class="muted" style="margin-top:10px;max-width:60ch;">${escapeHtml(a.notes)}</div>` : ''}
        ${(a.budgetTarget && a.budgetTarget > 0) ? `
          <div style="margin-top:14px;max-width:480px;">
            <div class="muted" style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">${fmtMoney(a.expenses, { decimals: 0 })} spent of ${fmtMoney(a.budgetTarget, { decimals: 0 })} target · ${a.budgetPct}%</div>
            <div class="progress-track" style="margin-top:6px;"><div class="progress-bar ${a.budgetPct > 100 ? 'progress-bar--over' : ''}" data-target-width="${Math.min(100, a.budgetPct)}" style="width:0%;"></div></div>
          </div>
        ` : ''}
        <div class="profile-header__meta">
          <div class="profile-header__meta-item">
            Type<strong>${escapeHtml(a.clientType)}</strong>
          </div>
          <div class="profile-header__meta-item">
            Status<strong>${a.isActive ? 'Active' : 'Inactive'}</strong>
          </div>
          <div class="profile-header__meta-item">
            First Deal<strong>${fmtDate(a.firstDeal)}</strong>
          </div>
          <div class="profile-header__meta-item">
            Last Deal<strong>${fmtDate(a.lastDeal)}</strong>
          </div>
          <div class="profile-header__meta-item">
            Days Active<strong>${a.daysAsClient}</strong>
          </div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi kpi--light">
          <div class="kpi__label">Total Revenue</div>
          <div class="kpi__value">${fmtMoney(a.revenue, { decimals: 0 })}</div>
          <div class="kpi__delta">Across ${a.dealCount} ${a.dealCount === 1 ? 'deal' : 'deals'}</div>
        </div>
        <div class="kpi kpi--light">
          <div class="kpi__label">Avg per Deal</div>
          <div class="kpi__value">${a.avgRevenue ? fmtMoney(a.avgRevenue, { decimals: 0 }) : '—'}</div>
          <div class="kpi__delta">${a.purchase} purchase · ${a.refinance} refi · ${a.subordinate} sub</div>
        </div>
        <div class="kpi kpi--light">
          <div class="kpi__label">Investment in Client</div>
          <div class="kpi__value">${a.expenses ? fmtMoney(a.expenses, { decimals: 0 }) : '$0'}</div>
          <div class="kpi__delta">${a.dealCount > 0 ? fmtMoney(a.costPerDeal, { decimals: 0 }) + ' per deal' : 'No deals yet'}</div>
        </div>
        <div class="kpi kpi--light">
          <div class="kpi__label">ROI</div>
          <div class="kpi__value">${fmtRoi(a.roi)}</div>
          <div class="kpi__delta">${a.expenses === 0 && a.revenue > 0 ? 'No expenses recorded' : 'Revenue ÷ Expenses'}</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel__head">
            <div>
              <h3 class="panel__title">${icon('deals', 16)} Deals</h3>
              <div class="panel__subtitle">${creditedCount} credited · ${participatedCount} as listing/selling</div>
            </div>
            <button class="btn btn--gold btn--sm" data-action="open-deal-modal" data-prefill-client="${escapeHtml(a.name)}">+ Log Deal</button>
          </div>
          <div class="panel__body panel__body--tight">
            <div class="table-wrap">
              <table class="data">
                <thead><tr>
                  <th>Date</th>
                  <th>Order #</th>
                  <th>Property</th>
                  <th>Role</th>
                  <th>Type</th>
                  <th class="num">Revenue</th>
                </tr></thead>
                <tbody>
                  ${deals.length === 0 ? '<tr><td colspan="6" class="center muted" style="padding: 48px 20px;">No deals recorded.</td></tr>' : deals.map(d => {
                    const roles = roleFor(d);
                    const isCredited = roles.includes('Client');
                    const roleBadges = roles.map(r => `<span class="tag tag--${r === 'Client' ? 'gold' : 'forest'}">${r}</span>`).join(' ');
                    return `
                    <tr class="is-clickable" data-deal="${d.id}">
                      <td class="muted">${fmtDate(d.disbursementDate)}</td>
                      <td class="cell-strong">${escapeHtml(d.orderNumber || '—')}</td>
                      <td>${escapeHtml(d.propertyAddress || '—')}</td>
                      <td>${roleBadges}</td>
                      <td>${dealTypeTag(d.transactionType)}</td>
                      <td class="num ${isCredited ? 'cell-strong' : 'muted'}">${fmtMoney(d.revenue)}</td>
                    </tr>
                  `}).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel__head">
            <div>
              <h3 class="panel__title">${icon('expenses', 16)} Expenses</h3>
              <div class="panel__subtitle">${expenses.length} entries</div>
            </div>
            <button class="btn btn--gold btn--sm" data-action="open-expense-modal" data-prefill-client="${escapeHtml(a.name)}">+ Log Expense</button>
          </div>
          <div class="panel__body panel__body--tight">
            <div class="table-wrap">
              <table class="data">
                <thead><tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th class="num">Amount</th>
                </tr></thead>
                <tbody>
                  ${expenses.length === 0 ? '<tr><td colspan="4" class="center muted" style="padding: 48px 20px;">No expenses logged.</td></tr>' : expenses.map(e => `
                    <tr>
                      <td class="muted">${fmtDate(e.date)}</td>
                      <td><span class="tag tag--forest">${escapeHtml(e.expenseType || '—')}</span></td>
                      <td>${escapeHtml(e.description || '—')}</td>
                      <td class="num cell-strong">${fmtMoney(e.amount)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      ${deals.length > 0 ? `
        <div class="panel">
          <div class="panel__head">
            <div>
              <h3 class="panel__title">${icon('monthly', 16)} Deal History</h3>
              <div class="panel__subtitle">Revenue Timeline</div>
            </div>
          </div>
          <div class="panel__body">
            <div class="chart-wrap chart-wrap--short"><canvas id="agentTimeline"></canvas></div>
          </div>
        </div>
      ` : ''}
    </section>
  `;
};

Views.agentDetailPost = function(name) {
  Animate.growBars('.progress-bar[data-target-width]', { stagger: 0.04 });
  document.querySelector('[data-action="edit-agent"]')?.addEventListener('click', () => {
    App.openEntityEditModal('realtor', name);
  });
  document.querySelectorAll('[data-action="open-deal-modal"]').forEach(b => {
    b.addEventListener('click', () => {
      const client = b.getAttribute('data-prefill-client');
      App.openDealModal(null, client ? { client } : undefined);
    });
  });
  document.querySelectorAll('[data-action="open-expense-modal"]').forEach(b => {
    b.addEventListener('click', () => {
      const client = b.getAttribute('data-prefill-client');
      App.openExpenseModal(null, client ? { client } : undefined);
    });
  });
  document.querySelectorAll('tr[data-deal]').forEach(row => {
    row.addEventListener('click', () => App.openDealModal(row.getAttribute('data-deal')));
  });

  // Timeline chart: one point per deal, by date, revenue
  const deals = Store.getDealsForAgent(name)
    .filter(d => d.disbursementDate)
    .sort((a, b) => a.disbursementDate.localeCompare(b.disbursementDate));

  const ctx = document.getElementById('agentTimeline');
  if (ctx && deals.length > 0) {
    if (CHARTS.agentTimeline) CHARTS.agentTimeline.destroy();
    CHARTS.agentTimeline = new Chart(ctx, {
      type: 'line',
      data: {
        labels: deals.map(d => fmtDate(d.disbursementDate)),
        datasets: [{
          label: 'Revenue',
          data: deals.map(d => d.revenue),
          borderColor: CHART_COLORS.gold,
          backgroundColor: 'rgba(201, 168, 76, 0.12)',
          pointBackgroundColor: CHART_COLORS.forestPrimary,
          pointBorderColor: CHART_COLORS.gold,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.25,
          fill: true,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: CHART_COLORS.forestDeep,
            titleColor: CHART_COLORS.goldLight,
            bodyColor: CHART_COLORS.cream,
            padding: 12,
            displayColors: false,
            callbacks: {
              title: (items) => items[0].label,
              label: (c) => fmtMoney(c.parsed.y)
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: CHART_COLORS.grey, font: CHART_FONT, maxRotation: 0, autoSkip: true } },
          y: { grid: { color: CHART_COLORS.line }, ticks: { color: CHART_COLORS.grey, font: CHART_FONT, callback: v => fmtMoney(v, { decimals: 0, abbrev: true }) } }
        }
      }
    });
  }
};

/* ========================================================================
   Client Expenses
   ======================================================================== */

Views.expenses = function(query = {}) {
  const expenses = Store.getExpenses();
  const summary = Store.getExpensesSummaryByType();
  const total = Object.values(summary).reduce((s, v) => s + v, 0);

  const search = (query.q || '').toLowerCase();
  const typeF = query.type || '';

  let filtered = expenses.filter(e => {
    if (typeF && e.expenseType !== typeF) return false;
    if (search) {
      const blob = [e.client, e.description, e.notes].filter(Boolean).join(' ').toLowerCase();
      if (!blob.includes(search)) return false;
    }
    return true;
  });

  const sortField = query.sort || 'date';
  const sortDir   = query.dir  || (query.sort ? 'asc' : 'desc');
  const EXPENSE_SORT_GETTERS = {
    date:        e => e.date || '',
    client:      e => e.client || '',
    expenseType: e => e.expenseType || '',
    description: e => e.description || '',
    notes:       e => e.notes || '',
    amount:      e => Number(e.amount || 0)
  };
  const getter = EXPENSE_SORT_GETTERS[sortField] || EXPENSE_SORT_GETTERS.date;
  filtered = sortItems(filtered, getter, sortDir);

  return `
    <section class="view">
      <header class="view-header">
        <div class="view-header__left">
          <div class="eyebrow">Client Investment</div>
          <h1>The cost of <em>relationships.</em></h1>
        </div>
        <div class="view-header__right">
          <button class="btn btn--ghost" data-action="export-all-expenses">${icon('download', 14)} Export All CSV</button>
          <button class="btn btn--gold" data-action="open-expense-modal">+ Log Expense</button>
        </div>
      </header>

      <div class="panel">
        <div class="panel__head">
          <div>
            <h3 class="panel__title">${icon('expenses', 16)} Summary by Category</h3>
            <div class="panel__subtitle">Track every dollar you invested in relationships</div>
          </div>
        </div>
        <div class="panel__body panel__body--summary">
          <div class="summary-hero" data-animate="hero">
            <div class="summary-hero__label">Total Invested</div>
            <div class="summary-hero__value" data-countup="${total}">${fmtMoney(total, { decimals: 0 })}</div>
            <div class="summary-hero__meta">
              <span class="summary-hero__metaItem"><span class="summary-hero__metaValue">${Store.getExpenses().length}</span> entries</span>
              <span class="summary-hero__metaDot"></span>
              <span class="summary-hero__metaItem">Across <span class="summary-hero__metaValue">${EXPENSE_TYPES.filter(t => (summary[t] || 0) > 0).length}</span> categories</span>
            </div>
          </div>

          <div class="cat-cards">
            ${EXPENSE_TYPES.map((t, i) => {
              const amount = summary[t] || 0;
              const pct = total > 0 ? (amount / total) * 100 : 0;
              const hasValue = amount > 0;
              return `
              <div class="cat-card ${hasValue ? 'has-value' : 'is-empty'}" data-animate="card" data-index="${i}">
                <div class="cat-card__head">
                  <div class="cat-card__icon">${icon(expenseIconFor(t), 18)}</div>
                  <div class="cat-card__pct">${hasValue ? pct.toFixed(0) + '%' : '—'}</div>
                </div>
                <div class="cat-card__label">${t}</div>
                <div class="cat-card__value" data-countup="${amount}">${fmtMoney(amount, { decimals: 0 })}</div>
                <div class="cat-card__bar">
                  <div class="cat-card__barFill" style="width: 0%" data-target-width="${pct.toFixed(1)}"></div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="filters">
          <div class="filters__search">
            <input type="search" id="expenseSearch" value="${escapeHtml(query.q || '')}" placeholder="Search client or description" />
          </div>
          <select id="expenseTypeFilter">
            <option value="">All categories</option>
            ${EXPENSE_TYPES.map(t => `<option value="${t}" ${t === typeF ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="table-wrap">
          <table class="data">
            <thead><tr>
              <th class="select-col"><input type="checkbox" class="ra-check" id="bulkSelectAll" aria-label="Select all" /></th>
              ${sortableTH('date',        'Date',        query)}
              ${sortableTH('client',      'Client',      query)}
              ${sortableTH('expenseType', 'Category',    query)}
              ${sortableTH('description', 'Description', query)}
              ${sortableTH('notes',       'Notes',       query)}
              ${sortableTH('amount',      'Amount',      query, 'num')}
              <th class="cell-actions">Actions</th>
            </tr></thead>
            <tbody>
              ${filtered.length === 0 ? '<tr><td colspan="8" class="center muted" style="padding: 64px 20px;">No expenses recorded.</td></tr>' : filtered.map(e => `
                <tr class="is-clickable" data-bulk-row data-expense-row="${e.id}">
                  <td class="select-col"><input type="checkbox" class="ra-check" data-bulk-id="${e.id}" aria-label="Select expense" /></td>
                  <td class="muted">${fmtDate(e.date)}</td>
                  <td>${e.client ? `<a href="#/agent/${encodeURIComponent(e.client)}" style="color: var(--forest-primary); font-weight: 500;">${escapeHtml(e.client)}</a>` : '—'}</td>
                  <td><span class="tag tag--forest">${icon(expenseIconFor(e.expenseType), 12)}<span>${escapeHtml(e.expenseType || '—')}</span></span></td>
                  <td>${escapeHtml(e.description || '—')}</td>
                  <td class="cell-muted">${escapeHtml(e.notes || '')}</td>
                  <td class="num cell-strong">${fmtMoney(e.amount)}</td>
                  <td class="cell-actions">
                    <div class="inline-actions">
                      <button class="icon-btn" data-edit-expense="${e.id}">Edit</button>
                      <button class="icon-btn icon-btn--danger" data-delete-expense="${e.id}">Delete</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
};

Views.expensesPost = function() {
  // GSAP entry animations
  Animate.heroIn('[data-animate="hero"]');
  Animate.staggerIn('[data-animate="card"]', { delay: 0.15, stagger: 0.06 });
  Animate.countUp('.summary-hero__value[data-countup]', { duration: 1.2 });
  Animate.countUp('.cat-card__value[data-countup]', { duration: 0.9 });
  Animate.growBars('.cat-card__barFill', { baseDelay: 0.35, stagger: 0.06 });

  const apply = () => App.navigate('expenses', {
    q: document.getElementById('expenseSearch').value.trim(),
    type: document.getElementById('expenseTypeFilter').value,
    sort: App.currentParams?.sort || '',
    dir:  App.currentParams?.dir  || ''
  });
  document.getElementById('expenseSearch').addEventListener('input', debounce(apply, 250));
  document.getElementById('expenseTypeFilter').addEventListener('change', apply);

  wireSortableHeaders('expenses', {
    q: document.getElementById('expenseSearch')?.value?.trim() || '',
    type: document.getElementById('expenseTypeFilter')?.value || '',
    sort: App.currentParams?.sort,
    dir:  App.currentParams?.dir
  });

  document.querySelector('[data-action="export-all-expenses"]')?.addEventListener('click', () => {
    const items = Store.getExpenses();
    if (!items.length) return App.toast('No expenses to export');
    const rows = [
      ['Date', 'Client', 'Category', 'Description', 'Notes', 'Amount'],
      ...items.map(e => [
        e.date || '', e.client || '', e.expenseType || '',
        e.description || '', e.notes || '', e.amount || 0
      ])
    ];
    downloadCSV(`expenses-all-${new Date().toISOString().slice(0,10)}.csv`, rows);
    App.toast(`${items.length} expense${items.length === 1 ? '' : 's'} exported`);
  });

  document.querySelector('[data-action="open-expense-modal"]')?.addEventListener('click', () => App.openExpenseModal());
  document.querySelectorAll('[data-edit-expense]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      App.openExpenseModal(b.getAttribute('data-edit-expense'));
    });
  });
  document.querySelectorAll('[data-expense-row]').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.select-col, input, button, a')) return;
      if (BulkSelect.selected && BulkSelect.selected.size > 0) return;
      App.openExpenseModal(row.getAttribute('data-expense-row'));
    });
  });
  document.querySelectorAll('[data-delete-expense]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = b.getAttribute('data-delete-expense');
      if (confirm('Delete this expense? This cannot be undone.')) {
        Store.deleteExpense(id);
        App.toast('Expense removed');
        App.render();
      }
    });
  });

  BulkSelect.init({
    scope: 'expenses',
    itemNoun: 'expense',
    actions: [
      {
        label: 'Export CSV',
        icon: 'download',
        onClick: (ids) => {
          const items = ids.map(id => Store.getExpense(id)).filter(Boolean);
          const rows = [
            ['Date', 'Client', 'Category', 'Description', 'Notes', 'Amount'],
            ...items.map(e => [
              e.date || '', e.client || '', e.expenseType || '',
              e.description || '', e.notes || '', e.amount || 0
            ])
          ];
          downloadCSV(`expenses-export-${new Date().toISOString().slice(0,10)}.csv`, rows);
          App.toast(`${items.length} expense${items.length === 1 ? '' : 's'} exported`);
        }
      },
      {
        label: 'Delete',
        icon: 'trash',
        danger: true,
        onClick: (ids) => {
          if (!confirm(`Delete ${ids.length} expense${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
          const n = Store.deleteExpenses(ids);
          App.toast(`${n} expense${n === 1 ? '' : 's'} removed`);
          App.render();
        }
      }
    ]
  });
};

/* ========================================================================
   Monthly Production
   ======================================================================== */

Views.monthly = function(query = {}) {
  const years = Store.getYearsInData();
  const selectedYear = Number(query.year) || years[years.length - 1] || new Date().getFullYear();
  const rows = Store.getMonthlyProduction(selectedYear);

  const totals = rows.reduce((acc, r) => ({
    total: acc.total + r.total,
    purchase: acc.purchase + r.purchase,
    refinance: acc.refinance + r.refinance,
    subordinate: acc.subordinate + r.subordinate,
    revenue: acc.revenue + r.revenue
  }), { total: 0, purchase: 0, refinance: 0, subordinate: 0, revenue: 0 });

  return `
    <section class="view">
      <header class="view-header">
        <div class="view-header__left">
          <div class="eyebrow">Monthly Production</div>
          <h1>The rhythm of <em>the year.</em></h1>
        </div>
        <div class="view-header__right">
          ${years.length > 0 ? `<select id="monthlyYear" class="field__select">${years.map(y => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`).join('')}</select>` : ''}
        </div>
      </header>

      <div class="panel">
        <div class="panel__head">
          <div>
            <h3 class="panel__title">${icon('monthly', 16)} Revenue &amp; Volume — ${selectedYear}</h3>
            <div class="panel__subtitle">Month by Month</div>
          </div>
        </div>
        <div class="panel__body">
          <div class="chart-wrap chart-wrap--tall"><canvas id="monthlyCombo"></canvas></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel__head">
          <div>
            <h3 class="panel__title">${icon('data', 16)} Production Table — ${selectedYear}</h3>
            <div class="panel__subtitle">${totals.total} deals · ${fmtMoney(totals.revenue, { decimals: 0 })} revenue</div>
          </div>
        </div>
        <div class="panel__body panel__body--tight">
          <div class="table-wrap">
            <table class="data">
              <thead><tr>
                <th>Month</th>
                <th class="num">Deals</th>
                <th class="num">Purchase</th>
                <th class="num">Refinance</th>
                <th class="num">Subordinate</th>
                <th class="num">Revenue</th>
                <th class="num">Avg / Deal</th>
                <th class="num">MoM Growth</th>
              </tr></thead>
              <tbody>
                ${rows.map(r => `
                  <tr>
                    <td class="cell-strong">${r.month}</td>
                    <td class="num">${fmtNumber(r.total)}</td>
                    <td class="num">${fmtNumber(r.purchase)}</td>
                    <td class="num">${fmtNumber(r.refinance)}</td>
                    <td class="num">${fmtNumber(r.subordinate)}</td>
                    <td class="num cell-strong">${fmtMoney(r.revenue, { decimals: 0 })}</td>
                    <td class="num">${r.avgDealSize ? fmtMoney(r.avgDealSize, { decimals: 0 }) : '—'}</td>
                    <td class="num" style="color: ${r.momGrowth > 0 ? 'var(--forest-mid)' : r.momGrowth < 0 ? '#8B2936' : 'var(--mid-grey)'}">${r.momGrowth !== null ? (r.momGrowth > 0 ? '+' : '') + fmtPercent(r.momGrowth) : '—'}</td>
                  </tr>
                `).join('')}
                <tr style="background: var(--forest-primary); color: var(--off-white);">
                  <td class="cell-strong" style="color: var(--off-white); font-family: var(--serif); font-size: 16px;">TOTAL</td>
                  <td class="num" style="color: var(--off-white);">${fmtNumber(totals.total)}</td>
                  <td class="num" style="color: var(--off-white);">${fmtNumber(totals.purchase)}</td>
                  <td class="num" style="color: var(--off-white);">${fmtNumber(totals.refinance)}</td>
                  <td class="num" style="color: var(--off-white);">${fmtNumber(totals.subordinate)}</td>
                  <td class="num" style="color: var(--off-white); font-family: var(--serif); font-size: 16px;">${fmtMoney(totals.revenue, { decimals: 0 })}</td>
                  <td class="num" style="color: var(--off-white);">${totals.total > 0 ? fmtMoney(totals.revenue / totals.total, { decimals: 0 }) : '—'}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  `;
};

Views.monthlyPost = function(query = {}) {
  const years = Store.getYearsInData();
  const selectedYear = Number(query.year) || years[years.length - 1] || new Date().getFullYear();
  const rows = Store.getMonthlyProduction(selectedYear);

  document.getElementById('monthlyYear')?.addEventListener('change', e => {
    App.navigate('monthly', { year: e.target.value });
  });

  const ctx = document.getElementById('monthlyCombo');
  if (!ctx) return;
  if (CHARTS.monthlyCombo) CHARTS.monthlyCombo.destroy();
  CHARTS.monthlyCombo = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: rows.map(r => r.month),
      datasets: [
        { label: 'Purchase', data: rows.map(r => r.purchase), backgroundColor: CHART_COLORS.forestPrimary, stack: 'deals', yAxisID: 'y1', barThickness: 24 },
        { label: 'Refinance', data: rows.map(r => r.refinance), backgroundColor: CHART_COLORS.gold, stack: 'deals', yAxisID: 'y1', barThickness: 24 },
        { label: 'Subordinate', data: rows.map(r => r.subordinate), backgroundColor: CHART_COLORS.forestLight, stack: 'deals', yAxisID: 'y1', barThickness: 24 },
        {
          type: 'line', label: 'Revenue', data: rows.map(r => r.revenue),
          borderColor: CHART_COLORS.goldMid, backgroundColor: 'rgba(212, 175, 55, 0.1)',
          pointBackgroundColor: CHART_COLORS.forestPrimary, pointBorderColor: CHART_COLORS.goldMid,
          pointRadius: 4, tension: 0.3, yAxisID: 'y2', borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: CHART_COLORS.forestPrimary, font: { family: 'Montserrat', size: 11, weight: '600' }, padding: 16, boxWidth: 12, boxHeight: 12 }
        },
        tooltip: {
          backgroundColor: CHART_COLORS.forestDeep,
          titleColor: CHART_COLORS.goldLight, bodyColor: CHART_COLORS.cream, padding: 12,
          callbacks: {
            label: (c) => {
              if (c.dataset.label === 'Revenue') return `Revenue: ${fmtMoney(c.parsed.y, { decimals: 0 })}`;
              return `${c.dataset.label}: ${c.parsed.y} ${c.parsed.y === 1 ? 'deal' : 'deals'}`;
            }
          }
        }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { color: CHART_COLORS.grey, font: CHART_FONT } },
        y1: {
          position: 'left', stacked: true, grid: { color: CHART_COLORS.line },
          ticks: { color: CHART_COLORS.grey, font: CHART_FONT, stepSize: 1 },
          title: { display: true, text: 'Deals', color: CHART_COLORS.forestPrimary, font: { family: 'Montserrat', size: 10, weight: '600' } }
        },
        y2: {
          position: 'right', grid: { display: false },
          ticks: { color: CHART_COLORS.grey, font: CHART_FONT, callback: v => fmtMoney(v, { decimals: 0, abbrev: true }) },
          title: { display: true, text: 'Revenue', color: CHART_COLORS.forestPrimary, font: { family: 'Montserrat', size: 10, weight: '600' } }
        }
      }
    }
  });
};

/* ========================================================================
   Data & Backup
   ======================================================================== */

Views.data = function() {
  const o = Store.getOverview();
  const lastBackup = localStorage.getItem('ra_last_backup');
  const fees = Settings.load().fileFees;
  const atgPcts = Settings.load().atgPercentages;
  const dupeGroups = Store.findDuplicateDeals();

  return `
    <section class="view">
      <header class="view-header">
        <div class="view-header__left">
          <div class="eyebrow">Data Management</div>
          <h1>Backup &amp; <em>control.</em></h1>
        </div>
      </header>

      ${renderDuplicatesPanel(dupeGroups)}

      <div class="grid-2">
        <div class="panel">
          <div class="panel__head">
            <div>
              <h3 class="panel__title">${icon('data', 16)} Current State</h3>
              <div class="panel__subtitle">What's in the system</div>
            </div>
          </div>
          <div class="panel__body">
            <div class="stat-row">
              <div class="stat-row__label">Deals</div>
              <div class="stat-row__value">${fmtNumber(o.totalDeals)}</div>
            </div>
            <div class="stat-row">
              <div class="stat-row__label">Realtor clients</div>
              <div class="stat-row__value">${fmtNumber(o.totalAgents)}</div>
            </div>
            <div class="stat-row">
              <div class="stat-row__label">Expense entries</div>
              <div class="stat-row__value">${fmtNumber(Store.getExpenses().length)}</div>
            </div>
            <div class="stat-row">
              <div class="stat-row__label">Total revenue tracked</div>
              <div class="stat-row__value">${fmtMoney(o.totalRevenue, { decimals: 0 })}</div>
            </div>
            <div class="stat-row">
              <div class="stat-row__label">Last backup</div>
              <div class="stat-row__value" style="font-size: 13px;">${lastBackup ? fmtDate(lastBackup) : '<span class="muted">Never</span>'}</div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel__head">
            <div>
              <h3 class="panel__title">${icon('download', 16)} Export / Import</h3>
              <div class="panel__subtitle">Your data, portable</div>
            </div>
          </div>
          <div class="panel__body">
            <p style="font-size: 13px; color: var(--mid-grey); margin: 0 0 20px;">
              Export a JSON snapshot of every deal, expense, and derived record. Keep backups or move your data to another device.
            </p>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <button class="btn btn--primary" id="exportBtn">Download JSON Backup</button>
              <label class="btn btn--ghost" style="cursor: pointer;">
                Import JSON
                <input type="file" id="importFile" accept="application/json" style="display: none;" />
              </label>
            </div>
            <hr class="divider" />
            <p style="font-size: 13px; color: var(--mid-grey); margin: 0 0 16px;">
              Reset the database back to the original Excel import (160 deals from the 2026 Production Sheet). Your current data will be discarded.
            </p>
            <button class="btn btn--danger" id="resetBtn">Reset to Original Data</button>
          </div>
        </div>
      </div>

      <!-- ATOZ Title — file-fee model -->
      <div class="panel">
        <div class="panel__head">
          <div>
            <h3 class="panel__title">${icon('settings', 18)} ATOZ Title — File Fees</h3>
            <div class="panel__subtitle">Flat fee subtracted from gross per transaction type</div>
          </div>
        </div>
        <div class="panel__body">
          <p style="font-size: 13px; color: var(--mid-grey); margin: 0 0 24px; max-width: 640px;">
            For ATOZ deals: <strong>Revenue = Settlement + Lender's + Owner's − File Fee</strong>.
            Changes apply <strong>only to new deals</strong> — existing deals keep the fee that was active when they were created.
          </p>
          <form id="feeForm" class="form-grid" style="max-width: 720px;">
            <div class="field">
              <label class="field__label">Purchase</label>
              <div class="field__money">
                <span class="field__money-prefix">$</span>
                <input class="field__input" type="number" step="0.01" min="0" name="purchase" value="${fees['Purchase']}" required />
              </div>
              <span class="field__hint">Default $1,555.88</span>
            </div>
            <div class="field">
              <label class="field__label">Refinance</label>
              <div class="field__money">
                <span class="field__money-prefix">$</span>
                <input class="field__input" type="number" step="0.01" min="0" name="refinance" value="${fees['Refinance']}" required />
              </div>
              <span class="field__hint">Default $777.94</span>
            </div>
            <div class="field">
              <label class="field__label">Subordinate Order</label>
              <div class="field__money">
                <span class="field__money-prefix">$</span>
                <input class="field__input" type="number" step="0.01" min="0" name="subordinate" value="${fees['Subordinate Order']}" required />
              </div>
              <span class="field__hint">Default $0</span>
            </div>
            <div class="field">
              <label class="field__label">Commercial</label>
              <div class="field__money">
                <span class="field__money-prefix">$</span>
                <input class="field__input" type="number" step="0.01" min="0" name="commercial" value="${fees['Commercial'] || 0}" required />
              </div>
              <span class="field__hint">Default $0</span>
            </div>
            <div class="field field--full" style="display: flex; gap: 12px; align-items: center;">
              <button type="submit" class="btn btn--gold">${icon('check', 14)} Save ATOZ (applies to new deals)</button>
              <button type="button" class="btn btn--ghost" id="resetFeesBtn">Restore Defaults</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ATG Title — percentage model -->
      <div class="panel">
        <div class="panel__head">
          <div>
            <h3 class="panel__title">${icon('settings', 18)} ATG Title — Commission Percentages</h3>
            <div class="panel__subtitle">Percentage of gross retained as revenue per transaction type</div>
          </div>
        </div>
        <div class="panel__body">
          <p style="font-size: 13px; color: var(--mid-grey); margin: 0 0 24px; max-width: 640px;">
            For ATG deals: <strong>Revenue = (Settlement + Lender's + Owner's) × Percentage</strong>.
            Changes apply <strong>only to new deals</strong> — existing deals keep the percentage that was active when they were created.
          </p>
          <form id="atgForm" class="form-grid" style="max-width: 720px;">
            <div class="field">
              <label class="field__label">Purchase</label>
              <div class="field__money">
                <input class="field__input" type="number" step="0.01" min="0" max="100" name="purchase" value="${atgPcts['Purchase'] || 0}" required />
                <span class="field__money-prefix" style="left:auto;right:12px;">%</span>
              </div>
            </div>
            <div class="field">
              <label class="field__label">Refinance</label>
              <div class="field__money">
                <input class="field__input" type="number" step="0.01" min="0" max="100" name="refinance" value="${atgPcts['Refinance'] || 0}" required />
                <span class="field__money-prefix" style="left:auto;right:12px;">%</span>
              </div>
            </div>
            <div class="field">
              <label class="field__label">Subordinate Order</label>
              <div class="field__money">
                <input class="field__input" type="number" step="0.01" min="0" max="100" name="subordinate" value="${atgPcts['Subordinate Order'] || 0}" required />
                <span class="field__money-prefix" style="left:auto;right:12px;">%</span>
              </div>
            </div>
            <div class="field">
              <label class="field__label">Commercial</label>
              <div class="field__money">
                <input class="field__input" type="number" step="0.01" min="0" max="100" name="commercial" value="${atgPcts['Commercial'] || 0}" required />
                <span class="field__money-prefix" style="left:auto;right:12px;">%</span>
              </div>
            </div>
            <div class="field field--full" style="display: flex; gap: 12px; align-items: center;">
              <button type="submit" class="btn btn--gold">${icon('check', 14)} Save ATG (applies to new deals)</button>
              <button type="button" class="btn btn--ghost" id="resetAtgBtn">Restore Defaults (all 0%)</button>
            </div>
          </form>
        </div>
      </div>

      <div class="panel">
        <div class="panel__head">
          <div>
            <h3 class="panel__title">${icon('check', 16)} About This System</h3>
            <div class="panel__subtitle">Production CRM v1.0</div>
          </div>
        </div>
        <div class="panel__body">
          <p style="font-size: 13px; line-height: 1.9; color: var(--charcoal); max-width: 720px;">
            This Production CRM replaces the 2026 Production Sheet Excel workbook. Every calculation — file fees by transaction type, revenue derivation, realtor aggregation, ROI, and monthly production — mirrors the spreadsheet's logic exactly, so the numbers you see here are identical to the workbook (with no stale hardcoded cells).
          </p>
          <p style="font-size: 13px; line-height: 1.9; color: var(--charcoal); max-width: 720px;">
            Data is stored locally in your browser. It never leaves your machine. For safety, download a backup whenever you've made significant updates.
          </p>
        </div>
      </div>
    </section>
  `;
};

/** Renders the Duplicate Deals panel. Empty string when none found. */
function renderDuplicatesPanel(groups) {
  if (!groups.length) {
    return `
      <div class="panel panel--ok" data-animate="hero">
        <div class="panel__body panel__body--ok">
          <div class="ok-panel">
            <div class="ok-panel__badge">${icon('check', 18)}</div>
            <div>
              <div class="ok-panel__title">No duplicate deals detected</div>
              <div class="ok-panel__sub">All deals have unique order numbers, or unique date + address combinations.</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  const totalDupes = groups.reduce((s, g) => s + g.deals.length, 0);

  return `
    <div class="panel panel--warn" data-animate="hero">
      <div class="panel__head panel__head--warn">
        <div>
          <h3 class="panel__title">⚠ Duplicate Deals Detected</h3>
          <div class="panel__subtitle">
            ${groups.length} group${groups.length === 1 ? '' : 's'} · ${totalDupes} total deal${totalDupes === 1 ? '' : 's'} flagged
            — review each pair and choose what to keep
          </div>
        </div>
      </div>
      <div class="panel__body">
        ${groups.map((g, idx) => renderDuplicateGroup(g, idx)).join('')}
      </div>
    </div>
  `;
}

function renderDuplicateGroup(group, idx) {
  const deals = group.deals.slice().sort((a, b) => {
    // Deals with more filled fields go first so "Keep" defaults to the richest record
    const fillA = Object.values(a).filter(v => v !== '' && v !== 0 && v != null).length;
    const fillB = Object.values(b).filter(v => v !== '' && v !== 0 && v != null).length;
    return fillB - fillA;
  });
  const headerLabel = group.matchType === 'order'
    ? `Order # <strong>${escapeHtml(deals[0].orderNumber || '—')}</strong>`
    : `Same date + address: <strong>${escapeHtml(deals[0].propertyAddress || '—')}</strong> · ${fmtDate(deals[0].disbursementDate)}`;

  return `
    <div class="dup-group" data-group-idx="${idx}">
      <div class="dup-group__head">
        <div class="dup-group__count">${deals.length}</div>
        <div class="dup-group__label">${headerLabel}</div>
      </div>
      <div class="dup-cards">
        ${deals.map((d, i) => renderDuplicateCard(d, i === 0, deals)).join('')}
      </div>
    </div>
  `;
}

function renderDuplicateCard(deal, isRecommended, siblings) {
  const otherIds = siblings.filter(s => s.id !== deal.id).map(s => s.id);
  return `
    <div class="dup-card ${isRecommended ? 'dup-card--recommended' : ''}" data-deal-id="${deal.id}">
      ${isRecommended ? '<div class="dup-card__badge">Most complete</div>' : ''}
      <div class="dup-card__head">
        <div class="dup-card__order">${escapeHtml(deal.orderNumber || '—')}</div>
        <div class="dup-card__type">${dealTypeTag(deal.transactionType)}</div>
      </div>
      <div class="dup-card__meta">
        <div class="dup-meta-row"><span class="dup-meta__label">Disbursement</span><span class="dup-meta__value">${fmtDate(deal.disbursementDate) || '—'}</span></div>
        <div class="dup-meta-row"><span class="dup-meta__label">Property</span><span class="dup-meta__value">${escapeHtml(deal.propertyAddress || '—')}</span></div>
        <div class="dup-meta-row"><span class="dup-meta__label">Underwriter</span><span class="dup-meta__value">${escapeHtml(deal.underwriter || '—')}</span></div>
        <div class="dup-meta-row"><span class="dup-meta__label">Client</span><span class="dup-meta__value">${escapeHtml(deal.client || '—')}</span></div>
        <div class="dup-meta-row"><span class="dup-meta__label">Revenue</span><span class="dup-meta__value cell-strong">${fmtMoney(deal.revenue, { decimals: 0 })}</span></div>
      </div>
      <div class="dup-card__actions">
        <button class="btn btn--gold dup-btn" data-dup-action="keep" data-keep-id="${deal.id}" data-drop-ids="${otherIds.join(',')}">Keep This · Delete Other${otherIds.length > 1 ? 's' : ''}</button>
        <button class="btn btn--ghost dup-btn" data-dup-action="merge" data-keep-id="${deal.id}" data-drop-ids="${otherIds.join(',')}" ${otherIds.length > 1 ? '' : ''}>Merge Into This</button>
        <button class="btn btn--danger-ghost dup-btn" data-dup-action="delete" data-delete-id="${deal.id}">Delete This</button>
      </div>
    </div>
  `;
}

Views.dataPost = function() {
  // Animate duplicate panel in (if present)
  Animate.heroIn('[data-animate="hero"]');

  // Wire duplicate actions
  document.querySelectorAll('[data-dup-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-dup-action');
      if (action === 'delete') {
        const id = btn.getAttribute('data-delete-id');
        const d = Store.getDeal(id);
        if (!d) return;
        if (!confirm(`Delete duplicate deal ${d.orderNumber || d.propertyAddress || id}? This cannot be undone.`)) return;
        Store.deleteDeal(id);
        App.toast('Duplicate removed');
        App.render();
        return;
      }
      if (action === 'keep') {
        const keepId = btn.getAttribute('data-keep-id');
        const dropIds = (btn.getAttribute('data-drop-ids') || '').split(',').filter(Boolean);
        const keep = Store.getDeal(keepId);
        if (!confirm(`Keep deal ${keep?.orderNumber || ''} and delete ${dropIds.length} duplicate${dropIds.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
        Store.deleteDeals(dropIds);
        App.toast(`${dropIds.length} duplicate${dropIds.length === 1 ? '' : 's'} removed`);
        App.render();
        return;
      }
      if (action === 'merge') {
        const keepId = btn.getAttribute('data-keep-id');
        const dropIds = (btn.getAttribute('data-drop-ids') || '').split(',').filter(Boolean);
        const keep = Store.getDeal(keepId);
        if (!confirm(`Merge ${dropIds.length} duplicate${dropIds.length === 1 ? '' : 's'} into deal ${keep?.orderNumber || ''}? Empty fields on the kept deal will be filled from the others, then the others will be deleted.`)) return;
        dropIds.forEach(dropId => Store.mergeDeals(keepId, dropId));
        App.toast(`${dropIds.length} duplicate${dropIds.length === 1 ? '' : 's'} merged`);
        App.render();
        return;
      }
    });
  });

  document.getElementById('exportBtn')?.addEventListener('click', () => {
    const payload = { exportedAt: new Date().toISOString(), deals: Store.getDeals(), expenses: Store.getExpenses() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `real-achiever-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    localStorage.setItem('ra_last_backup', new Date().toISOString());
    App.toast('Backup downloaded');
    App.render();
  });

  document.getElementById('importFile')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!Array.isArray(parsed.deals) || !Array.isArray(parsed.expenses)) throw new Error('Invalid file format');
        if (!confirm(`Import ${parsed.deals.length} deals and ${parsed.expenses.length} expenses? This will replace your current data.`)) return;
        Store.state = { deals: parsed.deals, expenses: parsed.expenses };
        Store._save();
        App.toast('Data imported');
        App.render();
      } catch (err) {
        alert('Could not import file: ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('resetBtn')?.addEventListener('click', () => {
    if (!confirm('Reset to the original Excel data? All current entries will be replaced.')) return;
    Store.reseed();
    App.toast('Data reset to original');
    App.render();
  });

  // ATOZ — file fees per transaction type
  document.getElementById('feeForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    Settings.save({
      fileFees: {
        'Purchase': Number(fd.get('purchase') || 0),
        'Refinance': Number(fd.get('refinance') || 0),
        'Subordinate Order': Number(fd.get('subordinate') || 0),
        'Commercial': Number(fd.get('commercial') || 0)
      }
    });
    // NON-RETROACTIVE: existing deals keep their locked-in fileFee +
    // revenue. Only deals created AFTER this point use the new fees.
    App.toast('ATOZ file fees saved — applies to new deals only');
    App.render();
  });

  document.getElementById('resetFeesBtn')?.addEventListener('click', () => {
    if (!confirm('Restore the original Excel defaults for all four ATOZ file fees? (Existing deals will not be changed — only future deals will use the restored defaults.)')) return;
    Settings.resetFileFees();
    App.toast('ATOZ file fees restored — applies to new deals only');
    App.render();
  });

  // ATG — commission percentages per transaction type
  document.getElementById('atgForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    Settings.save({
      atgPercentages: {
        'Purchase': Number(fd.get('purchase') || 0),
        'Refinance': Number(fd.get('refinance') || 0),
        'Subordinate Order': Number(fd.get('subordinate') || 0),
        'Commercial': Number(fd.get('commercial') || 0)
      }
    });
    App.toast('ATG percentages saved — applies to new deals only');
    App.render();
  });

  document.getElementById('resetAtgBtn')?.addEventListener('click', () => {
    if (!confirm('Reset all ATG percentages to 0%? (Existing deals keep their locked-in rates.)')) return;
    Settings.resetAtgPercentages();
    App.toast('ATG percentages reset — applies to new deals only');
    App.render();
  });
};

/* ========================================================================
   Modal · Import wizard (Step 1: Upload)
   ======================================================================== */

function importStep1HTML() {
  return `
    <div class="modal__head">
      <div class="modal__subtitle">Bulk Import</div>
      <h2 class="modal__title">Upload Deals</h2>
      <p class="modal__lede">Drop a CSV or Excel file of deals. We'll auto-detect columns, show you a preview, and let you confirm before anything is saved.</p>
    </div>

    <div class="import-dropzone" id="importDropzone">
      <input type="file" id="importPickFile" accept=".csv,.xlsx,.xls" hidden />
      <div class="import-dropzone__icon">⤒</div>
      <div class="import-dropzone__title">Drop your file here</div>
      <div class="import-dropzone__hint">or <button type="button" class="import-dropzone__browse" id="importBrowseBtn">browse</button> — accepts .csv, .xlsx, .xls</div>
    </div>

    <div class="import-steps">
      <div class="import-step is-active"><span>1</span> Upload</div>
      <div class="import-step"><span>2</span> Map Columns</div>
      <div class="import-step"><span>3</span> Review</div>
    </div>

    <div class="modal__actions">
      <div></div>
      <div class="modal__actions-right">
        <button type="button" class="btn btn--ghost" data-close-modal>Cancel</button>
      </div>
    </div>
  `;
}

function importStep2HTML(state) {
  const { headers, rows, mapping } = state;
  const previewRows = rows.slice(0, 3);
  const options = Import.FIELDS.map(f =>
    `<option value="${f.key}">${escapeHtml(f.label)}</option>`
  ).join('');

  return `
    <div class="modal__head">
      <div class="modal__subtitle">Bulk Import · Step 2 of 3</div>
      <h2 class="modal__title">Map Your Columns</h2>
      <p class="modal__lede">We matched these automatically — adjust anything that looks off. <strong>${headers.length}</strong> columns · <strong>${rows.length}</strong> rows detected.</p>
    </div>

    <div class="import-steps">
      <div class="import-step is-done"><span>✓</span> Upload</div>
      <div class="import-step is-active"><span>2</span> Map Columns</div>
      <div class="import-step"><span>3</span> Review</div>
    </div>

    <div class="import-map-wrap">
      <table class="import-map">
        <thead>
          <tr>
            <th style="width: 28%">Your column</th>
            <th style="width: 28%">Maps to</th>
            <th>Preview values</th>
          </tr>
        </thead>
        <tbody>
          ${headers.map((h, i) => {
            const samples = previewRows.map(r => r[i]).filter(v => v !== undefined && String(v).trim() !== '').slice(0, 3);
            const sampleText = samples.length ? samples.map(s => escapeHtml(String(s))).join('<span class="import-map__sep"> · </span>') : '<span class="muted">—</span>';
            const selected = mapping[i] || '';
            return `
              <tr>
                <td><div class="import-map__colname">${escapeHtml(h || `Column ${i + 1}`)}</div></td>
                <td>
                  <select class="field__select import-map__select" data-col-idx="${i}">
                    ${Import.FIELDS.map(f =>
                      `<option value="${f.key}" ${f.key === selected ? 'selected' : ''}>${escapeHtml(f.label)}</option>`
                    ).join('')}
                  </select>
                </td>
                <td class="import-map__preview">${sampleText}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="import-options">
      <div class="import-options__label">When both listing & selling agents are present, credit the deal to:</div>
      <div class="import-options__choices">
        <label class="radio"><input type="radio" name="clientStrategy" value="listingFirst" checked /> <span>Listing Agent</span></label>
        <label class="radio"><input type="radio" name="clientStrategy" value="sellingFirst" /> <span>Selling Agent</span></label>
      </div>
      <div class="import-options__hint">Either role can be the client. An explicit "Client" column, if mapped, always wins.</div>
    </div>

    <!-- Per Q3/Q4: title company is a per-batch wizard choice that stamps
         every row in this import. Required before proceeding to Step 3. -->
    <div class="import-options" style="border-top: 1px solid var(--line-soft); margin-top: 8px;">
      <div class="import-options__label">Send these deals to which title company? <span style="color: var(--burgundy, #8b3a3a);">*</span></div>
      <div class="import-options__choices">
        ${TITLE_COMPANIES.map(tc => `
          <label class="radio"><input type="radio" name="importTitleCompany" value="${tc}" /> <span>${tc}</span></label>
        `).join('')}
      </div>
      <div class="import-options__hint">Every row in this batch will be tagged with this title company. You'll be able to retag individual deals later if needed.</div>
    </div>

    <div class="modal__actions">
      <div><button type="button" class="btn btn--ghost" id="importBackTo1">← Back</button></div>
      <div class="modal__actions-right">
        <button type="button" class="btn btn--ghost" data-close-modal>Cancel</button>
        <button type="button" class="btn btn--gold" id="importToStep3">Preview Import →</button>
      </div>
    </div>
  `;
}

function importStep3HTML(state, summary) {
  const { validated } = state;
  const invalidRows = validated.filter(v => v.errors.length);

  return `
    <div class="modal__head">
      <div class="modal__subtitle">Bulk Import · Step 3 of 3</div>
      <h2 class="modal__title">Review & Confirm</h2>
      <p class="modal__lede">Here's what will happen when you commit. No changes have been made yet.</p>
    </div>

    <div class="import-steps">
      <div class="import-step is-done"><span>✓</span> Upload</div>
      <div class="import-step is-done"><span>✓</span> Map Columns</div>
      <div class="import-step is-active"><span>3</span> Review</div>
    </div>

    <div class="import-summary">
      <div class="import-summary__item">
        <div class="import-summary__value">${summary.valid}</div>
        <div class="import-summary__label">Deals ready</div>
      </div>
      <div class="import-summary__item">
        <div class="import-summary__value ${summary.duplicates.length ? 'is-warn' : ''}">${summary.duplicates.length}</div>
        <div class="import-summary__label">Duplicates</div>
      </div>
      <div class="import-summary__item">
        <div class="import-summary__value is-new">${summary.newRealtors.length}</div>
        <div class="import-summary__label">New realtors</div>
      </div>
      <div class="import-summary__item">
        <div class="import-summary__value">${summary.matchedRealtors.length}</div>
        <div class="import-summary__label">Matched in DB</div>
      </div>
    </div>

    ${summary.duplicates.length ? `
      <div class="import-pane import-pane--warn">
        <div class="import-pane__title">${summary.duplicates.length} order number${summary.duplicates.length === 1 ? '' : 's'} already exist</div>
        <div class="import-options__choices" style="margin-top: 6px; margin-bottom: 10px;">
          <label class="radio"><input type="radio" name="duplicateMode" value="skip" checked /> <span>Skip duplicates</span></label>
          <label class="radio"><input type="radio" name="duplicateMode" value="update" /> <span>Update existing</span></label>
          <label class="radio"><input type="radio" name="duplicateMode" value="add" /> <span>Import anyway (create duplicates)</span></label>
        </div>
        <div class="import-chips">
          ${summary.duplicates.slice(0, 20).map(o => `<span class="chip chip--new">${escapeHtml(o)}</span>`).join('')}
          ${summary.duplicates.length > 20 ? `<span class="chip chip--muted">+${summary.duplicates.length - 20} more</span>` : ''}
        </div>
      </div>
    ` : ''}

    ${summary.newRealtors.length ? `
      <div class="import-pane">
        <div class="import-pane__title">New realtors — profiles will be auto-created</div>
        <div class="import-chips">
          ${summary.newRealtors.map(n => `<span class="chip chip--new">${escapeHtml(n)}</span>`).join('')}
        </div>
      </div>
    ` : ''}

    ${summary.matchedRealtors.length ? `
      <div class="import-pane">
        <div class="import-pane__title">Matched to existing realtors</div>
        <div class="import-chips">
          ${summary.matchedRealtors.slice(0, 40).map(n => `<span class="chip chip--match">${escapeHtml(n)}</span>`).join('')}
          ${summary.matchedRealtors.length > 40 ? `<span class="chip chip--muted">+${summary.matchedRealtors.length - 40} more</span>` : ''}
        </div>
      </div>
    ` : ''}

    ${invalidRows.length ? `
      <div class="import-pane import-pane--warn">
        <div class="import-pane__title">${invalidRows.length} row${invalidRows.length === 1 ? '' : 's'} with issues</div>
        <div class="import-pane__body">
          <div class="import-issues">
            ${invalidRows.slice(0, 8).map(v => `
              <div class="import-issue">
                <div class="import-issue__row">Row ${v.rowIndex + 2}${v.deal.orderNumber ? ` · ${escapeHtml(v.deal.orderNumber)}` : ''}</div>
                <div class="import-issue__err">${v.errors.join(', ')}</div>
              </div>
            `).join('')}
            ${invalidRows.length > 8 ? `<div class="muted" style="padding: 8px 0;">…and ${invalidRows.length - 8} more</div>` : ''}
          </div>
          <label class="import-skip">
            <input type="checkbox" id="importSkipInvalid" checked />
            <span>Skip rows with issues (recommended). Uncheck to import them anyway — missing fields will be empty.</span>
          </label>
        </div>
      </div>
    ` : ''}

    <div class="modal__actions">
      <div><button type="button" class="btn btn--ghost" id="importBackTo2">← Back to mapping</button></div>
      <div class="modal__actions-right">
        <button type="button" class="btn btn--ghost" data-close-modal>Cancel</button>
        <button type="button" class="btn btn--gold" id="importCommit">
          Import ${summary.valid} deal${summary.valid === 1 ? '' : 's'}
        </button>
      </div>
    </div>
  `;
}

/* ========================================================================
   Modal · Deal form
   ======================================================================== */

function dealModalHTML(deal, prefill = {}) {
  const d = deal || { transactionType: 'Purchase', ...prefill };
  const title = deal ? 'Edit Deal' : 'New Deal';
  const attr = d.clientAttribution || '';
  return `
    <div class="modal__head">
      <div class="modal__subtitle">Transaction</div>
      <h2 class="modal__title">${title}</h2>
    </div>
    <form id="dealForm">
      <input type="hidden" name="id" value="${deal ? deal.id : ''}" />

      <!-- Section: Identity -->
      <div class="form-section-title">${icon('deals', 14)} Deal Identity</div>
      <div class="form-grid">
        <div class="field">
          <label class="field__label">Order Number</label>
          <input class="field__input" name="orderNumber" value="${escapeHtml(d.orderNumber || '')}" placeholder="VA-25-XXX" required />
        </div>
        <div class="field">
          <label class="field__label">Transaction Type</label>
          <select class="field__select" name="transactionType" id="txType">
            ${TRANSACTION_TYPES.map(t => `<option value="${t}" ${t === d.transactionType ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>

        <div class="field">
          <label class="field__label">Closing Date</label>
          <input class="field__input" type="date" name="closingDate" value="${escapeHtml(d.closingDate || '')}" />
          <span class="field__hint">When the transaction closed</span>
        </div>
        <div class="field">
          <label class="field__label">Disbursement Date</label>
          <input class="field__input" type="date" name="disbursementDate" value="${escapeHtml(d.disbursementDate || '')}" required />
          <span class="field__hint">When funds were released</span>
        </div>

        <div class="field field--full">
          <label class="field__label">Property Address</label>
          <input class="field__input" name="propertyAddress" value="${escapeHtml(d.propertyAddress || '')}" placeholder="123 Main St, City, ST 00000" />
        </div>

        <div class="field field--full">
          <label class="field__label">Underwriter</label>
          <input class="field__input" name="underwriter" value="${escapeHtml(d.underwriter || '')}" placeholder="e.g. First American Title, Stewart Title" />
        </div>
      </div>

      <!-- Section: Parties -->
      <div class="form-section-title">${icon('agents', 14)} Parties</div>
      <div class="form-grid">
        <div class="field">
          <label class="field__label">Listing Agent</label>
          <input class="field__input" id="listingAgentInput" name="listingAgent" value="${escapeHtml(d.listingAgent || '')}" list="agentList" placeholder="Full name" />
        </div>
        <div class="field">
          <label class="field__label">Listing Broker</label>
          <input class="field__input" name="listingBroker" value="${escapeHtml(d.listingBroker || '')}" placeholder="Brokerage firm" />
        </div>

        <div class="field">
          <label class="field__label">Selling Agent</label>
          <input class="field__input" id="sellingAgentInput" name="sellingAgent" value="${escapeHtml(d.sellingAgent || '')}" list="agentList" placeholder="Full name" />
        </div>
        <div class="field">
          <label class="field__label">Selling Broker</label>
          <input class="field__input" name="sellingBroker" value="${escapeHtml(d.sellingBroker || '')}" placeholder="Brokerage firm" />
        </div>
      </div>

      <!-- Section: Client picker -->
      <div class="form-section-title">${icon('check', 14)} Who's Our Client?</div>
      <div class="client-picker" id="clientPicker">
        <div class="client-picker__chips">
          <button type="button" class="client-chip ${attr === 'Listing Agent' ? 'is-active' : ''}" data-client-pick="listing">
            <div class="client-chip__role">Listing Agent</div>
            <div class="client-chip__name" id="chipNameListing">${escapeHtml(d.listingAgent || '—')}</div>
          </button>
          <button type="button" class="client-chip ${attr === 'Selling Agent' ? 'is-active' : ''}" data-client-pick="selling">
            <div class="client-chip__role">Selling Agent</div>
            <div class="client-chip__name" id="chipNameSelling">${escapeHtml(d.sellingAgent || '—')}</div>
          </button>
          <button type="button" class="client-chip ${attr === 'Both' ? 'is-active' : ''}" data-client-pick="both">
            <div class="client-chip__role">Both Sides</div>
            <div class="client-chip__name">One agent represented both</div>
          </button>
          <button type="button" class="client-chip ${attr === 'Direct' ? 'is-active' : ''}" data-client-pick="direct">
            <div class="client-chip__role">Direct</div>
            <div class="client-chip__name">No agent involved</div>
          </button>
        </div>
        <div class="client-picker__selected">
          <div class="field">
            <label class="field__label">Credited Client Name</label>
            <input class="field__input" name="client" id="clientInput" value="${escapeHtml(d.client || '')}" list="agentList" placeholder="Type a name — new realtors are added automatically" />
            <span class="field__hint">Tip: click a chip above to auto-fill; or type a name to add a new realtor.</span>
          </div>
          <input type="hidden" name="clientAttribution" id="clientAttribution" value="${escapeHtml(attr)}" />
        </div>
      </div>

      <!-- Section: Lender (institution that funded the loan) -->
      <div class="form-section-title">${icon('underwriters', 14)} Lender, Loan &amp; Property Value</div>
      <div class="form-grid">
        <div class="field">
          <label class="field__label">Lender Name</label>
          <input class="field__input" name="lenderName" value="${escapeHtml(d.lenderName || '')}" list="lenderList" placeholder="e.g. Wells Fargo, Rocket Mortgage" />
          <span class="field__hint">Institution that funded the loan</span>
        </div>
        <div class="field">
          <label class="field__label">Loan Officer</label>
          <input class="field__input" name="loanOfficer" value="${escapeHtml(d.loanOfficer || '')}" list="loanOfficerList" placeholder="Person you worked with at the lender" />
          <span class="field__hint">The actual individual contact</span>
        </div>
        <div class="field">
          <label class="field__label">Purchase Price</label>
          <input class="field__input" type="number" step="0.01" name="purchasePrice" value="${d.purchasePrice || ''}" placeholder="Property sale price" />
        </div>
        <div class="field">
          <label class="field__label">Loan Amount</label>
          <input class="field__input" type="number" step="0.01" name="loanAmount" value="${d.loanAmount || ''}" placeholder="Optional" />
        </div>
      </div>

      <!-- Section: Title Company routing -->
      <div class="form-section-title">${icon('check', 14)} Title Company</div>
      <div class="title-company-picker">
        ${TITLE_COMPANIES.map(tc => `
          <label class="title-co-chip ${(d.titleCompany === tc) ? 'is-active' : ''}">
            <input type="radio" name="titleCompany" value="${tc}" ${d.titleCompany === tc ? 'checked' : ''} />
            <span class="title-co-chip__name">${tc}</span>
          </label>
        `).join('')}
      </div>

      <!-- Section: Money -->
      <div class="form-section-title">${icon('expenses', 14)} Revenue</div>
      <div class="form-grid">
        <div class="field">
          <label class="field__label">Settlement Fee</label>
          <input class="field__input" type="number" step="0.01" name="settlementFee" value="${d.settlementFee || ''}" />
        </div>
        <div class="field">
          <label class="field__label">Lender's Policy</label>
          <input class="field__input" type="number" step="0.01" name="lendersPolicy" value="${d.lendersPolicy || ''}" />
        </div>

        <div class="field">
          <label class="field__label">Owner's Policy</label>
          <input class="field__input" type="number" step="0.01" name="ownersPolicy" value="${d.ownersPolicy || ''}" />
        </div>
        <!-- Revenue snapshot — dynamic. ATOZ deals show File Fee, ATG
             deals show Commission %, label flips via JS in app.js. -->
        <div class="field">
          <label class="field__label" id="rateLabel">File Fee (Auto)</label>
          <input class="field__input field__input--calc" id="fileFeePreview" value="${fmtMoney(computeFileFee(d.transactionType || 'Purchase'))}" readonly />
          <span class="field__hint" id="rateHint">Set per title company in Data &amp; Backup</span>
        </div>

        <div class="field field--full">
          <label class="field__label">Revenue (Auto)</label>
          <input class="field__input field__input--calc" id="revenuePreview" readonly value="${fmtMoney(d.revenue || 0)}" />
          <span class="field__hint" id="revenueFormulaHint">Settle + Lender + Owner − File Fee</span>
        </div>
      </div>

      <datalist id="agentList">
        ${Store.getAgents().map(a => `<option value="${escapeHtml(a.name)}"></option>`).join('')}
      </datalist>
      <datalist id="lenderList">
        ${Store.getLenders().map(l => `<option value="${escapeHtml(l.name)}"></option>`).join('')}
      </datalist>
      <datalist id="loanOfficerList">
        ${[...new Set(Store.getDeals().map(x => (x.loanOfficer || '').trim()).filter(Boolean))].sort().map(n => `<option value="${escapeHtml(n)}"></option>`).join('')}
      </datalist>

      <div class="modal__actions">
        <div>
          ${deal ? `<button type="button" class="btn btn--danger" id="deleteDealFromModal">Delete Deal</button>` : ''}
        </div>
        <div class="modal__actions-right">
          <button type="button" class="btn btn--ghost" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn--gold">${deal ? 'Save Changes' : 'Create Deal'}</button>
        </div>
      </div>
    </form>
  `;
}

/* ========================================================================
   Modal · Expense form
   ======================================================================== */

function expenseModalHTML(expense, prefill = {}) {
  const e = expense || { date: new Date().toISOString().slice(0, 10), ...prefill };
  const title = expense ? 'Edit Expense' : 'New Expense';
  return `
    <div class="modal__head">
      <div class="modal__subtitle">Client Investment</div>
      <h2 class="modal__title">${title}</h2>
    </div>
    <form id="expenseForm">
      <input type="hidden" name="id" value="${expense ? expense.id : ''}" />

      <div class="form-grid">
        <div class="field">
          <label class="field__label">Date</label>
          <input class="field__input" type="date" name="date" value="${escapeHtml(e.date || '')}" required />
        </div>
        <div class="field">
          <label class="field__label">Category</label>
          <select class="field__select" name="expenseType" required>
            ${EXPENSE_TYPES.map(t => `<option value="${t}" ${t === e.expenseType ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>

        <div class="field field--full">
          <label class="field__label">Realtor (Client)</label>
          <div class="combobox" data-combobox>
            <input class="field__input combobox__input" type="text" name="client" autocomplete="off" value="${escapeHtml(e.client || '')}" placeholder="Start typing a name, or pick from the list" />
            <button type="button" class="combobox__toggle" aria-label="Open dropdown">▾</button>
            <div class="combobox__panel" hidden>
              ${Store.getAgents().map(a => `<button type="button" class="combobox__option" data-value="${escapeHtml(a.name)}">${escapeHtml(a.name)}</button>`).join('') || '<div class="combobox__empty">No realtors yet — type to create one.</div>'}
            </div>
          </div>
          <div class="field__hint">Optional. Type to add a new realtor.</div>
        </div>

        <div class="field field--full">
          <label class="field__label">Lender</label>
          <div class="combobox" data-combobox>
            <input class="field__input combobox__input" type="text" name="lenderName" autocomplete="off" value="${escapeHtml(e.lenderName || '')}" placeholder="Tag this expense to a lender (e.g. Wells Fargo)" />
            <button type="button" class="combobox__toggle" aria-label="Open dropdown">▾</button>
            <div class="combobox__panel" hidden>
              ${Store.getLenders().map(l => `<button type="button" class="combobox__option" data-value="${escapeHtml(l.name)}">${escapeHtml(l.name)}</button>`).join('') || '<div class="combobox__empty">No lenders yet — type to create one.</div>'}
            </div>
          </div>
          <div class="field__hint">Optional. Tag this expense to a lender so it shows on their profile and ROI. You can fill realtor, lender, or both.</div>
        </div>

        <div class="field field--full">
          <label class="field__label">Description</label>
          <input class="field__input" name="description" value="${escapeHtml(e.description || '')}" placeholder="e.g. Holiday gift, Birthday lunch, Sponsored event" />
        </div>

        <div class="field">
          <label class="field__label">Amount</label>
          <input class="field__input" type="number" step="0.01" name="amount" value="${e.amount || ''}" required />
        </div>
        <div class="field">
          <label class="field__label">Notes</label>
          <input class="field__input" name="notes" value="${escapeHtml(e.notes || '')}" />
        </div>
      </div>

      <div class="modal__actions">
        <div>
          ${expense ? `<button type="button" class="btn btn--danger" id="deleteExpenseFromModal">Delete</button>` : ''}
        </div>
        <div class="modal__actions-right">
          <button type="button" class="btn btn--ghost" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn--gold">${expense ? 'Save Changes' : 'Create Expense'}</button>
        </div>
      </div>
    </form>
  `;
}

/* ========================================================================
   Entity edit modal HTML — Realtor / Underwriter / Lender

   One modal handles all three. The fields shown depend on `kind`:
     - realtor    : name (rename), notes, budgetTarget
     - underwriter: name (rename), notes
     - lender     : name (rename), notes, budgetTarget

   "Rename" is destructive (cascades across every deal/expense reference)
   so the form requires the user to confirm by leaving the new name
   different from the current one.
   ======================================================================== */

function entityEditModalHTML(kind, name, meta = {}) {
  const KIND_LABELS = {
    realtor:     { title: 'Edit Realtor',     entity: 'realtor',     budget: true,  contact: true,  noun: 'realtor',     orgLabel: 'Brokerage' },
    underwriter: { title: 'Edit Underwriter', entity: 'underwriter', budget: false, contact: false, noun: 'underwriter', orgLabel: '' },
    lender:      { title: 'Edit Lender',      entity: 'lender',      budget: true,  contact: true,  noun: 'lender',      orgLabel: 'Institution' }
  };
  const k = KIND_LABELS[kind] || KIND_LABELS.realtor;
  // State licenses are stored as an array; render as a comma list for editing.
  const licenses = Array.isArray(meta.stateLicenses) ? meta.stateLicenses.join(', ') : '';
  // Referred-By autocomplete pulls from BOTH realtors AND lenders so the
  // user can pick anyone in the database who made the referral.
  const refByOptions = [
    ...Store.getAgents().map(a => a.name),
    ...Store.getLenders().map(l => l.name)
  ].filter(Boolean);
  const refByOptionsUnique = [...new Set(refByOptions)].sort();

  return `
    <div class="modal__head">
      <div class="modal__subtitle">${k.entity}</div>
      <h2 class="modal__title">${k.title}</h2>
    </div>
    <form id="entityEditForm" data-kind="${kind}" data-original-name="${escapeHtml(name)}">
      <div class="form-grid">
        <div class="field field--full">
          <label class="field__label">Name</label>
          <input class="field__input" name="name" value="${escapeHtml(name)}" required />
          <span class="field__hint">Renaming cascades across every deal${kind === 'underwriter' ? '' : ' and expense'} that references this ${k.noun}.</span>
        </div>

        ${k.contact ? `
        <div class="field">
          <label class="field__label">Phone</label>
          <input class="field__input" type="tel" name="phone" value="${escapeHtml(meta.phone || '')}" placeholder="(555) 123-4567" />
        </div>
        <div class="field">
          <label class="field__label">Email</label>
          <input class="field__input" type="email" name="email" value="${escapeHtml(meta.email || '')}" placeholder="name@example.com" />
        </div>
        <div class="field field--full">
          <label class="field__label">${k.orgLabel}</label>
          <input class="field__input" name="brokerage" value="${escapeHtml(meta.brokerage || '')}" placeholder="${kind === 'lender' ? 'e.g. parent company / institution' : 'e.g. Keller Williams, RE/MAX'}" />
        </div>
        <div class="field field--full">
          <label class="field__label">State Licenses</label>
          <input class="field__input" name="stateLicenses" value="${escapeHtml(licenses)}" placeholder="VA, MD, DC" />
          <span class="field__hint">Comma-separated list of state codes</span>
        </div>
        <div class="field">
          <label class="field__label">Lead Source</label>
          <select class="field__select" name="leadSource">
            <option value="" ${!meta.leadSource ? 'selected' : ''}>—</option>
            <option value="Direct" ${meta.leadSource === 'Direct' ? 'selected' : ''}>Direct</option>
            <option value="Indirect" ${meta.leadSource === 'Indirect' ? 'selected' : ''}>Indirect</option>
          </select>
        </div>
        <div class="field">
          <label class="field__label">Referred By</label>
          <input class="field__input" name="referredBy" value="${escapeHtml(meta.referredBy || '')}" list="refByList" placeholder="Type a name or pick from list" />
          <span class="field__hint">Pulls from existing realtors and lenders</span>
        </div>
        <datalist id="refByList">
          ${refByOptionsUnique.map(n => `<option value="${escapeHtml(n)}"></option>`).join('')}
        </datalist>
        ` : ''}

        ${k.budget ? `
        <div class="field field--full">
          <label class="field__label">Budget Target (optional)</label>
          <input class="field__input" type="number" step="0.01" name="budgetTarget" value="${meta.budgetTarget != null ? meta.budgetTarget : ''}" placeholder="e.g. 5000" />
          <span class="field__hint">If set, the profile shows "$X spent of $Y target" with a progress bar.</span>
        </div>
        ` : ''}

        <div class="field field--full">
          <label class="field__label">Notes</label>
          <textarea class="field__input" name="notes" rows="4" placeholder="Anything you want to remember about this ${k.noun}.">${escapeHtml(meta.notes || '')}</textarea>
        </div>
      </div>

      <div class="modal__actions">
        <div></div>
        <div class="modal__actions-right">
          <button type="button" class="btn btn--ghost" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn--gold">Save Changes</button>
        </div>
      </div>
    </form>
  `;
}

/* ========================================================================
   Bulk title-company tag modal — used by the deals-page bulk action
   ======================================================================== */

function bulkTagTitleCompanyModalHTML(count) {
  return `
    <div class="modal__head">
      <div class="modal__subtitle">Bulk action</div>
      <h2 class="modal__title">Tag ${count} deal${count === 1 ? '' : 's'}</h2>
    </div>
    <form id="bulkTagForm">
      <p class="muted" style="margin: 0 0 16px;">Set the title company for ${count} selected deal${count === 1 ? '' : 's'}. This will overwrite any existing title-company value on those deals.</p>
      <div class="title-company-picker">
        ${TITLE_COMPANIES.map(tc => `
          <label class="title-co-chip">
            <input type="radio" name="titleCompany" value="${tc}" required />
            <span class="title-co-chip__name">${tc}</span>
          </label>
        `).join('')}
      </div>
      <div class="modal__actions">
        <div></div>
        <div class="modal__actions-right">
          <button type="button" class="btn btn--ghost" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn--gold">Apply Tag</button>
        </div>
      </div>
    </form>
  `;
}

/* ========================================================================
   Goals modal HTML
   ======================================================================== */

function goalsModalHTML(year, existing = {}) {
  const isEdit = Object.keys(existing).length > 0;
  const thisYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = thisYear - 1; y <= thisYear + 3; y++) {
    yearOptions.push(`<option value="${y}" ${Number(year) === y ? 'selected' : ''}>${y}</option>`);
  }
  return `
    <form id="goalsForm" class="modal__form">
      <header class="modal__header">
        <div>
          <div class="modal__eyebrow">Strategy</div>
          <h2 class="modal__title">${isEdit ? `Edit ${year} Goals` : `Set ${year} Goals`}</h2>
        </div>
        <button type="button" class="modal__close" data-close-modal aria-label="Close">${icon('close', 18)}</button>
      </header>
      <div class="modal__body">
        <div class="form-section-title">${icon('settings', 12)} Target Year</div>
        <div class="field">
          <label class="field__label">Year</label>
          <select class="field__input" name="year">${yearOptions.join('')}</select>
        </div>

        <div class="form-section-title">${icon('monthly', 12)} Yearly Targets</div>
        <div class="grid-2">
          <div class="field">
            <label class="field__label">Revenue Goal ($)</label>
            <input class="field__input" type="number" name="revenue" min="0" step="100" value="${existing.revenue || ''}" placeholder="e.g. 500000" required />
          </div>
          <div class="field">
            <label class="field__label">Deals Goal (count)</label>
            <input class="field__input" type="number" name="deals" min="0" step="1" value="${existing.deals || ''}" placeholder="e.g. 120" required />
          </div>
          <div class="field">
            <label class="field__label">Active Realtors Goal (count)</label>
            <input class="field__input" type="number" name="activeRealtors" min="0" step="1" value="${existing.activeRealtors || ''}" placeholder="e.g. 40" required />
            <div class="field__hint">Distinct realtors who brought you deals this year.</div>
          </div>
          <div class="field">
            <label class="field__label">Avg Revenue / Deal <span class="muted">(optional)</span></label>
            <input class="field__input" type="number" name="avgDealRevenue" min="0" step="50" value="${existing.avgDealRevenue || ''}" placeholder="e.g. 4100" />
            <div class="field__hint">Used as a benchmark. Auto-derived if blank.</div>
          </div>
          <div class="field">
            <label class="field__label">Expense Budget <span class="muted">(optional)</span></label>
            <input class="field__input" type="number" name="expenseBudget" min="0" step="100" value="${existing.expenseBudget || ''}" placeholder="e.g. 25000" />
          </div>
        </div>
      </div>
      <div class="modal__actions">
        <div class="modal__actions-left">
          ${isEdit ? `<button type="button" class="btn btn--danger-ghost" id="deleteGoalsFromModal">${icon('trash', 14)} Remove Goals</button>` : ''}
        </div>
        <div class="modal__actions-right">
          <button type="button" class="btn btn--ghost" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn--gold">${isEdit ? 'Save Changes' : 'Set Goals'}</button>
        </div>
      </div>
    </form>
  `;
}

/* ========================================================================
   Goals & Predictions view
   ======================================================================== */

Views.goals = function(query = {}) {
  const today = new Date();
  const year = Number(query.year || today.getFullYear());
  const horizon = query.horizon || '1y';
  const goal = Goals.get(year);
  const monthlyStats = Store.getMonthlyStats();
  const analysis = goal ? computeGoalAnalysis(goal, year, today) : null;
  const availableYears = Array.from(new Set([...Goals.years(), year, today.getFullYear(), today.getFullYear() + 1])).sort();

  const horizonMap = { '1m': 1, '6m': 6, '1y': 12, '5y': 60 };
  const horizonMonths = horizonMap[horizon] || 12;
  const predictions = computePredictions(horizonMonths, monthlyStats);

  const yearChips = availableYears.map(y =>
    `<button type="button" class="year-chip ${y === year ? 'is-active' : ''}" data-year="${y}">${y}</button>`
  ).join('');

  const horizonTabs = [
    { key: '1m', label: '1 Month', months: 1 },
    { key: '6m', label: '6 Months', months: 6 },
    { key: '1y', label: '1 Year', months: 12 },
    { key: '5y', label: '5 Years', months: 60 }
  ].map(h =>
    `<button type="button" class="horizon-tab ${horizon === h.key ? 'is-active' : ''}" data-horizon="${h.key}">${h.label}</button>`
  ).join('');

  const trackerHTML = !goal
    ? buildGoalEmptyStateHTML(year)
    : buildGoalTrackerHTML(goal, analysis);

  // --- Predictions panel HTML ---
  const predictionsHTML = predictions.conservative ? `
    <div class="horizon-tabs">${horizonTabs}</div>

    <div class="scenario-grid">
      ${scenarioCard('Conservative', 'No growth · last 6-mo avg', predictions.conservative, 'muted')}
      ${scenarioCard('Expected', 'Linear trend · last 12 mo',     predictions.expected,     'forest')}
      ${scenarioCard('Optimistic', 'Trend + growth',               predictions.optimistic,   'gold')}
    </div>

    <div class="panel__body panel__body--chart">
      <div class="chart-wrap chart-wrap--tall">
        <canvas id="goalsForecastChart"></canvas>
      </div>
    </div>

    <div class="prediction-assumptions">
      <div class="form-section-title">${icon('settings', 12)} Assumptions</div>
      <div class="assumption-grid">
        <div class="assumption-item"><span class="assumption-item__label">History</span><span class="assumption-item__value">${predictions.assumptions.historyMonths} months</span></div>
        <div class="assumption-item"><span class="assumption-item__label">Confidence</span><span class="assumption-item__value">${predictions.assumptions.confidence}</span></div>
        <div class="assumption-item"><span class="assumption-item__label">Avg growth / month</span><span class="assumption-item__value">${predictions.assumptions.avgGrowth > 0 ? '+' : ''}${predictions.assumptions.avgGrowth}%</span></div>
        <div class="assumption-item"><span class="assumption-item__label">6-mo avg revenue</span><span class="assumption-item__value">${fmtMoney(predictions.assumptions.rev6, { decimals: 0 })}</span></div>
        <div class="assumption-item"><span class="assumption-item__label">Type mix</span><span class="assumption-item__value">${predictions.assumptions.typeMix.purchase}% P · ${predictions.assumptions.typeMix.refinance}% R · ${predictions.assumptions.typeMix.subordinate}% S</span></div>
      </div>
    </div>
  ` : `
    <div class="empty-state">
      <div class="empty-state__eyebrow">Not enough history</div>
      <h3 class="empty-state__title">Add a few deals to unlock predictions.</h3>
      <p class="empty-state__body">Forecasts are based on your monthly pattern. Once you have 3+ months of data, you'll see conservative / expected / optimistic trajectories for 1 month, 6 months, 1 year, and 5 years out.</p>
    </div>
  `;

  return `
    <section class="view">
      <header class="view-header">
        <div class="view-header__left">
          <div class="eyebrow">Strategy</div>
          <h1>Set the goal. <em>Track the pace.</em></h1>
        </div>
        <div class="view-header__right">
          <button class="btn btn--gold" data-action="open-goals-modal">${goal ? 'Edit' : 'Set'} ${year} Goals</button>
        </div>
      </header>

      <div class="panel">
        <div class="panel__head">
          <div>
            <h3 class="panel__title">${icon('check', 16)} Goal Tracker · ${year}</h3>
            <div class="panel__subtitle">YTD progress · projection from trailing-12-month pace · path to goal</div>
          </div>
          <div class="year-chips">${yearChips}</div>
        </div>
        <div class="panel__body">
          ${trackerHTML}
        </div>
      </div>

      <div class="panel">
        <div class="panel__head">
          <div>
            <h3 class="panel__title">${icon('monthly', 16)} Predictions</h3>
            <div class="panel__subtitle">Forecast your next month, half-year, full year, and five-year trajectory</div>
          </div>
        </div>
        ${predictionsHTML}
      </div>
    </section>
  `;
};

/* ────────────────────────────────────────────────────────────────────────
   Goal tracker — unified builder
   Uses the analysis object from computeGoalAnalysis(). One coherent story:
     hero (status + narrative)
     projection vs goal
     YTD progress bars (revenue / deals / realtors)
     equation breakdown + needed pace
     three paths (only when behind)
   ──────────────────────────────────────────────────────────────────────── */

function buildGoalEmptyStateHTML(year) {
  return `
    <div class="empty-state">
      <div class="empty-state__eyebrow">No ${year} goals set</div>
      <h3 class="empty-state__title">Set your ${year} targets to start tracking.</h3>
      <p class="empty-state__body">Input a revenue goal, deal count, and realtor target. The tracker will then show your trailing-12-month pace, the year-end projection, and exactly what each lever of the business needs to do to hit the numbers.</p>
      <button class="btn btn--gold" data-action="open-goals-modal">Set ${year} Goals</button>
    </div>
  `;
}

function buildGoalTrackerHTML(goal, a) {
  const fRev = n => fmtMoney(n, { decimals: 0 });
  const fClients = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 1 });
  const fDeals = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const fPrice = n => fmtMoney(n, { decimals: 0 });
  const fMonths = n => {
    const whole = Math.round(n);
    return whole === 1 ? '1 month' : whole + ' months';
  };

  return `
    <div class="goal-tracker">
      ${buildGoalHeroHTML(goal, a, fRev, fMonths)}
      ${buildGoalProjectionHTML(goal, a, fRev)}
      ${buildGoalProgressGridHTML(goal, a)}
      ${buildGoalEquationHTML(goal, a, fRev, fClients, fDeals, fPrice, fMonths)}
    </div>
  `;
}

// Hero: status badge + one-sentence narrative that matches the status
function buildGoalHeroHTML(goal, a, fRev, fMonths) {
  const narrative = goalNarrative(goal, a, fRev, fMonths);
  return `
    <div class="goal-tracker__hero">
      <div class="status-badge status-badge--${a.statusTone}">${a.status}</div>
      <div class="goal-tracker__narrative">${narrative}</div>
    </div>
  `;
}

function goalNarrative(goal, a, fRev, fMonths) {
  const projected = fRev(a.projectedRevenue);
  const target = fRev(goal.revenue);
  const variance = fRev(Math.abs(a.revenueVariance));

  if (a.status === 'AHEAD') {
    return `At your trailing-12-month pace of <strong>${fRev(a.pace.revenue)}/mo</strong>, you'll finish the year at <strong>${projected}</strong> — about <strong>${variance}</strong> over the <strong>${target}</strong> target.`;
  }
  if (a.status === 'ON TRACK') {
    return `At your trailing-12-month pace of <strong>${fRev(a.pace.revenue)}/mo</strong>, you'll finish the year near <strong>${projected}</strong> — within 5% of the <strong>${target}</strong> target.`;
  }
  if (a.status === 'SLIGHTLY BEHIND') {
    return `Projecting <strong>${projected}</strong> at current pace — <strong>${variance}</strong> short of <strong>${target}</strong>. Need to lift pace to <strong>${fRev(a.neededMonthlyRevenue)}/mo</strong> over the next ${fMonths(a.monthsRemaining)} to catch up.`;
  }
  if (a.status === 'BEHIND') {
    return `Projecting <strong>${projected}</strong> — well short of <strong>${target}</strong>. Need <strong>${fRev(a.neededMonthlyRevenue)}/mo</strong> over the next ${fMonths(a.monthsRemaining)} to hit the goal.`;
  }
  return 'Set a revenue goal to see your status.';
}

// Projection vs goal — two big numbers side by side
function buildGoalProjectionHTML(goal, a, fRev) {
  const pct = goal.revenue ? Math.min(150, Math.max(0, (a.projectedRevenue / goal.revenue) * 100)) : 0;
  const barWidth = Math.min(100, pct);
  return `
    <div class="proj-wrap">
      <div class="proj-row">
        <div class="proj-col">
          <div class="proj-col__label">Projected year-end</div>
          <div class="proj-col__value">${fRev(a.projectedRevenue)}</div>
          <div class="proj-col__hint">${fRev(a.ytdRevenue)} booked + ${fRev(a.forwardRevenue)} from ${Math.round(a.monthsRemaining)} months at current pace</div>
        </div>
        <div class="proj-col proj-col--target">
          <div class="proj-col__label">${goal.year || a.year} target</div>
          <div class="proj-col__value">${fRev(goal.revenue)}</div>
          <div class="proj-col__hint">${a.revenueVariance >= 0 ? `+${fRev(a.revenueVariance)} cushion` : `${fRev(a.revenueVariance)} gap`}</div>
        </div>
      </div>
      <div class="proj-bar" aria-label="Projected vs goal">
        <div class="proj-bar__fill proj-bar__fill--${a.statusTone}" style="width: 0%" data-target-width="${barWidth.toFixed(1)}"></div>
        <div class="proj-bar__marker" title="Goal">
          <span class="proj-bar__marker-label">Goal</span>
        </div>
      </div>
    </div>
  `;
}

// YTD progress grid: three cards, each showing YTD / goal + progress bar
function buildGoalProgressGridHTML(goal, a) {
  return `
    <div class="ytd-grid">
      ${ytdCard('YTD Revenue',
        fmtMoney(a.ytdRevenue, { decimals: 0 }),
        fmtMoney(goal.revenue, { decimals: 0 }),
        a.revenuePct, a.yearProgressPct)}
      ${ytdCard('YTD Deals',
        fmtNumber(a.ytdDealCount),
        fmtNumber(goal.deals),
        a.dealsPct, a.yearProgressPct)}
      ${ytdCard('Unique Realtors',
        fmtNumber(a.ytdRealtorCount),
        fmtNumber(goal.activeRealtors),
        a.realtorsPct, a.yearProgressPct)}
    </div>
  `;
}

function ytdCard(label, ytdStr, goalStr, pct, yearPct) {
  const safePct = Math.min(100, Math.max(0, pct));
  const markerPct = Math.min(100, Math.max(0, yearPct));
  return `
    <div class="ytd-card" data-animate="card">
      <div class="ytd-card__label">${label}</div>
      <div class="ytd-card__ytd">${ytdStr}</div>
      <div class="ytd-card__goal">of ${goalStr}</div>
      <div class="ytd-bar" title="${pct.toFixed(0)}% of goal · year is ${yearPct.toFixed(0)}% through">
        <div class="ytd-bar__fill" style="width: 0%" data-target-width="${safePct.toFixed(1)}"></div>
        <div class="ytd-bar__marker" style="left: ${markerPct}%"></div>
      </div>
      <div class="ytd-card__footer">
        <span class="ytd-card__pct">${pct.toFixed(0)}% of goal</span>
        <span class="ytd-card__year">year: ${yearPct.toFixed(0)}%</span>
      </div>
    </div>
  `;
}

// Equation: pace breakdown + needed pace + three paths (if behind)
function buildGoalEquationHTML(goal, a, fRev, fClients, fDeals, fPrice, fMonths) {
  const c = a.pace;
  if (!c || c.revenue === 0) {
    return `<div class="eq-hint">Not enough recent activity to compute a pace breakdown yet.</div>`;
  }

  const lever = (value, label) => `
    <div class="eq-lever">
      <div class="eq-lever__value">${value}</div>
      <div class="eq-lever__label">${label}</div>
    </div>
  `;

  const currentRow = `
    <div class="eq-row">
      <div class="eq-row__label">Your Pace<br><small>avg ${c.windowStart} – ${c.windowEnd}</small></div>
      <div class="eq-row__formula">
        <div class="eq-total">${fRev(c.revenue)}<small>/mo</small></div>
        <span class="eq-equals">=</span>
        ${lever(fClients(c.clients), 'active realtors')}
        <span class="eq-op">×</span>
        ${lever(fDeals(c.dealsPerClient), 'deals / realtor')}
        <span class="eq-op">×</span>
        ${lever(fPrice(c.dealPrice), 'avg deal')}
      </div>
    </div>
  `;

  // If already met or ahead: just show pace + headroom, no paths
  if (a.revenueGap === 0) {
    return `
      <div class="eq-wrap">
        ${currentRow}
        <div class="eq-hint">Goal already booked for ${a.year}. Raise the target or hold the line.</div>
      </div>
    `;
  }

  if (a.aheadOfPace) {
    return `
      <div class="eq-wrap">
        ${currentRow}
        <div class="eq-row eq-row--target">
          <div class="eq-row__label">Needed Pace<br><small>next ${fMonths(a.monthsRemaining)}</small></div>
          <div class="eq-row__formula">
            <div class="eq-total eq-total--target">${fRev(a.neededMonthlyRevenue)}<small>/mo</small></div>
            <div class="eq-row__narrative">Your current pace <strong>already clears</strong> what's needed — about <strong>${fRev(Math.abs(a.paceDelta))}/mo</strong> cushion.</div>
          </div>
        </div>
      </div>
    `;
  }

  // BEHIND — show the three single-lever paths.
  const eqT = a.equation.target;
  if (!eqT || eqT.alreadyMet) {
    return `
      <div class="eq-wrap">
        ${currentRow}
      </div>
    `;
  }

  const clientDelta = eqT.clients - c.clients;
  const dealsDelta  = eqT.dealsPerClient - c.dealsPerClient;
  const priceDelta  = eqT.dealPrice - c.dealPrice;

  const pathCard = (title, desc, rows) => `
    <div class="path-card">
      <div class="path-card__head">
        <div class="path-card__title">${title}</div>
        <div class="path-card__desc">${desc}</div>
      </div>
      <div class="path-card__rows">
        ${rows.map(r => `
          <div class="path-card__row ${r.highlight ? 'is-highlight' : ''}">
            <span class="path-card__metric">${r.label}</span>
            <span class="path-card__value">${r.value}</span>
            ${r.delta ? `<span class="path-card__delta">${r.delta}</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  return `
    <div class="eq-wrap">
      ${currentRow}

      <div class="eq-row eq-row--target">
        <div class="eq-row__label">Needed Pace<br><small>next ${fMonths(a.monthsRemaining)}</small></div>
        <div class="eq-row__formula">
          <div class="eq-total eq-total--target">${fRev(eqT.revenue)}<small>/mo</small></div>
          <div class="eq-row__narrative"><strong>${fRev(eqT.totalGap)}</strong> still needed this year — <strong>${fRev(a.paceDelta)}/mo more</strong> than your current pace.</div>
        </div>
      </div>

      <div class="eq-paths">
        <div class="eq-paths__title">Three paths to hit ${fRev(eqT.revenue)}/mo over the next ${fMonths(a.monthsRemaining)}</div>
        <div class="eq-paths__subtitle">Each path holds two levers at today's pace and solves for the third.</div>
        <div class="path-grid">
          ${pathCard('Add realtors', 'More people sending you deals', [
            { label: 'Active realtors / mo', value: fClients(eqT.clients), delta: `+${fClients(clientDelta)}`, highlight: true },
            { label: 'Deals / realtor',       value: fDeals(c.dealsPerClient) },
            { label: 'Avg deal price',        value: fPrice(c.dealPrice) }
          ])}
          ${pathCard('Close more per realtor', 'Same realtors, more repeat deals', [
            { label: 'Active realtors / mo', value: fClients(c.clients) },
            { label: 'Deals / realtor',       value: fDeals(eqT.dealsPerClient), delta: `+${fDeals(dealsDelta)}`, highlight: true },
            { label: 'Avg deal price',        value: fPrice(c.dealPrice) }
          ])}
          ${pathCard('Raise deal size', 'Target higher-value properties', [
            { label: 'Active realtors / mo', value: fClients(c.clients) },
            { label: 'Deals / realtor',       value: fDeals(c.dealsPerClient) },
            { label: 'Avg deal price',        value: fPrice(eqT.dealPrice), delta: `+${fPrice(priceDelta)}`, highlight: true }
          ])}
        </div>
      </div>
    </div>
  `;
}

function scenarioCard(title, subtitle, data, tone) {
  if (!data) return '';
  return `
    <div class="scenario-card scenario-card--${tone}" data-animate="scenario">
      <div class="scenario-card__head">
        <div class="scenario-card__title">${title}</div>
        <div class="scenario-card__sub">${subtitle}</div>
      </div>
      <div class="scenario-card__revenue">${fmtMoney(data.revenue, { decimals: 0 })}</div>
      <div class="scenario-card__deals">${fmtNumber(data.deals)} deals</div>
      <div class="scenario-card__rule"></div>
      <div class="scenario-card__row"><span class="scenario-card__rowLabel">Avg / deal</span><span class="scenario-card__rowValue">${fmtMoney(data.avgDeal, { decimals: 0 })}</span></div>
      <div class="scenario-card__row"><span class="scenario-card__rowLabel">Purchase</span><span class="scenario-card__rowValue">${data.purchase}</span></div>
      <div class="scenario-card__row"><span class="scenario-card__rowLabel">Refinance</span><span class="scenario-card__rowValue">${data.refinance}</span></div>
      <div class="scenario-card__row"><span class="scenario-card__rowLabel">Subordinate</span><span class="scenario-card__rowValue">${data.subordinate}</span></div>
    </div>
  `;
}

Views.goalsPost = function(params = {}) {
  const today = new Date();
  const year = Number(params.year || today.getFullYear());
  const horizon = params.horizon || '1y';

  // GSAP entry animations
  Animate.staggerIn('[data-animate="card"]', { delay: 0.1, stagger: 0.08 });
  Animate.staggerIn('[data-animate="scenario"]', { delay: 0.2, stagger: 0.08 });
  Animate.growBars('.ytd-bar__fill', { baseDelay: 0.5, stagger: 0.1, duration: 1.1 });
  Animate.growBars('.proj-bar__fill', { baseDelay: 0.4, duration: 1.2 });

  // Edit / set goals buttons (both header button and empty-state button)
  document.querySelectorAll('[data-action="open-goals-modal"]').forEach(btn => {
    btn.addEventListener('click', () => App.openGoalsModal(year));
  });

  // Year chip switcher
  document.querySelectorAll('.year-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      App.navigate('goals', { year: btn.getAttribute('data-year'), horizon });
    });
  });

  // Horizon tab switcher
  document.querySelectorAll('.horizon-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      App.navigate('goals', { year: String(year), horizon: btn.getAttribute('data-horizon') });
    });
  });

  // Render chart if present
  const canvas = document.getElementById('goalsForecastChart');
  if (canvas) {
    const horizonMap = { '1m': 1, '6m': 6, '1y': 12, '5y': 60 };
    const predictions = computePredictions(horizonMap[horizon] || 12, Store.getMonthlyStats());
    renderForecastChart(canvas, predictions.chart);
  }
};

function renderForecastChart(canvas, chartData) {
  if (!chartData || !chartData.labels?.length) return;
  if (CHARTS[canvas.id]) { try { CHARTS[canvas.id].destroy(); } catch {} }
  const ctx = canvas.getContext('2d');
  CHARTS[canvas.id] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: 'Historical',
          data: chartData.historical,
          borderColor: CHART_COLORS.forestDeep,
          backgroundColor: 'rgba(15, 41, 34, 0.06)',
          borderWidth: 2.5,
          tension: 0.22,
          pointRadius: 3,
          pointBackgroundColor: CHART_COLORS.forestDeep,
          fill: true,
          spanGaps: false
        },
        {
          label: 'Expected',
          data: chartData.expected,
          borderColor: CHART_COLORS.forestPrimary,
          borderWidth: 2,
          borderDash: [6, 4],
          tension: 0.18,
          pointRadius: 0,
          fill: false,
          spanGaps: true
        },
        {
          label: 'Conservative',
          data: chartData.conservative,
          borderColor: 'rgba(120, 110, 90, 0.7)',
          borderWidth: 1.6,
          borderDash: [3, 3],
          tension: 0,
          pointRadius: 0,
          fill: false,
          spanGaps: true
        },
        {
          label: 'Optimistic',
          data: chartData.optimistic,
          borderColor: CHART_COLORS.gold,
          borderWidth: 2,
          borderDash: [6, 4],
          tension: 0.18,
          pointRadius: 0,
          fill: false,
          spanGaps: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: CHART_COLORS.forestPrimary,
            font: { family: 'Montserrat', size: 11, weight: '600' },
            padding: 14,
            boxWidth: 18,
            usePointStyle: false
          }
        },
        tooltip: {
          backgroundColor: CHART_COLORS.forestDeep,
          titleColor: CHART_COLORS.goldLight,
          bodyColor: CHART_COLORS.cream,
          padding: 12,
          titleFont: { family: 'Montserrat', weight: '600', size: 11 },
          bodyFont: { family: 'Cormorant Garamond', size: 16 },
          callbacks: {
            label: (c) => c.parsed.y == null ? null : `${c.dataset.label}: $${c.parsed.y.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: CHART_COLORS.forestPrimary, font: { family: 'Montserrat', size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }
        },
        y: {
          grid: { color: 'rgba(15, 41, 34, 0.06)' },
          ticks: {
            color: CHART_COLORS.forestPrimary,
            font: { family: 'Montserrat', size: 10 },
            callback: (v) => '$' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })
          }
        }
      }
    }
  });
}

/* ========================================================================
   Utility
   ======================================================================== */

function debounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}
