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
  const DEFAULT_FORMAT = { template: 'classic', pages: 2, spacing: 'balanced', font: 'serif', accent: 'graphite', paper: 'letter',
    contact: { location: true, email: true, phone: true, linkedin: true }, sections: { summary: true, skills: true, education: true, boards: true, credentials: true } };
  const ACCENTS = { graphite: '2B2B2B', navy: '1F3A5F', green: '2F5D50', burgundy: '6B2737' };
  function styleFor(f) {
    const fmt = Object.assign({}, DEFAULT_FORMAT, f || {});
    const sp = { compact: 0.8, balanced: 1, airy: 1.25 }[fmt.spacing] || 1;
    const serif = fmt.font === 'serif';
    return {
      fmt,
      page: fmt.paper === 'a4' ? { w: 8.27, h: 11.69 } : { w: 8.5, h: 11 },
      margin: fmt.spacing === 'compact' ? 0.6 : 0.75, // inches
      head: serif || fmt.template === 'classic' ? 'Georgia' : 'Arial',
      body: fmt.template === 'classic' && serif ? 'Georgia' : 'Arial',
      accent: fmt.template === 'modern' ? (ACCENTS[fmt.accent] || ACCENTS.navy) : '1B1B1B',
      rule: fmt.template === 'modern' ? 'accent' : 'hair',
      size: { name: 20, headline: 10.5, section: 11, body: 10, small: 9 }, // points
      gap: { section: 10 * sp, item: 5 * sp, para: 3 * sp }, // points
    };
  }

  // ── Resume model from the saved state ─────────────────────────────────
  // state: { headline, summary, roles: { roleId: { mode } }, items: { achId: { on, text } }, skills: [..], format }
  function resumeModel(state) {
    const c = career(), p = c.person || {};
    const st = styleFor(state.format);
    const contact = [st.fmt.contact.location && p.location, st.fmt.contact.email && p.email, st.fmt.contact.phone && p.phone, st.fmt.contact.linkedin && cleanUrl(p.linkedin)].filter(Boolean);
    const roles = [...(c.roles || [])].sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
    const experience = roles.map((r) => {
      const mode = (state.roles && state.roles[r.id] && state.roles[r.id].mode) || 'full';
      if (mode === 'omit') return null;
      const order = (state.order && state.order[r.id]) || [];
      const ids = [...order, ...c.achievements.filter((a) => a.roleId === r.id).map((a) => a.id).filter((id) => !order.includes(id))];
      const bullets = mode === 'brief' ? [] : ids.map((id) => state.items && state.items[id]).filter((x) => x && x.on).map((x) => x.text);
      return { title: r.title, company: r.company, dates: `${fmtMonth(r.start)} – ${fmtMonth(r.end)}`, location: r.location || '', bullets };
    }).filter(Boolean);
    const sec = st.fmt.sections;
    return {
      kind: 'resume', style: st,
      name: p.name || 'Your name', headline: state.headline || p.headline || '', contact,
      summary: sec.summary ? state.summary || '' : '',
      experience,
      skills: sec.skills ? (state.skills || []) : [],
      // School-level entries don't belong on an executive resume.
      education: sec.education ? (c.education || []).filter((e) => !/high school|secondary|matriculation|\b(ssc|hsc|cbse|icse)\b|class (x|xii|10|12)/i.test([e.degree, e.school].join(' '))).map((e) => [e.degree, e.field, e.school, e.year].filter(Boolean).join(', ')) : [],
      boards: sec.boards ? (c.boards || []).map((b) => [b.role, b.org, [fmtMonth(b.start), fmtMonth(b.end)].filter(Boolean).join(' – ')].filter(Boolean).join(', ')) : [],
      credentials: sec.credentials ? (c.credentials || []).map((x) => [x.name, x.issuer, x.year].filter(Boolean).join(', ')) : [],
    };
  }
  function letterModel(state) {
    const c = career(), p = c.person || {};
    const st = styleFor(Object.assign({}, state.format, { pages: 1 }));
    const contact = [p.location, p.email, p.phone, cleanUrl(p.linkedin)].filter(Boolean);
    return { kind: 'letter', style: st, name: p.name || 'Your name', headline: p.headline || '', contact,
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
    const TWIP = 1440, pt = (n) => Math.round(n * 2); // docx sizes are half-points
    const run = (text, o) => new D.TextRun(Object.assign({ text, font: st.body, size: pt(st.size.body), color: '1B1B1B' }, o || {}));
    const para = (children, o) => new D.Paragraph(Object.assign({ children, spacing: { after: Math.round(st.gap.para * 20) } }, o || {}));
    const ruleBorder = st.rule === 'accent' ? { bottom: { style: D.BorderStyle.SINGLE, size: 12, color: st.accent, space: 2 } } : { bottom: { style: D.BorderStyle.SINGLE, size: 4, color: '999999', space: 2 } };
    const sectionHead = (t) => para([run(t.toUpperCase(), { font: st.head, size: pt(st.size.section), bold: st.fmt.template !== 'classic', color: st.accent, characterSpacing: 20 })],
      { border: ruleBorder, spacing: { before: Math.round(st.gap.section * 20), after: Math.round(st.gap.para * 2 * 20) } });
    const kids = [];
    kids.push(para([run(model.name, { font: st.head, size: pt(st.size.name), color: st.accent })], { spacing: { after: 40 } }));
    if (model.headline) kids.push(para([run(model.headline, { size: pt(st.size.headline), color: '444444' })], { spacing: { after: 40 } }));
    if (model.contact.length) kids.push(para([run(model.contact.join('  ·  '), { size: pt(st.size.small), color: '555555' })], model.kind === 'resume' && st.rule === 'hair' ? { border: ruleBorder } : {}));
    if (model.kind === 'letter') {
      kids.push(para([run(model.date)], { spacing: { before: 360, after: 240 } }));
      if (model.recipient) kids.push(para([run(model.recipient)], { spacing: { after: 240 } }));
      kids.push(para([run(model.salutation)], { spacing: { after: 160 } }));
      model.paragraphs.forEach((t) => kids.push(para([run(t)], { spacing: { after: 160, line: 276 } })));
      kids.push(para([run(model.signoff)], { spacing: { before: 120, after: 480 } }));
      kids.push(para([run(model.signature)]));
    } else {
      if (model.summary) { kids.push(sectionHead(st.fmt.template === 'bio' ? 'Profile' : 'Summary')); kids.push(para([run(model.summary)], { spacing: { after: 60, line: 264 } })); }
      if (model.experience.length) {
        kids.push(sectionHead('Experience'));
        model.experience.forEach((x) => {
          // Title and company on the left, dates flush right: a borderless two-column table,
          // which lines up the same in Word, Google Docs and previewers.
          const full = Math.round((st.page.w - st.margin * 2) * TWIP), right = Math.round(1.9 * TWIP);
          const none = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
          const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
          const cell = (children, width, align) => new D.TableCell({ width: { size: width, type: D.WidthType.DXA }, borders: noBorders,
            margins: { top: 0, bottom: 0, left: 0, right: 0 }, children: [new D.Paragraph({ children, alignment: align, spacing: { before: Math.round(st.gap.item * 20), after: 40 }, keepNext: true })] });
          kids.push(new D.Table({ width: { size: full, type: D.WidthType.DXA }, columnWidths: [full - right, right], borders: noBorders, layout: D.TableLayoutType.FIXED,
            rows: [new D.TableRow({ cantSplit: true, children: [
              cell([run(x.title, { bold: true }), run('  ·  ' + x.company)], full - right, D.AlignmentType.LEFT),
              cell([run(x.dates, { size: pt(st.size.small), color: '555555' })], right, D.AlignmentType.RIGHT)] })] }));
          x.bullets.forEach((b) => kids.push(para([run(b)], { numbering: { reference: 'lu-bullets', level: 0 }, spacing: { after: Math.round(st.gap.para * 20), line: 252 } })));
        });
      }
      const list = (title, items, joiner) => { if (!items.length) return; kids.push(sectionHead(title)); if (joiner) kids.push(para([run(items.join(joiner))])); else items.forEach((t) => kids.push(para([run(t)]))); };
      list('Skills and expertise', model.skills, '  ·  ');
      list('Education', model.education);
      list('Board and advisory', model.boards);
      list('Certifications and awards', model.credentials);
    }
    const doc = new D.Document({
      creator: model.name, title: model.kind === 'letter' ? 'Cover letter' : 'Resume',
      styles: { default: { document: { run: { font: st.body, size: pt(st.size.body) } } } },
      // Small round bullets with a hanging indent, so wrapped lines align with the text.
      numbering: { config: [{ reference: 'lu-bullets', levels: [{ level: 0, format: D.LevelFormat.BULLET, text: '\u2022', alignment: D.AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 260, hanging: 200 } }, run: { font: 'Arial', size: pt(st.size.body - 1), color: st.accent } } }] }] },
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

  window.LU_DOCS = { DEFAULT_FORMAT, ACCENTS, styleFor, resumeModel, letterModel, tailorResume, draftLetter, buildDocx, createGoogleDoc, fmtMonth };
})();
