// Level Up — Settings: connections, API keys, preferences.
//
// Sections compose vertically. Each section is self-contained — fetches its
// own state on mount via LU_API (answered by lu-store.js; data lives in the
// user's Google Drive).

function SettingsView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SettingsHeader/>
      <div className="lu-main-scroll" style={{ padding: '20px 28px 60px' }}>
        <div style={{ maxWidth: 760 }}>
          <AnthropicKeyPanel/>
          <GmailPanel/>
          <LinkedInPanel/>
          {/* Future: RssWatchlistPanel, AccountPanel */}
          <FuturePanelsHint/>
        </div>
      </div>
    </div>
  );
}

// ── Header ──────────────────────────────────────────────────────────────

function SettingsHeader() {
  return (
    <div className="hl-b" style={{ padding: '24px 28px 20px' }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>System</div>
      <h1 className="serif" style={{
        fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em',
        margin: 0, color: 'var(--ink-1)',
      }}>
        Settings
      </h1>
    </div>
  );
}

// ── Panel primitive ─────────────────────────────────────────────────────

function SettingsPanel({ title, eyebrow, children }) {
  return (
    <section style={{
      padding: '24px 26px',
      background: 'var(--bg-1)',
      border: '1px solid var(--line-1)',
      borderRadius: 4,
      marginBottom: 14,
    }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>
      <h2 className="serif" style={{
        fontSize: 22, fontWeight: 400, letterSpacing: '-0.012em',
        margin: '0 0 14px', color: 'var(--ink-1)',
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

// ── Anthropic API key ───────────────────────────────────────────────────

function AnthropicKeyPanel() {
  const [status, setStatus] = React.useState(null);
  const [editing, setEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [showRaw, setShowRaw] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState(null);
  const [error, setError] = React.useState(null);

  const load = async () => {
    try {
      const data = await LU_API.get('/api/settings/anthropic_api_key');
      setStatus(data);
    } catch (e) {
      setError(e.message);
    }
  };
  React.useEffect(() => { load(); }, []);

  const save = async () => {
    if (!inputValue.trim()) return;
    setSaving(true); setError(null);
    try {
      await LU_API.put('/api/settings/anthropic_api_key', {
        value: inputValue.trim(),
        encrypted: true,
      });
      setInputValue('');
      setEditing(false);
      setTestResult(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Remove the Claude API key? AI features will stop working until a new one is set.')) return;
    try {
      await LU_API.delete('/api/settings/anthropic_api_key');
      setTestResult(null);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const test = async () => {
    setTesting(true); setTestResult(null); setError(null);
    try {
      const result = await LU_API.post('/api/settings/anthropic_api_key/test');
      setTestResult(result);
    } catch (e) {
      setTestResult({ ok: false, error: e.message });
    } finally {
      setTesting(false);
    }
  };

  if (status === null) {
    return (
      <SettingsPanel title="Claude API key" eyebrow="AI · ANTHROPIC">
        <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
      </SettingsPanel>
    );
  }

  const hasKey = status.hasValue;
  const showInput = editing || !hasKey;

  return (
    <SettingsPanel title="Claude API key" eyebrow="AI · ANTHROPIC">
      <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.6, margin: '0 0 18px', textWrap: 'pretty' }}>
        Required for AI outreach drafts and email parsing. The key is saved in your Level Up data file in your Google Drive and is only ever sent from your browser to{' '}
        <code style={{
          fontFamily: 'var(--mono)', fontSize: 12, background: 'var(--bg-2)',
          padding: '1px 6px', borderRadius: 3, border: '1px solid var(--line-1)',
          color: 'var(--ink-2)',
        }}>api.anthropic.com</code>.
      </p>

      {/* Existing-key status row */}
      {hasKey && !editing && (
        <div style={{
          padding: '14px 16px',
          border: '1px solid var(--line-1)',
          borderRadius: 3, background: 'var(--bg-2)',
          display: 'flex', alignItems: 'center', gap: 14,
          marginBottom: 14,
        }}>
          <Icon name="key" size={16} stroke={1.5} style={{ color: 'var(--ink-2)', flexShrink: 0 }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 13, color: 'var(--ink-1)', letterSpacing: '0.01em' }}>
              {status.masked || '••••'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3, fontFamily: 'var(--mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Updated {formatRelative(status.updatedAt)}
            </div>
          </div>
          <Btn variant="ghost" onClick={() => setEditing(true)}>Replace</Btn>
          <Btn variant="ghost" onClick={remove} icon="trash"/>
        </div>
      )}

      {/* Input row */}
      {showInput && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            display: 'flex', alignItems: 'stretch',
            border: '1px solid var(--line-2)', borderRadius: 3,
            background: 'var(--bg-2)',
          }}>
            <input
              type={showRaw ? 'text' : 'password'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="sk-ant-api03-..."
              autoFocus
              spellCheck={false}
              autoComplete="off"
              style={{
                flex: 1, padding: '11px 14px',
                background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--ink-1)', fontFamily: 'var(--mono)', fontSize: 13,
                letterSpacing: '0.01em',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape' && editing) { setEditing(false); setInputValue(''); }
              }}
            />
            <button
              onClick={() => setShowRaw(s => !s)}
              type="button"
              title={showRaw ? 'Hide' : 'Show'}
              style={{
                appearance: 'none', border: 'none', background: 'transparent',
                color: 'var(--ink-3)', padding: '0 14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink-2)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-3)'}
            >
              <Icon name={showRaw ? 'eye-off' : 'eye'} size={14}/>
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <Btn variant="primary" onClick={save} disabled={saving || !inputValue.trim()}>
              {saving ? 'Saving…' : 'Save key'}
            </Btn>
            {editing && hasKey && (
              <Btn variant="ghost" onClick={() => { setEditing(false); setInputValue(''); }}>Cancel</Btn>
            )}
            <div style={{ flex: 1 }}/>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--ink-3)', fontSize: 12, textDecoration: 'none',
                fontFamily: 'var(--mono)', letterSpacing: '0.04em',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink-2)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-3)'}
            >
              Generate one at console.anthropic.com →
            </a>
          </div>
        </div>
      )}

      {/* Test connection */}
      {hasKey && !editing && (
        <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--line-1)' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Verify</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Btn variant="ghost" onClick={test} disabled={testing} icon="sparkles">
              {testing ? 'Pinging Claude…' : 'Test connection'}
            </Btn>
            {testResult && testResult.ok && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)' }}>
                <Icon name="check" size={14} style={{ color: 'oklch(70% 0.12 145)', flexShrink: 0 }}/>
                <span>
                  <b style={{ color: 'var(--ink-1)' }}>{testResult.model}</b> replied{' '}
                  <em style={{ fontFamily: 'var(--serif)', fontStyle: 'italic' }}>"{testResult.response}"</em>
                  {' · '}
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                    {testResult.inputTokens + testResult.outputTokens}t
                  </span>
                </span>
              </div>
            )}
            {testResult && !testResult.ok && (
              <div style={{ color: 'var(--signal)', fontSize: 13, lineHeight: 1.45, maxWidth: 460 }}>
                Failed: {testResult.error}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--signal)', fontSize: 13, marginTop: 12 }}>
          {error}
        </div>
      )}
    </SettingsPanel>
  );
}

// ── Google account (Gmail + Contacts + Calendar + Drive) ───────────────

function GmailPanel() {
  const [status, setStatus] = React.useState(null);
  const [syncing, setSyncing] = React.useState(false);
  const [syncResult, setSyncResult] = React.useState(null);
  const [error, setError] = React.useState(null);
  const restoreRef = React.useRef(null);
  const sample = LU_API.sampleCounts();

  const load = async () => {
    try { setStatus(await LU_API.get('/api/auth/google/status')); }
    catch (e) { setError(e.message); }
  };
  React.useEffect(() => { load(); }, []);

  const sync = async () => {
    setSyncing(true); setSyncResult(null); setError(null);
    try {
      setSyncResult(await LU_API.post('/api/google/sync', {}));
      await load();
    } catch (e) {
      setSyncResult({ error: e.message });
    } finally {
      setSyncing(false);
    }
  };

  if (!status) {
    return (
      <SettingsPanel title="Google" eyebrow="DATA · GOOGLE">
        <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
      </SettingsPanel>
    );
  }

  const code = (txt) => (
    <code style={{
      fontFamily: 'var(--mono)', fontSize: 12, background: 'var(--bg-2)',
      padding: '1px 6px', borderRadius: 3, border: '1px solid var(--line-1)', color: 'var(--ink-2)',
    }}>{txt}</code>
  );

  return (
    <SettingsPanel title="Google" eyebrow="DATA · GOOGLE">
      <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.6, margin: '0 0 18px', textWrap: 'pretty' }}>
        Your Google sign-in does four things: stores all Level Up data in {code('Level Up / levelup-data.json')} in your Drive,
        reads emails labeled {code(status.label)} in Gmail (parsed by Claude into Inbox), imports your Google Contacts into Network,
        and uses the last 12 months of Calendar to set "last touched." Gmail, Contacts and Calendar are read-only.
      </p>

      {status.missingScopes && status.missingScopes.length > 0 && (
        <div style={{
          padding: '12px 14px', borderRadius: 3, marginBottom: 14,
          background: 'rgba(224, 153, 90, 0.08)', border: '1px solid rgba(224, 153, 90, 0.25)',
          color: 'var(--ink-2)', fontSize: 13,
        }}>
          Some permissions weren't granted on Google's consent screen, so parts of sync will fail. Sign out (bottom of the sidebar), sign back in, and tick every box.
        </div>
      )}

      <div style={{
        padding: '14px 16px', border: '1px solid var(--line-1)',
        borderRadius: 3, background: 'var(--bg-2)',
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, flexWrap: 'wrap',
      }}>
        <Icon name="dot" size={10} style={{ color: status.localMode ? 'var(--ink-4)' : 'oklch(70% 0.12 145)', flexShrink: 0 }}/>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 13.5, color: 'var(--ink-1)', fontWeight: 500 }}>
            {status.localMode ? 'Test mode — not signed in to Google' : (status.email || 'Signed in')}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3, fontFamily: 'var(--mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {`Label: ${status.label} · Last sync ${status.lastSync ? formatRelative(status.lastSync) : 'never'}`}
          </div>
        </div>
        <Btn variant="ghost" onClick={sync} disabled={syncing || status.localMode} icon="spark">
          {syncing ? 'Syncing…' : 'Sync now'}
        </Btn>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: syncResult || error ? 14 : 0 }}>
        {status.dataFileUrl && (
          <a href={status.dataFileUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <Btn variant="ghost">Open data file in Drive</Btn>
          </a>
        )}
        <Btn variant="ghost" onClick={() => LU_API.exportBackup()}>Download backup</Btn>
        <input ref={restoreRef} type="file" accept=".json,application/json" style={{ display: 'none' }}
          onChange={async (e) => {
            const f = e.target.files && e.target.files[0];
            e.target.value = '';
            if (!f) return;
            if (!window.confirm('Replace ALL your current Level Up data with this backup? This cannot be undone — download a backup first if unsure.')) return;
            setError(null);
            try { await LU_API.restoreBackup(f); } catch (err) { setError('Restore failed: ' + err.message); }
          }}/>
        <Btn variant="ghost" onClick={() => restoreRef.current && restoreRef.current.click()}>Restore from backup</Btn>
        {sample.opportunities + sample.posts > 0 && (
          <Btn variant="ghost" onClick={async () => {
            if (!window.confirm(`Remove the sample data from the original demo — ${sample.opportunities} opportunities and ${sample.posts} Brand posts? Your contacts, personas, inbox and any opportunities you accepted from Inbox are kept.`)) return;
            setError(null);
            try { await LU_API.removeSampleData(); } catch (err) { setError('Remove failed: ' + err.message); }
          }}>Remove sample data</Btn>
        )}
      </div>

      {syncResult && (
        <div style={{
          padding: '14px 16px',
          border: '1px solid var(--line-1)', borderRadius: 3,
          background: 'var(--bg-2)',
          fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55,
        }}>
          {syncResult.error ? (
            <span style={{ color: 'var(--signal)' }}>Sync failed: {syncResult.error}</span>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Icon name="check" size={13} style={{ color: 'oklch(70% 0.12 145)' }}/>
                <b style={{ color: 'var(--ink-1)' }}>Synced.</b>
              </div>
              <SyncStepRow label="Gmail" result={syncResult.steps?.inbox} formatter={(r) =>
                `${r.fetched ?? 0} new email${r.fetched === 1 ? '' : 's'} · ${r.parsed ?? 0} parsed · ${r.skipped ?? 0} already-seen` +
                (r.errors && r.errors.length > 0 ? ` · ${r.errors.length} errors` : '')
              }/>
              <SyncStepRow label="Contacts" result={syncResult.steps?.contacts} formatter={(r) =>
                `${r.imported ?? 0} imported${r.skippedNoName ? ` · ${r.skippedNoName} skipped (no name)` : ''}`
              }/>
              <SyncStepRow label="Calendar" result={syncResult.steps?.calendar} formatter={(r) =>
                `${r.events ?? 0} events scanned · ${r.contactsMatched ?? 0} contact${r.contactsMatched === 1 ? '' : 's'} updated`
              }/>
              {(syncResult.steps?.inbox?.fetched > 0) && (
                <div style={{ marginTop: 8, color: 'var(--ink-3)', fontSize: 12.5 }}>
                  → Check the Inbox view to triage what came in.
                </div>
              )}
              {(syncResult.steps?.contacts?.imported > 0 || syncResult.steps?.calendar?.contactsMatched > 0) && (
                <div style={{ marginTop: 6, color: 'var(--ink-3)', fontSize: 12.5 }}>
                  → <a href="#" onClick={(e) => { e.preventDefault(); LU_API.reload(); }} style={{ color: 'var(--ink-2)', textDecoration: 'underline' }}>Refresh the page</a> to see updated contacts in Network.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--signal)', fontSize: 13, marginTop: 12 }}>{error}</div>
      )}
    </SettingsPanel>
  );
}


// ── LinkedIn CSV import ─────────────────────────────────────────────────

function LinkedInPanel() {
  const [importing, setImporting] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [sourceBreakdown, setSourceBreakdown] = React.useState(null);
  const fileInputRef = React.useRef(null);

  const loadStatus = async () => {
    try {
      const s = await LU_API.get('/api/contacts/import-linkedin/status');
      setSourceBreakdown(s);
    } catch (e) { /* non-fatal */ }
  };
  React.useEffect(() => { loadStatus(); }, []);

  const handleFile = async (file) => {
    if (!file) return;
    setImporting(true); setError(null); setResult(null);
    try {
      setResult(await LU_API.importLinkedIn(file));
      await loadStatus();
    } catch (e) {
      setError(e.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const liCount = sourceBreakdown ? (sourceBreakdown.LinkedIn || 0) : null;
  const googleCount = sourceBreakdown ? (sourceBreakdown['Google Contacts'] || 0) : null;

  return (
    <SettingsPanel title="LinkedIn connections" eyebrow="DATA · LINKEDIN">
      <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.6, margin: '0 0 18px', textWrap: 'pretty' }}>
        LinkedIn doesn't allow API access to your own connections, so we use their official data export.
        On LinkedIn: <span style={{ color: 'var(--ink-1)' }}>Settings → Data Privacy → Get a copy of your data → Connections</span>.
        You'll get an email with the CSV in ~10 minutes. Upload it here — we merge by email (LinkedIn fills in title/company on existing contacts)
        and add new ones with source <code style={{
          fontFamily: 'var(--mono)', fontSize: 12, background: 'var(--bg-2)',
          padding: '1px 6px', borderRadius: 3, border: '1px solid var(--line-1)',
          color: 'var(--ink-2)',
        }}>LinkedIn</code>.
      </p>

      {sourceBreakdown && (
        <div style={{
          padding: '12px 14px', background: 'var(--bg-2)', border: '1px solid var(--line-1)',
          borderRadius: 3, marginBottom: 14, fontSize: 12.5, color: 'var(--ink-3)',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <span className="mono" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 11 }}>Current network:</span>
          <span><b style={{ color: 'var(--ink-1)' }}>{googleCount || 0}</b> from Google</span>
          <span><b style={{ color: 'var(--ink-1)' }}>{liCount || 0}</b> from LinkedIn</span>
        </div>
      )}

      <div style={{
        padding: '24px 24px',
        border: '1px dashed var(--line-2)',
        borderRadius: 4,
        textAlign: 'center',
        marginBottom: 14,
      }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => handleFile(e.target.files && e.target.files[0])}
          style={{ display: 'none' }}
        />
        <Btn variant="primary" onClick={() => fileInputRef.current && fileInputRef.current.click()} disabled={importing}>
          {importing ? 'Importing…' : 'Upload Connections.csv'}
        </Btn>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-3)' }}>
          .csv files only · max 10 MB
        </div>
      </div>

      {result && (
        <div style={{
          padding: '14px 16px',
          border: '1px solid var(--line-1)', borderRadius: 3,
          background: 'var(--bg-2)',
          fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Icon name="check" size={13} style={{ color: 'oklch(70% 0.12 145)' }}/>
            <b style={{ color: 'var(--ink-1)' }}>Imported.</b>
          </div>
          <div>
            {result.rowsSeen} rows read · {result.imported} new contacts · {result.merged} merged with existing · {result.skippedNoName} skipped (no name)
            {result.errors && result.errors.length > 0 && (
              <span style={{ color: 'var(--signal)' }}> · {result.errors.length} errors</span>
            )}
          </div>
          <div style={{ marginTop: 6, color: 'var(--ink-3)', fontSize: 12.5 }}>
            → <a href="#" onClick={(e) => { e.preventDefault(); LU_API.reload(); }} style={{ color: 'var(--ink-2)', textDecoration: 'underline' }}>Refresh the page</a> to see updates in Network.
          </div>
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--signal)', fontSize: 13, marginTop: 12 }}>{error}</div>
      )}
    </SettingsPanel>
  );
}


// ── Per-step row in the sync result panel ───────────────────────────────

function SyncStepRow({ label, result, formatter }) {
  if (!result) return null;
  const isError = !!result.error;
  // The whole step was skipped only when `skipped` is a string explanation.
  // Numeric `skipped` (e.g. "3 already-seen emails") is a healthy count, not a skip.
  const isSkipped = typeof result.skipped === 'string';
  const color = isError ? 'var(--signal)' : isSkipped ? 'var(--ink-3)' : 'var(--ink-2)';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '90px 1fr', gap: 12,
      padding: '4px 0', alignItems: 'baseline',
    }}>
      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ color, fontSize: 13 }}>
        {isError ? `failed — ${result.error}` :
         isSkipped ? `skipped — ${result.skipped}` :
         formatter(result)}
      </div>
    </div>
  );
}


// ── Future panels hint ──────────────────────────────────────────────────

function FuturePanelsHint() {
  return (
    <section style={{
      padding: '18px 22px',
      border: '1px dashed var(--line-2)',
      borderRadius: 4,
      color: 'var(--ink-3)',
      fontSize: 13, lineHeight: 1.55,
      marginTop: 8,
    }}>
      <div className="eyebrow" style={{ marginBottom: 8, color: 'var(--ink-4)' }}>Coming next</div>
      Gmail correspondent mining · Per-opportunity warm-path workflow · LinkedIn Jobs bookmarklet · Real Claude outreach drafts. Each will get a panel here.
    </section>
  );
}

// ── Utility ─────────────────────────────────────────────────────────────

function formatRelative(iso) {
  if (!iso) return 'never';
  try {
    const d = new Date(iso);
    const now = new Date();
    const ms = now - d;
    if (ms < 60 * 1000) return 'just now';
    if (ms < 3600 * 1000) return Math.floor(ms / 60000) + 'm ago';
    if (ms < 86400 * 1000) return Math.floor(ms / 3600000) + 'h ago';
    const days = Math.floor(ms / 86400000);
    if (days === 1) return 'yesterday';
    if (days < 30) return days + 'd ago';
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}
