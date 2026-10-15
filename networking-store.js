// Level Up — Outreach for networking (not tied to an opportunity). Plain JS:
// window.LU_NETWORKING. People come from Network contacts plus anyone added
// here; drafting is a conversation with Claude next to the current draft.
// Data: DOC.networking = { people: { [contactId]: person } } — kept apart from
// DOC.contacts so a Google Contacts sync can never wipe the history.
// person = { name, title, company, linkedinUrl (snapshot), group?, context, profile?,
//            threads: [thread], log: [{ at, purpose, channel, text }], lastSentAt }
// thread = { id, purpose, channel, viaId, lenses, messages: [{ role, text, at, v }], drafts: [{ subject, body, blurb, at }], sentAt, createdAt }
(function () {
  const core = () => window.LU_CORE;
  const career = () => core().doc().career || {};
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const DAY = 864e5;

  const PURPOSES = {
    reconnect: { label: 'Reconnect', guide: 'Reconnect after a long gap. Warm, specific to what you shared or what they are doing now, no agenda beyond catching up; suggest a short call or coffee if natural.' },
    congratulate: { label: 'Congratulate', guide: 'Congratulate them on a specific recent change or achievement. Genuine and brief; one line on why it matters; no ask.' },
    insight: { label: 'Share an insight', guide: 'Share one specific, useful insight, article or post of the sender that fits their world, with one line on why you thought of them. Light ask at most.' },
    advice: { label: 'Ask for advice', guide: 'Ask for their perspective on one specific question where they have real expertise. Respectful of time; make it easy to say yes to a short call.' },
    help: { label: 'Offer help', guide: 'Offer something concrete the sender can help with (an introduction, a perspective, a resource) based on what they are working on.' },
    introduce: { label: 'Introduce myself', guide: 'A first note to someone the sender does not know yet (often a search partner or a peer). Why them, who the sender is in one or two proof-backed lines, and a low-pressure reason to connect.' },
    intro: { label: 'Intro request via a contact', blurb: true, guide: 'Ask the contact (the recipient) to introduce the sender to the target person. Respect their time, say why the introduction makes sense, make saying yes easy. Also write a forwardable blurb in the first person (60 to 90 words) they can paste into the introduction.' },
    followup: { label: 'Follow-up', guide: 'A courteous follow-up on the earlier message in the history. Add one new, useful point rather than repeating it.' },
  };
  const CHANNELS = {
    connect: { label: 'LinkedIn connection note', limit: 300, guide: 'A LinkedIn connection request note. Hard limit 280 characters including spaces. One specific reason to connect. No subject.' },
    linkedin: { label: 'LinkedIn message', guide: 'A LinkedIn message: 50 to 140 words, conversational, no subject line.' },
    email: { label: 'Email', subject: true, guide: 'An email: 80 to 180 words with a short, specific subject line.' },
  };

  function store() {
    const d = core().doc();
    if (!d.networking || typeof d.networking !== 'object') d.networking = {};
    if (!d.networking.people || typeof d.networking.people !== 'object') d.networking.people = {};
    return d.networking;
  }
  const changed = () => { core().markDirty(); window.dispatchEvent(new CustomEvent('lu:networking-changed')); };

  function contact(id) { return (core().doc().contacts || []).find((c) => c.id === id) || null; }
  function person(id) {
    const p = store().people[id], c = contact(id);
    if (!p && !c) return null;
    return Object.assign({ threads: [], log: [] }, c ? { name: c.name, title: c.title, company: c.company, linkedinUrl: c.linkedinUrl, strength: c.strength, lastContactedAt: c.lastContactedAt, email: c.email, notes: c.notes, source: c.source } : {}, p || {}, { id });
  }
  function savePerson(id, patch) {
    const s = store(), c = contact(id);
    const base = s.people[id] || { threads: [], log: [], name: c && c.name, title: c && c.title, company: c && c.company };
    s.people[id] = Object.assign(base, patch, { updatedAt: core().nowIso() });
    changed();
    return person(id);
  }

  // ── Groups ──
  const SEARCH = /\b(spencer stuart|korn ?ferry|heidrick|russell reynolds|egon zehnder|odgers|boyden|diversified search|hunt scanlon|executive search|search partner|recruit|talent acquisition|headhunt)/i;
  const GROUPS = { reconnect: 'Reconnect', search: 'Search partners', peers: 'Target peers', new: 'New people', all: 'Everyone' };
  function lastTouch(p) {
    const t = [p.lastContactedAt, p.lastSentAt].filter(Boolean).map((x) => new Date(x).getTime()).filter((x) => !isNaN(x));
    return t.length ? Math.max(...t) : null;
  }
  function groupOf(p, pipelineCos) {
    if (p.group) return p.group;
    if (p.strength === 'recruiter' || SEARCH.test([p.title, p.company].join(' '))) return 'search';
    if (p.company && pipelineCos.has(String(p.company).toLowerCase().trim())) return 'peers';
    if (p.source === 'Outreach') return 'new';
    const t = lastTouch(p);
    if ((p.strength === 'strong' || p.strength === 'warm') && (!t || Date.now() - t > 180 * DAY)) return 'reconnect';
    return 'other';
  }
  function everyone() {
    const ids = new Set([...(core().doc().contacts || []).map((c) => c.id), ...Object.keys(store().people)]);
    const pipelineCos = new Set((core().doc().opportunities || []).map((o) => String(o.company || '').toLowerCase().trim()).filter(Boolean));
    return [...ids].map(person).filter((p) => p && p.name).map((p) => Object.assign(p, { groupKey: groupOf(p, pipelineCos), touch: lastTouch(p) }));
  }

  // ── Add a person (link + pasted profile text or details) ──
  const EXTRACT_PROMPT = `You read text copied from a LinkedIn profile (or notes about a person) for a senior executive who wants to network with them. Extract the facts and what the two have in common.

Output one JSON object and nothing else:
{ "name": "...", "title": "current title" | null, "company": "current employer" | null, "location": "..." | null,
  "summary": "max 40 words: who they are and what they focus on",
  "common": ["specific things they share with the executive: same past employers, schools, industries, clients or topics — only if both records show it"],
  "group": "search" | "peers" | "new" }
group is "search" for executive search or recruiting, "peers" for executives in the same field, otherwise "new". Never invent facts.`;
  async function addPerson(input) {
    const url = String(input.linkedinUrl || '').trim().split('?')[0] || null;
    let facts = { name: input.name, title: input.title, company: input.company };
    let profile = null, model;
    if (input.profileText && input.profileText.trim().length > 40) {
      const c = career(), me = c.person || {};
      const mine = `EXECUTIVE: ${me.name || ''}. Roles: ${(c.roles || []).map((r) => `${r.title} at ${r.company}`).join('; ')}. Education: ${(c.education || []).map((e) => e.school).filter(Boolean).join('; ')}.`;
      const r = await ask(EXTRACT_PROMPT, `${mine}\n\nPROFILE TEXT:\n${input.profileText.slice(0, 12000)}`, 1200);
      model = r.model;
      const d = r.d || {};
      facts = { name: input.name || d.name, title: input.title || d.title, company: input.company || d.company };
      profile = { summary: d.summary || null, common: Array.isArray(d.common) ? d.common.slice(0, 6) : [], location: d.location || null, group: d.group || null };
    }
    if (!facts.name || !String(facts.name).trim()) throw new Error('Add a name, or paste their profile text so Claude can read it.');
    // Already a contact? Match on the profile link, then on the name.
    const contacts = core().doc().contacts || [];
    const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    let c = (url && contacts.find((x) => x.linkedinUrl && x.linkedinUrl.split('?')[0] === url)) || contacts.find((x) => norm(x.name) === norm(facts.name));
    if (!c) {
      c = { id: 'nw-' + Date.now().toString(36), name: String(facts.name).trim(), title: facts.title || null, company: facts.company || null, email: input.email || null, phone: null,
        strength: input.group === 'search' ? 'recruiter' : 'cold', personas: [], opportunities: [], lastContacted: 'never', lastContactedAt: null, source: 'Outreach', notes: null, linkedinUrl: url };
      contacts.push(c);
      window.LU_CONTACTS = contacts;
    } else {
      c.linkedinUrl = c.linkedinUrl || url; c.title = c.title || facts.title || null; c.company = c.company || facts.company || null;
    }
    const group = input.group && input.group !== 'auto' ? input.group : (profile && profile.group && c.source === 'Outreach' ? profile.group : undefined);
    savePerson(c.id, Object.assign({ name: c.name, title: c.title, company: c.company, linkedinUrl: c.linkedinUrl, context: input.context || (store().people[c.id] || {}).context || '' },
      profile ? { profile, profileModel: model } : {}, group ? { group } : {}));
    return c.id;
  }

  // ── Drafting conversation ──
  const SYSTEM = () => `You help a senior executive write networking messages, in their voice, which they send themselves. You work as a collaborator in a chat: they ask for changes or your view, you explain briefly and give the updated draft.

${core().houseStyle || ''}

Rules:
- Use ONLY facts given: the sender's proof, the person's details and the shared history. Never invent results, numbers, relationships, meetings or shared history. If something would help but is missing, say so in your reply.
- Never write proof codes (P1, P2…) in the message.
- Never say or imply the sender is job hunting unless the sender explicitly asks for it. With search partners, frame it as building a relationship and sharing focus areas.
- Do not name the sender's clients unless the proof itself names them.
- Respect the channel's length and format. Sign off with the sender's first name only (not in connection notes).
- If persona lenses are given, express the sender through those roles' perspective and vocabulary, woven in naturally.
- If the sender only asks a question, answer it and return "draft": null unless a change is clearly wanted.

Output one JSON object and nothing else:
{ "reply": "1 to 3 sentences to the sender: what you did and why, or your answer", "draft": { "subject": "..." | null, "body": "...", "blurb": "..." | null } | null }`;

  function proofList() {
    if (window.LU_OUTREACH && window.LU_OUTREACH.proofFor) return window.LU_OUTREACH.proofFor(null).slice(0, 14);
    return [];
  }
  function lensText(ids) {
    const ps = (window.LU_PERSONAS || []).filter((p) => (ids || []).includes(p.id));
    if (!ps.length) return '';
    const voice = window.LU_OUTREACH && window.LU_OUTREACH.voiceBlock ? window.LU_OUTREACH.voiceBlock : () => '';
    return 'PERSONA LENSES (express the sender through these roles):\n' + ps.map((p) => `- ${p.name}: ${p.positioning || ''}${voice(p) ? '\n  ' + voice(p).replace(/\n/g, '\n  ') : ''}`).join('\n');
  }
  function context(p, t) {
    const c = career(), me = c.person || {};
    const proof = proofList();
    const via = t.viaId ? person(t.viaId) : null;
    const P = PURPOSES[t.purpose] || PURPOSES.reconnect, C = CHANNELS[t.channel] || CHANNELS.linkedin;
    const touch = lastTouch(p);
    const posts = (window.LU_BRAND && window.LU_BRAND.posts ? window.LU_BRAND.posts() : []).filter((x) => x.status === 'posted').slice(0, 4);
    return [
      `SENDER: ${me.name || '(name not on file)'}${me.headline ? ' — ' + me.headline : ''}`,
      `RECIPIENT: ${p.name}${p.title ? ', ' + p.title : ''}${p.company ? ' at ' + p.company : ''}` +
        (p.strength ? `\nRelationship: ${p.strength}` : '') + (touch ? `\nLast touch: ${new Date(touch).toISOString().slice(0, 10)}` : '\nLast touch: none recorded') +
        (p.context ? '\nHow the sender knows them / why reach out: ' + p.context : '') +
        (p.profile && p.profile.summary ? '\nAbout them: ' + p.profile.summary : '') +
        (p.profile && (p.profile.common || []).length ? '\nIn common: ' + p.profile.common.join('; ') : '') +
        (p.notes ? '\nNotes: ' + String(p.notes).slice(0, 600) : ''),
      (p.log || []).length && 'HISTORY (earlier messages the sender sent):\n' + p.log.slice(0, 4).map((l) => `${String(l.at).slice(0, 10)} · ${(PURPOSES[l.purpose] || {}).label || l.purpose} · ${(CHANNELS[l.channel] || {}).label || l.channel}: ${String(l.text).slice(0, 400)}`).join('\n'),
      via && `INTRODUCTION TARGET: ${via.name}${via.title ? ', ' + via.title : ''}${via.company ? ' at ' + via.company : ''}${via.context ? ' (' + via.context + ')' : ''}`,
      `PURPOSE: ${P.label}. ${P.guide}`,
      `CHANNEL: ${C.label}. ${C.guide}`,
      lensText(t.lenses),
      posts.length && 'SENDER\'S RECENT LINKEDIN POSTS (can be shared if relevant):\n' + posts.map((x) => '- ' + String(x.title || x.body).split('\n')[0].slice(0, 160)).join('\n'),
      'SENDER\'S PROOF (from their career record):\n' + (proof.length ? proof.map((x, i) => `P${i}: ${x.a.text} (${x.role.title || ''}, ${x.role.company || ''})`).join('\n') : '(none recorded yet)'),
    ].filter(Boolean).join('\n\n');
  }

  async function ask(system, user, max) {
    const model = core().modelFor ? core().modelFor('networking') : core().models.parse;
    const once = async () => {
      const resp = await core().claude(model, system, user, max, null, 'networking');
      const texts = (resp.content || []).filter((b) => b.type === 'text');
      return { d: core().extractJson(texts.length ? texts[texts.length - 1].text : '') || {}, model: resp.model || model };
    };
    try { return await once(); } catch (err) { if (!(err instanceof SyntaxError)) throw err; return once(); }
  }
  const strip = (s) => (s == null ? null : String(s).replace(/\s*[([]\s*P\d+(?:\s*[,;&]\s*P\d+)*\s*[)\]]/g, '').replace(/\bP\d+\b/g, '').replace(/[ \t]{2,}/g, ' ').replace(/ +([.,;:!?])/g, '$1').trim());

  function thread(personId, threadId) { const p = person(personId); return p && (p.threads || []).find((t) => t.id === threadId); }
  function startThread(personId, purpose, channel, viaId) {
    const p = person(personId);
    const t = { id: uid('th-'), purpose: purpose || 'reconnect', channel: channel || 'linkedin', viaId: viaId || null, lenses: [], messages: [], drafts: [], sentAt: null, createdAt: core().nowIso() };
    savePerson(personId, { threads: [t, ...((store().people[personId] || {}).threads || p.threads || [])] });
    return t.id;
  }
  function updateThread(personId, threadId, patch) {
    const p = store().people[personId];
    if (!p) return null;
    p.threads = (p.threads || []).map((t) => (t.id === threadId ? Object.assign({}, t, patch) : t));
    p.updatedAt = core().nowIso();
    changed();
    return thread(personId, threadId);
  }

  // One chat turn: the sender's message (empty for the first draft) → Claude's reply + updated draft.
  async function say(personId, threadId, text, opts) {
    const o = opts || {};
    let t = thread(personId, threadId);
    if (!t) throw new Error('Conversation not found.');
    const now = core().nowIso();
    const lenses = o.lenses || t.lenses || [];
    const msgs = text ? [...t.messages, { role: 'user', text, at: now }] : t.messages;
    t = updateThread(personId, threadId, { messages: msgs, lenses });
    const p = person(personId), C = CHANNELS[t.channel] || CHANNELS.linkedin;
    const draft = t.drafts[t.drafts.length - 1];
    const convo = msgs.slice(-12).map((m) => `${m.role === 'user' ? 'SENDER' : 'YOU'}: ${m.text}`).join('\n');
    const user = context(p, t) + '\n\n' + (draft ? `CURRENT DRAFT (version ${t.drafts.length}):\n${draft.subject ? 'Subject: ' + draft.subject + '\n' : ''}${draft.body}${draft.blurb ? '\n\nBlurb: ' + draft.blurb : ''}` : 'No draft yet: write the first draft.') +
      (convo ? '\n\nCONVERSATION SO FAR:\n' + convo : '');
    let r = await ask(SYSTEM(), user, 2500);
    let d = r.d;
    // Connection notes have a hard 300-character limit.
    if (C.limit && d.draft && String(d.draft.body || '').length > C.limit) {
      try { const again = await ask(SYSTEM(), user + `\n\nYour draft was ${String(d.draft.body).length} characters; rewrite it under 280.`, 2500); if (again.d && again.d.draft) d = again.d; } catch (e) { /* keep; the counter shows it */ }
    }
    const nd = d.draft && d.draft.body ? { subject: C.subject ? strip(d.draft.subject) : null, body: strip(d.draft.body), blurb: (PURPOSES[t.purpose] || {}).blurb ? strip(d.draft.blurb) : null, at: core().nowIso() } : null;
    const drafts = nd ? [...t.drafts, nd] : t.drafts;
    return updateThread(personId, threadId, {
      drafts, model: r.model,
      messages: [...msgs, { role: 'assistant', text: strip(d.reply) || (nd ? 'Here is the draft.' : 'Noted.'), at: core().nowIso(), v: nd ? drafts.length : null }],
    });
  }
  function editDraft(personId, threadId, patch) {
    const t = thread(personId, threadId);
    if (!t || !t.drafts.length) return null;
    const drafts = t.drafts.slice();
    drafts[drafts.length - 1] = Object.assign({}, drafts[drafts.length - 1], patch, { edited: true });
    return updateThread(personId, threadId, { drafts });
  }
  function restoreVersion(personId, threadId, i) {
    const t = thread(personId, threadId);
    if (!t || !t.drafts[i]) return null;
    return updateThread(personId, threadId, { drafts: [...t.drafts, Object.assign({}, t.drafts[i], { at: core().nowIso(), restoredFrom: i + 1 })],
      messages: [...t.messages, { role: 'assistant', text: `Restored version ${i + 1}.`, at: core().nowIso(), v: t.drafts.length + 1 }] });
  }
  function copyText(t) {
    const d = t.drafts[t.drafts.length - 1];
    if (!d) return '';
    return [d.subject ? 'Subject: ' + d.subject + '\n' : '', d.body, d.blurb ? '\n\n— Forwardable blurb —\n' + d.blurb : ''].join('');
  }
  function markSent(personId, threadId) {
    const t = thread(personId, threadId);
    if (!t || !t.drafts.length) return null;
    const at = core().nowIso(), d = t.drafts[t.drafts.length - 1];
    const p = store().people[personId];
    p.log = [{ at, purpose: t.purpose, channel: t.channel, text: (d.subject ? d.subject + ' — ' : '') + d.body }, ...(p.log || [])];
    p.lastSentAt = at;
    return updateThread(personId, threadId, { sentAt: at });
  }
  function removeThread(personId, threadId) {
    const p = store().people[personId];
    if (!p) return;
    p.threads = (p.threads || []).filter((t) => t.id !== threadId);
    changed();
  }

  window.LU_NETWORKING = { PURPOSES, CHANNELS, GROUPS, everyone, person, savePerson, addPerson, startThread, thread, say, editDraft, restoreVersion, copyText, markSent, removeThread, lastTouch };
})();
