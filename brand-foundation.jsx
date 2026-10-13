// Level Up — Brand › Foundation: one brand kit per persona (pillars, LinkedIn
// headline options, About), drafted by Claude from the Career profile, edited
// here, copied to LinkedIn by hand. One persona is "live" at a time.

const bfMono = { fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-4)' };
const bfLink = { appearance: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--ink-2)', textDecoration: 'underline', textDecorationColor: 'var(--line-2)', textUnderlineOffset: 3, fontFamily: 'var(--sans)' };
const bfInput = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-1)', color: 'var(--ink-1)', border: '1px solid var(--line-1)', borderRadius: 3, fontFamily: 'var(--sans)', fontSize: 13, padding: '6px 9px', outline: 'none' };

function BrandFoundation() {
  const B = window.LU_BRAND;
  const [, bump] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const on = () => bump();
    window.addEventListener('lu:brand-changed', on);
    window.addEventListener('lu:career-changed', on);
    return () => { window.removeEventListener('lu:brand-changed', on); window.removeEventListener('lu:career-changed', on); };
  }, []);
  const personas = window.activePersonas ? window.activePersonas() : (window.LU_PERSONAS || []);
  const liveNow = B ? B.live() : null;
  const [pid, setPid] = React.useState(() => (liveNow && personas.some((p) => p.id === liveNow.personaId) ? liveNow.personaId : (personas[0] || {}).id));
  if (!B) return <div style={{ padding: 28, color: 'var(--ink-3)' }}>Refresh the page (Cmd+Shift+R) to load Brand.</div>;
  if (!personas.length) return <div style={{ padding: 28, color: 'var(--ink-3)' }}>Add a persona first (Personas in the sidebar): each persona gets its own brand kit.</div>;
  const persona = personas.find((p) => p.id === pid) || personas[0];
  const livePersona = liveNow && (window.LU_PERSONAS || []).find((p) => p.id === liveNow.personaId);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {personas.map((p) => {
            const st = B.status(p), on = p.id === persona.id;
            return (
              <button key={p.id} onClick={() => setPid(p.id)} style={{
                appearance: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 3, fontSize: 12, fontFamily: 'var(--sans)',
                border: '1px solid ' + (on ? 'var(--line-3)' : 'var(--line-1)'), background: on ? 'var(--bg-3)' : 'transparent', color: st === 'none' && !on ? 'var(--ink-3)' : 'var(--ink-1)',
              }}>
                <PersonaDot personaId={p.id} size={6}/>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{p.code}</span>
                {p.name}
                {st === 'live' && <span style={{ fontSize: 10, color: 'oklch(62% 0.12 150)' }}>● live</span>}
                {st === 'none' && <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>not started</span>}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          Live on LinkedIn: {livePersona ? <b style={{ fontWeight: 500, color: 'var(--ink-1)' }}>{livePersona.code} {livePersona.name}</b> : 'none set yet'}
        </span>
      </div>
      <PersonaKit key={persona.id} persona={persona} isLive={!!(liveNow && liveNow.personaId === persona.id)}/>
    </div>
  );
}

function PersonaKit({ persona, isLive }) {
  const B = window.LU_BRAND, L = B.LIMITS;
  const kit = B.kitFor(persona);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [instruction, setInstruction] = React.useState('');
  const [copied, setCopied] = React.useState(null);
  const c = (window.LU_CORE && window.LU_CORE.doc().career) || {};
  const ach = c.achievements || [];
  const save = (patch) => B.save(persona.id, patch);
  const copy = (what, text) => { navigator.clipboard && navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1500); };
  const run = async () => {
    if (kit && !instruction.trim() && !window.confirm('Draft this brand kit again? Your edits to pillars, headlines and About will be replaced.')) return;
    setBusy(true); setError(null);
    try { await B.draft(persona, kit && instruction.trim() ? { current: kit, instruction: instruction.trim() } : null); setInstruction(''); }
    catch (e) { setError(String(e.message || e).slice(0, 200)); }
    finally { setBusy(false); }
  };

  const header = (
    <div style={{ border: '1px solid var(--line-1)', borderRadius: 4, padding: '14px 16px', marginBottom: 14, background: 'var(--bg-2)' }}>
      <div style={bfMono}>Positioning · {persona.code} {persona.name}</div>
      <div className="serif" style={{ fontSize: 17, color: 'var(--ink-1)', lineHeight: 1.4, marginTop: 6 }}>
        {persona.positioning || <span style={{ color: 'var(--ink-3)' }}>No positioning written yet. Add one in Personas: it anchors this brand.</span>}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 6 }}>From the persona. Change it in Personas; the kit will say when it needs a redraft.</div>
    </div>
  );

  if (!kit) {
    return (
      <div>
        {header}
        <div style={{ maxWidth: 640 }}>
          <div className="serif" style={{ fontSize: 20, color: 'var(--ink-1)', marginBottom: 6 }}>Build this persona's brand</div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 14 }}>
            Claude reads this persona and your Career profile, then proposes 3–5 content pillars with the proof behind each and post ideas, three LinkedIn headline options and an About section. Nothing is invented and nothing is posted: you edit it here and copy it to LinkedIn.
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Btn variant="primary" size="m" icon="sparkles" disabled={busy || !ach.length} onClick={run}>{busy ? 'Drafting…' : 'Draft with Claude'}</Btn>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>about 3–5¢ · under a minute</span>
          </div>
          {!ach.length && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 10 }}>Your Career profile is empty: add your resumes there first.</div>}
          {busy && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 10 }}>Claude is reading the persona and your record… about 30–60 seconds.</div>}
          {error && <div style={{ fontSize: 12.5, color: 'var(--signal)', marginTop: 10 }}>Couldn’t draft: {error}</div>}
        </div>
      </div>
    );
  }

  const pillars = kit.pillars || [];
  const setPillar = (i, patch) => save({ pillars: pillars.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const headlines = kit.headlines || [];
  const chosen = headlines[kit.headline || 0] || '';
  const about = kit.about || '';
  const count = (n, max) => <span style={{ fontSize: 11, color: n > max ? 'var(--signal)' : 'var(--ink-4)' }}>{n.toLocaleString()} / {max.toLocaleString()}</span>;

  return (
    <div>
      {header}
      {kit.stale && (
        <div style={{ fontSize: 12.5, color: 'var(--ink-1)', background: 'var(--bg-2)', border: '1px solid var(--line-2)', borderRadius: 3, padding: '8px 12px', marginBottom: 12 }}>
          This persona changed since the kit was drafted. <button style={bfLink} onClick={run}>Draft again</button> or keep editing.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18, alignItems: 'start' }}>
        {/* ── Pillars ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={bfMono}>Content pillars · {pillars.length}</span>
            {pillars.length < L.pillars && <button style={bfLink} onClick={() => save({ pillars: [...pillars, { id: 'pl-' + Date.now().toString(36), name: '', why: '', proof: [], topics: [] }] })}>+ Add a pillar</button>}
          </div>
          {pillars.map((p, i) => (
            <div key={p.id} style={{ border: '1px solid var(--line-1)', borderRadius: 4, padding: '10px 12px', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input aria-label="Pillar name" value={p.name} placeholder="Pillar name" autoFocus={!p.name && i === pillars.length - 1} onChange={(e) => setPillar(i, { name: e.target.value })} style={{ ...bfInput, fontWeight: 500, fontSize: 14 }}/>
                <button style={{ ...bfLink, fontSize: 11 }} title="Remove this pillar" onClick={() => save({ pillars: pillars.filter((_, j) => j !== i) })}>Remove</button>
              </div>
              <textarea aria-label="Why this persona owns it" value={p.why} rows={2} placeholder="Why this persona owns this theme" onChange={(e) => setPillar(i, { why: e.target.value })}
                style={{ ...bfInput, marginTop: 6, fontSize: 12.5, resize: 'vertical', lineHeight: 1.45 }}/>
              {(p.proof || []).length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ ...bfMono, fontSize: 9.5 }}>Proof</div>
                  {p.proof.map((id) => { const a = ach.find((x) => x.id === id); return a ? (
                    <div key={id} style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--ink-2)', padding: '2px 0' }}>
                      <span style={{ color: 'var(--ink-4)' }}>·</span><span style={{ flex: 1 }}>{a.text}</span>
                      <button style={{ ...bfLink, fontSize: 11, color: 'var(--ink-4)' }} title="Remove from this pillar" onClick={() => setPillar(i, { proof: p.proof.filter((x) => x !== id) })}>×</button>
                    </div>) : null; })}
                </div>
              )}
              <div style={{ marginTop: 6 }}>
                <div style={{ ...bfMono, fontSize: 9.5 }}>Post ideas</div>
                {(p.topics || []).map((t, j) => (
                  <div key={j} style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
                    <input aria-label="Post idea" value={t} autoFocus={t === '' && j === p.topics.length - 1} onChange={(e) => setPillar(i, { topics: p.topics.map((x, k) => (k === j ? e.target.value : x)) })} style={{ ...bfInput, fontSize: 12, padding: '4px 8px' }}/>
                    <button style={{ ...bfLink, fontSize: 11, color: 'var(--ink-4)' }} title="Remove idea" onClick={() => setPillar(i, { topics: p.topics.filter((_, k) => k !== j) })}>×</button>
                  </div>
                ))}
                {(p.topics || []).length < L.topics && <button style={{ ...bfLink, fontSize: 11.5, marginTop: 4 }} onClick={() => setPillar(i, { topics: [...(p.topics || []), ''] })}>+ Add an idea</button>}
              </div>
            </div>
          ))}
        </div>

        {/* ── LinkedIn profile ── */}
        <div>
          <div style={{ ...bfMono, marginBottom: 6 }}>LinkedIn headline · pick one</div>
          {headlines.map((h, i) => {
            const on = (kit.headline || 0) === i;
            return (
              <div key={i} style={{ border: '1px solid ' + (on ? 'var(--line-3)' : 'var(--line-1)'), background: on ? 'var(--bg-2)' : 'transparent', borderRadius: 4, padding: '8px 10px', marginBottom: 6 }}>
                <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="radio" name={'hl-' + persona.id} checked={on} onChange={() => save({ headline: i })} style={{ marginTop: 5 }}/>
                  <textarea aria-label={'Headline option ' + (i + 1)} value={h} rows={2} onChange={(e) => save({ headlines: headlines.map((x, j) => (j === i ? e.target.value : x)) })}
                    style={{ ...bfInput, flex: 1, fontSize: 12.5, resize: 'vertical', lineHeight: 1.45, background: 'transparent' }}/>
                </label>
                <div style={{ textAlign: 'right', marginTop: 2 }}>{count(h.length, L.headline)}</div>
              </div>
            );
          })}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '14px 0 6px' }}>
            <span style={bfMono}>About</span>{count(about.length, L.about)}
          </div>
          <textarea aria-label="LinkedIn About" value={about} rows={14} onChange={(e) => save({ about: e.target.value })}
            style={{ ...bfInput, fontSize: 12.5, lineHeight: 1.55, resize: 'vertical' }}/>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4 }}>
            LinkedIn shows about the first {Math.min(about.length, 260)} characters before “see more”: <span style={{ color: 'var(--ink-2)', fontStyle: 'italic' }}>“{about.slice(0, 260)}{about.length > 260 ? '…' : ''}”</span>
          </div>

          {(kit.featured || []).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={bfMono}>Featured section ideas</div>
              {kit.featured.map((f, i) => <div key={i} style={{ fontSize: 12.5, color: 'var(--ink-2)', padding: '3px 0' }}>· {f}</div>)}
            </div>
          )}
          {(kit.check || []).length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={bfMono}>Check before publishing</div>
              {kit.check.map((x, i) => <div key={i} style={{ fontSize: 12, color: 'var(--ink-2)', padding: '2px 0' }}><span style={{ color: 'oklch(70% 0.12 75)', marginRight: 6 }}>▲</span>{x}</div>)}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            <Btn size="s" variant="outline" onClick={() => copy('headline', chosen)}>{copied === 'headline' ? 'Copied' : 'Copy headline'}</Btn>
            <Btn size="s" variant="outline" onClick={() => copy('about', about)}>{copied === 'about' ? 'Copied' : 'Copy About'}</Btn>
            {isLive
              ? <span style={{ fontSize: 12, color: 'oklch(62% 0.12 150)', alignSelf: 'center' }}>● Live on LinkedIn since {new Date(B.live().at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              : <Btn size="s" variant="primary" onClick={() => { B.setLive(persona.id); window.LU_CORE.pill(`${persona.code} marked as live on LinkedIn`); }}>Set as live on LinkedIn</Btn>}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 6 }}>Paste the headline and About into your LinkedIn profile, then mark it live so posts and signals use this persona.</div>
        </div>
      </div>

      {/* ── Revise ── */}
      <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--line-1)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input aria-label="Instruction for Claude" value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Revise with an instruction, e.g. “sharper headlines”, “add a pillar on board work”"
          onKeyDown={(e) => { if (e.key === 'Enter' && instruction.trim() && !busy) run(); }}
          style={{ ...bfInput, flex: '1 1 320px' }}/>
        <Btn size="s" variant="primary" icon="sparkles" disabled={busy} onClick={run}>{busy ? 'Working…' : instruction.trim() ? 'Revise' : 'Draft again'}</Btn>
        <span style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>about 3–5¢{kit.draftedAt ? ' · drafted ' + new Date(kit.draftedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</span>
      </div>
      {busy && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 8 }}>Claude is working… about 30–60 seconds.</div>}
      {error && <div style={{ fontSize: 12.5, color: 'var(--signal)', marginTop: 8 }}>Couldn’t draft: {error}</div>}
    </div>
  );
}

Object.assign(window, { BrandFoundation });
