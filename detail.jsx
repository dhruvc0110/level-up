// Level Up — Opportunity Detail slide-over with split-pane AI outreach
// Left: context (editable). Right: drafts list. Bottom: instruction box + Generate.

function DetailPanel({ opp, onClose, onUpdate, onDelete }) {
  const [generating, setGenerating] = React.useState(false);
  const [instruction, setInstruction] = React.useState('');
  const [channel, setChannel] = React.useState('Email');

  // Lock body scroll while open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Keyboard: Esc to close
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const generate = () => {
    setGenerating(true);
    setTimeout(() => {
      const persona = window.LU_PERSONAS.find(p => p.id === opp.persona);
      const draft = composeDraft(opp, persona, channel, instruction);
      const newDraft = {
        id: 'dr-' + Math.random().toString(36).slice(2, 8),
        timestamp: 'Just now',
        channel,
        instruction: instruction || null,
        body: draft,
      };
      onUpdate({ ...opp, drafts: [newDraft, ...(opp.drafts || []).map(d => d.body === '...' ? { ...d, body: composeDraft(opp, persona, d.channel, null) } : d)] });
      setGenerating(false);
      setInstruction('');
    }, 3200);
  };

  // Ensure any seed-data placeholder drafts have real content for the demo
  React.useEffect(() => {
    if (!opp.drafts?.length) return;
    if (opp.drafts.every(d => d.body !== '...')) return;
    const persona = window.LU_PERSONAS.find(p => p.id === opp.persona);
    const filled = opp.drafts.map(d => d.body === '...' ? { ...d, body: composeDraft(opp, persona, d.channel, null) } : d);
    onUpdate({ ...opp, drafts: filled });
    // eslint-disable-next-line
  }, []);

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
        <DetailHeader opp={opp} onClose={onClose} onDelete={onDelete}/>
        <DetailStageRow opp={opp} onUpdate={onUpdate}/>

        {/* Split-pane body */}
        <div style={{
          flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr',
          minHeight: 0,
        }}>
          <DetailContext opp={opp} onUpdate={onUpdate}/>
          <DetailDrafts opp={opp} onUpdate={onUpdate} generating={generating}/>
        </div>

        {/* Bottom instruction bar */}
        <DetailInstructionBar
          instruction={instruction} setInstruction={setInstruction}
          channel={channel} setChannel={setChannel}
          onGenerate={generate} generating={generating}
          hasDrafts={(opp.drafts?.length || 0) > 0}
        />
      </div>

      <style>{`
        @keyframes lu-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes lu-slide-in { from { transform: translateX(20px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        @keyframes lu-draft-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </>
  );
}

// ── Header ───────────────────────────────────────────────────────────────
function DetailHeader({ opp, onClose, onDelete }) {
  return (
    <div style={{
      padding: '20px 28px 16px',
      borderBottom: '1px solid var(--line-1)',
      flex: '0 0 auto',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 24,
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
        }}>
          <span className="eyebrow">{opp.company}</span>
          <span style={{ width: 1, height: 10, background: 'var(--line-2)' }}/>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.06em' }}>
            ID · {opp.id.toUpperCase()}
          </span>
        </div>
        <h2 className="serif" style={{
          margin: 0, fontSize: 30, fontWeight: 400,
          letterSpacing: '-0.018em', lineHeight: 1.15,
          color: 'var(--ink-1)', textWrap: 'pretty',
        }}>
          {opp.role}
        </h2>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <PersonaTag personaId={opp.persona} size="s"/>
          <FitStars value={opp.fit} size={12}/>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Btn size="s" variant="ghost" onClick={onDelete}>Archive</Btn>
        <button onClick={onClose} aria-label="Close"
          style={{
            width: 30, height: 30, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: '1px solid var(--line-1)',
            borderRadius: 3, color: 'var(--ink-2)', transition: 'all .12s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-2)'; e.currentTarget.style.color = 'var(--ink-1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-2)'; }}>
          <Icon name="close" size={15} stroke={1.4}/>
        </button>
      </div>
    </div>
  );
}

// ── Stage row ────────────────────────────────────────────────────────────
function DetailStageRow({ opp, onUpdate }) {
  return (
    <div style={{
      padding: '12px 28px',
      borderBottom: '1px solid var(--line-1)',
      flex: '0 0 auto',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span className="eyebrow" style={{ marginRight: 8 }}>Stage</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {window.LU_STAGES.map(s => {
          const active = s.id === opp.stage;
          return (
            <button key={s.id} onClick={() => onUpdate({ ...opp, stage: s.id })}
              style={{
                appearance: 'none', display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '6px 10px', borderRadius: 3,
                background: active ? 'var(--bg-3)' : 'transparent',
                border: '1px solid ' + (active ? 'var(--line-2)' : 'var(--line-1)'),
                color: active ? 'var(--ink-1)' : 'var(--ink-3)',
                fontSize: 12, fontWeight: 500, transition: 'all .12s',
                cursor: 'pointer', letterSpacing: '0.005em',
              }}
              onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'var(--bg-2)'; e.currentTarget.style.color = 'var(--ink-2)'; }}}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-3)'; }}}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: stageColor(s.id),
                opacity: active ? 1 : 0.55,
              }}/>
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── LEFT: Context column ─────────────────────────────────────────────────
function DetailContext({ opp, onUpdate }) {
  const [editingNotes, setEditingNotes] = React.useState(false);
  const due = dueState(opp.dueDate);

  const update = (patch) => onUpdate({ ...opp, ...patch });

  return (
    <div style={{
      overflow: 'auto', padding: '20px 28px 24px',
      borderRight: '1px solid var(--line-1)',
    }}>
      {/* Persona */}
      <DetailField label="Persona">
        <Select value={opp.persona}
          onChange={(v) => update({ persona: v })}
          options={window.LU_PERSONAS.map(p => ({ value: p.id, label: `${p.code} · ${p.name}` }))}/>
      </DetailField>

      {/* Fit score */}
      <DetailField label="Fit score" hint="Your read, gut-checked monthly">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 0' }}>
          <FitStars value={opp.fit} size={18} interactive onChange={(v) => update({ fit: v })}/>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {opp.fit}.0 / 5.0
          </span>
        </div>
      </DetailField>

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

      {/* Source */}
      <DetailField label="Source">
        <TextInput value={opp.source} onChange={(v) => update({ source: v })}/>
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

      {/* Next action */}
      <DetailField label="Next action">
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'start',
        }}>
          <TextInput value={opp.nextAction} onChange={(v) => update({ nextAction: v })}/>
          <div style={{
            padding: '7px 10px', border: '1px solid var(--line-1)', borderRadius: 3,
            background: 'var(--bg-1)', minHeight: 32, display: 'flex', alignItems: 'center',
            gap: 6,
          }}>
            <DueChip dueDate={opp.dueDate}/>
          </div>
        </div>
      </DetailField>

      {/* Notes */}
      <DetailField label="Notes">
        <TextArea value={opp.notes} onChange={(v) => update({ notes: v })} rows={5}/>
      </DetailField>

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
function DetailDrafts({ opp, onUpdate, generating }) {
  const drafts = opp.drafts || [];

  return (
    <div style={{
      overflow: 'auto', padding: '20px 28px 24px',
      background: 'var(--bg-0)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 14,
      }}>
        <div>
          <span className="eyebrow">Outreach drafts</span>
        </div>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>
          {drafts.length} {drafts.length === 1 ? 'DRAFT' : 'DRAFTS'}
        </span>
      </div>

      {generating && <ThinkingLattice/>}

      {!generating && drafts.length === 0 && <DraftsEmpty opp={opp}/>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {drafts.map((d, i) => (
          <DraftCard key={d.id} draft={d} index={i} onDelete={() => {
            onUpdate({ ...opp, drafts: drafts.filter(x => x.id !== d.id) });
          }}/>
        ))}
      </div>
    </div>
  );
}

function DraftCard({ draft, index, onDelete }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(draft.body);
    setCopied(true); setTimeout(() => setCopied(false), 1400);
  };
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{
            fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.08em',
          }}>
            DRAFT · {String(index + 1).padStart(2, '0')}
          </span>
          <span style={{ width: 1, height: 10, background: 'var(--line-2)' }}/>
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
            {draft.channel}
          </span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.04em' }}>
            · {draft.timestamp}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <button onClick={copy} title="Copy"
            style={{
              width: 24, height: 24, display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', borderRadius: 3,
              color: copied ? 'var(--ink-1)' : 'var(--ink-3)', transition: 'color .15s',
            }}>
            <Icon name={copied ? 'check' : 'copy'} size={13} stroke={1.6}/>
          </button>
          <button onClick={onDelete} title="Delete"
            style={{
              width: 24, height: 24, display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', borderRadius: 3,
              color: 'var(--ink-3)', transition: 'color .15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink-1)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-3)'}>
            <Icon name="close" size={13} stroke={1.6}/>
          </button>
        </div>
      </div>
      <div style={{
        padding: '14px 16px',
        fontFamily: 'var(--serif)',
        fontSize: 14, lineHeight: 1.65,
        color: 'var(--ink-1)',
        whiteSpace: 'pre-wrap',
        letterSpacing: '-0.003em',
      }}>
        {draft.body}
      </div>
      {draft.instruction && (
        <div style={{
          padding: '8px 16px', borderTop: '1px solid var(--line-1)',
          fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)',
          background: 'var(--bg-1)',
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <span style={{ color: 'var(--ink-4)', letterSpacing: '0.06em' }}>INSTRUCTION ·</span>
          <span style={{ fontFamily: 'var(--sans)', fontStyle: 'italic', color: 'var(--ink-2)' }}>
            "{draft.instruction}"
          </span>
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
        Use the instruction bar below to draft a first outreach message.
        Your <span style={{ color: 'var(--ink-2)' }}>{window.LU_PERSONAS.find(p => p.id === opp.persona)?.name}</span> persona will set the tone.
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
function DetailInstructionBar({ instruction, setInstruction, channel, setChannel,
                                onGenerate, generating, hasDrafts }) {
  return (
    <div style={{
      borderTop: '1px solid var(--line-2)',
      background: 'var(--bg-1)',
      padding: '14px 28px',
      flex: '0 0 auto',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      {/* Channel toggle */}
      <div style={{ display: 'flex', gap: 0, border: '1px solid var(--line-2)', borderRadius: 3, padding: 2 }}>
        {['Email', 'LinkedIn DM'].map(c => (
          <button key={c} onClick={() => setChannel(c)} style={{
            appearance: 'none', padding: '6px 10px',
            background: channel === c ? 'var(--bg-3)' : 'transparent',
            color: channel === c ? 'var(--ink-1)' : 'var(--ink-3)',
            border: 'none', borderRadius: 2,
            fontSize: 11.5, fontWeight: 500, letterSpacing: '0.005em',
            cursor: 'pointer', transition: 'all .12s',
          }}>{c}</button>
        ))}
      </div>

      {/* Instruction input */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Icon name="sparkles" size={14} stroke={1.4} style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--ink-3)', pointerEvents: 'none',
        }}/>
        <input value={instruction} onChange={(e) => setInstruction(e.target.value)}
          placeholder={hasDrafts ? '"Make it warmer", "Shorter", "Lead with the M&A angle"...' : 'Optional instruction — leave blank for a clean first draft'}
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
        {generating ? 'Drafting…' : (hasDrafts ? 'Regenerate' : 'Draft outreach')}
      </Btn>
    </div>
  );
}

// ── Draft composition (mock) ──────────────────────────────────────────────
function composeDraft(opp, persona, channel, instruction) {
  const contactName = opp.contact?.name?.split(' ')[0] || 'there';
  const isWarm = opp.contact?.warmth === 'strong' || opp.contact?.warmth === 'warm';
  const tone = (instruction || '').toLowerCase();

  if (channel === 'LinkedIn DM') {
    if (tone.includes('shorter') || tone.includes('short')) {
      return `${contactName} — ${isWarm ? 'good to see you in the feed.' : 'wanted to reach out directly.'}

The ${opp.role} mandate at ${opp.company} looks like a real fit for the work I've been doing — happy to send a one-page positioning if useful.

— [Sender]`;
    }
    return `${contactName},

${isWarm ? 'Hope all\'s well — saw your post last week on ' + (opp.notes.includes('AI') ? 'AI strategy' : 'transformation') + ', shared with a few people.' : 'We met briefly through ' + (opp.source || 'a mutual') + '; reaching out directly.'}

The ${opp.role} role at ${opp.company} sits squarely in the work I've focused on for the last decade. ${persona.positioning.split('.')[0]}. If there's a useful conversation here, I'd welcome 20 minutes.

I'll keep it brief — happy to send a tighter positioning note if it's helpful.

Best,
[Sender]`;
  }

  // Email
  const subject = (tone.includes('warmer') || tone.includes('warm'))
    ? `Following up — ${opp.role.split(',')[0]} at ${opp.company}`
    : `${opp.role.split(',')[0]} — ${opp.company}`;

  if (tone.includes('shorter') || tone.includes('short')) {
    return `Subject: ${subject}

${contactName},

I'll be direct: the ${opp.role} mandate is a clean fit for the work I've done over the last ten years — ${persona.skills.slice(0, 2).join(' and ').toLowerCase()}, at scale.

Worth twenty minutes to compare notes?

Best,
[Sender]`;
  }

  return `Subject: ${subject}

${contactName},

${isWarm
  ? `Thank you for the introduction — happy to be in touch.`
  : `Reaching out following ${opp.source || 'the recent connection'}.`} I understand ${opp.company} is searching for a ${opp.role} — that mandate sits at the center of my last decade of work.

A short orientation, if useful: ${persona.positioning}

In particular for ${opp.company}, three areas where I think I'd add value quickly:

  — ${persona.skills[0]} at the level the board will expect
  — ${persona.skills[1]} — a recurring theme in this kind of role
  — A track record of ${persona.skills[2] ? persona.skills[2].toLowerCase() : 'execution'} that I'm happy to walk through

I'd welcome twenty minutes to compare notes on what ${opp.company} actually needs in year one. I can come prepared with a point of view; not a generic pitch.

Best regards,
[Sender]`;
}

Object.assign(window, { DetailPanel, LatticeAnim, DetailField });
