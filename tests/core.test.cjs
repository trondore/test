const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/core.js');

test('new workspace has a stable v1 shape', () => {
  const w = core.empty();
  assert.equal(w.version, 1);
  assert.deepEqual([w.contacts.length, w.companies.length, w.deals.length, w.tasks.length], [0, 0, 0, 0]);
  assert.equal(w.settings.currency, 'USD');
});

test('creates, updates, logs and removes linked records', () => {
  const w = core.empty();
  const c = core.put(w, 'companies', { name: '  Example Corp  ', industry: 'SaaS' });
  const p = core.put(w, 'contacts', { name: '  Ada Lovelace ', companyId: c.id, status: 'Contacted' });
  const d = core.put(w, 'deals', { title: 'Pilot', value: 500, companyId: c.id, contactId: p.id });
  const t = core.put(w, 'tasks', { title: 'Call Ada', relatedType: 'contacts', relatedId: p.id });
  assert.equal(c.name, 'Example Corp');
  assert.equal(p.name, 'Ada Lovelace');
  assert.equal(w.activities.length, 4);
  core.put(w, 'deals', { stage: 'Won' }, d.id);
  assert.equal(w.deals[0].stage, 'Won');
  assert.ok(w.deals[0].closedAt);
  core.put(w, 'deals', { stage: 'Proposal' }, d.id);
  assert.equal(w.deals[0].closedAt, '');
  core.put(w, 'tasks', { completed: true }, t.id);
  assert.equal(w.tasks[0].completed, true);
  assert.ok(w.tasks[0].completedAt);
  core.remove(w, 'companies', c.id);
  assert.equal(w.contacts[0].companyId, '');
  assert.equal(w.deals[0].companyId, '');
  core.remove(w, 'contacts', p.id);
  assert.equal(w.deals[0].contactId, '');
  assert.equal(w.tasks[0].relatedId, '');
  assert.equal(w.tasks[0].relatedType, '');
});

test('enforces required fields and canonical enum values', () => {
  const w = core.empty();
  assert.throws(() => core.put(w, 'contacts', { name: '  ' }), /required/);
  const p = core.put(w, 'contacts', { name: 'A', status: 'Invalid' });
  assert.equal(p.status, 'New');
  const d = core.put(w, 'deals', { title: 'Value', value: -70, stage: 'Invalid' });
  assert.equal(d.value, 0);
  assert.equal(d.stage, 'New');
});

test('persist and load with injected local storage', () => {
  const bag = new Map();
  const storage = { setItem: (key, val) => bag.set(key, val), getItem: key => bag.get(key) || null };
  const w = core.empty();
  core.put(w, 'contacts', { name: 'B' });
  core.save(w, storage);
  const recovered = core.load(storage);
  assert.equal(recovered.contacts[0].name, 'B');
  assert.equal(bag.has(core.STORAGE_KEY), true);
});

test('parses quoted CSV including escaped quotes, BOM, CRLF, and embedded newlines', () => {
  const csv = '\uFEFFName,Email,Notes\r\n"Doe, Jane",jane@example.com,"Line 1\nLine 2 with ""quotes"""\r\n';
  const rows = core.parseCsv(csv);
  assert.deepEqual(rows, [['Name', 'Email', 'Notes'], ['Doe, Jane', 'jane@example.com', 'Line 1\nLine 2 with "quotes"']]);
  assert.throws(() => core.parseCsv('Name,Email\n"unclosed'), /unclosed/);
});

test('imports contacts, creates companies, and updates matching emails without duplicate', () => {
  const w = core.empty();
  const a = core.importContactsCsv('First Name,Last Name,Work Email,Company,Job Title\nAda,Lovelace,ada@example.com,Analytical,Founder\nGrace,Hopper,grace@example.com,Analytical,CTO\n', w);
  assert.deepEqual(a, { added: 2, updated: 0, companiesAdded: 1, skipped: 0 });
  assert.equal(w.contacts.length, 2);
  assert.equal(w.companies.length, 1);
  assert.equal(w.contacts[0].companyId, w.companies[0].id);
  const b = core.importContactsCsv('Name,Email,Phone\nAda L,ada@example.com,555-1000\n', w);
  assert.equal(b.added, 0);
  assert.equal(b.updated, 1);
  assert.equal(w.contacts.length, 2);
  assert.equal(w.contacts.find(x => x.email === 'ada@example.com').phone, '555-1000');
});

test('exports spreadsheet-safe CSV and retains comma-containing cells', () => {
  const w = core.empty();
  core.put(w, 'contacts', { name: '=HYPERLINK("https://example.com")', notes: 'hello, world' });
  const csv = core.exportRecordsCsv('contacts', w);
  assert.match(csv, /^Name,Title,Company,Email/);
  assert.match(csv, /^"'=HYPERLINK/mi);
  assert.ok(csv.includes('"hello, world"'));
  assert.equal(core.parseCsv(csv)[1][0], "'=HYPERLINK(\"https://example.com\")");
});

test('computes active pipeline and tasks due correctly', () => {
  const w = core.empty();
  core.put(w, 'deals', { title: 'New', value: 100, stage: 'Qualified' });
  core.put(w, 'deals', { title: 'Lost', value: 120, stage: 'Lost' });
  core.put(w, 'tasks', { title: 'Due', dueDate: '2026-10-20' });
  core.put(w, 'tasks', { title: 'Future', dueDate: '2026-10-25' });
  const x = core.metrics(w, '2026-10-21');
  assert.equal(x.openPipeline, 100);
  assert.equal(x.openDeals, 1);
  assert.equal(x.dueTasks, 1);
});

test('demo workspace is opt-in and has a complete useful shape', () => {
  const w = core.demo();
  assert.equal(w.companies.length, 2);
  assert.equal(w.contacts.length, 2);
  assert.equal(w.deals.length, 2);
  assert.equal(w.tasks.length, 2);
  assert.equal(w.version, core.VERSION);
});

test('normalization rejects invalid structures', () => {
  assert.throws(() => core.normalize(null));
  assert.throws(() => core.normalize({ contacts: 'invalid' }), /contacts/);
  const w = core.normalize({ contacts: [{ name: 'Minimal' }], settings: { currency: 'XYZ' } });
  assert.equal(w.contacts[0].status, 'New');
  assert.equal(w.settings.currency, 'USD');
});