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
  // "Cognizant Consulting" = "Cognizant"; "KPMG Global Services" = "KPMG Consulting"; "Infosys Technologies" = "Infosys".
  const normCo = (s) => norm(s).replace(/\b(the|inc|llc|llp|lp|ltd|plc|corp|corporation|co|company|group|holdings|limited|consulting|global services|services|technologies|technology|solutions|international|india)\b/g, ' ').replace(/\s+/g, ' ').trim();
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
  const PLACE = { uk: 'united kingdom', us: 'united states', usa: 'united states', uae: 'united arab emirates', tx: 'texas', ny: 'new york' };
  const placeTokens = (s) => new Set(norm(s).split(' ').map((w) => PLACE[w] || w).join(' ').split(' ').filter((w) => w && w !== 'and'));
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const bareUrl = (s) => String(s || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
  const monthIndex = (d) => { const m = String(d || '').match(/^(\d{4})-(\d{2})/); return m ? +m[1] * 12 + (+m[2] - 1) : null; };
  // Same value for a given field, ignoring formatting differences.
  function sameField(key, a, b) {
    if (same(a, b)) return true;
    if (key === 'phone') return digits(a).slice(-10) === digits(b).slice(-10);
    if (key === 'title') {
      // "Director" vs "Consulting Director": one title contains the other.
      const A = tokens(expand(a)), B = tokens(expand(b));
      const sub = (x, y) => x.size && [...x].every((w) => y.has(w));
      return sub(A, B) || sub(B, A);
    }
    if (key === 'linkedin' || key === 'website') return bareUrl(a) === bareUrl(b);
    if (/location|geography/.test(key)) {
      // One place description contained in the other ("United States" ⊂ "Plano, Texas, United States").
      const A = placeTokens(a), B = placeTokens(b);
      const sub = (x, y) => [...x].every((w) => y.has(w));
      return sub(A, B) || sub(B, A);
    }
    if (key === 'start' || key === 'end') {
      const x = monthIndex(a), y = monthIndex(b);
      return x != null && y != null && Math.abs(x - y) <= 2; // job-change months differ by a month between sources
    }
    return false;
  }
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
    const personas = (doc.personas || []).filter((p) => !p.retired).map((p) => `- ${p.id}: ${p.name}`).join('\n');
    const themes = [...new Set(C().achievements.flatMap((a) => a.themes || []))].slice(0, 60).join(', ');
    const skills = [...new Set(C().achievements.flatMap((a) => a.skills || []))].slice(0, 60).join(', ');
    return `You extract a senior executive's career facts from ${kind === 'linkedin' ? 'their LinkedIn profile (PDF export)' : 'one of their resumes'} into structured data for a career knowledge base.

Their career personas:
${personas || '- (none yet)'}

Rules:
- Faithful extraction only. Never invent, embellish or infer facts, numbers, dates or employers. Keep numbers exactly as written ("$480M", "1,200 people").
- One item per bullet/claim. Keep the wording close to the source; you may tidy grammar.
- kind: "outcome" (a result delivered: numbers, wins, launches, delivered programs), "responsibility" (scope or remit: "responsible for…", "practice leader with ownership of…") or "inflight" (work in progress, "key outcomes in flight").
- Client engagements described as delivered work are outcomes. Keep client anonymity exactly as written ("one of the largest retailers").
- metrics: only numbers stated in that achievement.
- themes: 1-3 short business themes per achievement (2-4 words, lowercase, e.g. "erp modernization", "cost reduction", "m&a integration"). Reuse these existing themes when they fit: ${themes || '(none yet)'}.
- skills: 1-4 capabilities shown (e.g. "Vendor governance", "Board reporting"). Reuse existing when they fit: ${skills || '(none yet)'}.
- personas: ids of the personas each achievement best supports (0-3).
- Dates as "YYYY-MM" or "YYYY"; a current role ends "present".
- Scope fields only if stated (pnl, budget, team, geography), as short strings ("100+ practitioners", "global").
- expertise: everything listed as skills, competencies, industries, business processes, platforms/technologies, market offerings, languages. level = the person's own 1-5 rating if shown (count filled dots), else null. Don't repeat an item within a type.

Output a SINGLE JSON object, no prose around it:
{
  "person": { "name": null, "headline": null, "location": null, "email": null, "phone": null, "linkedin": null, "website": null },
  "summary": "professional summary text, or null",
  "roles": [ { "company": "", "title": "", "start": "", "end": "", "location": null,
      "scope": { "pnl": null, "budget": null, "team": null, "geography": null }, "summary": null,
      "achievements": [ { "text": "", "kind": "outcome", "metrics": [ { "label": "", "value": "" } ], "skills": [], "themes": [], "personas": [] } ] } ],
  "expertise": [ { "type": "capability|industry|process|platform|offering|language", "name": "", "category": null, "level": null } ],
  "education": [ { "school": "", "degree": null, "field": null, "year": null, "honors": null } ],
  "boards": [ { "org": "", "role": null, "start": null, "end": null } ],
  "publications": [ { "title": "", "venue": null, "year": null, "url": null } ],
  "credentials": [ { "name": "", "issuer": null, "year": null } ]
}`;
  }

  // Model per task comes from Settings; older cached copies of lu-store lack modelFor.
  const pick = (task, fallback) => (core().modelFor ? core().modelFor(task) : fallback);

  async function extract(file, kind) {
    const read = await readFile(file);
    const content = read.pdf
      ? [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: read.pdf } }, { type: 'text', text: 'Extract the career facts from this document.' }]
      : [{ type: 'text', text: 'DOCUMENT TEXT:\n' + String(read.text || '').slice(0, 60000) + '\n\nExtract the career facts from this document.' }];
    if (!read.pdf && !String(read.text || '').trim()) throw new Error('That file has no readable text.');
    const resp = await core().claude(pick('career', core().models.parse), extractPrompt(kind), content, 16000, null, 'career');
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
  const VARIANT_FIELDS = ['headline', 'summary'];
  function fieldChanges(existing, incoming, fields) {
    const out = [];
    fields.forEach(([key, label]) => {
      const get = (o) => key.split('.').reduce((v, k) => (v == null ? v : v[k]), o);
      const a = get(existing), b = get(incoming);
      if (blank(b)) return;
      if (blank(a)) out.push({ key, label, from: null, to: b, kind: 'fill', accept: true });
      // Headlines and summaries differ by design between resume versions: variants, not conflicts.
      else if (VARIANT_FIELDS.includes(key)) return;
      else if (!sameField(key, a, b)) out.push({ key, label, from: a, to: b, kind: 'conflict', choice: 'keep' });
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
  const KINDS = ['outcome', 'responsibility', 'inflight'];
  const cleanAch = (a) => ({
    text: String(a.text || '').trim(),
    kind: KINDS.includes(a.kind) ? a.kind : 'outcome',
    metrics: (Array.isArray(a.metrics) ? a.metrics : []).filter((m) => m && m.value).map((m) => ({ label: String(m.label || ''), value: String(m.value) })),
    skills: (Array.isArray(a.skills) ? a.skills : []).map(String).filter(Boolean).slice(0, 6),
    themes: (Array.isArray(a.themes) ? a.themes : []).map((t) => String(t).toLowerCase()).filter(Boolean).slice(0, 4),
    personas: (Array.isArray(a.personas) ? a.personas : []).map(String).filter((id) => (core().doc().personas || []).some((p) => p.id === id)),
  });

  const EXPERTISE_TYPES = ['capability', 'industry', 'process', 'platform', 'offering', 'language'];
  // Degrees and schools written differently: "BE" = "Bachelor of Engineering", "IIM Lucknow" = "Indian Institute of Management, Lucknow".
  const DEGREE = { be: 'bachelor of engineering', btech: 'bachelor of technology', bs: 'bachelor of science', bsc: 'bachelor of science', ba: 'bachelor of arts', ms: 'master of science', msc: 'master of science', mba: 'master of business administration', phd: 'doctor of philosophy' };
  const degreeKey = (d) => { const n = norm(d).replace(/ /g, ''); return DEGREE[n] || norm(d); };
  function sameSchool(a, b) {
    if (!a || !b) return false;
    const A = norm(a), B = norm(b);
    if (A === B) return true;
    const words = (s) => s.split(' ').filter((w) => !['of', 'the', 'and'].includes(w));
    // "IIM Lucknow": first word is the acronym of the other's leading words, the rest matches.
    const tryAcr = (short, long) => {
      const sw = words(short), lw = words(long);
      const acr = sw[0]; const rest = sw.slice(1).join(' ');
      for (let k = 2; k <= lw.length; k++) {
        if (lw.slice(0, k).map((w) => w[0]).join('') === acr && lw.slice(k).join(' ') === rest) return true;
      }
      return false;
    };
    return tryAcr(A, B) || tryAcr(B, A) || similarity(a, b) >= 0.6;
  }
  function educationProposal(items) {
    return (Array.isArray(items) ? items : []).filter((x) => x && (x.school || x.degree)).map((x) => {
      const existing = C().education.find((e) => (x.school ? sameSchool(e.school, x.school) : true) && (!x.degree || !e.degree || degreeKey(e.degree) === degreeKey(x.degree)) && (x.school || e.degree));
      return { status: existing ? 'known' : 'new', data: x, existingId: existing && existing.id, accept: !existing && !!x.school };
    });
  }
  function listProposal(kind, items, keyFn, aliasKeys) {
    return (Array.isArray(items) ? items : []).filter((x) => x && !blank(keyFn(x))).map((x) => {
      const k = norm(keyFn(x));
      const existing = C()[kind].find((e) => norm(keyFn(e)) === k || (aliasKeys && aliasKeys(e).some((a) => norm(a) === k)));
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
        education: educationProposal(e.education),
        boards: listProposal('boards', e.boards, (x) => x.org),
        publications: listProposal('publications', e.publications, (x) => x.title),
        credentials: listProposal('credentials', e.credentials, (x) => x.name),
        expertise: listProposal('expertise', (Array.isArray(e.expertise) ? e.expertise : [])
          .filter((x) => x && x.name && EXPERTISE_TYPES.includes(x.type))
          .map((x) => ({ type: x.type, name: String(x.name).trim(), category: x.category || null, level: Number.isFinite(+x.level) && +x.level > 0 ? Math.min(5, Math.round(+x.level)) : null })),
          (x) => x.type + ' ' + String(x.name).toLowerCase().replace(/[^a-z0-9]/g, ''), (e) => (e.aliases || []).map((a) => e.type + ' ' + String(a).toLowerCase().replace(/[^a-z0-9]/g, ''))),
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
        const entityId = target.id || null;
        if (C().conflicts.some((cf) => cf.entityId === entityId && cf.key === x.key && sameField(x.key, cf.proposed, x.to))) return; // already waiting for you
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
          if (ex) { mergeInto(ex, a.data, src.id); counts.confirmed++; }
          return;
        }
        if (!a.accept) return;
        c.achievements.push(Object.assign({ id: uid('ach'), roleId: role.id }, a.data, { sources: [src.id], confirmedAt: t, updatedAt: t, usedIn: [] }));
        counts.added++;
      });
    });
    Object.entries(p.lists).forEach(([kind, items]) => items.forEach((x) => {
      if (x.status === 'known') {
        const ex = c[kind].find((e) => e.id === x.existingId);
        if (ex) {
          addSrc(ex, src.id); ex.confirmedAt = t; counts.confirmed++;
          Object.keys(x.data).forEach((k) => { if (blank(ex[k]) && !blank(x.data[k])) ex[k] = x.data[k]; });
        }
        return;
      }
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
  window.LU_CAREER_EXPERTISE_TYPES = EXPERTISE_TYPES;

  // Same achievement in different words ("turned around a failing WMS rollout" =
  // "rescued a stalled warehouse-management program"). One Claude check per role you
  // already have, covering its new AND similar items; it sets the suggested choice.
  const DUP_PROMPT = 'You compare career achievements from the same job. Two statements are the SAME if they describe the same accomplishment, engagement or result (same client work, same initiative, same metric), even if worded differently, shorter, or with more or less detail. Different clients, initiatives or results are NOT the same. Output a single JSON object and nothing else.';
  async function askSame(existing, incoming) {
    const list = 'EXISTING:\n' + existing.map((e) => `${e.id}: ${e.text}`).join('\n') + '\n\nNEW:\n' + incoming.map((t, i) => `${i}: ${t}`).join('\n')
      + '\n\nFor each NEW item that is the same as an EXISTING one, give the pair. Format: {"same": [{"new": 0, "existing": "<id>"}]}';
    const resp = await core().claude(pick('dupes', core().models.quick), DUP_PROMPT, list, 8000, null, 'dupes');
    const texts = (resp.content || []).filter((b) => b.type === 'text');
    const d = core().extractJson(texts.length ? texts[texts.length - 1].text : '{}');
    return Array.isArray(d.same) ? d.same : [];
  }
  async function markRewordedDuplicates(p) {
    await Promise.all(p.roles.map(async (r) => {
      if (r.status !== 'match') return;
      const existing = C().achievements.filter((a) => a.roleId === r.existingId);
      const items = r.achievements.filter((a) => a.status === 'new' || a.status === 'similar');
      if (!existing.length || !items.length) return;
      let pairs;
      try { pairs = await askSame(existing, items.map((a) => a.data.text)); } catch (e) { return; } // best effort: you still choose
      items.forEach((a) => { if (a.status === 'similar') a.mode = 'add'; });
      pairs.forEach((m) => {
        const a = items[+m.new], ex = existing.find((e) => e.id === m.existing);
        if (a && ex) Object.assign(a, { status: 'similar', existingId: ex.id, existingText: ex.text, mode: 'same', accept: true });
      });
    }));
    return p;
  }

  // Merge achievement `from` into `into`: keep every wording (resumes need
  // different phrasings), and combine numbers, tags, sources and usage.
  function mergeInto(into, from, sourceId) {
    const t = now();
    const variants = into.variants || [];
    const add = (text, sid) => {
      if (!text || norm(text) === norm(into.text) || variants.some((v) => norm(v.text) === norm(text))) return;
      variants.push({ text, sourceId: sid || null, addedAt: t });
    };
    add(from.text, sourceId || (from.sources || [])[0]);
    (from.variants || []).forEach((v) => add(v.text, v.sourceId));
    into.variants = variants;
    const metricKeys = new Set((into.metrics || []).map((m) => norm(m.value)));
    into.metrics = [...(into.metrics || []), ...(from.metrics || []).filter((m) => !metricKeys.has(norm(m.value)))];
    ['skills', 'themes', 'personas', 'usedIn'].forEach((k) => { into[k] = [...new Set([...(into[k] || []), ...(from[k] || [])])]; });
    into.sources = [...new Set([...(into.sources || []), ...(from.sources || []), ...(sourceId ? [sourceId] : [])])];
    into.confirmedAt = t;
  }

  // ── Profile-wide duplicate check (Needs review → Check for duplicates) ──
  async function findDuplicates(onProgress) {
    const c = C();
    c.dupeSuggestions = [];
    const dismissed = new Set(c.notDuplicates || []);
    const roles = c.roles.filter((r) => c.achievements.filter((a) => a.roleId === r.id).length >= 2);
    let done = 0;
    for (const r of roles) {
      const list = c.achievements.filter((a) => a.roleId === r.id);
      if (onProgress) onProgress(++done, roles.length);
      try {
        const resp = await core().claude(pick('dupes', core().models.quick), DUP_PROMPT,
          'ACHIEVEMENTS:\n' + list.map((a) => `${a.id}: ${a.text}`).join('\n') + '\n\nGroup the ones that are the same accomplishment. Only groups of 2 or more. Format: {"groups": [["<id>", "<id>"]]}', 8000, null, 'dupes');
        const texts = (resp.content || []).filter((b) => b.type === 'text');
        const d = core().extractJson(texts.length ? texts[texts.length - 1].text : '{}');
        (Array.isArray(d.groups) ? d.groups : []).forEach((g) => {
          const ids = (Array.isArray(g) ? g : []).filter((id) => list.some((a) => a.id === id));
          const key = [...ids].sort().join('|');
          if (ids.length >= 2 && !dismissed.has(key)) c.dupeSuggestions.push({ id: uid('dup'), roleId: r.id, ids, key, createdAt: now() });
        });
      } catch (e) { /* skip this role; try again later */ }
    }
    // Expertise: synonyms and variants of the same item, per type.
    const byType = {};
    (c.expertise || []).forEach((x) => (byType[x.type] = byType[x.type] || []).push(x));
    for (const [type, list] of Object.entries(byType)) {
      if (list.length < 2) continue;
      try {
        const resp = await core().claude(pick('dupes', core().models.quick),
          'You tidy a list of an executive\'s ' + type + ' entries. Group entries that mean the same thing: synonyms, abbreviations, spelling variants or typos, or one being a slightly longer name for the other (e.g. "GPT-4o" and "OpenAI GPT-4o"; "Signavio" and "SAP Signavio"). Do NOT group items that are genuinely different (e.g. "Retail" and "Consumer Goods" are different industries). Output a single JSON object and nothing else.',
          'ENTRIES:\n' + list.map((x) => `${x.id}: ${x.name}`).join('\n') + '\n\nFormat: {"groups": [["<id>", "<id>"]]}', 6000, null, 'dupes');
        const texts = (resp.content || []).filter((b) => b.type === 'text');
        const d = core().extractJson(texts.length ? texts[texts.length - 1].text : '{}');
        (Array.isArray(d.groups) ? d.groups : []).forEach((g) => {
          const ids = (Array.isArray(g) ? g : []).filter((id) => list.some((x) => x.id === id));
          const key = [...ids].sort().join('|');
          if (ids.length >= 2 && !dismissed.has(key)) c.dupeSuggestions.push({ id: uid('dup'), kind: 'expertise', type, ids, key, createdAt: now() });
        });
      } catch (e) { /* skip this type */ }
    }
    core().markDirty(); window.dispatchEvent(new CustomEvent('lu:career-changed'));
    return c.dupeSuggestions.length;
  }
  function mergeDuplicates(suggestionId, keepId) {
    const c = C(), sg = (c.dupeSuggestions || []).find((x) => x.id === suggestionId);
    if (!sg) return;
    if (sg.kind === 'expertise') {
      const keep = c.expertise.find((x) => x.id === keepId) || c.expertise.find((x) => x.id === sg.ids[0]);
      sg.ids.filter((id) => id !== keep.id).forEach((id) => {
        const o = c.expertise.find((x) => x.id === id);
        if (!o) return;
        keep.level = Math.max(keep.level || 0, o.level || 0) || null;
        keep.sources = [...new Set([...(keep.sources || []), ...(o.sources || [])])];
        keep.aliases = [...new Set([...(keep.aliases || []), o.name, ...(o.aliases || [])])];
      });
      keep.confirmedAt = now();
      c.expertise = c.expertise.filter((x) => x.id === keep.id || !sg.ids.includes(x.id));
      c.dupeSuggestions = c.dupeSuggestions.filter((x) => x.id !== suggestionId);
      core().markDirty(); window.dispatchEvent(new CustomEvent('lu:career-changed'));
      return;
    }
    const keep = c.achievements.find((a) => a.id === keepId) || c.achievements.find((a) => a.id === sg.ids[0]);
    sg.ids.filter((id) => id !== keep.id).forEach((id) => {
      const other = c.achievements.find((a) => a.id === id);
      if (other) mergeInto(keep, other);
    });
    c.achievements = c.achievements.filter((a) => a.id === keep.id || !sg.ids.includes(a.id));
    c.dupeSuggestions = c.dupeSuggestions.filter((x) => x.id !== suggestionId);
    core().markDirty(); window.dispatchEvent(new CustomEvent('lu:career-changed'));
  }
  function keepSeparate(suggestionId) {
    const c = C(), sg = (c.dupeSuggestions || []).find((x) => x.id === suggestionId);
    if (!sg) return;
    c.notDuplicates = [...new Set([...(c.notDuplicates || []), sg.key])];
    c.dupeSuggestions = c.dupeSuggestions.filter((x) => x.id !== suggestionId);
    core().markDirty(); window.dispatchEvent(new CustomEvent('lu:career-changed'));
  }
  function useVariant(achId, text) {
    const a = C().achievements.find((x) => x.id === achId);
    if (!a || !text) return;
    const old = a.text;
    a.variants = (a.variants || []).filter((v) => norm(v.text) !== norm(text));
    a.variants.push({ text: old, sourceId: (a.sources || [])[0] || null, addedAt: now() });
    a.text = text; a.updatedAt = now(); a.confirmedAt = now();
    core().markDirty(); window.dispatchEvent(new CustomEvent('lu:career-changed'));
  }

  // ── Import entry point (read → upload original → extract → propose) ────
  async function importFile(file, kind) {
    const [extracted, stored] = await Promise.all([
      extract(file, kind),
      core().uploadToDriveFolder(file, 'Sources').catch(() => ({ id: null, url: null })),
    ]);
    return markRewordedDuplicates(buildProposal(extracted, { kind, name: file.name, driveId: stored.id, driveUrl: stored.url }));
  }

  // ── Personas: which proof supports each one ─────────────────────────────
  // Achievements get persona tags when a resume is read. A persona added or
  // redefined later is re-checked against the whole profile in one Claude pass
  // (achievements and expertise), replacing that persona's tags only.
  const PERSONA_FIELDS = ['name', 'positioning', 'skills', 'companySize', 'targetSectors'];
  const personaDef = (p) => JSON.stringify(PERSONA_FIELDS.map((k) => p && p[k] || null));
  const RELINK_PROMPT = 'You decide which parts of a senior executive\'s career record are genuine evidence for one target persona (a kind of role they are pursuing). Include an item only if a hiring panel for that persona would see it as relevant proof: matching responsibilities, results, industries, capabilities or platforms. Be selective; leave out generic items. Output a single JSON object and nothing else.';
  async function relinkPersona(persona) {
    const c = C();
    if (!persona || !persona.id || persona.retired) return null;
    if (!c.achievements.length && !(c.expertise || []).length) return { achievements: 0, expertise: 0 };
    const roleOf = (a) => c.roles.find((r) => r.id === a.roleId) || {};
    const ach = c.achievements, exp = c.expertise || [];
    const def = [`Persona: ${persona.code || ''} ${persona.name}`, persona.positioning && `Positioning: ${persona.positioning}`,
      (persona.skills || []).length && `Skills it needs: ${persona.skills.join(', ')}`, persona.companySize && `Company size: ${persona.companySize}`,
      (persona.targetSectors || []).length && `Target sectors: ${persona.targetSectors.join(', ')}`].filter(Boolean).join('\n');
    const user = def + '\n\nACHIEVEMENTS:\n' + ach.map((a, i) => `A${i}: ${a.text} [${roleOf(a).title || ''}, ${roleOf(a).company || ''}]`).join('\n')
      + '\n\nEXPERTISE:\n' + exp.map((x, i) => `E${i}: ${x.type}: ${x.name}`).join('\n')
      + '\n\nList the evidence for this persona. Format: {"achievements": ["A0", ...], "expertise": ["E3", ...]}';
    const model = core().modelFor ? core().modelFor('tagging') : core().models.quick;
    const resp = await core().claude(model, RELINK_PROMPT, user, 12000, null, 'tagging');
    const texts = (resp.content || []).filter((b) => b.type === 'text');
    let d;
    try { d = core().extractJson(texts.length ? texts[texts.length - 1].text : ''); }
    catch (e) { throw new Error(resp.stop_reason === 'max_tokens' ? 'The answer was cut off. Try again.' : 'Claude’s reply could not be read. Try again.'); }
    const pick = (list, prefix) => new Set((Array.isArray(list) ? list : []).map((s) => String(s).trim()).filter((s) => s[0] === prefix).map((s) => +s.slice(1)).filter((n) => Number.isInteger(n)));
    const A = pick(d.achievements, 'A'), E = pick(d.expertise, 'E');
    const set = (item, on) => {
      const cur = (item.personas || []).filter((id) => id !== persona.id);
      item.personas = on ? [...cur, persona.id] : cur;
    };
    ach.forEach((a, i) => set(a, A.has(i)));
    exp.forEach((x, i) => set(x, E.has(i)));
    c.personaLinks = c.personaLinks || {};
    c.personaLinks[persona.id] = { def: personaDef(persona), at: now(), achievements: A.size, expertise: E.size };
    core().markDirty(); window.dispatchEvent(new CustomEvent('lu:career-changed'));
    return { achievements: A.size, expertise: E.size };
  }
  // Has this persona been linked with its current definition?
  function linkStatus(persona) {
    const l = (C().personaLinks || {})[persona.id];
    if (!l) return { linked: false };
    return { linked: true, current: l.def === personaDef(persona), at: l.at, achievements: l.achievements, expertise: l.expertise };
  }
  window.addEventListener('lu:persona-saved', async (e) => {
    const { prev, next } = e.detail || {};
    if (!next || next.retired) return;
    if (prev && personaDef(prev) === personaDef(next)) return; // nothing that affects proof changed
    if (!C().achievements.length) return;
    const label = (next.code ? next.code + ' ' : '') + next.name;
    core().pill(`Linking your proof to ${label}…`, 'sticky');
    try {
      const r = await relinkPersona(next);
      core().pill(`Linked ${r.achievements} achievements and ${r.expertise} expertise items to ${label}`);
    } catch (err) {
      core().pill(`Couldn’t link proof to ${label}: ${String(err.message || err).slice(0, 120)}. Try again from the Career map.`);
    }
  });

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
    (c.dupeSuggestions || []).forEach((sg) => out.push({ type: 'duplicate', id: sg.id, sg }));
    c.achievements.forEach((a) => {
      if (!(a.metrics || []).length && (a.kind || 'outcome') === 'outcome') out.push({ type: 'no-metric', id: a.id, kind: 'achievements', item: a });
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
    findDuplicates, mergeDuplicates, keepSeparate, useVariant,
    relinkPersona, linkStatus,
    data: () => C(),
    _test: { similarity, findRole, matchAchievement },
  };
})();
