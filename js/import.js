/* ==========================================================================
   Bulk Import · CSV / XLSX → Deals
   Parses uploaded file, lets the user map columns, commits to the store.
   ========================================================================== */

const Import = {
  /* The canonical set of deal fields we can map to. */
  FIELDS: [
    { key: '',                    label: '— Ignore —',            hint: '' },
    { key: 'orderNumber',         label: 'Order Number',          hint: 'e.g. VA-25-738', required: false },
    { key: 'closingDate',         label: 'Closing Date',          hint: 'M/D/YYYY or YYYY-MM-DD' },
    { key: 'disbursementDate',    label: 'Disbursement Date',     hint: 'M/D/YYYY or YYYY-MM-DD', required: true },
    { key: 'transactionType',     label: 'Transaction Type',      hint: 'Purchase / Refinance / Subordinate Order', required: true },
    { key: 'propertyAddress',     label: 'Property Address',      hint: 'Full street + city + state' },
    { key: 'underwriter',         label: 'Underwriter',           hint: 'Title insurance underwriter' },
    { key: 'listingAgent',        label: 'Listing Agent',         hint: 'Full name' },
    { key: 'listingBroker',       label: 'Listing Broker',        hint: 'Brokerage firm' },
    { key: 'sellingAgent',        label: 'Selling Agent',         hint: 'Full name' },
    { key: 'sellingBroker',       label: 'Selling Broker',        hint: 'Brokerage firm' },
    { key: 'client',              label: 'Client (Credit)',       hint: 'Overrides auto-detect' },
    { key: 'clientAttribution',   label: 'Client Attribution',    hint: 'Listing / Selling / Both / Direct' },
    { key: 'settlementFee',       label: 'Settlement Fee',        hint: 'Dollars' },
    { key: 'lendersPolicy',       label: "Lender's Policy",       hint: 'Dollars' },
    { key: 'ownersPolicy',        label: "Owner's Policy",        hint: 'Dollars' },
  ],

  /* Common header patterns → canonical field. Lowercased, punctuation removed. */
  HEADER_PATTERNS: {
    orderNumber: [/order\s*(number|no|#)/, /^file\s*(number|no|#)?$/, /^order$/, /deal\s*(number|#)/],
    closingDate: [/^closing\s*date$/, /^close\s*date$/, /^closing$/],
    disbursementDate: [/disbursement/, /settlement\s*date/, /^date$/, /^disb/],
    transactionType: [/transaction\s*type/, /^type$/, /deal\s*type/],
    propertyAddress: [/property\s*address/, /full\s*address/, /^address$/, /^property$/],
    underwriter: [/underwriter/, /^uw$/, /title\s*company/, /title\s*co\b/],
    listingAgent: [/listing\s*agent/, /seller'?s?\s*agent/, /list\s*agent/],
    listingBroker: [/listing\s*broker/, /list\s*broker/, /listing\s*(firm|brokerage|company)/],
    sellingAgent: [/selling\s*agent/, /buyer'?s?\s*agent/, /sell\s*agent/],
    sellingBroker: [/selling\s*broker/, /sell\s*broker/, /buyer'?s?\s*broker/, /selling\s*(firm|brokerage|company)/],
    client: [/^client$/, /credited\s*agent/, /client\s*name/],
    clientAttribution: [/client\s*attribut/, /attribution/, /client\s*source/, /credited\s*(role|side)/],
    settlementFee: [/settlement\s*fee/, /^settle/],
    lendersPolicy: [/lender'?s?\s*policy/, /lender.*premium/],
    ownersPolicy: [/owner'?s?\s*policy/, /owner.*premium/],
  },

  /* Runtime state (carried across wizard steps). */
  state: null,

  /* ---------------- File parsing ---------------- */

  parseFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target.result);
          // SheetJS reads CSV, XLSX, XLS all through the same API
          const wb = XLSX.read(data, { type: 'array', raw: false, cellDates: true });
          const sheetName = wb.SheetNames[0];
          const ws = wb.Sheets[sheetName];
          // header:1 → array-of-arrays so we preserve original column order
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false, raw: false });
          if (!rows.length) return reject(new Error('File is empty.'));
          const headers = rows[0].map(h => String(h || '').trim());
          const body = rows.slice(1).filter(r => r.some(c => String(c).trim() !== ''));
          resolve({ headers, rows: body, sheetName });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
      reader.readAsArrayBuffer(file);
    });
  },

  /* ---------------- Auto-mapping ---------------- */

  autoMap(headers) {
    const used = new Set();
    return headers.map(h => {
      const norm = String(h).toLowerCase().trim();
      for (const [key, patterns] of Object.entries(this.HEADER_PATTERNS)) {
        if (used.has(key)) continue;
        if (patterns.some(p => p.test(norm))) {
          used.add(key);
          return key;
        }
      }
      return '';
    });
  },

  /* ---------------- Value coercion ---------------- */

  parseMoney(v) {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(String(v).replace(/[$,\s]/g, ''));
    return Number.isFinite(n) ? n : 0;
  },

  parseDate(v) {
    if (!v) return '';
    // SheetJS with cellDates:true returns Date objects for real dates
    if (v instanceof Date && !isNaN(v.getTime())) {
      return v.toISOString().slice(0, 10);
    }
    const s = String(v).trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    // M/D/YYYY or MM/DD/YYYY
    const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (us) {
      let [_, m, d, y] = us;
      if (y.length === 2) y = (Number(y) > 50 ? '19' : '20') + y;
      return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // Fallback — let Date() try
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
  },

  normalizeType(v) {
    if (!v) return '';
    const s = String(v).trim().toLowerCase();
    if (s.startsWith('pur') || s.includes('buy')) return 'Purchase';
    if (s.startsWith('ref')) return 'Refinance';
    if (s.startsWith('sub') || s.includes('subord')) return 'Subordinate Order';
    // Exact match as final fallback
    const exact = TRANSACTION_TYPES.find(t => t.toLowerCase() === s);
    return exact || '';
  },

  /* ---------------- Row → deal ---------------- */

  buildDeal(row, mapping, options) {
    const obj = {};
    mapping.forEach((field, i) => {
      if (!field) return;
      const raw = row[i];
      if (raw === undefined || raw === null || String(raw).trim() === '') return;
      if (field === 'settlementFee' || field === 'lendersPolicy' || field === 'ownersPolicy') {
        obj[field] = this.parseMoney(raw);
      } else if (field === 'disbursementDate' || field === 'closingDate') {
        obj[field] = this.parseDate(raw);
      } else if (field === 'transactionType') {
        obj[field] = this.normalizeType(raw);
      } else if (field === 'clientAttribution') {
        obj[field] = this.normalizeAttribution(raw);
      } else {
        obj[field] = String(raw).trim();
      }
    });

    // Resolve the credited client per user's chosen strategy
    if (!obj.client || !obj.client.trim()) {
      const strategy = options.clientStrategy || 'listingFirst';
      if (strategy === 'listingFirst') {
        obj.client = obj.listingAgent || obj.sellingAgent || '';
      } else if (strategy === 'sellingFirst') {
        obj.client = obj.sellingAgent || obj.listingAgent || '';
      } else if (strategy === 'listingOnly') {
        obj.client = obj.listingAgent || '';
      } else if (strategy === 'sellingOnly') {
        obj.client = obj.sellingAgent || '';
      }
    }

    return obj;
  },

  normalizeAttribution(v) {
    if (!v) return '';
    const s = String(v).trim().toLowerCase();
    if (s.startsWith('list')) return 'Listing Agent';
    if (s.startsWith('sell') || s.startsWith('buy')) return 'Selling Agent';
    if (s.startsWith('both') || s.includes('dual')) return 'Both';
    if (s.startsWith('direct') || s.includes('no agent')) return 'Direct';
    return '';
  },

  /* ---------------- Validation ---------------- */

  validate(deals) {
    return deals.map((d, idx) => {
      const errs = [];
      if (!d.disbursementDate) errs.push('missing disbursement date');
      if (!d.transactionType) errs.push('missing/unknown transaction type');
      return { rowIndex: idx, deal: d, errors: errs };
    });
  },

  /* ---------------- Commit ---------------- */

  commit(validated, options) {
    const existingNames = new Set(Store.getAgents().map(a => a.name.toLowerCase()));
    const existingDeals = Store.getDeals();
    const byOrderNo = new Map();
    for (const d of existingDeals) {
      const k = (d.orderNumber || '').trim().toLowerCase();
      if (k) byOrderNo.set(k, d);
    }
    const newRealtorNames = new Set();
    let imported = 0;
    let skipped = 0;
    let updated = 0;

    for (const v of validated) {
      if (v.errors.length && options.skipInvalid) { skipped++; continue; }
      const d = v.deal;
      const ord = (d.orderNumber || '').trim().toLowerCase();
      const existing = ord ? byOrderNo.get(ord) : null;

      if (existing) {
        if (options.duplicateMode === 'skip') { skipped++; continue; }
        if (options.duplicateMode === 'update') {
          d.id = existing.id;
          Store.saveDeal(d);
          updated++;
          continue;
        }
        // 'add' falls through and creates a parallel deal
      }

      // Track new realtors that will materialize
      [d.client, d.listingAgent, d.sellingAgent].forEach(n => {
        if (n && n.trim() && !existingNames.has(n.toLowerCase())) {
          newRealtorNames.add(n.trim());
          existingNames.add(n.toLowerCase());
        }
      });
      Store.saveDeal(d);
      imported++;
    }

    return { imported, updated, skipped, newRealtors: Array.from(newRealtorNames).sort() };
  },

  /* ---------------- Preview summary (pre-commit) ---------------- */

  summarize(validated) {
    const existingNames = new Set(Store.getAgents().map(a => a.name.toLowerCase()));
    const existingOrderNos = new Set(
      Store.getDeals().map(d => (d.orderNumber || '').trim().toLowerCase()).filter(Boolean)
    );
    const seen = new Set();
    const newRealtors = [];
    const matched = new Set();
    const duplicateOrderNos = [];

    for (const v of validated) {
      const d = v.deal;
      const ord = (d.orderNumber || '').trim().toLowerCase();
      if (ord && existingOrderNos.has(ord)) {
        duplicateOrderNos.push(d.orderNumber);
      }
      [d.client, d.listingAgent, d.sellingAgent].forEach(n => {
        if (!n || !n.trim()) return;
        const low = n.toLowerCase();
        if (seen.has(low)) return;
        seen.add(low);
        if (existingNames.has(low)) matched.add(n.trim());
        else newRealtors.push(n.trim());
      });
    }

    const valid = validated.filter(v => v.errors.length === 0).length;
    const invalid = validated.length - valid;

    return {
      totalRows: validated.length,
      valid,
      invalid,
      duplicates: duplicateOrderNos,
      newRealtors: newRealtors.sort(),
      matchedRealtors: Array.from(matched).sort()
    };
  }
};
