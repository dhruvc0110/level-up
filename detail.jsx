// Level Up — Opportunity Detail slide-over with split-pane AI outreach
// Left: context (editable). Right: drafts list. Bottom: instruction box + Generate.

// inline: sits beside the Pipeline list (tab state comes from the list);
// otherwise a slide-over with its own tab state.
function DetailPanel({ opp, onClose, onUpdate, onDelete, inline, tab, onTab, listOpen, narrow, onToggleList }) {
  const [generating, setGenerating] = React.useState(false);
  const [instruction, setInstruction] = React.useState('');
  const [error, setError] = React.useState(null);
  const [ownTab, setOwnTab] = React.useState('overview'); // overview | outreach | resume | letter
  const docTab = tab || ownTab;
  const setDocTab = onTab || setOwnTab;
  const O = window.LU_OUTREACH;
  const people = O ? O.recipients(opp) : [];
  const hasSent = (opp.drafts || []).some((d) => d.sentAt);
  const [toKey, setToKey] = React.useState(() => (people[0] ? people[0].key : ''));
  const to = people.find((p) => p.key === toKey) || null;
  const [type, setType] = React.useState(() => (O ? O.suggestType(opp, people[0] || null, hasSent) : 'hiring'));
  const pickTo = (key) => { setToKey(key); const r = people.find((p) => p.key === key) || null; if (O) setType(O.suggestType(opp, r, hasSent)); };

  // Slide-over only: lock body scroll, Esc to close
  React.useEffect(() => {
    if (inline) return undefined;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose, inline]);

  // With an instruction, Claude revises the latest draft of this type; without, it writes a fresh one.
  const generate = async () => {
    if (!O) { setError('Refresh the page (Cmd+Shift+R) to load outreach.'); return; }
    setGenerating(true); setError(null);
    const base = instruction.trim() ? (opp.drafts || []).find((d) => d.type === type && d.body) : null;
    try {
      const d = await O.draft(opp, { type, to, instruction: instruction.trim() || null, base });
      onUpdate({ ...opp, drafts: [d, ...(opp.drafts || [])] });
      setInstruction('');
    } catch (e) {
      setError(String(e.message || e).slice(0, 200));
    } finally { setGenerating(false); }
  };

  const body = (<>
        <DetailHeader opp={opp} onClose={inline ? null : onClose} onDelete={onDelete} onUpdate={onUpdate}
          listOpen={listOpen} narrow={narrow} onToggleList={onToggleList}/>

        {/* Overview, then the documents for this job: Outreach, Resume, Cover letter */}
        <div style={{ display: 'flex', gap: 2, padding: '0 28px', borderBottom: '1px solid var(--line-1)', flex: '0 0 auto' }}>
          {[['overview', 'Overview'], ['outreach', 'Outreach'], ['resume', 'Resume'], ['letter', 'Cover letter']].map(([k, l]) => (
            <button key={k} onClick={() => setDocTab(k)} style={{
              appearance: 'none', cursor: 'pointer', padding: '10px 12px', fontSize: 13, border: 'none', background: 'transparent',
              color: docTab === k ? 'var(--ink-1)' : 'var(--ink-3)', borderBottom: '2px solid ' + (docTab === k ? 'var(--ink-1)' : 'transparent'),
            }}>{l}{k === 'outreach' && (opp.drafts || []).filter((d) => d.body).length ? ` (${(opp.drafts || []).filter((d) => d.body).length})` : ''}{k === 'resume' && opp.docs && opp.docs.resume && (opp.docs.resume.versions || []).length ? ` (${opp.docs.resume.versions.length})` : ''}{k === 'letter' && opp.docs && opp.docs.letter && (opp.docs.letter.versions || []).length ? ` (${opp.docs.letter.versions.length})` : ''}</button>
          ))}
        </div>

        {docTab === 'overview' ? (
          <DetailContext opp={opp} onUpdate={onUpdate}/>
        ) : docTab === 'outreach' ? (<>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <DetailDrafts opp={opp} onUpdate={onUpdate} generating={generating} error={error}/>
          </div>
          <DetailInstructionBar
            instruction={instruction} setInstruction={setInstruction}
            type={type} setType={setType} people={people} toKey={toKey} setToKey={pickTo}
            onGenerate={generate} generating={generating}
            hasDrafts={(opp.drafts || []).some((d) => d.type === type)}
          />
        </>) : (
          <div style={{ flex: 1, minHeight: 0 }}>
            {typeof ResumeWorkspace === 'function'
              ? (docTab === 'resume' ? <ResumeWorkspace opp={opp} onUpdate={onUpdate}/> : <LetterWorkspace opp={opp} onUpdate={onUpdate}/>)
              : <div style={{ padding: 28, color: 'var(--ink-3)' }}>Refresh the page (Cmd+Shift+R) to load documents.</div>}
          </div>
        )}
        <style>{`
          @keyframes lu-fade-in { from { opacity: 0 } to { opacity: 1 } }
          @keyframes lu-slide-in { from { transform: translateX(20px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
          @keyframes lu-draft-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
        `}</style>
  </>);

  if (inline) {
    return <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-1)' }}>{body}</div>;
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
        zIndex: 90, animation: 'lu-fade-in .18s ease-out',
      }}/>

      {/* Slide-over */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(1180px, 92vw)',
        background: 'var(--bg-1)',
        borderLeft: '1px solid var(--line-2)',
        zIndex: 100,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-30px 0 60px rgba(0,0,0,0.4)',
        animation: 'lu-slide-in .22s cubic-bezier(.2,.7,.3,1)',
      }}>
        {body}
      </div>
    </>
  );
}

// ── Header ───────────────────────────────────────────────────────────────
function DetailHeader({ opp, onClose, onDelete, onUpdate, listOpen, narrow, onToggleList }) {
  const sq = {
    width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', border: '1px solid var(--line-1)', borderRadius: 3, color: 'var(--ink-2)', cursor: 'pointer',
  };
  return (
    <div style={{
      padding: '18px 28px 14px', borderBottom: '1px solid var(--line-1)', flex: '0 0 auto',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px 24px', flexWrap: 'wrap-reverse',
    }}>
      <div style={{ minWidth: 260, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span className="eyebrow">{opp.company}</span>
          <span style={{ width: 1, height: 10, background: 'var(--line-2)' }}/>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
            ID · {opp.id.toUpperCase()}
          </span>
        </div>
        <h2 className="serif" style={{
          margin: 0, fontSize: 28, fontWeight: 400, letterSpacing: '-0.018em', lineHeight: 1.15,
          color: 'var(--ink-1)', textWrap: 'pretty',
        }}>
          {opp.role}
        </h2>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <StagePicker value={opp.stage} onChange={(v) => onUpdate({ ...opp, stage: v })}/>
          <PersonaTag personaId={opp.persona} size="s"/>
          <FitStars value={opp.fit} size={12}/>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
        {onToggleList && (
          <button onClick={onToggleList} style={{ ...sq, width: 'auto', padding: '0 10px', fontSize: 12, fontFamily: 'var(--sans)' }}
            title={narrow ? 'Back to the list' : listOpen ? 'Hide the list for more room' : 'Show the list'}>
            {narrow ? '← Back to list' : listOpen ? 'Wider view' : 'Show list'}
          </button>
        )}
        <Btn size="s" variant="ghost" onClick={onDelete}>Archive</Btn>
        {onClose && (
          <button onClick={onClose} aria-label="Close" style={sq}>
            <Icon name="close" size={15} stroke={1.4}/>
          </button>
        )}
      </div>
    </div>
  );
}

// Stage as an attribute: a compact select showing the stage colour.
function StagePicker({ value, onChange }) {
  const s = window.LU_STAGES.find((x) => x.id === value) || window.LU_STAGES[0];
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 10px', borderRadius: 3,
        border: '1px solid var(--line-2)', background: 'var(--bg-2)', color: 'var(--ink-1)', fontSize: 12, fontWeight: 500,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: stageColor(s.id) }}/>
        {s.label}
        <svg width="8" height="5" viewBox="0 0 10 6" aria-hidden="true"><path fill="currentColor" d="M0 0h10L5 6z"/></svg>
      </span>
      <select value={s.id} onChange={(e) => onChange(e.target.value)} aria-label="Stage"
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}>
        {window.LU_STAGES.map((x) => <option key={x.id} value={x.id}>{x.short} · {x.label}</option>)}
      </select>
    </span>
  );
}

// ── Overview: key facts, then research, people and notes ──────────────────
function DetailContext({ opp, onUpdate }) {
  const update = (patch) => onUpdate({ ...opp, ...patch });
  const f = window.oppFacts ? window.oppFacts(opp) : {};
  const added = f.addedAt ? new Date(f.addedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not recorded';
  const personas = window.activePersonas ? window.activePersonas(opp.persona) : window.LU_PERSONAS;

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '20px 28px 28px' }}>
      <div style={{ maxWidth: 860 }}>
        {/* Key facts: everything the Pipeline list can search and filter on */}
        <div className="eyebrow" style={{ marginBottom: 10 }}>Key facts</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px 18px', marginBottom: 26 }}>
          <Fact label="Stage">
            <Select value={opp.stage} onChange={(v) => update({ stage: v })}
              options={window.LU_STAGES.map((s) => ({ value: s.id, label: `${s.short} · ${s.label}` }))}/>
          </Fact>
          <Fact label="Persona">
            <Select value={opp.persona || ''} onChange={(v) => update({ persona: v || null })}
              options={[{ value: '', label: 'No persona' }, ...personas.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))]}/>
          </Fact>
          <Fact label="Fit">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 32 }}>
              <FitStars value={opp.fit} size={16} interactive onChange={(v) => update({ fit: v })}/>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{opp.fit ? `${opp.fit} / 5` : 'Not rated'}</span>
            </div>
          </Fact>
          <Fact label="Location">
            <TextInput value={f.location} placeholder="e.g. Boston, MA" onChange={(v) => update({ location: v })}/>
          </Fact>
          <Fact label="Work mode">
            <Select value={f.workplace || ''} onChange={(v) => update({ workplace: v || null })}
              options={[{ value: '', label: 'Not set' }, 'Remote', 'Hybrid', 'On-site']}/>
          </Fact>
          <Fact label="Compensation">
            <TextInput value={f.compensation} placeholder="e.g. $350–420k base + bonus" onChange={(v) => update({ compensation: v })}/>
          </Fact>
          <Fact label="Industry">
            <TextInput value={f.industry} placeholder="e.g. Healthcare" onChange={(v) => update({ industry: v })}/>
          </Fact>
          <Fact label="Company size">
            <TextInput value={f.companySize} placeholder="e.g. 1,001–5,000 employees" onChange={(v) => update({ companySize: v })}/>
          </Fact>
          <Fact label="Source">
            <TextInput value={opp.source} placeholder="e.g. LinkedIn, referral, recruiter" onChange={(v) => update({ source: v })}/>
          </Fact>
          <Fact label="Next action" wide>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 150px', gap: 8, alignItems: 'center' }}>
              <TextInput value={opp.nextAction} placeholder="e.g. Follow up with the recruiter" onChange={(v) => update({ nextAction: v })}/>
              <input type="date" value={opp.dueDate || ''} onChange={(e) => update({ dueDate: e.target.value })} aria-label="Due date"
                style={{ height: 32, padding: '0 8px', background: 'var(--bg-1)', color: 'var(--ink-1)', border: '1px solid var(--line-1)', borderRadius: 3, fontFamily: 'var(--sans)', fontSize: 12.5, colorScheme: 'dark' }}/>
            </div>
            <div style={{ marginTop: 5, minHeight: 14 }}><DueChip dueDate={opp.dueDate}/></div>
          </Fact>
          <Fact label="Added">
            <div style={{ height: 32, display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--ink-2)' }}>{added}</div>
          </Fact>
        </div>

        {/* Company brief (web research) */}
        {opp.company && (
          <DetailField label="Company">
            <CompanyBrief company={opp.company} context={[opp.role && 'Role: ' + opp.role, opp.source && 'Source: ' + opp.source].filter(Boolean).join('\n')}/>
          </DetailField>
        )}

        {/* From the LinkedIn job page (bookmark on a job page) */}
        {opp.enrichment && (
          <DetailField label="Job details">
            <JobIntel enrichment={opp.enrichment}/>
          </DetailField>
        )}

        {/* Warm paths */}
        <DetailField label={`People you know at ${opp.company || 'this company'}`}>
          <NetworkAt company={opp.company} hiringManager={opp.enrichment && opp.enrichment.hiringManager}/>
        </DetailField>

        {/* Key contact */}
        <DetailField label="Key contact">
          {opp.contact ? (
            <div style={{
              border: '1px solid var(--line-1)', borderRadius: 3,
              padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <WarmthDot warmth={opp.contact.warmth}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: 'var(--ink-1)', fontWeight: 500 }}>
                  {opp.contact.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>
                  {opp.contact.title}
                </div>
              </div>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.06em' }}>
                {opp.contact.warmth?.toUpperCase()}
              </span>
            </div>
          ) : (
            <button onClick={() => update({ contact: { name: '', title: '', warmth: 'cold' }})}
              style={{
                border: '1px dashed var(--line-2)', background: 'transparent',
                color: 'var(--ink-3)', padding: '10px 12px', borderRadius: 3,
                fontSize: 12, fontFamily: 'var(--sans)', textAlign: 'left',
                cursor: 'pointer', width: '100%',
              }}>
              + Add a key contact
            </button>
          )}
        </DetailField>

        {/* Notes */}
        <DetailField label="Notes">
          <TextArea value={opp.notes} onChange={(v) => update({ notes: v })} rows={6}/>
        </DetailField>
      </div>
    </div>
  );
}

function Fact({ label, wide, children }) {
  return (
    <div style={{ gridColumn: wide ? '1 / -1' : undefined, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5, letterSpacing: '0.02em' }}>{label}</div>
      {children}
    </div>
  );
}

function DetailField({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--ink-4)', fontStyle: 'italic',
                              fontFamily: 'var(--serif)', marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

function ActivityLine({ when, what, last }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '74px 1fr', gap: 12,
      padding: '7px 0',
      borderBottom: last ? 'none' : '1px solid var(--line-1)',
    }}>
      <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.04em' }}>
        {when.toUpperCase()}
      </span>
      <span>{what}</span>
    </div>
  );
}

// ── RIGHT: Drafts column ─────────────────────────────────────────────────
function DetailDrafts({ opp, onUpdate, generating, error }) {
  const drafts = (opp.drafts || []).filter((d) => d.body && d.body !== '...');
  const save = (next) => onUpdate({ ...opp, drafts: (opp.drafts || []).map((x) => (x.id === next.id ? next : x)) });
  const markSent = (d) => {
    const now = new Date();
    const due = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const sentAt = now.toISOString();
    const who = d.to && d.to.name;
    onUpdate({
      ...opp,
      drafts: (opp.drafts || []).map((x) => (x.id === d.id ? { ...x, sentAt } : x)),
      nextAction: who ? `Follow up with ${who}` : 'Follow up on outreach',
      dueDate: due,
    });
    if (window.LU_CAREER && window.LU_CAREER.markUsed && (d.used || []).length) {
      window.LU_CAREER.markUsed(d.used, { ref: opp.id + ':' + d.id, kind: 'outreach', oppId: opp.id, company: opp.company, role: opp.role, at: sentAt });
    }
    window.LU_CORE && window.LU_CORE.pill(`Marked as sent · follow-up due ${new Date(due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`);
  };

  return (
    <div style={{
      flex: 1, minHeight: 0, overflow: 'auto', padding: '20px 28px 24px',
      background: 'var(--bg-0)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 14,
      }}>
        <div>
          <span className="eyebrow">Outreach drafts</span> <ModelPicker task="outreach" compact/>
        </div>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>
          {drafts.length} {drafts.length === 1 ? 'DRAFT' : 'DRAFTS'}
        </span>
      </div>

      {error && <div style={{ fontSize: 12.5, color: 'var(--signal)', marginBottom: 12 }}>Couldn’t draft: {error}</div>}
      {generating && <ThinkingLattice/>}

      {!generating && drafts.length === 0 && <DraftsEmpty opp={opp}/>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {drafts.map((d, i) => (
          <DraftCard key={d.id} draft={d} index={i} onSave={save} onSent={() => markSent(d)} onDelete={() => {
            onUpdate({ ...opp, drafts: (opp.drafts || []).filter(x => x.id !== d.id) });
          }}/>
        ))}
      </div>
    </div>
  );
}

function draftWhen(d) {
  if (!d.createdAt) return d.timestamp || '';
  const t = new Date(d.createdAt), mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + 'm ago';
  if (mins < 1440) return Math.round(mins / 60) + 'h ago';
  return t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function DraftCard({ draft, index, onDelete, onSave, onSent }) {
  const [copied, setCopied] = React.useState(null);
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState('');
  const [subj, setSubj] = React.useState('');
  const copy = (what, value) => {
    navigator.clipboard?.writeText(value);
    setCopied(what); setTimeout(() => setCopied(null), 1400);
  };
  const T = window.LU_OUTREACH && window.LU_OUTREACH.TYPES[draft.type];
  const limit = T && T.limit;
  const career = (window.LU_CORE && window.LU_CORE.doc().career) || {};
  const used = (draft.used || []).map((id) => (career.achievements || []).find((a) => a.id === id)).filter(Boolean);
  const iconBtn = { width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 3, color: 'var(--ink-3)', cursor: 'pointer' };
  const small = { appearance: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--ink-2)', textDecoration: 'underline', textDecorationColor: 'var(--line-2)', textUnderlineOffset: 3 };
  return (
    <div style={{
      border: '1px solid var(--line-1)', borderRadius: 3,
      background: index === 0 ? 'var(--bg-2)' : 'var(--bg-1)',
      animation: index === 0 ? 'lu-draft-in .35s ease-out' : 'none',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--line-1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
          <span style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 500 }}>{draft.channel}</span>
          {draft.to && <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>to {draft.to.name}</span>}
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.04em' }}>· {draftWhen(draft)}</span>
          {draft.sentAt && <span className="mono" style={{ fontSize: 10, color: 'oklch(62% 0.12 150)', letterSpacing: '0.06em' }}>SENT {new Date(draft.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()}</span>}
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <button onClick={() => copy('all', (draft.subject ? 'Subject: ' + draft.subject + '\n\n' : '') + draft.body)} title="Copy note" style={{ ...iconBtn, color: copied === 'all' ? 'var(--ink-1)' : 'var(--ink-3)' }}>
            <Icon name={copied === 'all' ? 'check' : 'copy'} size={13} stroke={1.6}/>
          </button>
          <button onClick={onDelete} title="Delete" style={iconBtn}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink-1)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-3)'}>
            <Icon name="close" size={13} stroke={1.6}/>
          </button>
        </div>
      </div>
      {editing ? (
        <div style={{ padding: '12px 14px' }}>
          {draft.subject != null && <div style={{ marginBottom: 8 }}><TextInput value={subj} onChange={setSubj}/></div>}
          <TextArea value={text} onChange={setText} rows={10}/>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Btn variant="primary" size="s" onClick={() => { onSave({ ...draft, body: text, subject: draft.subject != null ? subj : null, edited: true }); setEditing(false); }}>Save</Btn>
            <Btn variant="ghost" size="s" onClick={() => setEditing(false)}>Cancel</Btn>
          </div>
        </div>
      ) : (
        <div style={{ padding: '14px 16px' }}>
          {draft.subject && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 8 }}>Subject: <span style={{ color: 'var(--ink-1)' }}>{draft.subject}</span></div>}
          <div style={{ fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.65, color: 'var(--ink-1)', whiteSpace: 'pre-wrap', letterSpacing: '-0.003em' }}>{draft.body}</div>
          {limit && <div className="mono" style={{ fontSize: 10.5, marginTop: 6, color: draft.body.length > limit ? 'var(--signal)' : 'var(--ink-4)' }}>{draft.body.length} / {limit} characters</div>}
        </div>
      )}
      {draft.blurb && !editing && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--line-1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="eyebrow">Forwardable blurb</span>
            <button style={small} onClick={() => copy('blurb', draft.blurb)}>{copied === 'blurb' ? 'Copied' : 'Copy blurb'}</button>
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)', whiteSpace: 'pre-wrap', marginTop: 4 }}>{draft.blurb}</div>
        </div>
      )}
      {(draft.check || []).length > 0 && !editing && (
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--line-1)', fontSize: 12, color: 'var(--ink-2)' }}>
          <span className="eyebrow" style={{ marginRight: 6 }}>Check before sending</span>
          {draft.check.map((c, i) => <div key={i} style={{ padding: '2px 0' }}><span style={{ color: 'oklch(70% 0.12 75)', marginRight: 6 }}>▲</span>{c}</div>)}
        </div>
      )}
      {used.length > 0 && !editing && (
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--line-1)', fontSize: 12, color: 'var(--ink-3)' }}>
          <span className="eyebrow" style={{ marginRight: 6 }}>Based on</span>
          {used.map((a) => <div key={a.id} title={a.text} style={{ padding: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>· {a.text}</div>)}
        </div>
      )}
      {draft.instruction && !editing && (
        <div style={{
          padding: '8px 16px', borderTop: '1px solid var(--line-1)',
          fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)',
          background: 'var(--bg-1)',
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <span style={{ color: 'var(--ink-4)', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>INSTRUCTION ·</span>
          <span style={{ fontFamily: 'var(--sans)', fontStyle: 'italic', color: 'var(--ink-2)' }}>
            "{draft.instruction}"
          </span>
        </div>
      )}
      {!editing && (
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--line-1)', display: 'flex', gap: 16, alignItems: 'center' }}>
          <button style={small} onClick={() => { setText(draft.body); setSubj(draft.subject || ''); setEditing(true); }}>Edit</button>
          {!draft.sentAt && onSent && <button style={small} onClick={onSent} title="Records the date, sets a follow-up in 7 days and notes which achievements you used">Mark as sent</button>}
        </div>
      )}
    </div>
  );
}

function DraftsEmpty({ opp }) {
  return (
    <div style={{
      padding: '40px 24px', textAlign: 'left',
      border: '1px dashed var(--line-1)', borderRadius: 3,
    }}>
      <div className="serif-italic" style={{
        fontSize: 17, color: 'var(--ink-2)', marginBottom: 8,
        letterSpacing: '-0.01em',
      }}>
        No drafts yet.
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6, maxWidth: 360 }}>
        Pick who it's for and the kind of note below, then <b style={{ fontWeight: 500, color: 'var(--ink-2)' }}>Draft</b>. Claude writes from your Career profile proof and your <span style={{ color: 'var(--ink-2)' }}>{(window.LU_PERSONAS.find(p => p.id === opp.persona) || {}).name || 'persona'}</span> angle, and never invents anything. Nothing is sent: you copy it and send it yourself.
      </div>
    </div>
  );
}

// ── Thinking lattice — animated generation indicator ─────────────────────
function ThinkingLattice() {
  const [phase, setPhase] = React.useState(0);
  const phases = [
    'Reading persona context',
    'Considering contact and warmth',
    'Selecting opening angle',
    'Drafting',
  ];
  React.useEffect(() => {
    const interval = setInterval(() => {
      setPhase(p => Math.min(p + 1, phases.length - 1));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      border: '1px solid var(--line-1)', borderRadius: 3,
      background: 'var(--bg-2)',
      padding: '20px 22px',
      marginBottom: 12,
      display: 'flex', alignItems: 'center', gap: 22,
    }}>
      <LatticeAnim/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="eyebrow" style={{ marginBottom: 8, color: 'var(--ink-3)' }}>
          Generating
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {phases.map((p, i) => (
            <div key={i} style={{
              fontSize: 12.5, fontFamily: 'var(--mono)', letterSpacing: '0.005em',
              color: i < phase ? 'var(--ink-3)' : i === phase ? 'var(--ink-1)' : 'var(--ink-4)',
              transition: 'color .3s',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 8, color: i === phase ? 'var(--ink-1)' : 'var(--ink-4)' }}>
                {i < phase ? '✓' : i === phase ? '·' : ' '}
              </span>
              <span style={{ textDecoration: i < phase ? 'none' : 'none', fontStyle: i === phase ? 'normal' : 'normal' }}>
                {p}{i === phase ? '…' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LatticeAnim() {
  return (
    <div style={{
      width: 56, height: 56, position: 'relative',
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      gridTemplateRows: 'repeat(4, 1fr)', gap: 2,
      flex: '0 0 56px',
    }}>
      {Array.from({ length: 16 }).map((_, i) => {
        const row = Math.floor(i / 4), col = i % 4;
        const delay = ((row + col) * 0.13) % 1;
        return (
          <div key={i} style={{
            background: 'var(--ink-1)',
            opacity: 0.2,
            animation: `lu-lattice 1.5s ease-in-out ${delay}s infinite`,
          }}/>
        );
      })}
      <style>{`
        @keyframes lu-lattice {
          0%, 100% { opacity: 0.1; transform: scale(0.7); }
          50% { opacity: 0.95; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Bottom instruction bar ───────────────────────────────────────────────
function DetailInstructionBar({ instruction, setInstruction, type, setType, people, toKey, setToKey,
                                onGenerate, generating, hasDrafts }) {
  const TYPES = (window.LU_OUTREACH && window.LU_OUTREACH.TYPES) || {};
  const sel = { height: 34, padding: '0 8px', background: 'var(--bg-0)', color: 'var(--ink-1)', border: '1px solid var(--line-2)', borderRadius: 3, fontFamily: 'var(--sans)', fontSize: 12.5, width: 180, minWidth: 0, flex: '0 1 180px' };
  return (
    <div style={{
      borderTop: '1px solid var(--line-2)',
      background: 'var(--bg-1)',
      padding: '14px 28px',
      flex: '0 0 auto',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <select aria-label="Who the note is for" value={toKey} onChange={(e) => setToKey(e.target.value)} style={sel}>
        <option value="">No specific person</option>
        {people.map((p) => <option key={p.key} value={p.key}>{p.name}{p.title ? ' · ' + p.title.slice(0, 40) : ''}</option>)}
      </select>
      <select aria-label="Kind of note" value={type} onChange={(e) => setType(e.target.value)} style={sel}>
        {Object.entries(TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
      </select>

      {/* Instruction input */}
      <div style={{ flex: '1 1 120px', minWidth: 0, position: 'relative' }}>
        <Icon name="sparkles" size={14} stroke={1.4} style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--ink-3)', pointerEvents: 'none',
        }}/>
        <input value={instruction} onChange={(e) => setInstruction(e.target.value)}
          placeholder={hasDrafts ? 'Revise the latest: "warmer", "shorter", "lead with the M&A work"…' : 'Optional: anything to emphasise or avoid'}
          onKeyDown={(e) => { if (e.key === 'Enter' && !generating) onGenerate(); }}
          style={{
            width: '100%', height: 34, padding: '0 12px 0 32px',
            background: 'var(--bg-0)', color: 'var(--ink-1)',
            border: '1px solid var(--line-2)', borderRadius: 3,
            fontFamily: 'var(--sans)', fontSize: 13,
            outline: 'none', transition: 'border-color .12s',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = 'var(--line-3)'}
          onBlur={(e) => e.currentTarget.style.borderColor = 'var(--line-2)'}/>
      </div>

      <Btn variant="primary" size="m" icon={generating ? null : 'arrow-right'}
        onClick={onGenerate} disabled={generating}>
        {generating ? 'Drafting…' : (hasDrafts && instruction.trim() ? 'Revise' : 'Draft')}
      </Btn>
    </div>
  );
}

Object.assign(window, { DetailPanel, LatticeAnim, DetailField });
