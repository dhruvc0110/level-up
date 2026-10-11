// Level Up — Career profile: a living knowledge graph of Dhruv's career.
//
// Stored in DOC.career (the Drive data file):
//   person        contact basics + headline
//   summaries     professional summaries (tagged by persona)
//   roles         company, title, dates, scope (P&L, budget, team, geography)
//   achievements  one per bullet: text, metrics, skills, themes, personas → roleId
//   education / boards / publications / credentials
//   sources       every file imported (kept in Drive: Level Up/Sources)
// Every fact carries `sources` (ids it came from), `confirmedAt` (freshness)
// and achievements carry `usedIn` (documents that used them, later phases).
//
// Import = read file → Claude extracts → compare with the graph → the user
// reviews new / known / conflicting facts → only accepted facts are applied.
(function () {
  const STALE_DAYS = 365;
  const core = () => window.LU_CORE;
  const C = () => core().doc().career;
  const uid = (p) => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const now = () => core().nowIso();

  // ── Text helpers ────────────────────────────────────────────────────────
  const norm = (s) => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const normCo = (s) => norm(s).replace(/\b(the|inc|llc|ltd|plc|corp|corporation|co|company|group|holdings|limited)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const STOP = new Set('a an the and or of to for in on at by with from as is was were be been our my their its into over across per via led lead leading'.split(' '));
  const tokens = (s) => new Set(norm(s).split(' ').filter((w) => w && !STOP.has(w)));
  function similarity(a, b) {
    const A = tokens(a), B = tokens(b);
    if (!A.size || !B.size) return 0;
    let inter = 0; A.forEach((w) => { if (B.has(w)) inter++; });
    return inter / (A.size + B.size - inter);
  }
  const year = (d) => { const m = String(d || '').match(/(19|20)\d\d/); return m ? +m[0] : null; };
  // Same value, allowing abbreviations ("CIO" = "Chief Information Officer", "VP" = "Vice President").
  const initials = (s) => norm(s).split(' ').filter((w) => w && !['of', 'and', 'the', 'for'].includes(w)).map((w) => w[0]).join('');
  const ABBR = { vp: 'vice president', svp: 'senior vice president', evp: 'executive vice president', md: 'managing director', gm: 'general manager', sr: 'senior', dir: 'director' };
  const expand = (s) => norm(s).split(' ').map((w) => ABBR[w] || w).join(' ');
  const same = (a, b) => {
    if (norm(a) === norm(b) || expand(a) === expand(b)) return true;
    // "2019" vs "2019-03": the less precise date agrees with the more precise one.
    if (/^\d{4}$/.test(String(a).trim()) && String(b).trim().startsWith(String(a).trim())) return true;
    if (/^\d{4}$/.test(String(b).trim()) && String(a).trim().startsWith(String(b).trim())) return true;
    const A = norm(a).replace(/ /g, ''), B = norm(b).replace(/ /g, '');
    return (A.length <= 5 && A === initials(b)) || (B.length <= 5 && B === initials(a));
  };
  const blank = (v) => v == null || String(v).trim() === '';

  // ── Reading files ───────────────────────────────────────────────────────
  let mammothLoading = null;
  function loadMammoth() {
    if (window.mammoth) return Promise.resolve(window.mammoth);
    if (!mammothLoading) {
      mammothLoading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js';
        s.integrity = 'sha384-/cXAMbzovUIKbBERjPmR3SnPTh8siWr5lsvFYj1Uq4XP0yaJUZJmsh0YXyGv5P0y';
        s.crossOrigin = 'anonymous';
        s.onload = () => resolve(window.mammoth);
        s.onerror = () => { mammothLoading = null; reject(new Error('Could not load the Word reader. Check your connection and try again.')); };
        document.head.appendChild(s);
      });
    }
    return mammothLoading;
  }
  const toBase64 = (buf) => {
    let bin = ''; const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  async function readFile(file) {
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.pdf') || file.type === 'application/pdf') {
      if (file.size > 20 * 1024 * 1024) throw new Error('That PDF is over 20 MB. Save a smaller copy and try again.');
      return { pdf: toBase64(await file.arrayBuffer()) };
    }
    if (name.endsWith('.docx')) {
      const m = await loadMammoth();
      const r = await m.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return { text: r.value };
    }
    if (name.endsWith('.doc')) throw new Error('Old .doc files can’t be read. In Word, use File → Save As → Word Document (.docx) or PDF.');
    return { text: await file.text() };
  }

  // ── Extraction ──────────────────────────────────────────────────────────
  function extractPrompt(kind) {
    const doc = core().doc();
    const personas = (doc.personas || []).map((p) => `- ${p.id}: ${p.name}`).join('\n');
    const themes = [...new Set(C().achievements.flatMap((a) => a.themes || []))].slice(0, 60).join(', ');
    const skills = [...new Set(C().achievements.flatMap((a) => a.skills || []))].slice(0, 60).join(', ');
    return `You extract a senior executive's career facts from ${kind === 'linkedin' ? 'their LinkedIn profile (PDF export)' : 'one of their resumes'} into structured data for a career knowledge base.

Their career personas:
${personas || '- (none yet)'}

Rules:
- Faithful extraction only. Never invent, embellish or infer facts, numbers, dates or employers. Keep numbers exactly as written ("$480M", "1,200 people").
- One achievement per bullet/claim. Keep the wording close to the source; you may tidy grammar.
- metrics: only numbers stated in that achievement.
- themes: 1-3 short business themes per achievement (2-4 words, lowercase, e.g. "erp modernization", "cost reduction", "m&a integration"). Reuse these existing themes when they fit: ${themes || '(none yet)'}.
- skills: 1-4 capabilities shown (e.g. "Vendor governance", "Board reporting"). Reuse existing when they fit: ${skills || '(none yet)'}.
- personas: ids of the personas each achievement best supports (0-3).
- Dates as "YYYY-MM" or "YYYY"; a current role ends "present".
- Scope fields only if stated (pnl, budget, team, geography), as short strings.

Output a SINGLE JSON object, no prose around it:
{
  "person": { "name": null, "headline": null, "location": null, "email": null, "phone": null, "linkedin": null, "website": null },
  "summary": "professional summary text, or null",
  "roles": [ { "company": "", "title": "", "start": "", "end": "", "location": null,
      "scope": { "pnl": null, "budget": null, "team": null, "geography": null }, "summary": null,
      "achievements": [ { "text": "", "metrics": [ { "label": "", "value": "" } ], "skills": [], "themes": [], "personas": [] } ] } ],
  "education": [ { "school": "", "degree": null, "field": null, "year": null } ],
  "boards": [ { "org": "", "role": null, "start": null, "end": null } ],
  "publications": [ { "title": "", "venue": null, "year": null, "url": null } ],
  "credentials": [ { "name": "", "issuer": null, "year": null } ]
}`;
  }

  async function extract(file, kind) {
    const read = await readFile(file);
    const content = read.pdf
      ? [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: read.pdf } }, { type: 'text', text: 'Extract the career facts from this document.' }]
      : [{ type: 'text', text: 'DOCUMENT TEXT:\n' + String(read.text || '').slice(0, 60000) + '\n\nExtract the career facts from this document.' }];
    if (!read.pdf && !String(read.text || '').trim()) throw new Error('That file has no readable text.');
    const resp = await core().claude(core().models.parse, extractPrompt(kind), content, 16000);
    const texts = (resp.content || []).filter((b) => b.type === 'text');
    const raw = texts.length ? texts[texts.length - 1].text : '{}';
    try { return core().extractJson(raw); }
    catch (e) { throw new Error(resp.stop_reason === 'max_tokens' ? 'The document is too long to read in one go. Try splitting it.' : 'Claude’s reply could not be read. Please try again.'); }
  }

  // ── Compare with the graph → proposal ───────────────────────────────────
  function findRole(r) {
    const co = normCo(r.company);
    if (!co) return null;
    const candidates = C().roles.filter((x) => normCo(x.company) === co);
    let best = null, bestScore = 0;
    candidates.forEach((x) => {
      let score = similarity(x.title, r.title);
      const ys = year(x.start), yr = year(r.start);
      if (ys && yr && Math.abs(ys - yr) <= 1) score += 0.5;
      if (score > bestScore) { bestScore = score; best = x; }
    });
    return bestScore >= 0.5 ? best : null;
  }
  function fieldChanges(existing, incoming, fields) {
    const out = [];
    fields.forEach(([key, label]) => {
      const get = (o) => key.split('.').reduce((v, k) => (v == null ? v : v[k]), o);
      const a = get(existing), b = get(incoming);
      if (blank(b)) return;
      // A shorter version of the same place ("Dallas" vs "Dallas, TX") isn't a conflict.
      const placeMatch = /location|geography/.test(key) && (norm(a).startsWith(norm(b)) || norm(b).startsWith(norm(a)));
      if (blank(a)) out.push({ key, label, from: null, to: b, kind: 'fill', accept: true });
      else if (!same(a, b) && !placeMatch) out.push({ key, label, from: a, to: b, kind: 'conflict', choice: 'keep' });
    });
    return out;
  }
  const ROLE_FIELDS = [['title', 'Title'], ['start', 'Start'], ['end', 'End'], ['location', 'Location'], ['scope.pnl', 'P&L'],
    ['scope.budget', 'Budget'], ['scope.team', 'Team'], ['scope.geography', 'Geography'], ['summary', 'Role summary']];
  const PERSON_FIELDS = [['name', 'Name'], ['headline', 'Headline'], ['location', 'Location'], ['email', 'Email'], ['phone', 'Phone'], ['linkedin', 'LinkedIn'], ['website', 'Website']];

  function matchAchievement(text, roleId) {
    const pool = C().achievements.filter((a) => !roleId || a.roleId === roleId);
    let best = null, bestScore = 0;
    pool.forEach((a) => { const s = similarity(a.text, text); if (s > bestScore) { bestScore = s; best = a; } });
    if (bestScore >= 0.6) return { status: 'known', existing: best };
    if (bestScore >= 0.38) return { status: 'similar', existing: best };
    return { status: 'new', existing: null };
  }
  const cleanAch = (a) => ({
    text: String(a.text || '').trim(),
    metrics: (Array.isArray(a.metrics) ? a.metrics : []).filter((m) => m && m.value).map((m) => ({ label: String(m.label || ''), value: String(m.value) })),
    skills: (Array.isArray(a.skills) ? a.skills : []).map(String).filter(Boolean).slice(0, 6),
    themes: (Array.isArray(a.themes) ? a.themes : []).map((t) => String(t).toLowerCase()).filter(Boolean).slice(0, 4),
    personas: (Array.isArray(a.personas) ? a.personas : []).map(String).filter((id) => (core().doc().personas || []).some((p) => p.id === id)),
  });

  function listProposal(kind, items, keyFn) {
    return (Array.isArray(items) ? items : []).filter((x) => x && !blank(keyFn(x))).map((x) => {
      const existing = C()[kind].find((e) => norm(keyFn(e)) === norm(keyFn(x)));
      return { status: existing ? 'known' : 'new', data: x, existingId: existing && existing.id, accept: !existing };
    });
  }

  function buildProposal(extracted, source) {
    const e = extracted || {};
    const proposal = {
      source,
      person: fieldChanges(C().person || {}, e.person || {}, PERSON_FIELDS),
      summary: null,
      roles: [],
      lists: {
        education: listProposal('education', e.education, (x) => x.school + ' ' + (x.degree || '')),
        boards: listProposal('boards', e.boards, (x) => x.org),
        publications: listProposal('publications', e.publications, (x) => x.title),
        credentials: listProposal('credentials', e.credentials, (x) => x.name),
      },
    };
    if (!blank(e.summary)) {
      const known = C().summaries.some((s) => similarity(s.text, e.summary) >= 0.6);
      proposal.summary = { text: String(e.summary).trim(), status: known ? 'known' : 'new', accept: !known };
    }
    (Array.isArray(e.roles) ? e.roles : []).forEach((r) => {
      if (!r || blank(r.company)) return;
      const existing = findRole(r);
      const role = {
        status: existing ? 'match' : 'new', existingId: existing && existing.id, accept: true,
        data: { company: String(r.company).trim(), title: String(r.title || '').trim(), start: r.start || null, end: r.end || null,
          location: r.location || null, scope: Object.assign({ pnl: null, budget: null, team: null, geography: null }, r.scope || {}), summary: r.summary || null },
        changes: existing ? fieldChanges(existing, r, ROLE_FIELDS) : [],
        achievements: [],
      };
      (Array.isArray(r.achievements) ? r.achievements : []).forEach((a) => {
        const ach = cleanAch(a);
        if (!ach.text) return;
        const m = existing ? matchAchievement(ach.text, existing.id) : { status: 'new', existing: null };
        role.achievements.push({ status: m.status, existingId: m.existing && m.existing.id, existingText: m.existing && m.existing.text, data: ach, accept: m.status !== 'known', mode: m.status === 'similar' ? 'add' : null });
      });
      proposal.roles.push(role);
    });
    return proposal;
  }

  function proposalCounts(p) {
    const c = { new: 0, known: 0, updates: 0, conflicts: 0 };
    p.person.forEach((x) => (x.kind === 'conflict' ? c.conflicts++ : c.updates++));
    if (p.summary) c[p.summary.status === 'known' ? 'known' : 'new']++;
    p.roles.forEach((r) => {
      if (r.status === 'new') c.new++;
      r.changes.forEach((x) => (x.kind === 'conflict' ? c.conflicts++ : c.updates++));
      r.achievements.forEach((a) => (a.status === 'known' ? c.known++ : c.new++));
    });
    Object.values(p.lists).forEach((l) => l.forEach((x) => (x.status === 'known' ? c.known++ : c.new++)));
    return c;
  }

  // ── Apply an accepted proposal ──────────────────────────────────────────
  function setPath(o, key, v) { const ks = key.split('.'); let t = o; ks.slice(0, -1).forEach((k) => { t[k] = t[k] || {}; t = t[k]; }); t[ks[ks.length - 1]] = v; }
  const addSrc = (fact, sid) => { fact.sources = [...new Set([...(fact.sources || []), sid])]; };
  function applyChanges(target, changes, sid) {
    changes.forEach((x) => {
      if ((x.kind === 'fill' && x.accept) || (x.kind === 'conflict' && x.choice === 'new')) setPath(target, x.key, x.to);
      if (x.kind === 'conflict' && x.choice === 'later') {
        C().conflicts.push({ id: uid('cf'), entity: target === C().person ? 'person' : 'role', entityId: target.id || null, key: x.key, label: x.label, current: x.from, proposed: x.to, sourceId: sid, createdAt: now() });
      }
    });
  }

  function applyProposal(p) {
    const c = C(), t = now();
    const src = Object.assign({ id: uid('src') }, p.source, { importedAt: t });
    const counts = { added: 0, confirmed: 0, updated: 0 };
    applyChanges(c.person, p.person, src.id);
    counts.updated += p.person.filter((x) => (x.kind === 'fill' && x.accept) || x.choice === 'new').length;
    if (p.summary && p.summary.accept && p.summary.status === 'new') {
      c.summaries.push({ id: uid('sum'), text: p.summary.text, personas: [], sources: [src.id], confirmedAt: t, updatedAt: t });
      counts.added++;
    }
    p.roles.forEach((r) => {
      let role;
      if (r.status === 'new') {
        if (!r.accept) return;
        role = Object.assign({ id: uid('role') }, r.data, { sources: [src.id], confirmedAt: t, updatedAt: t });
        c.roles.push(role); counts.added++;
      } else {
        role = c.roles.find((x) => x.id === r.existingId);
        if (!role) return;
        applyChanges(role, r.changes, src.id);
        counts.updated += r.changes.filter((x) => (x.kind === 'fill' && x.accept) || x.choice === 'new').length;
        addSrc(role, src.id); role.confirmedAt = t; role.updatedAt = t;
      }
      r.achievements.forEach((a) => {
        if (a.status === 'known' || (a.status === 'similar' && a.mode === 'same')) {
          const ex = c.achievements.find((x) => x.id === a.existingId);
          if (ex) {
            addSrc(ex, src.id); ex.confirmedAt = t;
            ['skills', 'themes', 'personas'].forEach((k) => { ex[k] = [...new Set([...(ex[k] || []), ...(a.data[k] || [])])]; });
            if (!(ex.metrics || []).length && a.data.metrics.length) ex.metrics = a.data.metrics;
            counts.confirmed++;
          }
          return;
        }
        if (!a.accept) return;
        c.achievements.push(Object.assign({ id: uid('ach'), roleId: role.id }, a.data, { sources: [src.id], confirmedAt: t, updatedAt: t, usedIn: [] }));
        counts.added++;
      });
    });
    Object.entries(p.lists).forEach(([kind, items]) => items.forEach((x) => {
      if (x.status === 'known') { const ex = c[kind].find((e) => e.id === x.existingId); if (ex) { addSrc(ex, src.id); ex.confirmedAt = t; counts.confirmed++; } return; }
      if (!x.accept) return;
      c[kind].push(Object.assign({ id: uid(kind.slice(0, 3)) }, x.data, { sources: [src.id], confirmedAt: t, updatedAt: t }));
      counts.added++;
    }));
    src.facts = counts.added + counts.confirmed + counts.updated;
    c.sources.unshift(src);
    core().markDirty();
    window.dispatchEvent(new CustomEvent('lu:career-changed'));
    return counts;
  }

  // Same achievement in different words ("turned around a failing WMS rollout" =
  // "rescued a stalled warehouse-management program"): one quick Claude check per
  // import, only for new items in roles you already have. Suggests a merge; you decide.
  async function markRewordedDuplicates(p) {
    const pairs = [];
    p.roles.forEach((r, ri) => {
      if (r.status !== 'match') return;
      const existing = C().achievements.filter((a) => a.roleId === r.existingId);
      r.achievements.forEach((a, ai) => { if (a.status === 'new' && existing.length) pairs.push({ ri, ai, text: a.data.text, existing }); });
    });
    if (!pairs.length) return p;
    const list = pairs.map((x, i) => `NEW ${i}: ${x.text}\n` + x.existing.map((e) => `  EXISTING ${e.id}: ${e.text}`).join('\n')).join('\n\n');
    try {
      const resp = await core().claude(core().models.quick, 'You compare career achievements. Two statements are the SAME only if they describe the same accomplishment (same project or result), even if worded differently or with different detail. Output a single JSON object {"same": [{"new": <index>, "existing": "<id>"}]} and nothing else.', list, 1200);
      const texts = (resp.content || []).filter((b) => b.type === 'text');
      const d = core().extractJson(texts.length ? texts[texts.length - 1].text : '{}');
      (Array.isArray(d.same) ? d.same : []).forEach((m) => {
        const x = pairs[+m.new];
        const ex = x && x.existing.find((e) => e.id === m.existing);
        if (!ex) return;
        Object.assign(p.roles[x.ri].achievements[x.ai], { status: 'similar', existingId: ex.id, existingText: ex.text, mode: 'same', accept: true });
      });
    } catch (e) { /* best effort: items stay "new" and you can still untick them */ }
    return p;
  }

  // ── Import entry point (read → upload original → extract → propose) ────
  async function importFile(file, kind) {
    const [extracted, stored] = await Promise.all([
      extract(file, kind),
      core().uploadToDriveFolder(file, 'Sources').catch(() => ({ id: null, url: null })),
    ]);
    return markRewordedDuplicates(buildProposal(extracted, { kind, name: file.name, driveId: stored.id, driveUrl: stored.url }));
  }

  // ── Editing ─────────────────────────────────────────────────────────────
  const listOf = (kind) => C()[kind];
  function update(kind, id, patch) {
    const item = listOf(kind).find((x) => x.id === id);
    if (!item) return null;
    Object.assign(item, patch, { updatedAt: now(), confirmedAt: now() });
    core().markDirty(); window.dispatchEvent(new CustomEvent('lu:career-changed'));
    return item;
  }
  function add(kind, data) {
    const item = Object.assign({ id: uid(kind.slice(0, 3)), sources: ['manual'], confirmedAt: now(), updatedAt: now() }, kind === 'achievements' ? { metrics: [], skills: [], themes: [], personas: [], usedIn: [] } : {}, data);
    listOf(kind).push(item);
    core().markDirty(); window.dispatchEvent(new CustomEvent('lu:career-changed'));
    return item;
  }
  function remove(kind, id) {
    const c = C();
    c[kind] = c[kind].filter((x) => x.id !== id);
    if (kind === 'roles') c.achievements = c.achievements.filter((a) => a.roleId !== id);
    core().markDirty(); window.dispatchEvent(new CustomEvent('lu:career-changed'));
  }
  function confirm(kind, id) { return update(kind, id, {}); }
  function setPerson(patch) {
    Object.assign(C().person, patch); core().markDirty(); window.dispatchEvent(new CustomEvent('lu:career-changed'));
  }
  function resolveConflict(id, choice) {
    const c = C(), cf = c.conflicts.find((x) => x.id === id);
    if (!cf) return;
    if (choice === 'new') {
      const target = cf.entity === 'person' ? c.person : c.roles.find((r) => r.id === cf.entityId);
      if (target) { setPath(target, cf.key, cf.proposed); target.updatedAt = now(); }
    }
    c.conflicts = c.conflicts.filter((x) => x.id !== id);
    core().markDirty(); window.dispatchEvent(new CustomEvent('lu:career-changed'));
  }

  // ── Freshness & quality: what needs attention ──────────────────────────
  function reviewItems() {
    const c = C(), cutoff = Date.now() - STALE_DAYS * 86400000, out = [];
    c.conflicts.forEach((cf) => out.push({ type: 'conflict', id: cf.id, cf }));
    c.achievements.forEach((a) => {
      if (!(a.metrics || []).length) out.push({ type: 'no-metric', id: a.id, kind: 'achievements', item: a });
      else if (new Date(a.confirmedAt).getTime() < cutoff) out.push({ type: 'stale', id: a.id, kind: 'achievements', item: a });
    });
    c.roles.forEach((r) => {
      if (!r.scope || ['pnl', 'budget', 'team'].every((k) => blank(r.scope[k]))) out.push({ type: 'no-scope', id: r.id, kind: 'roles', item: r });
      else if (new Date(r.confirmedAt).getTime() < cutoff) out.push({ type: 'stale', id: r.id, kind: 'roles', item: r });
    });
    return out;
  }
  const isStale = (fact) => !fact || !fact.confirmedAt || new Date(fact.confirmedAt).getTime() < Date.now() - STALE_DAYS * 86400000;

  // ── Graph lens: themes / skills across achievements and personas ───────
  function graph() {
    const c = C(), themes = {}, skills = {};
    c.achievements.forEach((a) => {
      (a.themes || []).forEach((t) => { (themes[t] = themes[t] || { name: t, ids: [], personas: {} }).ids.push(a.id); (a.personas || []).forEach((p) => { themes[t].personas[p] = (themes[t].personas[p] || 0) + 1; }); });
      (a.skills || []).forEach((s) => { const k = norm(s); (skills[k] = skills[k] || { name: s, ids: [] }).ids.push(a.id); });
    });
    const byCount = (o) => Object.values(o).sort((x, y) => y.ids.length - x.ids.length);
    return { themes: byCount(themes), skills: byCount(skills) };
  }

  window.LU_CAREER = {
    importFile, buildProposal, proposalCounts, applyProposal,
    update, add, remove, confirm, setPerson, resolveConflict,
    reviewItems, isStale, graph, STALE_DAYS,
    data: () => C(),
    _test: { similarity, findRole, matchAchievement },
  };
})();
