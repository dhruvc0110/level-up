// Level Up — job documents (opportunity → Resume / Cover letter tabs).
// Plain JS: window.LU_DOCS. A document = persona (angle, voice) × opportunity
// (what the job needs) × Career profile (the facts). Claude proposes; Dhruv
// chooses and edits; Level Up builds a Word file and saves it to Drive as a
// Google Doc. One style spec drives both the on-screen preview and the file,
// so what you see is what you get.
(function () {
  const core = () => window.LU_CORE;
  const career = () => core().doc().career || {};
  const fmtMonth = (d) => {
    if (!d) return '';
    if (/present/i.test(d)) return 'Present';
    const m = String(d).match(/^(\d{4})(?:-(\d{2}))?/);
    if (!m) return String(d);
    return m[2] ? new Date(+m[1], +m[2] - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : m[1];
  };
  const cleanUrl = (u) => (u ? String(u).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '') : u);
  const sortKey = (r) => (/present/i.test(r.end || '') ? '9999' : String(r.end || r.start || '0000'));

  // ── Format → style spec (shared by preview and Word file) ─────────────
  // Fonts are ones Google Docs offers, so the converted Doc keeps them.
  const FONT_PAIRS = {
    georgia:      { label: 'Georgia', head: 'Georgia', body: 'Georgia' },
    georgiaArial: { label: 'Georgia + Arial', head: 'Georgia', body: 'Arial' },
    garamond:     { label: 'Garamond + Lato', head: 'EB Garamond', body: 'Lato' },
    merriweather: { label: 'Merriweather + Open Sans', head: 'Merriweather', body: 'Open Sans' },
    playfair:     { label: 'Playfair + Source Sans', head: 'Playfair Display', body: 'Source Sans Pro' },
    montserrat:   { label: 'Montserrat + Lato', head: 'Montserrat', body: 'Lato' },
    arial:        { label: 'Arial', head: 'Arial', body: 'Arial' },
  };
  // CSS names for the on-screen preview (Google Fonts serves Source Sans as "Source Sans 3").
  const CSS_FONT = { 'Source Sans Pro': "'Source Sans 3','Source Sans Pro',Arial", 'EB Garamond': "'EB Garamond',Georgia", 'Playfair Display': "'Playfair Display',Georgia",
    Merriweather: 'Merriweather,Georgia', Montserrat: 'Montserrat,Arial', Lato: 'Lato,Arial', 'Open Sans': "'Open Sans',Arial", Georgia: 'Georgia,serif', Arial: 'Arial,Helvetica,sans-serif' };
  const PALETTE = { navy: '1F3A5F', forest: '2F5D50', burgundy: '6B2737', graphite: '2B2B2B', bronze: '7A5C2E', plum: '4B3F72' };
  const TEMPLATES = {
    classic:   { label: 'Classic',   ats: true,  set: { fontPair: 'georgia', headingCaps: true, size: 10, margin: 0.75, lineSpacing: 1.15, sectionGap: 'balanced' } },
    executive: { label: 'Executive', ats: true,  set: { fontPair: 'garamond', headingCaps: true, size: 10.5, margin: 0.8, lineSpacing: 1.15, sectionGap: 'balanced' } },
    modern:    { label: 'Modern',    ats: true,  set: { fontPair: 'montserrat', headingCaps: true, size: 10, margin: 0.7, lineSpacing: 1.15, sectionGap: 'balanced' } },
    minimal:   { label: 'Minimal',   ats: true,  set: { fontPair: 'arial', headingCaps: false, size: 10, margin: 0.85, lineSpacing: 1.2, sectionGap: 'airy' } },
    banner:    { label: 'Banner',    ats: false, set: { fontPair: 'merriweather', headingCaps: true, size: 10, margin: 0.7, lineSpacing: 1.15, sectionGap: 'balanced' } },
    sidebar:   { label: 'Sidebar',   ats: false, set: { fontPair: 'playfair', headingCaps: true, size: 9.5, margin: 0.6, lineSpacing: 1.15, sectionGap: 'balanced' } },
    compact:   { label: 'Compact',   ats: true,  set: { fontPair: 'georgiaArial', headingCaps: true, size: 9.5, margin: 0.55, lineSpacing: 1.05, sectionGap: 'compact' } },
    bio:       { label: 'Board bio', ats: true,  set: { fontPair: 'garamond', headingCaps: false, size: 10.5, margin: 0.9, lineSpacing: 1.25, sectionGap: 'airy', pages: 1 } },
  };
  const SECTION_KEYS = ['summary', 'experience', 'skills', 'education', 'boards', 'credentials'];
  const SECTION_TITLES = { summary: 'Summary', experience: 'Experience', skills: 'Skills and expertise', education: 'Education', boards: 'Board and advisory', credentials: 'Certifications and awards', highlights: 'Selected achievements' };
  const DEFAULT_FORMAT = { template: 'classic', pages: 2, fontPair: 'georgia', size: 10, color: PALETTE.navy, margin: 0.75, lineSpacing: 1.15, sectionGap: 'balanced',
    headingCaps: true, datePos: 'right', roleOrder: 'title', bullet: '•', paper: 'letter',
    sectionOrder: SECTION_KEYS.slice(), sectionTitles: {},
    contact: { location: true, email: true, phone: true, linkedin: true }, sections: { summary: true, skills: true, education: true, boards: true, credentials: true } };
  // Older saved formats (font serif/sans, accent names, spacing) still load.
  function normalize(f) {
    const x = Object.assign({}, DEFAULT_FORMAT, f || {});
    if (f && !f.fontPair && f.font) x.fontPair = f.font === 'sans' ? 'arial' : 'georgia';
    if (f && !f.color && f.accent) x.color = PALETTE[f.accent === 'green' ? 'forest' : f.accent] || PALETTE.navy;
    if (f && !f.sectionGap && f.spacing) x.sectionGap = f.spacing;
    if (!TEMPLATES[x.template]) x.template = 'classic';
    if (!FONT_PAIRS[x.fontPair]) x.fontPair = 'georgia';
    x.color = String(x.color || PALETTE.navy).replace('#', '').toUpperCase();
    if (!/^[0-9A-F]{6}$/.test(x.color)) x.color = PALETTE.navy;
    x.size = Math.min(12, Math.max(8.5, +x.size || 10));
    x.margin = Math.min(1.2, Math.max(0.4, +x.margin || 0.75));
    x.lineSpacing = Math.min(1.5, Math.max(1, +x.lineSpacing || 1.15));
    x.contact = Object.assign({}, DEFAULT_FORMAT.contact, (f && f.contact) || {});
    x.sections = Object.assign({}, DEFAULT_FORMAT.sections, (f && f.sections) || {});
    const order = (f && Array.isArray(f.sectionOrder) ? f.sectionOrder : []).filter((k) => SECTION_KEYS.includes(k));
    x.sectionOrder = [...order, ...SECTION_KEYS.filter((k) => !order.includes(k))];
    x.sectionTitles = Object.assign({}, (f && f.sectionTitles) || {});
    return x;
  }
  // Choosing a template applies its typography and spacing; colour and sections stay yours.
  function applyTemplate(f, t) { return Object.assign({}, normalize(f), (TEMPLATES[t] || TEMPLATES.classic).set, { template: t }); }
  const tint = (hex, amt) => { const n = parseInt(hex, 16); const mix = (c) => Math.round(c + (255 - c) * amt); return [mix(n >> 16), mix((n >> 8) & 255), mix(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase(); };
  function styleFor(f) {
    const fmt = normalize(f);
    const t = fmt.template;
    const pair = FONT_PAIRS[fmt.fontPair];
    const sp = { compact: 0.75, balanced: 1, airy: 1.3 }[fmt.sectionGap] || 1;
    const b = fmt.size;
    return {
      fmt, template: t,
      page: fmt.paper === 'a4' ? { w: 8.27, h: 11.69 } : { w: 8.5, h: 11 },
      margin: fmt.margin,
      head: pair.head, body: pair.body, headCss: CSS_FONT[pair.head] || pair.head, bodyCss: CSS_FONT[pair.body] || pair.body,
      color: fmt.color, tint: tint(fmt.color, 0.9),
      nameColor: ['classic', 'minimal', 'compact'].includes(t) ? '1B1B1B' : fmt.color,
      headingColor: t === 'classic' || t === 'compact' ? '1B1B1B' : fmt.color,
      headingBold: ['modern', 'banner', 'sidebar'].includes(t),
      rule: t === 'modern' ? 'accent' : t === 'minimal' || t === 'bio' ? 'none' : 'hair',
      center: t === 'executive',
      band: t === 'banner', sidebar: t === 'sidebar', narrative: t === 'bio',
      caps: fmt.headingCaps,
      line: fmt.lineSpacing,
      size: { name: Math.round(b * 2.1), headline: b + 0.5, section: b + 1, body: b, small: b - 1 },
      gap: { section: 10 * sp, item: 5 * sp, para: 2.5 * sp },
      bullet: fmt.bullet || '•', datePos: fmt.datePos, roleOrder: fmt.roleOrder,
    };
  }

  // ── Resume model from the saved state ─────────────────────────────────
  // state: { headline, summary, roles: { roleId: { mode } }, order, items: { achId: { on, text } }, skills: [..], format }
  function resumeModel(state) {
    const c = career(), p = c.person || {};
    const st = styleFor(state.format);
    const f = st.fmt;
    const contact = [f.contact.location && p.location, f.contact.email && p.email, f.contact.phone && p.phone, f.contact.linkedin && cleanUrl(p.linkedin)].filter(Boolean);
    const roles = [...(c.roles || [])].sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
    const experience = roles.map((r) => {
      const mode = (state.roles && state.roles[r.id] && state.roles[r.id].mode) || 'full';
      if (mode === 'omit') return null;
      const order = (state.order && state.order[r.id]) || [];
      const ids = [...order, ...c.achievements.filter((a) => a.roleId === r.id).map((a) => a.id).filter((id) => !order.includes(id))];
      const onIds = mode === 'brief' ? [] : ids.filter((id) => state.items && state.items[id] && state.items[id].on);
      const bullets = onIds.map((id) => state.items[id].text);
      // Keys name each block so a manual page break can sit before it.
      // level 1 = a sub-bullet under the bullet above it.
      return { key: 'role:' + r.id, title: r.title, company: r.company, dates: `${fmtMonth(r.start)} – ${fmtMonth(r.end)}`, location: r.location || '', bullets, bulletKeys: onIds.map((id) => 'b:' + id), bulletLevels: onIds.map((id, i) => (i > 0 && state.items[id].level ? 1 : 0)) };
    }).filter(Boolean);
    const title = (k) => (f.sectionTitles[k] && String(f.sectionTitles[k]).trim()) || SECTION_TITLES[k];
    const content = {
      summary: state.summary ? [state.summary] : [],
      experience,
      skills: state.skills || [],
      // School-level entries don't belong on an executive resume.
      education: (c.education || []).filter((e) => !/high school|secondary|matriculation|\b(ssc|hsc|cbse|icse)\b|class (x|xii|10|12)/i.test([e.degree, e.school].join(' '))).map((e) => [e.degree, e.field, e.school, e.year].filter(Boolean).join(', ')),
      boards: (c.boards || []).map((b) => [b.role, b.org, [fmtMonth(b.start), fmtMonth(b.end)].filter(Boolean).join(' – ')].filter(Boolean).join(', ')),
      credentials: (c.credentials || []).map((x) => [x.name, x.issuer, x.year].filter(Boolean).join(', ')),
    };
    let sections = f.sectionOrder.filter((k) => k === 'experience' || f.sections[k]).map((k) => ({ key: k, title: title(k), items: content[k] })).filter((x) => x.items.length);
    if (st.narrative) {
      // Board bio: a profile paragraph, selected achievements across roles, then a short career line.
      const highlights = experience.flatMap((x) => x.bullets).slice(0, 6);
      const highlightKeys = experience.flatMap((x) => x.bulletKeys).slice(0, 6);
      sections = sections.map((x) => (x.key === 'summary' ? { ...x, title: f.sectionTitles.summary || 'Profile' } : x.key === 'experience' ? { ...x, title: f.sectionTitles.experience || 'Career', items: experience.map((e) => ({ ...e, bullets: [], bulletKeys: [], bulletLevels: [] })) } : x));
      const at = sections.findIndex((x) => x.key === 'experience');
      if (highlights.length) sections.splice(Math.max(0, at), 0, { key: 'highlights', title: SECTION_TITLES.highlights, items: highlights, itemKeys: highlightKeys });
    }
    const sideKeys = ['skills', 'education', 'boards', 'credentials'];
    return {
      kind: 'resume', style: st, breaks: st.sidebar ? [] : (state.breaks || []),
      name: p.name || 'Your name', headline: state.headline || p.headline || '', contact,
      sections,
      side: st.sidebar ? sections.filter((x) => sideKeys.includes(x.key)) : [],
      main: st.sidebar ? sections.filter((x) => !sideKeys.includes(x.key)) : sections,
    };
  }
  function letterModel(state) {
    const c = career(), p = c.person || {};
    const f = normalize(state.format);
    // Letters use the resume's look, but always one column.
    const st = styleFor(Object.assign({}, f, { template: ['sidebar', 'compact', 'bio'].includes(f.template) ? 'classic' : f.template, pages: 1 }));
    const contact = [p.location, p.email, p.phone, cleanUrl(p.linkedin)].filter(Boolean);
    // The tailored headline from this job's resume reads better than a long LinkedIn headline.
    return { kind: 'letter', style: st, breaks: [], name: p.name || 'Your name', headline: state.headline || '', contact,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      recipient: state.recipient || '', salutation: state.salutation || 'Dear Hiring Manager,', paragraphs: (state.paragraphs || []).filter((x) => String(x).trim()), signoff: state.signoff || 'Kind regards,', signature: (p.name || '') };
  }

  // ── Claude: tailor a resume to this opportunity ───────────────────────
  function jobBlock(opp) {
    const e = opp.enrichment || {};
    const brief = window.LU_COMPANY ? window.LU_COMPANY(opp.company) : null;
    return [`ROLE: ${opp.role || '?'} at ${opp.company || '?'}`, e.summary && 'Summary: ' + e.summary, e.location && 'Location: ' + [e.location, e.workplace].filter(Boolean).join(', '),
      e.industry && 'Industry: ' + e.industry, opp.notes && 'Notes: ' + String(opp.notes).slice(0, 1500),
      brief && brief.status === 'ok' && 'COMPANY PROFILE: ' + [brief.whatTheyDo, brief.employees && 'Employees ' + brief.employees, brief.revenue && 'Revenue ' + brief.revenue, ...(brief.recent || []).map((r) => 'Recent: ' + r)].filter(Boolean).join(' ')].filter(Boolean).join('\n');
  }
  function personaBlock(opp) {
    const persona = (window.LU_PERSONAS || []).find((p) => p.id === opp.persona);
    if (!persona) return '';
    const voice = window.LU_OUTREACH && window.LU_OUTREACH.voiceBlock ? window.LU_OUTREACH.voiceBlock(persona) : '';
    return [`PERSONA (the angle): ${persona.code || ''} ${persona.name}. ${persona.positioning || ''}`, (persona.skills || []).length && 'Skills to lead with: ' + persona.skills.join(', '), voice].filter(Boolean).join('\n');
  }
  const RESUME_PROMPT = () => `You tailor a senior executive's resume to one specific opportunity, as a top executive-search researcher would. You select and order existing achievements and tighten their wording for this role.

${core().houseStyle || ''}
Resume register: concise, results-first bullets (start with a strong verb, lead with the outcome and the number), no first person, no full stops needed at bullet ends.

Rules:
- Use ONLY facts in the record. A tailored bullet may shorten, reorder or sharpen an achievement's wording, but must not add any fact, number, client, scope or claim that the original doesn't contain.
- Pick the achievements most relevant to this role and order them most relevant first within each role. Favour outcomes with numbers and recent roles.
- Older or less relevant roles may be "brief" (title line only) or "omit".
- Fit the target length: about 8 to 11 bullets in total for 1 page, 14 to 20 for 2 pages.
- The headline is one line positioning the sender for this role (no invented titles). The summary is 2 to 3 sentences.
- Skills: up to 12 items, taken from the EXPERTISE list, most relevant first.

Output a single JSON object and nothing else:
{ "headline": "...", "summary": "...",
  "roles": [ { "r": "R0", "mode": "full" | "brief" | "omit", "bullets": [ { "a": "A12", "text": "tailored bullet" } ] } ],
  "skills": ["..."],
  "match": [ { "item": "what the role needs", "status": "covered" | "partial" | "gap", "note": "short" } ],
  "check": ["anything the sender should verify"] }
Every role in the record must appear once in "roles". Never write the R/A codes inside any text.`;

  async function tailorResume(opp, pages) {
    const c = career();
    const roles = [...(c.roles || [])].sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
    const ach = c.achievements || [];
    const aIdx = new Map(ach.map((a, i) => [a.id, i]));
    const record = roles.map((r, ri) => {
      const list = ach.filter((a) => a.roleId === r.id);
      const scope = r.scope && Object.entries(r.scope).filter((e) => e[1]).map((e) => e[0] + ': ' + e[1]).join('; ');
      return `R${ri}: ${r.title}, ${r.company} (${r.start || '?'} to ${r.end || '?'})${scope ? ' | scope ' + scope : ''}\n` +
        (list.length ? list.map((a) => `  A${aIdx.get(a.id)}: [${a.kind || 'outcome'}] ${a.text}${(a.metrics || []).length ? ' | numbers: ' + a.metrics.map((m) => m.value).join(', ') : ''}`).join('\n') : '  (no achievements recorded)');
    }).join('\n');
    const expertise = [...(c.expertise || [])].sort((a, b) => (b.level || 0) - (a.level || 0)).slice(0, 80).map((x) => `${x.type}: ${x.name}`).join('; ');
    const user = [jobBlock(opp), personaBlock(opp), `TARGET LENGTH: ${pages || 2} page${(pages || 2) === 1 ? '' : 's'}`,
      'CAREER RECORD (roles newest first, with their achievements):\n' + record, 'EXPERTISE:\n' + expertise,
      'EDUCATION: ' + ((c.education || []).map((e) => [e.degree, e.school].filter(Boolean).join(', ')).join('; ') || '(none)')].filter(Boolean).join('\n\n');
    const model = core().modelFor ? core().modelFor('documents') : core().models.parse;
    const ask = async () => {
      const resp = await core().claude(model, RESUME_PROMPT(), user, 8000, null, 'documents');
      const texts = (resp.content || []).filter((b) => b.type === 'text');
      try { return core().extractJson(texts.length ? texts[texts.length - 1].text : ''); }
      catch (e) { if (resp.stop_reason === 'max_tokens') throw new Error('The answer was cut off. Try again.'); throw e; }
    };
    let d;
    try { d = await ask(); } catch (e) { if (!(e instanceof SyntaxError)) throw e; d = await ask(); }
    const plain = (s) => String(s || '').replace(/\b[AR](\d+)\b/g, '').replace(/\s{2,}/g, ' ').trim();
    // Build the editable state: Claude's picks ticked with tailored text; everything else unticked with its own words.
    const state = { headline: plain(d.headline), summary: plain(d.summary), roles: {}, items: {}, order: {}, skills: (Array.isArray(d.skills) ? d.skills : []).map(plain).filter(Boolean).slice(0, 12),
      match: (Array.isArray(d.match) ? d.match : []).map((m) => ({ item: plain(m.item), status: ['covered', 'partial', 'gap'].includes(m.status) ? m.status : 'gap', note: plain(m.note) })).filter((m) => m.item),
      check: (Array.isArray(d.check) ? d.check : []).map(plain).filter(Boolean).slice(0, 5), tailoredAt: core().nowIso() };
    ach.forEach((a) => { state.items[a.id] = { on: false, text: a.text, original: a.text }; });
    (Array.isArray(d.roles) ? d.roles : []).forEach((x) => {
      const r = roles[+String(x.r || '').replace(/\D/g, '')];
      if (!r) return;
      state.roles[r.id] = { mode: ['full', 'brief', 'omit'].includes(x.mode) ? x.mode : 'full' };
      state.order[r.id] = [];
      (Array.isArray(x.bullets) ? x.bullets : []).forEach((b) => {
        const a = ach[+String(b.a || '').replace(/\D/g, '')];
        if (!a || a.roleId !== r.id) return;
        state.items[a.id] = { on: true, text: plain(b.text) || a.text, original: a.text };
        state.order[r.id].push(a.id);
      });
    });
    roles.forEach((r) => { if (!state.roles[r.id]) state.roles[r.id] = { mode: 'brief' }; });
    return state;
  }

  // ── Claude: draft a cover letter ──────────────────────────────────────
  async function draftLetter(opp, opts) {
    const proof = window.LU_OUTREACH ? window.LU_OUTREACH.proofFor(opp.persona).slice(0, 12) : [];
    const e = opp.enrichment || {};
    const to = (e.hiringManager && e.hiringManager.name) ? e.hiringManager : (opp.contact && opp.contact.warmth !== 'recruiter' ? opp.contact : null);
    const user = [jobBlock(opp), personaBlock(opp),
      `ADDRESSEE: ${to ? to.name + (to.title ? ', ' + to.title : '') : 'unknown: use "Dear Hiring Manager,"'}`,
      'PROOF (use only these):\n' + (proof.length ? proof.map((p, i) => `P${i}: ${p.a.text}${(p.a.metrics || []).length ? ' [numbers: ' + p.a.metrics.map((m) => m.value).join(', ') + ']' : ''} (${p.role.title || ''}, ${p.role.company || ''})`).join('\n') : '(none)'),
      opts && opts.base ? 'CURRENT DRAFT TO REVISE:\n' + opts.base.join('\n\n') : '', opts && opts.instruction ? "SENDER'S INSTRUCTION: " + opts.instruction : ''].filter(Boolean).join('\n\n');
    const system = `You write a cover letter for a senior executive applying for the role below, in their voice.

${core().houseStyle || ''}

Rules: use ONLY facts in PROOF; never invent results, numbers, clients or relationships. 250 to 350 words in 3 or 4 paragraphs: why this company and role (be specific; use the company profile if helpful), two or three pieces of proof that match what the role needs, how they would approach the first year, and a courteous close. No subject line, no address block, no sign-off line (added separately). Never write the P codes.
Output a single JSON object and nothing else: { "salutation": "Dear ...,", "paragraphs": ["...", "..."], "check": ["anything to verify before sending"] }`;
    const model = core().modelFor ? core().modelFor('documents') : core().models.parse;
    const resp = await core().claude(model, system, user, 3000, null, 'documents');
    const texts = (resp.content || []).filter((b) => b.type === 'text');
    const d = core().extractJson(texts.length ? texts[texts.length - 1].text : '');
    const plain = (s) => String(s || '').replace(/\bP(\d+)\b/g, (m, n) => (proof[+n] ? '“' + proof[+n].a.text.split(/\s+/).slice(0, 6).join(' ') + '…”' : m));
    return { salutation: plain(d.salutation) || 'Dear Hiring Manager,', paragraphs: (Array.isArray(d.paragraphs) ? d.paragraphs : []).map(plain).filter(Boolean),
      check: (Array.isArray(d.check) ? d.check : []).map(plain).filter(Boolean).slice(0, 4), recipient: to ? [to.name, to.title].filter(Boolean).join(', ') : '',
      used: proof.map((p) => p.a.id), draftedAt: core().nowIso() };
  }

  // ── Word file (docx library, loaded on first use) ─────────────────────
  let docxLoading = null;
  function loadDocx() {
    if (window.docx && window.docx.Document) return Promise.resolve(window.docx);
    if (!docxLoading) {
      docxLoading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/docx@9.0.2/build/index.umd.js';
        s.integrity = 'sha384-0E47/4EreyRZQl9Vw8U7veXxL32+P1HPJ5BrL92opvktfsv4TSgDXOq82EbGFW6N';
        s.crossOrigin = 'anonymous';
        s.onload = () => resolve(window.docx);
        s.onerror = () => { docxLoading = null; reject(new Error('Could not load the Word builder. Check your connection and try again.')); };
        document.head.appendChild(s);
      });
    }
    return docxLoading;
  }
  async function buildDocx(model) {
    const D = await loadDocx();
    const st = model.style;
    const TWIP = 1440, pt = (n) => Math.round(n * 2); // docx font sizes are half-points
    const LINE = Math.round(240 * st.line);
    const full = Math.round((st.page.w - st.margin * 2) * TWIP);
    const none = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
    const run = (text, o) => new D.TextRun(Object.assign({ text, font: st.body, size: pt(st.size.body), color: '1B1B1B' }, o || {}));
    const para = (children, o) => new D.Paragraph(Object.assign({ children, spacing: { after: Math.round(st.gap.para * 20), line: LINE } }, o || {}));
    const ruleBorder = st.rule === 'accent' ? { bottom: { style: D.BorderStyle.SINGLE, size: 12, color: st.color, space: 2 } }
      : st.rule === 'hair' ? { bottom: { style: D.BorderStyle.SINGLE, size: 4, color: '999999', space: 2 } } : undefined;
    const headText = (t) => (st.caps ? t.toUpperCase() : t);
    const sectionHead = (t, inSide) => para([run(headText(t), { font: st.head, size: pt(st.size.section), bold: st.headingBold, color: st.headingColor, characterSpacing: st.caps ? 20 : 0 })],
      Object.assign({ keepNext: true, spacing: { before: Math.round(st.gap.section * 20), after: Math.round(st.gap.para * 2 * 20) } }, ruleBorder && !inSide ? { border: ruleBorder } : {}, st.center ? { alignment: D.AlignmentType.CENTER } : {}));
    const cellOf = (children, width, o) => new D.TableCell(Object.assign({ width: { size: width, type: D.WidthType.DXA }, borders: noBorders, margins: { top: 0, bottom: 0, left: 0, right: 0 }, children }, o || {}));
    const table = (rows, widths) => new D.Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: D.WidthType.DXA }, columnWidths: widths, borders: noBorders, layout: D.TableLayoutType.FIXED, rows });

    // Header: name, headline, contact (centred for Executive; in a coloured band for Banner).
    const headerParas = (onBand) => {
      const align = st.center ? { alignment: D.AlignmentType.CENTER } : {};
      const nameColor = onBand ? 'FFFFFF' : st.nameColor;
      const out = [para([run(model.name, { font: st.head, size: pt(st.size.name), color: nameColor })], Object.assign({ spacing: { after: 40 } }, align))];
      if (model.headline) out.push(para([run(model.headline, { size: pt(st.size.headline), color: onBand ? 'FFFFFF' : '444444' })], Object.assign({ spacing: { after: 40 } }, align)));
      if (model.contact.length) out.push(para([run(model.contact.join('  ·  '), { size: pt(st.size.small), color: onBand ? 'F2F2F2' : '555555' })],
        Object.assign({}, align, model.kind === 'resume' && st.rule === 'hair' && !onBand && !st.sidebar ? { border: ruleBorder } : {})));
      return out;
    };
    const kids = [];
    if (st.band) {
      kids.push(table([new D.TableRow({ children: [cellOf(headerParas(true), full, { shading: { fill: st.color, type: D.ShadingType.CLEAR, color: 'auto' }, margins: { top: 200, bottom: 160, left: 200, right: 200 } })] })], [full]));
    } else kids.push(...headerParas(false));

    // One role: title line (with dates right or below), then bullets.
    const roleBlocks = (x, width) => {
      const first = st.roleOrder === 'company' ? [run(x.company, { bold: true }), run('  ·  ' + x.title)] : [run(x.title, { bold: true }), run('  ·  ' + x.company)];
      const out = [];
      const before = Math.round(st.gap.item * 20);
      if (st.datePos === 'below') {
        out.push(para(first, { spacing: { before, after: 0, line: LINE }, keepNext: true }));
        out.push(para([run(x.dates, { size: pt(st.size.small), color: '666666', italics: true })], { spacing: { after: 40, line: LINE }, keepNext: true }));
      } else {
        // Dates flush right via a borderless two-column table: lines up in Word, Google Docs and previewers.
        const right = Math.round(1.8 * TWIP);
        const cp = (children, align) => [new D.Paragraph({ children, alignment: align, spacing: { before, after: 40, line: LINE }, keepNext: true })];
        out.push(table([new D.TableRow({ cantSplit: true, children: [cellOf(cp(first, D.AlignmentType.LEFT), width - right), cellOf(cp([run(x.dates, { size: pt(st.size.small), color: '555555' })], D.AlignmentType.RIGHT), right)] })], [width - right, right]));
      }
      x.bullets.forEach((b, i) => out.push(...brk((x.bulletKeys || [])[i]), para([run(b)], { numbering: { reference: 'lu-bullets', level: (x.bulletLevels || [])[i] || 0 }, spacing: { after: Math.round(st.gap.para * 20), line: LINE } })));
      return out;
    };
    // A manual page break: an empty, near-zero-height paragraph that starts a new page.
    const breaks = new Set(model.breaks || []);
    const brk = (key) => (breaks.has(key) ? [new D.Paragraph({ pageBreakBefore: true, spacing: { before: 0, after: 0, line: 20, lineRule: D.LineRuleType ? D.LineRuleType.EXACT : undefined }, children: [new D.TextRun({ text: '', size: 2 })] })] : []);
    const sectionBlocks = (sec, width, inSide) => {
      const head = sectionHead(sec.title, inSide);
      const out = [...brk('sec:' + sec.key), head];
      if (sec.key === 'summary') sec.items.forEach((t) => out.push(para([run(t)], { spacing: { after: 60, line: LINE } })));
      else if (sec.key === 'experience') sec.items.forEach((x) => out.push(...brk(x.key), ...roleBlocks(x, width)));
      else if (sec.key === 'highlights') sec.items.forEach((t, i) => out.push(...brk((sec.itemKeys || [])[i]), para([run(t)], { numbering: { reference: 'lu-bullets', level: 0 }, spacing: { after: Math.round(st.gap.para * 20), line: LINE } })));
      else if (sec.key === 'skills' && !inSide) out.push(para([run(sec.items.join('  ·  '))]));
      else sec.items.forEach((t, i) => out.push(...brk(sec.key + ':' + i), para([run(t, inSide ? { size: pt(st.size.small + 0.5) } : {})])));
      return out;
    };

    if (model.kind === 'letter') {
      kids.push(para([run(model.date)], { spacing: { before: 360, after: 240 } }));
      if (model.recipient) kids.push(para([run(model.recipient)], { spacing: { after: 240 } }));
      kids.push(para([run(model.salutation)], { spacing: { after: 160 } }));
      model.paragraphs.forEach((t) => kids.push(para([run(t)], { spacing: { after: 160, line: Math.max(LINE, 264) } })));
      kids.push(para([run(model.signoff)], { spacing: { before: 120, after: 480 } }));
      kids.push(para([run(model.signature)]));
    } else if (st.sidebar) {
      // Two columns: a tinted sidebar (skills, education, boards, certifications) and the main column.
      const sideW = Math.round(full * 0.32), gap = Math.round(0.25 * TWIP), mainW = full - sideW - gap;
      const sideKids = model.side.flatMap((x) => sectionBlocks(x, sideW - 240, true));
      const mainKids = model.main.flatMap((x) => sectionBlocks(x, mainW, false));
      kids.push(table([new D.TableRow({ children: [
        cellOf(sideKids.length ? sideKids : [para([run('')])], sideW, { shading: { fill: st.tint, type: D.ShadingType.CLEAR, color: 'auto' }, margins: { top: 120, bottom: 120, left: 140, right: 140 } }),
        cellOf([para([run('')])], gap),
        cellOf(mainKids.length ? mainKids : [para([run('')])], mainW)] })], [sideW, gap, mainW]));
    } else {
      model.main.forEach((x) => kids.push(...sectionBlocks(x, full, false)));
    }
    const doc = new D.Document({
      creator: model.name, title: model.kind === 'letter' ? 'Cover letter' : 'Resume',
      styles: { default: { document: { run: { font: st.body, size: pt(st.size.body) } } } },
      // Bullets with a hanging indent, so wrapped lines align with the text.
      numbering: { config: [{ reference: 'lu-bullets', levels: [{ level: 0, format: D.LevelFormat.BULLET, text: st.bullet, alignment: D.AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 260, hanging: 200 } }, run: { font: 'Arial', size: pt(st.size.body - 1), color: st.color } } },
        { level: 1, format: D.LevelFormat.BULLET, text: '–', alignment: D.AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 560, hanging: 200 } }, run: { font: 'Arial', size: pt(st.size.body - 1), color: st.color } } }] }] },
      sections: [{ properties: { page: { size: { width: Math.round(st.page.w * TWIP), height: Math.round(st.page.h * TWIP) },
        margin: { top: Math.round(st.margin * TWIP), bottom: Math.round(st.margin * TWIP), left: Math.round(st.margin * TWIP), right: Math.round(st.margin * TWIP) } } }, children: kids }],
    });
    return D.Packer.toBlob(doc);
  }

  // Saves the Word file to Drive (Level Up/Documents) as a Google Doc, or downloads it in test mode.
  async function createGoogleDoc(model, fileName) {
    const blob = await buildDocx(model);
    const file = new File([blob], fileName + '.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    if (core().localMode || !core().uploadToDriveFolder) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
      return { id: null, url: null, local: true, bytes: blob.size };
    }
    const r = await core().uploadToDriveFolder(file, 'Documents', { convertTo: 'application/vnd.google-apps.document', name: fileName });
    return { id: r.id, url: r.url, bytes: blob.size };
  }

  window.LU_DOCS = { DEFAULT_FORMAT, FONT_PAIRS, CSS_FONT, PALETTE, TEMPLATES, SECTION_KEYS, SECTION_TITLES, normalize, applyTemplate, styleFor, resumeModel, letterModel, tailorResume, draftLetter, buildDocx, createGoogleDoc, fmtMonth };
})();
