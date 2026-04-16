/* ==========================================================================
   Data store · persistence · business calculations
   Mirrors the logic of Ash's 2026 Production Sheet.
   ========================================================================== */

const STORAGE_KEY = 'ra_production_crm_v1';
const SETTINGS_KEY = 'ra_production_crm_settings_v1';

const TRANSACTION_TYPES = ['Purchase', 'Refinance', 'Subordinate Order'];
const EXPENSE_TYPES = ['Marketing', 'Gift', 'Meal', 'Event', 'Sponsorship', 'Referral Fee', 'Other'];
const ATTRIBUTIONS = ['Listing Agent', 'Selling Agent', 'Both', 'Direct'];

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* -------------------------- Business rules --------------------------
   From Ash's Excel (the defaults — can be overridden in Data & Backup):
    - File Fee = 1555.88 if Purchase, 777.94 if Refinance, else 0
    - Revenue = SettlementFee + Lender's Policy + Owner's Policy - File Fee
    - Client Source is auto-derived from Listing/Selling agent presence
-------------------------------------------------------------------- */

const DEFAULT_FILE_FEES = {
  'Purchase': 1555.88,
  'Refinance': 777.94,
  'Subordinate Order': 0
};

const Settings = {
  _cache: null,
  load() {
    if (this._cache) return this._cache;
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      this._cache = {
        fileFees: { ...DEFAULT_FILE_FEES, ...(parsed.fileFees || {}) }
      };
    } catch {
      this._cache = { fileFees: { ...DEFAULT_FILE_FEES } };
    }
    return this._cache;
  },
  save(patch) {
    const cur = this.load();
    const next = { ...cur, ...patch, fileFees: { ...cur.fileFees, ...(patch.fileFees || {}) } };
    this._cache = next;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    return next;
  },
  resetFileFees() {
    return this.save({ fileFees: { ...DEFAULT_FILE_FEES } });
  }
};

function computeFileFee(transactionType) {
  const fees = Settings.load().fileFees;
  return fees[transactionType] ?? 0;
}

function computeRevenue(deal) {
  const sf = Number(deal.settlementFee || 0);
  const lp = Number(deal.lendersPolicy || 0);
  const op = Number(deal.ownersPolicy || 0);
  const ff = computeFileFee(deal.transactionType);
  return round2(sf + lp + op - ff);
}

function computeClientSource(deal) {
  const listing = (deal.listingAgent || '').trim();
  const selling = (deal.sellingAgent || '').trim();
  const client  = (deal.client || '').trim();
  // If the same agent played both roles, or if both sides exist and we credit one of them,
  // mark as 'Both' so the realtor database reflects the dual role.
  if (listing && selling && listing.toLowerCase() === selling.toLowerCase()) return 'Both';
  if (client && listing && selling && (client === listing || client === selling)) return client === listing ? 'Listing Agent' : 'Selling Agent';
  if (listing) return 'Listing Agent';
  if (selling) return 'Selling Agent';
  return 'Direct';
}

function round2(n) { return Math.round(n * 100) / 100; }

/* -------------------------- Store --------------------------- */

const Store = {
  state: { deals: [], expenses: [] },

  init() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        this.state = JSON.parse(raw);
        if (!Array.isArray(this.state.deals)) this.state.deals = [];
        if (!Array.isArray(this.state.expenses)) this.state.expenses = [];
      } catch (e) {
        console.warn('Failed to parse saved data, reseeding', e);
        this._seed();
      }
    } else {
      this._seed();
    }
  },

  _seed() {
    const seed = window.SEED_DATA || { deals: [], expenses: [] };
    this.state = {
      deals: JSON.parse(JSON.stringify(seed.deals)),
      expenses: JSON.parse(JSON.stringify(seed.expenses))
    };
    this._save();
  },

  reseed() {
    this._seed();
  },

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  },

  /* ---------- Deals ---------- */

  getDeals() {
    return this.state.deals.slice();
  },

  getDeal(id) {
    return this.state.deals.find(d => d.id === id);
  },

  saveDeal(payload) {
    // Derive calculated fields
    const deal = { ...payload };
    deal.fileFee = computeFileFee(deal.transactionType);
    deal.revenue = computeRevenue(deal);
    deal.clientAttribution = deal.clientAttribution || computeClientSource(deal);

    if (deal.id) {
      const i = this.state.deals.findIndex(d => d.id === deal.id);
      if (i >= 0) this.state.deals[i] = deal;
    } else {
      deal.id = 'd' + Date.now();
      this.state.deals.push(deal);
    }
    this._save();
    return deal;
  },

  deleteDeal(id) {
    this.state.deals = this.state.deals.filter(d => d.id !== id);
    this._save();
  },

  deleteDeals(ids) {
    const set = new Set(ids);
    const before = this.state.deals.length;
    this.state.deals = this.state.deals.filter(d => !set.has(d.id));
    this._save();
    return before - this.state.deals.length;
  },

  // Recompute fileFee and revenue across every deal. Used after changing
  // the File Fee settings so stored revenue stays consistent.
  recomputeAllDeals() {
    let changed = 0;
    for (const d of this.state.deals) {
      const newFee = computeFileFee(d.transactionType);
      const newRev = computeRevenue(d);
      if (d.fileFee !== newFee || d.revenue !== newRev) {
        d.fileFee = newFee;
        d.revenue = newRev;
        changed++;
      }
    }
    if (changed) this._save();
    return changed;
  },

  /* ---------- Expenses ---------- */

  getExpenses() {
    return this.state.expenses.slice();
  },

  getExpense(id) {
    return this.state.expenses.find(e => e.id === id);
  },

  saveExpense(payload) {
    const expense = { ...payload };
    expense.amount = Number(expense.amount || 0);
    if (expense.id) {
      const i = this.state.expenses.findIndex(e => e.id === expense.id);
      if (i >= 0) this.state.expenses[i] = expense;
    } else {
      expense.id = 'e' + Date.now();
      this.state.expenses.push(expense);
    }
    this._save();
    return expense;
  },

  deleteExpense(id) {
    this.state.expenses = this.state.expenses.filter(e => e.id !== id);
    this._save();
  },

  deleteExpenses(ids) {
    const set = new Set(ids);
    const before = this.state.expenses.length;
    this.state.expenses = this.state.expenses.filter(e => !set.has(e.id));
    this._save();
    return before - this.state.expenses.length;
  },

  /* ---------- Agents (derived) ---------- */

  // Build realtor database from unique names across Deals: Client + Listing + Selling agent.
  // Mirrors Realtor Database sheet logic (UNIQUE(Deals!E:E) + derived type).
  getAgents() {
    const byName = new Map();
    const deals = this.state.deals;
    const expenses = this.state.expenses;

    const ensure = (name) => {
      if (!name || !name.trim()) return null;
      const key = name.trim();
      if (!byName.has(key)) {
        byName.set(key, {
          name: key,
          isListing: false,
          isSelling: false,
          dealCount: 0,
          revenue: 0,
          purchase: 0,
          refinance: 0,
          subordinate: 0,
          firstDeal: null,
          lastDeal: null,
          expenses: 0
        });
      }
      return byName.get(key);
    };

    // Populate from deals. Primary metrics use Client field (mirrors SUMIF on column E)
    for (const d of deals) {
      if (d.listingAgent) ensure(d.listingAgent).isListing = true;
      if (d.sellingAgent) ensure(d.sellingAgent).isSelling = true;

      const attr = d.clientAttribution || computeClientSource(d);
      const listing = (d.listingAgent || '').trim();
      const selling = (d.sellingAgent || '').trim();
      const rev = Number(d.revenue || 0);

      // "Both" with two different agents → split credit 50/50
      if (attr === 'Both' && listing && selling && listing.toLowerCase() !== selling.toLowerCase()) {
        [listing, selling].forEach(name => {
          const a = ensure(name);
          if (!a) return;
          a.dealCount += 1;
          a.revenue += rev / 2;
          if (d.transactionType === 'Purchase') a.purchase += 1;
          else if (d.transactionType === 'Refinance') a.refinance += 1;
          else if (d.transactionType === 'Subordinate Order') a.subordinate += 1;
          if (d.disbursementDate) {
            const t = d.disbursementDate;
            if (!a.firstDeal || t < a.firstDeal) a.firstDeal = t;
            if (!a.lastDeal || t > a.lastDeal) a.lastDeal = t;
          }
        });
      } else {
        const cli = ensure(d.client);
        if (cli) {
          cli.dealCount += 1;
          cli.revenue += rev;
          if (d.transactionType === 'Purchase') cli.purchase += 1;
          else if (d.transactionType === 'Refinance') cli.refinance += 1;
          else if (d.transactionType === 'Subordinate Order') cli.subordinate += 1;

          if (d.disbursementDate) {
            const t = d.disbursementDate;
            if (!cli.firstDeal || t < cli.firstDeal) cli.firstDeal = t;
            if (!cli.lastDeal || t > cli.lastDeal) cli.lastDeal = t;
          }

          // Also track if client appears as listing/selling agent themselves
          if (d.listingAgent === d.client) cli.isListing = true;
          if (d.sellingAgent === d.client) cli.isSelling = true;
        }
      }
    }

    // Populate expenses by client (mirrors SUMIF on Client Expenses!C)
    for (const e of expenses) {
      const c = ensure(e.client);
      if (c) c.expenses += Number(e.amount || 0);
    }

    // Finalize derived fields
    const agents = [];
    for (const a of byName.values()) {
      a.revenue = round2(a.revenue);
      a.expenses = round2(a.expenses);
      a.costPerDeal = a.dealCount > 0 ? round2(a.expenses / a.dealCount) : 0;
      a.roi = a.expenses > 0 ? round2(a.revenue / a.expenses) : (a.revenue > 0 ? 999 : 0);
      a.avgRevenue = a.dealCount > 0 ? round2(a.revenue / a.dealCount) : 0;
      a.daysAsClient = a.firstDeal && a.lastDeal
        ? Math.round((new Date(a.lastDeal) - new Date(a.firstDeal)) / 86400000)
        : 0;
      if (a.isListing && a.isSelling) a.clientType = 'Both';
      else if (a.isListing) a.clientType = 'Listing Agent';
      else if (a.isSelling) a.clientType = 'Selling Agent';
      else a.clientType = '—';
      a.isActive = a.dealCount > 0;
      agents.push(a);
    }

    agents.sort((x, y) => x.name.localeCompare(y.name));
    return agents;
  },

  getAgent(name) {
    return this.getAgents().find(a => a.name === name);
  },

  // Agents aggregated from deals in a specific year only. Used for the dashboard
  // leaderboards when a year filter is active. Structure matches getAgents().
  getAgentsForYear(year) {
    if (year == null) return this.getAgents();
    const byName = new Map();
    const ensure = (name) => {
      if (!name || !name.trim()) return null;
      const key = name.trim();
      if (!byName.has(key)) {
        byName.set(key, {
          name: key,
          isListing: false,
          isSelling: false,
          dealCount: 0,
          revenue: 0,
          purchase: 0,
          refinance: 0,
          subordinate: 0,
          firstDeal: null,
          lastDeal: null,
          expenses: 0
        });
      }
      return byName.get(key);
    };

    const yearDeals = this.state.deals.filter(d => {
      if (!d.disbursementDate) return false;
      const dt = new Date(d.disbursementDate);
      return !isNaN(dt) && dt.getFullYear() === Number(year);
    });

    for (const d of yearDeals) {
      if (d.listingAgent) ensure(d.listingAgent).isListing = true;
      if (d.sellingAgent) ensure(d.sellingAgent).isSelling = true;

      const attr = d.clientAttribution || computeClientSource(d);
      const listing = (d.listingAgent || '').trim();
      const selling = (d.sellingAgent || '').trim();
      const rev = Number(d.revenue || 0);

      if (attr === 'Both' && listing && selling && listing.toLowerCase() !== selling.toLowerCase()) {
        [listing, selling].forEach(name => {
          const a = ensure(name);
          if (!a) return;
          a.dealCount += 1;
          a.revenue += rev / 2;
          if (d.transactionType === 'Purchase') a.purchase += 1;
          else if (d.transactionType === 'Refinance') a.refinance += 1;
          else if (d.transactionType === 'Subordinate Order') a.subordinate += 1;
          if (d.disbursementDate) {
            const t = d.disbursementDate;
            if (!a.firstDeal || t < a.firstDeal) a.firstDeal = t;
            if (!a.lastDeal || t > a.lastDeal) a.lastDeal = t;
          }
        });
      } else {
        const cli = ensure(d.client);
        if (cli) {
          cli.dealCount += 1;
          cli.revenue += rev;
          if (d.transactionType === 'Purchase') cli.purchase += 1;
          else if (d.transactionType === 'Refinance') cli.refinance += 1;
          else if (d.transactionType === 'Subordinate Order') cli.subordinate += 1;
          if (d.disbursementDate) {
            const t = d.disbursementDate;
            if (!cli.firstDeal || t < cli.firstDeal) cli.firstDeal = t;
            if (!cli.lastDeal || t > cli.lastDeal) cli.lastDeal = t;
          }
          if (d.listingAgent === d.client) cli.isListing = true;
          if (d.sellingAgent === d.client) cli.isSelling = true;
        }
      }
    }

    // Expenses in the year bucketed by client
    for (const e of this.state.expenses) {
      if (!e.date) continue;
      const dt = new Date(e.date);
      if (isNaN(dt) || dt.getFullYear() !== Number(year)) continue;
      const c = ensure(e.client);
      if (c) c.expenses += Number(e.amount || 0);
    }

    const agents = [];
    for (const a of byName.values()) {
      a.revenue = round2(a.revenue);
      a.expenses = round2(a.expenses);
      a.costPerDeal = a.dealCount > 0 ? round2(a.expenses / a.dealCount) : 0;
      a.roi = a.expenses > 0 ? round2(a.revenue / a.expenses) : (a.revenue > 0 ? 999 : 0);
      a.avgRevenue = a.dealCount > 0 ? round2(a.revenue / a.dealCount) : 0;
      if (a.isListing && a.isSelling) a.clientType = 'Both';
      else if (a.isListing) a.clientType = 'Listing Agent';
      else if (a.isSelling) a.clientType = 'Selling Agent';
      else a.clientType = '—';
      a.isActive = a.dealCount > 0;
      agents.push(a);
    }
    return agents;
  },

  getDealsForAgent(name) {
    return this.state.deals.filter(d =>
      d.client === name || d.listingAgent === name || d.sellingAgent === name
    );
  },

  getExpensesForAgent(name) {
    return this.state.expenses.filter(e => e.client === name);
  },

  /* ---------- Underwriters (derived from deals) ---------- */

  // Returns one entry per unique underwriter with deal count + policy volume rollup.
  // Mirrors the structure of getAgents so the view layer can reuse patterns.
  getUnderwriters() {
    const byName = new Map();
    const ensure = (name) => {
      if (!name || !name.trim()) return null;
      const key = name.trim();
      if (!byName.has(key)) {
        byName.set(key, {
          name: key,
          dealCount: 0,
          ownersPolicy: 0,
          lendersPolicy: 0,
          settlementFee: 0,
          totalPremium: 0,   // owner + lender
          revenue: 0,         // full deal revenue (fees included)
          purchase: 0,
          refinance: 0,
          subordinate: 0,
          firstDeal: null,
          lastDeal: null
        });
      }
      return byName.get(key);
    };

    for (const d of this.state.deals) {
      const uw = ensure(d.underwriter);
      if (!uw) continue;
      uw.dealCount += 1;
      uw.ownersPolicy  += Number(d.ownersPolicy || 0);
      uw.lendersPolicy += Number(d.lendersPolicy || 0);
      uw.settlementFee += Number(d.settlementFee || 0);
      uw.revenue       += Number(d.revenue || 0);
      uw.totalPremium  += Number(d.ownersPolicy || 0) + Number(d.lendersPolicy || 0);

      if (d.transactionType === 'Purchase') uw.purchase += 1;
      else if (d.transactionType === 'Refinance') uw.refinance += 1;
      else if (d.transactionType === 'Subordinate Order') uw.subordinate += 1;

      if (d.disbursementDate) {
        const t = d.disbursementDate;
        if (!uw.firstDeal || t < uw.firstDeal) uw.firstDeal = t;
        if (!uw.lastDeal  || t > uw.lastDeal)  uw.lastDeal  = t;
      }
    }

    const out = [];
    for (const uw of byName.values()) {
      uw.ownersPolicy  = round2(uw.ownersPolicy);
      uw.lendersPolicy = round2(uw.lendersPolicy);
      uw.settlementFee = round2(uw.settlementFee);
      uw.totalPremium  = round2(uw.totalPremium);
      uw.revenue       = round2(uw.revenue);
      uw.avgPremium    = uw.dealCount > 0 ? round2(uw.totalPremium / uw.dealCount) : 0;
      out.push(uw);
    }
    out.sort((a, b) => b.dealCount - a.dealCount);
    return out;
  },

  getUnderwriter(name) {
    return this.getUnderwriters().find(u => u.name === name);
  },

  getDealsForUnderwriter(name) {
    if (!name) return [];
    const key = name.toLowerCase();
    return this.state.deals.filter(d => (d.underwriter || '').toLowerCase() === key);
  },

  /* ---------- Duplicate detection & resolution ---------- */

  // Find deals that look like duplicates of an existing record.
  // Primary match: same orderNumber (case-insensitive, trimmed).
  // Fallback match (when no orderNumber): same disbursementDate + propertyAddress.
  //
  // Returns [{ key, matchType: 'order'|'address', deals: [d1, d2, ...] }]
  findDuplicateDeals() {
    const byKey = new Map();

    const add = (key, type, deal) => {
      if (!byKey.has(key)) byKey.set(key, { key, matchType: type, deals: [] });
      byKey.get(key).deals.push(deal);
    };

    for (const d of this.state.deals) {
      const on = (d.orderNumber || '').trim().toLowerCase();
      if (on) {
        add('ord:' + on, 'order', d);
      } else {
        const addr = (d.propertyAddress || '').trim().toLowerCase();
        const dt   = (d.disbursementDate || '').trim();
        if (addr && dt) add('addr:' + dt + '|' + addr, 'address', d);
      }
    }

    const groups = [];
    for (const g of byKey.values()) {
      if (g.deals.length >= 2) groups.push(g);
    }
    // Sort by group size desc so biggest offenders surface first
    groups.sort((a, b) => b.deals.length - a.deals.length);
    return groups;
  },

  // Check if a proposed new deal (without id) would conflict with an existing one.
  // Returns the conflicting deal, or null if none.
  findDealConflict(proposed) {
    if (!proposed) return null;
    const on = (proposed.orderNumber || '').trim().toLowerCase();
    if (!on) return null;  // we only guard on order number to avoid false positives
    return this.state.deals.find(d => {
      if (proposed.id && d.id === proposed.id) return false;  // editing self
      return (d.orderNumber || '').trim().toLowerCase() === on;
    }) || null;
  },

  // Merge two duplicate deals. Non-empty fields on `keep` win; empty ones inherit from `drop`.
  // After merge, `drop` is deleted. Returns the merged deal.
  mergeDeals(keepId, dropId) {
    const keep = this.getDeal(keepId);
    const drop = this.getDeal(dropId);
    if (!keep || !drop) return null;
    const merged = { ...keep };
    const mergeableFields = [
      'orderNumber', 'closingDate', 'disbursementDate', 'transactionType',
      'propertyAddress', 'underwriter',
      'listingAgent', 'listingBroker', 'sellingAgent', 'sellingBroker',
      'client', 'clientAttribution',
      'settlementFee', 'lendersPolicy', 'ownersPolicy'
    ];
    for (const f of mergeableFields) {
      const k = keep[f];
      const d = drop[f];
      const kEmpty = k === undefined || k === null || k === '' || k === 0;
      const dFilled = !(d === undefined || d === null || d === '' || d === 0);
      if (kEmpty && dFilled) merged[f] = d;
    }
    // Re-derive computed fields
    merged.fileFee = computeFileFee(merged.transactionType);
    merged.revenue = computeRevenue(merged);
    merged.clientAttribution = merged.clientAttribution || computeClientSource(merged);
    this.saveDeal(merged);
    this.deleteDeal(dropId);
    return merged;
  },

  /* ---------- Aggregates ---------- */

  /**
   * Returns an overview optionally filtered to a single calendar year.
   * Pass null/undefined for all-time.
   * When a year is given:
   *  - totalDeals, totalRevenue, attributedRevenue, directRevenue, purchaseCt, etc.
   *    reflect only deals with disbursementDate in that year
   *  - totalExpenses reflects only expenses with date in that year
   *  - activeClients = distinct credited-client realtors in that year
   *  - totalAgents = all-time agent database size (for context)
   */
  getOverview(year = null) {
    const inYear = (dateStr) => {
      if (year == null) return true;
      if (!dateStr) return false;
      const dt = new Date(dateStr);
      return !isNaN(dt) && dt.getFullYear() === Number(year);
    };

    const deals    = this.state.deals.filter(d => inYear(d.disbursementDate));
    const expenses = this.state.expenses.filter(e => inYear(e.date));
    const allAgents = this.getAgents();

    const totalRevenue = round2(deals.reduce((s, d) => s + Number(d.revenue || 0), 0));
    const totalExpenses = round2(expenses.reduce((s, e) => s + Number(e.amount || 0), 0));

    // Revenue attributable to clients (excluding Direct deals with no credited agent)
    // This is what pairs apples-to-apples with client-specific expenses, and matches
    // the Excel Cover C12 formula: SUM(Realtor DB G) / SUM(Realtor DB H).
    const attributedRevenue = round2(
      deals.filter(d => d.client && d.client.trim())
           .reduce((s, d) => s + Number(d.revenue || 0), 0)
    );
    const directRevenue = round2(totalRevenue - attributedRevenue);

    const purchaseCt = deals.filter(d => d.transactionType === 'Purchase').length;
    const refinanceCt = deals.filter(d => d.transactionType === 'Refinance').length;
    const subordinateCt = deals.filter(d => d.transactionType === 'Subordinate Order').length;

    const sourceCounts = { 'Direct': 0, 'Listing Agent': 0, 'Selling Agent': 0 };
    for (const d of deals) {
      const src = computeClientSource(d);
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    }

    // Active clients in the (filtered) period: distinct credited-client realtors.
    // When a year is given, "active" = they had ≥ 1 deal in that year.
    const activeClientNames = new Set();
    for (const d of deals) {
      if (d.client && d.client.trim()) activeClientNames.add(d.client.trim().toLowerCase());
      if ((d.clientAttribution || '') === 'Both') {
        if (d.listingAgent) activeClientNames.add(d.listingAgent.trim().toLowerCase());
        if (d.sellingAgent) activeClientNames.add(d.sellingAgent.trim().toLowerCase());
      }
    }

    return {
      year,
      totalDeals: deals.length,
      totalRevenue,
      attributedRevenue,
      directRevenue,
      totalExpenses,
      overallRoi: totalExpenses > 0 ? round2(attributedRevenue / totalExpenses) : null,
      activeClients: activeClientNames.size,
      totalAgents: allAgents.length,
      avgDealSize: deals.length > 0 ? round2(totalRevenue / deals.length) : 0,
      purchaseCt,
      refinanceCt,
      subordinateCt,
      sourceCounts
    };
  },

  // Monthly production table data
  getMonthlyProduction(year) {
    const deals = this.state.deals.filter(d => {
      if (!d.disbursementDate) return false;
      return new Date(d.disbursementDate).getFullYear() === year;
    });

    const rows = MONTHS_SHORT.map((m, idx) => ({
      month: m,
      monthIdx: idx,
      year,
      total: 0,
      purchase: 0,
      refinance: 0,
      subordinate: 0,
      revenue: 0
    }));

    for (const d of deals) {
      const m = new Date(d.disbursementDate).getMonth();
      const r = rows[m];
      r.total += 1;
      r.revenue += Number(d.revenue || 0);
      if (d.transactionType === 'Purchase') r.purchase += 1;
      else if (d.transactionType === 'Refinance') r.refinance += 1;
      else if (d.transactionType === 'Subordinate Order') r.subordinate += 1;
    }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      r.revenue = round2(r.revenue);
      r.avgDealSize = r.total > 0 ? round2(r.revenue / r.total) : 0;
      if (i === 0) {
        r.momGrowth = null;
      } else {
        const prev = rows[i - 1];
        r.momGrowth = prev.revenue > 0 ? round2((r.revenue - prev.revenue) / prev.revenue) : null;
      }
    }

    return rows;
  },

  getYearsInData() {
    const years = new Set();
    for (const d of this.state.deals) {
      if (d.disbursementDate) {
        years.add(new Date(d.disbursementDate).getFullYear());
      }
    }
    return Array.from(years).sort();
  },

  getExpensesSummaryByType() {
    const summary = {};
    for (const t of EXPENSE_TYPES) summary[t] = 0;
    for (const e of this.state.expenses) {
      if (summary[e.expenseType] !== undefined) summary[e.expenseType] += Number(e.amount || 0);
    }
    for (const k of Object.keys(summary)) summary[k] = round2(summary[k]);
    return summary;
  },

  /* ---------- Monthly time-series for predictions & charts ---------- */

  // Returns an array of monthly aggregate rows sorted chronologically.
  // { ym: 'YYYY-MM', year, monthIdx, deals, revenue, purchase, refinance, subordinate, avgDeal, expenses }
  getMonthlyStats() {
    const byYm = new Map();
    const ensure = (ym) => {
      if (!byYm.has(ym)) {
        const [y, m] = ym.split('-');
        byYm.set(ym, {
          ym,
          year: Number(y),
          monthIdx: Number(m) - 1,
          deals: 0,
          revenue: 0,
          purchase: 0,
          refinance: 0,
          subordinate: 0,
          expenses: 0,
          avgDeal: 0
        });
      }
      return byYm.get(ym);
    };
    for (const d of this.state.deals) {
      if (!d.disbursementDate) continue;
      const dt = new Date(d.disbursementDate);
      if (isNaN(dt)) continue;
      const ym = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const row = ensure(ym);
      row.deals += 1;
      row.revenue += Number(d.revenue || 0);
      if (d.transactionType === 'Purchase') row.purchase += 1;
      else if (d.transactionType === 'Refinance') row.refinance += 1;
      else if (d.transactionType === 'Subordinate Order') row.subordinate += 1;
    }
    for (const e of this.state.expenses) {
      if (!e.date) continue;
      const dt = new Date(e.date);
      if (isNaN(dt)) continue;
      const ym = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const row = ensure(ym);
      row.expenses += Number(e.amount || 0);
    }
    const rows = Array.from(byYm.values()).sort((a, b) => a.ym.localeCompare(b.ym));
    for (const r of rows) {
      r.revenue = round2(r.revenue);
      r.expenses = round2(r.expenses);
      r.avgDeal = r.deals > 0 ? round2(r.revenue / r.deals) : 0;
    }
    return rows;
  }
};

/* -------------------------- Goals persistence --------------------------- */

const GOALS_KEY = 'ra_production_crm_goals_v1';

const Goals = {
  _cache: null,

  _load() {
    if (this._cache) return this._cache;
    try {
      const raw = localStorage.getItem(GOALS_KEY);
      this._cache = raw ? JSON.parse(raw) : {};
    } catch {
      this._cache = {};
    }
    return this._cache;
  },

  _save() {
    localStorage.setItem(GOALS_KEY, JSON.stringify(this._cache || {}));
  },

  // Get goals for a specific year (or null if none)
  get(year) {
    const all = this._load();
    return all[String(year)] || null;
  },

  // Save goals for a specific year
  set(year, payload) {
    const all = this._load();
    all[String(year)] = {
      ...payload,
      revenue:        Number(payload.revenue || 0),
      deals:          Number(payload.deals || 0),
      activeRealtors: Number(payload.activeRealtors || 0),
      avgDealRevenue: payload.avgDealRevenue ? Number(payload.avgDealRevenue) : null,
      expenseBudget:  payload.expenseBudget ? Number(payload.expenseBudget) : null,
      updatedAt: new Date().toISOString().slice(0, 10)
    };
    this._cache = all;
    this._save();
    return all[String(year)];
  },

  // Remove goals for a year
  remove(year) {
    const all = this._load();
    delete all[String(year)];
    this._cache = all;
    this._save();
  },

  // All years that have goals set
  years() {
    return Object.keys(this._load()).map(Number).sort();
  }
};

/* -------------------------- Goal tracker math --------------------------- */

// daysInYear returns 366 for leap years, else 365
function daysInYear(year) {
  return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
}

// computeTrackerMetrics
// Given a target year and its goals, compute YTD actuals, pace,
// required pace, projected EOY, and status classification.
function computeTrackerMetrics(year, goal, today = new Date()) {
  const deals = Store.getDeals();
  const yearStart = new Date(year, 0, 1);
  const yearEnd   = new Date(year, 11, 31, 23, 59, 59);
  const diy = daysInYear(year);

  // How far through the year are we? Clamp at year boundaries so future years
  // don't show "negative" pace and past years always reflect full year.
  const now = (today > yearEnd) ? yearEnd : (today < yearStart ? yearStart : today);
  const daysElapsed = Math.max(0, (now - yearStart) / 86400000);
  const daysRemaining = Math.max(0, diy - daysElapsed);
  const monthsElapsed = daysElapsed / 30.437;
  const monthsRemaining = 12 - monthsElapsed;

  // YTD actuals for this year
  const ytdDeals = deals.filter(d => {
    if (!d.disbursementDate) return false;
    const dt = new Date(d.disbursementDate);
    return dt >= yearStart && dt <= now;
  });
  const ytdRevenue = round2(ytdDeals.reduce((s, d) => s + Number(d.revenue || 0), 0));
  const ytdDealCount = ytdDeals.length;
  const ytdRealtors = new Set();
  ytdDeals.forEach(d => {
    if (d.client && d.client.trim()) ytdRealtors.add(d.client.trim().toLowerCase());
    // Count both-sides deals as 2 distinct realtors
    if ((d.clientAttribution || '') === 'Both') {
      if (d.listingAgent) ytdRealtors.add(d.listingAgent.trim().toLowerCase());
      if (d.sellingAgent) ytdRealtors.add(d.sellingAgent.trim().toLowerCase());
    }
  });
  const ytdRealtorCount = ytdRealtors.size;

  // Current pace: use last 3 months of actuals within the year for responsiveness.
  // Falls back to YTD average if < 3 months elapsed.
  const last3MoStart = new Date(now);
  last3MoStart.setMonth(last3MoStart.getMonth() - 3);
  const recentDeals = ytdDeals.filter(d => new Date(d.disbursementDate) >= last3MoStart);
  const recentMonthsElapsed = Math.max(1, Math.min(3, monthsElapsed));
  const last3MoRevenue = recentDeals.reduce((s, d) => s + Number(d.revenue || 0), 0);
  const currentMonthlyRevenue = monthsElapsed >= 3
    ? round2(last3MoRevenue / recentMonthsElapsed)
    : (monthsElapsed > 0 ? round2(ytdRevenue / monthsElapsed) : 0);
  const currentMonthlyDeals = monthsElapsed >= 3
    ? round2(recentDeals.length / recentMonthsElapsed)
    : (monthsElapsed > 0 ? round2(ytdDealCount / monthsElapsed) : 0);

  // Required pace to hit goal in the remaining time
  const revenueGap   = Math.max(0, (goal?.revenue || 0) - ytdRevenue);
  const dealsGap     = Math.max(0, (goal?.deals || 0) - ytdDealCount);
  const realtorsGap  = Math.max(0, (goal?.activeRealtors || 0) - ytdRealtorCount);
  const safeRemaining = Math.max(0.5, monthsRemaining);  // avoid div-by-zero near year end
  const neededMonthlyRevenue = round2(revenueGap / safeRemaining);
  const neededMonthlyDeals   = round2(dealsGap / safeRemaining);
  const neededMonthlyRealtors = round2(realtorsGap / safeRemaining);

  // End-of-year projection if current pace holds
  const projectedEOYRevenue = round2(ytdRevenue + currentMonthlyRevenue * monthsRemaining);
  const projectedEOYDeals   = Math.round(ytdDealCount + currentMonthlyDeals * monthsRemaining);
  const revenueVariance     = round2(projectedEOYRevenue - (goal?.revenue || 0));
  const dealsVariance       = projectedEOYDeals - (goal?.deals || 0);

  // Progress percentages
  const revenuePct  = goal?.revenue      ? round2((ytdRevenue / goal.revenue) * 100) : 0;
  const dealsPct    = goal?.deals        ? round2((ytdDealCount / goal.deals) * 100) : 0;
  const realtorsPct = goal?.activeRealtors ? round2((ytdRealtorCount / goal.activeRealtors) * 100) : 0;
  const expectedPacePct = round2((daysElapsed / diy) * 100);

  // Status classification (driven by revenue projection)
  let status = 'ON TRACK';
  let statusTone = 'forest';  // forest | gold | amber | red
  if (goal?.revenue) {
    const ratio = projectedEOYRevenue / goal.revenue;
    if (ratio >= 1.05)      { status = 'AHEAD';           statusTone = 'gold'; }
    else if (ratio >= 0.95) { status = 'ON TRACK';        statusTone = 'forest'; }
    else if (ratio >= 0.80) { status = 'SLIGHTLY BEHIND'; statusTone = 'amber'; }
    else                    { status = 'BEHIND';          statusTone = 'red'; }
  } else {
    status = 'NO GOAL SET';
    statusTone = 'neutral';
  }

  return {
    year, today: now,
    daysElapsed: Math.round(daysElapsed),
    daysRemaining: Math.round(daysRemaining),
    monthsElapsed: round2(monthsElapsed),
    monthsRemaining: round2(monthsRemaining),
    expectedPacePct,
    ytdRevenue,
    ytdDealCount,
    ytdRealtorCount,
    currentMonthlyRevenue,
    currentMonthlyDeals,
    revenueGap,
    dealsGap,
    realtorsGap,
    neededMonthlyRevenue,
    neededMonthlyDeals,
    neededMonthlyRealtors,
    projectedEOYRevenue,
    projectedEOYDeals,
    revenueVariance,
    dealsVariance,
    revenuePct,
    dealsPct,
    realtorsPct,
    status,
    statusTone
  };
}

/* -------------------------- Prediction math --------------------------- */

// Linear regression on an array of {x, y} points; returns { slope, intercept }
function linearRegression(xs, ys) {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] || 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i]; sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumXX += xs[i] * xs[i];
  }
  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function mean(arr) { return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length; }

// Compute month-over-month growth rate series, clipped to avoid explosions
function momGrowthRates(values) {
  const out = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] > 0) {
      const g = (values[i] - values[i - 1]) / values[i - 1];
      // Clip to [-10%, +15%] to avoid noisy outliers dominating
      out.push(Math.max(-0.10, Math.min(0.15, g)));
    }
  }
  return out;
}

// computePredictions
// horizonMonths: 1, 6, 12, 60
// Returns { conservative, expected, optimistic, chart, assumptions }
function computePredictions(horizonMonths, monthlyStats) {
  if (!monthlyStats || monthlyStats.length === 0) {
    return {
      conservative: null, expected: null, optimistic: null,
      chart: { historical: [], conservative: [], expected: [], optimistic: [], labels: [] },
      assumptions: { historyMonths: 0, confidence: 'Low', avgGrowth: 0, typeMix: { purchase: 58, refinance: 35, subordinate: 7 } }
    };
  }

  // Window sizes
  const recent3 = monthlyStats.slice(-3);
  const recent6 = monthlyStats.slice(-6);
  const recent12 = monthlyStats.slice(-12);

  const rev3  = mean(recent3.map(m => m.revenue));
  const rev6  = mean(recent6.map(m => m.revenue));
  const rev12 = mean(recent12.map(m => m.revenue));

  const deals3  = mean(recent3.map(m => m.deals));
  const deals6  = mean(recent6.map(m => m.deals));
  const deals12 = mean(recent12.map(m => m.deals));

  // Trend (linear regression over last 12 months for revenue and deals)
  const xs = recent12.map((_, i) => i);
  const trendRev   = linearRegression(xs, recent12.map(m => m.revenue));
  const trendDeals = linearRegression(xs, recent12.map(m => m.deals));

  // Compound growth
  const growths = momGrowthRates(recent12.map(m => m.revenue));
  const avgGrowth = growths.length > 0 ? mean(growths) : 0;

  // Confidence
  const confidence = monthlyStats.length >= 12 ? 'High'
                  : monthlyStats.length >= 6 ? 'Medium'
                  : 'Low';

  // Type mix (from last 12 months)
  const totalTyped = recent12.reduce((s, m) => s + m.purchase + m.refinance + m.subordinate, 0) || 1;
  const typeMix = {
    purchase: round2((recent12.reduce((s, m) => s + m.purchase, 0) / totalTyped) * 100),
    refinance: round2((recent12.reduce((s, m) => s + m.refinance, 0) / totalTyped) * 100),
    subordinate: round2((recent12.reduce((s, m) => s + m.subordinate, 0) / totalTyped) * 100)
  };

  // Conservative: last 6-mo avg × horizon, flat
  const conservative = {
    revenue: round2(rev6 * horizonMonths),
    deals: Math.round(deals6 * horizonMonths)
  };

  // Expected: sum of trend values for next H months
  const startIdx = recent12.length; // first forecast month index (continues from history)
  let expRevenue = 0, expDeals = 0;
  const expectedMonthly = [];
  for (let m = 0; m < horizonMonths; m++) {
    const idx = startIdx + m;
    const rev = Math.max(0, trendRev.intercept + trendRev.slope * idx);
    const dls = Math.max(0, trendDeals.intercept + trendDeals.slope * idx);
    expRevenue += rev;
    expDeals += dls;
    expectedMonthly.push(rev);
  }
  const expected = {
    revenue: round2(expRevenue),
    deals: Math.round(expDeals)
  };

  // Optimistic: compound growth on the higher of recent-3 or 6-mo base, capped.
  // Using max() prevents a recent dip from making Optimistic undershoot Conservative
  // at short horizons where compounding has no time to work.
  const base = Math.max(rev3, rev6);
  const dealBase = Math.max(deals3, deals6);
  let optRevenue = 0, optDeals = 0;
  const optimisticMonthly = [];
  for (let m = 1; m <= horizonMonths; m++) {
    const growthFactor = Math.pow(1 + Math.max(0, avgGrowth) + 0.01, m); // +1% minimum uplift over growth
    const rev = base * growthFactor;
    const dls = dealBase * growthFactor;
    optRevenue += rev;
    optDeals += dls;
    optimisticMonthly.push(rev);
  }
  // Cap 5-year optimistic at ≤ 2× conservative to prevent absurd numbers
  if (horizonMonths >= 60 && conservative.revenue > 0) {
    const cap = conservative.revenue * 2;
    if (optRevenue > cap) {
      const scale = cap / optRevenue;
      optRevenue = cap;
      for (let i = 0; i < optimisticMonthly.length; i++) optimisticMonthly[i] *= scale;
    }
  }
  const optimistic = {
    revenue: round2(optRevenue),
    deals: Math.round(optDeals)
  };

  // Derived per-scenario: type mix breakdown + avg deal
  const addBreakdown = (s) => {
    if (!s) return s;
    s.avgDeal = s.deals > 0 ? round2(s.revenue / s.deals) : 0;
    s.purchase = Math.round(s.deals * typeMix.purchase / 100);
    s.refinance = Math.round(s.deals * typeMix.refinance / 100);
    s.subordinate = Math.max(0, s.deals - s.purchase - s.refinance);
    return s;
  };
  addBreakdown(conservative);
  addBreakdown(expected);
  addBreakdown(optimistic);

  // Chart series: labels = last 12 months + next horizon months (ym labels)
  const labels = [];
  const histSeries = [];
  const consSeries = [];
  const expSeries = [];
  const optSeries = [];
  // Historical section
  for (const m of recent12) {
    labels.push(m.ym);
    histSeries.push(m.revenue);
    consSeries.push(null);
    expSeries.push(null);
    optSeries.push(null);
  }
  // Forecast section
  const lastHist = recent12[recent12.length - 1];
  let curYear = lastHist ? lastHist.year : new Date().getFullYear();
  let curMonth = lastHist ? lastHist.monthIdx : new Date().getMonth();
  // Start bridge: push last historical point as first of each forecast line for continuity
  const bridge = lastHist ? lastHist.revenue : 0;
  const lastIdx = histSeries.length - 1;
  consSeries[lastIdx] = bridge;
  expSeries[lastIdx] = bridge;
  optSeries[lastIdx] = bridge;
  for (let m = 0; m < horizonMonths; m++) {
    curMonth += 1;
    if (curMonth > 11) { curMonth = 0; curYear += 1; }
    labels.push(`${curYear}-${String(curMonth + 1).padStart(2, '0')}`);
    histSeries.push(null);
    consSeries.push(round2(rev6));
    expSeries.push(round2(expectedMonthly[m] || 0));
    optSeries.push(round2(optimisticMonthly[m] || 0));
  }

  return {
    conservative, expected, optimistic,
    chart: { labels, historical: histSeries, conservative: consSeries, expected: expSeries, optimistic: optSeries },
    assumptions: {
      historyMonths: monthlyStats.length,
      confidence,
      avgGrowth: round2(avgGrowth * 100),
      rev6: round2(rev6),
      rev12: round2(rev12),
      typeMix
    }
  };
}

/* -------------------------- Formatting helpers --------------------------- */

function fmtMoney(n, opts = {}) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  const s = opts.abbrev && Math.abs(v) >= 1000
    ? '$' + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k'
    : v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: opts.decimals ?? 2, maximumFractionDigits: opts.decimals ?? 2 });
  return s;
}

function fmtNumber(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('en-US');
}

function fmtPercent(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return (Number(n) * 100).toFixed(digits) + '%';
}

function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtRoi(n) {
  if (n === null || n === undefined) return '—';
  if (n === 999) return '∞';
  return Number(n).toFixed(2) + 'x';
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
