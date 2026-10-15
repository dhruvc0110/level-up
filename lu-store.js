// Level Up — serverless data layer.
//
// Replaces the old Python backend. Everything runs in the browser:
//   • Google sign-in (Google Identity Services token flow, no client secret)
//   • Data = one JSON file "levelup-data.json" in a "Level Up" folder in the
//     user's own Google Drive (drive.file scope: the app only sees files it created)
//   • Gmail / Contacts / Calendar read directly from Google APIs
//   • Claude called directly from the browser with the user's own key
//
// The screens still call LU_API.get/put/post/delete('/api/...'). This file
// answers those calls locally, so the React components stay unchanged.
//
// Test mode: add ?local=1 to the URL → no Google, data kept in this browser
// (localStorage). Optional &seed=<url> loads a backup JSON on first run.

(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────
  const CONFIG = {
    clientId: '576969007357-tth0h4dvfolm8m2p5k63umku0u8vj1jq.apps.googleusercontent.com',
    scopes: [
      'openid', 'email',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/contacts.readonly',
      'https://www.googleapis.com/auth/calendar.readonly',
    ].join(' '),
    folderName: 'Level Up',
    fileName: 'levelup-data.json',
    parseModel: 'claude-sonnet-5-5',
    testModel: 'claude-haiku-5-5',
    calendarLookbackDays: 365,
  };

  // House style for every text Claude writes that Dhruv reads or sends (outreach,
  // persona lens, resumes). Dhruv's direction, 2026-10-11.
  const HOUSE_STYLE = `Writing style: professional and precise, but never curt. Warm and considerate toward the reader, but not verbose or flowery. Articulate, with a little creativity in the phrasing, yet businesslike and to the point. Plain words over jargon. No clichés or filler ("I hope this finds you well", "passionate", "excited to", "synergy", "leverage", "reach out to touch base"). No exclamation marks. Short paragraphs; every sentence earns its place.`;

  // Claude models Dhruv can pick per task (Settings → Claude models & usage).
  // Prices are USD per million tokens (platform.claude.com/docs/en/about-claude/pricing,
  // checked 2026-10-11): input, output, 5-minute cache write, cache read.
  // OpenAI and Google models (added 2026-10-15) use their own keys; prices from
  // developers.openai.com and ai.google.dev (checked 2026-10-15). Gemini prices are
  // introductory: Argon $4/$20 from 1 Dec 2026, Flash $1.50/$7.50 from 1 Jan 2027.
  const MODELS = {
    haiku:  { id: 'claude-haiku-5-5',  provider: 'anthropic', label: 'Claude Haiku 5.5',  note: 'fastest, cheapest', price: { in: 0.10, out: 0.50, cw: 0.125, cr: 0.01 } },
    sonnet: { id: 'claude-sonnet-5-5', provider: 'anthropic', label: 'Claude Sonnet 5.5', note: 'balanced',          price: { in: 2,    out: 10,   cw: 2.50,  cr: 0.10 } },
    opus:   { id: 'claude-opus-5-5',   provider: 'anthropic', label: 'Claude Opus 5.5',   note: 'most capable',      price: { in: 4,    out: 20,   cw: 5,     cr: 0.20 } },
    luna:   { id: 'gpt-6-luna',        provider: 'openai',    label: 'GPT-6 Luna',        note: 'OpenAI, fast and cheap', price: { in: 0.10, out: 0.50, cw: 0.125, cr: 0.01 } },
    astra:  { id: 'gpt-6-astra',       provider: 'openai',    label: 'GPT-6 Astra',       note: 'OpenAI flagship',   price: { in: 10,   out: 50,   cw: 12.5,  cr: 1 } },
    flash:  { id: 'gemini-3.8-flash',  provider: 'google',    label: 'Gemini 3.8 Flash',  note: 'Google, fast',      price: { in: 0.75, out: 3.75, cw: 0,     cr: 0.075 } },
    argon:  { id: 'gemini-4-argon',    provider: 'google',    label: 'Gemini 4 Argon',    note: 'Google flagship',   price: { in: 2,    out: 10,   cw: 0,     cr: 0.20 } },
  };
  const PROVIDERS = {
    anthropic: { label: 'Claude (Anthropic)', keyField: 'anthropicApiKey', test: 'haiku' },
    openai:    { label: 'OpenAI',             keyField: 'openaiApiKey',    test: 'luna' },
    google:    { label: 'Google Gemini',      keyField: 'geminiApiKey',    test: 'flash' },
  };
  // Jobs only Claude can do here: web search (company profiles) and reading PDFs (resume import).
  const CLAUDE_ONLY = ['company', 'career', 'test'];
  const hasKey = (provider) => !!(DOC && DOC.settings && DOC.settings[PROVIDERS[provider].keyField]);
  const usable = (key, task) => MODELS[key] && hasKey(MODELS[key].provider) && !(CLAUDE_ONLY.includes(task) && MODELS[key].provider !== 'anthropic');
  // A drafting screen can pick a model for the rest of this visit (not saved).
  const SESSION_MODEL = {};
  const WEB_SEARCH_USD = 0.01; // per search
  // Each task Level Up sends to Claude. `typical` is a rough per-call size, used
  // for the cost hint until real calls have been counted.
  const TASKS = {
    gmail:    { label: 'Reading Gmail emails',        def: 'sonnet', typical: { in: 1800,  out: 300 } },
    linkedin: { label: 'Reading LinkedIn jobs',       def: 'sonnet', typical: { in: 3500,  out: 900 } },
    company:  { label: 'Company profiles (web search)', def: 'sonnet', typical: { in: 20000, out: 900, searches: 3 } },
    career:   { label: 'Reading resumes',             def: 'sonnet', typical: { in: 9000,  out: 7000 } },
    dupes:    { label: 'Duplicate checks',            def: 'haiku',  typical: { in: 2500,  out: 800 } },
    tagging:  { label: 'Linking proof to personas',   def: 'haiku',  typical: { in: 9000,  out: 1500 } },
    lens:     { label: 'Persona strength and gaps',   def: 'sonnet', typical: { in: 8000,  out: 1800 } },
    outreach: { label: 'Outreach notes',              def: 'sonnet', typical: { in: 6000,  out: 900 } },
    documents: { label: 'Resumes and cover letters',  def: 'sonnet', typical: { in: 12000, out: 3500 } },
    brand:    { label: 'Brand posts and ideas',       def: 'sonnet', typical: { in: 5000,  out: 1200 } },
    networking: { label: 'Networking messages',       def: 'sonnet', typical: { in: 4500,  out: 700 } },
    test:     { label: 'Key tests',                   def: 'haiku',  hidden: true, typical: { in: 20, out: 5 } },
  };
  function modelKeyFor(task) {
    if (usable(SESSION_MODEL[task], task)) return SESSION_MODEL[task];
    const pick = DOC && DOC.settings && DOC.settings.models && DOC.settings.models[task];
    return usable(pick, task) ? pick : (TASKS[task] ? TASKS[task].def : 'sonnet');
  }
  function modelFor(task) { return MODELS[modelKeyFor(task)].id; }
  function priceOf(modelId) {
    const m = Object.values(MODELS).find((x) => x.id === modelId || (modelId || '').startsWith(x.id));
    return m ? m.price : MODELS.sonnet.price;
  }
  function costOf(modelId, u) {
    const p = priceOf(modelId);
    return ((u.in || 0) * p.in + (u.out || 0) * p.out + (u.cw || 0) * p.cw + (u.cr || 0) * p.cr) / 1e6 + (u.searches || 0) * WEB_SEARCH_USD;
  }
  // Running totals per month and task, saved with the data so every device sees them.
  function recordUsage(task, modelId, usage) {
    if (!usage || !DOC) return;
    const u = {
      in: usage.input_tokens || 0, out: usage.output_tokens || 0,
      cw: usage.cache_creation_input_tokens || 0, cr: usage.cache_read_input_tokens || 0,
      searches: (usage.server_tool_use && usage.server_tool_use.web_search_requests) || 0,
    };
    const p = priceOf(modelId);
    const cost = costOf(modelId, u);
    // What the same call would have cost with no caching at all.
    const saved = ((u.cw + u.cr) * p.in - u.cw * p.cw - u.cr * p.cr) / 1e6;
    const month = nowIso().slice(0, 7);
    DOC.usage = DOC.usage || {};
    const m = DOC.usage[month] = DOC.usage[month] || {};
    const t = m[task || 'other'] = m[task || 'other'] || { calls: 0, in: 0, out: 0, cw: 0, cr: 0, searches: 0, cost: 0, saved: 0, models: {} };
    t.calls++; t.in += u.in; t.out += u.out; t.cw += u.cw; t.cr += u.cr; t.searches += u.searches;
    t.cost += cost; t.saved += saved;
    t.models[modelId] = (t.models[modelId] || 0) + 1;
    const prov = (Object.values(MODELS).find((x) => x.id === modelId || (modelId || '').startsWith(x.id)) || {}).provider || 'anthropic';
    t.byProvider = t.byProvider || {}; t.byProvider[prov] = (t.byProvider[prov] || 0) + cost;
    markDirty();
    window.dispatchEvent(new CustomEvent('lu:usage-changed'));
  }

  const params = new URLSearchParams(window.location.search);
  const LOCAL_MODE = params.get('local') === '1';

  // The LinkedIn bookmark opens "#view=inbox&lijobs=<json>" (Saved list) or
  // "#…&lijob=<json>" (one job page). The part after "#" never leaves the
  // browser. Each payload goes straight into a queue in this browser's storage
  // and is removed only once processed, so a sign-in screen, a closed window or
  // a second click arriving mid-import can't lose jobs.
  const LS_LI_QUEUE = 'lu_linkedin_queue';
  const memQueue = []; // used only if browser storage is blocked or full
  function readQueue() {
    let q = [];
    try { q = JSON.parse(localStorage.getItem(LS_LI_QUEUE) || '[]') || []; } catch (e) { q = []; }
    return q.concat(memQueue.filter((m) => !q.some((x) => x.qid === m.qid)));
  }
  function enqueue(kind, data) {
    const item = { qid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind, data, at: Date.now() };
    try {
      const q = JSON.parse(localStorage.getItem(LS_LI_QUEUE) || '[]') || [];
      q.push(item);
      localStorage.setItem(LS_LI_QUEUE, JSON.stringify(q));
    } catch (e) { memQueue.push(item); }
  }
  function dequeue(qid) {
    try { localStorage.setItem(LS_LI_QUEUE, JSON.stringify((JSON.parse(localStorage.getItem(LS_LI_QUEUE) || '[]') || []).filter((x) => x.qid !== qid))); } catch (e) { /* storage blocked */ }
    const i = memQueue.findIndex((x) => x.qid === qid);
    if (i >= 0) memQueue.splice(i, 1);
  }
  function takeLinkedInPayload() {
    const m = window.location.hash.match(/(?:^#|&)lijobs=([^&]*)/);
    const d = window.location.hash.match(/(?:^#|&)lijob=([^&]*)/);
    if (!m && !d) return false;
    try { if (m) { const j = JSON.parse(decodeURIComponent(m[1])); if (Array.isArray(j)) enqueue('list', j); } } catch (e) { /* malformed */ }
    try { if (d) { const j = JSON.parse(decodeURIComponent(d[1])); if (j && j.id) enqueue('job', j); } } catch (e) { /* malformed */ }
    const rest = window.location.hash.replace(/&?lijobs?=[^&]*/g, '').replace(/^#&/, '#');
    history.replaceState(history.state, '', window.location.pathname + window.location.search + (rest === '#' ? '' : rest));
    return true;
  }
  takeLinkedInPayload();
  // If Level Up is already open in the bookmark's window, the next click only
  // changes the address after "#" (no reload), so pick jobs up from that too.
  let APP_READY = false;
  window.addEventListener('hashchange', () => { if (takeLinkedInPayload()) processQueue(); });

  // ── One active Level Up per browser ─────────────────────────────────────
  // Two open copies would each save their own version and overwrite the other.
  // A newly opened copy asks the others to save and pause first.
  const TAB_ID = Math.random().toString(36).slice(2);
  let PASSIVE = false, RELEASING = false;
  const BC = ('BroadcastChannel' in window) ? new BroadcastChannel('levelup-' + (LOCAL_MODE ? 'local' : 'drive')) : null;
  if (BC) {
    BC.addEventListener('message', async (e) => {
      const msg = e.data || {};
      if (msg.type !== 'claim' || msg.tab === TAB_ID || !APP_READY || PASSIVE || RELEASING) return;
      BC.postMessage({ type: 'busy', to: msg.tab });
      RELEASING = true;
      try { await flush(); } catch (err) { /* best effort */ }
      PASSIVE = true;
      BC.postMessage({ type: 'released', to: msg.tab });
      showPaused();
    });
  }
  async function claimActive() {
    if (!BC) return;
    let busy = 0, released = 0;
    const on = (e) => { const m = e.data || {}; if (m.to !== TAB_ID) return; if (m.type === 'busy') busy++; if (m.type === 'released') released++; };
    BC.addEventListener('message', on);
    BC.postMessage({ type: 'claim', tab: TAB_ID });
    await new Promise((r) => setTimeout(r, 250));
    const t0 = Date.now();
    while (released < busy && Date.now() - t0 < 8000) await new Promise((r) => setTimeout(r, 100));
    BC.removeEventListener('message', on);
  }
  function showPaused() {
    const o = document.createElement('div');
    o.style.cssText = 'position:fixed;inset:0;z-index:100000;background:var(--bg-0);color:var(--ink-1);display:flex;align-items:center;justify-content:center;padding:32px;font:14px/1.55 Geist,-apple-system,sans-serif;';
    o.innerHTML = '<div style="max-width:420px;text-align:center"><div style="font-family:Newsreader,Georgia,serif;font-size:24px;margin-bottom:10px">Level Up is open in another window</div>'
      + '<p style="color:var(--ink-2);margin:0 0 20px">This copy is paused so the two can\'t overwrite each other. Everything you did here was saved.</p>'
      + '<button style="' + BTN_PRIMARY + '">Use Level Up here</button></div>';
    o.querySelector('button').onclick = () => window.location.reload();
    document.body.appendChild(o);
  }

  const LS_TOKEN = 'lu_google_token';
  const LS_ACCOUNT = 'lu_google_account'; // last signed-in email: skips the consent screen on renewals
  const LS_LOCAL_DOC = 'lu_local_doc';

  // ── Static config the screens expect ────────────────────────────────────
  window.LU_STAGES = [
    { id: 'discovered',    label: 'Discovered',       short: '01' },
    { id: 'evaluating',    label: 'Evaluating',       short: '02' },
    { id: 'applied',       label: 'Applied',          short: '03' },
    { id: 'conversations', label: 'In Conversations', short: '04' },
    { id: 'decision',      label: 'Decision',         short: '05' },
  ];
  window.LU_TODAY = new Date();
  window.LU_PERSONAS = [];
  window.LU_OPPORTUNITIES = [];
  window.LU_CONTACTS = [];
  window.LU_POSTS = [];
  window.LU_THEMES = [];

  // ── Small helpers ───────────────────────────────────────────────────────
  const nowIso = () => new Date().toISOString();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const SAMPLE_OPP = /^op-\d{2}$/;
  const SAMPLE_POST = /^p-\d{2}$/;

  function emptyDoc() {
    return {
      app: 'level-up', version: 1,
      personas: [], opportunities: [], contacts: [], posts: [], themes: [], triage: [],
      settings: { gmailLabel: 'LevelUp' },
    };
  }

  function normalizeDoc(d) {
    const base = emptyDoc();
    const doc = Object.assign(base, d || {});
    ['personas', 'opportunities', 'contacts', 'posts', 'themes', 'triage'].forEach((k) => {
      if (!Array.isArray(doc[k])) doc[k] = [];
    });
    doc.settings = Object.assign({ gmailLabel: 'LevelUp' }, doc.settings || {});
    if (!doc.companies || typeof doc.companies !== 'object' || Array.isArray(doc.companies)) doc.companies = {};
    if (!doc.career || typeof doc.career !== 'object') doc.career = {};
    ['summaries', 'roles', 'achievements', 'education', 'boards', 'publications', 'credentials', 'expertise', 'sources', 'conflicts'].forEach((k) => {
      if (!Array.isArray(doc.career[k])) doc.career[k] = [];
    });
    if (!doc.career.person || typeof doc.career.person !== 'object') doc.career.person = {};
    // Opportunities carry the date they were added (back-filled from the Inbox, or the id's timestamp).
    doc.opportunities.forEach((o) => {
      if (o.addedAt) return;
      const t = doc.triage.find((r) => r.opportunityId === o.id);
      const m = /^op-g([0-9a-z]+)$/.exec(o.id || '');
      const ms = m ? parseInt(m[1], 36) : NaN;
      o.addedAt = (t && (t.triagedAt || t.createdAt)) || (ms > 1.5e12 && ms < 4e12 ? new Date(ms).toISOString() : null);
    });
    // A brief left "researching" by a closed tab should be retried.
    Object.keys(doc.companies).forEach((k) => { if (doc.companies[k].status === 'researching') doc.companies[k].status = 'error'; });
    return doc;
  }

  function formatRelativeShort(iso) {
    if (!iso) return 'never';
    const t = new Date(iso).getTime();
    if (isNaN(t)) return iso;
    const secs = Math.floor((Date.now() - t) / 1000);
    if (secs < 0) return 'soon';
    if (secs < 3600) return Math.max(1, Math.floor(secs / 60)) + 'm';
    if (secs < 86400) return Math.floor(secs / 3600) + 'h';
    if (secs < 86400 * 30) return Math.floor(secs / 86400) + 'd';
    if (secs < 86400 * 365) return Math.floor(secs / (86400 * 30)) + 'mo';
    return Math.floor(secs / (86400 * 365)) + 'y';
  }

  function maskSecret(v) {
    if (!v) return '';
    if (v.length <= 12) return '•'.repeat(v.length);
    return v.slice(0, 7) + '…' + v.slice(-4);
  }

  // ── Status pill (bottom-right "Saving… / Saved") ────────────────────────
  let pillEl = null, pillTimer = null;
  function pill(text, tone) {
    if (!pillEl) {
      pillEl = document.createElement('div');
      pillEl.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:9999;padding:6px 11px;border-radius:3px;font:11px/1.3 ui-monospace,Menlo,monospace;letter-spacing:.06em;text-transform:uppercase;background:var(--bg-2);border:1px solid var(--line-2);color:var(--ink-2);transition:opacity .3s;pointer-events:none;';
      document.body.appendChild(pillEl);
    }
    pillEl.textContent = text;
    pillEl.style.color = tone === 'error' ? 'oklch(64% 0.16 25)' : 'var(--ink-2)';
    pillEl.style.opacity = '1';
    clearTimeout(pillTimer);
    if (tone !== 'sticky' && tone !== 'error') pillTimer = setTimeout(() => { pillEl.style.opacity = '0'; }, 1800);
  }

  // ── Full-screen shell (sign-in / first run / errors) ────────────────────
  function screen(html) {
    const root = document.getElementById('root');
    root.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px;background:var(--bg-0);color:var(--ink-1);font:14px/1.55 'Geist',-apple-system,sans-serif;">
        <div style="width:100%;max-width:420px;background:var(--bg-1);border:1px solid var(--line-1);border-radius:4px;padding:40px;">
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px;">
            <span style="font-family:'Newsreader',Georgia,serif;font-size:28px;">Level</span>
            <span style="font-family:'Newsreader',Georgia,serif;font-style:italic;font-size:28px;color:var(--ink-2);">Up</span>
          </div>
          <div style="font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-4);margin-bottom:32px;">Career · Command Center</div>
          ${html}
        </div>
      </div>`;
  }
  const BTN = 'display:block;width:100%;margin-top:14px;padding:12px 14px;border:0;border-radius:3px;font:500 14px Geist,-apple-system,sans-serif;cursor:pointer;';
  const BTN_PRIMARY = BTN + 'background:var(--ink-1);color:var(--bg-0);';
  const BTN_GHOST = BTN + 'background:transparent;color:var(--ink-2);border:1px solid var(--line-3);';
  const NOTE = 'margin-top:24px;padding-top:20px;border-top:1px solid var(--line-1);font-size:12px;color:var(--ink-3);line-height:1.6;';

  function waitForClick(id) {
    return new Promise((resolve) => {
      const el = document.getElementById(id);
      el.addEventListener('click', () => resolve(el), { once: true });
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Google auth (token flow)
  // ════════════════════════════════════════════════════════════════════════
  let tokenClient = null;
  let pendingToken = null;

  function storedToken() {
    try {
      const t = JSON.parse(localStorage.getItem(LS_TOKEN) || 'null');
      if (t && t.access_token && t.expires_at > Date.now() + 60_000) return t;
    } catch (e) { /* ignore */ }
    return null;
  }

  async function gisReady() {
    for (let i = 0; i < 100; i++) {
      if (window.google && google.accounts && google.accounts.oauth2) return;
      await sleep(100);
    }
    throw new Error('Google sign-in library failed to load. Check your connection and reload.');
  }

  async function requestToken() {
    await gisReady();
    if (!tokenClient) {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.clientId,
        scope: CONFIG.scopes,
        callback: (resp) => {
          const p = pendingToken; pendingToken = null;
          if (!p) return;
          if (resp.error) p.reject(new Error(resp.error_description || resp.error));
          else p.resolve(resp);
        },
        error_callback: (err) => {
          const p = pendingToken; pendingToken = null;
          if (p) p.reject(new Error(err && err.type === 'popup_closed' ? 'Sign-in window was closed.' : (err && err.message) || 'Sign-in failed.'));
        },
      });
    }
    const prevTok = (() => { try { return JSON.parse(localStorage.getItem(LS_TOKEN) || 'null'); } catch (e) { return null; } })();
    const known = (() => { try { return localStorage.getItem(LS_ACCOUNT); } catch (e) { return null; } })();
    const prev = prevTok || (known ? { email: known } : null);
    const resp = await new Promise((resolve, reject) => {
      pendingToken = { resolve, reject };
      // Already granted before: no consent screen, the window closes by itself.
      tokenClient.requestAccessToken({ prompt: prev ? '' : 'consent', login_hint: prev && prev.email ? prev.email : undefined });
    });
    const granted = resp.scope || '';
    const missing = CONFIG.scopes.split(' ').filter((s) => s.startsWith('https://') && !granted.includes(s));
    const tok = { access_token: resp.access_token, expires_at: Date.now() + (resp.expires_in || 3600) * 1000, email: prev && prev.email, missingScopes: missing };
    localStorage.setItem(LS_TOKEN, JSON.stringify(tok));
    if (!tok.email) {
      try {
        const u = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + tok.access_token } }).then((r) => r.json());
        tok.email = u.email;
        localStorage.setItem(LS_TOKEN, JSON.stringify(tok));
      } catch (e) { /* non-fatal */ }
    }
    if (tok.email) { try { localStorage.setItem(LS_ACCOUNT, tok.email); } catch (e) { /* storage blocked */ } }
    return tok;
  }

  // When the 1-hour token expires mid-session, a browser popup must come
  // from a tap — so show a small "Continue" banner and wait for the tap.
  let reauthPromise = null, reauthDone = null, reauthBar = null;
  function finishReauth(tok) {
    if (reauthBar) { reauthBar.remove(); reauthBar = null; }
    const done = reauthDone; reauthPromise = null; reauthDone = null;
    if (done) done(tok);
  }
  function reauthViaBanner() {
    if (reauthPromise) return reauthPromise;
    reauthPromise = new Promise((resolve, reject) => {
      reauthDone = resolve;
      const bar = reauthBar = document.createElement('div');
      bar.style.cssText = 'position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:10000;display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--bg-2);border:1px solid var(--line-3);border-radius:4px;color:var(--ink-1);font:13px Geist,-apple-system,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5);';
      bar.innerHTML = '<span>Google connection timed out — your work is waiting to save.</span><button style="padding:7px 12px;border:0;border-radius:3px;background:var(--ink-1);color:var(--bg-0);font:500 13px Geist,sans-serif;cursor:pointer;">Reconnect</button>';
      document.body.appendChild(bar);
      bar.querySelector('button').addEventListener('click', async () => {
        try { finishReauth(await requestToken()); }
        catch (e) { bar.querySelector('span').textContent = 'Reconnect failed: ' + e.message; }
      });
    });
    return reauthPromise;
  }

  // Google gives browser-only apps a 1-hour pass, and renewing it needs a
  // click (browsers block pop-ups otherwise). So: any click in the last 10
  // minutes of the pass, or after it ran out, quietly renews it. The Google
  // window flashes and closes by itself.
  let renewing = false;
  document.addEventListener('click', (e) => {
    if (LOCAL_MODE || renewing || !APP_READY) return;
    if (reauthBar && reauthBar.contains(e.target)) return; // the Reconnect button handles itself
    let t = null;
    try { t = JSON.parse(localStorage.getItem(LS_TOKEN) || 'null'); } catch (e) { t = null; }
    const known = (() => { try { return localStorage.getItem(LS_ACCOUNT); } catch (e) { return null; } })();
    if (!t && !known) return;
    if (t && t.expires_at - Date.now() > 10 * 60_000) return;
    renewing = true;
    requestToken().then((tok) => { pill('Google connection renewed'); finishReauth(tok); })
      .catch(() => { /* closed or blocked: the Reconnect bar still works */ })
      .finally(() => { renewing = false; });
  }, true);

  async function getToken() {
    return storedToken() || reauthViaBanner();
  }

  async function gfetch(url, opts = {}, retried = false) {
    const tok = await getToken();
    const headers = Object.assign({}, opts.headers || {}, { Authorization: 'Bearer ' + tok.access_token });
    const r = await fetch(url, Object.assign({}, opts, { headers }));
    if (r.status === 401 && !retried) {
      localStorage.removeItem(LS_TOKEN);
      return gfetch(url, opts, true);
    }
    if (!r.ok) {
      let msg = '';
      try { const j = await r.json(); msg = (j.error && (j.error.message || j.error)) || JSON.stringify(j); } catch (e) { msg = await r.text().catch(() => ''); }
      const err = new Error(friendlyGoogleError(r.status, String(msg)));
      err.status = r.status;
      throw err;
    }
    const ct = r.headers.get('content-type') || '';
    return ct.includes('json') ? r.json() : r.text();
  }

  function friendlyGoogleError(status, msg) {
    const m = msg.match(/(\S+) API has not been used in project|(\S+\s?\S*) API has not been used/);
    if (status === 403 && /has not been used|is disabled/.test(msg)) {
      return 'A Google API is switched off in your Google Cloud project. ' + msg.split('. ')[0] + '.';
    }
    if (status === 403 && /insufficient|scope/i.test(msg)) {
      return 'Google permission missing — sign out and sign back in, and tick every box on Google\'s consent screen.';
    }
    return 'Google error ' + status + ': ' + msg.slice(0, 200);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Storage drivers (Drive or local test mode)
  // ════════════════════════════════════════════════════════════════════════
  const DRIVE = 'https://www.googleapis.com/drive/v3';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
  let driveFileId = null;

  const driveStore = {
    async load() {
      const q = encodeURIComponent(`name='${CONFIG.fileName}' and trashed=false`);
      const res = await gfetch(`${DRIVE}/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`);
      const f = res.files && res.files[0];
      if (!f) return null;
      driveFileId = f.id;
      return gfetch(`${DRIVE}/files/${f.id}?alt=media`);
    },
    async create(doc) {
      const fq = encodeURIComponent(`name='${CONFIG.folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
      const folders = await gfetch(`${DRIVE}/files?q=${fq}&spaces=drive&fields=files(id)`);
      let folderId = folders.files && folders.files[0] && folders.files[0].id;
      if (!folderId) {
        const folder = await gfetch(`${DRIVE}/files`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: CONFIG.folderName, mimeType: 'application/vnd.google-apps.folder' }),
        });
        folderId = folder.id;
      }
      const boundary = 'lu' + Math.random().toString(36).slice(2);
      const body =
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify({ name: CONFIG.fileName, parents: [folderId], mimeType: 'application/json' }) +
        `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
        JSON.stringify(doc) + `\r\n--${boundary}--`;
      const f = await gfetch(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
        method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + boundary }, body,
      });
      driveFileId = f.id;
    },
    async save(doc) {
      await gfetch(`${UPLOAD}/files/${driveFileId}?uploadType=media`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(doc),
      });
    },
    fileUrl() { return driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : null; },
  };

  // Folders inside the Level Up Drive folder (e.g. "Sources" for career files).
  async function driveFolder(name, parentId) {
    const q = encodeURIComponent(`name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false` + (parentId ? ` and '${parentId}' in parents` : ''));
    const found = await gfetch(`${DRIVE}/files?q=${q}&spaces=drive&fields=files(id)`);
    if (found.files && found.files[0]) return found.files[0].id;
    const made = await gfetch(`${DRIVE}/files`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ name, mimeType: 'application/vnd.google-apps.folder' }, parentId ? { parents: [parentId] } : {})),
    });
    return made.id;
  }
  // Uploads a file into Level Up/<subfolder>/ and returns { id, url }.
  // opts.convertTo (e.g. Google Docs) makes Drive convert it; opts.name renames it.
  async function uploadToDriveFolder(file, subfolder, opts) {
    if (LOCAL_MODE) return { id: null, url: null };
    const root = await driveFolder(CONFIG.folderName);
    const folderId = subfolder ? await driveFolder(subfolder, root) : root;
    const boundary = 'lu' + Math.random().toString(36).slice(2);
    const meta = JSON.stringify(Object.assign({ name: (opts && opts.name) || file.name, parents: [folderId] }, opts && opts.convertTo ? { mimeType: opts.convertTo } : {}));
    const body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
      file, `\r\n--${boundary}--`,
    ]);
    const f = await gfetch(`${UPLOAD}/files?uploadType=multipart&fields=id,webViewLink`, {
      method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + boundary }, body,
    });
    return { id: f.id, url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view` };
  }

  const localStore = {
    async load() {
      const raw = localStorage.getItem(LS_LOCAL_DOC);
      return raw ? JSON.parse(raw) : null;
    },
    async create(doc) { localStorage.setItem(LS_LOCAL_DOC, JSON.stringify(doc)); },
    async save(doc) { localStorage.setItem(LS_LOCAL_DOC, JSON.stringify(doc)); },
    fileUrl() { return null; },
  };

  const store = LOCAL_MODE ? localStore : driveStore;
  let DOC = null;

  // Debounced autosave. Every change marks dirty; we write ~0.8s later.
  let dirty = false, saving = null, saveTimer = null;
  function markDirty() {
    if (PASSIVE) return;
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 800);
  }
  async function flush() {
    clearTimeout(saveTimer);
    if (PASSIVE) return;
    if (saving) { await saving; }
    if (!dirty) return;
    dirty = false;
    DOC.updatedAt = nowIso();
    pill('Saving…', 'sticky');
    saving = store.save(DOC)
      .then(() => pill(LOCAL_MODE ? 'Saved (this browser)' : 'Saved to Drive'))
      .catch((e) => { dirty = true; pill('Save failed — retrying', 'error'); console.error('[Level Up] save failed', e); setTimeout(flush, 5000); })
      .finally(() => { saving = null; });
    return saving;
  }
  window.addEventListener('beforeunload', (e) => {
    if (dirty || saving) { flush(); e.preventDefault(); e.returnValue = ''; }
  });

  function publishGlobals() {
    window.LU_PERSONAS = DOC.personas;
    window.LU_OPPORTUNITIES = DOC.opportunities;
    window.LU_CONTACTS = DOC.contacts;
    window.LU_POSTS = DOC.posts;
    window.LU_THEMES = DOC.themes;
    window.LU_TRIAGE = DOC.triage;
    DOC.personas.forEach((p) => { p.opportunities = DOC.opportunities.filter((o) => o.persona === p.id).length; });
  }
  function notifyOpportunities() {
    window.dispatchEvent(new CustomEvent('lu:opportunities-changed'));
  }

  // ════════════════════════════════════════════════════════════════════════
  // Claude (direct from browser)
  // ════════════════════════════════════════════════════════════════════════
  // `task` (gmail, linkedin, company, career, dupes, test) is only for the usage meter.
  // The instructions (system prompt) are marked for caching: when the same task runs
  // again within 5 minutes (a Gmail sync, a LinkedIn batch, a resume import) Claude
  // re-reads them at 5% of the price. Instructions under ~512 tokens aren't cached
  // and cost nothing extra.
  async function claude(model, system, user, maxTokens, extra, task) {
    const entry = Object.values(MODELS).find((m) => m.id === model);
    if (entry && entry.provider !== 'anthropic') {
      // Other providers get plain text only: no web search, no document blocks.
      if ((extra && extra.tools) || typeof user !== 'string') throw new Error(entry.label + ' can\'t do this job in Level Up; choose a Claude model for it in Settings.');
      return entry.provider === 'openai' ? callOpenAI(entry, system, user, maxTokens, task) : callGemini(entry, system, user, maxTokens, task);
    }
    const key = DOC.settings.anthropicApiKey;
    if (!key) throw new Error('No Claude API key set. Add it in Settings.');
    // Not with server tools (web search): there the cache write cost more than it saved.
    if (typeof system === 'string' && system && !(extra && extra.tools)) system = [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }];
    // Claude can briefly answer "busy" (429/5xx/529) when several jobs go in a
    // row; wait and try again (2s, then 6s) before giving up.
    const RETRY = [429, 500, 502, 503, 504, 529];
    for (let attempt = 0; ; attempt++) {
      let r, j;
      try {
        r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
          body: JSON.stringify(Object.assign({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: user }] }, system ? { system } : {}, extra || {})),
        });
        j = await r.json().catch(() => ({}));
      } catch (e) {
        if (attempt < 2) { await new Promise((res) => setTimeout(res, attempt ? 6000 : 2000)); continue; }
        throw new Error('Could not reach Claude (' + (e.message || e) + ')');
      }
      if (r.ok) { try { recordUsage(task, j.model || model, j.usage); } catch (e) { /* the meter must never break a call */ } return j; }
      if (RETRY.includes(r.status) && attempt < 2) { await new Promise((res) => setTimeout(res, attempt ? 6000 : 2000)); continue; }
      throw new Error((j.error && j.error.message) || ('Claude error ' + r.status));
    }
  }

  // ── OpenAI and Google Gemini ─────────────────────────────────────────────
  // Both answer in the same shape as Claude ({ content: [{ type: 'text', text }], usage })
  // so every screen works unchanged. Reasoning models spend part of the output
  // budget thinking, so they get more room than the visible answer needs.
  const RETRY_STATUS = [429, 500, 502, 503, 504, 529];
  const sysText = (system) => (Array.isArray(system) ? system.map((b) => b.text || '').join('\n\n') : (system || ''));
  async function providerFetch(entry, url, init) {
    for (let attempt = 0; ; attempt++) {
      let r, j;
      try { r = await fetch(url, init); j = await r.json().catch(() => ({})); }
      catch (e) {
        if (attempt < 2) { await new Promise((res) => setTimeout(res, attempt ? 6000 : 2000)); continue; }
        // OpenAI hides key errors from browsers: a rejected key looks like a network failure.
        if (entry.provider === 'openai') throw new Error('OpenAI didn\'t answer. Most often the key is wrong or has no credit: check it at platform.openai.com, then Replace it in Settings. If it is fine, try again shortly.');
        throw new Error('Could not reach ' + PROVIDERS[entry.provider].label + ' (' + (e.message || e) + ')');
      }
      if (r.ok) return j;
      if (RETRY_STATUS.includes(r.status) && attempt < 2) { await new Promise((res) => setTimeout(res, attempt ? 6000 : 2000)); continue; }
      const msg = (j.error && (j.error.message || j.error.status)) || ('error ' + r.status);
      if (r.status === 401 || r.status === 403) throw new Error(PROVIDERS[entry.provider].label + ' didn\'t accept the key (' + String(msg).slice(0, 120) + '). Check it in Settings.');
      throw new Error(entry.label + ': ' + msg);
    }
  }
  async function callOpenAI(entry, system, user, maxTokens, task) {
    const key = DOC.settings.openaiApiKey;
    if (!key) throw new Error('No OpenAI key set. Add it in Settings.');
    const sys = sysText(system);
    const j = await providerFetch(entry, 'https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
      body: JSON.stringify({ model: entry.id, messages: [...(sys ? [{ role: 'system', content: sys }] : []), { role: 'user', content: user }],
        max_completion_tokens: Math.min(64000, Math.max(6000, maxTokens * 3)), reasoning_effort: 'low' }),
    });
    const choice = (j.choices || [])[0] || {};
    const text = (choice.message && choice.message.content) || '';
    if (!text && choice.finish_reason === 'length') throw new Error(entry.label + ' ran out of room before answering. Try again, or pick another model.');
    const u = j.usage || {}, cached = (u.prompt_tokens_details && u.prompt_tokens_details.cached_tokens) || 0;
    const usage = { input_tokens: (u.prompt_tokens || 0) - cached, output_tokens: u.completion_tokens || 0, cache_read_input_tokens: cached };
    try { recordUsage(task, entry.id, usage); } catch (e) { /* the meter must never break a call */ }
    return { model: j.model || entry.id, content: [{ type: 'text', text }], usage, provider: 'openai' };
  }
  async function callGemini(entry, system, user, maxTokens, task) {
    const key = DOC.settings.geminiApiKey;
    if (!key) throw new Error('No Google Gemini key set. Add it in Settings.');
    const sys = sysText(system);
    const j = await providerFetch(entry, 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(entry.id) + ':generateContent', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(Object.assign({ contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: Math.min(64000, Math.max(6000, maxTokens * 3)) } }, sys ? { systemInstruction: { parts: [{ text: sys }] } } : {})),
    });
    const cand = (j.candidates || [])[0] || {};
    const text = ((cand.content && cand.content.parts) || []).filter((x) => !x.thought && x.text).map((x) => x.text).join('');
    if (!text) throw new Error(entry.label + ' returned no answer' + (cand.finishReason ? ' (' + cand.finishReason + ')' : '') + '. Try again, or pick another model.');
    const m = j.usageMetadata || {}, cached = m.cachedContentTokenCount || 0;
    const usage = { input_tokens: (m.promptTokenCount || 0) - cached, output_tokens: (m.candidatesTokenCount || 0) + (m.thoughtsTokenCount || 0), cache_read_input_tokens: cached };
    try { recordUsage(task, entry.id, usage); } catch (e) { /* the meter must never break a call */ }
    return { model: j.modelVersion || entry.id, content: [{ type: 'text', text }], usage, provider: 'google' };
  }

  // Built from the personas in Settings → Personas (retired ones left out), so a
  // new or edited persona is used from the next email or job onwards.
  function activePersonas() { return (DOC.personas || []).filter((p) => !p.retired); }
  function personasForPrompt() {
    const list = activePersonas();
    if (!list.length) return '- (no personas defined)';
    return list.map((p) => {
      const bits = [p.companySize, (p.targetSectors || []).slice(0, 4).join(' / '), (p.skills || []).slice(0, 5).join(', ')].filter(Boolean).join('; ');
      const pos = String(p.positioning || '').replace(/\s+/g, ' ').slice(0, 160);
      return `- ${p.id} (${p.code || ''}) ${p.name}${bits ? ' — ' + bits : ''}${pos ? '. ' + pos : ''}`;
    }).join('\n');
  }
  function personaEnum() { return activePersonas().map((p) => JSON.stringify(p.id)).join('|') || '"none"'; }

  const PARSING_SYSTEM_PROMPT = () => `You are parsing emails for a senior technology executive who is exploring several career personas in parallel:

${personasForPrompt()}

For each email, decide if it represents a genuine career opportunity — recruiter outreach, search-firm inquiry, network referral about a specific role, board introduction, fractional engagement scope, etc. NOT opportunities: newsletters, marketing, billing, generic networking pings, "let's catch up" without a role attached.

Output a SINGLE JSON object, no prose around it:

{
  "is_opportunity": true | false,
  "confidence": 1-5,
  "reasoning": "one short sentence",
  "company": "Acme Corp" | null,
  "role": "Chief Information Officer" | null,
  "contact": { "name": "...", "title": "...", "warmth": "strong"|"warm"|"cold"|"recruiter" } | null,
  "persona": ${personaEnum()} | null,
  "fit": 1-5 | null,
  "next_action": "short phrase" | null,
  "notes": "additional context" | null,
  "location": "Boston, MA" | null,
  "workplace": "On-site" | "Hybrid" | "Remote" | null,
  "compensation": "pay as stated, e.g. $350-420k base + bonus" | null
}

location, workplace and compensation only if the email states them; never guess.

If is_opportunity is false, set all other fields to null except reasoning.`;

  function extractJson(text) {
    let t = (text || '').trim();
    if (t.startsWith('```')) t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a >= 0 && b > a) t = t.slice(a, b + 1);
    return JSON.parse(t);
  }

  // The answer is the last text block: some models (Haiku 5.5) put a thinking
  // block first, and web search adds tool blocks.
  function replyText(resp) {
    const texts = ((resp && resp.content) || []).filter((b) => b.type === 'text');
    return texts.length ? texts[texts.length - 1].text || '' : '';
  }

  async function parseEmail(from, subject, body) {
    const msg = `From: ${from}\nSubject: ${subject}\n\n${(body || '').slice(0, 5000)}`;
    const resp = await claude(modelFor('gmail'), PARSING_SYSTEM_PROMPT(), msg, 1500, null, 'gmail');
    const text = replyText(resp) || '{}';
    try { return extractJson(text); }
    catch (e) { return { is_opportunity: false, confidence: 1, reasoning: 'Claude response did not parse as JSON.', _raw: text.slice(0, 500) }; }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Gmail sync
  // ════════════════════════════════════════════════════════════════════════
  const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me';

  function b64urlDecode(s) {
    try {
      const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder('utf-8').decode(bytes);
    } catch (e) { return ''; }
  }
  function findPart(parts, mime) {
    for (const p of parts || []) {
      if (p.mimeType === mime && p.body && p.body.data) return b64urlDecode(p.body.data);
      if (p.parts) { const f = findPart(p.parts, mime); if (f) return f; }
    }
    return null;
  }
  function extractBody(msg) {
    const payload = msg.payload || {};
    if (payload.body && payload.body.data) return b64urlDecode(payload.body.data);
    const plain = findPart(payload.parts, 'text/plain');
    if (plain) return plain;
    const html = findPart(payload.parts, 'text/html');
    if (html) return html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    return msg.snippet || '';
  }
  const header = (hs, name) => ((hs || []).find((h) => (h.name || '').toLowerCase() === name.toLowerCase()) || {}).value || '';

  async function syncInbox() {
    const labelName = DOC.settings.gmailLabel || 'LevelUp';
    const labels = await gfetch(`${GMAIL}/labels`);
    const label = (labels.labels || []).find((l) => l.name.toLowerCase() === labelName.toLowerCase());
    if (!label) throw new Error(`Gmail label "${labelName}" not found. Create it in Gmail and tag a few recruiter emails.`);
    const list = await gfetch(`${GMAIL}/messages?labelIds=${encodeURIComponent(label.id)}&maxResults=50`);
    const refs = list.messages || [];
    const seen = new Set(DOC.triage.map((t) => t.id));
    let fetched = 0, parsed = 0, skipped = 0;
    const errors = [];
    for (const ref of refs) {
      if (seen.has(ref.id)) { skipped++; continue; }
      const msg = await gfetch(`${GMAIL}/messages/${ref.id}?format=full`);
      const hs = (msg.payload && msg.payload.headers) || [];
      const fromFull = header(hs, 'From');
      let fromName = '', fromAddress = fromFull;
      const m = fromFull.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>/);
      if (m) { fromName = m[1].trim(); fromAddress = m[2].trim(); }
      const body = extractBody(msg);
      const row = {
        id: ref.id, threadId: msg.threadId, fromAddress, fromName,
        subject: header(hs, 'Subject'), snippet: msg.snippet || '', bodyText: body.slice(0, 8000),
        receivedAt: header(hs, 'Date'), parsed: null, parseStatus: 'pending', triageStatus: 'pending',
        opportunityId: null, errorMessage: null, createdAt: nowIso(), parsedAt: null, triagedAt: null,
      };
      DOC.triage.unshift(row);
      fetched++;
      try {
        row.parsed = await parseEmail(fromFull, row.subject, body);
        row.parseStatus = row.parsed.is_opportunity ? 'parsed' : 'not_opportunity';
        row.parsedAt = nowIso();
        parsed++;
      } catch (e) {
        row.parseStatus = 'failed';
        row.errorMessage = String(e.message || e).slice(0, 500);
        errors.push(`${ref.id.slice(0, 12)}…: ${row.errorMessage}`);
      }
      markDirty();
    }
    DOC.settings.gmailLastSync = nowIso();
    markDirty();
    return { fetched, parsed, skipped, errors, lastSync: DOC.settings.gmailLastSync };
  }

  // ════════════════════════════════════════════════════════════════════════
  // LinkedIn saved jobs (sent by the "Sync to Level Up" bookmark button)
  // ════════════════════════════════════════════════════════════════════════

  const LINKEDIN_SYSTEM_PROMPT = () => `You are reading LinkedIn job postings that a senior technology executive SAVED. They are exploring several career personas in parallel:

${personasForPrompt()}

Each input is the text of one saved-job card (title, company, location, sometimes posting age or applicant count). Treat it as an opportunity (is_opportunity true) unless it is clearly not a job. contact is the poster or recruiter only if named, else null. Pick the best-fitting persona and rate fit 1-5 for a senior executive.

Output a SINGLE JSON object, no prose around it:

{
  "is_opportunity": true | false,
  "confidence": 1-5,
  "reasoning": "one short sentence",
  "company": "Acme Corp" | null,
  "role": "Chief Information Officer" | null,
  "contact": { "name": "...", "title": "...", "warmth": "recruiter" } | null,
  "persona": ${personaEnum()} | null,
  "fit": 1-5 | null,
  "next_action": "short phrase" | null,
  "notes": "any other useful detail from the card" | null,
  "location": "Boston, MA" | null,
  "workplace": "On-site" | "Hybrid" | "Remote" | null,
  "company_size": "your best estimate, e.g. 1,001-5,000 employees" | null,
  "industry": "e.g. Hospital & Health Care" | null,
  "compensation": "pay range if the card shows one, e.g. $250K/yr - $300K/yr" | null
}

company_size and industry come from what you know about the company; use null if you don't recognise it.`;

  // Fallback when Claude is unavailable: LinkedIn cards read "Title\nCompany\nLocation…"
  function guessFromCard(lines) {
    const clean = lines.filter((l) => !/^(verified|promoted|saved|viewed|applied|easy apply|actively|be an early)/i.test(l));
    return { role: clean[0] || null, company: clean[1] || null, notes: clean.slice(2, 4).join(' · ') || null };
  }

  async function importLinkedInJobs(jobs) {
    let added = 0, enriched = 0, skipped = 0, n = 0;
    const errors = [];
    const list = (jobs || []).slice(0, 100);
    let pos = 0;
    // Show each job in the Inbox as soon as it's saved, with a running count.
    const progress = () => { pill(`LinkedIn: ${pos} of ${list.length} done…`, 'sticky'); window.dispatchEvent(new CustomEvent('lu:inbox-changed')); };
    for (const j of list) {
      if (pos++) progress();
      if (PASSIVE || RELEASING) throw new Error('Paused: Level Up opened in another window');
      const jobId = String(j && j.id || '').replace(/\D/g, '');
      if (!jobId) continue;
      const id = 'li-' + jobId;
      const detail = j.detail && j.detail.text ? Object.assign({}, j.detail, { id: jobId }) : null;
      const existing = DOC.triage.find((t) => t.id === id);
      if (existing) {
        // Already here: only worth touching if we now have its full page.
        if (detail && (!existing.enrichment || existing.enrichment.partial)) {
          pill(`LinkedIn: reading job ${pos} of ${list.length}…`, 'sticky'); n++;
          try { await enrichLinkedInJob(detail); enriched++; delete existing.enrichError; }
          catch (e) { existing.enrichError = String(e.message || e).slice(0, 200); errors.push(existing.enrichError); markDirty(); }
        } else skipped++;
        continue;
      }
      pill(`LinkedIn: reading job ${pos} of ${list.length}…`, 'sticky'); n++;
      if (detail) {
        try { await enrichLinkedInJob(detail); added++; enriched++; continue; }
        catch (e) { var detailError = String(e.message || e).slice(0, 200); errors.push(detailError); /* fall back to the card */ }
      }
      const text = String(j.text || '').slice(0, 1500);
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const jobUrl = `https://www.linkedin.com/jobs/view/${jobId}/`;
      const row = {
        id, kind: 'linkedin', jobUrl, fromAddress: 'LinkedIn · saved job', fromName: 'LinkedIn',
        subject: lines[0] || 'Saved job', snippet: lines.slice(0, 4).join(' · '), bodyText: text,
        receivedAt: nowIso(), parsed: null, parseStatus: 'pending', triageStatus: 'pending',
        opportunityId: null, errorMessage: null, createdAt: nowIso(), parsedAt: null, triagedAt: null,
      };
      if (typeof detailError === 'string') { row.enrichError = detailError; detailError = undefined; }
      DOC.triage.unshift(row);
      added++;
      try {
        const resp = await claude(modelFor('linkedin'), LINKEDIN_SYSTEM_PROMPT(), `${text}\n\nLink: ${jobUrl}`, 1200, null, 'linkedin');
        row.parsed = extractJson(replyText(resp) || '{}');
        const d = row.parsed;
        // Card-only: what Claude can add without the job page. Marked partial.
        row.enrichment = {
          partial: true, location: d.location || null, workplace: d.workplace || null,
          companySize: d.company_size || null, companySizeEstimated: true, industry: d.industry || null,
          compensation: d.compensation || null, summary: null, hiringManager: null, companyUrl: null, jobUrl, enrichedAt: nowIso(),
        };
      } catch (e) {
        const g = guessFromCard(lines);
        row.parsed = { is_opportunity: true, confidence: 1, reasoning: 'Claude unavailable (' + String(e.message || e).slice(0, 120) + ') — filled from the card text.', ...g, contact: null, persona: null, fit: null, next_action: null };
        errors.push(String(e.message || e).slice(0, 200));
      }
      row.parseStatus = row.parsed.is_opportunity ? 'parsed' : 'not_opportunity';
      row.parsedAt = nowIso();
      markDirty();
      await flush(); // save after every job, so an interruption loses nothing
    }
    await flush();
    return { added, enriched, skipped, errors };
  }

  // ── Enrich one job from its full LinkedIn page ──────────────────────────
  const LINKEDIN_DETAIL_PROMPT = () => `You are reading the full LinkedIn job page for a role a senior technology executive is considering. They are exploring several career personas in parallel:

${personasForPrompt()}

You get the page text plus a list of LinkedIn profiles linked on the page (URL + nearby text). The hiring manager / poster usually appears under "Meet the hiring team" or "Job poster" with a connection degree (1st, 2nd, 3rd). LinkedIn's "People you can reach out to" section lists people who could help (with degree and a reason such as "Company alum from X" or "School alumni from Y"); employees of the company may also appear with their degree.

Output a SINGLE JSON object, no prose around it:

{
  "company": "Acme Corp" | null,
  "role": "Chief Information Officer" | null,
  "location": "Boston, MA" | null,
  "workplace": "On-site" | "Hybrid" | "Remote" | null,
  "company_size": "1,001-5,000 employees" | null,
  "company_size_estimated": true | false,
  "industry": "Hospital & Health Care" | null,
  "compensation": "pay range as the page states it, e.g. $250K/yr - $300K/yr" | null,
  "hiring_manager": { "name": "...", "title": "...", "profile_url": "...", "degree": "1st"|"2nd"|"3rd"|null } | null,
  "reach_out": [ { "name": "...", "title": "short headline", "profile_url": "...", "degree": "1st"|"2nd"|"3rd"|null, "reason": "e.g. Company alum from Cognizant / Partner at the company" } ],
  "reach_out_note": "summary line LinkedIn shows without names, e.g. School alumni from IIM Lucknow" | null,
  "summary": "max 35 words: the mandate in plain words (scope, scale, reporting line)",
  "persona": ${personaEnum()} | null,
  "fit": 1-5 | null,
  "next_action": "short phrase" | null
}

Rules: company_size comes from the page ("About the company"); if absent, give your best estimate and set company_size_estimated true, or null if you don't know the company. hiring_manager only if the page names one. reach_out: named people from "People you can reach out to" and from the "IN YOUR NETWORK" block (LinkedIn's full list: "Connections who work at X" are 1st-degree, reason "Connection at X"; "Company alumni who work at X / Used to work at Y" get reason "Fellow Y alum at X"; "School alumni" get reason "Fellow <school> alum"), plus company employees shown with 1st or 2nd degree. Order 1st-degree first, then 2nd, then others; max 10; [] if none. Each person's reason is only the text shown with that person. A group line with no name (e.g. "School alumni from X · Show all") goes in reach_out_note, never on a person. Every profile_url MUST be copied exactly from the provided list, else null. Never invent people.`;

  const normCompany = (s) => String(s || '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(the|inc|incorporated|llc|ltd|limited|plc|corp|corporation|co|company|group|holdings|lp|llp|gmbh|sa|ag)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const normName = (s) => String(s || '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

  // Who in Dhruv's contacts works at this company / is this person.
  function networkFor(company, hiringManagerName) {
    const target = normCompany(company);
    const atCompany = [];
    if (target.length >= 3) {
      for (const c of DOC.contacts) {
        const n = normCompany(c.company);
        if (!n) continue;
        const match = n === target
          || (Math.min(n.length, target.length) >= 4 && (n.startsWith(target + ' ') || target.startsWith(n + ' ')));
        if (match) atCompany.push(c);
      }
    }
    const rank = { strong: 0, warm: 1, cold: 2 };
    atCompany.sort((a, b) => (rank[a.strength] ?? 3) - (rank[b.strength] ?? 3)
      || String(b.lastContactedAt || '').localeCompare(String(a.lastContactedAt || '')));
    const hm = normName(hiringManagerName);
    const knowsHiringManager = hm ? DOC.contacts.find((c) => normName(c.name) === hm) || null : null;
    return { atCompany, knowsHiringManager };
  }

  async function enrichLinkedInJob(job) {
    const jobId = String(job && job.id || '').replace(/\D/g, '');
    if (!jobId) throw new Error('No job id on that page.');
    const people = (Array.isArray(job.people) ? job.people : []).slice(0, 15)
      .map((p) => ({ url: String(p.url || '').split('?')[0], text: String(p.text || '').slice(0, 200) }))
      .filter((p) => /^https:\/\/www\.linkedin\.com\/in\//.test(p.url));
    const text = String(job.text || '').slice(0, 9000);
    const jobUrl = `https://www.linkedin.com/jobs/view/${jobId}/`;
    const peopleBlock = people.length ? people.map((p) => `- ${p.url} :: ${p.text.replace(/\n/g, ' | ')}`).join('\n') : '(none)';
    const ask = () => claude(modelFor('linkedin'), LINKEDIN_DETAIL_PROMPT(), `PAGE TEXT:\n${text}\n\nLINKED PROFILES:\n${peopleBlock}`, 4000, null, 'linkedin');
    const answer = (resp) => extractJson(replyText(resp) || '{}');
    let d;
    try { d = answer(await ask()); }
    catch (e) { if (!(e instanceof SyntaxError)) throw e; d = answer(await ask()); } // unreadable reply: ask once more
    let hm = d.hiring_manager && d.hiring_manager.name ? d.hiring_manager : null;
    if (hm && !people.some((p) => p.url === String(hm.profile_url || '').split('?')[0])) hm = { ...hm, profile_url: null };
    const companyUrl = /^https:\/\/www\.linkedin\.com\/company\//.test(job.companyUrl || '') ? String(job.companyUrl).split('?')[0] : null;
    const knownUrls = new Set(people.map((p) => p.url));
    // Group lines LinkedIn shows without names ("School alumni from X") are a
    // note for the job, not a reason attached to one person.
    const GROUP_LINE = /(school alumni|company alumni|alumni) from [^\n;·]+/i;
    const groupMatch = text.match(new RegExp('^\\s*(?:' + GROUP_LINE.source + ')\\s*$', 'im'));
    const reachOut = (Array.isArray(d.reach_out) ? d.reach_out : []).filter((r) => r && r.name).slice(0, 10).map((r) => {
      const u = String(r.profile_url || '').split('?')[0];
      let reason = String(r.reason || '');
      if (groupMatch) reason = reason.split(/;\s*/).filter((part) => !part.toLowerCase().includes(groupMatch[0].trim().toLowerCase())).join('; ');
      return { name: r.name, title: r.title || '', degree: r.degree || null, reason, url: knownUrls.has(u) ? u : null };
    });
    if (groupMatch && !d.reach_out_note) d.reach_out_note = groupMatch[0].trim();
    const enrichment = {
      reachOut, reachOutNote: d.reach_out_note || null,
      location: d.location || null, workplace: d.workplace || null,
      companySize: d.company_size || null, companySizeEstimated: !!d.company_size_estimated,
      industry: d.industry || null, compensation: d.compensation || null, summary: d.summary || null, companyUrl, jobUrl,
      hiringManager: hm ? { name: hm.name, title: hm.title || '', url: hm.profile_url || null, degree: hm.degree || null } : null,
      enrichedAt: nowIso(),
    };
    const hmContact = hm ? { name: hm.name, title: hm.title || '', warmth: hm.degree === '1st' ? 'warm' : 'cold' } : null;

    const id = 'li-' + jobId;
    let row = DOC.triage.find((t) => t.id === id);
    if (!row) {
      row = {
        id, kind: 'linkedin', jobUrl, fromAddress: 'LinkedIn · saved job', fromName: 'LinkedIn',
        subject: d.role || 'LinkedIn job', snippet: [d.role, d.company, d.location].filter(Boolean).join(' · '), bodyText: text.slice(0, 4000),
        receivedAt: nowIso(), parseStatus: 'parsed', triageStatus: 'pending', opportunityId: null, errorMessage: null,
        createdAt: nowIso(), triagedAt: null,
        parsed: { is_opportunity: true, confidence: 4, reasoning: 'Read from the full LinkedIn job page.',
          company: d.company || null, role: d.role || null, contact: hmContact, persona: d.persona || null,
          fit: d.fit || null, next_action: d.next_action || null, notes: d.summary || null },
      };
      DOC.triage.unshift(row);
    } else {
      const p = row.parsed || (row.parsed = { is_opportunity: true });
      if (!p.company && d.company) p.company = d.company;
      if (!p.role && d.role) p.role = d.role;
      if (!p.contact && hmContact) p.contact = hmContact;
      if (!p.notes && d.summary) p.notes = d.summary;
      if (row.parseStatus !== 'parsed') { row.parseStatus = 'parsed'; p.is_opportunity = true; }
    }
    row.enrichment = enrichment;
    delete row.enrichError;
    row.parsedAt = nowIso();

    let opp = row.opportunityId ? DOC.opportunities.find((o) => o.id === row.opportunityId) : null;
    if (opp) {
      opp.enrichment = enrichment;
      if ((!opp.contact || !opp.contact.name) && hmContact) opp.contact = hmContact;
      notifyOpportunities();
    }
    markDirty();
    await flush();
    return { row, opp, enrichment };
  }

  async function handleJobPage(job) {
    pill('Reading the job page…');
    const { row, opp } = await enrichLinkedInJob(job);
    const what = [(row.parsed && row.parsed.role), (row.parsed && row.parsed.company)].filter(Boolean).join(' at ') || 'job';
    pill(opp ? `Updated in Pipeline: ${what}` : `Enriched in Inbox: ${what}`);
    window.dispatchEvent(new CustomEvent('lu:inbox-changed'));
    if (opp) window.dispatchEvent(new CustomEvent('lu:open-opp', { detail: opp.id }));
  }
  async function handleSavedList(jobs) {
    const r = await importLinkedInJobs(jobs);
    pill((r.added || r.enriched)
      ? [r.added && `${r.added} new LinkedIn job${r.added === 1 ? '' : 's'}`, r.enriched && `${r.enriched} with full details`, r.skipped && `${r.skipped} already here`].filter(Boolean).join(' · ')
      : `No new jobs · ${r.skipped} already in Level Up`);
    window.dispatchEvent(new CustomEvent('lu:inbox-changed'));
  }
  // Works through the queue one payload at a time, oldest first.
  let queueRunning = null;
  function processQueue() {
    if (!APP_READY || PASSIVE || RELEASING) return queueRunning;
    if (queueRunning) return queueRunning.then(() => processQueue());
    queueRunning = (async () => {
      let did = false;
      try {
        let item;
        while (!PASSIVE && !RELEASING && (item = readQueue()[0])) {
          try {
            if (item.kind === 'job') await handleJobPage(item.data);
            else await handleSavedList(item.data);
          } catch (err) {
            if (PASSIVE || RELEASING) break; // another window took over; it will finish this
            pill('LinkedIn import failed — ' + err.message, 'error');
          }
          if (PASSIVE || RELEASING) break;
          dequeue(item.qid);
          did = true;
        }
      } finally { queueRunning = null; }
      if (did) researchMissing();
    })();
    return queueRunning;
  }

  // ════════════════════════════════════════════════════════════════════════
  // Company briefs (Claude + web search), one per company, reused across jobs
  // ════════════════════════════════════════════════════════════════════════
  const COMPANY_BRIEF_PROMPT = `You research employers for a senior technology executive weighing a role. Use web search (at most 3 searches) to find current, factual information.

Skip the research (skip: true) when the employer is a recruiting, staffing or executive-search firm acting for a client, or when the actual hiring company is not named (e.g. "Confidential", "Unknown", "client of …").

Many company names are shared (e.g. several firms called "Epsilon"). Use the context given (location, industry, role, LinkedIn company page) to make sure you have THE employer of this job. If you cannot confidently identify it, set found: false and do not describe a different company.

Output a SINGLE JSON object, no prose around it:
{
  "skip": true | false,
  "skip_reason": "one short sentence, max 15 words" | null,
  "found": true | false,
  "not_found_reason": "one short sentence, max 15 words" | null,
  "name": "official company name",
  "website": "https://…" | null,
  "headquarters": "City, Country" | null,
  "founded": "year" | null,
  "ownership": "e.g. Public (NYSE: SYY) / Private / PE-backed (owner name) / Subsidiary of X" | null,
  "employees": "e.g. ~72,000 (2025)" | null,
  "revenue": "e.g. $81.4B (FY2025)" | null,
  "revenue_estimated": true | false,
  "what_they_do": "2-3 plain sentences: what they sell, to whom, where they stand in their market",
  "recent": ["notable recent news in max 20 words, starting with month and year"],
  "sources": ["https://…"]
}
Rules: give revenue for private companies only as a clearly labelled estimate (revenue_estimated true); null if nothing credible. recent: at most 3, only from the last 18 months. sources: the 2-4 pages you relied on.`;

  const companyKey = (name) => normCompany(name);
  const NO_EMPLOYER = /^(unknown|confidential|n\/?a|undisclosed|stealth)\b|client of/i;
  let researching = false, researchAgain = false;

  async function researchCompany(name, context, force) {
    const key = companyKey(name);
    if (!key) return null;
    const have = DOC.companies[key];
    if (have && !force && have.status !== 'error') return have;
    if (!force && NO_EMPLOYER.test(String(name).trim())) {
      return (DOC.companies[key] = { name, status: 'skipped', skipReason: 'Employer not named in the posting', researchedAt: nowIso() });
    }
    DOC.companies[key] = Object.assign({}, have || {}, { name, status: 'researching' });
    window.dispatchEvent(new CustomEvent('lu:companies-changed'));
    try {
      const user = `Company: ${name}\n${context || ''}${force ? '\nThe user asked for this research explicitly: do not skip.' : ''}`;
      const resp = await claude(modelFor('company'), COMPANY_BRIEF_PROMPT, user, 3000,
        { tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }] }, 'company');
      const texts = (resp.content || []).filter((b) => b.type === 'text');
      const d = extractJson(texts.length ? texts[texts.length - 1].text : '{}');
      DOC.companies[key] = d.skip && !force
        ? { name, status: 'skipped', skipReason: d.skip_reason || 'Posted by a recruiting firm', researchedAt: nowIso() }
        : d.found === false
        ? { name, status: 'notfound', reason: d.not_found_reason || 'Could not confidently identify this company', researchedAt: nowIso() }
        : {
          name: d.name || name, status: 'ok', website: d.website || null, headquarters: d.headquarters || null,
          founded: d.founded || null, ownership: d.ownership || null, employees: d.employees || null,
          revenue: d.revenue || null, revenueEstimated: !!d.revenue_estimated, whatTheyDo: d.what_they_do || null,
          recent: (Array.isArray(d.recent) ? d.recent : []).slice(0, 3),
          sources: (Array.isArray(d.sources) ? d.sources : []).filter((u) => /^https?:\/\//.test(u)).slice(0, 4),
          researchedAt: nowIso(),
        };
    } catch (e) {
      DOC.companies[key] = { name, status: 'error', error: String(e.message || e).slice(0, 200), researchedAt: nowIso() };
    }
    markDirty();
    window.dispatchEvent(new CustomEvent('lu:companies-changed'));
    return DOC.companies[key];
  }

  // What we know about this employer from its jobs: helps Claude pick the right
  // company when names are shared.
  function contextFor(name) {
    const k = companyKey(name), lines = new Set();
    DOC.triage.filter((t) => t.parsed && companyKey(t.parsed.company) === k).forEach((t) => {
      const e = t.enrichment || {};
      if (t.parsed.role) lines.add('Role: ' + t.parsed.role);
      if (e.location) lines.add('Job location: ' + e.location);
      if (e.industry) lines.add('Industry (from posting): ' + e.industry);
      if (e.companySize && !e.companySizeEstimated) lines.add('Size (from posting): ' + e.companySize);
      if (e.companyUrl) lines.add('LinkedIn company page: ' + e.companyUrl);
      if (t.kind !== 'linkedin' && t.fromAddress) lines.add('Came by email from: ' + t.fromAddress);
    });
    DOC.opportunities.filter((o) => companyKey(o.company) === k).forEach((o) => {
      if (o.role) lines.add('Role: ' + o.role);
      if (o.source) lines.add('Source: ' + o.source);
    });
    return [...lines].slice(0, 10).join('\n');
  }

  // Every company in the Inbox (pending) or Pipeline without a brief yet.
  // Runs in the background after any sync; one at a time.
  async function researchMissing() {
    if (researching) { researchAgain = true; return; }
    if (!DOC.settings.anthropicApiKey) return;
    researching = true;
    try {
      const todo = new Map();
      const add = (name) => { const k = companyKey(name); if (k && !todo.has(k) && (!DOC.companies[k] || DOC.companies[k].status === 'error')) todo.set(k, { name, ctx: contextFor(name) }); };
      DOC.triage.filter((t) => t.triageStatus === 'pending' && t.parseStatus === 'parsed' && t.parsed && t.parsed.company).forEach((t) => add(t.parsed.company));
      DOC.opportunities.forEach((o) => add(o.company));
      let n = 0;
      for (const { name, ctx } of [...todo.values()].slice(0, 15)) {
        pill(`Researching ${name} (${++n} of ${Math.min(todo.size, 15)})…`);
        await researchCompany(name, ctx);
      }
      if (n) { await flush(); pill(`Company profiles ready (${n})`); }
    } finally {
      researching = false;
      if (researchAgain) { researchAgain = false; researchMissing(); }
    }
  }
  window.LU_COMPANY = (name) => DOC.companies[companyKey(name)] || null;

  // ════════════════════════════════════════════════════════════════════════
  // Google Contacts + Calendar
  // ════════════════════════════════════════════════════════════════════════
  async function syncContacts() {
    const people = [];
    let pageToken = '';
    do {
      const url = 'https://people.googleapis.com/v1/people/me/connections?pageSize=1000&personFields=names,emailAddresses,phoneNumbers,organizations,biographies' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
      const res = await gfetch(url);
      people.push(...(res.connections || []));
      pageToken = res.nextPageToken || '';
    } while (pageToken);

    // Replace Google-sourced contacts, but keep anything you added or edited
    // (LinkedIn imports, strength, personas, notes, last-touched).
    const existing = new Map(DOC.contacts.map((c) => [c.id, c]));
    const keep = DOC.contacts.filter((c) => c.source !== 'Google Contacts');
    const fresh = [];
    let imported = 0, skippedNoName = 0;
    for (const p of people) {
      const name = ((p.names || [])[0] || {}).displayName || '';
      if (!name.trim()) { skippedNoName++; continue; }
      const id = (p.resourceName || '').replace('people/', 'g-') || ('g-' + imported);
      const org = (p.organizations || [])[0] || {};
      const prev = existing.get(id) || {};
      fresh.push(Object.assign({}, prev, {
        id, name: name.trim(),
        title: org.title || prev.title || null,
        company: org.name || prev.company || null,
        email: (((p.emailAddresses || [])[0] || {}).value || prev.email || '').toLowerCase() || null,
        phone: ((p.phoneNumbers || [])[0] || {}).value || prev.phone || null,
        notes: ((p.biographies || [])[0] || {}).value || prev.notes || null,
        strength: prev.strength || 'cold',
        personas: prev.personas || [],
        opportunities: prev.opportunities || [],
        lastContacted: prev.lastContacted || 'never',
        lastContactedAt: prev.lastContactedAt || null,
        source: 'Google Contacts',
      }));
      imported++;
    }
    DOC.contacts.length = 0;
    DOC.contacts.push(...fresh, ...keep);
    DOC.settings.contactsLastSync = nowIso();
    markDirty();
    return { imported, skippedNoName };
  }

  async function syncCalendar() {
    const now = Date.now();
    const timeMin = new Date(now - CONFIG.calendarLookbackDays * 86400000).toISOString();
    const timeMax = new Date(now + 7 * 86400000).toISOString();
    const tok = storedToken();
    const self = ((tok && tok.email) || '').toLowerCase();
    const events = [];
    let pageToken = '';
    do {
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=2500&singleEvents=true&orderBy=startTime` + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
      const res = await gfetch(url);
      events.push(...(res.items || []));
      pageToken = res.nextPageToken || '';
    } while (pageToken);

    const lastSeen = new Map();
    let withAttendees = 0;
    for (const ev of events) {
      if (ev.status === 'cancelled' || !ev.attendees || !ev.attendees.length) continue;
      withAttendees++;
      const end = (ev.end && (ev.end.dateTime || ev.end.date)) || (ev.start && (ev.start.dateTime || ev.start.date));
      if (!end) continue;
      const endIso = new Date(end).toISOString();
      for (const a of ev.attendees) {
        const em = (a.email || '').trim().toLowerCase();
        if (!em || em === self || a.responseStatus === 'declined') continue;
        if (!lastSeen.has(em) || endIso > lastSeen.get(em)) lastSeen.set(em, endIso);
      }
    }
    let matched = 0;
    for (const c of DOC.contacts) {
      const t = c.email && lastSeen.get(c.email.toLowerCase());
      if (t && (!c.lastContactedAt || t > c.lastContactedAt)) {
        c.lastContactedAt = t; c.lastContacted = formatRelativeShort(t); matched++;
      }
    }
    DOC.settings.calendarLastSync = nowIso();
    markDirty();
    return { events: events.length, eventsWithAttendees: withAttendees, uniqueAttendeeEmails: lastSeen.size, contactsMatched: matched, lookbackDays: CONFIG.calendarLookbackDays };
  }

  async function syncAllGoogle() {
    const steps = {};
    for (const [name, fn] of [['inbox', syncInbox], ['contacts', syncContacts], ['calendar', syncCalendar]]) {
      try { steps[name] = await fn(); }
      catch (e) { steps[name] = { error: String(e.message || e) }; }
    }
    window.LU_CONTACTS = DOC.contacts;
    await flush();
    return { steps };
  }

  // ════════════════════════════════════════════════════════════════════════
  // LinkedIn CSV import
  // ════════════════════════════════════════════════════════════════════════
  function parseCsv(text) {
    const rows = []; let row = [], field = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
        else field += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += ch;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  async function importLinkedIn(file) {
    if (!file || !/\.csv$/i.test(file.name)) throw new Error('Expected a .csv file');
    if (file.size > 10_000_000) throw new Error('File too large (10MB max)');
    const text = (await file.text()).replace(/^﻿/, '');
    const rows = parseCsv(text);
    const hi = rows.findIndex((r) => r.some((c) => /first name/i.test(c)) && r.some((c) => /last name/i.test(c)));
    if (hi < 0) throw new Error('Could not find the "First Name, Last Name" header row. Is this LinkedIn\'s Connections.csv?');
    const hdr = rows[hi].map((h) => h.trim().toLowerCase());
    const col = (...names) => { for (const n of names) { const i = hdr.indexOf(n); if (i >= 0) return i; } return -1; };
    const iF = col('first name', 'firstname'), iL = col('last name', 'lastname'), iU = col('url', 'profile url'),
      iE = col('email address', 'emailaddress'), iC = col('company'), iP = col('position', 'title'), iO = col('connected on', 'connectedon');
    const byEmail = new Map(DOC.contacts.filter((c) => c.email).map((c) => [c.email.toLowerCase(), c]));
    const byUrl = new Map(DOC.contacts.filter((c) => c.linkedinUrl).map((c) => [c.linkedinUrl, c]));
    let rowsSeen = 0, imported = 0, merged = 0, skippedNoName = 0;
    const get = (r, i) => (i >= 0 && r[i] ? r[i].trim() : '');
    for (const r of rows.slice(hi + 1)) {
      if (!r.some((c) => c && c.trim())) continue;
      rowsSeen++;
      const name = (get(r, iF) + ' ' + get(r, iL)).trim();
      if (!name) { skippedNoName++; continue; }
      const email = get(r, iE).toLowerCase() || null;
      const url = get(r, iU) || null;
      const ex = (email && byEmail.get(email)) || (url && byUrl.get(url));
      if (ex) {
        ex.title = ex.title || get(r, iP) || null;
        ex.company = ex.company || get(r, iC) || null;
        ex.linkedinUrl = ex.linkedinUrl || url;
        ex.connectedOn = ex.connectedOn || get(r, iO) || null;
        merged++;
      } else {
        const c = {
          id: 'li-' + Date.now().toString(36) + '-' + rowsSeen, name, title: get(r, iP) || null, company: get(r, iC) || null,
          email, phone: null, strength: 'cold', personas: [], opportunities: [], lastContacted: 'never', lastContactedAt: null,
          source: 'LinkedIn', notes: null, linkedinUrl: url, connectedOn: get(r, iO) || null,
        };
        DOC.contacts.push(c);
        if (email) byEmail.set(email, c);
        if (url) byUrl.set(url, c);
        imported++;
      }
    }
    window.LU_CONTACTS = DOC.contacts;
    markDirty();
    await flush();
    return { rowsSeen, imported, merged, skippedNoName, errors: [] };
  }

  // ════════════════════════════════════════════════════════════════════════
  // Route table — answers the screens' LU_API calls
  // ════════════════════════════════════════════════════════════════════════
  const COLLECTIONS = ['personas', 'opportunities', 'contacts', 'posts', 'themes'];

  function upsert(coll, id, body) {
    const arr = DOC[coll];
    const i = arr.findIndex((x) => x.id === id);
    const prev = i >= 0 ? arr[i] : null;
    // Personas keep fields the editor doesn't show (e.g. a saved document look).
    const item = coll === 'personas' && prev ? Object.assign({}, prev, body, { id }) : Object.assign({}, body, { id });
    if (i >= 0) arr[i] = item; else if (coll === 'personas') arr.push(item); else arr.unshift(item);
    markDirty();
    // Career profile re-links its proof when a persona is added or redefined.
    if (coll === 'personas') window.dispatchEvent(new CustomEvent('lu:persona-saved', { detail: { prev, next: item } }));
    if (coll === 'opportunities') {
      if (!item.addedAt) item.addedAt = (prev && prev.addedAt) || nowIso();
      notifyOpportunities();
    }
    return item;
  }
  function remove(coll, id) {
    const i = DOC[coll].findIndex((x) => x.id === id);
    if (i >= 0) DOC[coll].splice(i, 1);
    markDirty();
    if (coll === 'opportunities') notifyOpportunities();
    return { deleted: id };
  }

  async function route(method, path, body) {
    const p = path.replace(/^\/api\//, '').replace(/\?.*$/, '');
    const seg = p.split('/').map(decodeURIComponent);

    if (p === 'health') return { status: 'ok', service: 'level-up', mode: LOCAL_MODE ? 'local' : 'drive' };
    if (p === 'stages') return window.LU_STAGES;
    if (p === 'logout' && method === 'POST') { await signOut(); return { ok: true }; }

    // Collections
    if (COLLECTIONS.includes(seg[0])) {
      if (seg.length === 1 && method === 'GET') {
        if (seg[0] === 'contacts') DOC.contacts.forEach((c) => { if (c.lastContactedAt) c.lastContacted = formatRelativeShort(c.lastContactedAt); });
        return DOC[seg[0]];
      }
      if (seg.length === 2 && seg[1] !== 'import-linkedin') {
        if (method === 'PUT') return upsert(seg[0], seg[1], body || {});
        if (method === 'DELETE') return remove(seg[0], seg[1]);
      }
    }
    if (p === 'contacts/import-linkedin/status') {
      const out = {};
      DOC.contacts.forEach((c) => { const s = c.source || '(none)'; out[s] = (out[s] || 0) + 1; });
      return out;
    }

    // Inbox triage
    if (p === 'inbox' && method === 'GET') {
      return DOC.triage.filter((t) => t.triageStatus === 'pending').map((t) => Object.assign({}, t));
    }
    if (p === 'inbox/sync' && method === 'POST') { const r = await syncInbox(); await flush(); researchMissing(); return r; }
    if (seg[0] === 'inbox' && seg.length === 3) {
      const row = DOC.triage.find((t) => t.id === seg[1]);
      if (!row) throw new Error('Triage item not found');
      if (seg[2] === 'reject') { row.triageStatus = 'rejected'; row.triagedAt = nowIso(); markDirty(); return { rejected: row.id }; }
      if (seg[2] === 'accept') {
        const b = body || {};
        const opp = {
          id: 'op-g' + Date.now().toString(36), company: b.company || '', role: b.role || '', stage: b.stage || 'discovered',
          persona: b.persona || null, fit: b.fit || null, source: b.source || 'Gmail', contact: b.contact || null,
          nextAction: b.nextAction || '', dueDate: b.dueDate || '', notes: b.notes || '', drafts: [],
        };
        if (row.jobUrl && !opp.notes.includes(row.jobUrl)) opp.notes = (opp.notes ? opp.notes + '\n\n' : '') + 'LinkedIn: ' + row.jobUrl;
        if (row.enrichment) opp.enrichment = row.enrichment;
        const pr = row.parsed || {};
        ['location', 'workplace', 'compensation'].forEach((k) => { if (!opp[k] && pr[k] && !(row.enrichment && row.enrichment[k])) opp[k] = pr[k]; });
        opp.addedAt = nowIso();
        DOC.opportunities.unshift(opp);
        row.triageStatus = 'accepted'; row.opportunityId = opp.id; row.triagedAt = nowIso();
        markDirty(); notifyOpportunities();
        return { accepted: true, opportunityId: opp.id };
      }
    }

    // Settings — Claude key
    if (p === 'settings/anthropic_api_key') {
      const s = DOC.settings;
      if (method === 'GET') return { key: 'anthropic_api_key', hasValue: !!s.anthropicApiKey, masked: maskSecret(s.anthropicApiKey), updatedAt: s.anthropicKeyUpdatedAt || null };
      if (method === 'PUT') { s.anthropicApiKey = (body && body.value || '').trim(); s.anthropicKeyUpdatedAt = nowIso(); markDirty(); await flush(); return { hasValue: true }; }
      if (method === 'DELETE') { delete s.anthropicApiKey; delete s.anthropicKeyUpdatedAt; markDirty(); await flush(); return { deleted: true }; }
    }
    const pk = (/^settings\/(openai|gemini)_api_key(\/test)?$/.exec(p) || []);
    if (pk[1]) {
      const prov = pk[1] === 'gemini' ? 'google' : 'openai', field = PROVIDERS[prov].keyField, s = DOC.settings;
      if (pk[2] && method === 'POST') {
        try {
          const e = MODELS[PROVIDERS[prov].test];
          const r = await (prov === 'openai' ? callOpenAI : callGemini)(e, null, 'Reply with exactly: ok', 20, 'test');
          return { ok: true, model: r.model, response: replyText(r).trim() };
        } catch (e) { return { ok: false, error: String(e.message || e).slice(0, 300) }; }
      }
      if (method === 'GET') return { hasValue: !!s[field], masked: maskSecret(s[field]), updatedAt: s[field + 'At'] || null };
      if (method === 'PUT') { s[field] = (body && body.value || '').trim(); s[field + 'At'] = nowIso(); markDirty(); await flush(); return { hasValue: true }; }
      if (method === 'DELETE') { delete s[field]; delete s[field + 'At']; markDirty(); await flush(); return { deleted: true }; }
    }
    if (p === 'settings/anthropic_api_key/test' && method === 'POST') {
      try {
        const r = await claude(CONFIG.testModel, null, 'Reply with exactly: ok', 20, null, 'test');
        return { ok: true, model: r.model, response: replyText(r).trim(), inputTokens: r.usage.input_tokens, outputTokens: r.usage.output_tokens };
      } catch (e) { return { ok: false, error: String(e.message || e).slice(0, 300) }; }
    }

    // Google account status + sync
    if (p === 'auth/google/status') {
      const tok = storedToken() || (() => { try { return JSON.parse(localStorage.getItem(LS_TOKEN) || 'null'); } catch (e) { return null; } })();
      return {
        connected: !LOCAL_MODE,
        email: LOCAL_MODE ? null : tok && tok.email,
        label: DOC.settings.gmailLabel || 'LevelUp',
        lastSync: DOC.settings.gmailLastSync || null,
        missingScopes: (tok && tok.missingScopes) || [],
        dataFileUrl: store.fileUrl(),
        localMode: LOCAL_MODE,
      };
    }
    if (p === 'google/sync' && method === 'POST') {
      if (LOCAL_MODE) throw new Error('Google sync is not available in local test mode.');
      const r = await syncAllGoogle();
      researchMissing();
      return r;
    }

    throw new Error(`No handler for ${method} /api/${p}`);
  }

  window.LU_NETWORK_FOR = networkFor;

  // Narrow hooks for feature modules in separate files (e.g. career-store.js).
  window.LU_CORE = {
    doc: () => DOC, markDirty, flush, claude, extractJson, nowIso, pill,
    uploadToDriveFolder, localMode: LOCAL_MODE, modelFor, passive: () => PASSIVE, houseStyle: HOUSE_STYLE,
    models: { parse: CONFIG.parseModel, quick: CONFIG.testModel },
  };

  // ── Theme (Settings → Appearance). Dark is the default. ─────────────────
  const THEMES = { dark: '#070707', light: '#F3F2EF', neutral: '#E3DED5' };
  function applyTheme(t) {
    const theme = THEMES[t] ? t : 'dark';
    if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEMES[theme]);
    try { localStorage.setItem('lu_theme', theme); } catch (e) { /* storage blocked */ }
    return theme;
  }

  window.LU_API = {
    get:    (path)       => route('GET', path),
    put:    (path, body) => route('PUT', path, body),
    post:   (path, body) => route('POST', path, body),
    delete: (path)       => route('DELETE', path),
    importLinkedIn,
    exportBackup() {
      const blob = new Blob([JSON.stringify(DOC, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'levelup-backup-' + nowIso().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },
    async restoreBackup(file) {
      const incoming = normalizeDoc(await readJsonFile(file));
      Object.keys(DOC).forEach((k) => { delete DOC[k]; });
      Object.assign(DOC, incoming);
      markDirty();
      await flush();
      window.location.reload();
    },
    // Demo rows shipped with the original prototype: op-01…op-25, p-01…p-12.
    // Real opportunities from Inbox are "op-g<timestamp>", so they never match.
    sampleCounts() {
      return {
        opportunities: DOC.opportunities.filter((o) => SAMPLE_OPP.test(o.id)).length,
        posts: DOC.posts.filter((p) => SAMPLE_POST.test(p.id)).length,
      };
    },
    async removeSampleData() {
      DOC.opportunities = DOC.opportunities.filter((o) => !SAMPLE_OPP.test(o.id));
      DOC.posts = DOC.posts.filter((p) => !SAMPLE_POST.test(p.id));
      markDirty();
      await flush();
      window.location.reload();
    },
    researchCompany: async (name) => { const b = await researchCompany(name, contextFor(name), true); await flush(); return b; },
    researchMissing,
    getTheme() { return THEMES[DOC.settings.theme] ? DOC.settings.theme : 'dark'; },
    setTheme(t) { DOC.settings.theme = applyTheme(t); markDirty(); },
    // Settings → Claude models & usage
    claudeModels() {
      return {
        models: Object.entries(MODELS).map(([k, m]) => ({ key: k, id: m.id, label: m.label, note: m.note, provider: m.provider, providerLabel: PROVIDERS[m.provider].label, hasKey: hasKey(m.provider) })),
        tasks: Object.entries(TASKS).filter(([, t]) => !t.hidden).map(([k, t]) => ({ key: k, label: t.label, model: modelKeyFor(k), def: t.def, claudeOnly: CLAUDE_ONLY.includes(k), session: SESSION_MODEL[k] || null,
          saved: (() => { const pk = DOC.settings.models && DOC.settings.models[k]; return usable(pk, k) ? pk : t.def; })() })),
        providers: Object.entries(PROVIDERS).map(([k, v]) => ({ key: k, label: v.label, hasKey: hasKey(k) })),
      };
    },
    // Drafting screens: a model for this task for the rest of this visit (null = back to Settings).
    sessionModel(task) { return modelKeyFor(task); },
    setSessionModel(task, key) {
      if (key && !usable(key, task)) return;
      if (key) SESSION_MODEL[task] = key; else delete SESSION_MODEL[task];
      window.dispatchEvent(new CustomEvent('lu:model-changed', { detail: { task } }));
    },
    setTaskModel(task, key) {
      if (!TASKS[task] || !usable(key, task)) return;
      DOC.settings.models = Object.assign({}, DOC.settings.models || {}, { [task]: key });
      markDirty();
    },
    // Rough cost of one call for a task on a model: from this month's real
    // average size when there is one, else the typical size.
    estimateCost(task, key) {
      const m = (DOC.usage || {})[nowIso().slice(0, 7)] || {};
      const t = m[task];
      const typ = TASKS[task] ? TASKS[task].typical : { in: 2000, out: 500 };
      const per = t && t.calls ? { in: (t.in + t.cw + t.cr) / t.calls, out: t.out / t.calls, searches: t.searches / t.calls } : typ;
      return costOf(MODELS[key].id, per);
    },
    usage() { return JSON.parse(JSON.stringify(DOC.usage || {})); },
    async reload() { await flush(); window.location.reload(); },
    signOut,
  };

  async function signOut() {
    await flush().catch(() => null);
    try {
      const tok = JSON.parse(localStorage.getItem(LS_TOKEN) || 'null');
      if (tok && window.google && google.accounts && google.accounts.oauth2) google.accounts.oauth2.revoke(tok.access_token, () => {});
    } catch (e) { /* ignore */ }
    localStorage.removeItem(LS_TOKEN);
    try { localStorage.removeItem(LS_ACCOUNT); } catch (e) { /* storage blocked */ }
    window.location.replace(window.location.pathname);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Bootstrap: sign in → load (or create) data file → render app
  // ════════════════════════════════════════════════════════════════════════
  function readJsonFile(file) {
    return file.text().then((t) => {
      const d = JSON.parse(t);
      if (!d || !Array.isArray(d.opportunities) || !Array.isArray(d.personas)) throw new Error('That file is not a Level Up backup.');
      return d;
    });
  }

  async function firstRun() {
    const seedUrl = params.get('seed');
    if (LOCAL_MODE && seedUrl) return normalizeDoc(await fetch(seedUrl).then((r) => r.json()));
    while (true) {
      screen(`
        <h1 style="font-family:'Newsreader',Georgia,serif;font-size:22px;font-weight:400;margin:0 0 10px;">Set up your data</h1>
        <p style="color:var(--ink-2);margin:0 0 6px;">No Level Up data file found ${LOCAL_MODE ? 'in this browser' : 'in your Google Drive'}. Bring in your backup, or start empty.</p>
        <input id="lu-file" type="file" accept=".json,application/json" style="display:none">
        <button id="lu-import" style="${BTN_PRIMARY}">Import backup file (.json)</button>
        <button id="lu-empty" style="${BTN_GHOST}">Start empty</button>
        <div id="lu-err" style="margin-top:12px;color:oklch(64% 0.16 25);font-size:12.5px;"></div>
        <div style="${NOTE}">${LOCAL_MODE ? 'Test mode — data stays in this browser only.' : 'Creates a "Level Up" folder in your Drive with one file: levelup-data.json.'}</div>`);
      const choice = await Promise.race([
        waitForClick('lu-import').then(() => 'import'),
        waitForClick('lu-empty').then(() => 'empty'),
      ]);
      if (choice === 'empty') return emptyDoc();
      const input = document.getElementById('lu-file');
      const file = await new Promise((resolve) => { input.onchange = () => resolve(input.files[0]); input.click(); });
      if (!file) continue;
      try { return normalizeDoc(await readJsonFile(file)); }
      catch (e) { await sleep(0); const el = document.getElementById('lu-err'); if (el) el.textContent = e.message; await sleep(2500); }
    }
  }

  async function signInScreen(message) {
    const known = (() => { try { return localStorage.getItem(LS_ACCOUNT); } catch (e) { return null; } })();
    screen(known ? `
      <p style="color:var(--ink-2);margin:0 0 6px;">Welcome back. Google signs browser apps out after an hour — one click reconnects, no password needed.</p>
      <button id="lu-signin" style="${BTN_PRIMARY}">Continue as ${esc(known)}</button>` : `
      <p style="color:var(--ink-2);margin:0 0 6px;">Sign in with the Google account that holds your Level Up data.</p>
      <button id="lu-signin" style="${BTN_PRIMARY}">Continue with Google</button>
      <div id="lu-err" style="margin-top:12px;color:oklch(64% 0.16 25);font-size:12.5px;">${esc(message || '')}</div>
      <div style="${NOTE}">Your data lives in your own Google Drive. Gmail, Contacts and Calendar are read-only.</div>`);
    while (true) {
      const btn = await waitForClick('lu-signin');
      btn.textContent = 'Waiting for Google…'; btn.disabled = true;
      try { return await requestToken(); }
      catch (e) {
        btn.textContent = known ? 'Continue as ' + known : 'Continue with Google'; btn.disabled = false;
        document.getElementById('lu-err').textContent = e.message;
      }
    }
  }

  const LIVE_URL = 'https://dhruvc0110.github.io/level-up/';
  window.LU_INIT_PROMISE = (async function bootstrap() {
    // Opened as a file from the folder: Google never allows sign-in from a file.
    if (location.protocol === 'file:') {
      screen(`<p style="margin:0 0 6px;font-size:16px;color:var(--ink-1);">Open Level Up from its web address</p>
        <p style="margin:0;color:var(--ink-2);">This copy was opened as a file from your folder. Google only allows sign-in from the web address, so open it there.</p>
        <a href="${LIVE_URL}" style="${BTN_PRIMARY}text-align:center;text-decoration:none;">Open Level Up</a>
        <div style="${NOTE}">Tip: bookmark it, or in Chrome use ⋮ → Cast, save and share → Install page as app for a Dock icon.</div>`);
      return new Promise(() => {}); // stay on this screen
    }
    try {
      if (!LOCAL_MODE && !storedToken()) await signInScreen();
      screen('<p style="color:var(--ink-2);margin:0;">Loading your data…</p>');
      await claimActive(); // other open copies save and pause before we read
      let raw = await store.load();
      if (!raw) {
        DOC = await firstRun();
        screen('<p style="color:var(--ink-2);margin:0;">Saving to ' + (LOCAL_MODE ? 'this browser' : 'your Drive') + '…</p>');
        DOC.updatedAt = nowIso();
        await store.create(DOC);
      } else {
        DOC = normalizeDoc(raw);
      }
      const tokNow = (() => { try { return JSON.parse(localStorage.getItem(LS_TOKEN) || 'null'); } catch (e) { return null; } })();
      window.LU_USER = { email: LOCAL_MODE ? null : (tokNow && tokNow.email) || null, localMode: LOCAL_MODE };
      publishGlobals();
      if (DOC.settings.theme) applyTheme(DOC.settings.theme);
      window.addEventListener('lu:opportunities-changed', publishGlobals);
      document.getElementById('root').innerHTML = '';
      APP_READY = true;
      processQueue();
    } catch (err) {
      console.error('[Level Up] bootstrap failed:', err);
      if (!LOCAL_MODE && (err.status === 401 || err.status === 403)) localStorage.removeItem(LS_TOKEN);
      screen(`
        <h1 style="font-family:'Newsreader',Georgia,serif;font-size:22px;font-weight:400;margin:0 0 10px;">Couldn't load your data</h1>
        <p style="color:var(--ink-2);margin:0 0 6px;">${esc(err.message || String(err))}</p>
        <button onclick="location.reload()" style="${BTN_PRIMARY}">Try again</button>`);
      throw err;
    }
  })();
})();
