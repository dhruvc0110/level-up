// Level Up — Pipeline (Kanban) view + opportunity cards

function PipelineView({ opportunities, onOpen, onAdd, density = 'regular', accent = 'quiet' }) {
  const cols = window.LU_STAGES.map(s => ({
    ...s,
    items: opportunities.filter(o => o.stage === s.id),
  }));

  const padMap = { compact: 10, regular: 14, comfy: 18 };
  const gapMap = { compact: 6, regular: 10, comfy: 14 };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      minHeight: 0,
    }}>
      {/* View header */}
      <PipelineHeader total={opportunities.length} onAdd={onAdd}/>

      {/* Kanban columns */}
      <div style={{
        flex: 1, minHeight: 0, display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(248px, 1fr))',
        gap: 0,
        overflowX: 'auto', overflowY: 'hidden',
      }}>
        {cols.map((col, i) => (
          <KanbanColumn key={col.id} col={col} onOpen={onOpen} onAdd={onAdd}
            isLast={i === cols.length - 1}
            cardPad={padMap[density]} cardGap={gapMap[density]}
            accent={accent}/>
        ))}
      </div>
    </div>
  );
}

function PipelineHeader({ total, onAdd }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 28px 16px',
      borderBottom: '1px solid var(--line-1)',
      flex: '0 0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
        <h1 className="serif" style={{
          margin: 0, fontSize: 30, fontWeight: 400, letterSpacing: '-0.02em',
          color: 'var(--ink-1)',
        }}>
          Pipeline
        </h1>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
          {String(total).padStart(2, '0')} OPPORTUNITIES · 5 STAGES
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.08em' }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(/,/g, '').toUpperCase().replace(/^(\w+) /, '$1 · ')}
        </span>
        <span style={{ width: 1, height: 14, background: 'var(--line-2)' }}/>
        <Btn size="s" variant="ghost" icon="search">Filter</Btn>
        <Btn size="s" variant="outline" icon="plus" onClick={onAdd}>New opportunity</Btn>
      </div>
    </div>
  );
}

function KanbanColumn({ col, onOpen, onAdd, isLast, cardPad, cardGap, accent }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      borderRight: isLast ? 'none' : '1px solid var(--line-1)',
      minHeight: 0,
    }}>
      {/* Column header */}
      <div style={{
        padding: '16px 16px 12px',
        flex: '0 0 auto',
        borderBottom: '1px solid var(--line-1)',
      }}>
        {/* Stage indicator: 1px bar in stage color */}
        <div style={{
          height: 2, width: 18, background: stageColor(col.id), opacity: 0.85,
          marginBottom: 12, borderRadius: 1,
        }}/>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span className="mono" style={{
              fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.08em', fontWeight: 500,
            }}>
              {col.short}
            </span>
            <span style={{
              fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 400,
              color: 'var(--ink-1)', letterSpacing: '-0.01em',
            }}>
              {col.label}
            </span>
          </div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {col.items.length}
          </span>
        </div>
      </div>

      {/* Card list */}
      <div style={{
        flex: 1, minHeight: 0, overflow: 'auto',
        padding: `${cardGap}px 12px ${cardGap + 4}px`,
        display: 'flex', flexDirection: 'column', gap: cardGap,
      }}>
        {col.items.length === 0 && (
          <ColumnEmpty stageLabel={col.label}/>
        )}
        {col.items.map(o => (
          <OpportunityCard key={o.id} opp={o} onClick={() => onOpen(o.id)}
            pad={cardPad} accent={accent}/>
        ))}
        {col.id === 'discovered' && col.items.length > 0 && (
          <button onClick={onAdd} style={{
            border: '1px dashed var(--line-2)', background: 'transparent',
            color: 'var(--ink-3)', padding: '10px 12px', borderRadius: 4,
            fontSize: 12, fontFamily: 'var(--sans)', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all .15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--line-3)'; e.currentTarget.style.color = 'var(--ink-2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--ink-3)'; }}>
            <Icon name="plus" size={12} stroke={1.4}/>
            Add opportunity
          </button>
        )}
      </div>
    </div>
  );
}

function ColumnEmpty({ stageLabel }) {
  return (
    <div style={{
      padding: '28px 14px', textAlign: 'left',
      border: '1px dashed var(--line-1)', borderRadius: 4,
    }}>
      <div className="serif-italic" style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 6 }}>
        Nothing here yet.
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-4)', lineHeight: 1.5 }}>
        Move an opportunity into <span style={{ color: 'var(--ink-3)' }}>{stageLabel}</span> when it earns the stage change.
      </div>
    </div>
  );
}

function OpportunityCard({ opp, onClick, pad, accent }) {
  const persona = window.LU_PERSONAS.find(p => p.id === opp.persona);
  const due = dueState(opp.dueDate);
  const isOverdue = due?.kind === 'overdue';
  const isToday = due?.kind === 'today';

  return (
    <button onClick={onClick}
      style={{
        appearance: 'none', textAlign: 'left',
        background: 'var(--bg-2)',
        border: '1px solid var(--line-1)',
        borderLeft: isOverdue ? '2px solid var(--signal)' : '1px solid var(--line-1)',
        paddingLeft: isOverdue ? pad - 1 : pad,
        borderRadius: 3,
        padding: pad,
        paddingLeft: isOverdue ? pad - 1 : pad,
        cursor: 'pointer',
        transition: 'all .15s',
        position: 'relative',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-3)';
        e.currentTarget.style.borderColor = 'var(--line-2)';
        if (isOverdue) e.currentTarget.style.borderLeftColor = 'var(--signal)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-2)';
        e.currentTarget.style.borderColor = 'var(--line-1)';
        if (isOverdue) e.currentTarget.style.borderLeftColor = 'var(--signal)';
      }}>

      {/* Role title — biggest, the hero */}
      <div style={{
        fontFamily: 'var(--serif)', fontSize: 16.5, fontWeight: 400,
        letterSpacing: '-0.012em', color: 'var(--ink-1)',
        lineHeight: 1.22, textWrap: 'pretty',
      }}>
        {opp.role}
      </div>

      {/* Company — subordinate */}
      <div style={{
        fontFamily: 'var(--sans)', fontSize: 11.5, fontWeight: 500,
        color: 'var(--ink-2)', letterSpacing: '0.005em',
        marginTop: -6,
      }}>
        {opp.company}
      </div>

      {/* Metadata row: persona + fit */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, marginTop: 2,
      }}>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)',
          letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 6,
          flex: '0 0 auto', whiteSpace: 'nowrap',
        }}>
          <PersonaDot personaId={opp.persona} size={5}/>
          {persona?.code}
        </span>
        <FitStars value={opp.fit} size={9}/>
      </div>

      {/* Next action footer */}
      <div style={{
        marginTop: 6,
        paddingTop: 9,
        borderTop: '1px solid var(--line-1)',
        display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        <div style={{
          fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {opp.nextAction}
        </div>
        <DueChip dueDate={opp.dueDate}/>
      </div>
    </button>
  );
}

Object.assign(window, { PipelineView, OpportunityCard });
