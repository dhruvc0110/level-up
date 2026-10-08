// Level Up — Inbox: triage parsed-from-email opportunity candidates.
//
// Each row is a candidate Claude extracted from an email. User reviews,
// optionally edits, then Accept (-> creates Pipeline opportunity) or Reject.

function InboxView({ onOpenOpp, onNavSettings }) {
  const [items, setItems] = React.useState(null);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [openItem, setOpenItem] = React.useState(null);

  const load = async () => {
    try {
      const data = await LU_API.get('/api/inbox');
      setItems(data);
    } catch (e) {
      setError(e.message);
    }
  };
  React.useEffect(() => {
    load();
    window.addEventListener('lu:inbox-changed', load);
    return () => window.removeEventListener('lu:inbox-changed', load);
  }, []);

  const sync = async () => {
    setSyncing(true); setError(null);
    try {
      await LU_API.post('/api/inbox/sync', {});
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  };

  if (items === null) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <InboxHeader count={0} onSync={sync} syncing={syncing}/>
        <div style={{ padding: 40, color: 'var(--ink-3)' }}>Loading…</div>
      </div>
    );
  }

  // Group: real opportunities vs not-opportunities vs pending
  const opps = items.filter(i => i.parseStatus === 'parsed');
  const notOpps = items.filter(i => i.parseStatus === 'not_opportunity');
  const pending = items.filter(i => i.parseStatus === 'pending');
  const failed = items.filter(i => i.parseStatus === 'failed');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <InboxHeader
        count={opps.length}
        onSync={sync}
        syncing={syncing}
        onNavSettings={onNavSettings}
      />

      <div className="lu-main-scroll" style={{ padding: '20px 28px 60px' }}>
        <div style={{ maxWidth: 920 }}>
          {error && (
            <div style={{
              padding: '14px 18px', background: 'rgba(224, 153, 90, 0.08)',
              border: '1px solid rgba(224, 153, 90, 0.25)', borderRadius: 4,
              color: 'var(--ink-2)', fontSize: 13.5, marginBottom: 18,
            }}>
              {error}
            </div>
          )}

          {items.length === 0 && !error && (
            <EmptyState onSync={sync} syncing={syncing}/>
          )}

          {pending.length > 0 && (
            <Section eyebrow="PARSING IN PROGRESS" title="Awaiting Claude" count={pending.length}>
              {pending.map(i => <TriageRow key={i.id} item={i} disabled/>)}
            </Section>
          )}

          {opps.length > 0 && (
            <Section eyebrow="TO TRIAGE" title="Parsed candidates" count={opps.length}>
              {opps.map(i => (
                <TriageRow key={i.id} item={i}
                  open={openItem === i.id}
                  onOpen={() => setOpenItem(openItem === i.id ? null : i.id)}
                  onAccepted={() => { setOpenItem(null); load(); }}
                  onRejected={() => load()}/>
              ))}
            </Section>
          )}

          {notOpps.length > 0 && (
            <Section eyebrow="DISMISSED" title="Not opportunities" count={notOpps.length} dim>
              {notOpps.map(i => (
                <TriageRow key={i.id} item={i} dim
                  open={openItem === i.id}
                  onOpen={() => setOpenItem(openItem === i.id ? null : i.id)}
                  onAccepted={() => { setOpenItem(null); load(); }}
                  onRejected={() => load()}/>
              ))}
            </Section>
          )}

          {failed.length > 0 && (
            <Section eyebrow="ERRORS" title="Failed to parse" count={failed.length} dim>
              {failed.map(i => (
                <TriageRow key={i.id} item={i} dim showError
                  open={openItem === i.id}
                  onOpen={() => setOpenItem(openItem === i.id ? null : i.id)}
                  onAccepted={() => { setOpenItem(null); load(); }}
                  onRejected={() => load()}/>
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}


// ── Header ──────────────────────────────────────────────────────────────

function InboxHeader({ count, onSync, syncing, onNavSettings }) {
  return (
    <div className="hl-b" style={{
      padding: '24px 28px 20px',
      display: 'flex', alignItems: 'center', gap: 20,
    }}>
      <div style={{ flex: 1 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Inbox · Email triage</div>
        <h1 className="serif" style={{
          fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em',
          margin: 0, color: 'var(--ink-1)',
        }}>
          {count > 0 ? (
            <>{count} {count === 1 ? 'candidate' : 'candidates'} to triage.</>
          ) : (
            <>Nothing to triage. <span className="serif-italic" style={{ color: 'var(--ink-3)' }}>Hit sync.</span></>
          )}
        </h1>
      </div>
      <Btn variant="ghost" onClick={onSync} disabled={syncing} icon="spark">
        {syncing ? 'Syncing…' : 'Sync Gmail now'}
      </Btn>
    </div>
  );
}


// ── Section wrapper ─────────────────────────────────────────────────────

function Section({ eyebrow, title, count, dim, children }) {
  return (
    <section style={{ marginBottom: 28, opacity: dim ? 0.82 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
        <div className="eyebrow">{eyebrow}</div>
        <div style={{ flex: 1, height: 1, background: 'var(--line-1)' }}/>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>{count}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </section>
  );
}


// ── A single triage row ─────────────────────────────────────────────────

function TriageRow({ item, open, onOpen, onAccepted, onRejected, dim, disabled, showError }) {
  const parsed = item.parsed || {};
  const persona = parsed.persona ? window.LU_PERSONAS.find(p => p.id === parsed.persona) : null;

  return (
    <div style={{
      background: 'var(--bg-1)',
      border: open ? '1px solid var(--line-2)' : '1px solid var(--line-1)',
      borderRadius: 4, overflow: 'hidden',
      transition: 'border-color .15s',
    }}>
      {/* Compact header row */}
      <div
        onClick={!disabled && onOpen ? onOpen : undefined}
        style={{
          padding: '14px 18px',
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          gap: 16, alignItems: 'center',
          cursor: !disabled && onOpen ? 'pointer' : 'default',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
            <span className="serif" style={{
              fontSize: 17, color: 'var(--ink-1)', letterSpacing: '-0.012em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {parsed.company || item.fromName || item.fromAddress}
            </span>
            {parsed.role && (
              <span style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                · {parsed.role}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span className="mono" style={{ letterSpacing: '0.03em' }}>{item.fromAddress}</span>
            {' · '}
            {item.subject}
          </div>
          {showError && item.errorMessage && (
            <div style={{ fontSize: 12, color: 'var(--signal)', marginTop: 6 }}>
              {item.errorMessage}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {persona && <PersonaTag personaId={persona.id} size="s"/>}
          {parsed.fit && <FitStars value={parsed.fit} size={10}/>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {disabled && (
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
              parsing…
            </span>
          )}
        </div>
      </div>

      {/* Expanded editor */}
      {open && (
        <ExpandedEditor item={item} parsed={parsed} onAccepted={onAccepted} onRejected={onRejected}/>
      )}
    </div>
  );
}


// ── Expanded editor for one triage row ──────────────────────────────────

function ExpandedEditor({ item, parsed, onAccepted, onRejected }) {
  const [draft, setDraft] = React.useState(() => ({
    company: parsed.company || '',
    role: parsed.role || '',
    stage: 'discovered',
    persona: parsed.persona || '',
    fit: parsed.fit || 3,
    nextAction: parsed.next_action || '',
    notes: parsed.notes || '',
    contact: parsed.contact ? {
      name: parsed.contact.name || '',
      title: parsed.contact.title || '',
      warmth: parsed.contact.warmth || 'recruiter',
    } : null,
  }));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);

  const update = (field, value) => setDraft(d => ({ ...d, [field]: value }));
  const updateContact = (field, value) => setDraft(d => ({
    ...d,
    contact: { ...(d.contact || { name: '', title: '', warmth: 'recruiter' }), [field]: value },
  }));

  const accept = async () => {
    setBusy(true); setError(null);
    try {
      await LU_API.post('/api/inbox/' + item.id + '/accept', {
        company: draft.company,
        role: draft.role,
        stage: draft.stage,
        persona: draft.persona || null,
        fit: draft.fit || null,
        source: item.kind === 'linkedin' ? 'LinkedIn · saved job' : 'Gmail · ' + (item.fromName || item.fromAddress.split('@')[0]),
        contact: draft.contact && draft.contact.name ? draft.contact : null,
        nextAction: draft.nextAction || null,
        notes: draft.notes || null,
      });
      onAccepted();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!window.confirm(`Reject this ${item.kind === 'linkedin' ? 'job' : 'email'}? It will be marked dismissed (kept for audit).`)) return;
    setBusy(true); setError(null);
    try {
      await LU_API.post('/api/inbox/' + item.id + '/reject', {});
      onRejected();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: '4px 18px 18px', borderTop: '1px solid var(--line-1)' }}>
      {/* Original email preview */}
      <div style={{ margin: '14px 0 18px', padding: '12px 14px', background: 'var(--bg-2)', borderRadius: 3, border: '1px solid var(--line-1)' }}>
        <div className="eyebrow" style={{ marginBottom: 8, fontSize: 10 }}>{item.kind === 'linkedin' ? 'Saved on LinkedIn' : 'Original snippet'}</div>
        <div className="serif-italic" style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
          "{item.snippet}…"
        </div>
        {item.jobUrl && (
          <a href={item.jobUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-block', marginTop: 8, fontSize: 12.5, color: 'var(--ink-1)' }}>
            View job on LinkedIn ↗
          </a>
        )}
        {parsed.reasoning && (
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8 }}>
            <b style={{ color: 'var(--ink-2)' }}>Claude:</b> {parsed.reasoning}
          </div>
        )}
      </div>

      {/* Editable fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Field label="Company">
          <TextInput value={draft.company} onChange={v => update('company', v)} placeholder="Company name"/>
        </Field>
        <Field label="Role">
          <TextInput value={draft.role} onChange={v => update('role', v)} placeholder="Role title"/>
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Field label="Persona">
          <Select
            value={draft.persona}
            onChange={v => update('persona', v)}
            options={[{ value: '', label: '— select —' }, ...window.LU_PERSONAS.map(p => ({ value: p.id, label: p.code + ' · ' + p.name }))]}
          />
        </Field>
        <Field label="Fit">
          <div style={{ padding: '8px 0' }}>
            <FitStars value={draft.fit} size={16} interactive onChange={v => update('fit', v)}/>
          </div>
        </Field>
        <Field label="Stage">
          <Select
            value={draft.stage}
            onChange={v => update('stage', v)}
            options={window.LU_STAGES.map(s => ({ value: s.id, label: s.label }))}
          />
        </Field>
      </div>

      {(draft.contact || parsed.contact) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px', gap: 14, marginBottom: 14 }}>
          <Field label="Contact name">
            <TextInput value={draft.contact?.name || ''} onChange={v => updateContact('name', v)} placeholder="Person's name"/>
          </Field>
          <Field label="Contact title">
            <TextInput value={draft.contact?.title || ''} onChange={v => updateContact('title', v)} placeholder="Their role"/>
          </Field>
          <Field label="Warmth">
            <Select
              value={draft.contact?.warmth || 'recruiter'}
              onChange={v => updateContact('warmth', v)}
              options={[
                { value: 'strong', label: 'Strong' },
                { value: 'warm', label: 'Warm' },
                { value: 'cold', label: 'Cold' },
                { value: 'recruiter', label: 'Recruiter' },
              ]}
            />
          </Field>
        </div>
      )}

      <Field label="Next action">
        <TextInput value={draft.nextAction} onChange={v => update('nextAction', v)} placeholder="What should happen next"/>
      </Field>
      <div style={{ height: 14 }}/>
      <Field label="Notes">
        <TextArea value={draft.notes} onChange={v => update('notes', v)} placeholder="Context worth preserving" rows={3}/>
      </Field>

      {error && (
        <div style={{ color: 'var(--signal)', fontSize: 13, marginTop: 12 }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 18, alignItems: 'center' }}>
        <Btn variant="primary" onClick={accept} disabled={busy || !draft.company || !draft.role} icon="check">
          {busy ? 'Working…' : 'Accept into Pipeline'}
        </Btn>
        <Btn variant="ghost" onClick={reject} disabled={busy}>Reject</Btn>
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'var(--mono)', letterSpacing: '0.04em' }}>
          From {item.fromAddress}
        </span>
      </div>
    </div>
  );
}


// ── Empty state ─────────────────────────────────────────────────────────

function EmptyState({ onSync, syncing }) {
  return (
    <div style={{
      padding: '60px 40px',
      textAlign: 'center',
      border: '1px dashed var(--line-2)',
      borderRadius: 4,
      color: 'var(--ink-3)',
    }}>
      <div className="serif" style={{ fontSize: 22, color: 'var(--ink-2)', marginBottom: 12, letterSpacing: '-0.012em' }}>
        The triage queue is empty.
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-3)', maxWidth: 460, margin: '0 auto 20px' }}>
        Label some recruiter or network emails with <code style={{
          fontFamily: 'var(--mono)', fontSize: 12, background: 'var(--bg-2)',
          padding: '1px 6px', borderRadius: 3, border: '1px solid var(--line-1)',
        }}>LevelUp</code> in Gmail, then sync here. Claude parses each into a structured candidate.
      </p>
      <Btn variant="ghost" onClick={onSync} disabled={syncing} icon="spark">
        {syncing ? 'Syncing…' : 'Sync Gmail now'}
      </Btn>
    </div>
  );
}
