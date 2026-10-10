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

  const params = new URLSearchParams(window.location.search);
  const LOCAL_MODE = params.get('local') === '1';

  // The LinkedIn bookmark opens "#view=inbox&lijobs=<json>". Take the list and
  // strip it from the address bar before the app reads the hash. The part after
  // "#" never leaves the browser.
  // A single job page sends "#…&lijob=<json>" (one job, full page text) instead.
  let PENDING_LINKEDIN = null, PENDING_LINKEDIN_DETAIL = null;
  function takeLinkedInPayload() {
    const m = window.location.hash.match(/(?:^#|&)lijobs=([^&]*)/);
    const d = window.location.hash.match(/(?:^#|&)lijob=([^&]*)/);
    if (!m && !d) return false;
    try { if (m) { const j = JSON.parse(decodeURIComponent(m[1])); if (Array.isArray(j)) PENDING_LINKEDIN = j; } } catch (e) { /* malformed */ }
    try { if (d) { const j = JSON.parse(decodeURIComponent(d[1])); if (j && j.id) PENDING_LINKEDIN_DETAIL = j; } } catch (e) { /* malformed */ }
    const rest = window.location.hash.replace(/&?lijobs?=[^&]*/g, '').replace(/^#&/, '#');
    history.replaceState(history.state, '', window.location.pathname + window.location.search + (rest === '#' ? '' : rest));
    return true;
  }
  takeLinkedInPayload();
  // If Level Up is already open in the bookmark's window, the next click only
  // changes the address after "#" (no reload), so pick jobs up from that too.
  let APP_READY = false;
  window.addEventListener('hashchange', () => { if (takeLinkedInPayload() && APP_READY) importPendingLinkedIn(); });
  const LS_TOKEN = 'lu_google_token';
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
    const prev = (() => { try { return JSON.parse(localStorage.getItem(LS_TOKEN) || 'null'); } catch (e) { return null; } })();
    const resp = await new Promise((resolve, reject) => {
      pendingToken = { resolve, reject };
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
    return tok;
  }

  // When the 1-hour token expires mid-session, a browser popup must come
  // from a tap — so show a small "Continue" banner and wait for the tap.
  let reauthPromise = null;
  function reauthViaBanner() {
    if (reauthPromise) return reauthPromise;
    reauthPromise = new Promise((resolve, reject) => {
      const bar = document.createElement('div');
      bar.style.cssText = 'position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:10000;display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--bg-2);border:1px solid var(--line-3);border-radius:4px;color:var(--ink-1);font:13px Geist,-apple-system,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5);';
      bar.innerHTML = '<span>Google session expired.</span><button style="padding:7px 12px;border:0;border-radius:3px;background:var(--ink-1);color:var(--bg-0);font:500 13px Geist,sans-serif;cursor:pointer;">Continue</button>';
      document.body.appendChild(bar);
      bar.querySelector('button').addEventListener('click', async () => {
        try { const t = await requestToken(); bar.remove(); reauthPromise = null; resolve(t); }
        catch (e) { bar.querySelector('span').textContent = 'Sign-in failed: ' + e.message; }
      });
    });
    return reauthPromise;
  }

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
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 800);
  }
  async function flush() {
    clearTimeout(saveTimer);
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
  async function claude(model, system, user, maxTokens) {
    const key = DOC.settings.anthropicApiKey;
    if (!key) throw new Error('No Claude API key set. Add it in Settings.');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(Object.assign({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: user }] }, system ? { system } : {})),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || ('Claude error ' + r.status));
    return j;
  }

  const PERSONAS_FOR_PROMPT = [
    '- cio (P-01) Enterprise CIO — Fortune 1000 board-level, $500M+ budgets, Financial Services / Industrials / Healthcare',
    '- transformation (P-02) Transformation Director — Mid-market / PE-backed, ERP rescues, post-merger integration',
    '- md (P-03) Managing Director, Professional Services — Top-tier advisory (Big Four-adjacent), $20M+/year practice',
    '- fractional (P-04) Fractional Technology Advisor — PE-backed $50M-$1B, 2-3 day/wk, pre/post transaction',
    '- operating (P-05) PE Operating Partner — Embedded in GP, tech diligence across portfolio',
    '- board (P-06) Board Director — Independent seat, audit committee, cyber + AI risk oversight',
  ].join('\n');

  const PARSING_SYSTEM_PROMPT = `You are parsing emails for a senior technology executive who is exploring SIX career personas in parallel:

${PERSONAS_FOR_PROMPT}

For each email, decide if it represents a genuine career opportunity — recruiter outreach, search-firm inquiry, network referral about a specific role, board introduction, fractional engagement scope, etc. NOT opportunities: newsletters, marketing, billing, generic networking pings, "let's catch up" without a role attached.

Output a SINGLE JSON object, no prose around it:

{
  "is_opportunity": true | false,
  "confidence": 1-5,
  "reasoning": "one short sentence",
  "company": "Acme Corp" | null,
  "role": "Chief Information Officer" | null,
  "contact": { "name": "...", "title": "...", "warmth": "strong"|"warm"|"cold"|"recruiter" } | null,
  "persona": "cio"|"transformation"|"md"|"fractional"|"operating"|"board" | null,
  "fit": 1-5 | null,
  "next_action": "short phrase" | null,
  "notes": "additional context" | null
}

If is_opportunity is false, set all other fields to null except reasoning.`;

  function extractJson(text) {
    let t = (text || '').trim();
    if (t.startsWith('```')) t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a >= 0 && b > a) t = t.slice(a, b + 1);
    return JSON.parse(t);
  }

  async function parseEmail(from, subject, body) {
    const msg = `From: ${from}\nSubject: ${subject}\n\n${(body || '').slice(0, 5000)}`;
    const resp = await claude(CONFIG.parseModel, PARSING_SYSTEM_PROMPT, msg, 800);
    const text = resp.content && resp.content[0] ? resp.content[0].text : '{}';
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

  const LINKEDIN_SYSTEM_PROMPT = `You are reading LinkedIn job postings that a senior technology executive SAVED. They are exploring SIX career personas in parallel:

${PERSONAS_FOR_PROMPT}

Each input is the text of one saved-job card (title, company, location, sometimes posting age or applicant count). Treat it as an opportunity (is_opportunity true) unless it is clearly not a job. contact is the poster or recruiter only if named, else null. Pick the best-fitting persona and rate fit 1-5 for a senior executive.

Output a SINGLE JSON object, no prose around it:

{
  "is_opportunity": true | false,
  "confidence": 1-5,
  "reasoning": "one short sentence",
  "company": "Acme Corp" | null,
  "role": "Chief Information Officer" | null,
  "contact": { "name": "...", "title": "...", "warmth": "recruiter" } | null,
  "persona": "cio"|"transformation"|"md"|"fractional"|"operating"|"board" | null,
  "fit": 1-5 | null,
  "next_action": "short phrase" | null,
  "notes": "any other useful detail from the card" | null,
  "location": "Boston, MA" | null,
  "workplace": "On-site" | "Hybrid" | "Remote" | null,
  "company_size": "your best estimate, e.g. 1,001-5,000 employees" | null,
  "industry": "e.g. Hospital & Health Care" | null
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
    for (const j of (jobs || []).slice(0, 100)) {
      const jobId = String(j && j.id || '').replace(/\D/g, '');
      if (!jobId) continue;
      const id = 'li-' + jobId;
      const detail = j.detail && j.detail.text ? Object.assign({}, j.detail, { id: jobId }) : null;
      const existing = DOC.triage.find((t) => t.id === id);
      if (existing) {
        // Already here: only worth touching if we now have its full page.
        if (detail && (!existing.enrichment || existing.enrichment.partial)) {
          pill(`Reading LinkedIn job ${++n}…`);
          try { await enrichLinkedInJob(detail); enriched++; } catch (e) { errors.push(String(e.message || e).slice(0, 200)); }
        } else skipped++;
        continue;
      }
      pill(`Reading LinkedIn job ${++n}…`);
      if (detail) {
        try { await enrichLinkedInJob(detail); added++; enriched++; continue; }
        catch (e) { errors.push(String(e.message || e).slice(0, 200)); /* fall back to the card */ }
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
      DOC.triage.unshift(row);
      added++;
      try {
        const resp = await claude(CONFIG.parseModel, LINKEDIN_SYSTEM_PROMPT, `${text}\n\nLink: ${jobUrl}`, 600);
        row.parsed = extractJson(resp.content && resp.content[0] ? resp.content[0].text : '{}');
        const d = row.parsed;
        // Card-only: what Claude can add without the job page. Marked partial.
        row.enrichment = {
          partial: true, location: d.location || null, workplace: d.workplace || null,
          companySize: d.company_size || null, companySizeEstimated: true, industry: d.industry || null,
          summary: null, hiringManager: null, companyUrl: null, jobUrl, enrichedAt: nowIso(),
        };
      } catch (e) {
        const g = guessFromCard(lines);
        row.parsed = { is_opportunity: true, confidence: 1, reasoning: 'Claude unavailable (' + String(e.message || e).slice(0, 120) + ') — filled from the card text.', ...g, contact: null, persona: null, fit: null, next_action: null };
        errors.push(String(e.message || e).slice(0, 200));
      }
      row.parseStatus = row.parsed.is_opportunity ? 'parsed' : 'not_opportunity';
      row.parsedAt = nowIso();
      markDirty();
    }
    await flush();
    return { added, enriched, skipped, errors };
  }

  // ── Enrich one job from its full LinkedIn page ──────────────────────────
  const LINKEDIN_DETAIL_PROMPT = `You are reading the full LinkedIn job page for a role a senior technology executive is considering. They are exploring SIX career personas in parallel:

${PERSONAS_FOR_PROMPT}

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
  "hiring_manager": { "name": "...", "title": "...", "profile_url": "...", "degree": "1st"|"2nd"|"3rd"|null } | null,
  "reach_out": [ { "name": "...", "title": "short headline", "profile_url": "...", "degree": "1st"|"2nd"|"3rd"|null, "reason": "e.g. Company alum from Cognizant / Partner at the company" } ],
  "reach_out_note": "summary line LinkedIn shows without names, e.g. School alumni from IIM Lucknow" | null,
  "summary": "max 35 words: the mandate in plain words (scope, scale, reporting line)",
  "persona": "cio"|"transformation"|"md"|"fractional"|"operating"|"board" | null,
  "fit": 1-5 | null,
  "next_action": "short phrase" | null
}

Rules: company_size comes from the page ("About the company"); if absent, give your best estimate and set company_size_estimated true, or null if you don't know the company. hiring_manager only if the page names one. reach_out: named people from "People you can reach out to", plus company employees shown with 1st or 2nd degree; best first, max 6; [] if none. Each person's reason is only the text shown with that person. A group line with no name (e.g. "School alumni from X · Show all") goes in reach_out_note, never on a person. Every profile_url MUST be copied exactly from the provided list, else null. Never invent people.`;

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
    const resp = await claude(CONFIG.parseModel, LINKEDIN_DETAIL_PROMPT, `PAGE TEXT:\n${text}\n\nLINKED PROFILES:\n${peopleBlock}`, 1400);
    const d = extractJson(resp.content && resp.content[0] ? resp.content[0].text : '{}');
    let hm = d.hiring_manager && d.hiring_manager.name ? d.hiring_manager : null;
    if (hm && !people.some((p) => p.url === String(hm.profile_url || '').split('?')[0])) hm = { ...hm, profile_url: null };
    const companyUrl = /^https:\/\/www\.linkedin\.com\/company\//.test(job.companyUrl || '') ? String(job.companyUrl).split('?')[0] : null;
    const knownUrls = new Set(people.map((p) => p.url));
    // Group lines LinkedIn shows without names ("School alumni from X") are a
    // note for the job, not a reason attached to one person.
    const GROUP_LINE = /(school alumni|company alumni|alumni) from [^\n;·]+/i;
    const groupMatch = text.match(new RegExp('^\\s*(?:' + GROUP_LINE.source + ')\\s*$', 'im'));
    const reachOut = (Array.isArray(d.reach_out) ? d.reach_out : []).filter((r) => r && r.name).slice(0, 6).map((r) => {
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
      industry: d.industry || null, summary: d.summary || null, companyUrl, jobUrl,
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

  async function importPendingLinkedInDetail() {
    if (!PENDING_LINKEDIN_DETAIL) return;
    const job = PENDING_LINKEDIN_DETAIL; PENDING_LINKEDIN_DETAIL = null;
    pill('Reading the job page…');
    try {
      const { row, opp } = await enrichLinkedInJob(job);
      const what = [(row.parsed && row.parsed.role), (row.parsed && row.parsed.company)].filter(Boolean).join(' at ') || 'job';
      pill(opp ? `Updated in Pipeline: ${what}` : `Enriched in Inbox: ${what}`);
      window.dispatchEvent(new CustomEvent('lu:inbox-changed'));
      if (opp) window.dispatchEvent(new CustomEvent('lu:open-opp', { detail: opp.id }));
    } catch (err) {
      pill('LinkedIn enrichment failed — ' + err.message, 'error');
    }
  }

  async function importPendingLinkedIn() {
    importPendingLinkedInDetail();
    if (!PENDING_LINKEDIN) return;
    const jobs = PENDING_LINKEDIN; PENDING_LINKEDIN = null;
    try {
      const r = await importLinkedInJobs(jobs);
      pill((r.added || r.enriched)
        ? [r.added && `${r.added} new LinkedIn job${r.added === 1 ? '' : 's'}`, r.enriched && `${r.enriched} with full details`, r.skipped && `${r.skipped} already here`].filter(Boolean).join(' · ')
        : `No new jobs · ${r.skipped} already in Level Up`);
      window.dispatchEvent(new CustomEvent('lu:inbox-changed'));
    } catch (err) {
      pill('LinkedIn import failed — ' + err.message, 'error');
    }
  }

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
    const item = Object.assign({}, body, { id });
    const i = arr.findIndex((x) => x.id === id);
    if (i >= 0) arr[i] = item; else arr.unshift(item);
    markDirty();
    if (coll === 'opportunities') notifyOpportunities();
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
    if (p === 'inbox/sync' && method === 'POST') { const r = await syncInbox(); await flush(); return r; }
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
    if (p === 'settings/anthropic_api_key/test' && method === 'POST') {
      try {
        const r = await claude(CONFIG.testModel, null, 'Reply with exactly: ok', 20);
        return { ok: true, model: r.model, response: ((r.content && r.content[0] && r.content[0].text) || '').trim(), inputTokens: r.usage.input_tokens, outputTokens: r.usage.output_tokens };
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
      return syncAllGoogle();
    }

    throw new Error(`No handler for ${method} /api/${p}`);
  }

  window.LU_NETWORK_FOR = networkFor;

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
    getTheme() { return THEMES[DOC.settings.theme] ? DOC.settings.theme : 'dark'; },
    setTheme(t) { DOC.settings.theme = applyTheme(t); markDirty(); },
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
    screen(`
      <p style="color:var(--ink-2);margin:0 0 6px;">Sign in with the Google account that holds your Level Up data.</p>
      <button id="lu-signin" style="${BTN_PRIMARY}">Continue with Google</button>
      <div id="lu-err" style="margin-top:12px;color:oklch(64% 0.16 25);font-size:12.5px;">${esc(message || '')}</div>
      <div style="${NOTE}">Your data lives in your own Google Drive. Gmail, Contacts and Calendar are read-only.</div>`);
    while (true) {
      const btn = await waitForClick('lu-signin');
      btn.textContent = 'Waiting for Google…'; btn.disabled = true;
      try { return await requestToken(); }
      catch (e) {
        btn.textContent = 'Continue with Google'; btn.disabled = false;
        document.getElementById('lu-err').textContent = e.message;
      }
    }
  }

  window.LU_INIT_PROMISE = (async function bootstrap() {
    try {
      if (!LOCAL_MODE && !storedToken()) await signInScreen();
      screen('<p style="color:var(--ink-2);margin:0;">Loading your data…</p>');
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
      importPendingLinkedIn();
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
