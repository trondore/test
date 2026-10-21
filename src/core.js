/* Mono CRM — data model and portable CSV helpers. No external dependencies. */
(function (root, factory) {
  const core = factory();
  if (typeof module === 'object' && module.exports) module.exports = core;
  root.MonoCore = core;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'mono.crm.workspace.v1';
  const VERSION = 1;
  const STAGES = ['New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];
  const CONTACT_STATUSES = ['New', 'Contacted', 'Qualified', 'Customer', 'Inactive'];
  const PRIORITIES = ['Low', 'Normal', 'High'];
  const CURRENCIES = ['USD', 'EUR', 'GBP'];

  const now = () => new Date().toISOString();
  const id = () => (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
  const str = (value, max = 5000) => (value == null ? '' : String(value)).trim().slice(0, max);
  const safeDate = (value) => { const v = str(value); if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return ''; const d = new Date(v + 'T12:00:00Z'); return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === v ? v : ''; };
  const enumValue = (value, values, fallback) => values.includes(value) ? value : fallback;
  const stamp = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : now();
  const empty = () => ({ version: VERSION, companies: [], contacts: [], deals: [], tasks: [], activities: [], settings: { currency: 'USD' } });

  function sanitizeRecord(kind, item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const base = {
      id: str(item.id, 120) || id(),
      createdAt: stamp(item.createdAt),
      updatedAt: stamp(item.updatedAt)
    };
    switch (kind) {
      case 'companies':
        return { ...base, name: str(item.name, 160), industry: str(item.industry, 120), website: str(item.website, 400), location: str(item.location, 160), notes: str(item.notes) };
      case 'contacts':
        return { ...base, name: str(item.name, 160), title: str(item.title, 160), email: str(item.email, 260), phone: str(item.phone, 80), companyId: str(item.companyId, 120), status: enumValue(item.status, CONTACT_STATUSES, 'New'), tags: str(item.tags, 300), notes: str(item.notes) };
      case 'deals':
        return { ...base, title: str(item.title, 180), value: Math.max(0, Math.min(1e12, Number(item.value) || 0)), companyId: str(item.companyId, 120), contactId: str(item.contactId, 120), stage: enumValue(item.stage, STAGES, 'New'), closeDate: safeDate(item.closeDate), notes: str(item.notes), closedAt: item.closedAt ? stamp(item.closedAt) : '' };
      case 'tasks':
        return { ...base, title: str(item.title, 220), dueDate: safeDate(item.dueDate), priority: enumValue(item.priority, PRIORITIES, 'Normal'), relatedType: enumValue(item.relatedType, ['contacts', 'companies', 'deals', ''], ''), relatedId: str(item.relatedId, 120), notes: str(item.notes), completed: Boolean(item.completed), completedAt: item.completedAt ? stamp(item.completedAt) : '' };
      case 'activities':
        return { id: base.id, createdAt: base.createdAt, entityType: enumValue(item.entityType, ['contacts', 'companies', 'deals', 'tasks'], 'contacts'), entityId: str(item.entityId, 120), text: str(item.text, 320) };
      default: return null;
    }
  }

  function normalize(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid workspace file.');
    const result = empty();
    for (const kind of ['companies', 'contacts', 'deals', 'tasks', 'activities']) {
      if (input[kind] != null && !Array.isArray(input[kind])) throw new Error('Invalid ' + kind + ' data.');
      const seen = new Set();
      result[kind] = (input[kind] || []).slice(0, 50000).map(item => sanitizeRecord(kind, item)).filter(item => {
        if (!item || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    }
    result.settings.currency = enumValue(input.settings && input.settings.currency, CURRENCIES, 'USD');
    return result;
  }

  function load(storage) {
    const backend = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!backend) return empty();
    const raw = backend.getItem(STORAGE_KEY);
    if (!raw) return empty();
    return normalize(JSON.parse(raw));
  }
  function save(data, storage) {
    const backend = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!backend) throw new Error('Local storage is unavailable. Try opening this app through localhost.');
    backend.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  function activity(data, entityType, entityId, text) {
    data.activities.unshift({ id: id(), entityType, entityId, text: str(text, 320), createdAt: now() });
    if (data.activities.length > 1000) data.activities.length = 1000;
  }
  function put(data, kind, values, recordId) {
    if (!['companies', 'contacts', 'deals', 'tasks'].includes(kind)) throw new Error('Unknown record type.');
    const prev = recordId ? data[kind].find(row => row.id === recordId) : null;
    if (recordId && !prev) throw new Error('Record no longer exists.');
    const timestamp = now();
    const candidate = sanitizeRecord(kind, { ...prev, ...values, id: prev ? prev.id : id(), createdAt: prev ? prev.createdAt : timestamp, updatedAt: timestamp });
    if (kind === 'companies' && !candidate.name) throw new Error('Company name is required.');
    if (kind === 'contacts' && !candidate.name) throw new Error('Contact name is required.');
    if (kind === 'deals' && !candidate.title) throw new Error('Deal title is required.');
    if (kind === 'tasks' && !candidate.title) throw new Error('Task title is required.');
    if (kind === 'deals' && (candidate.stage === 'Won' || candidate.stage === 'Lost')) {
      candidate.closedAt = prev && prev.closedAt && prev.stage === candidate.stage ? prev.closedAt : timestamp;
    } else if (kind === 'deals') candidate.closedAt = '';
    if (kind === 'tasks') candidate.completedAt = candidate.completed ? (prev && prev.completedAt ? prev.completedAt : timestamp) : '';
    if (prev) data[kind][data[kind].indexOf(prev)] = candidate;
    else data[kind].unshift(candidate);
    const label = kind === 'companies' || kind === 'contacts' ? candidate.name : candidate.title;
    activity(data, kind, candidate.id, (prev ? 'Updated ' : 'Created ') + label);
    if (prev && kind === 'deals' && prev.stage !== candidate.stage) activity(data, kind, candidate.id, 'Moved ' + candidate.title + ' to ' + candidate.stage);
    if (prev && kind === 'tasks' && prev.completed !== candidate.completed) activity(data, kind, candidate.id, (candidate.completed ? 'Completed ' : 'Reopened ') + candidate.title);
    return candidate;
  }
  function remove(data, kind, recordId) {
    if (!['companies', 'contacts', 'deals', 'tasks'].includes(kind)) return false;
    const record = data[kind].find(row => row.id === recordId);
    if (!record) return false;
    data[kind] = data[kind].filter(row => row.id !== recordId);
    if (kind === 'companies') {
      data.contacts.forEach(row => { if (row.companyId === recordId) row.companyId = ''; });
      data.deals.forEach(row => { if (row.companyId === recordId) row.companyId = ''; });
    }
    if (kind === 'contacts') data.deals.forEach(row => { if (row.contactId === recordId) row.contactId = ''; });
    data.tasks.forEach(row => { if (row.relatedType === kind && row.relatedId === recordId) { row.relatedType = ''; row.relatedId = ''; } });
    data.activities = data.activities.filter(row => !(row.entityType === kind && row.entityId === recordId));
    return true;
  }

  // RFC-4180-style parsing: comma delimiters, quoted fields, escaped double quotes, CRLF and embedded newlines.
  function parseCsv(text) {
    const src = String(text || '').replace(/^\uFEFF/, '');
    const rows = []; let row = [], value = '', quoted = false;
    for (let i = 0; i < src.length; i++) {
      const char = src[i];
      if (quoted) {
        if (char === '"' && src[i + 1] === '"') { value += '"'; i++; }
        else if (char === '"') quoted = false;
        else value += char;
      } else if (char === '"' && value === '') quoted = true;
      else if (char === ',') { row.push(value); value = ''; }
      else if (char === '\n' || char === '\r') {
        if (char === '\r' && src[i + 1] === '\n') i++;
        row.push(value); value = '';
        if (row.some(cell => cell !== '')) rows.push(row);
        row = [];
      } else value += char;
    }
    if (quoted) throw new Error('CSV contains an unclosed quoted field.');
    row.push(value);
    if (row.some(cell => cell !== '')) rows.push(row);
    return rows;
  }
  function csvCell(value) {
    let cell = String(value == null ? '' : value);
    // Prevent spreadsheet formula execution when opened in Excel/Sheets.
    if (/^[\s]*[=+\-@\t\r]/.test(cell)) cell = "'" + cell;
    return /[",\r\n]/.test(cell) ? '"' + cell.replace(/"/g, '""') + '"' : cell;
  }
  function makeCsv(headers, rows) { return [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'; }

  function importContactsCsv(csv, data) {
    const rows = parseCsv(csv);
    if (rows.length < 2) throw new Error('CSV needs a header row and at least one contact.');
    const header = rows[0].map(v => v.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const lookup = (...options) => {
      const index = header.findIndex(v => options.includes(v));
      return index;
    };
    const col = {
      name: lookup('name', 'fullname', 'contactname'), first: lookup('firstname', 'first'), last: lookup('lastname', 'last'),
      email: lookup('email', 'emailaddress', 'workemail'), phone: lookup('phone', 'phonenumber', 'mobile', 'telephone'),
      title: lookup('title', 'jobtitle', 'position'), company: lookup('company', 'companyname', 'organization', 'organisation', 'account'),
      status: lookup('status', 'leadstatus'), tags: lookup('tags', 'tag'), notes: lookup('notes', 'description')
    };
    if (col.name === -1 && col.first === -1 && col.email === -1) throw new Error('CSV requires Name, First Name, or Email column.');
    let added = 0, updated = 0, companiesAdded = 0, skipped = 0;
    const existing = new Map(data.contacts.filter(c => c.email).map(c => [c.email.toLowerCase(), c]));
    const companies = new Map(data.companies.map(c => [c.name.toLowerCase(), c]));
    const read = (row, index) => index === -1 ? '' : str(row[index]);
    for (const row of rows.slice(1, 20001)) {
      const email = read(row, col.email);
      const name = read(row, col.name) || [read(row, col.first), read(row, col.last)].filter(Boolean).join(' ') || email;
      if (!name) { skipped++; continue; }
      let companyId = '';
      const companyName = read(row, col.company);
      if (companyName) {
        let company = companies.get(companyName.toLowerCase());
        if (!company) {
          company = put(data, 'companies', { name: companyName });
          companies.set(companyName.toLowerCase(), company);
          companiesAdded++;
        }
        companyId = company.id;
      }
      const previous = email ? existing.get(email.toLowerCase()) : undefined;
      const importedName = read(row, col.name) || [read(row, col.first), read(row, col.last)].filter(Boolean).join(' ');
      const values = { name: importedName || previous?.name || name, email: email || previous?.email || '',
        phone: read(row, col.phone) || previous?.phone || '', title: read(row, col.title) || previous?.title || '',
        status: enumValue(read(row, col.status), CONTACT_STATUSES, previous ? previous.status : 'New'),
        tags: read(row, col.tags) || previous?.tags || '', notes: read(row, col.notes) || previous?.notes || '',
        companyId: companyId || previous?.companyId || '' };
      const result = put(data, 'contacts', values, previous && previous.id);
      if (previous) updated++; else added++;
      if (email) existing.set(email.toLowerCase(), result);
    }
    return { added, updated, companiesAdded, skipped };
  }

  function exportRecordsCsv(kind, data) {
    const companyName = (companyId) => data.companies.find(c => c.id === companyId)?.name || '';
    if (kind === 'contacts') return makeCsv(['Name', 'Title', 'Company', 'Email', 'Phone', 'Status', 'Tags', 'Notes'], data.contacts.map(c => [c.name, c.title, companyName(c.companyId), c.email, c.phone, c.status, c.tags, c.notes]));
    if (kind === 'companies') return makeCsv(['Name', 'Industry', 'Website', 'Location', 'Notes'], data.companies.map(c => [c.name, c.industry, c.website, c.location, c.notes]));
    if (kind === 'deals') return makeCsv(['Deal', 'Value', 'Stage', 'Company', 'Contact', 'Expected close', 'Notes'], data.deals.map(d => [d.title, d.value, d.stage, companyName(d.companyId), data.contacts.find(c => c.id === d.contactId)?.name || '', d.closeDate, d.notes]));
    if (kind === 'tasks') return makeCsv(['Task', 'Due date', 'Priority', 'Completed', 'Notes'], data.tasks.map(t => [t.title, t.dueDate, t.priority, t.completed ? 'Yes' : 'No', t.notes]));
    throw new Error('Unknown CSV export.');
  }
  function metrics(data, today = new Date().toISOString().slice(0, 10)) {
    const activeDeals = data.deals.filter(d => !['Won', 'Lost'].includes(d.stage));
    const openTasks = data.tasks.filter(t => !t.completed);
    const firstOfMonth = today.slice(0, 7) + '-01';
    return {
      openPipeline: activeDeals.reduce((sum, d) => sum + d.value, 0),
      openDeals: activeDeals.length,
      dueTasks: openTasks.filter(t => t.dueDate && t.dueDate <= today).length,
      wonThisMonth: data.deals.filter(d => d.stage === 'Won' && d.closedAt && d.closedAt.slice(0, 10) >= firstOfMonth && d.closedAt.slice(0, 10) <= today).reduce((sum, d) => sum + d.value, 0)
    };
  }

  function demo() {
    const data = empty();
    const companyA = put(data, 'companies', { name: 'Northstar Labs', industry: 'Software', location: 'Austin, TX', website: 'https://example.com' });
    const companyB = put(data, 'companies', { name: 'Meridian Systems', industry: 'Technology', location: 'New York, NY' });
    const contactA = put(data, 'contacts', { name: 'Alex Morgan', title: 'Head of Operations', companyId: companyA.id, email: 'alex@example.com', status: 'Qualified', tags: 'Inbound' });
    put(data, 'contacts', { name: 'Jordan Lee', title: 'Managing Director', companyId: companyB.id, email: 'jordan@example.com', status: 'Contacted' });
    put(data, 'deals', { title: 'Northstar pilot', value: 2500, companyId: companyA.id, contactId: contactA.id, stage: 'Proposal' });
    put(data, 'deals', { title: 'Meridian subscription', value: 1200, companyId: companyB.id, stage: 'Qualified' });
    const today = new Date().toISOString().slice(0, 10);
    put(data, 'tasks', { title: 'Follow up with Alex', relatedType: 'contacts', relatedId: contactA.id, dueDate: today, priority: 'High' });
    put(data, 'tasks', { title: 'Send product overview', relatedType: 'deals', relatedId: data.deals[1].id, priority: 'Normal' });
    return data;
  }

  return { STORAGE_KEY, VERSION, STAGES, CONTACT_STATUSES, PRIORITIES, CURRENCIES, empty, normalize, load, save, activity, put, remove, parseCsv, makeCsv, importContactsCsv, exportRecordsCsv, metrics, demo, id, safeDate, str };
});