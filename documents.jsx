// Level Up — Resume and Cover letter tabs inside an opportunity.
// Engine: documents-store.js (window.LU_DOCS). State lives on the opportunity
// (opp.docs.resume / opp.docs.letter) so every version stays with its job.

const docMono = { fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-4)' };
const docLink = { appearance: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--ink-2)', textDecoration: 'underline', textDecorationColor: 'var(--line-2)', textUnderlineOffset: 3 };
const docSel = { height: 30, padding: '0 8px', background: 'var(--bg-0)', color: 'var(--ink-1)', border: '1px solid var(--line-2)', borderRadius: 3, fontSize: 12.5 };

function Chip({ on, onClick, children }) {
  return (
    <button onClick={onClick} style={{ appearance: 'none', cursor: 'pointer', fontSize: 12, padding: '4px 10px', borderRadius: 14,
      border: '1px solid ' + (on ? 'var(--ink-2)' : 'var(--line-2)'), background: on ? 'var(--bg-3)' : 'transparent', color: on ? 'var(--ink-1)' : 'var(--ink-3)' }}>{children}</button>
  );
}

// ── Format controls (shared) ─────────────────────────────────────────────
function FormatControls({ format, onChange, kind }) {
  const f = Object.assign({}, window.LU_DOCS.DEFAULT_FORMAT, format || {});
  const set = (k, v) => onChange({ ...f, [k]: v });
  const toggle = (group, k) => onChange({ ...f, [group]: { ...f[group], [k]: !f[group][k] } });
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {(kind === 'letter' ? [['classic', 'Classic'], ['modern', 'Modern']] : [['classic', 'Classic'], ['modern', 'Modern'], ['bio', 'Board bio']]).map(([k, l]) =>
          <Chip key={k} on={f.template === k} onClick={() => onChange({ ...f, template: k, pages: k === 'bio' ? 1 : f.pages })}>{l}</Chip>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6 }}>
        {kind !== 'letter' && <select aria-label="Length" value={f.pages} onChange={(e) => set('pages', +e.target.value)} style={docSel}><option value={1}>1 page</option><option value={2}>2 pages</option></select>}
        <select aria-label="Spacing" value={f.spacing} onChange={(e) => set('spacing', e.target.value)} style={docSel}><option value="compact">Compact spacing</option><option value="balanced">Balanced spacing</option><option value="airy">Airy spacing</option></select>
        <select aria-label="Font" value={f.font} onChange={(e) => set('font', e.target.value)} style={docSel}><option value="serif">Serif (Georgia)</option><option value="sans">Sans (Arial)</option></select>
        {f.template === 'modern' && <select aria-label="Accent colour" value={f.accent} onChange={(e) => set('accent', e.target.value)} style={docSel}>{Object.keys(window.LU_DOCS.ACCENTS).map((k) => <option key={k} value={k}>Accent: {k}</option>)}</select>}
        <select aria-label="Paper" value={f.paper} onChange={(e) => set('paper', e.target.value)} style={docSel}><option value="letter">US Letter</option><option value="a4">A4</option></select>
      </div>
      {kind !== 'letter' && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8, fontSize: 12, color: 'var(--ink-2)' }}>
          {[['contact', 'location', 'Location'], ['contact', 'email', 'Email'], ['contact', 'phone', 'Phone'], ['contact', 'linkedin', 'LinkedIn'],
            ['sections', 'summary', 'Summary'], ['sections', 'skills', 'Skills'], ['sections', 'education', 'Education'], ['sections', 'boards', 'Boards'], ['sections', 'credentials', 'Certifications']].map(([g, k, l]) => (
            <label key={g + k} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!f[g][k]} onChange={() => toggle(g, k)}/>{l}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Live preview at true page size, scaled to fit, with a page-fit check ──
function DocPreview({ model, targetPages }) {
  const outer = React.useRef(null), inner = React.useRef(null);
  const [scale, setScale] = React.useState(0.6);
  const [height, setHeight] = React.useState(0);
  const st = model.style, DPI = 96, px = (ptv) => ptv * 4 / 3;
  const pageW = st.page.w * DPI, pageH = st.page.h * DPI, m = st.margin * DPI, usable = pageH - 2 * m;
  React.useEffect(() => {
    const measure = () => {
      if (outer.current) setScale(Math.min(1, (outer.current.clientWidth - 2) / pageW));
      if (inner.current) setHeight(inner.current.scrollHeight);
    };
    measure();
    const ro = window.ResizeObserver ? new ResizeObserver(measure) : null;
    if (ro && outer.current) ro.observe(outer.current);
    return () => ro && ro.disconnect();
  });
  const pages = Math.max(1, height / usable);
  const n = Math.ceil(pages - 0.02);
  // How far over the target length, in lines, so it's clear how much to cut.
  const lineH = px(st.size.body) * 1.35;
  const overLines = Math.ceil((height - (targetPages || 2) * usable) / lineH);
  const overMsg = overLines <= 12 ? `About ${overLines} line${overLines === 1 ? '' : 's'} over ${targetPages || 2} page${(targetPages || 2) === 1 ? '' : 's'}: untick an item or choose Compact`
    : `About ${pages.toFixed(1)} pages: untick a few items or choose Compact`;
  const accent = '#' + st.accent;
  const sectionHead = (t) => (
    <div style={{ fontFamily: st.head, fontSize: px(st.size.section), color: accent, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: st.fmt.template === 'classic' ? 400 : 700,
      borderBottom: st.rule === 'accent' ? `1.5px solid ${accent}` : '0.75px solid #999', paddingBottom: 2, margin: `${px(st.gap.section)}px 0 ${px(st.gap.para * 2)}px` }}>{t}</div>
  );
  const body = { fontFamily: st.body, fontSize: px(st.size.body), color: '#1b1b1b', lineHeight: 1.35 };
  return (
    <div ref={outer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={docMono}>Preview</span>
        {model.kind === 'resume' && (
          <span style={{ fontSize: 12, color: n > (targetPages || 2) ? 'var(--signal)' : 'oklch(62% 0.12 150)' }}>
            {n > (targetPages || 2) ? overMsg : `Fits on ${n} page${n === 1 ? '' : 's'}`}
          </span>
        )}
      </div>
      <div style={{ width: pageW * scale, height: Math.max(pageH, height + 2 * m) * scale, overflow: 'hidden', border: '1px solid var(--line-2)', background: '#fff' }}>
        <div style={{ width: pageW, transform: `scale(${scale})`, transformOrigin: 'top left', padding: m, boxSizing: 'border-box', position: 'relative', background: '#fff' }}>
          {Array.from({ length: Math.max(0, n - 1) }).map((_, i) => (
            <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: m + usable * (i + 1), borderTop: '1px dashed #c33', opacity: 0.5 }}>
              <span style={{ position: 'absolute', right: 6, top: 2, fontSize: 11, color: '#c33', fontFamily: 'Arial' }}>page {i + 2}</span>
            </div>
          ))}
          <div ref={inner}>
            <div style={{ fontFamily: st.head, fontSize: px(st.size.name), color: accent, lineHeight: 1.15 }}>{model.name}</div>
            {model.headline && <div style={{ ...body, fontSize: px(st.size.headline), color: '#444', marginTop: 2 }}>{model.headline}</div>}
            {model.contact.length > 0 && <div style={{ ...body, fontSize: px(st.size.small), color: '#555', marginTop: 2, paddingBottom: 3, borderBottom: model.kind === 'resume' && st.rule === 'hair' ? '0.75px solid #999' : 'none' }}>{model.contact.join('  ·  ')}</div>}
            {model.kind === 'letter' ? (
              <div style={body}>
                <div style={{ margin: '24px 0 16px' }}>{model.date}</div>
                {model.recipient && <div style={{ marginBottom: 16 }}>{model.recipient}</div>}
                <div style={{ marginBottom: 10 }}>{model.salutation}</div>
                {model.paragraphs.map((p, i) => <p key={i} style={{ margin: '0 0 10px', lineHeight: 1.45 }}>{p}</p>)}
                <div style={{ marginTop: 8 }}>{model.signoff}</div>
                <div style={{ marginTop: 32 }}>{model.signature}</div>
              </div>
            ) : (
              <div style={body}>
                {model.summary && <>{sectionHead(st.fmt.template === 'bio' ? 'Profile' : 'Summary')}<div style={{ lineHeight: 1.4 }}>{model.summary}</div></>}
                {model.experience.length > 0 && sectionHead('Experience')}
                {model.experience.map((x, i) => (
                  <div key={i} style={{ marginTop: px(st.gap.item) }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span><b>{x.title}</b>{'  ·  '}{x.company}</span>
                      <span style={{ fontSize: px(st.size.small), color: '#555', whiteSpace: 'nowrap' }}>{x.dates}</span>
                    </div>
                    {x.bullets.map((b, j) => (
                      <div key={j} style={{ display: 'flex', gap: 6, paddingLeft: 4, marginTop: px(st.gap.para) }}>
                        <span style={{ color: accent }}>•</span><span>{b}</span>
                      </div>
                    ))}
                  </div>
                ))}
                {model.skills.length > 0 && <>{sectionHead('Skills and expertise')}<div>{model.skills.join('  ·  ')}</div></>}
                {model.education.length > 0 && <>{sectionHead('Education')}{model.education.map((t, i) => <div key={i}>{t}</div>)}</>}
                {model.boards.length > 0 && <>{sectionHead('Board and advisory')}{model.boards.map((t, i) => <div key={i}>{t}</div>)}</>}
                {model.credentials.length > 0 && <>{sectionHead('Certifications and awards')}{model.credentials.map((t, i) => <div key={i}>{t}</div>)}</>}
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 6 }}>The page count is a close estimate; the Google Doc may differ by a few lines.</div>
    </div>
  );
}

// ── Versions: every Google Doc made for this opportunity ────────────────
function DocVersions({ versions, onSent }) {
  if (!(versions || []).length) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ ...docMono, marginBottom: 4 }}>Versions</div>
      {versions.map((v) => (
        <div key={v.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '6px 0', borderTop: '1px solid var(--line-1)', fontSize: 12.5 }}>
          <span style={{ flex: 1, color: 'var(--ink-1)' }}>{v.name}</span>
          <span style={{ color: 'var(--ink-3)' }}>{new Date(v.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
          {v.url ? <a href={v.url} target="_blank" rel="noopener noreferrer" style={docLink}>Open ↗</a> : <span style={{ color: 'var(--ink-4)' }}>downloaded</span>}
          {v.sentAt ? <span className="mono" style={{ fontSize: 10, color: 'oklch(62% 0.12 150)' }}>SENT</span> : <button style={docLink} onClick={() => onSent(v)}>Mark as sent</button>}
        </div>
      ))}
    </div>
  );
}

function docFileName(opp, what) {
  const p = (window.LU_CORE && window.LU_CORE.doc().career && window.LU_CORE.doc().career.person) || {};
  return [p.name || 'Resume', what, opp.company, new Date().toISOString().slice(0, 10)].filter(Boolean).join(' - ').replace(/[\\/:*?"<>|]/g, '-');
}

// ── Resume workspace ────────────────────────────────────────────────────
function ResumeWorkspace({ opp, onUpdate }) {
  const D = window.LU_DOCS;
  const c = window.LU_CORE.doc().career || {};
  const docs = opp.docs || {};
  const st = docs.resume || null;
  const [busy, setBusy] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [pages, setPages] = React.useState(2);
  const save = (next) => onUpdate({ ...opp, docs: { ...(opp.docs || {}), resume: next } });
  const tailor = async () => {
    if (st && !window.confirm('Tailor again? Your ticks and edits on this resume will be replaced. Created Google Docs are kept.')) return;
    setBusy('Claude is reading the job and your profile… about 30–60 seconds.'); setError(null);
    try {
      const fresh = await D.tailorResume(opp, (st && st.format && st.format.pages) || pages);
      save({ ...fresh, format: (st && st.format) || { ...D.DEFAULT_FORMAT, pages }, versions: (st && st.versions) || [] });
    } catch (e) { setError(String(e.message || e).slice(0, 200)); } finally { setBusy(null); }
  };
  if (!D) return <div style={{ padding: 28, color: 'var(--ink-3)' }}>Refresh the page (Cmd+Shift+R) to load resumes.</div>;
  if (!st) {
    return (
      <div style={{ padding: '28px', maxWidth: 640 }}>
        <div className="serif" style={{ fontSize: 20, color: 'var(--ink-1)', marginBottom: 6 }}>A resume for this role</div>
        <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 16 }}>
          Claude reads the job, the company profile, your {(window.LU_PERSONAS.find((p) => p.id === opp.persona) || {}).name || 'persona'} angle and your whole Career profile, then proposes a headline, a summary and the achievements to include, most relevant first, with wording tightened for this job. Nothing is invented. You tick, edit and choose the format, then create a Google Doc.
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select aria-label="Target length" value={pages} onChange={(e) => setPages(+e.target.value)} style={docSel}><option value={2}>2 pages</option><option value={1}>1 page</option></select>
          <Btn variant="primary" size="m" icon="sparkles" disabled={!!busy || !(c.achievements || []).length} onClick={tailor}>{busy ? 'Tailoring…' : 'Tailor with Claude'}</Btn>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>about 3–5¢</span>
        </div>
        {!(c.achievements || []).length && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 10 }}>Your Career profile is empty: add your resumes there first.</div>}
        {busy && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 10 }}>{busy}</div>}
        {error && <div style={{ fontSize: 12.5, color: 'var(--signal)', marginTop: 10 }}>Couldn’t tailor: {error}</div>}
      </div>
    );
  }
  const model = D.resumeModel(st);
  const roles = [...(c.roles || [])].sort((a, b) => (/present/i.test(b.end || '') ? '9999' : String(b.end || b.start || '')).localeCompare(/present/i.test(a.end || '') ? '9999' : String(a.end || a.start || '')));
  const setItem = (id, patch) => save({ ...st, items: { ...st.items, [id]: { ...st.items[id], ...patch } } });
  const setRole = (id, mode) => save({ ...st, roles: { ...st.roles, [id]: { mode } } });
  const create = async () => {
    setBusy('Building the document…'); setError(null);
    try {
      const name = docFileName(opp, 'Resume');
      const r = await D.createGoogleDoc(model, name);
      const usedIds = Object.entries(st.items).filter(([, v]) => v.on).map(([k]) => k);
      const v = { id: 'v' + Date.now().toString(36), name, at: new Date().toISOString(), url: r.url, fileId: r.id, template: st.format.template, used: usedIds };
      save({ ...st, versions: [v, ...(st.versions || [])] });
      window.LU_CORE.pill(r.url ? 'Google Doc created in Level Up / Documents' : 'Word file downloaded (test mode)');
      if (r.url) window.open(r.url, '_blank', 'noopener');
    } catch (e) { setError(String(e.message || e).slice(0, 200)); } finally { setBusy(null); }
  };
  const markSent = (v) => {
    const at = new Date().toISOString();
    save({ ...st, versions: st.versions.map((x) => (x.id === v.id ? { ...x, sentAt: at } : x)) });
    if (window.LU_CAREER && window.LU_CAREER.markUsed) window.LU_CAREER.markUsed(v.used || [], { ref: opp.id + ':' + v.id, kind: 'resume', oppId: opp.id, company: opp.company, role: opp.role, at });
    window.LU_CORE.pill('Resume marked as sent');
  };
  const STATUS = { covered: ['✓', 'oklch(62% 0.12 150)'], partial: ['◐', 'oklch(70% 0.12 75)'], gap: ['▲', 'var(--signal)'] };
  const ach = c.achievements || [];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)', minHeight: 0, height: '100%' }}>
      <div style={{ overflow: 'auto', padding: '18px 22px 30px', borderRight: '1px solid var(--line-1)' }}>
        <div style={{ ...docMono, marginBottom: 8 }}>Format</div>
        <FormatControls format={st.format} onChange={(format) => save({ ...st, format })} kind="resume"/>

        <div style={{ ...docMono, margin: '18px 0 6px' }}>Headline and summary</div>
        <TextInput value={st.headline} onChange={(v) => save({ ...st, headline: v })}/>
        <div style={{ marginTop: 6 }}><TextArea value={st.summary} onChange={(v) => save({ ...st, summary: v })} rows={4}/></div>

        {(st.match || []).length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ ...docMono, marginBottom: 4 }}>Job match</div>
            {st.match.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', borderTop: '1px solid var(--line-1)', fontSize: 12.5 }}>
                <span style={{ color: STATUS[m.status][1], width: 12 }}>{STATUS[m.status][0]}</span>
                <span style={{ color: 'var(--ink-1)' }}>{m.item}<span style={{ color: 'var(--ink-3)' }}>{m.note ? ' · ' + m.note : ''}</span></span>
              </div>
            ))}
          </div>
        )}
        {(st.check || []).length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-2)' }}>
            <div style={{ ...docMono, marginBottom: 4 }}>Check before sending</div>
            {st.check.map((x, i) => <div key={i} style={{ padding: '2px 0' }}><span style={{ color: 'oklch(70% 0.12 75)', marginRight: 6 }}>▲</span>{x}</div>)}
          </div>
        )}

        <div style={{ ...docMono, margin: '18px 0 2px' }}>Experience: Claude's picks are ticked; untick, tick or edit any line</div>
        {roles.map((r) => {
          const mode = (st.roles[r.id] && st.roles[r.id].mode) || 'full';
          const order = (st.order && st.order[r.id]) || [];
          const list = [...order.map((id) => ach.find((a) => a.id === id)).filter(Boolean), ...ach.filter((a) => a.roleId === r.id && !order.includes(a.id))];
          return (
            <div key={r.id} style={{ borderTop: '1px solid var(--line-1)', padding: '10px 0' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: mode === 'omit' ? 'var(--ink-4)' : 'var(--ink-1)' }}><b style={{ fontWeight: 500 }}>{r.title}</b> · {r.company}</span>
                <select aria-label={'Show ' + r.title} value={mode} onChange={(e) => setRole(r.id, e.target.value)} style={{ ...docSel, height: 26, fontSize: 12 }}>
                  <option value="full">With bullets</option><option value="brief">Title line only</option><option value="omit">Leave out</option>
                </select>
              </div>
              {mode === 'full' && list.map((a) => {
                const it = st.items[a.id] || { on: false, text: a.text, original: a.text };
                return (
                  <div key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 0' }}>
                    <input type="checkbox" checked={!!it.on} onChange={(e) => setItem(a.id, { on: e.target.checked })} style={{ marginTop: 6 }}/>
                    <textarea value={it.text} onChange={(e) => setItem(a.id, { text: e.target.value })} rows={Math.max(1, Math.ceil(it.text.length / 70))}
                      title={it.original && it.original !== it.text ? 'Your original: ' + it.original : ''}
                      style={{ flex: 1, resize: 'vertical', fontFamily: 'var(--sans)', fontSize: 12.5, lineHeight: 1.45, padding: '3px 6px', background: 'transparent',
                        color: it.on ? 'var(--ink-1)' : 'var(--ink-4)', border: '1px solid ' + (it.on ? 'var(--line-1)' : 'transparent'), borderRadius: 3 }}/>
                    {it.original && it.original !== it.text && <button style={{ ...docLink, fontSize: 11, marginTop: 5 }} title={it.original} onClick={() => setItem(a.id, { text: it.original })}>Original</button>}
                  </div>
                );
              })}
            </div>
          );
        })}

        <div style={{ ...docMono, margin: '14px 0 6px' }}>Skills</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {(st.skills || []).map((k, i) => (
            <span key={i} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 12, padding: '3px 9px', borderRadius: 12, border: '1px solid var(--line-2)', color: 'var(--ink-1)' }}>
              {k}<button onClick={() => save({ ...st, skills: st.skills.filter((_, j) => j !== i) })} title="Remove" style={{ appearance: 'none', border: 'none', background: 'none', color: 'var(--ink-4)', cursor: 'pointer' }}>×</button>
            </span>
          ))}
        </div>
        <div style={{ marginTop: 16 }}><button style={docLink} disabled={!!busy} onClick={tailor}>Tailor again with Claude</button></div>
      </div>

      <div style={{ overflow: 'auto', padding: '18px 22px 30px', background: 'var(--bg-0)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <Btn variant="primary" size="m" icon="arrow-right" disabled={!!busy} onClick={create}>{busy && busy.startsWith('Building') ? 'Creating…' : 'Create Google Doc'}</Btn>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Saved to Level Up / Documents in your Drive. Edit it there, or download as Word or PDF.</span>
        </div>
        {busy && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 8 }}>{busy}</div>}
        {error && <div style={{ fontSize: 12.5, color: 'var(--signal)', marginBottom: 8 }}>{error}</div>}
        <DocPreview model={model} targetPages={st.format.pages}/>
        <DocVersions versions={st.versions} onSent={markSent}/>
      </div>
    </div>
  );
}

// ── Cover letter workspace ──────────────────────────────────────────────
function LetterWorkspace({ opp, onUpdate }) {
  const D = window.LU_DOCS;
  const docs = opp.docs || {};
  const st = docs.letter || null;
  const [busy, setBusy] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [instruction, setInstruction] = React.useState('');
  const save = (next) => onUpdate({ ...opp, docs: { ...(opp.docs || {}), letter: next } });
  const draft = async (revise) => {
    setBusy('Claude is drafting… about 20 seconds.'); setError(null);
    try {
      const d = await D.draftLetter(opp, revise ? { base: st.paragraphs, instruction } : {});
      const format = (st && st.format) || (docs.resume && docs.resume.format) || D.DEFAULT_FORMAT;
      save({ ...(st || {}), ...d, signoff: (st && st.signoff) || 'Kind regards,', format, versions: (st && st.versions) || [] });
      setInstruction('');
    } catch (e) { setError(String(e.message || e).slice(0, 200)); } finally { setBusy(null); }
  };
  if (!D) return <div style={{ padding: 28, color: 'var(--ink-3)' }}>Refresh the page (Cmd+Shift+R) to load cover letters.</div>;
  if (!st) {
    return (
      <div style={{ padding: '28px', maxWidth: 640 }}>
        <div className="serif" style={{ fontSize: 20, color: 'var(--ink-1)', marginBottom: 6 }}>A cover letter for this role</div>
        <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 16 }}>Claude drafts a 250–350 word letter from the job, the company profile, your persona's voice and your strongest proof for it. Use one only when a posting asks for it. You edit, then create a Google Doc with the same header as your resume.</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Btn variant="primary" size="m" icon="sparkles" disabled={!!busy} onClick={() => draft(false)}>{busy ? 'Drafting…' : 'Draft with Claude'}</Btn>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>about 2¢</span>
        </div>
        {busy && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 10 }}>{busy}</div>}
        {error && <div style={{ fontSize: 12.5, color: 'var(--signal)', marginTop: 10 }}>Couldn’t draft: {error}</div>}
      </div>
    );
  }
  const model = D.letterModel(st);
  const setPara = (i, v) => save({ ...st, paragraphs: st.paragraphs.map((p, j) => (j === i ? v : p)) });
  const create = async () => {
    setBusy('Building the document…'); setError(null);
    try {
      const name = docFileName(opp, 'Cover letter');
      const r = await D.createGoogleDoc(model, name);
      const v = { id: 'v' + Date.now().toString(36), name, at: new Date().toISOString(), url: r.url, fileId: r.id, used: st.used || [] };
      save({ ...st, versions: [v, ...(st.versions || [])] });
      window.LU_CORE.pill(r.url ? 'Google Doc created in Level Up / Documents' : 'Word file downloaded (test mode)');
      if (r.url) window.open(r.url, '_blank', 'noopener');
    } catch (e) { setError(String(e.message || e).slice(0, 200)); } finally { setBusy(null); }
  };
  const markSent = (v) => {
    const at = new Date().toISOString();
    save({ ...st, versions: st.versions.map((x) => (x.id === v.id ? { ...x, sentAt: at } : x)) });
    window.LU_CORE.pill('Cover letter marked as sent');
  };
  const words = st.paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)', minHeight: 0, height: '100%' }}>
      <div style={{ overflow: 'auto', padding: '18px 22px 30px', borderRight: '1px solid var(--line-1)' }}>
        <div style={{ ...docMono, marginBottom: 8 }}>Format</div>
        <FormatControls format={st.format} onChange={(format) => save({ ...st, format })} kind="letter"/>
        <div style={{ ...docMono, margin: '18px 0 6px' }}>Letter · {words} words</div>
        <TextInput value={st.recipient} onChange={(v) => save({ ...st, recipient: v })} placeholder="Recipient (optional)"/>
        <div style={{ marginTop: 6 }}><TextInput value={st.salutation} onChange={(v) => save({ ...st, salutation: v })}/></div>
        {st.paragraphs.map((p, i) => (
          <div key={i} style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}><TextArea value={p} onChange={(v) => setPara(i, v)} rows={Math.max(3, Math.ceil(p.length / 75))}/></div>
            <button title="Remove paragraph" onClick={() => save({ ...st, paragraphs: st.paragraphs.filter((_, j) => j !== i) })} style={{ appearance: 'none', border: 'none', background: 'none', color: 'var(--ink-4)', cursor: 'pointer', marginTop: 6 }}>×</button>
          </div>
        ))}
        <div style={{ marginTop: 6 }}><button style={docLink} onClick={() => save({ ...st, paragraphs: [...st.paragraphs, ''] })}>+ Add paragraph</button></div>
        <div style={{ marginTop: 6 }}><TextInput value={st.signoff} onChange={(v) => save({ ...st, signoff: v })}/></div>
        {(st.check || []).length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-2)' }}>
            <div style={{ ...docMono, marginBottom: 4 }}>Check before sending</div>
            {st.check.map((x, i) => <div key={i} style={{ padding: '2px 0' }}><span style={{ color: 'oklch(70% 0.12 75)', marginRight: 6 }}>▲</span>{x}</div>)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <div style={{ flex: 1 }}><TextInput value={instruction} onChange={setInstruction} placeholder='Revise: "shorter", "warmer", "lead with the M&A work"'/></div>
          <Btn variant="ghost" size="m" disabled={!!busy} onClick={() => draft(!!instruction.trim())}>{instruction.trim() ? 'Revise' : 'Redraft'}</Btn>
        </div>
      </div>
      <div style={{ overflow: 'auto', padding: '18px 22px 30px', background: 'var(--bg-0)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <Btn variant="primary" size="m" icon="arrow-right" disabled={!!busy} onClick={create}>{busy && busy.startsWith('Building') ? 'Creating…' : 'Create Google Doc'}</Btn>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Saved to Level Up / Documents in your Drive.</span>
        </div>
        {busy && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 8 }}>{busy}</div>}
        {error && <div style={{ fontSize: 12.5, color: 'var(--signal)', marginBottom: 8 }}>{error}</div>}
        <DocPreview model={model} targetPages={1}/>
        <DocVersions versions={st.versions} onSent={markSent}/>
      </div>
    </div>
  );
}

Object.assign(window, { ResumeWorkspace, LetterWorkspace, DocPreview });
