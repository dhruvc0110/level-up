// Level Up — Brand foundation. Plain JS: window.LU_BRAND.
// One brand kit per persona: content pillars backed by Career-profile proof,
// LinkedIn headline options and an About section. One persona is "live" on
// LinkedIn at a time. Stored in DOC.brand = { kits: { [personaId]: kit }, live }.
// Claude drafts from the record only; Dhruv edits and posts himself.
(function () {
  const core = () => window.LU_CORE;
  const career = () => core().doc().career || {};
  const LIMITS = { headline: 220, about: 2600, pillars: 5, topics: 6 };

  function store() {
    const d = core().doc();
    if (!d.brand || typeof d.brand !== 'object') d.brand = {};
    if (!d.brand.kits || typeof d.brand.kits !== 'object') d.brand.kits = {};
    return d.brand;
  }
  const changed = () => { core().markDirty(); window.dispatchEvent(new CustomEvent('lu:brand-changed')); };

  // What the kit was drafted from: when the persona changes, the kit says so.
  const personaSig = (p) => JSON.stringify(['name', 'positioning', 'skills', 'targetSectors', 'companySize', 'tone', 'toneDescriptors', 'rhythm', 'useWords', 'avoidWords'].map((k) => (p && p[k]) || null));

  function kitFor(persona) {
    const k = store().kits[persona.id];
    if (!k) return null;
    return Object.assign({}, k, { stale: k.personaSig && k.personaSig !== personaSig(persona) });
  }
  function save(personaId, kit) {
    const s = store();
    s.kits[personaId] = Object.assign({}, s.kits[personaId] || {}, kit, { updatedAt: core().nowIso() });
    changed();
    return s.kits[personaId];
  }
  function live() { return store().live || null; }
  function setLive(personaId) {
    const s = store();
    s.live = personaId ? { personaId, at: core().nowIso() } : null;
    changed();
  }
  function status(persona) {
    const k = store().kits[persona.id], l = live();
    if (l && l.personaId === persona.id) return 'live';
    return k ? 'drafted' : 'none';
  }

  // Proof for this persona: the outreach store already ranks it (lens best first).
  function proofList(personaId) {
    if (window.LU_OUTREACH && window.LU_OUTREACH.proofFor) return window.LU_OUTREACH.proofFor(personaId).slice(0, 18);
    const c = career();
    return (c.achievements || []).slice(0, 18).map((a) => ({ a, role: (c.roles || []).find((r) => r.id === a.roleId) || {} }));
  }

  const PROMPT = () => `You are a senior executive-brand strategist building one LinkedIn brand for a senior executive, for ONE of their career personas. It must be credible to executive search partners, boards and hiring CEOs.

${core().houseStyle || ''}

Rules:
- Use ONLY facts in the record below. Never invent results, numbers, employers, clients, awards or titles. If something you'd want is missing, leave it out and list it in "check".
- Do not name clients unless the proof itself names them.
- The brand must fit the persona's angle and voice, not the whole career.
- Public-facing: never say or imply the person is job hunting or "open to opportunities".

Deliver:
1. 3 to 5 content pillars: themes this persona can credibly post about and be known for. Each: a short, memorable name (2 to 5 words), one sentence on why this persona owns it, the proof items that back it (codes like "P3"), and 4 to 6 concrete post topic ideas (one line each, specific, not generic).
2. Three LinkedIn headline options, each at most 220 characters, in different styles: (a) role and outcome, (b) value proposition, (c) a crisp line with two proof points. No emoji, no hashtags.
3. A LinkedIn About section, first person, at most 2,600 characters. The first two lines (about 260 characters) must stand alone as the hook, because LinkedIn hides the rest behind "see more". Then two or three short paragraphs that tell the story with proof, then what they focus on and how people can engage (speaking, advisory, conversations), without job seeking.
4. Up to three suggestions for the LinkedIn Featured section, from what the record shows (e.g. a case study topic, a talk, a publication), only if real.

Output one JSON object and nothing else:
{ "pillars": [ { "name": "...", "why": "...", "proof": ["P1", "P4"], "topics": ["...", "..."] } ],
  "headlines": ["...", "...", "..."], "about": "...", "featured": ["..."], "check": ["anything to verify or add before publishing"] }`;

  function input(persona, opts) {
    const c = career(), person = c.person || {};
    const proof = proofList(persona.id);
    const voice = window.LU_OUTREACH && window.LU_OUTREACH.voiceBlock ? window.LU_OUTREACH.voiceBlock(persona) : '';
    const lens = window.LU_CAREER && window.LU_CAREER.lensFor ? window.LU_CAREER.lensFor(persona) : null;
    const r = lens && lens.result;
    const lines = [
      `EXECUTIVE: ${person.name || '(name not on file)'}${person.location ? ', ' + person.location : ''}`,
      person.headline && 'CURRENT LINKEDIN HEADLINE: ' + person.headline,
      (c.summaries || [])[0] && 'CURRENT SUMMARY (for facts, not wording): ' + String(c.summaries[0].text).slice(0, 1500),
      `PERSONA: ${persona.code || ''} ${persona.name}\nPositioning: ${persona.positioning || '(not written yet)'}` +
        ((persona.skills || []).length ? '\nSkills to lead with: ' + persona.skills.join(', ') : '') +
        ((persona.targetSectors || []).length ? '\nTarget sectors: ' + [].concat(persona.targetSectors).join(', ') : '') +
        (persona.companySize ? '\nTarget company size: ' + persona.companySize : ''),
      voice,
      r && `PERSONA LENS (an earlier assessment of this persona against the record): ${r.label || ''} ${r.strength ? r.strength + '/5' : ''}. ${r.verdict || ''}${(r.gaps || []).length ? '\nGaps: ' + r.gaps.map((g) => (typeof g === 'string' ? g : g.text || g.gap || '')).join('; ') : ''}`,
      'PROOF (from the career record; use only these):\n' + (proof.length ? proof.map((p, i) =>
        `P${i}: ${p.a.text}${(p.a.metrics || []).length ? ' [numbers: ' + p.a.metrics.map((m) => m.value).join(', ') + ']' : ''} (${p.role.title || ''}, ${p.role.company || ''}, ${p.role.start || ''}–${p.role.end || ''})`).join('\n') : '(none recorded yet)'),
      opts && opts.current && 'CURRENT KIT TO REVISE:\n' + JSON.stringify({ pillars: (opts.current.pillars || []).map((x) => ({ name: x.name, why: x.why, topics: x.topics })), headlines: opts.current.headlines, about: opts.current.about }),
      opts && opts.instruction && "EXECUTIVE'S INSTRUCTION: " + opts.instruction,
    ].filter(Boolean);
    return { text: lines.join('\n\n'), proof };
  }

  async function draft(persona, opts) {
    const { text, proof } = input(persona, opts);
    const model = core().modelFor ? core().modelFor('brand') : core().models.parse;
    const ask = async (extra) => {
      const resp = await core().claude(model, PROMPT(), text + (extra || ''), 6000, null, 'brand');
      const texts = (resp.content || []).filter((b) => b.type === 'text');
      return { d: core().extractJson(texts.length ? texts[texts.length - 1].text : ''), model: resp.model || model };
    };
    let r;
    try { r = await ask(); } catch (err) { if (!(err instanceof SyntaxError)) throw err; r = await ask(); }
    let d = r.d || {};
    // Hard LinkedIn limits: ask once more if anything ran over.
    const over = (d.headlines || []).some((h) => String(h).length > LIMITS.headline) || String(d.about || '').length > LIMITS.about;
    if (over) {
      try { const again = await ask(`\n\nYour previous answer broke a limit (headlines must be at most ${LIMITS.headline} characters, About at most ${LIMITS.about}). Return the full JSON again within the limits.`); d = again.d || d; } catch (err) { /* keep the first; the screen shows the counts */ }
    }
    // Codes like "P3" mean nothing to the reader: swap any that slip into the text.
    const plain = (s) => String(s == null ? '' : s).replace(/\bP(\d+)\b/g, (m, n) => (proof[+n] ? '“' + proof[+n].a.text.split(/\s+/).slice(0, 6).join(' ') + '…”' : m));
    const ids = (codes) => (Array.isArray(codes) ? codes : []).map((x) => String(x).trim()).filter((x) => /^P\d+$/.test(x)).map((x) => proof[+x.slice(1)]).filter(Boolean).map((p) => p.a.id);
    const kit = {
      pillars: (d.pillars || []).slice(0, LIMITS.pillars).map((p, i) => ({
        id: 'pl-' + Date.now().toString(36) + i, name: plain(p.name), why: plain(p.why), proof: ids(p.proof),
        topics: (p.topics || []).slice(0, LIMITS.topics).map(plain).filter(Boolean),
      })),
      headlines: (d.headlines || []).slice(0, 3).map(plain),
      headline: 0,
      about: plain(d.about),
      featured: (d.featured || []).slice(0, 3).map(plain).filter(Boolean),
      check: (d.check || []).map(plain).filter(Boolean),
      personaSig: personaSig(persona), draftedAt: core().nowIso(), model: r.model,
    };
    return save(persona.id, kit);
  }

  window.LU_BRAND = { LIMITS, kitFor, save, draft, live, setLive, status, proofList, personaSig };
})();
