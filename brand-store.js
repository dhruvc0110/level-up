// Level Up — Brand content stream. Plain JS: window.LU_BRAND.
// One stream of LinkedIn posts from three sources: (1) experience (Career
// profile), (2) the job pipeline (themes from recent saves and applications,
// never naming the company), (3) Dhruv's own prompt or rough draft. Personas
// are lenses: one or more re-express the same topic. Claude drafts from the
// record only; Dhruv refines, copies and posts himself.
// Data: DOC.posts items with stream: true (older prototype posts are ignored);
// DOC.brand = { target, ideas: { experience: [], pipeline: [] }, kits (retired) }.
(function () {
  const core = () => window.LU_CORE;
  const career = () => core().doc().career || {};
  const LIMIT = { post: 3000, article: 110000 };
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  function brand() {
    const d = core().doc();
    if (!d.brand || typeof d.brand !== 'object') d.brand = {};
    if (!d.brand.ideas || typeof d.brand.ideas !== 'object') d.brand.ideas = {};
    ['experience', 'pipeline'].forEach((k) => { if (!Array.isArray(d.brand.ideas[k])) d.brand.ideas[k] = []; });
    if (!d.brand.target) d.brand.target = 3;
    if (!Array.isArray(d.posts)) d.posts = [];
    return d.brand;
  }
  const changed = () => { core().markDirty(); window.dispatchEvent(new CustomEvent('lu:brand-changed')); };

  // ── Posts ──
  function posts() { brand(); return core().doc().posts.filter((p) => p && p.stream); }
  function post(id) { return posts().find((p) => p.id === id) || null; }
  function savePost(id, patch) {
    const p = post(id);
    if (!p) return null;
    Object.assign(p, patch, { updatedAt: core().nowIso() });
    changed();
    return p;
  }
  function removePost(id) {
    const d = core().doc();
    d.posts = d.posts.filter((p) => p.id !== id);
    window.LU_POSTS = d.posts;
    changed();
  }
  function addPost(p) {
    brand();
    const item = Object.assign({ id: uid('bp-'), stream: true, status: 'draft', format: 'post', title: '', body: '', hashtags: [], lenses: [], versions: [], check: [], basedOn: { achievements: [], opps: [] }, createdAt: core().nowIso() }, p);
    core().doc().posts.unshift(item);
    window.LU_POSTS = core().doc().posts;
    changed();
    return item;
  }
  function markPosted(id, on) { return savePost(id, on ? { status: 'posted', postedAt: core().nowIso() } : { status: 'draft', postedAt: null }); }

  // ── Rhythm: posts marked posted per week (weeks start Monday) ──
  function weekStart(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function rhythm(weeks) {
    const n = weeks || 6, start = weekStart(new Date());
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const from = new Date(start); from.setDate(from.getDate() - 7 * i);
      const to = new Date(from); to.setDate(to.getDate() + 7);
      out.push({ from, count: posts().filter((p) => p.status === 'posted' && p.postedAt && new Date(p.postedAt) >= from && new Date(p.postedAt) < to).length });
    }
    return { target: brand().target, weeks: out, thisWeek: out[out.length - 1].count };
  }
  function setTarget(n) { brand().target = n; changed(); }

  // ── Sources ──
  // Proof from the whole record, outcomes with numbers and recent roles first.
  function proofList(max, firstIds) {
    const c = career(), ach = c.achievements || [];
    const roleOf = (a) => (c.roles || []).find((r) => r.id === a.roleId) || {};
    const rank = (a) => ((a.kind || 'outcome') === 'outcome' ? 2 : 0) + ((a.metrics || []).length ? 2 : 0) + (/present/i.test(roleOf(a).end || '') ? 1 : 0) + (String(roleOf(a).end || roleOf(a).start || '') > '2018' ? 1 : 0);
    const first = (firstIds || []).map((id) => ach.find((a) => a.id === id)).filter(Boolean);
    const rest = ach.filter((a) => !first.includes(a)).sort((a, b) => rank(b) - rank(a));
    return [...first, ...rest].slice(0, max || 24).map((a) => ({ a, role: roleOf(a) }));
  }
  const proofText = (proof) => proof.map((p, i) => `P${i}: ${p.a.text}${(p.a.metrics || []).length ? ' [numbers: ' + p.a.metrics.map((m) => m.value).join(', ') + ']' : ''} (${p.role.title || ''}, ${p.role.company || ''}, ${p.role.start || ''}–${p.role.end || ''})`).join('\n');

  // Recent saves and applications, with company names taken out.
  const ACTIVE = ['discovered', 'evaluating', 'applied', 'conversations'];
  function pipelineOpps() {
    const cut = Date.now() - 60 * 864e5;
    return (core().doc().opportunities || []).filter((o) => ACTIVE.includes(o.stage) && (!o.addedAt || new Date(o.addedAt).getTime() >= cut))
      .sort((a, b) => String(b.addedAt || '').localeCompare(String(a.addedAt || ''))).slice(0, 10);
  }
  function companyNames() {
    const names = new Set();
    (core().doc().opportunities || []).forEach((o) => { if (o.company && o.company.trim().length > 2) names.add(o.company.trim()); });
    return [...names];
  }
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function scrub(text, names) {
    let t = String(text || '');
    (names || companyNames()).forEach((n) => { t = t.replace(new RegExp('\\b' + esc(n) + '\\b', 'gi'), 'the company'); });
    return t;
  }
  function pipelineText(opps) {
    const names = companyNames();
    return opps.map((o, i) => {
      const e = o.enrichment || {};
      const brief = window.LU_COMPANY ? window.LU_COMPANY(o.company) : null;
      return `O${i}: ${o.role || 'Role'}${e.industry ? ' · ' + e.industry : ''}${e.companySize ? ' · ' + e.companySize : ''}` +
        (e.summary ? '\n  Mandate: ' + scrub(e.summary, names) : '') +
        (brief && brief.status === 'ok' && brief.whatTheyDo ? '\n  Business: ' + scrub(brief.whatTheyDo, names) : '');
    }).join('\n');
  }
  // Safety net: a post must never name a company from the pipeline.
  function mentions(text) {
    const t = String(text || '');
    return companyNames().filter((n) => new RegExp('\\b' + esc(n) + '\\b', 'i').test(t));
  }

  const AUDIENCE = 'The goal is engagement and visibility: to show up and be remembered when executive recruiters, hiring managers and executives search or scroll.';
  const IDEAS_PROMPT = (source) => `You are a LinkedIn content strategist for a senior executive. ${AUDIENCE}

Propose post ideas ${source === 'pipeline'
    ? 'on the themes, problems and decisions that the kinds of roles below care about, so the executive is seen as a peer with a point of view on them. NEVER name these companies, never hint at applications, job seeking or interviews, and never write as if addressing a specific employer.'
    : 'drawn from the executive\'s own experience: lessons, decisions, results, contrarian takes and how-tos that only someone with this record could write.'}

Rules:
- Each idea makes one specific point (not a topic heading). Vary the kinds: lesson, story, contrarian take, how-to, question to the community.
- Ground every idea in the proof given; cite the proof codes it would use.
- Do not repeat the recent posts listed.
- Mostly short posts; at most one long-form article idea.

Output one JSON object and nothing else:
{ "ideas": [ { "title": "the idea in under 12 words", "angle": "one sentence: the point the post makes", "proof": ["P2"], "roles": ["O1"], "format": "post" | "article" } ] }
"roles" is only for pipeline ideas.`;

  const DRAFT_PROMPT = () => `You write LinkedIn content for a senior executive, in their voice, to be posted by them personally. ${AUDIENCE}

${core().houseStyle || ''}

LinkedIn craft:
- The first line is the hook and must stand alone in under 150 characters (LinkedIn cuts the rest behind "see more").
- Short paragraphs, one idea, concrete numbers from the proof, a clear point of view.
- End with a takeaway or a genuine question that invites comments from peers.
- A post is 120 to 250 words (hard limit 3,000 characters), no title. An article is 600 to 1,000 words with a title and two or three subheadings.
- Up to three relevant hashtags, returned separately, not in the text. No emoji.

Rules:
- Use ONLY facts in the proof and the executive's own notes. Never invent results, numbers, employers, clients or titles. If something you'd want is missing, write around it and list it in "check".
- Do not name clients unless the proof itself names them.
- Never write proof codes (P1, P2…) in the text; they are only for the "used" list.
- Never name any company from the pipeline context, and never hint at applications, interviews or job seeking.
- If persona lenses are given, express this same topic as someone credible for those roles: bring in their perspective, priorities and vocabulary, woven into one coherent post (not a section per role).

Output one JSON object and nothing else:
{ "title": "article title, or null for a post", "body": "the text", "hashtags": ["#Example"], "used": ["P1"], "check": ["anything to verify before posting"] }`;

  function lensText(ids) {
    const ps = (window.LU_PERSONAS || []).filter((p) => (ids || []).includes(p.id));
    if (!ps.length) return '';
    const voice = window.LU_OUTREACH && window.LU_OUTREACH.voiceBlock ? window.LU_OUTREACH.voiceBlock : () => '';
    return 'PERSONA LENSES (express the topic through these roles):\n' + ps.map((p) => `- ${p.name}: ${p.positioning || ''}${(p.skills || []).length ? ' Key skills: ' + p.skills.slice(0, 8).join(', ') + '.' : ''}${voice(p) ? '\n  ' + voice(p).replace(/\n/g, '\n  ') : ''}`).join('\n');
  }
  function recentTitles() { return posts().slice(0, 12).map((p) => '- ' + (p.title || String(p.body || '').split('\n')[0]).slice(0, 120)).join('\n'); }
  function person() { const p = career().person || {}; return `EXECUTIVE: ${p.name || '(name not on file)'}${p.headline ? ' — ' + p.headline : ''}`; }

  async function ask(system, user, max) {
    const model = core().modelFor ? core().modelFor('brand') : core().models.parse;
    const once = async (extra) => {
      const resp = await core().claude(model, system, user + (extra || ''), max, null, 'brand');
      const texts = (resp.content || []).filter((b) => b.type === 'text');
      return { d: core().extractJson(texts.length ? texts[texts.length - 1].text : '') || {}, model: resp.model || model };
    };
    try { return await once(); } catch (err) { if (!(err instanceof SyntaxError)) throw err; return once(); }
  }
  // Proof codes ("P3", "(P1, P4)") must never reach a public post: drop them.
  const plainCodes = () => (s) => String(s == null ? '' : s).replace(/\s*[([]\s*P\d+(?:\s*[,;&]\s*P\d+)*\s*[)\]]/g, '').replace(/\bP\d+\b/g, '').replace(/[ \t]{2,}/g, ' ').replace(/ +([.,;:!?])/g, '$1');
  const codesToIds = (proof, codes) => (Array.isArray(codes) ? codes : []).map((x) => String(x).trim()).filter((x) => /^P\d+$/.test(x)).map((x) => proof[+x.slice(1)]).filter(Boolean).map((p) => p.a.id);

  // Suggest ideas for one source; they're added to the top of that list.
  async function suggestIdeas(source, n) {
    const proof = proofList(source === 'pipeline' ? 18 : 30);
    const opps = source === 'pipeline' ? pipelineOpps() : [];
    if (source === 'pipeline' && !opps.length) throw new Error('No roles saved or applied to in the last 60 days.');
    const expertise = (career().expertise || []).slice(0, 25).map((x) => x.name).filter(Boolean).join(', ');
    const user = [person(),
      opps.length && 'ROLES IN THE PIPELINE (anonymised; never name or hint at them):\n' + pipelineText(opps),
      expertise && 'EXPERTISE: ' + expertise,
      'PROOF (from the career record):\n' + (proof.length ? proofText(proof) : '(none recorded yet)'),
      'RECENT POSTS (do not repeat):\n' + (recentTitles() || '(none yet)'),
      `Give ${n || 5} ideas.`].filter(Boolean).join('\n\n');
    const { d } = await ask(IDEAS_PROMPT(source), user, 2500);
    const plain = plainCodes(proof);
    const ideas = (d.ideas || []).slice(0, n || 5).map((x) => ({
      id: uid('id-'), title: scrub(plain(x.title)), angle: scrub(plain(x.angle)), format: x.format === 'article' ? 'article' : 'post',
      proof: codesToIds(proof, x.proof),
      opps: (Array.isArray(x.roles) ? x.roles : []).map((r) => String(r).trim()).filter((r) => /^O\d+$/.test(r)).map((r) => opps[+r.slice(1)]).filter(Boolean).map((o) => o.id),
      createdAt: core().nowIso(),
    })).filter((x) => x.title);
    const b = brand();
    b.ideas[source] = [...ideas, ...b.ideas[source]].slice(0, 12);
    changed();
    return ideas;
  }
  function dismissIdea(source, id) { const b = brand(); b.ideas[source] = b.ideas[source].filter((x) => x.id !== id); changed(); }

  // Draft or refine a post. opts: { instruction, lenses } — without a body, writes fresh.
  async function write(p, opts) {
    const o = opts || {};
    const proof = proofList(18, (p.basedOn && p.basedOn.achievements) || []);
    const opps = (core().doc().opportunities || []).filter((x) => ((p.basedOn && p.basedOn.opps) || []).includes(x.id));
    const lenses = o.lenses || p.lenses || [];
    const user = [person(),
      p.source === 'own'
        ? (p.prompt ? "EXECUTIVE'S IDEA OR ROUGH DRAFT (develop it; keep their intent and any phrases that work):\n" + p.prompt : '')
        : `IDEA: ${p.ideaTitle || p.title}${p.ideaAngle ? '\nPoint to make: ' + p.ideaAngle : ''}`,
      opps.length && 'PIPELINE CONTEXT (anonymised; never name or hint at these):\n' + pipelineText(opps),
      `FORMAT: ${p.format === 'article' ? 'article' : 'post'}`,
      lensText(lenses),
      'PROOF (from the career record; use only these):\n' + (proof.length ? proofText(proof) : '(none recorded yet)'),
      p.body && 'CURRENT DRAFT TO REVISE:\n' + (p.title ? 'Title: ' + p.title + '\n' : '') + p.body,
      o.instruction && "EXECUTIVE'S INSTRUCTION: " + o.instruction,
      p.body && !o.instruction && lenses.length && 'Re-express the current draft through the persona lenses above, keeping its facts and core point.',
    ].filter(Boolean).join('\n\n');
    const { d, model } = await ask(DRAFT_PROMPT(), user, p.format === 'article' ? 5000 : 2500);
    const plain = plainCodes(proof);
    const body = plain(d.body);
    const named = mentions(body + ' ' + (d.title || ''));
    const check = [...(d.check || []).map(plain), ...named.map((n) => `Mentions “${n}”, a company in your pipeline: remove it before posting.`)];
    const versions = p.body ? [{ title: p.title, body: p.body, hashtags: p.hashtags, lenses: p.lenses, at: p.updatedAt || p.createdAt }, ...(p.versions || [])].slice(0, 10) : (p.versions || []);
    return savePost(p.id, {
      title: p.format === 'article' ? plain(d.title || p.title || '') : '', body,
      hashtags: (d.hashtags || []).slice(0, 3).map((h) => '#' + String(h).replace(/^#+/, '').replace(/\s+/g, '')),
      used: codesToIds(proof, d.used), check, lenses, versions, model, draftedAt: core().nowIso(),
      basedOn: { achievements: [...new Set([...codesToIds(proof, d.used), ...((p.basedOn && p.basedOn.achievements) || [])])], opps: (p.basedOn && p.basedOn.opps) || [] },
    });
  }
  async function draftFromIdea(source, idea) {
    const p = addPost({ source, format: idea.format || 'post', ideaTitle: idea.title, ideaAngle: idea.angle, basedOn: { achievements: idea.proof || [], opps: idea.opps || [] } });
    dismissIdea(source, idea.id);
    try { return await write(p); } catch (e) { savePost(p.id, { error: String(e.message || e).slice(0, 200) }); throw e; }
  }
  async function draftOwn(prompt, format) {
    const p = addPost({ source: 'own', format: format || 'post', prompt });
    try { return await write(p); } catch (e) { savePost(p.id, { error: String(e.message || e).slice(0, 200) }); throw e; }
  }
  function undo(id) {
    const p = post(id);
    if (!p || !(p.versions || []).length) return null;
    const [prev, ...rest] = p.versions;
    return savePost(id, { title: prev.title || '', body: prev.body, hashtags: prev.hashtags || [], lenses: prev.lenses || [], versions: rest, check: [] });
  }
  function copyText(p) { return [p.format === 'article' && p.title ? p.title + '\n' : '', p.body, (p.hashtags || []).length ? '\n' + p.hashtags.join(' ') : ''].filter(Boolean).join('\n').trim(); }

  window.LU_BRAND = { LIMIT, posts, post, savePost, removePost, markPosted, rhythm, setTarget, ideas: (s) => brand().ideas[s], suggestIdeas, dismissIdea,
    draftFromIdea, draftOwn, write, undo, copyText, pipelineOpps, mentions };
})();
