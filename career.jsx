// Level Up — Career profile screen (sidebar → Career profile).
// Data + logic live in career-store.js (window.LU_CAREER).

const CP_TABS = [
  { id: 'map', label: 'Map' },
  { id: 'experience', label: 'Experience' },
  { id: 'themes', label: 'Expertise & themes' },
  { id: 'more', label: 'Education & boards' },
  { id: 'sources', label: 'Sources' },
  { id: 'review', label: 'Needs review' },
];
const cpMono = { fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-4)' };
const cpBox = { border: '1px solid var(--line-1)', borderRadius: 4, background: 'var(--bg-1)' };
const cpLink = { appearance: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--ink-2)', textDecoration: 'underline', textDecorationColor: 'var(--line-2)', textUnderlineOffset: 3, fontFamily: 'var(--sans)' };
const fmtDate = (d) => {
  if (!d) return '';
  if (/present/i.test(d)) return 'Present';
  const m = String(d).match(/^(\d{4})(?:-(\d{2}))?/);
  if (!m) return d;
  return m[2] ? new Date(+m[1], +m[2] - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : m[1];
};
const sortKey = (r) => (/present/i.test(r.end || '') ? '9999' : String(r.end || r.start || '0000'));

function useCareerTick() {
  const [, setT] = React.useState(0);
  React.useEffect(() => {
    const on = () => setT((t) => t + 1);
    window.addEventListener('lu:career-changed', on);
    return () => window.removeEventListener('lu:career-changed', on);
  }, []);
}

function FreshDot({ fact }) {
  const stale = window.LU_CAREER.isStale(fact);
  return <span title={stale ? 'Not confirmed in the last 12 months' : 'Confirmed ' + new Date(fact.confirmedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
    style={{ width: 6, height: 6, borderRadius: '50%', display: 'inline-block', flex: '0 0 auto', background: stale ? 'oklch(70% 0.12 70)' : 'oklch(68% 0.12 150)' }}/>;
}

function PersonaToggles({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {(window.LU_PERSONAS || []).filter((p) => !p.retired).map((p) => {
        const on = (value || []).includes(p.id);
        return (
          <button key={p.id} onClick={() => onChange(on ? value.filter((x) => x !== p.id) : [...(value || []), p.id])} style={{
            appearance: 'none', cursor: 'pointer', fontSize: 11.5, padding: '3px 8px', borderRadius: 3,
            border: '1px solid ' + (on ? 'var(--ink-2)' : 'var(--line-2)'), background: on ? 'var(--bg-3)' : 'transparent', color: on ? 'var(--ink-1)' : 'var(--ink-3)',
          }}>{p.code} {p.name}</button>
        );
      })}
    </div>
  );
}

function Chips({ items, mono }) {
  if (!items || !items.length) return null;
  return (
    <span style={{ display: 'inline-flex', gap: 5, flexWrap: 'wrap' }}>
      {items.map((t, i) => (
        <span key={i} style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, border: '1px solid var(--line-2)', color: 'var(--ink-3)', fontFamily: mono ? 'var(--mono)' : 'var(--sans)' }}>{t}</span>
      ))}
    </span>
  );
}

// ── Add / edit form for roles, expertise and the Education & boards lists ─
// `req` marks the field that must be filled. Saving stamps the fact as
// "Added by you" and confirmed today (career-store add/update).
const CP_FIELDS = {
  roles: [{ k: 'title', label: 'Title', req: true }, { k: 'company', label: 'Company', req: true }, { k: 'start', label: 'Start (YYYY-MM)' }, { k: 'end', label: 'End (YYYY-MM or present)' }, { k: 'location', label: 'Location' }],
  expertise: [{ k: 'type', label: 'Type', options: Object.entries({ capability: 'Capability', industry: 'Industry', process: 'Business process', platform: 'Platform & technology', offering: 'Market offering', language: 'Language' }).map(([value, label]) => ({ value, label })) },
    { k: 'name', label: 'Name', req: true }, { k: 'level', label: 'Your level', options: [{ value: '', label: 'Not rated' }, ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: n + ' of 5' }))] }],
  education: [{ k: 'school', label: 'School', req: true }, { k: 'degree', label: 'Degree' }, { k: 'field', label: 'Field' }, { k: 'year', label: 'Year' }, { k: 'honors', label: 'Honours' }],
  boards: [{ k: 'org', label: 'Organisation', req: true }, { k: 'role', label: 'Role' }, { k: 'start', label: 'Start (YYYY-MM)' }, { k: 'end', label: 'End (YYYY-MM or present)' }],
  publications: [{ k: 'title', label: 'Title', req: true }, { k: 'venue', label: 'Where (publication or event)' }, { k: 'year', label: 'Year' }, { k: 'url', label: 'Link' }],
  credentials: [{ k: 'name', label: 'Name', req: true }, { k: 'issuer', label: 'Issued by' }, { k: 'year', label: 'Year' }],
};
function EntryForm({ kind, initial, onDone }) {
  const L = window.LU_CAREER;
  const fields = CP_FIELDS[kind];
  const [d, setD] = React.useState(() => {
    const o = {};
    fields.forEach((f) => { const v = initial && initial[f.k]; o[f.k] = v == null ? (f.options ? f.options[0].value : '') : String(v); });
    return o;
  });
  const ok = fields.every((f) => !f.req || String(d[f.k] || '').trim());
  const [personas, setPersonas] = React.useState(() => (initial && initial.personas) || []);
  // Bring the form into view: on long lists it can open below the fold.
  const box = React.useRef(null);
  React.useEffect(() => { if (box.current && box.current.scrollIntoView) box.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, []);
  const save = () => {
    const data = {};
    fields.forEach((f) => { const v = String(d[f.k] || '').trim(); data[f.k] = f.k === 'level' ? (v ? +v : null) : (v || null); });
    if (kind === 'expertise') data.personas = personas;
    if (initial && initial.id) L.update(kind, initial.id, data);
    else L.add(kind, kind === 'roles' ? Object.assign({ scope: {}, summary: null }, data) : data);
    onDone();
  };
  return (
    <div ref={box} style={{ padding: '12px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        {fields.map((f) => (
          <Field key={f.k} label={f.label + (f.req ? ' *' : '')}>
            {f.options ? <Select value={d[f.k]} onChange={(v) => setD({ ...d, [f.k]: v })} options={f.options}/>
              : <TextInput value={d[f.k]} onChange={(v) => setD({ ...d, [f.k]: v })}/>}
          </Field>
        ))}
      </div>
      {kind === 'expertise' && (
        <div style={{ marginTop: 10 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Supports these personas</div>
          <PersonaToggles value={personas} onChange={setPersonas}/>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <Btn variant="primary" size="s" onClick={save} disabled={!ok}>{initial && initial.id ? 'Save' : 'Add'}</Btn>
        <Btn variant="ghost" size="s" onClick={onDone}>Cancel</Btn>
      </div>
    </div>
  );
}

// ── Achievement row (view + edit) ────────────────────────────────────────
function AchievementRow({ a, sourceNames }) {
  const [edit, setEdit] = React.useState(false);
  const [draft, setDraft] = React.useState(null);
  const L = window.LU_CAREER;
  const begin = () => { setDraft({ kind: a.kind || 'outcome', text: a.text, metrics: (a.metrics || []).map((m) => m.value).join(', '), themes: (a.themes || []).join(', '), skills: (a.skills || []).join(', '), personas: a.personas || [] }); setEdit(true); };
  const split = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
  const save = () => {
    L.update('achievements', a.id, { kind: draft.kind, text: draft.text.trim(), metrics: split(draft.metrics).map((v) => ({ label: '', value: v })), themes: split(draft.themes).map((t) => t.toLowerCase()), skills: split(draft.skills), personas: draft.personas });
    setEdit(false);
  };
  if (edit) {
    return (
      <div style={{ padding: '12px 0', borderTop: '1px solid var(--line-1)' }}>
        <TextArea value={draft.text} onChange={(v) => setDraft({ ...draft, text: v })} rows={3}/>
        {(a.variants || []).length > 0 && (
          <div style={{ margin: '8px 0', padding: '8px 10px', border: '1px dashed var(--line-2)', borderRadius: 3 }}>
            <div style={{ ...cpMono, marginBottom: 4 }}>Other wordings from your resumes</div>
            {a.variants.map((v, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '4px 0', fontSize: 12.5, color: 'var(--ink-2)' }}>
                <span style={{ flex: 1 }}>{v.text}</span>
                <button style={cpLink} onClick={() => { L.useVariant(a.id, v.text); setEdit(false); }}>Use this wording</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, margin: '10px 0' }}>
          <Field label="Metrics (comma-separated)"><TextInput value={draft.metrics} onChange={(v) => setDraft({ ...draft, metrics: v })}/></Field>
          <Field label="Themes"><TextInput value={draft.themes} onChange={(v) => setDraft({ ...draft, themes: v })}/></Field>
          <Field label="Skills"><TextInput value={draft.skills} onChange={(v) => setDraft({ ...draft, skills: v })}/></Field>
        </div>
        <PersonaToggles value={draft.personas} onChange={(v) => setDraft({ ...draft, personas: v })}/>
        <div style={{ marginTop: 10, maxWidth: 260 }}>
          <Select value={draft.kind} onChange={(v) => setDraft({ ...draft, kind: v })} options={[{ value: 'outcome', label: 'Outcome (a result)' }, { value: 'inflight', label: 'In flight (in progress)' }, { value: 'responsibility', label: 'Responsibility (scope)' }]}/>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <Btn variant="primary" size="s" onClick={save} disabled={!draft.text.trim()}>Save</Btn>
          <Btn variant="ghost" size="s" onClick={() => setEdit(false)}>Cancel</Btn>
          <div style={{ flex: 1 }}/>
          <Btn variant="ghost" size="s" onClick={() => { if (window.confirm('Delete this achievement?')) L.remove('achievements', a.id); }}>Delete</Btn>
        </div>
      </div>
    );
  }
  const personas = (a.personas || []).map((id) => (window.LU_PERSONAS || []).find((p) => p.id === id)).filter(Boolean);
  return (
    <div style={{ padding: '10px 0', borderTop: '1px solid var(--line-1)', display: 'grid', gridTemplateColumns: '12px 1fr auto', gap: 10, alignItems: 'start' }}>
      <span style={{ paddingTop: 6 }}><FreshDot fact={a}/></span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: (a.kind || 'outcome') === 'responsibility' ? 'var(--ink-2)' : 'var(--ink-1)', lineHeight: 1.5 }}>
          {a.kind && a.kind !== 'outcome' && <span style={{ ...cpMono, marginRight: 8 }}>{a.kind === 'inflight' ? 'In flight' : 'Responsibility'}</span>}
          {a.text}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 5 }}>
          <Chips items={(a.metrics || []).map((m) => m.value)} mono/>
          <Chips items={a.themes}/>
          {personas.map((p) => <span key={p.id} className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{p.code}</span>)}
          <span style={{ fontSize: 11, color: 'var(--ink-4)' }} title={sourceNames(a.sources).join('\n')}>
            {(a.sources || []).length} source{(a.sources || []).length === 1 ? '' : 's'}{(a.variants || []).length ? ` · ${a.variants.length + 1} wordings` : ''}{(a.usedIn || []).length ? ` · used ${(a.usedIn || []).length}×` : ''}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {L.isStale(a) && <button style={cpLink} onClick={() => L.confirm('achievements', a.id)}>Confirm</button>}
        <button style={cpLink} onClick={begin}>Edit</button>
      </div>
    </div>
  );
}

// ── Role card ────────────────────────────────────────────────────────────
function RoleCard({ r, achievements, sourceNames }) {
  const [edit, setEdit] = React.useState(false);
  const [draft, setDraft] = React.useState(null);
  const [adding, setAdding] = React.useState('');
  const L = window.LU_CAREER;
  const begin = () => { setDraft(JSON.parse(JSON.stringify({ company: r.company, title: r.title, start: r.start || '', end: r.end || '', location: r.location || '', scope: Object.assign({ pnl: '', budget: '', team: '', geography: '' }, r.scope || {}), summary: r.summary || '' }))); setEdit(true); };
  const scope = r.scope || {};
  const scopeItems = [['P&L', scope.pnl], ['Budget', scope.budget], ['Team', scope.team], ['Geography', scope.geography]].filter((x) => x[1]);
  return (
    <div style={{ ...cpBox, padding: '16px 18px', marginBottom: 12 }}>
      {edit ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Company"><TextInput value={draft.company} onChange={(v) => setDraft({ ...draft, company: v })}/></Field>
            <Field label="Title"><TextInput value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })}/></Field>
            <Field label="Start (YYYY-MM)"><TextInput value={draft.start} onChange={(v) => setDraft({ ...draft, start: v })}/></Field>
            <Field label="End (YYYY-MM or present)"><TextInput value={draft.end} onChange={(v) => setDraft({ ...draft, end: v })}/></Field>
            {['pnl', 'budget', 'team', 'geography'].map((k) => (
              <Field key={k} label={{ pnl: 'P&L', budget: 'Budget', team: 'Team', geography: 'Geography' }[k]}>
                <TextInput value={draft.scope[k] || ''} onChange={(v) => setDraft({ ...draft, scope: { ...draft.scope, [k]: v } })}/>
              </Field>
            ))}
          </div>
          <div style={{ marginTop: 10 }}><Field label="Role summary"><TextArea value={draft.summary} onChange={(v) => setDraft({ ...draft, summary: v })} rows={2}/></Field></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Btn variant="primary" size="s" onClick={() => { L.update('roles', r.id, draft); setEdit(false); }}>Save</Btn>
            <Btn variant="ghost" size="s" onClick={() => setEdit(false)}>Cancel</Btn>
            <div style={{ flex: 1 }}/>
            <Btn variant="ghost" size="s" onClick={() => { if (window.confirm('Delete this role and its achievements?')) L.remove('roles', r.id); }}>Delete role</Btn>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span className="serif" style={{ fontSize: 19, color: 'var(--ink-1)' }}>{r.title || 'Untitled role'}</span>
              <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{r.company}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
              {[fmtDate(r.start) + (r.start || r.end ? ' – ' : '') + fmtDate(r.end), r.location].filter(Boolean).join(' · ')}
            </div>
            {scopeItems.length > 0 && (
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8 }}>
                {scopeItems.map(([k, v]) => <span key={k} style={{ fontSize: 12.5, color: 'var(--ink-1)' }}><span style={cpMono}>{k}</span> {v}</span>)}
              </div>
            )}
            {r.summary && <div className="serif-italic" style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.5 }}>{r.summary}</div>}
          </div>
          <button style={cpLink} onClick={begin}>Edit</button>
        </div>
      )}
      <div style={{ marginTop: 10 }}>
        {achievements.map((a) => <AchievementRow key={a.id} a={a} sourceNames={sourceNames}/>)}
        <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid var(--line-1)' }}>
          <div style={{ flex: 1 }}><TextInput value={adding} onChange={setAdding} placeholder="Add an achievement for this role…"/></div>
          <Btn variant="ghost" size="m" disabled={!adding.trim()} onClick={() => { L.add('achievements', { roleId: r.id, text: adding.trim() }); setAdding(''); }}>Add</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Import review (new / known / conflicts) ──────────────────────────────
function ImportReview({ proposal, onApply, onCancel }) {
  const [p, setP] = React.useState(proposal);
  const [, force] = React.useState(0);
  const L = window.LU_CAREER;
  const counts = L.proposalCounts(p);
  const touch = () => force((x) => x + 1);
  const tag = (txt, tone) => <span style={{ ...cpMono, color: tone === 'new' ? 'oklch(68% 0.12 150)' : tone === 'conflict' ? 'var(--signal)' : 'var(--ink-4)', marginRight: 8 }}>{txt}</span>;
  const Check = ({ obj }) => <input type="checkbox" checked={!!obj.accept} onChange={(e) => { obj.accept = e.target.checked; touch(); }} style={{ marginTop: 3 }}/>;
  const ChangeRow = ({ x }) => (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0', fontSize: 13 }}>
      {x.kind === 'fill' ? <Check obj={x}/> : <span style={{ width: 13 }}/>}
      <div style={{ flex: 1 }}>
        {tag(x.kind === 'fill' ? 'Add' : 'Conflict', x.kind === 'fill' ? 'new' : 'conflict')}
        <b style={{ color: 'var(--ink-1)', fontWeight: 500 }}>{x.label}</b>{' '}
        {x.kind === 'fill' ? <span style={{ color: 'var(--ink-2)' }}>{String(x.to)}</span> : (
          <span style={{ color: 'var(--ink-2)' }}>
            yours: <b style={{ color: 'var(--ink-1)', fontWeight: 500 }}>{String(x.from)}</b> · this file: <b style={{ color: 'var(--ink-1)', fontWeight: 500 }}>{String(x.to)}</b>
            <select value={x.choice} onChange={(e) => { x.choice = e.target.value; touch(); }} style={{ marginLeft: 10, fontSize: 12, background: 'var(--bg-2)', color: 'var(--ink-1)', border: '1px solid var(--line-2)', borderRadius: 3, padding: '2px 4px' }}>
              <option value="keep">Keep yours</option><option value="new">Use this file's</option><option value="later">Decide later</option>
            </select>
          </span>
        )}
      </div>
    </div>
  );
  return (
    <div style={{ ...cpBox, padding: '18px 20px', marginBottom: 18 }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>Review changes{p.position ? ` · file ${p.position}` : ''} · {p.source.name}</div>
      <div className="serif" style={{ fontSize: 20, color: 'var(--ink-1)', marginBottom: 4 }}>
        {counts.new} new · {counts.known} already known · {counts.updates} additions · {counts.conflicts} conflicts
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 14 }}>Nothing is added until you click Apply. Untick anything you don't want. Already-known facts just get this file as an extra source.</div>

      {p.person.length > 0 && <div style={{ marginBottom: 12 }}><div style={cpMono}>Contact & headline</div>{p.person.map((x, i) => <ChangeRow key={i} x={x}/>)}</div>}
      {p.summary && (
        <div style={{ marginBottom: 12, display: 'flex', gap: 10 }}>
          {p.summary.status === 'new' ? <Check obj={p.summary}/> : <span style={{ width: 13 }}/>}
          <div style={{ fontSize: 13 }}>{tag(p.summary.status === 'new' ? 'New summary' : 'Known summary', p.summary.status === 'new' ? 'new' : '')}<span style={{ color: 'var(--ink-2)' }}>{p.summary.text}</span></div>
        </div>
      )}
      {p.roles.map((r, ri) => (
        <div key={ri} style={{ borderTop: '1px solid var(--line-1)', padding: '12px 0' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
            {r.status === 'new' ? <Check obj={r}/> : <span style={{ width: 13 }}/>}
            {tag(r.status === 'new' ? 'New role' : 'Matches your role', r.status === 'new' ? 'new' : '')}
            <span className="serif" style={{ fontSize: 16, color: 'var(--ink-1)' }}>{r.data.title}</span>
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{r.data.company} · {fmtDate(r.data.start)} – {fmtDate(r.data.end)}</span>
          </div>
          <div style={{ paddingLeft: 23 }}>
            {r.changes.map((x, i) => <ChangeRow key={i} x={x}/>)}
            {r.achievements.map((a, ai) => (
              <div key={ai} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '5px 0', fontSize: 13, opacity: a.status === 'known' ? 0.6 : 1 }}>
                {a.status === 'known' ? <span style={{ width: 13 }}/> : <Check obj={a}/>}
                <div style={{ flex: 1 }}>
                  {tag(a.status === 'known' ? 'Known' : a.status === 'similar' ? 'Similar' : 'New', a.status === 'known' ? '' : 'new')}
                  <span style={{ color: 'var(--ink-1)' }}>{a.data.text}</span>
                  {a.status === 'similar' && (
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
                      Close to yours: “{a.existingText}”
                      <select value={a.mode} onChange={(e) => { a.mode = e.target.value; touch(); }} style={{ marginLeft: 8, fontSize: 12, background: 'var(--bg-2)', color: 'var(--ink-1)', border: '1px solid var(--line-2)', borderRadius: 3, padding: '2px 4px' }}>
                        <option value="add">Add as separate achievement</option><option value="same">Same achievement (merge)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {Object.entries(p.lists).map(([kind, items]) => items.length > 0 && (
        <div key={kind} style={{ borderTop: '1px solid var(--line-1)', padding: '10px 0' }}>
          <div style={cpMono}>{{ education: 'Education', boards: 'Boards', publications: 'Publications & talks', credentials: 'Certifications & awards', expertise: 'Expertise' }[kind]}</div>
          {items.map((x, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '5px 0', fontSize: 13, opacity: x.status === 'known' ? 0.6 : 1 }}>
              {x.status === 'known' ? <span style={{ width: 13 }}/> : <Check obj={x}/>}
              <span>{tag(x.status === 'known' ? 'Known' : 'New', x.status === 'known' ? '' : 'new')}<span style={{ color: 'var(--ink-1)' }}>{Object.values(x.data).filter((v) => v && typeof v !== 'object').join(' · ')}</span></span>
            </div>
          ))}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <Btn variant="primary" icon="check" onClick={() => onApply(p)}>Apply to my profile</Btn>
        <Btn variant="ghost" onClick={onCancel}>Discard</Btn>
      </div>
    </div>
  );
}

// ── A suggested duplicate: pick the wording to lead with, then merge ─────
function DuplicateItem({ sg, items, role }) {
  const L = window.LU_CAREER;
  const longest = [...items].sort((a, b) => (b.metrics || []).length - (a.metrics || []).length || b.text.length - a.text.length)[0];
  const [keep, setKeep] = React.useState(longest && longest.id);
  return (
    <div style={{ padding: '12px 0', borderTop: '1px solid var(--line-1)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
        <span style={{ ...cpMono, width: 150, color: 'var(--ink-3)' }}>Possible duplicate</span>
        <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{role.title} · {role.company} · choose the wording to lead with</span>
      </div>
      <div style={{ paddingLeft: 162, marginTop: 6 }}>
        {items.map((a) => (
          <label key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 0', fontSize: 13.5, color: 'var(--ink-1)', cursor: 'pointer' }}>
            <input type="radio" name={sg.id} checked={keep === a.id} onChange={() => setKeep(a.id)} style={{ marginTop: 4 }}/>
            <span>{a.text}</span>
          </label>
        ))}
        <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
          <button style={cpLink} onClick={() => L.mergeDuplicates(sg.id, keep)}>{sg.kind === 'expertise' ? 'Combine under this name' : 'Merge (keep the others as alternative wordings)'}</button>
          <button style={cpLink} onClick={() => L.keepSeparate(sg.id)}>Keep separate</button>
        </div>
      </div>
    </div>
  );
}

// ── Expertise (capabilities, industries, processes, platforms, offerings) ──
const EXPERTISE_LABELS = { capability: 'Capabilities', industry: 'Industries', process: 'Business processes', platform: 'Platforms & technology', offering: 'Market offerings', language: 'Languages' };
function Level({ n }) {
  if (!n) return null;
  return <span title={n + ' of 5'} style={{ letterSpacing: 1, fontSize: 9, color: 'var(--ink-2)', marginLeft: 6 }}>{'●'.repeat(n)}<span style={{ color: 'var(--ink-4)' }}>{'○'.repeat(5 - n)}</span></span>;
}
function ExpertisePanel({ items, adding, setAdding, editing, setEditing }) {
  const L = window.LU_CAREER;
  const types = Object.keys(EXPERTISE_LABELS).filter((t) => items.some((x) => x.type === t));
  const editItem = items.find((x) => x.id === editing);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
        <div style={cpMono}>Expertise</div>
        {!adding && !editItem && <button style={cpLink} onClick={() => setAdding(true)}>+ Add expertise</button>}
        {!adding && !editItem && types.length > 0 && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Click an item to change its name or level.</span>}
      </div>
      {adding && <div style={{ ...cpBox, padding: '4px 14px', marginBottom: 12 }}><EntryForm kind="expertise" onDone={() => setAdding(false)}/></div>}
      {types.map((t) => (
        <div key={t} style={{ marginBottom: 14 }}>
          <div style={{ ...cpMono, marginBottom: 8 }}>{EXPERTISE_LABELS[t]}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {items.filter((x) => x.type === t).sort((a, b) => (b.level || 0) - (a.level || 0)).map((x) => (
              <span key={x.id} title={(x.category ? x.category + ' · ' : '') + (x.sources || []).length + ' source(s)'} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 14, fontSize: 12.5, border: '1px solid ' + (editing === x.id ? 'var(--ink-2)' : 'var(--line-2)'), color: 'var(--ink-1)' }}>
                <button onClick={() => { setEditing(x.id); setAdding(false); }} style={{ appearance: 'none', border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit', display: 'inline-flex', alignItems: 'center' }}>{x.name}<Level n={x.level}/></button>
                <button onClick={() => { if (window.confirm('Remove "' + x.name + '"?')) L.remove('expertise', x.id); }} title="Remove" style={{ appearance: 'none', border: 'none', background: 'none', color: 'var(--ink-4)', cursor: 'pointer', fontSize: 12, padding: '0 0 0 4px' }}>×</button>
              </span>
            ))}
          </div>
          {editItem && editItem.type === t && <div style={{ ...cpBox, padding: '4px 14px', marginTop: 10 }}><EntryForm kind="expertise" initial={editItem} onDone={() => setEditing(null)}/></div>}
        </div>
      ))}
    </div>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────
function CareerView() {
  useCareerTick();
  const L = window.LU_CAREER;
  const [tab, setTab] = React.useState(() => (window.LU_CAREER && window.LU_CAREER.data().roles.length ? 'map' : 'experience'));
  const [kind, setKind] = React.useState('resume');
  const [busy, setBusy] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [proposal, setProposal] = React.useState(null);
  const [filter, setFilter] = React.useState(null);
  const [dupBusy, setDupBusy] = React.useState(null);
  const [adding, setAdding] = React.useState(null);   // which list's Add form is open
  const [editing, setEditing] = React.useState(null); // id of the entry being edited
  const [note, setNote] = React.useState(null);       // pasted note: { name, text }
  const fileRef = React.useRef(null);
  const scrollRef = React.useRef(null);
  if (!L) return <div style={{ padding: 40, color: 'var(--ink-2)' }}>The career profile didn't load. Refresh the page (Cmd+Shift+R).</div>;
  const c = L.data();
  const sourceNames = (ids) => (ids || []).map((id) => id === 'manual' ? 'Added by you' : ((c.sources.find((s) => s.id === id) || {}).name || 'Unknown source'));
  const review = L.reviewItems();
  const roles = [...c.roles].sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  const KIND_ORDER = { outcome: 0, inflight: 1, responsibility: 2 };
  const achFor = (rid) => c.achievements.filter((a) => a.roleId === rid).sort((x, y) => (KIND_ORDER[x.kind || 'outcome'] - KIND_ORDER[y.kind || 'outcome']));
  const outcomes = c.achievements.filter((a) => (a.kind || 'outcome') === 'outcome');
  const withMetrics = outcomes.filter((a) => (a.metrics || []).length).length;

  // Several files can be chosen at once: each is read, then reviewed, in turn.
  const queueRef = React.useRef({ files: [], total: 0, kind: 'resume' });
  const readNext = async () => {
    const q = queueRef.current;
    const f = q.files.shift();
    if (!f) { q.total = 0; return; }
    const n = q.total - q.files.length;
    setError(null); setBusy(`${q.total > 1 ? `File ${n} of ${q.total}: ` : ''}Claude is reading ${f.name}… usually under a minute.`);
    try { const p = await L.importFile(f, q.kind); p.position = q.total > 1 ? `${n} of ${q.total}` : null; setProposal(p); }
    catch (err) { setError(`${f.name}: ${err.message}`); setBusy(null); readNext(); return; }
    setBusy(null);
  };
  const onFile = (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    queueRef.current = { files, total: files.length, kind };
    readNext();
  };
  const apply = (p) => {
    const r = L.applyProposal(p);
    setProposal(null);
    window.LU_CORE.pill(`Profile updated: ${r.added} added · ${r.confirmed} confirmed · ${r.updated} updated`);
    readNext();
  };
  const discard = () => { setProposal(null); readNext(); };

  const person = c.person || {};
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="hl-b" style={{ padding: '24px 28px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Career profile · knowledge base</div>
            <h1 className="serif" style={{ fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', margin: 0, color: 'var(--ink-1)' }}>{person.name || 'Your career profile'}</h1>
            <div className="serif-italic" style={{ fontSize: 15, color: 'var(--ink-3)', marginTop: 4 }}>{person.headline || 'Import a resume or your LinkedIn profile to start.'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {[['Roles', c.roles.length], ['Achievements', c.achievements.length], ['Outcomes with numbers', outcomes.length ? Math.round(100 * withMetrics / outcomes.length) + '%' : '—'], ['Sources', c.sources.length]].map(([k, v]) => (
              <div key={k} style={{ textAlign: 'right' }}><div className="eyebrow" style={{ marginBottom: 2 }}>{k}</div><div className="serif" style={{ fontSize: 24, color: 'var(--ink-1)', lineHeight: 1 }}>{v}</div></div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 18 }}>
          {CP_TABS.map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); setFilter(null); setAdding(null); setEditing(null); if (scrollRef.current) scrollRef.current.scrollTop = 0; }} style={{
              appearance: 'none', cursor: 'pointer', padding: '9px 12px', fontSize: 13, border: 'none', background: 'transparent',
              color: tab === t.id ? 'var(--ink-1)' : 'var(--ink-3)', borderBottom: '2px solid ' + (tab === t.id ? 'var(--ink-1)' : 'transparent'),
            }}>{t.label}{t.id === 'review' && review.length ? ` (${review.length})` : ''}</button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="lu-main-scroll" style={{ padding: '20px 28px 60px' }}>
        <div style={{ maxWidth: 920 }}>
          {/* Import bar */}
          <div style={{ ...cpBox, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Add a source:</span>
            <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ fontSize: 13, background: 'var(--bg-2)', color: 'var(--ink-1)', border: '1px solid var(--line-2)', borderRadius: 3, padding: '5px 6px' }}>
              <option value="resume">Resume</option><option value="linkedin">LinkedIn profile (PDF)</option><option value="bio">Bio or other document</option>
            </select>
            <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt,.md" style={{ display: 'none' }} onChange={onFile}/>
            <Btn variant="outline" icon="plus" disabled={!!busy || !!proposal} onClick={() => fileRef.current && fileRef.current.click()}>Choose files (PDF or Word)</Btn>
            {busy && <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{busy}</span>}
            {error && <span style={{ fontSize: 12.5, color: 'var(--signal)' }}>{error}</span>}
          </div>

          {proposal && <ImportReview key={proposal.source.name + (proposal.position || '')} proposal={proposal} onApply={apply} onCancel={discard}/>}

          {tab === 'map' && (typeof CareerMap === 'function'
            ? <CareerMap onEditRoles={() => { setTab('experience'); if (scrollRef.current) scrollRef.current.scrollTop = 0; }}/>
            : <div style={{ ...cpBox, padding: 24, fontSize: 14, color: 'var(--ink-3)' }}>The map didn't load. Refresh the page (Cmd+Shift+R).</div>)}
          {tab === 'experience' && (
            adding === 'roles' ? (
              <div style={{ ...cpBox, padding: '6px 18px', marginBottom: 12 }}><EntryForm kind="roles" onDone={() => setAdding(null)}/></div>
            ) : (
              <div style={{ marginBottom: 12 }}><Btn variant="ghost" size="s" icon="plus" onClick={() => setAdding('roles')}>Add a role</Btn></div>
            )
          )}
          {tab === 'experience' && (
            roles.length === 0 ? (
              <div style={{ ...cpBox, padding: 28, color: 'var(--ink-3)', fontSize: 14 }}>No roles yet. Add your resume above, or add a role by hand. Each import adds to the profile and you review every change first.</div>
            ) : roles.map((r) => <RoleCard key={r.id} r={r} achievements={achFor(r.id)} sourceNames={sourceNames}/>)
          )}

          {tab === 'themes' && (() => {
            const g = L.graph();
            const list = filter ? c.achievements.filter((a) => (filter.type === 'theme' ? (a.themes || []).includes(filter.name) : (a.skills || []).some((s) => s.toLowerCase() === filter.name.toLowerCase()))) : [];
            const roleOf = (a) => c.roles.find((r) => r.id === a.roleId) || {};
            const chip = (x, type) => (
              <button key={type + x.name} onClick={() => setFilter({ type, name: x.name })} style={{
                appearance: 'none', cursor: 'pointer', margin: '0 6px 6px 0', padding: '5px 10px', borderRadius: 14, fontSize: 12.5,
                border: '1px solid ' + (filter && filter.name === x.name ? 'var(--ink-2)' : 'var(--line-2)'), background: filter && filter.name === x.name ? 'var(--bg-3)' : 'transparent', color: 'var(--ink-1)',
              }}>{x.name} <span style={{ color: 'var(--ink-4)', fontFamily: 'var(--mono)', fontSize: 11 }}>{x.ids.length}</span></button>
            );
            return (
              <div>
                <div style={{ ...cpMono, marginBottom: 8 }}>Themes (how often your achievements show them)</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', margin: '-4px 0 8px' }}>Themes and skills come from your achievements. To add one, edit an achievement on the Experience tab.</div>
                <div style={{ marginBottom: 18 }}>{g.themes.length ? g.themes.map((t) => chip(t, 'theme')) : <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>None yet.</span>}</div>
                <ExpertisePanel items={c.expertise || []} adding={adding === 'expertise'} setAdding={(v) => setAdding(v ? 'expertise' : null)} editing={editing} setEditing={setEditing}/>
                <div style={{ ...cpMono, marginBottom: 8 }}>Skills shown in achievements</div>
                <div style={{ marginBottom: 18 }}>{g.skills.length ? g.skills.map((s) => chip(s, 'skill')) : <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>None yet.</span>}</div>
                {filter && (
                  <div style={{ ...cpBox, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span className="serif" style={{ fontSize: 17, color: 'var(--ink-1)' }}>{filter.name}</span>
                      <button style={cpLink} onClick={() => setFilter(null)}>Clear</button>
                    </div>
                    {list.map((a) => (
                      <div key={a.id} style={{ padding: '8px 0', borderTop: '1px solid var(--line-1)', fontSize: 13.5, color: 'var(--ink-1)' }}>
                        {a.text}<div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 }}>{roleOf(a).title} · {roleOf(a).company}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {tab === 'more' && [['education', 'Education', (x) => [x.degree, x.field, x.school, x.year, x.honors].filter(Boolean).join(' · ')],
            ['boards', 'Boards & advisory', (x) => [x.role, x.org, [fmtDate(x.start), fmtDate(x.end)].filter(Boolean).join(' – ')].filter(Boolean).join(' · ')],
            ['publications', 'Publications & talks', (x) => [x.title, x.venue, x.year].filter(Boolean).join(' · ')],
            ['credentials', 'Certifications & awards', (x) => [x.name, x.issuer, x.year].filter(Boolean).join(' · ')]].map(([k, label, line]) => (
            <div key={k} style={{ ...cpBox, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <div className="eyebrow">{label}</div>
                {adding !== k && <button style={cpLink} onClick={() => { setAdding(k); setEditing(null); }}>+ Add</button>}
              </div>
              {c[k].length === 0 && adding !== k ? <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>None yet.</div> : c[k].map((x) => editing === x.id ? (
                <div key={x.id} style={{ borderTop: '1px solid var(--line-1)' }}><EntryForm kind={k} initial={x} onDone={() => setEditing(null)}/></div>
              ) : (
                <div key={x.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--line-1)', fontSize: 13.5, color: 'var(--ink-1)' }}>
                  <FreshDot fact={x}/><span style={{ flex: 1 }}>{line(x)}</span>
                  <button style={cpLink} onClick={() => { setEditing(x.id); setAdding(null); }}>Edit</button>
                  <button style={cpLink} onClick={() => { if (window.confirm('Remove this entry?')) L.remove(k, x.id); }}>Remove</button>
                </div>
              ))}
              {adding === k && <div style={{ borderTop: '1px solid var(--line-1)' }}><EntryForm kind={k} onDone={() => setAdding(null)}/></div>}
            </div>
          ))}

          {tab === 'sources' && (
            note ? (
              <div style={{ ...cpBox, padding: '14px 16px', marginBottom: 12 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Paste a note</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 10 }}>A project write-up, performance review, bio or anything else about your career. Claude reads it like a resume and you review every change before it's added.</div>
                <Field label="Name"><TextInput value={note.name} onChange={(v) => setNote({ ...note, name: v })} placeholder="e.g. 2025 performance review"/></Field>
                <div style={{ marginTop: 10 }}><TextArea value={note.text} onChange={(v) => setNote({ ...note, text: v })} rows={8} placeholder="Paste the text here"/></div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <Btn variant="primary" size="s" disabled={!note.text.trim() || !!busy || !!proposal} onClick={() => {
                    const name = (note.name.trim() || 'Note ' + new Date().toLocaleDateString('en-GB')).replace(/[\\/:*?"<>|]/g, '-');
                    queueRef.current = { files: [new File([note.text], name + '.txt', { type: 'text/plain' })], total: 1, kind: 'bio' };
                    setNote(null); readNext();
                  }}>Read with Claude</Btn>
                  <Btn variant="ghost" size="s" onClick={() => setNote(null)}>Cancel</Btn>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 12 }}><Btn variant="ghost" size="s" icon="plus" disabled={!!busy || !!proposal} onClick={() => setNote({ name: '', text: '' })}>Paste a note</Btn></div>
            )
          )}
          {tab === 'sources' && (
            <div style={{ ...cpBox, padding: '6px 16px' }}>
              {c.sources.length === 0 ? <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--ink-3)' }}>No sources yet.</div> : c.sources.map((s) => (
                <div key={s.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--line-1)', fontSize: 13.5 }}>
                  <span style={{ ...cpMono, width: 80 }}>{{ resume: 'Resume', linkedin: 'LinkedIn', bio: 'Document' }[s.kind] || s.kind}</span>
                  <span style={{ flex: 1, color: 'var(--ink-1)' }}>{s.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{s.facts} facts · {new Date(s.importedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  {s.driveUrl && <a href={s.driveUrl} target="_blank" rel="noopener noreferrer" style={{ ...cpLink, fontSize: 12 }}>Open ↗</a>}
                </div>
              ))}
            </div>
          )}

          {tab === 'review' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Btn variant="outline" icon="spark" disabled={!!dupBusy || !c.achievements.length} onClick={async () => {
                setDupBusy('Starting…');
                try { const n = await L.findDuplicates((i, total) => setDupBusy(`Checking role ${i} of ${total}…`)); window.LU_CORE.pill(n ? `${n} possible duplicate${n === 1 ? '' : 's'} to review` : 'No duplicates found'); }
                finally { setDupBusy(null); }
              }}>Check for duplicates</Btn>
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{dupBusy || 'Finds achievements written more than once across your resumes.'}</span>
            </div>
          )}
          {tab === 'review' && (
            review.length === 0 ? <div style={{ ...cpBox, padding: 24, fontSize: 14, color: 'var(--ink-3)' }}>All clear: nothing needs your attention.</div> : (
              <div style={{ ...cpBox, padding: '6px 16px' }}>
                {review.map((x) => {
                  const role = x.kind === 'roles' ? x.item : x.item && c.roles.find((r) => r.id === x.item.roleId);
                  if (x.type === 'duplicate' && x.sg.kind === 'expertise') {
                    const items = x.sg.ids.map((id) => c.expertise.find((e) => e.id === id)).filter(Boolean).map((e) => ({ id: e.id, text: e.name + (e.level ? ' (' + e.level + '/5)' : ''), metrics: [] }));
                    return <DuplicateItem key={x.id} sg={x.sg} items={items} role={{ title: EXPERTISE_LABELS[x.sg.type] || 'Expertise', company: 'same item, different names' }}/>;
                  }
                  if (x.type === 'duplicate') {
                    const items = x.sg.ids.map((id) => c.achievements.find((a) => a.id === id)).filter(Boolean);
                    const r = c.roles.find((rr) => rr.id === x.sg.roleId) || {};
                    return <DuplicateItem key={x.id} sg={x.sg} items={items} role={r}/>;
                  }
                  const what = { conflict: 'Conflicting values', 'no-metric': 'No number yet: add one if you can', 'no-scope': 'Add the scope (P&L, budget or team)', stale: 'Not confirmed in 12 months' }[x.type];
                  return (
                    <div key={x.type + x.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid var(--line-1)' }}>
                      <span style={{ ...cpMono, width: 150, color: x.type === 'conflict' ? 'var(--signal)' : 'var(--ink-3)', paddingTop: 2 }}>{what}</span>
                      <div style={{ flex: 1, fontSize: 13.5, color: 'var(--ink-1)' }}>
                        {x.type === 'conflict' ? <>{x.cf.label}: yours <b style={{ fontWeight: 500 }}>{String(x.cf.current)}</b> vs <b style={{ fontWeight: 500 }}>{String(x.cf.proposed)}</b>
                          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
                            {x.cf.entity === 'person' ? 'Contact & headline' : (() => { const rr = c.roles.find((q) => q.id === x.cf.entityId); return rr ? rr.title + ' · ' + rr.company : 'Role'; })()}
                            {' · from '}{(c.sources.find((q) => q.id === x.cf.sourceId) || {}).name || 'a source'}
                          </div></>
                          : x.kind === 'roles' ? <>{x.item.title} · {x.item.company}</> : x.item.text}
                        {x.kind === 'achievements' && role && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{role.title} · {role.company}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {x.type === 'conflict' ? <>
                          <button style={cpLink} onClick={() => L.resolveConflict(x.id, 'keep')}>Keep yours</button>
                          <button style={cpLink} onClick={() => L.resolveConflict(x.id, 'new')}>Use new</button>
                        </> : x.type === 'stale' ? <button style={cpLink} onClick={() => L.confirm(x.kind, x.id)}>Still true</button>
                          : <button style={cpLink} onClick={() => setTab('experience')}>Edit</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CareerView });
