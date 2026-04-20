/* ==========================================================================
   App · router, modal orchestration, glue
   ========================================================================== */

/* ==========================================================================
   Animations — GSAP helpers (gracefully degrade if GSAP not loaded)
   ========================================================================== */

const Animate = {
  _gsap() { return window.gsap; },
  _reduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  /**
   * Stagger-in cards/items from below.
   * Selector can be a CSS string or NodeList.
   */
  staggerIn(selector, opts = {}) {
    const gsap = this._gsap();
    const nodes = typeof selector === 'string' ? document.querySelectorAll(selector) : selector;
    if (!gsap || !nodes || !nodes.length || this._reduced()) return;
    gsap.fromTo(nodes,
      { opacity: 0, y: opts.y || 18 },
      {
        opacity: 1,
        y: 0,
        duration: opts.duration || 0.55,
        ease: opts.ease || 'power2.out',
        stagger: opts.stagger || 0.06,
        clearProps: 'transform',
        delay: opts.delay || 0
      }
    );
  },

  /** Smooth count-up from 0 to target value. Element has data-countup="12345". */
  countUp(selector, opts = {}) {
    const gsap = this._gsap();
    const nodes = typeof selector === 'string' ? document.querySelectorAll(selector) : selector;
    if (!nodes || !nodes.length) return;
    if (!gsap || this._reduced()) return;
    nodes.forEach(el => {
      const target = Number(el.getAttribute('data-countup') || 0);
      if (!target) return;
      const isMoney = (el.textContent || '').includes('$');
      const prefix = isMoney ? '$' : '';
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target,
        duration: opts.duration || 1.1,
        ease: opts.ease || 'power2.out',
        onUpdate() {
          const v = Math.round(obj.v);
          el.textContent = prefix + v.toLocaleString('en-US');
        }
      });
    });
  },

  /** Animate a progress bar width from 0% → its data-target-width. */
  growBars(selector, opts = {}) {
    const gsap = this._gsap();
    const nodes = typeof selector === 'string' ? document.querySelectorAll(selector) : selector;
    if (!gsap || !nodes || !nodes.length) return;
    if (this._reduced()) {
      nodes.forEach(n => { n.style.width = (n.getAttribute('data-target-width') || 0) + '%'; });
      return;
    }
    nodes.forEach((el, i) => {
      const target = Number(el.getAttribute('data-target-width') || 0);
      gsap.fromTo(el,
        { width: '0%' },
        {
          width: target + '%',
          duration: opts.duration || 0.9,
          ease: opts.ease || 'power3.out',
          delay: (opts.baseDelay || 0.2) + i * (opts.stagger || 0.06)
        }
      );
    });
  },

  /** Hero entry — fades in with a slight scale. */
  heroIn(selector, opts = {}) {
    const gsap = this._gsap();
    const node = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!gsap || !node || this._reduced()) return;
    gsap.fromTo(node,
      { opacity: 0, y: 12, scale: 0.985 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out', delay: opts.delay || 0 }
    );
  }
};

/**
 * Wire interactions for a .combobox element.
 * Shows a filterable dropdown panel below a text input.
 * - Focus/click on input or toggle → opens the panel
 * - Typing filters options (case-insensitive substring match)
 * - Clicking an option fills the input and closes
 * - Clicking outside closes
 * - Accepts free-text entries (so a user can "create a new" value by typing)
 */
function wireCombobox(root) {
  if (!root) return;
  const input  = root.querySelector('.combobox__input');
  const toggle = root.querySelector('.combobox__toggle');
  const panel  = root.querySelector('.combobox__panel');
  if (!input || !panel) return;

  const options = Array.from(panel.querySelectorAll('.combobox__option'));

  const open  = () => { panel.hidden = false; root.classList.add('is-open'); filter(input.value); };
  const close = () => { panel.hidden = true;  root.classList.remove('is-open'); };

  const filter = (q) => {
    const query = (q || '').toLowerCase().trim();
    let visible = 0;
    options.forEach(opt => {
      const val = (opt.getAttribute('data-value') || '').toLowerCase();
      const match = !query || val.includes(query);
      opt.style.display = match ? '' : 'none';
      if (match) visible++;
    });
    // Show a "Create new" hint when nothing matches and the query has text
    let createRow = panel.querySelector('.combobox__create');
    if (query && visible === 0) {
      if (!createRow) {
        createRow = document.createElement('div');
        createRow.className = 'combobox__create';
        panel.appendChild(createRow);
      }
      createRow.textContent = `+ Create new realtor "${q}"`;
    } else if (createRow) {
      createRow.remove();
    }
  };

  input.addEventListener('focus', open);
  input.addEventListener('click', open);
  toggle?.addEventListener('click', (e) => {
    e.preventDefault();
    if (panel.hidden) { open(); input.focus(); } else close();
  });
  input.addEventListener('input', () => {
    if (panel.hidden) open();
    else filter(input.value);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); input.blur(); }
    if (e.key === 'Enter' && !panel.hidden) {
      const firstVisible = options.find(o => o.style.display !== 'none');
      if (firstVisible) {
        e.preventDefault();
        input.value = firstVisible.getAttribute('data-value');
        close();
      }
    }
  });
  options.forEach(opt => {
    opt.addEventListener('mousedown', (e) => {
      e.preventDefault();   // prevent input blur before we handle click
      input.value = opt.getAttribute('data-value') || '';
      close();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!root.contains(e.target)) close();
  }, { capture: true });
}

const App = {
  currentRoute: 'dashboard',
  currentParams: {},

  async init() {
    await Store.init();
    this._paintNavIcons();
    this._paintSidebarUser();
    this._wireSidebarGear();
    window.addEventListener('hashchange', () => this._routeFromHash());
    this._routeFromHash();
    this._wireModalCloses();
  },

  _paintSidebarUser() {
    if (!window.Auth?.user) return;
    const u = window.Auth.user;
    const el = document.getElementById('sidebarUser');
    const avatar = document.getElementById('sidebarUserAvatar');
    const name = document.getElementById('sidebarUserName');
    const role = document.getElementById('sidebarUserRole');
    const gear = document.getElementById('sidebarGearBtn');
    if (!el) return;
    el.hidden = false;
    if (avatar) {
      if (u.imageUrl) { avatar.src = u.imageUrl; avatar.hidden = false; }
      else { avatar.hidden = true; }
    }
    if (name) name.textContent = (u.firstName || u.lastName) ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : u.email;
    if (role) role.textContent = u.role;
    if (gear && u.role === 'admin') {
      gear.hidden = false;
      gear.innerHTML = icon('settings', 16);
    }
  },

  _wireSidebarGear() {
    const btn = document.getElementById('sidebarGearBtn');
    if (btn) btn.addEventListener('click', () => this.openAdminModal());
  },

  _paintNavIcons() {
    document.querySelectorAll('.nav__item').forEach(a => {
      const route = a.dataset.route;
      const slot = a.querySelector('.nav__icon');
      if (slot) slot.innerHTML = icon(route, 17);
    });
  },

  _routeFromHash() {
    const hash = (location.hash || '#/dashboard').slice(1); // drop leading #
    const [path, qs] = hash.split('?');
    const parts = path.split('/').filter(Boolean);

    const route = parts[0] || 'dashboard';
    const query = qs ? Object.fromEntries(new URLSearchParams(qs)) : {};

    // Nested routes
    if (route === 'agent' && parts[1]) {
      this._render('agent', { name: decodeURIComponent(parts[1]) });
      return;
    }
    if (route === 'underwriter' && parts[1]) {
      this._render('underwriter', { name: decodeURIComponent(parts[1]) });
      return;
    }

    this._render(route, query);
  },

  // Navigate with query preservation
  navigate(route, params = {}) {
    const qs = new URLSearchParams(params);
    // Strip empty values for cleaner URLs
    for (const [k, v] of [...qs.entries()]) if (!v) qs.delete(k);
    const suffix = qs.toString() ? '?' + qs.toString() : '';
    location.hash = '#/' + route + suffix;
  },

  // Re-render current route
  render(opts = {}) {
    const preserveScroll = opts.preserveScroll === true;
    const scrollY = preserveScroll ? (document.scrollingElement?.scrollTop || window.scrollY || 0) : 0;
    const tableScroll = preserveScroll ? (document.querySelector('.table-wrap')?.scrollLeft || 0) : 0;
    this._render(this.currentRoute, this.currentParams);
    if (preserveScroll) {
      // After DOM update, restore scroll positions
      requestAnimationFrame(() => {
        if (document.scrollingElement) document.scrollingElement.scrollTop = scrollY;
        else window.scrollTo(0, scrollY);
        const wrap = document.querySelector('.table-wrap');
        if (wrap) wrap.scrollLeft = tableScroll;
      });
    }
  },

  _render(route, params = {}) {
    destroyAllCharts();
    // Reset bulk selection whenever we navigate
    BulkSelect.reset();
    this.currentRoute = route;
    this.currentParams = params;

    const main = document.getElementById('main');

    // Highlight nav
    document.querySelectorAll('.nav__item').forEach(a => {
      a.classList.toggle('is-active', a.dataset.route === route || (route === 'agent' && a.dataset.route === 'agents'));
    });

    let html = '';
    let postFn = null;
    let postArg = params;

    switch (route) {
      case 'dashboard':
        html = Views.dashboard(params);
        postFn = Views.dashboardPost;
        postArg = params;
        break;
      case 'deals':
        html = Views.deals(params);
        postFn = Views.dealsPost;
        break;
      case 'agents':
        html = Views.agents(params);
        postFn = Views.agentsPost;
        break;
      case 'agent':
        html = Views.agentDetail(params.name);
        postFn = Views.agentDetailPost;
        postArg = params.name;
        break;
      case 'underwriters':
        html = Views.underwriters(params);
        postFn = Views.underwritersPost;
        break;
      case 'underwriter':
        html = Views.underwriterDetail(params.name);
        postFn = Views.underwriterDetailPost;
        postArg = params.name;
        break;
      case 'expenses':
        html = Views.expenses(params);
        postFn = Views.expensesPost;
        break;
      case 'monthly':
        html = Views.monthly(params);
        postFn = Views.monthlyPost;
        break;
      case 'goals':
        html = Views.goals(params);
        postFn = Views.goalsPost;
        postArg = params;
        break;
      case 'data':
        html = Views.data();
        postFn = Views.dataPost;
        break;
      default:
        html = Views.dashboard(params);
        postFn = Views.dashboardPost;
        postArg = params;
    }

    main.innerHTML = html;
    // Scroll to top on route change
    window.scrollTo({ top: 0 });
    if (postFn) postFn.call(Views, postArg);
  },

  /* ---------- Modals ---------- */

  _wireModalCloses() {
    const modal = document.getElementById('modal');
    modal.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-close-modal')) this.closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  },

  openModal(html) {
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modal').hidden = false;
    document.body.style.overflow = 'hidden';
  },

  closeModal() {
    document.getElementById('modal').hidden = true;
    document.getElementById('modalBody').innerHTML = '';
    document.querySelector('.modal__card').classList.remove('modal__card--wide');
    document.body.style.overflow = '';
  },

  openDealModal(dealId, prefill = {}) {
    const deal = dealId ? Store.getDeal(dealId) : null;
    this.openModal(dealModalHTML(deal, prefill));

    const form = document.getElementById('dealForm');

    // Auto recalc revenue & file fee on input change
    const recalc = () => {
      const fd = new FormData(form);
      const tt = fd.get('transactionType');
      const ff = computeFileFee(tt);
      const sf = Number(fd.get('settlementFee') || 0);
      const lp = Number(fd.get('lendersPolicy') || 0);
      const op = Number(fd.get('ownersPolicy') || 0);
      const rev = Math.round((sf + lp + op - ff) * 100) / 100;
      document.getElementById('fileFeePreview').value = fmtMoney(ff);
      document.getElementById('revenuePreview').value = fmtMoney(rev);
    };
    ['transactionType', 'settlementFee', 'lendersPolicy', 'ownersPolicy'].forEach(n => {
      form.elements[n]?.addEventListener('input', recalc);
      form.elements[n]?.addEventListener('change', recalc);
    });
    recalc();

    // Keep chip labels in sync with the listing/selling agent inputs
    const syncChipNames = () => {
      const l = form.elements.listingAgent.value.trim();
      const s = form.elements.sellingAgent.value.trim();
      const chipL = document.getElementById('chipNameListing');
      const chipS = document.getElementById('chipNameSelling');
      if (chipL) chipL.textContent = l || '—';
      if (chipS) chipS.textContent = s || '—';
    };
    ['listingAgent', 'sellingAgent'].forEach(n => {
      form.elements[n]?.addEventListener('input', syncChipNames);
      form.elements[n]?.addEventListener('change', syncChipNames);
    });

    // Client chip picker — tag-style selector
    const chips = form.querySelectorAll('[data-client-pick]');
    const attrInput = document.getElementById('clientAttribution');
    const clientInput = document.getElementById('clientInput');
    const setActive = (which) => {
      chips.forEach(c => c.classList.toggle('is-active', c.getAttribute('data-client-pick') === which));
    };
    chips.forEach(btn => {
      btn.addEventListener('click', () => {
        const which = btn.getAttribute('data-client-pick');
        const listing = form.elements.listingAgent.value.trim();
        const selling = form.elements.sellingAgent.value.trim();
        if (which === 'listing') {
          if (!listing) { this.toast('Enter the Listing Agent name first'); return; }
          clientInput.value = listing;
          attrInput.value = 'Listing Agent';
        } else if (which === 'selling') {
          if (!selling) { this.toast('Enter the Selling Agent name first'); return; }
          clientInput.value = selling;
          attrInput.value = 'Selling Agent';
        } else if (which === 'both') {
          if (!listing && !selling) { this.toast('Enter an agent name first'); return; }
          // Prefer listing if both present; use whichever exists otherwise
          clientInput.value = listing || selling;
          attrInput.value = 'Both';
        } else if (which === 'direct') {
          clientInput.value = '';
          attrInput.value = 'Direct';
        }
        setActive(which);
      });
    });

    // If user types a custom name manually, clear active chip unless it matches one of the agents
    clientInput.addEventListener('input', () => {
      const v = clientInput.value.trim();
      const listing = form.elements.listingAgent.value.trim();
      const selling = form.elements.sellingAgent.value.trim();
      if (!v) {
        setActive(null);
        attrInput.value = '';
        return;
      }
      if (v === listing && v === selling) { setActive('both'); attrInput.value = 'Both'; }
      else if (v === listing) { setActive('listing'); attrInput.value = 'Listing Agent'; }
      else if (v === selling) { setActive('selling'); attrInput.value = 'Selling Agent'; }
      else { setActive(null); /* leave attribution as-is so user can override via chip */ }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const obj = Object.fromEntries(fd.entries());
      // If client empty and nothing selected, derive from listing/selling agent
      if (!obj.client?.trim() && obj.clientAttribution !== 'Direct') {
        obj.client = obj.listingAgent?.trim() || obj.sellingAgent?.trim() || '';
      }
      // Auto-compute attribution if still blank
      if (!obj.clientAttribution) {
        obj.clientAttribution = computeClientSource(obj);
      }
      obj.settlementFee = Number(obj.settlementFee || 0);
      obj.lendersPolicy = Number(obj.lendersPolicy || 0);
      obj.ownersPolicy = Number(obj.ownersPolicy || 0);
      if (!obj.id) delete obj.id;

      // Save-time duplicate check: if a new deal's order # matches an existing one, prompt
      const conflict = Store.findDealConflict(obj);
      if (conflict) {
        const choice = (prompt(
          `A deal with order number "${obj.orderNumber}" already exists.\n\n` +
          `Existing: ${conflict.propertyAddress || '—'} · ${conflict.disbursementDate || '—'} · ${fmtMoney(conflict.revenue, { decimals: 0 })}\n\n` +
          `Type one of:\n` +
          `  UPDATE — replace the existing deal with this new one\n` +
          `  KEEP   — save as a separate deal (creates a duplicate)\n` +
          `  CANCEL — don't save`,
          'UPDATE'
        ) || '').trim().toUpperCase();
        if (choice === 'CANCEL' || choice === '') return;
        if (choice === 'UPDATE') {
          obj.id = conflict.id;
          Store.saveDeal(obj);
          this.toast(`Deal ${obj.orderNumber} updated`);
          this.closeModal();
          this.render();
          return;
        }
        // KEEP → fall through and create a parallel record
      }

      Store.saveDeal(obj);
      this.toast(deal ? 'Deal updated' : 'Deal created');
      this.closeModal();
      this.render();
    });

    document.getElementById('deleteDealFromModal')?.addEventListener('click', () => {
      if (!confirm(`Delete deal ${deal.orderNumber || ''}? This cannot be undone.`)) return;
      Store.deleteDeal(deal.id);
      this.toast('Deal removed');
      this.closeModal();
      this.render();
    });
  },

  /* ---------- Import wizard ---------- */

  openImportModal() {
    Import.state = null;
    this.openModal(importStep1HTML());
    document.querySelector('.modal__card').classList.add('modal__card--wide');
    this._wireImportStep1();
  },

  _wireImportStep1() {
    const dz = document.getElementById('importDropzone');
    const input = document.getElementById('importPickFile');
    const browse = document.getElementById('importBrowseBtn');

    const onPick = (file) => {
      if (!file) return;
      Import.parseFile(file).then(({ headers, rows, sheetName }) => {
        const mapping = Import.autoMap(headers);
        Import.state = { file, sheetName, headers, rows, mapping, options: { clientStrategy: 'listingFirst' } };
        document.getElementById('modalBody').innerHTML = importStep2HTML(Import.state);
        this._wireImportStep2();
      }).catch(err => {
        this.toast('Could not read file: ' + err.message);
      });
    };

    browse.addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => onPick(e.target.files[0]));

    ['dragenter', 'dragover'].forEach(ev => {
      dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('is-dragover'); });
    });
    ['dragleave', 'drop'].forEach(ev => {
      dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('is-dragover'); });
    });
    dz.addEventListener('drop', (e) => onPick(e.dataTransfer.files[0]));
    dz.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') input.click();
    });
  },

  _wireImportStep2() {
    document.querySelectorAll('.import-map__select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = Number(e.target.getAttribute('data-col-idx'));
        const val = e.target.value;
        // Enforce uniqueness of non-empty mappings
        if (val) {
          Import.state.mapping.forEach((m, i) => {
            if (i !== idx && m === val) {
              Import.state.mapping[i] = '';
              const other = document.querySelector(`.import-map__select[data-col-idx="${i}"]`);
              if (other) other.value = '';
            }
          });
        }
        Import.state.mapping[idx] = val;
      });
    });

    document.getElementById('importBackTo1').addEventListener('click', () => {
      document.getElementById('modalBody').innerHTML = importStep1HTML();
      this._wireImportStep1();
    });

    document.getElementById('importToStep3').addEventListener('click', () => {
      const strategy = document.querySelector('input[name="clientStrategy"]:checked').value;
      Import.state.options.clientStrategy = strategy;

      const mapping = Import.state.mapping;
      // Validate essentials are mapped
      const mapped = new Set(mapping.filter(Boolean));
      if (!mapped.has('disbursementDate') || !mapped.has('transactionType')) {
        this.toast('Please map both Disbursement Date and Transaction Type');
        return;
      }

      const deals = Import.state.rows.map(r => Import.buildDeal(r, mapping, Import.state.options));
      Import.state.validated = Import.validate(deals);
      Import.state.summary = Import.summarize(Import.state.validated);

      document.getElementById('modalBody').innerHTML = importStep3HTML(Import.state, Import.state.summary);
      this._wireImportStep3();
    });
  },

  _wireImportStep3() {
    document.getElementById('importBackTo2').addEventListener('click', () => {
      document.getElementById('modalBody').innerHTML = importStep2HTML(Import.state);
      this._wireImportStep2();
    });

    const btn = document.getElementById('importCommit');
    const summary = Import.state.summary;
    const updateBtn = () => {
      const mode = document.querySelector('input[name="duplicateMode"]:checked')?.value || 'skip';
      const dup = summary.duplicates.length;
      const valid = summary.valid;
      let newCount, updateCount;
      if (mode === 'skip')       { newCount = valid - dup; updateCount = 0; }
      else if (mode === 'update') { newCount = valid - dup; updateCount = dup; }
      else                         { newCount = valid;       updateCount = 0; } // add
      const parts = [];
      if (newCount > 0) parts.push(`Import ${newCount} new`);
      if (updateCount > 0) parts.push(`Update ${updateCount}`);
      btn.textContent = parts.length ? parts.join(' · ') : 'Nothing to import';
      btn.disabled = parts.length === 0;
      btn.classList.toggle('btn--disabled', parts.length === 0);
    };
    document.querySelectorAll('input[name="duplicateMode"]').forEach(r => {
      r.addEventListener('change', updateBtn);
    });
    updateBtn();

    document.getElementById('importCommit').addEventListener('click', () => {
      const skipInvalid = document.getElementById('importSkipInvalid')?.checked ?? true;
      const duplicateMode = document.querySelector('input[name="duplicateMode"]:checked')?.value || 'skip';
      const result = Import.commit(Import.state.validated, { skipInvalid, duplicateMode });
      this.closeModal();
      const parts = [];
      if (result.imported) parts.push(`${result.imported} imported`);
      if (result.updated) parts.push(`${result.updated} updated`);
      if (result.newRealtors.length) parts.push(`${result.newRealtors.length} new realtor${result.newRealtors.length === 1 ? '' : 's'}`);
      if (result.skipped) parts.push(`${result.skipped} skipped`);
      this.toast(parts.length ? parts.join(' · ') : 'No changes');
      this.render();
    });
  },

  openExpenseModal(expenseId, prefill = {}) {
    const expense = expenseId ? Store.getExpense(expenseId) : null;
    this.openModal(expenseModalHTML(expense, prefill));

    wireCombobox(document.querySelector('[data-combobox]'));

    const form = document.getElementById('expenseForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const obj = Object.fromEntries(new FormData(form).entries());
      obj.amount = Number(obj.amount || 0);
      if (!obj.id) delete obj.id;
      Store.saveExpense(obj);
      this.toast(expense ? 'Expense updated' : 'Expense created');
      this.closeModal();
      this.render();
    });

    document.getElementById('deleteExpenseFromModal')?.addEventListener('click', () => {
      if (!confirm('Delete this expense?')) return;
      Store.deleteExpense(expense.id);
      this.toast('Expense removed');
      this.closeModal();
      this.render();
    });
  },

  openGoalsModal(year) {
    const existing = Goals.get(year) || {};
    this.openModal(goalsModalHTML(year, existing));
    const form = document.getElementById('goalsForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const obj = Object.fromEntries(new FormData(form).entries());
      const targetYear = Number(obj.year || year);
      Goals.set(targetYear, {
        revenue: obj.revenue,
        deals: obj.deals,
        activeRealtors: obj.activeRealtors,
        avgDealRevenue: obj.avgDealRevenue,
        expenseBudget: obj.expenseBudget
      });
      this.toast(`${targetYear} goals saved`);
      this.closeModal();
      App.navigate('goals', { year: String(targetYear) });
    });
    document.getElementById('deleteGoalsFromModal')?.addEventListener('click', () => {
      if (!confirm(`Remove ${year} goals?`)) return;
      Goals.remove(year);
      this.toast('Goals removed');
      this.closeModal();
      this.render();
    });
  },

  /* ---------- Toast ---------- */

  _toastTimer: null,
  toast(message) {
    const t = document.getElementById('toast');
    t.textContent = message;
    t.hidden = false;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
  }
};

/* ==========================================================================
   BulkSelect — selection state + floating action bar
   ========================================================================== */

const BulkSelect = {
  selected: new Set(),
  scope: null,       // 'deals' | 'expenses' | 'agents'
  actions: [],       // [{ label, icon, danger, primary, onClick(ids) }]
  itemNoun: 'item',

  reset() {
    this.selected.clear();
    this.scope = null;
    this.actions = [];
    this._hideBar();
  },

  /**
   * Call from a view's post-render hook.
   * Wires checkboxes (rows + header) and the floating action bar.
   *   scope      — unique tag per view, used as a namespace
   *   itemNoun   — singular label for the count ("deal", "expense", "realtor")
   *   actions    — array of { label, icon, danger, primary, onClick(ids) }
   */
  init({ scope, itemNoun = 'item', actions = [] }) {
    this.selected = new Set();
    this.scope = scope;
    this.itemNoun = itemNoun;
    this.actions = actions;

    this._ensureBar();

    const rowChecks = () => Array.from(document.querySelectorAll(`.ra-check[data-bulk-id]`));
    const headCheck = document.getElementById('bulkSelectAll');

    rowChecks().forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = cb.getAttribute('data-bulk-id');
        if (cb.checked) this.selected.add(id);
        else this.selected.delete(id);
        this._syncRow(cb);
        this._syncHead();
        this._syncBar();
      });
    });

    // Row click toggles selection (but not on links, buttons, or the checkbox itself)
    document.querySelectorAll('tr[data-bulk-row]').forEach(tr => {
      tr.addEventListener('click', (e) => {
        const tag = e.target.tagName;
        if (tag === 'A' || tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT') return;
        if (e.target.closest('a, button, input, select, .inline-actions')) return;
        // Only intercept when Shift or Cmd/Ctrl held, OR when some row is already selected
        if (!(e.shiftKey || e.metaKey || e.ctrlKey) && this.selected.size === 0) return;
        e.preventDefault();
        const cb = tr.querySelector('.ra-check[data-bulk-id]');
        if (!cb) return;
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    if (headCheck) {
      headCheck.addEventListener('change', () => {
        const checks = rowChecks();
        const turnOn = headCheck.checked;
        checks.forEach(cb => {
          cb.checked = turnOn;
          const id = cb.getAttribute('data-bulk-id');
          if (turnOn) this.selected.add(id);
          else this.selected.delete(id);
          this._syncRow(cb);
        });
        this._syncBar();
      });
    }
  },

  _syncRow(cb) {
    const tr = cb.closest('tr');
    if (tr) tr.classList.toggle('is-selected', cb.checked);
  },

  _syncHead() {
    const head = document.getElementById('bulkSelectAll');
    if (!head) return;
    const checks = Array.from(document.querySelectorAll('.ra-check[data-bulk-id]'));
    const total = checks.length;
    const selected = checks.filter(c => c.checked).length;
    head.checked = selected > 0 && selected === total;
    head.indeterminate = selected > 0 && selected < total;
  },

  _ensureBar() {
    if (document.getElementById('bulkBar')) return;
    const bar = document.createElement('div');
    bar.id = 'bulkBar';
    bar.className = 'bulkbar';
    document.body.appendChild(bar);
  },

  _syncBar() {
    const bar = document.getElementById('bulkBar');
    if (!bar) return;
    const n = this.selected.size;
    if (n === 0) {
      bar.classList.remove('is-visible');
      return;
    }
    const noun = n === 1 ? this.itemNoun : this.itemNoun + 's';
    const actionsHTML = this.actions.map((a, i) => {
      const cls = a.danger ? 'bulkbar__btn bulkbar__btn--danger' : (a.primary ? 'bulkbar__btn bulkbar__btn--primary' : 'bulkbar__btn');
      const ico = a.icon ? icon(a.icon, 13) : '';
      return `<button class="${cls}" data-bulk-action="${i}">${ico}<span>${a.label}</span></button>`;
    }).join('');
    bar.innerHTML = `
      <div class="bulkbar__count">${n}<small>${noun} selected</small></div>
      <div class="bulkbar__divider"></div>
      <div class="bulkbar__actions">${actionsHTML}</div>
      <div class="bulkbar__divider"></div>
      <button class="bulkbar__close" id="bulkBarClose" aria-label="Clear selection">${icon('close', 14)}</button>
    `;
    bar.classList.add('is-visible');
    bar.querySelectorAll('[data-bulk-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-bulk-action'));
        const action = this.actions[idx];
        if (!action) return;
        action.onClick(Array.from(this.selected));
      });
    });
    document.getElementById('bulkBarClose')?.addEventListener('click', () => this._clearAll());
  },

  _clearAll() {
    document.querySelectorAll('.ra-check[data-bulk-id]').forEach(cb => {
      cb.checked = false;
      this._syncRow(cb);
    });
    this.selected.clear();
    this._syncHead();
    this._hideBar();
  },

  _hideBar() {
    const bar = document.getElementById('bulkBar');
    if (bar) bar.classList.remove('is-visible');
  }
};

/* Utility — download a CSV string as a file */
function downloadCSV(filename, rows) {
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const csv = rows.map(r => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ==========================================================================
   Admin modal — list/add/remove users, assign roles
   ========================================================================== */

App.openAdminModal = async function() {
  this.openModal(adminModalLoadingHTML());
  document.querySelector('.modal__card').classList.add('modal__card--wide');
  let dir;
  try {
    const resp = await Auth.apiFetch('/api/users');
    if (!resp.ok) throw new Error('List failed: ' + resp.status);
    dir = await resp.json();
  } catch (e) {
    document.getElementById('modalBody').innerHTML = `<div class="admin-error">Could not load users: ${escapeHtml(e.message)}</div>`;
    return;
  }
  document.getElementById('modalBody').innerHTML = adminModalHTML(dir, Auth.user);
  App._wireAdminModal();
};

App._wireAdminModal = function() {
  const addForm = document.getElementById('adminAddForm');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(addForm);
      const email = String(fd.get('email') || '').trim();
      const role = String(fd.get('role') || 'editor');
      if (!email) return;
      const resp = await Auth.apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({ email, role })
      });
      if (!resp.ok) {
        App.toast('Save failed: ' + resp.status);
        return;
      }
      const body = await resp.json().catch(() => ({}));
      const invite = body.invite;
      App.toast(inviteToast(email, invite, 'added'));
      App.openAdminModal();
    });
  }

  document.querySelectorAll('[data-admin-remove]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const email = btn.getAttribute('data-admin-remove');
      if (!confirm(`Remove ${email} from the CRM?`)) return;
      const resp = await Auth.apiFetch('/api/users/' + encodeURIComponent(email), { method: 'DELETE' });
      if (resp.ok) { App.toast('User removed'); App.openAdminModal(); }
      else App.toast('Remove failed: ' + resp.status);
    });
  });

  document.querySelectorAll('[data-admin-resend]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const email = btn.getAttribute('data-admin-resend');
      btn.disabled = true;
      const orig = btn.textContent;
      btn.textContent = 'Sending…';
      try {
        const resp = await Auth.apiFetch('/api/users/' + encodeURIComponent(email) + '/resend', {
          method: 'POST'
        });
        const body = await resp.json().catch(() => ({}));
        App.toast(inviteToast(email, body.invite, 'resent'));
        App.openAdminModal();
      } catch (e) {
        App.toast('Resend failed: ' + e.message);
        btn.disabled = false;
        btn.textContent = orig;
      }
    });
  });

  document.querySelectorAll('[data-admin-role]').forEach(sel => {
    sel.addEventListener('change', async () => {
      const email = sel.getAttribute('data-admin-role');
      const role = sel.value;
      const resp = await Auth.apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({ email, role })
      });
      if (resp.ok) App.toast(`${email} → ${role}`);
      else App.toast('Update failed: ' + resp.status);
    });
  });

  document.getElementById('adminSignOutBtn')?.addEventListener('click', () => Auth.signOut());
  document.getElementById('adminClerkLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.open('https://dashboard.clerk.com', '_blank', 'noopener');
  });
};

function adminModalLoadingHTML() {
  return `<div class="admin-loading"><div class="auth-spinner"></div><div>Loading admin center…</div></div>`;
}

// Turn an invite result into a human-readable toast. `action` is the verb
// ('added' or 'resent') shown when the email is successfully delivered.
function inviteToast(email, invite, action) {
  if (!invite) return `${action === 'resent' ? 'Resent' : 'Updated'} ${email}`;
  if (invite.ok && invite.status === 'created')         return `Invitation emailed to ${email}`;
  if (invite.ok && invite.status === 'already_pending') return `${email}: invite was still pending — click Resend to deliver a fresh link`;
  if (invite.ok && invite.status === 'already_signed_up') return `${email} already has an account — they can sign in with Google`;
  if (!invite.ok) return `${email} saved, but email not sent: ${invite.reason}`;
  return `${action === 'resent' ? 'Resent' : 'Added'} ${email}`;
}

// Returns the inline status line + per-row actions for the invite column.
// `u` is a directory entry as returned by /api/users.
function adminInviteCell(u) {
  if (u.lastSeenAt) return { label: '<span class="admin-badge admin-badge--active">Active</span>', actions: '' };
  const resendBtn = `<button type="button" class="btn-link" data-admin-resend="${escapeHtml(u.email)}">Resend invite</button>`;
  if (u.invitationError) {
    return {
      label: `<span class="admin-badge admin-badge--warn">Email failed</span>`,
      actions: resendBtn,
      detail: u.invitationError
    };
  }
  if (u.invitationStatus === 'already_signed_up') {
    return { label: '<span class="admin-badge">Existing account</span>', actions: '' };
  }
  if (u.invitationStatus === 'already_pending') {
    return {
      label: '<span class="admin-badge admin-badge--warn">Pending (stale)</span>',
      actions: resendBtn,
      detail: 'Clerk still had an old invite on file — resend to deliver a new link.'
    };
  }
  if (u.invitationSent || u.invitationStatus === 'created') {
    return { label: '<span class="admin-badge">Invited</span>', actions: resendBtn };
  }
  // Added manually (no invite attempt recorded). Still offer Resend so the
  // admin can kick off the email without re-entering the email address.
  return { label: '<span class="admin-dim">—</span>', actions: resendBtn };
}

function adminModalHTML(dir, me) {
  const users = (dir.users || []).slice().sort((a, b) => a.email.localeCompare(b.email));
  const fmtDate = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return iso; }
  };

  const rows = users.map(u => {
    const isMe = u.email.toLowerCase() === me.email.toLowerCase();
    const displayName = ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || '—';
    const invite = adminInviteCell(u);
    const lastSeenCell = u.lastSeenAt
      ? fmtDate(u.lastSeenAt)
      : invite.label;
    const rowActions = [
      !isMe && invite.actions ? invite.actions : '',
      !isMe ? `<button type="button" class="btn-link btn-link--danger" data-admin-remove="${escapeHtml(u.email)}">Remove</button>` : ''
    ].filter(Boolean).join(' <span class="admin-sep">·</span> ');
    return `
      <tr>
        <td>
          <div class="admin-user">
            ${u.imageUrl ? `<img class="admin-user__avatar" src="${escapeHtml(u.imageUrl)}" alt="" />` : `<div class="admin-user__avatar admin-user__avatar--placeholder">${escapeHtml((u.email[0]||'?').toUpperCase())}</div>`}
            <div>
              <div class="admin-user__email">${escapeHtml(u.email)}${isMe ? ' <span class="admin-user__you">(you)</span>' : ''}</div>
              <div class="admin-user__name">${escapeHtml(displayName)}</div>
              ${invite.detail ? `<div class="admin-user__invite-detail">${escapeHtml(invite.detail)}</div>` : ''}
            </div>
          </div>
        </td>
        <td>
          <select class="admin-role-select" data-admin-role="${escapeHtml(u.email)}" ${isMe ? 'disabled' : ''}>
            <option value="admin"  ${u.role === 'admin'  ? 'selected' : ''}>Admin</option>
            <option value="editor" ${u.role === 'editor' ? 'selected' : ''}>Editor</option>
            <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>Viewer</option>
          </select>
        </td>
        <td class="num">${lastSeenCell}</td>
        <td class="num">${fmtDate(u.addedAt)}</td>
        <td>${rowActions}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="admin-modal">
      <header class="admin-modal__head">
        <div>
          <div class="eyebrow">Admin Center</div>
          <h2>Team access</h2>
          <p class="admin-modal__sub">Invited users sign in with Google. Roles: <strong>Admin</strong> manages team · <strong>Editor</strong> writes data · <strong>Viewer</strong> reads only.</p>
        </div>
      </header>

      <form class="admin-add" id="adminAddForm">
        <label class="admin-add__label" for="adminAddEmail">Invite by email</label>
        <div class="admin-add__row">
          <input type="email" id="adminAddEmail" name="email" required placeholder="realtor@example.com" />
          <select name="role">
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
          <button type="submit" class="btn btn--gold">Invite</button>
        </div>
        <div class="admin-add__hint">They'll see the CRM the next time they sign in with Google using this email.</div>
      </form>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th class="num">Last seen</th>
              <th class="num">Added</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="5" class="admin-empty">No users yet.</td></tr>'}</tbody>
        </table>
      </div>

      <footer class="admin-modal__foot">
        <div>
          <a href="https://dashboard.clerk.com" id="adminClerkLink" class="btn-link">Open Clerk dashboard →</a>
          <span class="admin-modal__foothint">for password resets, session activity, and security settings</span>
        </div>
        <button type="button" class="btn btn--ghost" id="adminSignOutBtn">Sign out</button>
      </footer>
    </div>
  `;
}

/* ==========================================================================
   Bootstrap: sign-in gate → app init
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  const { authorized } = await Auth.init();
  if (!authorized) return;
  App.init();
});
