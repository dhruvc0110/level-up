// Level Up — Dashboard: mixed grid of equal-weight modules, drag to rearrange

const DEFAULT_MODULE_ORDER = ['urgent', 'shape', 'this-week', 'momentum', 'personas', 'fit'];

function DashboardView({ opportunities, onOpen, onAdd, onNavPersonas }) {
  const [order, setOrder] = React.useState(DEFAULT_MODULE_ORDER);
  const [dragOver, setDragOver] = React.useState(null);
  const [dragging, setDragging] = React.useState(null);

  const handleDragStart = (id) => (e) => {
    setDragging(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const handleDragOver = (id) => (e) => {
    e.preventDefault();
    if (id !== dragging) setDragOver(id);
  };
  const handleDrop = (target) => (e) => {
    e.preventDefault();
    const src = e.dataTransfer.getData('text/plain') || dragging;
    if (!src || src === target) return;
    setOrder(prev => {
      const next = [...prev];
      const a = next.indexOf(src), b = next.indexOf(target);
      next.splice(a, 1); next.splice(b, 0, src);
      return next;
    });
    setDragging(null); setDragOver(null);
  };
  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  const modules = {
    'urgent':     <UrgentModule opps={opportunities} onOpen={onOpen}/>,
    'shape':      <PipelineShapeModule opps={opportunities}/>,
    'this-week':  <ThisWeekModule opps={opportunities} onOpen={onOpen}/>,
    'momentum':   <MomentumModule opps={opportunities}/>,
    'personas':   <PersonasModule opps={opportunities} onNav={onNavPersonas}/>,
    'fit':        <FitDistributionModule opps={opportunities}/>,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DashboardHeader opps={opportunities} onAdd={onAdd}/>
      <div className="lu-main-scroll" style={{ padding: '20px 28px 40px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 14,
          gridAutoRows: 'minmax(220px, auto)',
        }}>
          {order.map(id => (
            <div key={id}
              draggable
              onDragStart={handleDragStart(id)}
              onDragOver={handleDragOver(id)}
              onDrop={handleDrop(id)}
              onDragEnd={handleDragEnd}
              style={{
                opacity: dragging === id ? 0.35 : 1,
                outline: dragOver === id && dragging !== id ? '1px dashed var(--ink-3)' : 'none',
                outlineOffset: 2,
                transition: 'opacity .15s',
              }}>
              {modules[id]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardHeader({ opps, onAdd }) {
  const overdue = opps.filter(o => dueState(o.dueDate)?.kind === 'overdue').length;
  const today = opps.filter(o => dueState(o.dueDate)?.kind === 'today').length;

  return (
    <div style={{
      padding: '20px 28px 18px',
      borderBottom: '1px solid var(--line-1)',
      flex: '0 0 auto',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 6 }}>
          Friday · 23 May 2026 · Week 21
        </div>
        <h1 className="serif" style={{
          margin: 0, fontSize: 32, fontWeight: 400, letterSpacing: '-0.02em',
          color: 'var(--ink-1)',
        }}>
          Good morning. <span className="serif-italic" style={{ color: 'var(--ink-3)' }}>
            Two decisions due before the weekend.
          </span>
        </h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <Counter label="Overdue" value={overdue} kind={overdue > 0 ? 'signal' : 'quiet'}/>
        <Counter label="Today" value={today}/>
        <Counter label="Active" value={opps.length}/>
        <span style={{ width: 1, height: 28, background: 'var(--line-2)' }}/>
        <Btn variant="outline" icon="plus" size="m" onClick={onAdd}>New opportunity</Btn>
      </div>
    </div>
  );
}

function Counter({ label, value, kind = 'normal' }) {
  const color = kind === 'signal' ? 'var(--signal)' : 'var(--ink-1)';
  return (
    <div style={{ textAlign: 'right', minWidth: 56 }}>
      <div className="eyebrow" style={{ marginBottom: 2 }}>{label}</div>
      <div style={{
        fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 400,
        color, letterSpacing: '-0.02em', lineHeight: 1,
      }}>
        {String(value).padStart(2, '0')}
      </div>
    </div>
  );
}

// ── Module shell ───────────────────────────────────────────────────────────
function Module({ title, eyebrow, action, children, drag = true, accent }) {
  return (
    <div style={{
      background: 'var(--bg-1)',
      border: '1px solid var(--line-1)',
      borderRadius: 3,
      padding: '16px 18px 18px',
      height: '100%',
      display: 'flex', flexDirection: 'column',
      position: 'relative',
      cursor: drag ? 'move' : 'default',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 14, gap: 12,
      }}>
        <div>
          {eyebrow && <div className="eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</div>}
          <div className="serif" style={{
            fontSize: 19, fontWeight: 400, letterSpacing: '-0.012em',
            color: 'var(--ink-1)', lineHeight: 1.2,
          }}>
            {title}
          </div>
        </div>
        {action}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}

// ── 1. Urgent module ───────────────────────────────────────────────────────
function UrgentModule({ opps, onOpen }) {
  const urgent = opps
    .filter(o => {
      const s = dueState(o.dueDate);
      return s && (s.kind === 'overdue' || s.kind === 'today');
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  return (
    <Module
      eyebrow="What needs you"
      title="Overdue & today"
      action={<span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
        {urgent.length}
      </span>}>
      {urgent.length === 0 ? (
        <div className="serif-italic" style={{ color: 'var(--ink-3)', fontSize: 14, paddingTop: 24 }}>
          Nothing on fire — rare.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {urgent.map((o, i) => {
            const due = dueState(o.dueDate);
            return (
              <button key={o.id} onClick={() => onOpen(o.id)}
                style={{
                  appearance: 'none', background: 'transparent',
                  border: 'none', textAlign: 'left',
                  padding: '11px 0',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line-1)',
                  display: 'grid', gridTemplateColumns: '76px 1fr auto', gap: 12,
                  alignItems: 'center', cursor: 'pointer',
                  transition: 'opacity .12s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
                <div>
                  <DueChip dueDate={o.dueDate}/>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink-1)', fontWeight: 500,
                                 whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {o.nextAction}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2,
                                 whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {o.company} · {o.role}
                  </div>
                </div>
                <Icon name="arrow-right" size={13} stroke={1.4} style={{ color: 'var(--ink-3)' }}/>
              </button>
            );
          })}
        </div>
      )}
    </Module>
  );
}

// ── 2. Pipeline shape module ───────────────────────────────────────────────
function PipelineShapeModule({ opps }) {
  const counts = window.LU_STAGES.map(s => ({
    ...s, count: opps.filter(o => o.stage === s.id).length,
  }));
  const max = Math.max(...counts.map(c => c.count), 1);

  return (
    <Module eyebrow="Where things stand" title="Pipeline shape">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
        {counts.map(c => (
          <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 28px', gap: 12,
                                     alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: stageColor(c.id),
              }}/>
              <span style={{ fontSize: 12, color: 'var(--ink-2)', whiteSpace: 'nowrap',
                              overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.label}
              </span>
            </div>
            <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 1, overflow: 'hidden' }}>
              <div style={{
                width: `${(c.count / max) * 100}%`, height: '100%',
                background: stageColor(c.id), opacity: 0.85,
                transition: 'width .35s',
              }}/>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-2)', textAlign: 'right',
                           fontVariantNumeric: 'tabular-nums' }}>
              {String(c.count).padStart(2, '0')}
            </div>
          </div>
        ))}
      </div>
    </Module>
  );
}

// ── 3. This week module ────────────────────────────────────────────────────
function ThisWeekModule({ opps, onOpen }) {
  const upcoming = opps
    .filter(o => {
      const s = dueState(o.dueDate);
      return s && s.days >= 1 && s.days <= 7;
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  // Group by day
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = window.LU_TODAY;

  return (
    <Module eyebrow="Looking ahead" title="This week">
      {upcoming.length === 0 ? (
        <div className="serif-italic" style={{ color: 'var(--ink-3)', fontSize: 14, paddingTop: 24 }}>
          Calendar is quiet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {upcoming.map((o, i) => {
            const d = new Date(o.dueDate);
            const dayName = days[(d.getDay() + 6) % 7];
            const dayNum = d.getDate();
            return (
              <button key={o.id} onClick={() => onOpen(o.id)}
                style={{
                  appearance: 'none', background: 'transparent', border: 'none', textAlign: 'left',
                  padding: '9px 0',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line-1)',
                  display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 12,
                  alignItems: 'center', cursor: 'pointer',
                  transition: 'opacity .12s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
                <div style={{ textAlign: 'left' }}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.08em' }}>
                    {dayName.toUpperCase()}
                  </div>
                  <div className="serif" style={{ fontSize: 17, color: 'var(--ink-1)', lineHeight: 1 }}>
                    {dayNum}
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-1)',
                                 whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {o.nextAction}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1,
                                 whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {o.company}
                  </div>
                </div>
                <PersonaDot personaId={o.persona} size={6}/>
              </button>
            );
          })}
        </div>
      )}
    </Module>
  );
}

// ── 4. Momentum module ─────────────────────────────────────────────────────
function MomentumModule({ opps }) {
  // Made-up activity counts per recent day
  const days = [
    { label: 'M', n: 3 }, { label: 'T', n: 5 }, { label: 'W', n: 4 },
    { label: 'T', n: 7 }, { label: 'F', n: 6 }, { label: 'S', n: 1 }, { label: 'S', n: 0 },
  ];
  const max = Math.max(...days.map(d => d.n));

  return (
    <Module eyebrow="Momentum" title="Activity, last 7 days">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                     gap: 6, height: 90, marginTop: 6 }}>
        {days.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column',
                                  alignItems: 'center', gap: 6 }}>
            <div style={{
              width: '100%', height: `${(d.n / max) * 100}%`,
              background: i === 4 ? 'var(--ink-1)' : 'var(--ink-4)',
              borderRadius: 1, minHeight: 2,
              transition: 'height .35s',
            }}/>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>{d.label}</span>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line-1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      }}>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>26 actions logged</span>
        <span className="serif-italic" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
          +18% vs. last week
        </span>
      </div>
    </Module>
  );
}

// ── 5. Personas module ─────────────────────────────────────────────────────
function PersonasModule({ opps, onNav }) {
  const data = window.LU_PERSONAS.map(p => ({
    ...p,
    count: opps.filter(o => o.persona === p.id).length,
    avgFit: (() => {
      const sub = opps.filter(o => o.persona === p.id);
      if (!sub.length) return 0;
      return sub.reduce((a, b) => a + b.fit, 0) / sub.length;
    })(),
  })).sort((a, b) => b.count - a.count);

  return (
    <Module
      eyebrow="Six versions of you"
      title="Personas in play"
      action={
        <button onClick={onNav} style={{
          appearance: 'none', background: 'transparent', border: 'none',
          fontSize: 11.5, color: 'var(--ink-3)', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          Manage <Icon name="arrow-right" size={11} stroke={1.4}/>
        </button>
      }>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {data.map((p, i) => (
          <div key={p.id} style={{
            padding: '8px 0',
            borderTop: i === 0 ? 'none' : '1px solid var(--line-1)',
            display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12,
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <PersonaDot personaId={p.id} size={7}/>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: 'var(--ink-1)', fontWeight: 500,
                               whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.name}
                </div>
              </div>
            </div>
            <FitStars value={Math.round(p.avgFit)} size={8}/>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)',
                                              fontVariantNumeric: 'tabular-nums', minWidth: 16, textAlign: 'right' }}>
              {p.count}
            </span>
          </div>
        ))}
      </div>
    </Module>
  );
}

// ── 6. Fit distribution module ─────────────────────────────────────────────
function FitDistributionModule({ opps }) {
  const buckets = [5, 4, 3, 2, 1].map(n => ({
    n, count: opps.filter(o => o.fit === n).length,
  }));
  const max = Math.max(...buckets.map(b => b.count), 1);
  const total = opps.length;

  return (
    <Module eyebrow="Quality reading" title="Fit distribution">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, paddingTop: 6 }}>
        {buckets.map(b => (
          <div key={b.n} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 36px', gap: 12,
                                     alignItems: 'center' }}>
            <FitStars value={b.n} size={10}/>
            <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 1, overflow: 'hidden' }}>
              <div style={{
                width: `${(b.count / max) * 100}%`, height: '100%',
                background: b.n >= 4 ? 'var(--ink-1)' : 'var(--ink-3)',
                opacity: b.n >= 4 ? 0.9 : 0.55,
                transition: 'width .35s',
              }}/>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--ink-2)',
                           textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {String(b.count).padStart(2, '0')}
            </div>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--line-1)',
        fontSize: 12, color: 'var(--ink-3)', display: 'flex', justifyContent: 'space-between',
      }}>
        <span>
          {buckets[0].count + buckets[1].count} four-plus
        </span>
        <span className="serif-italic" style={{ color: 'var(--ink-2)' }}>
          {Math.round(((buckets[0].count + buckets[1].count) / total) * 100)}% of pipeline
        </span>
      </div>
    </Module>
  );
}

Object.assign(window, { DashboardView, Counter });
