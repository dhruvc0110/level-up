// Level Up — Personas view & edit modal

function PersonasView({ personas, opportunities, onEdit, onAdd, onOpenOpp }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PersonasHeader count={personas.length} onAdd={onAdd}/>
      <div className="lu-main-scroll" style={{ padding: '24px 28px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {personas.map(p => (
            <PersonaCard key={p.id} persona={p}
              opps={opportunities.filter(o => o.persona === p.id)}
              onEdit={() => onEdit(p)}
              onOpenOpp={onOpenOpp}/>
          ))}
        </div>
      </div>
    </div>
  );
}

function PersonasHeader({ count, onAdd }) {
  return (
    <div style={{
      padding: '20px 28px 18px',
      borderBottom: '1px solid var(--line-1)',
      flex: '0 0 auto',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    }}>
      <div>
        <h1 className="serif" style={{
          margin: 0, fontSize: 30, fontWeight: 400, letterSpacing: '-0.02em',
        }}>
          Personas
        </h1>
        <div className="serif-italic" style={{
          fontSize: 14, color: 'var(--ink-3)', marginTop: 4,
        }}>
          You are not one candidate. You are {count}.
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Btn variant="outline" icon="plus" onClick={onAdd}>New persona</Btn>
      </div>
    </div>
  );
}

function PersonaCard({ persona, opps, onEdit, onOpenOpp }) {
  const [expanded, setExpanded] = React.useState(false);
  const avgFit = opps.length ? (opps.reduce((a, b) => a + b.fit, 0) / opps.length) : 0;
  const topOpps = [...opps].sort((a, b) => b.fit - a.fit).slice(0, 3);

  return (
    <div style={{
      background: 'var(--bg-1)',
      border: '1px solid var(--line-1)',
      borderRadius: 3,
      padding: '20px 22px 18px',
      display: 'flex', flexDirection: 'column',
      transition: 'border-color .15s',
    }}
    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--line-2)'}
    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--line-1)'}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <PersonaDot personaId={persona.id} size={7}/>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
              {persona.code}
            </span>
          </div>
          <div className="serif" style={{
            fontSize: 22, fontWeight: 400, letterSpacing: '-0.014em',
            color: 'var(--ink-1)', lineHeight: 1.2, textWrap: 'pretty',
          }}>
            {persona.name}
          </div>
        </div>
        <button onClick={onEdit} title="Edit persona"
          style={{
            width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: '1px solid var(--line-1)',
            borderRadius: 3, color: 'var(--ink-3)', cursor: 'pointer',
            transition: 'all .12s', flex: '0 0 28px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink-1)'; e.currentTarget.style.borderColor = 'var(--line-2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-3)'; e.currentTarget.style.borderColor = 'var(--line-1)'; }}>
          <Icon name="edit" size={13} stroke={1.5}/>
        </button>
      </div>

      {/* Positioning */}
      <p className="serif" style={{
        margin: '14px 0 16px',
        fontSize: 15, lineHeight: 1.5, letterSpacing: '-0.003em',
        color: 'var(--ink-2)',
        display: '-webkit-box', WebkitLineClamp: expanded ? 99 : 3, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {persona.positioning}
      </p>

      {/* Skills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {persona.skills.map(s => (
          <span key={s} style={{
            display: 'inline-flex', alignItems: 'center',
            fontSize: 11, fontFamily: 'var(--sans)', fontWeight: 500,
            color: 'var(--ink-2)',
            padding: '3px 8px',
            border: '1px solid var(--line-1)',
            borderRadius: 999,
            letterSpacing: '0.002em',
            background: 'var(--bg-2)',
          }}>
            {s}
          </span>
        ))}
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0,
        borderTop: '1px solid var(--line-1)',
        paddingTop: 14,
      }}>
        <Stat label="In pipeline" value={opps.length}/>
        <Stat label="Avg fit" value={avgFit ? avgFit.toFixed(1) : '—'}/>
        <Stat label="Tone" valueText={persona.tone.split('.')[0]}/>
      </div>

      {/* Target */}
      <div style={{
        marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line-1)',
        display: 'grid', gridTemplateColumns: '90px 1fr', gap: 10, rowGap: 8, fontSize: 12,
      }}>
        <span style={{ color: 'var(--ink-4)' }}>Company size</span>
        <span style={{ color: 'var(--ink-2)' }}>{persona.companySize}</span>
        <span style={{ color: 'var(--ink-4)' }}>Sectors</span>
        <span style={{ color: 'var(--ink-2)' }}>{persona.targetSectors.join(', ')}</span>
      </div>

      {/* Top opps */}
      {topOpps.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line-1)' }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Strongest active opportunities</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {topOpps.map((o, i) => (
              <button key={o.id} onClick={() => onOpenOpp(o.id)}
                style={{
                  appearance: 'none', background: 'transparent', border: 'none', textAlign: 'left',
                  padding: '7px 0',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line-1)',
                  display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12,
                  alignItems: 'center', cursor: 'pointer', transition: 'opacity .12s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-1)',
                                 whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {o.role}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1,
                                 whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {o.company}
                  </div>
                </div>
                <FitStars value={o.fit} size={9}/>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: stageColor(o.stage),
                }}/>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, valueText }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 4 }}>{label}</div>
      {value !== undefined ? (
        <div className="serif" style={{
          fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--ink-1)', lineHeight: 1,
        }}>
          {value}
        </div>
      ) : (
        <div className="serif-italic" style={{
          fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.2,
        }}>
          {valueText}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { PersonasView, PersonaCard });
