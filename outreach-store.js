// Level Up — outreach notes (opportunity panel). Plain JS: window.LU_OUTREACH.
// Claude drafts one note at a time from the job, the company profile, the
// recipient, the persona's voice and the Career profile proof linked to that
// persona. It never invents facts and never sends anything.
(function () {
  const core = () => window.LU_CORE;
  const career = () => core().doc().career || {};

  const TYPES = {
    recruiter: { label: 'Recruiter reply', subject: true, guide: 'A reply to an executive search partner about this mandate. Thank them briefly, signal genuine but measured interest, offer two or three proof points that match the mandate, and propose a short call. 120 to 170 words.' },
    hiring: { label: 'Hiring-manager note', subject: true, guide: 'A direct first note to the hiring executive. Open with why this company and this role (use the company profile or recent news if it helps), give two proof points that fit their likely agenda, and close with a low-pressure ask for a conversation. 110 to 160 words.' },
    intro: { label: 'Warm-intro request', subject: true, blurb: true, guide: 'A note to someone the sender knows, asking whether they would introduce the sender to the hiring executive or the right person at the company. Respect their time, make saying yes easy, and say why the introduction makes sense. 90 to 140 words. Also write a forwardable blurb in the first person (60 to 90 words) the connection can paste into their introduction.' },
    followup: { label: 'Follow-up', subject: true, guide: 'A courteous follow-up on an earlier note that has had no reply. Add one new, useful point (a relevant result, a thought on their agenda, or recent company news) rather than repeating the first note. 60 to 100 words.' },
    linkedin: { label: 'LinkedIn connection note', subject: false, limit: 300, guide: 'A LinkedIn connection request note. Hard limit: 280 characters including spaces. One specific reason to connect, nothing else. No sign-off line beyond the first name.' },
  };

  // People this note could go to, from the opportunity.
  function recipients(opp) {
    const out = [];
    const add = (key, p, relation) => { if (p && p.name && !out.some((x) => x.name === p.name)) out.push({ key, name: p.name, title: p.title || null, relation }); };
    if (opp.contact && opp.contact.name) add('contact', opp.contact, opp.contact.warmth === 'recruiter' ? 'recruiter' : (opp.contact.warmth || 'contact'));
    const e = opp.enrichment || {};
    if (e.hiringManager) add('hm', e.hiringManager, 'hiring manager');
    (e.reachOut || []).forEach((p, i) => add('reach' + i, p, 'connection' + (p.degree ? ' (' + p.degree + ')' : '') + (p.reason ? ': ' + p.reason : '')));
    const net = window.LU_NETWORK_FOR ? window.LU_NETWORK_FOR(opp.company, e.hiringManager && e.hiringManager.name) : null;
    ((net && net.atCompany) || []).slice(0, 5).forEach((c, i) => add('net' + i, { name: c.name, title: c.title || null }, 'in your contacts' + (c.strength ? ' (' + c.strength + ')' : '')));
    return out;
  }

  // Sensible default type for a recipient.
  function suggestType(opp, r, hasSent) {
    if (hasSent) return 'followup';
    if (!r) return opp.contact && opp.contact.warmth === 'recruiter' ? 'recruiter' : 'hiring';
    if (r.relation === 'recruiter') return 'recruiter';
    if (r.relation === 'hiring manager') return 'hiring';
    if (/^connection|^in your contacts|strong|warm/.test(r.relation)) return 'intro';
    return 'hiring';
  }

  // Everything the persona says about how it sounds, for the prompt.
  const RHYTHM = { terse: 'Terse: short sentences, few words, no padding.', balanced: 'Balanced: a mix of short and medium sentences.', longform: 'Long-form: fuller sentences that connect ideas, still economical.', 'long-form': 'Long-form: fuller sentences that connect ideas, still economical.' };
  function voiceBlock(persona) {
    if (!persona) return '';
    const samples = (persona.writingSamples || []).map((x) => String(x || '').trim()).filter(Boolean).slice(0, 3);
    const parts = [
      persona.tone && 'Overall tone: ' + persona.tone,
      (persona.toneDescriptors || []).length && 'Voice: ' + persona.toneDescriptors.join(', '),
      persona.rhythm && 'Sentence rhythm: ' + (RHYTHM[String(persona.rhythm).toLowerCase()] || persona.rhythm),
      (persona.useWords || []).length && 'Words this persona reaches for (use naturally where they fit): ' + persona.useWords.join(', '),
      (persona.avoidWords || []).length && 'Words this persona never uses: ' + persona.avoidWords.join(', '),
      samples.length && 'Writing samples in this voice (match their rhythm, word choice and sentence shape, not their content):\n' + samples.map((x, i) => `[${i + 1}] ${x.slice(0, 1200)}`).join('\n'),
    ].filter(Boolean);
    return parts.length ? 'PERSONA VOICE:\n' + parts.join('\n') : '';
  }

  // Proof for this persona: the lens's best proof first, then other linked outcomes with numbers.
  function proofFor(personaId) {
    const c = career(), ach = c.achievements || [];
    const roleOf = (a) => (c.roles || []).find((r) => r.id === a.roleId) || {};
    const lens = personaId && c.personaLens && c.personaLens[personaId];
    const best = ((lens && lens.result && lens.result.best) || []).map((id) => ach.find((a) => a.id === id)).filter(Boolean);
    let linked = ach.filter((a) => !personaId || (a.personas || []).includes(personaId));
    if (!linked.length) linked = ach; // a new persona with nothing linked yet: use the whole record
    const rank = (a) => ((a.kind || 'outcome') === 'outcome' ? 2 : 0) + ((a.metrics || []).length ? 2 : 0) + (/present/i.test(roleOf(a).end || '') ? 1 : 0);
    const rest = linked.filter((a) => !best.includes(a)).sort((a, b) => rank(b) - rank(a));
    return [...best, ...rest].slice(0, 14).map((a) => ({ a, role: roleOf(a) }));
  }

  function prompt(type) {
    const t = TYPES[type];
    return `You write career outreach for a senior executive (the sender), in their voice, to be sent by them personally.

${core().houseStyle || ''}

Rules:
- Use ONLY facts given below. Never invent results, numbers, employers, clients, titles or relationships. If a fact you'd want is missing, write around it and say so in "check".
- Do not name the sender's clients unless the proof itself names them.
- Make it specific to this company, role and person; no generic praise.
- Match the persona's angle and tone where given, within the writing style above.
- ${t.subject ? 'Write a short, specific subject line.' : 'No subject line.'}
- Sign off with the sender's first name only.

Task: ${t.guide}

Output a single JSON object and nothing else:
{ "subject": ${t.subject ? '"..."' : 'null'}, "body": "the note", "blurb": ${t.blurb ? '"forwardable blurb"' : 'null'}, "used": ["P2", "P5"], "check": ["anything the sender should verify or fill in before sending"] }
"used" lists the proof items the note relies on.`;
  }

  async function draft(opp, opts) {
    const type = TYPES[opts.type] ? opts.type : 'hiring';
    const t = TYPES[type];
    const c = career(), person = c.person || {};
    const persona = (window.LU_PERSONAS || []).find((p) => p.id === opp.persona) || null;
    const to = opts.to || null;
    const e = opp.enrichment || {};
    const brief = window.LU_COMPANY ? window.LU_COMPANY(opp.company) : null;
    const proof = proofFor(persona && persona.id);
    const lines = [];
    lines.push(`SENDER: ${person.name || '(name not on file)'}${person.headline ? ' — ' + person.headline : ''}`);
    if (persona) {
      lines.push(`PERSONA (the angle for this role): ${persona.code || ''} ${persona.name}. ${persona.positioning || ''}`);
      const voice = voiceBlock(persona);
      if (voice) lines.push(voice);
    }
    lines.push(`ROLE: ${opp.role || '?'} at ${opp.company || '?'}${opp.source ? ' (found via ' + opp.source + ')' : ''}`);
    const job = [e.summary, e.location && 'Location: ' + [e.location, e.workplace].filter(Boolean).join(', '), e.industry && 'Industry: ' + e.industry, opp.notes && 'Notes: ' + String(opp.notes).slice(0, 1200)].filter(Boolean);
    if (job.length) lines.push('ABOUT THE ROLE:\n' + job.join('\n'));
    if (brief && brief.status === 'ok') {
      lines.push('COMPANY PROFILE:\n' + [brief.whatTheyDo, brief.employees && 'Employees: ' + brief.employees, brief.revenue && 'Revenue: ' + brief.revenue, brief.ownership && 'Ownership: ' + brief.ownership,
        ...(brief.recent || []).map((r) => 'Recent: ' + r)].filter(Boolean).join('\n'));
    }
    lines.push('RECIPIENT: ' + (to ? `${to.name}${to.title ? ', ' + to.title : ''} (${to.relation})` : 'not specified: write so it works for the hiring executive or search partner'));
    if (type === 'intro' && e.hiringManager) lines.push(`PERSON TO BE INTRODUCED TO: ${e.hiringManager.name}${e.hiringManager.title ? ', ' + e.hiringManager.title : ''}`);
    const sent = (opp.drafts || []).filter((d) => d.sentAt).sort((a, b) => String(b.sentAt).localeCompare(String(a.sentAt)))[0];
    if (type === 'followup' && sent) lines.push(`EARLIER NOTE (sent ${String(sent.sentAt).slice(0, 10)}${sent.to ? ' to ' + sent.to.name : ''}):\n${sent.body}`);
    lines.push('PROOF (from the sender\'s career record; use only these):\n' + (proof.length ? proof.map((p, i) =>
      `P${i}: ${p.a.text}${(p.a.metrics || []).length ? ' [numbers: ' + p.a.metrics.map((m) => m.value).join(', ') + ']' : ''} (${p.role.title || ''}, ${p.role.company || ''}, ${p.role.start || ''}–${p.role.end || ''})`).join('\n') : '(none recorded yet)'));
    if (opts.base) lines.push(`CURRENT DRAFT TO REVISE:\n${opts.base.subject ? 'Subject: ' + opts.base.subject + '\n' : ''}${opts.base.body}`);
    if (opts.instruction) lines.push(`SENDER'S INSTRUCTION: ${opts.instruction}`);

    const model = core().modelFor ? core().modelFor('outreach') : core().models.parse;
    const ask = async (extra) => {
      const resp = await core().claude(model, prompt(type), lines.join('\n\n') + (extra || ''), 3000, null, 'outreach');
      const texts = (resp.content || []).filter((b) => b.type === 'text');
      return { d: core().extractJson(texts.length ? texts[texts.length - 1].text : ''), model: resp.model || model };
    };
    let r;
    try { r = await ask(); }
    catch (err) { if (!(err instanceof SyntaxError)) throw err; r = await ask(); }
    let d = r.d;
    // LinkedIn notes have a hard 300-character limit: ask once more if it ran over.
    if (t.limit && String(d.body || '').length > t.limit) {
      try { const again = await ask(`\n\nYour previous note was ${String(d.body).length} characters. Rewrite it under 280 characters.`); d = again.d; } catch (err) { /* keep the first; the card shows the count */ }
    }
    const ids = (Array.isArray(d.used) ? d.used : []).map((s) => String(s).trim()).filter((s) => /^P\d+$/.test(s)).map((s) => proof[+s.slice(1)]).filter(Boolean).map((p) => p.a.id);
    // Codes like "P3" mean nothing to the reader: swap any that slip into the text.
    const plain = (s) => (s == null ? null : String(s).replace(/\bP(\d+)\b/g, (m, n) => (proof[+n] ? '“' + proof[+n].a.text.split(/\s+/).slice(0, 6).join(' ') + '…”' : m)));
    return {
      id: 'dr-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      type, channel: t.label, to: to ? { name: to.name, title: to.title, relation: to.relation } : null,
      subject: t.subject ? plain(d.subject) : null, body: plain(d.body) || '', blurb: t.blurb ? plain(d.blurb) : null,
      used: [...new Set(ids)], check: (Array.isArray(d.check) ? d.check : []).map(plain).filter(Boolean).slice(0, 4),
      instruction: opts.instruction || null, createdAt: core().nowIso(), model: r.model,
    };
  }

  // ── Persona curator: a real sample in this persona's voice ─────────────
  // Uses the persona as currently edited (saved or not). Runs only when asked.
  const PREVIEWS = {
    recruiter: 'A reply to an executive search partner who has approached the sender about a role that fits this persona. 110 to 150 words, with a subject line.',
    cold: 'A cold email to the CEO of a company that fits this persona\'s target size and sectors, proposing a conversation. 100 to 140 words, with a subject line.',
    linkedin: 'The opening of a LinkedIn post (first 2 to 4 lines, under 300 characters) on a theme from the proof that suits this persona. No hashtags.',
    bio: 'A short professional bio paragraph in the first person for this persona, 70 to 100 words.',
  };
  function voiceSig(persona, scenario) {
    return JSON.stringify([scenario, persona.name, persona.positioning, persona.tone, persona.toneDescriptors, persona.rhythm, persona.useWords, persona.avoidWords, persona.writingSamples, persona.companySize, persona.targetSectors, persona.skills]);
  }
  async function previewVoice(persona, scenario) {
    const task = PREVIEWS[scenario] || PREVIEWS.recruiter;
    const person = career().person || {};
    const proof = proofFor(persona.id).slice(0, 8);
    const user = [
      `SENDER: ${person.name || '(name not on file)'}`,
      `PERSONA: ${persona.name || 'Untitled'}. ${persona.positioning || ''}`,
      [persona.companySize && 'Target company size: ' + persona.companySize, (persona.targetSectors || []).length && 'Target sectors: ' + persona.targetSectors.join(', '), (persona.skills || []).length && 'Skills to lead with: ' + persona.skills.join(', ')].filter(Boolean).join('\n'),
      voiceBlock(persona),
      'PROOF (from the sender\'s career record; use only these):\n' + (proof.length ? proof.map((p, i) => `P${i}: ${p.a.text}${(p.a.metrics || []).length ? ' [numbers: ' + p.a.metrics.map((m) => m.value).join(', ') + ']' : ''}`).join('\n') : '(none recorded yet)'),
      'Task: ' + task + ' Where a company or person would be named, use a natural placeholder such as [Company] or [Name].',
    ].filter(Boolean).join('\n\n');
    const system = `You write sample text that shows how one of a senior executive's career personas sounds. The voice settings matter most: make tone, rhythm, word choices and the writing samples clearly audible, so that different personas read differently.

${core().houseStyle || ''}
(The persona's own voice settings refine this style; where they conflict, keep the persona's voice but never become flowery or curt.)

Rules: use ONLY facts in PROOF; never invent results or numbers. Sign off with the sender's first name where a sign-off fits. Never write the P codes.
Output a single JSON object and nothing else: { "text": "..." }`;
    const model = core().modelFor ? core().modelFor('outreach') : core().models.parse;
    const resp = await core().claude(model, system, user, 2000, null, 'outreach');
    const texts = (resp.content || []).filter((b) => b.type === 'text');
    const d = core().extractJson(texts.length ? texts[texts.length - 1].text : '');
    return String(d.text || '').replace(/\bP(\d+)\b/g, (m, n) => (proof[+n] ? '“' + proof[+n].a.text.split(/\s+/).slice(0, 6).join(' ') + '…”' : m));
  }

  window.LU_OUTREACH = { TYPES, recipients, suggestType, proofFor, draft, voiceBlock, previewVoice, voiceSig };
})();
