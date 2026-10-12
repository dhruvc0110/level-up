// Level Up — Pipeline: a searchable, filterable list of opportunities with the
// selected one open beside it. Stage is one attribute among several.

// Key facts live on the opportunity; LinkedIn's job details fill any gaps.
function oppFacts(o) {
  const e = (o && o.enrichment) || {};
  const pick = (k) => (o[k] != null && o[k] !== '' ? o[k] : (e[k] || null));
  return {
    location: pick('location'), workplace: normWorkplace(pick('workplace')),
    industry: pick('industry'), companySize: pick('companySize'),
    compensation: pick('compensation'), addedAt: o.addedAt || null,
  };
}
function normWorkplace(w) {
  const s = String(w || '').toLowerCase();
  if (!s) return null;
  if (s.includes('remote')) return 'Remote';
  if (s.includes('hybrid')) return 'Hybrid';
  if (s.includes('site') || s.includes('office')) return 'On-site';
  return w;
}
const ACTIVE_STAGES = ['discovered', 'evaluating', 'applied', 'conversations'];

const PL_FILTER_KEY = 'lu_pipeline_filters';
const PL_DEFAULTS = { q: '', stage: 'all', persona: 'all', fit: 'any', location: 'all', workplace: 'all', source: 'all', due: 'any', sort: 'due' };
function loadPlFilters() {
  try { return Object.assign({}, PL_DEFAULTS, JSON.parse(localStorage.getItem(PL_FILTER_KEY) || '{}')); }
  catch (e) { return Object.assign({}, PL_DEFAULTS); }
}

function oppSearchText(o) {
  const e = o.enrichment || {}, f = oppFacts(o);
  return [o.company, o.role, o.notes, o.nextAction, o.source,
    o.contact && o.contact.name, o.contact && o.contact.title,
    e.summary, e.hiringManager && e.hiringManager.name,
    ...(e.reachOut || []).map((r) => r.name),
    f.location, f.workplace, f.industry, f.compensation,
  ].filter(Boolean).join(' \n ').toLowerCase();
}

function dueBucket(o) {
  const s = dueState(o.dueDate);
  if (!s) return 'none';
  if (s.kind === 'overdue') return 'overdue';
  if (s.days <= 7) return 'week';
  return 'later';
}

function applyPlFilters(opps, f) {
  const words = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const out = opps.filter((o) => {
    const facts = oppFacts(o);
    if (f.stage === 'active' ? !ACTIVE_STAGES.includes(o.stage) : (f.stage !== 'all' && o.stage !== f.stage)) return false;
    if (f.persona !== 'all' && (o.persona || 'none') !== f.persona) return false;
    if (f.fit === 'unrated' ? o.fit : (f.fit !== 'any' && !((o.fit || 0) >= Number(f.fit)))) return false;
    if (f.location !== 'all' && (facts.location || 'Not set') !== f.location) return false;
    if (f.workplace !== 'all' && (facts.workplace || 'Not set') !== f.workplace) return false;
    if (f.source !== 'all' && (o.source || 'Not set') !== f.source) return false;
    if (f.due !== 'any') {
      const b = dueBucket(o);
      if (f.due === 'week' ? !(b === 'overdue' || b === 'week') : b !== f.due) return false;
    }
    if (words.length) { const t = oppSearchText(o); if (!words.every((w) => t.includes(w))) return false; }
    return true;
  });
  const stageIdx = (o) => window.LU_STAGES.findIndex((s) => s.id === o.stage);
  const byDue = (o) => (o.dueDate ? new Date(o.dueDate).getTime() : Infinity);
  const sorters = {
    due: (a, b) => byDue(a) - byDue(b),
    fit: (a, b) => (b.fit || 0) - (a.fit || 0) || byDue(a) - byDue(b),
    added: (a, b) => String(b.addedAt || '').localeCompare(String(a.addedAt || '')),
    company: (a, b) => String(a.company || '').localeCompare(String(b.company || '')),
    stage: (a, b) => stageIdx(b) - stageIdx(a) || byDue(a) - byDue(b),
  };
  return out.sort(sorters[f.sort] || sorters.due);
}

function PipelineView({ opportunities, selectedId, onSelect, onAdd, onUpdate, onDelete, density = 'regular' }) {
  const [f, setF] = React.useState(loadPlFilters);
  const [docTab, setDocTab] = React.useState('overview');
  const [listOpen, setListOpen] = React.useState(true);
  // Narrow windows show the list or the detail, not both.
  const gridRef = React.useRef(null);
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => {
    const el = gridRef.current;
    if (!el || !window.ResizeObserver) return undefined;
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < 900));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  React.useEffect(() => { if (narrow) setListOpen(!selectedId); }, [narrow]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (id) => { onSelect(id); if (narrow) setListOpen(false); };
  const showDetail = !narrow || !listOpen;
  const set = (k, v) => setF((s) => {
    const next = { ...s, [k]: v };
    try { localStorage.setItem(PL_FILTER_KEY, JSON.stringify(next)); } catch (e) { /* private window */ }
    return next;
  });
  const clearAll = () => setF(() => {
    const next = { ...PL_DEFAULTS, sort: f.sort };
    try { localStorage.setItem(PL_FILTER_KEY, JSON.stringify(next)); } catch (e) { /* private window */ }
    return next;
  });

  const shown = React.useMemo(() => applyPlFilters(opportunities, f), [opportunities, f]);
  const selected = opportunities.find((o) => o.id === selectedId) || shown[0] || null;
  const active = Object.keys(PL_DEFAULTS).filter((k) => k !== 'sort' && f[k] !== PL_DEFAULTS[k]).length;

  // Options built from what's actually in the pipeline.
  const distinct = (fn) => {
    const m = new Map();
    opportunities.forEach((o) => { const v = fn(o) || 'Not set'; m.set(v, (m.get(v) || 0) + 1); });
    return [...m.entries()].sort((a, b) => (a[0] === 'Not set') - (b[0] === 'Not set') || b[1] - a[1]).map(([v, n]) => ({ value: v, label: `${v} (${n})` }));
  };
  const personas = window.LU_PERSONAS || [];
  const padY = { compact: 7, regular: 10, comfy: 13 }[density] || 10;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <PipelineHeader total={opportunities.length} shown={shown.length} onAdd={onAdd}
        opportunities={opportunities} stage={f.stage} onStage={(v) => set('stage', f.stage === v ? 'all' : v)}/>

      <div ref={gridRef} style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: listOpen && showDetail ? 'minmax(300px, 380px) minmax(0, 1fr)' : 'minmax(0, 1fr)' }}>
        {/* ── List ── */}
        <div style={{ display: listOpen ? 'flex' : 'none', flexDirection: 'column', minHeight: 0, borderRight: '1px solid var(--line-1)' }}>
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--line-1)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 9, top: 9, color: 'var(--ink-4)' }}><Icon name="search" size={13}/></span>
              <input type="search" value={f.q} onChange={(e) => set('q', e.target.value)}
                placeholder="Search company, role, notes, people…" aria-label="Search opportunities"
                style={{ width: '100%', height: 32, padding: '0 10px 0 28px', background: 'var(--bg-1)', color: 'var(--ink-1)', border: '1px solid var(--line-1)', borderRadius: 3, fontFamily: 'var(--sans)', fontSize: 13, outline: 'none' }}/>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              <FilterChip label="Stage" value={f.stage} onChange={(v) => set('stage', v)}
                options={[{ value: 'all', label: 'All stages' }, { value: 'active', label: 'Active (01–04)' }, ...window.LU_STAGES.map((s) => ({ value: s.id, label: s.label }))]}/>
              <FilterChip label="Persona" value={f.persona} onChange={(v) => set('persona', v)}
                options={[{ value: 'all', label: 'All personas' }, ...personas.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` })), { value: 'none', label: 'No persona' }]}/>
              <FilterChip label="Fit" value={f.fit} onChange={(v) => set('fit', v)}
                options={[{ value: 'any', label: 'Any fit' }, { value: '4', label: '4+ stars' }, { value: '3', label: '3+ stars' }, { value: 'unrated', label: 'Not rated' }]}/>
              <FilterChip label="Location" value={f.location} onChange={(v) => set('location', v)}
                options={[{ value: 'all', label: 'All locations' }, ...distinct((o) => oppFacts(o).location)]}/>
              <FilterChip label="Work mode" value={f.workplace} onChange={(v) => set('workplace', v)}
                options={[{ value: 'all', label: 'Any work mode' }, ...distinct((o) => oppFacts(o).workplace)]}/>
              <FilterChip label="Source" value={f.source} onChange={(v) => set('source', v)}
                options={[{ value: 'all', label: 'All sources' }, ...distinct((o) => o.source)]}/>
              <FilterChip label="Due" value={f.due} onChange={(v) => set('due', v)}
                options={[{ value: 'any', label: 'Any due date' }, { value: 'overdue', label: 'Overdue' }, { value: 'week', label: 'Due within 7 days' }, { value: 'none', label: 'No date set' }]}/>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-3)' }}>
              <span>
                {shown.length} shown
                {active > 0 && <> · <button onClick={clearAll} style={plLink}>Clear filters</button></>}
              </span>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Sort
                <select value={f.sort} onChange={(e) => set('sort', e.target.value)} aria-label="Sort opportunities"
                  style={{ background: 'transparent', color: 'var(--ink-2)', border: 'none', fontSize: 11.5, fontFamily: 'var(--sans)', cursor: 'pointer', outline: 'none' }}>
                  <option value="due">Next due</option>
                  <option value="fit">Best fit</option>
                  <option value="added">Newest</option>
                  <option value="stage">Furthest stage</option>
                  <option value="company">Company A–Z</option>
                </select>
              </label>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {selected && !shown.includes(selected) && (
              <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink-2)', background: 'var(--bg-2)', borderBottom: '1px solid var(--line-1)', lineHeight: 1.45 }}>
                Your filters hide <B2>{selected.role}</B2> at {selected.company}. <button onClick={clearAll} style={plLink}>Clear filters</button>
              </div>
            )}
            {shown.length === 0 && (
              <div style={{ padding: '28px 18px', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                {opportunities.length === 0
                  ? <>Your pipeline is empty. Accept a job from the Inbox, or add one with <B2>New opportunity</B2>.</>
                  : <>No opportunities match. <button onClick={clearAll} style={plLink}>Clear filters</button></>}
              </div>
            )}
            {shown.map((o) => (
              <OppRow key={o.id} opp={o} padY={padY} selected={selected && selected.id === o.id} onClick={() => pick(o.id)}/>
            ))}
          </div>
        </div>

        {/* ── Detail ── */}
        <div style={{ minWidth: 0, minHeight: 0, display: showDetail ? 'flex' : 'none', flexDirection: 'column', position: 'relative' }}>
          {selected ? (
            <DetailPanel key={selected.id} inline opp={selected} tab={docTab} onTab={setDocTab}
              listOpen={listOpen} narrow={narrow} onToggleList={() => setListOpen((v) => !v)}
              onUpdate={onUpdate} onDelete={() => onDelete(selected.id)}/>
          ) : (
            <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>
              Select an opportunity to see it here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const plLink = { appearance: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'inherit', color: 'var(--ink-2)', textDecoration: 'underline', textDecorationColor: 'var(--line-2)', textUnderlineOffset: 3, fontFamily: 'var(--sans)' };
function B2({ children }) { return <span style={{ color: 'var(--ink-1)', fontWeight: 500 }}>{children}</span>; }

// A native select dressed as a chip: shows the label until a value is picked.
function FilterChip({ label, value, options, onChange }) {
  const opt = options.find((o) => o.value === value);
  const on = value !== options[0].value;
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 3, fontSize: 11.5,
        border: '1px solid ' + (on ? 'var(--line-3)' : 'var(--line-1)'), background: on ? 'var(--bg-3)' : 'transparent',
        color: on ? 'var(--ink-1)' : 'var(--ink-3)', whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {on ? (opt ? opt.label.replace(/ \(\d+\)$/, '') : value) : label}
        <svg width="8" height="5" viewBox="0 0 10 6" aria-hidden="true"><path fill="currentColor" d="M0 0h10L5 6z"/></svg>
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={"Filter by " + label.toLowerCase()}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </span>
  );
}

function PipelineHeader({ total, shown, onAdd, opportunities, stage, onStage }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      padding: '18px 28px 14px', borderBottom: '1px solid var(--line-1)', flex: '0 0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
        <h1 className="serif" style={{ margin: 0, fontSize: 30, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--ink-1)' }}>
          Pipeline
        </h1>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
          {String(total).padStart(2, '0')} OPPORTUNITIES
        </span>
      </div>
      {/* Pipeline shape: click a stage to filter to it */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {window.LU_STAGES.map((s) => {
          const n = opportunities.filter((o) => o.stage === s.id).length;
          const on = stage === s.id;
          return (
            <button key={s.id} onClick={() => onStage(s.id)} title={`Show only ${s.label}`} style={{
              appearance: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 9px', borderRadius: 3, cursor: 'pointer',
              border: '1px solid ' + (on ? 'var(--line-3)' : 'var(--line-1)'), background: on ? 'var(--bg-3)' : 'transparent',
              color: on ? 'var(--ink-1)' : 'var(--ink-3)', fontSize: 11.5, fontFamily: 'var(--sans)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: stageColor(s.id) }}/>
              {s.label}
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-2)' }}>{n}</span>
            </button>
          );
        })}
        <span style={{ width: 1, height: 14, background: 'var(--line-2)', margin: '0 6px' }}/>
        <Btn size="s" variant="outline" icon="plus" onClick={onAdd}>New opportunity</Btn>
      </div>
    </div>
  );
}

function StageTag({ stageId }) {
  const s = window.LU_STAGES.find((x) => x.id === stageId);
  if (!s) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: stageColor(s.id) }}/>
      {s.label}
    </span>
  );
}

function OppRow({ opp, selected, onClick, padY }) {
  const persona = (window.LU_PERSONAS || []).find((p) => p.id === opp.persona);
  const f = oppFacts(opp);
  const where = [f.location, f.workplace && !(f.location || '').toLowerCase().includes(f.workplace.toLowerCase()) ? f.workplace : null].filter(Boolean).join(' · ');
  const overdue = dueState(opp.dueDate)?.kind === 'overdue';
  return (
    <button onClick={onClick} aria-current={selected ? 'true' : undefined} aria-label={`${opp.role || 'Untitled role'} at ${opp.company || 'unknown company'}`} style={{
      appearance: 'none', display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
      padding: `${padY}px 14px ${padY}px ${selected ? 12 : 14}px`, border: 'none', borderBottom: '1px solid var(--line-1)',
      borderLeft: selected ? '2px solid var(--ink-1)' : 'none',
      background: selected ? 'var(--bg-3)' : 'transparent', fontFamily: 'var(--sans)',
    }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'var(--bg-2)'; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent'; }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink-1)', lineHeight: 1.25, letterSpacing: '-0.01em' }}>{opp.role || 'Untitled role'}</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {[opp.company, where].filter(Boolean).join(' · ')}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <StageTag stageId={opp.stage}/>
        {persona && <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 5 }}><PersonaDot personaId={opp.persona} size={5}/>{persona.code}</span>}
        {opp.fit ? <FitStars value={opp.fit} size={8}/> : null}
        <span style={{ marginLeft: 'auto' }}>{overdue || opp.dueDate ? <DueChip dueDate={opp.dueDate}/> : null}</span>
      </div>
    </button>
  );
}

Object.assign(window, { PipelineView, oppFacts, normWorkplace, StageTag });
