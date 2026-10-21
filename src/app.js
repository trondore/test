/* Mono CRM — minimal, local-first interface. */
(function () {
  'use strict';
  const Core = window.MonoCore;
  if (!Core) throw new Error('Data module is missing.');
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const e = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);
  const titles = { dashboard: 'Overview', contacts: 'Contacts', companies: 'Companies', deals: 'Pipeline', tasks: 'Tasks', settings: 'Settings' };
  const singular = { contacts: 'Contact', companies: 'Company', deals: 'Deal', tasks: 'Task' };
  const icons = {
    overview: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    contacts: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    companies: '<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M8 5V2h8v3M8 10h2m4 0h2M8 14h2m4 0h2M9 21v-4h6v4"/>',
    deals: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v3h4v-3"/>',
    tasks: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 10 2 2 4-4M8 17h8"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M4.9 4.9 7 7m10 10 2.1 2.1M2 12h3m14 0h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M5 17v4h14v-4"/>',
    upload: '<path d="M12 21V9m-4 4 4-4 4 4M5 7V3h14v4"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    filter: '<path d="M4 7h16M7 12h10m-7 5h4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
    external: '<path d="M13 4h7v7M20 4l-9 9M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.6 4 3 9 3s9-1.4 9-3V5M3 12c0 1.6 4 3 9 3s9-1.4 9-3"/>',
    keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/>'
  };
  const icon = (name, size = 18) => `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.more}</svg>`;
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const dateLabel = (value) => { if (!value) return '—'; const d = new Date(value + 'T12:00:00'); return Number.isNaN(d.valueOf()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); };
  const relative = (value) => { if (!value) return '—'; const d = new Date(value); if (Number.isNaN(d.valueOf())) return '—'; return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };
  const money = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: state.data.settings.currency, maximumFractionDigits: 0 }).format(Number(value) || 0);
  const fmtCompact = (value) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0);
  const company = (id) => state.data.companies.find(item => item.id === id);
  const contact = (id) => state.data.contacts.find(item => item.id === id);
  const deal = (id) => state.data.deals.find(item => item.id === id);
  const names = { dashboard: 'dashboard', contacts: 'contacts', companies: 'companies', deals: 'deals', tasks: 'tasks', settings: 'settings' };
  const state = { data: Core.empty(), view: 'dashboard', search: '', filters: { contacts: 'all', deals: 'all', tasks: 'open' }, sort: {}, modal: null, confirm: null, sidebarOpen: false, storageError: '' };

  function safeUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : 'https://' + raw);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  }
  function urlLink(value) {
    const url = safeUrl(value);
    return url ? `<a class="text-link" href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(value)} ${icon('external', 12)}</a>` : `<span class="muted">${e(value || '—')}</span>`;
  }
  function rowButton(label, kind, id) { return `<button type="button" class="table-primary" data-action="edit" data-kind="${kind}" data-id="${e(id)}">${e(label)}</button>`; }
  function blank(value) { return value ? e(value) : '<span class="muted">—</span>'; }
  function pill(value) { return `<span class="pill">${e(value)}</span>`; }
  function emptyState(title, detail, kind) {
    return `<div class="empty-state"><div class="empty-mark">${icon(kind === 'deals' ? 'deals' : kind === 'tasks' ? 'tasks' : kind === 'companies' ? 'companies' : 'contacts', 25)}</div><h3>${e(title)}</h3><p>${e(detail)}</p><button class="btn btn-primary" data-action="new" data-kind="${kind}">${icon('plus', 16)} Add ${e(singular[kind])}</button></div>`;
  }
  function trimQuery(item, values) { return !state.search || values.filter(Boolean).join(' ').toLowerCase().includes(state.search.toLowerCase().trim()); }
  function sortRows(rows, kind, resolvers = {}) {
    const selected = state.sort[kind]; if (!selected) return rows;
    const key = selected.key; const dir = selected.dir;
    return [...rows].sort((a, b) => {
      const x = resolvers[key] ? resolvers[key](a) : a[key];
      const y = resolvers[key] ? resolvers[key](b) : b[key];
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true, sensitivity: 'base' })) * dir;
    });
  }
  function th(label, kind, key) {
    const selected = state.sort[kind]; const arrow = selected && selected.key === key ? (selected.dir === 1 ? ' ↑' : ' ↓') : '';
    return `<th scope="col"><button class="sort-heading" data-sort="${e(kind)}" data-key="${e(key)}">${e(label)}<span aria-hidden="true">${arrow}</span></button></th>`;
  }
  function filterChip(label, group, value) {
    const active = state.filters[group] === value;
    return `<button type="button" class="chip ${active ? 'active' : ''}" aria-pressed="${active}" data-filter="${group}" data-value="${value}">${e(label)}</button>`;
  }
  function sectionHeading(title, detail, actions = '') { return `<div class="section-heading"><div><h2>${e(title)}</h2>${detail ? `<p>${e(detail)}</p>` : ''}</div><div class="section-actions">${actions}</div></div>`; }
  function actionButton(label, action, kind = '') { return `<button class="btn btn-subtle" data-action="${action}" ${kind ? `data-kind="${kind}"` : ''}>${e(label)}</button>`; }

  function renderDashboard() {
    const m = Core.metrics(state.data, today());
    const cards = [
      ['Open pipeline', money(m.openPipeline), 'Value of active opportunities'],
      ['Open deals', m.openDeals, 'Not won or lost'],
      ['Tasks due', m.dueTasks, 'Today or overdue'],
      ['Won this month', money(m.wonThisMonth), 'Closed-won deal value']
    ];
    const upcoming = state.data.tasks.filter(t => !t.completed).sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')).slice(0, 6);
    const recentDeals = [...state.data.deals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
    const recentActions = state.data.activities.slice(0, 6);
    const rows = recentDeals.map(d => `<tr><td>${rowButton(d.title, 'deals', d.id)}<div class="mobile-only small muted">${e(company(d.companyId)?.name || '')}</div></td><td>${blank(company(d.companyId)?.name)}</td><td>${pill(d.stage)}</td><td class="align-right mono">${money(d.value)}</td></tr>`).join('');
    return `<div class="page-heading"><div><div class="eyebrow">WORKSPACE / AT A GLANCE</div><h1>Good to see you.</h1><p>Everything that matters, in one place.</p></div><span class="date-tag">${dateLabel(today())}</span></div>
      <section class="metric-grid">${cards.map(([label, value, desc]) => `<div class="metric"><div class="metric-label">${label}</div><div class="metric-value" title="${e(String(value))}">${e(String(value))}</div><div class="metric-foot">${desc}</div></div>`).join('')}</section>
      <div class="dashboard-grid"><section class="surface"><div class="surface-heading"><div><h2>Recent opportunities</h2><p>Your latest deals, at a glance</p></div><button class="link-button" data-nav="deals">View pipeline ${icon('arrow', 14)}</button></div>
      ${recentDeals.length ? `<div class="table-scroll"><table><thead><tr><th>Deal</th><th>Company</th><th>Stage</th><th class="align-right">Value</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="mini-empty">No deals yet. <button class="inline-link" data-action="new" data-kind="deals">Create your first deal</button>.</div>`}</section>
      <section class="surface"><div class="surface-heading"><div><h2>Next actions</h2><p>Prioritized by due date</p></div><button class="link-button" data-nav="tasks">All tasks ${icon('arrow', 14)}</button></div>
      ${upcoming.length ? `<div class="task-list">${upcoming.map(t => renderTaskListItem(t, true)).join('')}</div>` : `<div class="mini-empty">Nothing due. <button class="inline-link" data-action="new" data-kind="tasks">Add a task</button>.</div>`}</section></div>
      <section class="surface activity-surface"><div class="surface-heading"><div><h2>Recent activity</h2><p>Changes across your workspace</p></div></div>${recentActions.length ? `<div class="activity-list">${recentActions.map(a => `<div class="activity-item"><span class="activity-dot"></span><div><div>${e(a.text)}</div><small>${e(relative(a.createdAt))}</small></div></div>`).join('')}</div>` : '<div class="mini-empty">Your workspace history appears here as you work.</div>'}</section>`;
  }

  function renderContacts() {
    let rows = state.data.contacts.filter(c => (state.filters.contacts === 'all' || c.status === state.filters.contacts) && trimQuery(c, [c.name, c.title, c.email, c.phone, c.tags, company(c.companyId)?.name]));
    rows = sortRows(rows, 'contacts', { company: c => company(c.companyId)?.name || '' });
    const actions = `<button class="btn btn-subtle" data-action="import-csv">${icon('upload', 16)} Import CSV</button><button class="btn btn-subtle" data-action="export-csv" data-kind="contacts">${icon('download', 16)} Export</button>`;
    return `${sectionHeading('All contacts', `${state.data.contacts.length} total contacts`, actions)}
      <div class="toolbar"><div class="chip-row">${filterChip('All', 'contacts', 'all')}${Core.CONTACT_STATUSES.map(s => filterChip(s, 'contacts', s)).join('')}</div><span class="row-count">${rows.length} shown</span></div>
      ${rows.length ? `<div class="table-scroll table-panel"><table><thead><tr>${th('Name', 'contacts', 'name')}${th('Company', 'contacts', 'company')}${th('Title', 'contacts', 'title')}${th('Email', 'contacts', 'email')}${th('Phone', 'contacts', 'phone')}${th('Status', 'contacts', 'status')}</tr></thead><tbody>${rows.map(c => `<tr><td><div class="cell-name">${rowButton(c.name, 'contacts', c.id)}</div></td><td>${blank(company(c.companyId)?.name)}</td><td>${blank(c.title)}</td><td>${c.email ? `<a href="mailto:${e(c.email)}" class="text-link" onclick="event.stopPropagation()">${e(c.email)}</a>` : '<span class="muted">—</span>'}</td><td>${blank(c.phone)}</td><td>${pill(c.status)}</td></tr>`).join('')}</tbody></table></div>` : emptyState(state.search || state.filters.contacts !== 'all' ? 'No matching contacts' : 'Your contacts start here', state.search || state.filters.contacts !== 'all' ? 'Try another search or filter.' : 'Keep everyone you work with in one organized place.', 'contacts')}`;
  }

  function renderCompanies() {
    let rows = state.data.companies.filter(c => trimQuery(c, [c.name, c.industry, c.location, c.website, c.notes]));
    rows = sortRows(rows, 'companies', { contacts: c => state.data.contacts.filter(x => x.companyId === c.id).length, deals: c => state.data.deals.filter(x => x.companyId === c.id && !['Won', 'Lost'].includes(x.stage)).length });
    return `${sectionHeading('All companies', `${state.data.companies.length} total companies`, `<button class="btn btn-subtle" data-action="export-csv" data-kind="companies">${icon('download', 16)} Export</button>`)}
      ${rows.length ? `<div class="table-scroll table-panel"><table><thead><tr>${th('Company', 'companies', 'name')}${th('Industry', 'companies', 'industry')}${th('Location', 'companies', 'location')}${th('Website', 'companies', 'website')}${th('Contacts', 'companies', 'contacts')}${th('Open deals', 'companies', 'deals')}</tr></thead><tbody>${rows.map(c => `<tr><td><div class="cell-name">${rowButton(c.name, 'companies', c.id)}</div></td><td>${blank(c.industry)}</td><td>${blank(c.location)}</td><td>${urlLink(c.website)}</td><td class="mono">${state.data.contacts.filter(x => x.companyId === c.id).length}</td><td class="mono">${state.data.deals.filter(x => x.companyId === c.id && !['Won', 'Lost'].includes(x.stage)).length}</td></tr>`).join('')}</tbody></table></div>` : emptyState(state.search ? 'No matching companies' : 'Build your company list', state.search ? 'Try a different search.' : 'Accounts stay connected to their contacts and deals.', 'companies')}`;
  }

  function renderDeals() {
    const openStages = ['New', 'Qualified', 'Proposal', 'Negotiation'];
    const visibleStages = state.filters.deals === 'open' ? openStages : state.filters.deals === 'closed' ? ['Won', 'Lost'] : Core.STAGES;
    const filtered = state.data.deals.filter(d => trimQuery(d, [d.title, d.stage, d.notes, company(d.companyId)?.name, contact(d.contactId)?.name]));
    return `${sectionHeading('Sales pipeline', `${state.data.deals.length} opportunities · drag cards between stages`, `<button class="btn btn-subtle" data-action="export-csv" data-kind="deals">${icon('download', 16)} Export</button>`)}
      <div class="toolbar"><div class="chip-row">${filterChip('All stages', 'deals', 'all')}${filterChip('Active', 'deals', 'open')}${filterChip('Closed', 'deals', 'closed')}</div><span class="row-count">${filtered.length} shown</span></div>
      <div class="kanban" aria-label="Sales pipeline stages">${visibleStages.map(stage => {
        const deals = filtered.filter(d => d.stage === stage);
        const sum = deals.reduce((n, d) => n + d.value, 0);
        return `<div class="kanban-column" data-stage="${stage}"><div class="kanban-column-head"><div class="kanban-title"><span class="stage-marker ${['Won', 'Lost'].includes(stage) ? 'closed' : ''}"></span><h3>${stage}</h3><span class="stage-count">${deals.length}</span></div><div class="stage-value">${money(sum)}</div></div><div class="kanban-list">${deals.map(d => `<article class="deal-card" draggable="true" tabindex="0" data-deal-id="${e(d.id)}"><button class="deal-name" data-action="edit" data-kind="deals" data-id="${e(d.id)}">${e(d.title)}</button><div class="deal-company">${e(company(d.companyId)?.name || 'No company')}</div><div class="deal-bottom"><strong>${money(d.value)}</strong><span>${d.closeDate ? dateLabel(d.closeDate) : 'No close date'}</span></div></article>`).join('')}<button class="kanban-add" data-action="new" data-kind="deals" data-stage="${stage}">${icon('plus', 15)} Add deal</button></div></div>`;
      }).join('')}</div>`;
  }

  function linkedLabel(task) {
    if (!task.relatedType || !task.relatedId) return '';
    const row = state.data[task.relatedType]?.find(x => x.id === task.relatedId);
    return row ? row.name || row.title || '' : '';
  }
  function renderTaskListItem(t, compact = false) {
    const past = t.dueDate && t.dueDate < today();
    const todayDue = t.dueDate === today();
    return `<div class="task-item ${t.completed ? 'is-complete' : ''}"><button class="task-check ${t.completed ? 'checked' : ''}" data-action="toggle-task" data-id="${e(t.id)}" aria-label="${t.completed ? 'Reopen' : 'Complete'} ${e(t.title)}">${t.completed ? icon('check', 13) : ''}</button><div class="task-copy"><button class="task-name" data-action="edit" data-kind="tasks" data-id="${e(t.id)}">${e(t.title)}</button>${linkedLabel(t) ? `<span class="task-linked">${e(linkedLabel(t))}</span>` : ''}</div><div class="task-meta">${t.priority === 'High' ? '<span class="priority">HIGH</span>' : ''}<span class="${past && !t.completed ? 'overdue' : todayDue && !t.completed ? 'due-today' : 'muted'}">${t.dueDate ? (todayDue ? 'Today' : dateLabel(t.dueDate)) : (compact ? '' : 'No date')}</span></div></div>`;
  }
  function renderTasks() {
    const filtered = state.data.tasks.filter(t => (state.filters.tasks === 'all' || (state.filters.tasks === 'open' && !t.completed) || (state.filters.tasks === 'done' && t.completed)) && trimQuery(t, [t.title, t.notes, t.priority, linkedLabel(t)]));
    const sorted = [...filtered].sort((a, b) => Number(a.completed) - Number(b.completed) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || ({ High: 0, Normal: 1, Low: 2 }[a.priority] - { High: 0, Normal: 1, Low: 2 }[b.priority]));
    const groups = [
      ['Overdue', sorted.filter(t => !t.completed && t.dueDate && t.dueDate < today())],
      ['Today', sorted.filter(t => !t.completed && t.dueDate === today())],
      ['Upcoming', sorted.filter(t => !t.completed && t.dueDate > today())],
      ['Someday', sorted.filter(t => !t.completed && !t.dueDate)],
      ['Completed', sorted.filter(t => t.completed)]
    ].filter(([, items]) => items.length);
    return `${sectionHeading('Your tasks', `${state.data.tasks.filter(t => !t.completed).length} open tasks`, `<button class="btn btn-subtle" data-action="export-csv" data-kind="tasks">${icon('download', 16)} Export</button>`)}
      <div class="toolbar"><div class="chip-row">${filterChip('Open', 'tasks', 'open')}${filterChip('Completed', 'tasks', 'done')}${filterChip('All tasks', 'tasks', 'all')}</div><span class="row-count">${filtered.length} shown</span></div>
      ${groups.length ? `<div class="task-groups">${groups.map(([heading, items]) => `<section class="task-group"><div class="task-group-title"><h3>${heading}</h3><span>${items.length}</span></div><div class="task-list">${items.map(t => renderTaskListItem(t)).join('')}</div></section>`).join('')}</div>` : emptyState(state.search || state.filters.tasks !== 'open' ? 'No matching tasks' : 'Nothing on your list', state.search || state.filters.tasks !== 'open' ? 'Change the filter or try another search.' : 'Add a follow-up so nothing falls through the cracks.', 'tasks')}`;
  }
  function renderSettings() {
    return `${sectionHeading('Workspace settings', 'Privacy-first by default. Your records never leave this browser unless you export them.')}
      <div class="settings-grid"><section class="surface settings-card"><div class="settings-icon">${icon('database', 19)}</div><h3>Local storage</h3><p>Data is stored in this browser profile. No account, no server, no tracking. Back up regularly; clearing browser data removes this workspace.</p><div class="settings-bottom"><span class="settings-state"><span class="status-dot"></span> Stored locally</span></div></section>
      <section class="surface settings-card"><div class="settings-icon">${icon('settings', 19)}</div><h3>Preferences</h3><p>Set the currency shown across your pipeline.</p><label class="label" for="currency">DISPLAY CURRENCY</label><select id="currency" class="input select-field">${Core.CURRENCIES.map(c => `<option value="${c}" ${state.data.settings.currency === c ? 'selected' : ''}>${c}</option>`).join('')}</select></section></div>
      <section class="surface settings-section"><div><h3>Backup and restore</h3><p>Download a full JSON backup or restore a previously exported workspace.</p></div><div class="settings-buttons"><button class="btn btn-primary" data-action="export-json">${icon('download', 16)} Download backup</button><button class="btn btn-subtle" data-action="restore-json">${icon('upload', 16)} Restore backup</button></div></section>
      <section class="surface settings-section"><div><h3>Transfer contacts</h3><p>Import a CSV with name, email, phone, title, company, status, tags or notes. Existing emails are matched to avoid duplicates.</p></div><div class="settings-buttons"><button class="btn btn-subtle" data-action="import-csv">${icon('upload', 16)} Import contacts</button><button class="btn btn-subtle" data-action="export-csv" data-kind="contacts">${icon('download', 16)} Export contacts</button></div></section>
      <section class="surface settings-section"><div><h3>Example workspace</h3><p>Try a few fictional companies, contacts, deals and tasks. Only available when the workspace is empty.</p></div><button class="btn btn-subtle" data-action="demo" ${hasRecords() ? 'disabled title="Workspace must be empty"' : ''}>Load example data</button></section>
      <section class="surface settings-section danger-zone"><div><h3>Delete local workspace</h3><p>Permanently remove all records from this browser. Export a backup first.</p></div><button class="btn btn-danger" data-action="wipe" ${hasRecords() ? '' : 'disabled'}>Erase all data</button></section>
      <p class="settings-footnote">MONO CRM · VERSION 1.0 · OFFLINE-FIRST · NO EXTERNAL DEPENDENCIES</p>`;
  }
  function hasRecords() { return ['companies', 'contacts', 'deals', 'tasks'].some(key => state.data[key].length > 0); }
  function updateNav() {
    $$('[data-nav]').forEach(button => {
      const current = button.getAttribute('data-nav') === state.view;
      button.classList.toggle('active', current);
      if (current) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    $('#sidebar').classList.toggle('is-open', state.sidebarOpen);
    $('#overlay').classList.toggle('visible', state.sidebarOpen);
  }
  function updateHeader() {
    const title = $('#pageTitle'); title.textContent = titles[state.view];
    const search = $('#search');
    search.placeholder = state.view === 'dashboard' || state.view === 'settings' ? 'Search records...' : `Search ${state.view === 'deals' ? 'deals' : state.view}...`;
    search.value = state.search;
    search.closest('.search-wrap').classList.toggle('hide-search', state.view === 'dashboard' || state.view === 'settings');
    const kind = { dashboard: 'deals', contacts: 'contacts', companies: 'companies', deals: 'deals', tasks: 'tasks', settings: '' }[state.view];
    const newButton = $('#createBtn');
    newButton.hidden = !kind;
    newButton.innerHTML = `${icon('plus', 16)} New ${kind ? singular[kind] : ''}`;
    newButton.dataset.kind = kind;
  }
  function renderContent() {
    const views = { dashboard: renderDashboard, contacts: renderContacts, companies: renderCompanies, deals: renderDeals, tasks: renderTasks, settings: renderSettings };
    $('#app').innerHTML = (views[state.view] || renderDashboard)();
  }
  function render() { updateNav(); updateHeader(); renderContent(); renderDialog(); }
  function toast(message, error = false) {
    const element = $('#toast'); element.textContent = message; element.className = `toast show ${error ? 'toast-error' : ''}`;
    clearTimeout(toast.timer); toast.timer = setTimeout(() => element.classList.remove('show'), 4500);
  }
  function commit(change, message) {
    try {
      const copy = JSON.parse(JSON.stringify(state.data));
      const result = change(copy);
      Core.save(copy);
      state.data = copy;
      render();
      if (message) toast(message);
      return result;
    } catch (error) { toast(error.message || 'Unable to save this change. Try exporting a backup.', true); return null; }
  }
  function navigate(view) {
    if (!names[view]) return;
    state.view = view; state.search = ''; state.sidebarOpen = false;
    render(); window.scrollTo(0, 0);
  }

  const field = (label, name, value, opts = {}) => `<label class="field ${opts.wide ? 'field-wide' : ''}"><span class="label">${e(label)}${opts.required ? ' *' : ''}</span>${opts.textarea
      ? `<textarea class="input textarea" name="${name}" rows="4" maxlength="5000" placeholder="${e(opts.placeholder || '')}">${e(value)}</textarea>`
      : `<input class="input" name="${name}" ${opts.required ? 'required' : ''} type="${e(opts.type || 'text')}" value="${e(value)}" placeholder="${e(opts.placeholder || '')}" ${opts.min != null ? `min="${opts.min}"` : ''} ${opts.step != null ? `step="${opts.step}"` : ''} ${opts.maxlength ? `maxlength="${opts.maxlength}"` : 'maxlength="400"'}/>`}</label>`;
  const select = (label, name, value, options, opts = {}) => `<label class="field ${opts.wide ? 'field-wide' : ''}"><span class="label">${e(label)}</span><select class="input select-field" name="${name}" ${opts.id ? `id="${e(opts.id)}"` : ''}>${options.map(([id, title]) => `<option value="${e(id)}" ${id === value ? 'selected' : ''}>${e(title)}</option>`).join('')}</select></label>`;
  function modalFields(kind, record, defaults = {}) {
    const r = { ...defaults, ...(record || {}) };
    if (kind === 'companies') return [field('Company name', 'name', r.name, { required: true }), field('Industry', 'industry', r.industry), field('Website', 'website', r.website, { placeholder: 'https://example.com' }), field('Location', 'location', r.location), field('Notes', 'notes', r.notes, { textarea: true, wide: true })].join('');
    if (kind === 'contacts') return [field('Full name', 'name', r.name, { required: true }), field('Job title', 'title', r.title), select('Company', 'companyId', r.companyId, [['', 'No company'], ...state.data.companies.map(c => [c.id, c.name])]), select('Status', 'status', r.status || 'New', Core.CONTACT_STATUSES.map(s => [s, s])), field('Email', 'email', r.email, { type: 'email' }), field('Phone', 'phone', r.phone, { type: 'tel' }), field('Tags', 'tags', r.tags, { placeholder: 'Warm, Founder, Referral', wide: true }), field('Notes', 'notes', r.notes, { textarea: true, wide: true })].join('');
    if (kind === 'deals') return [field('Opportunity name', 'title', r.title, { required: true }), field('Value', 'value', r.value ?? 0, { type: 'number', min: 0, step: 0.01 }), select('Stage', 'stage', r.stage || 'New', Core.STAGES.map(s => [s, s])), field('Expected close', 'closeDate', r.closeDate, { type: 'date' }), select('Company', 'companyId', r.companyId || '', [['', 'No company'], ...state.data.companies.map(c => [c.id, c.name])]), select('Contact', 'contactId', r.contactId || '', [['', 'No contact'], ...state.data.contacts.map(c => [c.id, c.name])]), field('Notes', 'notes', r.notes, { textarea: true, wide: true })].join('');
    if (kind === 'tasks') return [field('Task title', 'title', r.title, { required: true, wide: true }), field('Due date', 'dueDate', r.dueDate, { type: 'date' }), select('Priority', 'priority', r.priority || 'Normal', Core.PRIORITIES.map(s => [s, s])), select('Related to', 'relatedType', r.relatedType || '', [['', 'No linked record'], ['contacts', 'Contact'], ['companies', 'Company'], ['deals', 'Deal']], { id: 'relationType' }), `<label class="field"><span class="label">Record</span><select class="input select-field" name="relatedId" id="relatedId">${relatedOptions(r.relatedType || '', r.relatedId)}</select></label>`, field('Notes', 'notes', r.notes, { textarea: true, wide: true }), `<label class="field-wide checkbox-field"><input type="checkbox" name="completed" ${r.completed ? 'checked' : ''}/> Mark as completed</label>`].join('');
    return '';
  }
  function relatedOptions(kind, selected) {
    const items = (state.data[kind] || []).slice().sort((a, b) => (a.name || a.title || '').localeCompare(b.name || b.title || ''));
    return `<option value="">No record</option>${items.map(x => `<option value="${e(x.id)}" ${x.id === selected ? 'selected' : ''}>${e(x.name || x.title)}</option>`).join('')}`;
  }
  function openModal(kind, recordId = '', defaults = {}) {
    if (!singular[kind]) return;
    state.confirm = null;
    state.modal = { kind, id: recordId, defaults };
    renderDialog();
    requestAnimationFrame(() => $('#dialogRoot input:not([type=hidden]), #dialogRoot select, #dialogRoot textarea')?.focus());
  }
  function closeDialog() { state.modal = null; state.confirm = null; renderDialog(); }
  function renderDialog() {
    const root = $('#dialogRoot');
    if (state.confirm) {
      const c = state.confirm;
      root.innerHTML = `<div class="modal-backdrop" data-backdrop><section class="dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirmHeading"><div class="dialog-header"><div><div class="eyebrow">CONFIRM ACTION</div><h2 id="confirmHeading">${e(c.title)}</h2></div><button class="icon-button" data-action="close-dialog" aria-label="Close">${icon('close', 20)}</button></div><div class="dialog-body"><p>${e(c.message)}</p></div><div class="dialog-footer"><button type="button" class="btn btn-subtle" data-action="close-dialog">Cancel</button><button type="button" class="btn btn-danger" data-action="confirm">${e(c.button || 'Delete')}</button></div></section></div>`;
      return;
    }
    if (!state.modal) { root.innerHTML = ''; return; }
    const { kind, id: recordId, defaults } = state.modal;
    const record = recordId ? state.data[kind].find(item => item.id === recordId) : null;
    if (recordId && !record) { root.innerHTML = ''; state.modal = null; return; }
    const mode = record ? 'Edit' : 'New';
    const log = record ? state.data.activities.filter(a => a.entityType === kind && a.entityId === record.id).slice(0, 5) : [];
    root.innerHTML = `<div class="modal-backdrop" data-backdrop><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialogHeading"><div class="dialog-header"><div><div class="eyebrow">${e(kind.toUpperCase())} / ${record ? 'DETAILS' : 'CREATE'}</div><h2 id="dialogHeading">${mode} ${singular[kind].toLowerCase()}</h2></div><button type="button" class="icon-button" data-action="close-dialog" aria-label="Close">${icon('close', 20)}</button></div><form id="recordForm" data-kind="${kind}" data-id="${e(recordId)}"><div class="dialog-body"><div class="field-grid">${modalFields(kind, record, defaults)}</div>${log.length ? `<div class="record-history"><h4>RECENT HISTORY</h4>${log.map(a => `<div><span>${e(a.text)}</span><small>${e(relative(a.createdAt))}</small></div>`).join('')}</div>` : ''}</div><div class="dialog-footer">${record ? `<button type="button" class="delete-link" data-action="request-delete" data-kind="${kind}" data-id="${e(record.id)}">Delete</button>` : '<span></span>'}<button type="button" class="btn btn-subtle" data-action="close-dialog">Cancel</button><button type="submit" class="btn btn-primary">${record ? 'Save changes' : 'Create ' + singular[kind].toLowerCase()}</button></div></form></section></div>`;
  }
  function saveRecord(form) {
    const kind = form.dataset.kind; const recordId = form.dataset.id;
    const values = Object.fromEntries(new FormData(form).entries());
    if (kind === 'tasks') values.completed = Boolean(form.elements.completed.checked);
    if (kind === 'deals') values.value = Math.max(0, Number(values.value) || 0);
    if (kind === 'contacts' && values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) { toast('Enter a valid email address.', true); return; }
    if (kind === 'tasks' && !values.relatedType) values.relatedId = '';
    if (kind === 'tasks' && values.relatedId && !state.data[values.relatedType]?.some(row => row.id === values.relatedId)) values.relatedId = '';
    if (kind === 'contacts' && values.companyId && !company(values.companyId)) values.companyId = '';
    if (kind === 'deals') {
      if (values.companyId && !company(values.companyId)) values.companyId = '';
      if (values.contactId && !contact(values.contactId)) values.contactId = '';
    }
    const existing = Boolean(recordId);
    const result = commit(copy => Core.put(copy, kind, values, recordId), `${singular[kind]} ${existing ? 'updated' : 'created'}.`);
    if (result) closeDialog();
  }
  function requestDelete(kind, id) {
    const row = state.data[kind]?.find(x => x.id === id);
    if (!row) return;
    state.modal = null;
    state.confirm = { type: 'record', kind, id, title: `Delete ${singular[kind].toLowerCase()}?`, message: `Delete “${row.name || row.title}”? This cannot be undone. Linked records will remain, but their reference will be removed.`, button: 'Delete record' };
    renderDialog();
  }
  function confirmAction() {
    const current = state.confirm; if (!current) return;
    if (current.type === 'record') {
      commit(copy => Core.remove(copy, current.kind, current.id), `${singular[current.kind]} deleted.`);
    } else if (current.type === 'wipe') {
      commit(copy => { const reset = Core.empty(); for (const key of Object.keys(reset)) copy[key] = reset[key]; }, 'Workspace erased.');
    }
    closeDialog();
  }
  function download(name, content, mime = 'application/json;charset=utf-8') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = name;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function handleFile(input) {
    const file = input.files && input.files[0]; if (!file) return;
    input.value = '';
    try {
      if (file.size > 4 * 1024 * 1024) throw new Error('File exceeds 4 MB. Export smaller files or split your CSV.');
      const text = await file.text();
      if (input.id === 'csvFile') {
        const summary = commit(copy => Core.importContactsCsv(text, copy));
        if (summary) { navigate('contacts'); toast(`${summary.added} contacts added · ${summary.updated} updated · ${summary.companiesAdded} companies created${summary.skipped ? ` · ${summary.skipped} skipped` : ''}`); }
      } else {
        const parsed = JSON.parse(text);
        if (!parsed || parsed.version !== Core.VERSION || !Array.isArray(parsed.contacts) || !Array.isArray(parsed.companies) || !Array.isArray(parsed.deals) || !Array.isArray(parsed.tasks)) throw new Error('This is not a valid Mono CRM v1 backup.');
        const restored = Core.normalize(parsed);
        if (!window.confirm('Replace all current local records with this backup? This cannot be undone.')) return;
        Core.save(restored); state.data = restored; navigate('dashboard'); toast('Backup restored successfully.');
      }
    } catch (error) { toast(error.message || 'Unable to read file.', true); }
  }
  function action(button) {
    const type = button.dataset.action; const kind = button.dataset.kind; const id = button.dataset.id;
    switch (type) {
      case 'new': openModal(kind || ({ dashboard: 'deals' }[state.view] || state.view), '', button.dataset.stage ? { stage: button.dataset.stage } : {}); break;
      case 'edit': openModal(kind, id); break;
      case 'close-dialog': closeDialog(); break;
      case 'request-delete': requestDelete(kind, id); break;
      case 'confirm': confirmAction(); break;
      case 'toggle-task': commit(copy => { const row = copy.tasks.find(t => t.id === id); if (row) Core.put(copy, 'tasks', { completed: !row.completed }, id); }); break;
      case 'export-json': download(`mono-crm-backup-${today()}.json`, JSON.stringify(state.data, null, 2)); toast('Backup downloaded.'); break;
      case 'export-csv': download(`mono-crm-${kind}-${today()}.csv`, '\uFEFF' + Core.exportRecordsCsv(kind, state.data), 'text/csv;charset=utf-8'); toast(`${cap(kind)} exported.`); break;
      case 'import-csv': $('#csvFile').click(); break;
      case 'restore-json': $('#jsonFile').click(); break;
      case 'demo': if (!hasRecords()) { const data = Core.demo(); try { Core.save(data); state.data = data; navigate('dashboard'); toast('Example workspace loaded.'); } catch (err) { toast(err.message, true); } } break;
      case 'wipe': state.modal = null; state.confirm = { type: 'wipe', title: 'Erase all local data?', message: 'Contacts, companies, deals, tasks and activity history will be permanently removed from this browser. Download a backup first.', button: 'Erase workspace' }; renderDialog(); break;
    }
  }
  function initialize() {
    try { state.data = Core.load(); }
    catch (error) { state.storageError = error.message; state.data = Core.empty(); }
    if (state.storageError) toast('Could not load saved records: ' + state.storageError, true);
    render();
    document.addEventListener('click', event => {
      const nav = event.target.closest('[data-nav]'); if (nav) { navigate(nav.dataset.nav); return; }
      const sort = event.target.closest('[data-sort]');
      if (sort) { const old = state.sort[sort.dataset.sort]; state.sort[sort.dataset.sort] = { key: sort.dataset.key, dir: old && old.key === sort.dataset.key ? old.dir * -1 : 1 }; renderContent(); return; }
      const filter = event.target.closest('[data-filter]'); if (filter) { state.filters[filter.dataset.filter] = filter.dataset.value; renderContent(); return; }
      const button = event.target.closest('[data-action]'); if (button) { event.preventDefault(); action(button); return; }
      if (event.target.matches('[data-backdrop]')) closeDialog();
    });
    document.addEventListener('submit', event => {
      if (event.target.id === 'recordForm') { event.preventDefault(); saveRecord(event.target); }
    });
    document.addEventListener('change', event => {
      if (event.target.id === 'csvFile' || event.target.id === 'jsonFile') handleFile(event.target);
      if (event.target.id === 'currency') commit(copy => { copy.settings.currency = event.target.value; }, 'Currency updated.');
      if (event.target.id === 'relationType') { const related = $('#relatedId'); if (related) related.innerHTML = relatedOptions(event.target.value, ''); }
    });
    $('#search').addEventListener('input', event => { state.search = event.target.value; renderContent(); });
    $('#mobileMenu').addEventListener('click', () => { state.sidebarOpen = !state.sidebarOpen; updateNav(); });
    $('#overlay').addEventListener('click', () => { state.sidebarOpen = false; updateNav(); });
    document.addEventListener('keydown', event => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      if (event.key === 'Escape') { if (state.modal || state.confirm) closeDialog(); else if (typing && document.activeElement === $('#search')) { $('#search').value = ''; state.search = ''; renderContent(); document.activeElement.blur(); } else { state.sidebarOpen = false; updateNav(); } }
      if (!typing && !(state.modal || state.confirm) && (event.key === '/' || (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)))) { event.preventDefault(); if (state.view === 'dashboard' || state.view === 'settings') navigate('contacts'); $('#search').focus(); }
      if (!typing && !(state.modal || state.confirm) && event.key.toLowerCase() === 'n' && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); const kind = { dashboard: 'deals', contacts: 'contacts', companies: 'companies', deals: 'deals', tasks: 'tasks' }[state.view]; if (kind) openModal(kind); }
    });
    $('#app').addEventListener('dragstart', event => {
      const card = event.target.closest('[data-deal-id]');
      if (card && event.dataTransfer) { event.dataTransfer.setData('text/plain', card.dataset.dealId); event.dataTransfer.effectAllowed = 'move'; card.classList.add('dragging'); }
    });
    $('#app').addEventListener('dragend', () => $$('.dragging').forEach(el => el.classList.remove('dragging')));
    $('#app').addEventListener('dragover', event => { const stage = event.target.closest('[data-stage].kanban-column'); if (stage) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; stage.classList.add('drag-over'); } });
    $('#app').addEventListener('dragleave', event => { const stage = event.target.closest('[data-stage].kanban-column'); if (stage && !stage.contains(event.relatedTarget)) stage.classList.remove('drag-over'); });
    $('#app').addEventListener('drop', event => {
      const stage = event.target.closest('[data-stage].kanban-column');
      if (!stage || !event.dataTransfer) return;
      event.preventDefault(); $$('.drag-over').forEach(el => el.classList.remove('drag-over'));
      const dealId = event.dataTransfer.getData('text/plain'); const row = deal(dealId);
      if (row && row.stage !== stage.dataset.stage) commit(copy => Core.put(copy, 'deals', { stage: stage.dataset.stage }, dealId), `Deal moved to ${stage.dataset.stage}.`);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize); else initialize();
})();