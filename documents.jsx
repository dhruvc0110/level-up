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
// Web fonts for the preview, loaded once (the Google Doc uses the same families).
function useDocFonts() {
  React.useEffect(() => {
    if (document.getElementById('lu-doc-fonts')) return;
    const l = document.createElement('link');
    l.id = 'lu-doc-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;600&family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Montserrat:wght@400;600&family=Open+Sans:wght@400;700&family=Playfair+Display:wght@400;700&family=Source+Sans+3:wght@400;700&display=swap';
    document.head.appendChild(l);
  }, []);
}

function TemplateThumb({ k, f, on, onClick }) {
  const D = window.LU_DOCS;
  const st = D.styleFor(D.applyTemplate(f, k));
  const c = '#' + st.color, line = (w, col) => <div style={{ height: 3, width: w + '%', background: col || '#c8c8c8', margin: '3px 0', borderRadius: 1 }}/>;
  const lines = (n) => Array.from({ length: n }).map((_, i) => <React.Fragment key={i}>{line(55 + ((i * 37) % 40))}</React.Fragment>);
  const head = <div style={{ fontFamily: st.headCss, fontSize: 11, color: '#' + st.nameColor, textAlign: st.center ? 'center' : 'left' }}>Name</div>;
  const sec = (t) => <div style={{ fontFamily: st.headCss, fontSize: 6.5, color: '#' + st.headingColor, fontWeight: st.headingBold ? 700 : 400, marginTop: 5, textAlign: st.center ? 'center' : 'left',
    borderBottom: st.rule === 'accent' ? `1.5px solid ${c}` : st.rule === 'hair' ? '0.5px solid #aaa' : 'none' }}>{st.caps ? t.toUpperCase() : t}</div>;
  let body;
  if (st.band) body = <><div style={{ background: c, margin: '-8px -8px 4px', padding: 8, color: '#fff', fontFamily: st.headCss, fontSize: 11 }}>Name</div>{sec('Experience')}{lines(6)}</>;
  else if (st.sidebar) body = <div style={{ display: 'flex', gap: 5, margin: '-8px' }}><div style={{ width: '34%', background: '#' + st.tint, padding: '8px 4px' }}>{head}{sec('Skills')}{lines(4)}</div><div style={{ flex: 1, padding: '8px 6px 0 0' }}>{sec('Experience')}{lines(9)}</div></div>;
  else if (st.narrative) body = <>{head}<div style={{ fontFamily: st.bodyCss, fontSize: 6, color: '#555', marginTop: 5, lineHeight: 1.4 }}>A short narrative profile for board and advisory roles…</div>{sec('Selected achievements')}{lines(4)}</>;
  else body = <>{head}{sec('Summary')}{lines(2)}{sec('Experience')}{lines(k === 'compact' ? 8 : 5)}</>;
  return (
    <button onClick={onClick} title={(D.TEMPLATES[k].ats ? 'Safe for online applications' : 'Best for emailing; less friendly to applicant-tracking systems')}
      style={{ appearance: 'none', cursor: 'pointer', padding: 5, textAlign: 'left', background: 'var(--bg-2)', borderRadius: 4, border: on ? '2px solid var(--ink-1)' : '1px solid var(--line-2)' }}>
      <div style={{ background: '#fff', borderRadius: 2, padding: 8, height: 92, overflow: 'hidden' }}>{body}</div>
      <div style={{ fontSize: 11.5, marginTop: 4, color: 'var(--ink-1)', display: 'flex', justifyContent: 'space-between' }}>
        <span>{D.TEMPLATES[k].label}</span>{!D.TEMPLATES[k].ats && <span title="Less friendly to applicant-tracking systems" style={{ color: 'oklch(70% 0.12 75)' }}>●</span>}
      </div>
    </button>
  );
}

function FormatControls({ format, onChange, kind, onFit, fitting, persona, onSaveLook }) {
  useDocFonts();
  const D = window.LU_DOCS;
  const f = D.normalize(format);
  const set = (k, v) => onChange({ ...f, [k]: v });
  const toggle = (group, k) => onChange({ ...f, [group]: { ...f[group], [k]: !f[group][k] } });
  const [open, setOpen] = React.useState(false);
  const templates = kind === 'letter' ? ['classic', 'executive', 'modern', 'minimal', 'banner'] : Object.keys(D.TEMPLATES);
  const move = (i, d) => { const o = f.sectionOrder.slice(); const j = i + d; if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; set('sectionOrder', o); };
  const lbl = { fontSize: 11.5, color: 'var(--ink-3)', display: 'block', marginBottom: 3 };
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 6 }}>
        {templates.map((k) => <TemplateThumb key={k} k={k} f={f} on={f.template === k} onClick={() => onChange(D.applyTemplate(f, k))}/>)}
      </div>
      <div style={{ fontSize: 11.5, marginTop: 6, color: D.TEMPLATES[f.template].ats ? 'oklch(62% 0.12 150)' : 'oklch(70% 0.12 75)' }}>
        {D.TEMPLATES[f.template].ats ? 'Safe for online applications (applicant-tracking friendly).' : 'Best for emailing or handing to a recruiter. Use a single-column template for online applications.'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginTop: 10 }}>
        <label><span style={lbl}>Fonts</span><select aria-label="Font pairing" value={f.fontPair} onChange={(e) => set('fontPair', e.target.value)} style={{ ...docSel, width: '100%' }}>{Object.entries(D.FONT_PAIRS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}</select></label>
        {kind !== 'letter' && <label><span style={lbl}>Length</span><select aria-label="Length" value={f.pages} onChange={(e) => set('pages', +e.target.value)} style={{ ...docSel, width: '100%' }}><option value={1}>1 page</option><option value={2}>2 pages</option></select></label>}
        <label><span style={lbl}>Text size · {f.size}pt</span><input aria-label="Text size" type="range" min="9" max="11.5" step="0.5" value={f.size} onChange={(e) => set('size', +e.target.value)} style={{ width: '100%' }}/></label>
        <label><span style={lbl}>Margins · {f.margin.toFixed(2)}in</span><input aria-label="Margins" type="range" min="0.5" max="1" step="0.05" value={f.margin} onChange={(e) => set('margin', +e.target.value)} style={{ width: '100%' }}/></label>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-3)', marginRight: 2 }}>Colour</span>
        {Object.entries(D.PALETTE).map(([k, hex]) => (
          <button key={k} aria-label={'Colour ' + k} title={k} onClick={() => set('color', hex)} style={{ width: 20, height: 20, borderRadius: '50%', padding: 0, cursor: 'pointer', background: '#' + hex, border: f.color === hex ? '2px solid var(--ink-1)' : '2px solid transparent', outline: '1px solid var(--line-2)' }}/>
        ))}
        <input aria-label="Custom colour" type="color" value={'#' + f.color} onChange={(e) => set('color', e.target.value.replace('#', '').toUpperCase())} style={{ width: 26, height: 22, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}/>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
        {kind !== 'letter' && onFit && <Btn variant="outline" size="s" disabled={fitting} onClick={onFit}>{fitting ? 'Fitting…' : `Fit to ${f.pages} page${f.pages === 1 ? '' : 's'}`}</Btn>}
        <button style={docLink} onClick={() => setOpen(!open)}>{open ? 'Fewer options' : 'More options'}</button>
        {persona && onSaveLook && <button style={docLink} onClick={onSaveLook} title={'New resumes for ' + persona.code + ' start with this look'}>Save as {persona.code}'s look</button>}
      </div>

      {open && (
        <div style={{ marginTop: 10, padding: '10px 12px', border: '1px solid var(--line-1)', borderRadius: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            <label><span style={lbl}>Line spacing</span><select value={f.lineSpacing} onChange={(e) => set('lineSpacing', +e.target.value)} style={{ ...docSel, width: '100%' }}><option value={1}>Single</option><option value={1.05}>Tight</option><option value={1.15}>Normal</option><option value={1.25}>Relaxed</option></select></label>
            <label><span style={lbl}>Section spacing</span><select value={f.sectionGap} onChange={(e) => set('sectionGap', e.target.value)} style={{ ...docSel, width: '100%' }}><option value="compact">Compact</option><option value="balanced">Balanced</option><option value="airy">Airy</option></select></label>
            <label><span style={lbl}>Paper</span><select value={f.paper} onChange={(e) => set('paper', e.target.value)} style={{ ...docSel, width: '100%' }}><option value="letter">US Letter</option><option value="a4">A4</option></select></label>
            {kind !== 'letter' && <label><span style={lbl}>Dates</span><select value={f.datePos} onChange={(e) => set('datePos', e.target.value)} style={{ ...docSel, width: '100%' }}><option value="right">Right of the title</option><option value="below">Below the title</option></select></label>}
            {kind !== 'letter' && <label><span style={lbl}>Role line</span><select value={f.roleOrder} onChange={(e) => set('roleOrder', e.target.value)} style={{ ...docSel, width: '100%' }}><option value="title">Title first</option><option value="company">Company first</option></select></label>}
            {kind !== 'letter' && <label><span style={lbl}>Bullets</span><select value={f.bullet} onChange={(e) => set('bullet', e.target.value)} style={{ ...docSel, width: '100%' }}><option value="•">• Round</option><option value="–">– Dash</option><option value="▪">▪ Square</option></select></label>}
          </div>
          <label style={{ display: 'inline-flex', gap: 5, alignItems: 'center', fontSize: 12, color: 'var(--ink-2)', marginTop: 8 }}><input type="checkbox" checked={f.headingCaps} onChange={() => set('headingCaps', !f.headingCaps)}/>Headings in capitals</label>
          {kind !== 'letter' && (
            <>
              <div style={{ ...docMono, margin: '12px 0 4px' }}>Contact details</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--ink-2)' }}>
                {[['location', 'Location'], ['email', 'Email'], ['phone', 'Phone'], ['linkedin', 'LinkedIn']].map(([k, l]) => (
                  <label key={k} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={!!f.contact[k]} onChange={() => toggle('contact', k)}/>{l}</label>
                ))}
              </div>
              <div style={{ ...docMono, margin: '12px 0 4px' }}>Sections: order, heading and show</div>
              {f.sectionOrder.map((k, i) => (
                <div key={k} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '3px 0' }}>
                  {k === 'experience' ? <span style={{ width: 16 }}/> : <input type="checkbox" aria-label={'Show ' + k} checked={!!f.sections[k]} onChange={() => toggle('sections', k)}/>}
                  <input value={f.sectionTitles[k] || ''} placeholder={D.SECTION_TITLES[k]} onChange={(e) => set('sectionTitles', { ...f.sectionTitles, [k]: e.target.value })}
                    style={{ flex: 1, height: 26, padding: '0 6px', fontSize: 12.5, background: 'var(--bg-0)', color: 'var(--ink-1)', border: '1px solid var(--line-2)', borderRadius: 3 }}/>
                  <button aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0} style={{ ...docLink, textDecoration: 'none' }}>↑</button>
                  <button aria-label="Move down" onClick={() => move(i, 1)} disabled={i === f.sectionOrder.length - 1} style={{ ...docLink, textDecoration: 'none' }}>↓</button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Live preview at true page size, scaled to fit, with a page-fit check ──
function DocPreview({ model, targetPages, onMeasure }) {
  useDocFonts();
  const outer = React.useRef(null), inner = React.useRef(null);
  const [scale, setScale] = React.useState(0.6);
  const [height, setHeight] = React.useState(0);
  const st = model.style, DPI = 96, px = (ptv) => ptv * 4 / 3;
  const pageW = st.page.w * DPI, pageH = st.page.h * DPI, m = st.margin * DPI, usable = pageH - 2 * m;
  React.useEffect(() => {
    const measure = () => {
      if (outer.current) setScale(Math.min(1, (outer.current.clientWidth - 2) / pageW));
      if (inner.current) { const h = inner.current.scrollHeight; setHeight(h); if (onMeasure) onMeasure(h / usable); }
    };
    measure();
    const t = setTimeout(measure, 400); // after web fonts settle
    const ro = window.ResizeObserver ? new ResizeObserver(measure) : null;
    if (ro && outer.current) ro.observe(outer.current);
    return () => { clearTimeout(t); ro && ro.disconnect(); };
  });
  const pages = Math.max(1, height / usable);
  const n = Math.ceil(pages - 0.02);
  const lineH = px(st.size.body) * st.line * 1.15;
  const target = targetPages || 2;
  const overLines = Math.ceil((height - target * usable) / lineH);
  const overMsg = overLines <= 12 ? `About ${overLines} line${overLines === 1 ? '' : 's'} over ${target} page${target === 1 ? '' : 's'}: try Fit, untick an item, or choose Compact`
    : `About ${pages.toFixed(1)} pages: try Fit, or untick a few items`;
  const col = '#' + st.color;
  const body = { fontFamily: st.bodyCss, fontSize: px(st.size.body), color: '#1b1b1b', lineHeight: st.line * 1.15 };
  const sectionHead = (t, inSide) => (
    <div style={{ fontFamily: st.headCss, fontSize: px(st.size.section), color: '#' + st.headingColor, letterSpacing: st.caps ? '0.06em' : 0, fontWeight: st.headingBold ? 700 : 400,
      textAlign: st.center ? 'center' : 'left', borderBottom: inSide ? 'none' : st.rule === 'accent' ? `1.5px solid ${col}` : st.rule === 'hair' ? '0.75px solid #999' : 'none',
      paddingBottom: 2, margin: `${px(st.gap.section)}px 0 ${px(st.gap.para * 2)}px` }}>{st.caps ? t.toUpperCase() : t}</div>
  );
  const bullet = (t, j) => (
    <div key={j} style={{ display: 'flex', gap: 6, paddingLeft: 4, marginTop: px(st.gap.para) }}><span style={{ color: col }}>{st.bullet}</span><span>{t}</span></div>
  );
  const role = (x, i) => {
    const first = st.roleOrder === 'company' ? <span><b>{x.company}</b>{'  ·  '}{x.title}</span> : <span><b>{x.title}</b>{'  ·  '}{x.company}</span>;
    return (
      <div key={i} style={{ marginTop: px(st.gap.item) }}>
        {st.datePos === 'below' ? <>{first}<div style={{ fontSize: px(st.size.small), color: '#666', fontStyle: 'italic' }}>{x.dates}</div></>
          : <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>{first}<span style={{ fontSize: px(st.size.small), color: '#555', whiteSpace: 'nowrap' }}>{x.dates}</span></div>}
        {x.bullets.map(bullet)}
      </div>
    );
  };
  const section = (sec, inSide) => (
    <div key={sec.key}>
      {sectionHead(sec.title, inSide)}
      {sec.key === 'summary' ? sec.items.map((t, i) => <div key={i}>{t}</div>)
        : sec.key === 'experience' ? sec.items.map(role)
        : sec.key === 'highlights' ? sec.items.map(bullet)
        : sec.key === 'skills' && !inSide ? <div>{sec.items.join('  ·  ')}</div>
        : sec.items.map((t, i) => <div key={i} style={inSide ? { fontSize: px(st.size.small + 0.5), marginBottom: 2 } : {}}>{t}</div>)}
    </div>
  );
  const header = (onBand) => (
    <div style={{ textAlign: st.center ? 'center' : 'left' }}>
      <div style={{ fontFamily: st.headCss, fontSize: px(st.size.name), color: onBand ? '#fff' : '#' + st.nameColor, lineHeight: 1.15 }}>{model.name}</div>
      {model.headline && <div style={{ ...body, fontSize: px(st.size.headline), color: onBand ? '#fff' : '#444', marginTop: 2 }}>{model.headline}</div>}
      {model.contact.length > 0 && <div style={{ ...body, fontSize: px(st.size.small), color: onBand ? '#f2f2f2' : '#555', marginTop: 2, paddingBottom: 3,
        borderBottom: model.kind === 'resume' && st.rule === 'hair' && !onBand && !st.sidebar ? '0.75px solid #999' : 'none' }}>{model.contact.join('  ·  ')}</div>}
    </div>
  );
  return (
    <div ref={outer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 8 }}>
        <span style={docMono}>Preview</span>
        {model.kind === 'resume' && (
          <span style={{ fontSize: 12, color: n > target ? 'var(--signal)' : 'oklch(62% 0.12 150)' }}>{n > target ? overMsg : `Fits on ${n} page${n === 1 ? '' : 's'}`}</span>
        )}
      </div>
      <div style={{ width: pageW * scale, height: Math.max(pageH, height + 2 * m) * scale, overflow: 'hidden', border: '1px solid var(--line-2)', background: '#fff' }}>
        <div style={{ width: pageW, transform: `scale(${scale})`, transformOrigin: 'top left', padding: m, boxSizing: 'border-box', position: 'relative', background: '#fff' }}>
          {Array.from({ length: Math.max(0, n - 1) }).map((_, i) => (
            <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: m + usable * (i + 1), borderTop: '1px dashed #c33', opacity: 0.5 }}>
              <span style={{ position: 'absolute', right: 6, top: 2, fontSize: 11, color: '#c33', fontFamily: 'Arial' }}>page {i + 2}</span>
            </div>
          ))}
          <div ref={inner} style={body}>
            {st.band ? <div style={{ background: col, padding: '14px 14px 10px', marginBottom: 4 }}>{header(true)}</div> : header(false)}
            {model.kind === 'letter' ? (
              <div>
                <div style={{ margin: '24px 0 16px' }}>{model.date}</div>
                {model.recipient && <div style={{ marginBottom: 16 }}>{model.recipient}</div>}
                <div style={{ marginBottom: 10 }}>{model.salutation}</div>
                {model.paragraphs.map((p, i) => <p key={i} style={{ margin: '0 0 10px' }}>{p}</p>)}
                <div style={{ marginTop: 8 }}>{model.signoff}</div>
                <div style={{ marginTop: 32 }}>{model.signature}</div>
              </div>
            ) : st.sidebar ? (
              <div style={{ display: 'flex', gap: '0.25in', marginTop: 8 }}>
                <div style={{ width: '32%', background: '#' + st.tint, padding: '6px 9px', boxSizing: 'border-box' }}>{model.side.map((x) => section(x, true))}</div>
                <div style={{ flex: 1 }}>{model.main.map((x) => section(x, false))}</div>
              </div>
            ) : model.main.map((x) => section(x, false))}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 6 }}>The page count is a close estimate; the Google Doc may differ by a line or two. Send the Doc as a PDF (File → Download → PDF) so fonts stay exact.</div>
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
  const [fitting, setFitting] = React.useState(false);
  const measured = React.useRef(1);
  const latest = React.useRef(null);
  const persona = (window.LU_PERSONAS || []).find((p) => p.id === opp.persona) || null;
  const save = (next) => { latest.current = next; onUpdate({ ...opp, docs: { ...(opp.docs || {}), resume: next } }); };
  // Fit to pages: tighten line spacing, section spacing, margins, then text size, one step at a time,
  // re-measuring the preview after each, until it fits (never below 9pt or 0.5in margins).
  const fit = async () => {
    setFitting(true);
    try {
      let cur = latest.current || st;
      const target = D.normalize(cur.format).pages;
      const steps = [
        (f) => (f.lineSpacing > 1.15 ? { ...f, lineSpacing: 1.15 } : null),
        (f) => (f.sectionGap === 'airy' ? { ...f, sectionGap: 'balanced' } : null),
        (f) => (f.lineSpacing > 1.05 ? { ...f, lineSpacing: 1.05 } : null),
        (f) => (f.sectionGap !== 'compact' ? { ...f, sectionGap: 'compact' } : null),
        (f) => (f.margin > 0.6 ? { ...f, margin: Math.max(0.6, +(f.margin - 0.1).toFixed(2)) } : null),
        (f) => (f.size > 9.5 ? { ...f, size: f.size - 0.5 } : null),
        (f) => (f.lineSpacing > 1 ? { ...f, lineSpacing: 1 } : null),
        (f) => (f.margin > 0.5 ? { ...f, margin: Math.max(0.5, +(f.margin - 0.05).toFixed(2)) } : null),
        (f) => (f.size > 9 ? { ...f, size: f.size - 0.5 } : null),
      ];
      const wait = () => new Promise((r) => setTimeout(r, 550));
      await wait();
      for (let guard = 0; guard < 16 && measured.current > target + 0.005; guard++) {
        const f = D.normalize(cur.format);
        const next = steps.map((fn) => fn(f)).find(Boolean);
        if (!next) break;
        cur = { ...cur, format: next };
        save(cur);
        await wait();
      }
      window.LU_CORE.pill(measured.current > target + 0.005 ? 'Still a little long: untick an item or two' : `Fits on ${target} page${target === 1 ? '' : 's'}`);
    } finally { setFitting(false); }
  };
  const saveLook = () => {
    if (!persona) return;
    const look = { ...D.normalize(st.format) };
    window.LU_API.put('/api/personas/' + persona.id, { ...persona, docFormat: look });
    window.LU_CORE.pill(`Saved: new resumes for ${persona.code} start with this look`);
  };
  const tailor = async () => {
    if (st && !window.confirm('Tailor again? Your ticks and edits on this resume will be replaced. Created Google Docs are kept.')) return;
    setBusy('Claude is reading the job and your profile… about 30–60 seconds.'); setError(null);
    try {
      const fresh = await D.tailorResume(opp, (st && st.format && st.format.pages) || pages);
      const look = persona && persona.docFormat ? { ...persona.docFormat, pages } : { ...D.DEFAULT_FORMAT, pages };
      save({ ...fresh, format: (st && st.format) || look, versions: (st && st.versions) || [] });
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
        <FormatControls format={st.format} onChange={(format) => save({ ...st, format })} kind="resume" onFit={fit} fitting={fitting} persona={persona} onSaveLook={saveLook}/>

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
        <DocPreview model={model} targetPages={D.normalize(st.format).pages} onMeasure={(p) => { measured.current = p; }}/>
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
  const model = D.letterModel({ ...st, headline: st.headline || (docs.resume && docs.resume.headline) || '' });
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
