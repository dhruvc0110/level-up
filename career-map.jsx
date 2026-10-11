// Level Up — Career map (Career profile → Map).
// Roles (newest at the top) → themes of proof → personas. Band width is the
// amount of evidence: each achievement counts 1 if it's an outcome, 0.7 in
// flight and 0.3 a responsibility, split evenly across its themes (and then
// across the personas it supports). Click any node for its evidence.
// Data comes from career-store.js (window.LU_CAREER).

const MAP_KIND_WEIGHT = { outcome: 1, inflight: 0.7, responsibility: 0.3 };
const MAP_TOP_THEMES = 12;
const MAP_OTHER = '__other__';

function personaHue(id) {
  const all = window.LU_PERSONAS || [];
  const idx = all.findIndex((p) => p.id === id);
  const hues = [250, 280, 170, 80, 30, 200];
  return idx < 0 ? 0 : idx < hues.length ? hues[idx] : Math.round((hues[hues.length - 1] + (idx - hues.length + 1) * 137.5) % 360);
}

// Pure: turns the profile into columns of nodes and weighted links.
function buildCareerMap(c, personas, showAllThemes) {
  const roles = [...c.roles].sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  const pIds = new Set(personas.map((p) => p.id));
  const totals = {};
  c.achievements.forEach((a) => {
    const w = MAP_KIND_WEIGHT[a.kind || 'outcome'] || 1;
    const th = (a.themes || []).length ? a.themes : ['untagged'];
    th.forEach((t) => { totals[t] = (totals[t] || 0) + w / th.length; });
  });
  const ranked = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);
  const shown = showAllThemes ? ranked : ranked.slice(0, MAP_TOP_THEMES);
  const themeOf = (t) => (shown.includes(t) ? t : MAP_OTHER);
  const themes = [...shown, ...(ranked.length > shown.length ? [MAP_OTHER] : [])];
  const rt = {}, tp = {};
  const parts = {}; // band key → { achievement id: its share of the band }, for highlighting subsets
  const add = (m, k, v) => { m[k] = (m[k] || 0) + v; };
  c.achievements.forEach((a) => {
    const w = MAP_KIND_WEIGHT[a.kind || 'outcome'] || 1;
    const th = (a.themes || []).length ? a.themes : ['untagged'];
    const ps = (a.personas || []).filter((id) => pIds.has(id));
    th.forEach((t) => {
      const share = w / th.length, tk = themeOf(t);
      const rk = a.roleId + '|' + tk;
      add(rt, rk, share);
      parts[rk] = parts[rk] || {}; add(parts[rk], a.id, share);
      ps.forEach((pid) => {
        const pk = tk + '|' + pid;
        add(tp, pk, share / ps.length);
        parts[pk] = parts[pk] || {}; add(parts[pk], a.id, share / ps.length);
      });
    });
  });
  return { roles, themes, personas, rt, tp, parts, otherCount: ranked.length - shown.length };
}

// Which achievements sit behind a node (for the side panel and highlighting).
function mapAchievements(c, sel, data) {
  if (!sel) return [];
  const shown = data.themes.filter((t) => t !== MAP_OTHER);
  const inTheme = (a, t) => {
    const th = (a.themes || []).length ? a.themes : ['untagged'];
    return t === MAP_OTHER ? th.some((x) => !shown.includes(x)) : th.includes(t);
  };
  if (sel.type === 'role') return c.achievements.filter((a) => a.roleId === sel.id);
  if (sel.type === 'theme') return c.achievements.filter((a) => inTheme(a, sel.id));
  if (sel.type === 'persona') return c.achievements.filter((a) => (a.personas || []).includes(sel.id));
  return [];
}

function CareerMap({ onEditRoles }) {
  useCareerTick();
  const L = window.LU_CAREER;
  const c = L.data();
  const [lens, setLens] = React.useState(null);       // persona id, or null for the whole career
  const [sel, setSel] = React.useState(null);         // { type: 'role'|'theme'|'persona', id }
  const [hover, setHover] = React.useState(null);
  const [allThemes, setAllThemes] = React.useState(false);
  const [linking, setLinking] = React.useState(null);
  const [linkErr, setLinkErr] = React.useState(null);
  const boxRef = React.useRef(null);
  const [boxW, setBoxW] = React.useState(0);
  React.useEffect(() => {
    const el = boxRef.current; if (!el) return;
    const measure = () => setBoxW(el.clientWidth - 8);
    measure();
    const ro = window.ResizeObserver ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el); else window.addEventListener('resize', measure);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', measure); };
  }, [c.roles.length > 0]);
  const personas = (window.LU_PERSONAS || []).filter((p) => !p.retired);
  const data = buildCareerMap(c, personas, allThemes);

  if (!c.roles.length) {
    return <div style={{ ...cpBox, padding: 28, color: 'var(--ink-3)', fontSize: 14 }}>Your map appears once your profile has roles. Add a resume or your LinkedIn profile above.</div>;
  }

  // ── Layout ──────────────────────────────────────────────────────────
  // Drawn at the real width of the box, so text stays at its normal size.
  const W = Math.max(720, Math.round(boxW || 900)), NODE = 10, GAP = 6, TOP = 28;
  const X = { role: Math.round(Math.min(240, W * 0.29)), persona: Math.round(W - Math.min(190, W * 0.21)) };
  X.theme = Math.round(X.role + (X.persona - X.role) * 0.42);
  const sumBy = (m, test) => Object.entries(m).reduce((s, [k, v]) => (test(k) ? s + v : s), 0);
  const roleW = data.roles.map((r) => sumBy(data.rt, (k) => k.startsWith(r.id + '|')));
  const themeIn = data.themes.map((t) => sumBy(data.rt, (k) => k.endsWith('|' + t)));
  const themeOut = data.themes.map((t) => sumBy(data.tp, (k) => k.startsWith(t + '|')));
  const persW = data.personas.map((p) => sumBy(data.tp, (k) => k.endsWith('|' + p.id)));
  const themeW = data.themes.map((_, i) => Math.max(themeIn[i], themeOut[i]));
  const colH = (ws) => ws.reduce((s, w) => s + w, 0);
  // Minimum heights leave room for the labels (two lines for roles and personas).
  const MIN = { role: 30, theme: 16, persona: 30 };
  const k = 380 / Math.max(1, colH(roleW), colH(themeW), colH(persW));
  const stack = (ws, minH) => { let y = TOP; return ws.map((w) => { const h = Math.max(minH, w * k); const n = { y, h }; y += h + GAP; return n; }); };
  const RN = stack(roleW, MIN.role), TN = stack(themeW, MIN.theme), PN = stack(persW, MIN.persona);
  const H = Math.max(...[RN, TN, PN].map((col) => col.length ? col[col.length - 1].y + col[col.length - 1].h : 0)) + 12;
  const fit = (px) => Math.max(10, Math.floor(px / 6.6)); // characters that fit in px at 12.5px text
  const LEN = { role: fit(X.role - 14), roleSub: fit((X.role - 14) * 1.1), theme: fit(X.persona - X.theme - 34), persona: fit(W - X.persona - 20) };

  // Bands, stacked in node order on each side.
  const bands = [];
  const roleOff = RN.map(() => 0), tInOff = TN.map(() => 0), tOutOff = TN.map(() => 0), pOff = PN.map(() => 0);
  data.roles.forEach((r, i) => data.themes.forEach((t, j) => {
    const v = data.rt[r.id + '|' + t]; if (!v) return;
    const w = v * k;
    bands.push({ from: { type: 'role', id: r.id }, to: { type: 'theme', id: t }, x1: X.role + NODE, y1: RN[i].y + roleOff[i], x2: X.theme, y2: TN[j].y + tInOff[j], w, key: r.id + '|' + t });
    roleOff[i] += w; tInOff[j] += w;
  }));
  data.themes.forEach((t, j) => data.personas.forEach((p, m) => {
    const v = data.tp[t + '|' + p.id]; if (!v) return;
    const w = v * k;
    bands.push({ from: { type: 'theme', id: t }, to: { type: 'persona', id: p.id }, x1: X.theme + NODE, y1: TN[j].y + tOutOff[j], x2: X.persona, y2: PN[m].y + pOff[m], w, persona: p.id, key: t + '|' + p.id });
    tOutOff[j] += w; pOff[m] += w;
  }));

  // ── Highlighting: the lens persona, else the hovered/selected node ─────
  // Each node's achievements are worked out once per render.
  const sets = new Map();
  const setOf = (node) => {
    const key = node.type + ':' + node.id;
    if (!sets.has(key)) sets.set(key, new Set(mapAchievements(c, node, data).map((a) => a.id)));
    return sets.get(key);
  };
  const focus = hover || sel;
  // What to highlight: the lens persona's achievements, else the hovered/selected node's.
  const hl = lens ? setOf({ type: 'persona', id: lens }) : focus ? setOf(focus) : null;
  const hlPersona = lens || (focus && focus.type === 'persona' ? focus.id : null);
  const shownThemes = data.themes.filter((t) => t !== MAP_OTHER);
  // The part of a band made of highlighted achievements (persona bands of other personas don't count).
  const bandShare = (b) => {
    if (!hl) return null;
    if (b.persona && hlPersona) return b.persona === hlPersona ? b.w : 0;
    let v = 0; const pt = data.parts[b.key] || {};
    for (const id in pt) if (hl.has(id)) v += pt[id];
    return v * k;
  };
  const nodeOn = (node) => {
    if (!hl) return true;
    if (node.type === 'persona' && hlPersona) return node.id === hlPersona;
    if (focus && !lens && node.type === focus.type && node.id === focus.id) return true;
    for (const id of setOf(node)) if (hl.has(id)) return true;
    return false;
  };

  const label = (t) => (t === MAP_OTHER ? `Other themes (${data.otherCount})` : t);
  const runLink = async () => {
    setLinkErr(null); setLinking('Starting…');
    try {
      const r = await L.linkExpertise((msg) => setLinking(msg));
      window.LU_CORE.pill(`Expertise linked: ${r.themed} items matched to themes, across ${r.personas} personas`);
    } catch (e) { setLinkErr('Couldn’t link expertise: ' + (e.message || e)); }
    finally { setLinking(null); }
  };
  const pLabel = (p) => `${p.code} ${p.name}`;
  // A persona on the map works like its button above: show its subset.
  const pick = (node) => {
    if (node.type === 'persona') { const off = lens === node.id; setLens(off ? null : node.id); setSel(off ? null : node); return; }
    setSel(sel && sel.type === node.type && sel.id === node.id ? null : node);
  };

  const path = (b) => {
    const mx = (b.x1 + b.x2) / 2;
    return `M${b.x1},${b.y1} C${mx},${b.y1} ${mx},${b.y2} ${b.x2},${b.y2} L${b.x2},${b.y2 + b.w} C${mx},${b.y2 + b.w} ${mx},${b.y1 + b.w} ${b.x1},${b.y1 + b.w} Z`;
  };
  const Node = ({ node, x, n, children, anchor, tip }) => {
    const on = nodeOn(node);
    const isSel = sel && sel.type === node.type && sel.id === node.id;
    return (
      <g style={{ cursor: 'pointer' }} opacity={on ? 1 : 0.3}
        onMouseEnter={() => setHover(node)} onMouseLeave={() => setHover(null)} onClick={() => pick(node)}>
        {tip && <title>{tip}</title>}
        <rect x={x} y={n.y} width={NODE} height={n.h} rx={2}
          fill={node.type === 'persona' ? `oklch(68% 0.11 ${personaHue(node.id)})` : node.id === MAP_OTHER ? 'var(--ink-4)' : 'var(--ink-2)'}
          stroke={isSel ? 'var(--ink-1)' : 'none'} strokeWidth={isSel ? 2 : 0}/>
        <rect x={anchor === 'end' ? x - 220 : x + NODE} y={n.y - 2} width={220} height={Math.max(n.h + 4, 30)} fill="transparent"/>
        {children}
      </g>
    );
  };
  const txt = { fontFamily: 'var(--sans)', fontSize: 12.5, fill: 'var(--ink-1)' };
  const sub = { fontFamily: 'var(--sans)', fontSize: 11, fill: 'var(--ink-3)' };
  const halo = { paintOrder: 'stroke', stroke: 'var(--bg-1)', strokeWidth: 4, strokeLinejoin: 'round' };
  const trim = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');

  return (
    <div>
      {/* Lens: whole career, or one persona's subset */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 12 }}>
        <span style={{ ...cpMono, marginRight: 4 }}>View</span>
        {[{ id: null, label: 'Whole career' }, ...personas.map((p) => ({ id: p.id, label: pLabel(p) }))].map((o) => {
          const on = lens === o.id;
          return (
            <button key={o.id || 'all'} onClick={() => { setLens(o.id); setSel(o.id ? { type: 'persona', id: o.id } : null); }} style={{
              appearance: 'none', cursor: 'pointer', fontSize: 12, padding: '4px 10px', borderRadius: 14,
              border: '1px solid ' + (on ? 'var(--ink-2)' : 'var(--line-2)'), background: on ? 'var(--bg-3)' : 'transparent', color: on ? 'var(--ink-1)' : 'var(--ink-3)',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              {o.id && <span style={{ width: 7, height: 7, borderRadius: '50%', background: `oklch(68% 0.11 ${personaHue(o.id)})` }}/>}
              {o.label}
            </button>
          );
        })}
      </div>

      {(c.expertise || []).length > 0 && !c.expertiseLinkedAt && (
        <div style={{ ...cpBox, padding: '10px 14px', marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-2)', flex: '1 1 300px' }}>Your {c.expertise.length} expertise items aren't connected to themes and personas yet, so the panels below can't show them.</span>
          <Btn variant="outline" size="s" icon="spark" disabled={!!linking} onClick={() => runLink()}>Link expertise (about 1¢)</Btn>
        </div>
      )}
      {(linking || linkErr) && <div style={{ fontSize: 12.5, color: linkErr ? 'var(--signal)' : 'var(--ink-3)', margin: '-4px 2px 10px' }}>{linkErr || linking}</div>}
      <div ref={boxRef} style={{ ...cpBox, padding: '8px 4px', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block' }} role="img" aria-label="Career map: roles, themes of proof and personas">
          <text x={X.role + NODE} y={14} textAnchor="end" style={{ ...sub, ...cpMonoSvg }}>ROLES</text>
          <text x={X.theme} y={14} style={{ ...sub, ...cpMonoSvg }}>THEMES OF PROOF</text>
          <text x={X.persona} y={14} style={{ ...sub, ...cpMonoSvg }}>PERSONAS</text>
          {bands.map((b, i) => {
            const tint = b.persona ? `oklch(68% 0.11 ${personaHue(b.persona)})` : 'var(--ink-3)';
            const share = bandShare(b);
            if (share === null) return <path key={i} d={path(b)} fill={tint} fillOpacity={0.22}/>;
            const color = hlPersona ? `oklch(68% 0.11 ${personaHue(hlPersona)})` : 'var(--ink-2)';
            return (
              <g key={i}>
                <path d={path(b)} fill={tint} fillOpacity={0.06}/>
                {share > 0.3 && <path d={path({ ...b, w: share })} fill={color} fillOpacity={0.55}/>}
              </g>
            );
          })}
          {data.roles.map((r, i) => (
            <Node key={r.id} node={{ type: 'role', id: r.id }} x={X.role} n={RN[i]} anchor="end" tip={`${r.title} · ${r.company} · ${fmtDate(r.start)}–${fmtDate(r.end)}`}>
              <text x={X.role - 8} y={RN[i].y + 11} textAnchor="end" style={txt}>{trim(r.title, LEN.role)}</text>
              <text x={X.role - 8} y={RN[i].y + 25} textAnchor="end" style={sub}>{trim(`${r.company} · ${fmtDate(r.start)}–${fmtDate(r.end)}`, LEN.roleSub)}</text>
            </Node>
          ))}
          {data.themes.map((t, j) => (
            <Node key={t} node={{ type: 'theme', id: t }} x={X.theme} n={TN[j]} tip={label(t)}>
              <text x={X.theme + NODE + 6} y={TN[j].y + 11} style={{ ...txt, ...halo }}>{trim(label(t), LEN.theme)}</text>
            </Node>
          ))}
          {data.personas.map((p, m) => (
            <Node key={p.id} node={{ type: 'persona', id: p.id }} x={X.persona} n={PN[m]} tip={pLabel(p)}>
              <text x={X.persona + NODE + 8} y={PN[m].y + 11} style={txt}>{trim(pLabel(p), LEN.persona)}</text>
              <text x={X.persona + NODE + 8} y={PN[m].y + 25} style={sub}>{c.achievements.filter((a) => (a.personas || []).includes(p.id)).length} achievements</text>
            </Node>
          ))}
        </svg>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', margin: '8px 2px 16px', fontSize: 12, color: 'var(--ink-3)' }}>
        <span>Band width = evidence (outcomes count most). Click any role, theme or persona to see what's behind it.</span>
        {(data.otherCount > 0 || allThemes) && <button style={cpLink} onClick={() => setAllThemes(!allThemes)}>{allThemes ? `Show top ${MAP_TOP_THEMES} themes` : `Show all ${shownThemes.length + data.otherCount} themes`}</button>}
        {c.expertiseLinkedAt && <button style={cpLink} disabled={!!linking} onClick={() => runLink()} title="Re-match expertise to themes and personas, e.g. after adding expertise">Re-link expertise</button>}
      </div>

      {sel && sel.type !== 'persona'
        ? <MapPanel c={c} sel={sel} data={data} label={label} onClose={() => setSel(lens ? { type: 'persona', id: lens } : null)} onEditRoles={onEditRoles}/>
        : lens ? <PersonaLens c={c} persona={personas.find((p) => p.id === lens)} sel={{ type: 'persona', id: lens }} data={data} label={label} onClose={() => { setLens(null); setSel(null); }}/>
        : sel && <MapPanel c={c} sel={sel} data={data} label={label} onClose={() => setSel(null)} onEditRoles={onEditRoles}/>}
    </div>
  );
}
const cpMonoSvg = { fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.06em' };

// ── Evidence behind the selected node ──────────────────────────────────
function MapPanel({ c, sel, data, label, onClose, onEditRoles }) {
  const list = mapAchievements(c, sel, data);
  const shownThemes = data.themes.filter((t) => t !== MAP_OTHER);
  const expertise = (c.expertise || []).filter((x) => {
    if (sel.type === 'persona') return (x.personas || []).includes(sel.id);
    if (sel.type === 'theme') return sel.id === MAP_OTHER ? (x.themes || []).some((t) => !shownThemes.includes(t)) : (x.themes || []).includes(sel.id);
    return false;
  }).sort((a, b) => (b.level || 0) - (a.level || 0));
  const active = (window.LU_PERSONAS || []).filter((p) => !p.retired);
  const togglePersona = (a, pid) => {
    const has = (a.personas || []).includes(pid);
    const next = has ? a.personas.filter((x) => x !== pid) : [...(a.personas || []), pid];
    const L = window.LU_CAREER;
    if (L.setPersonaTags) L.setPersonaTags('achievements', a.id, next); else L.update('achievements', a.id, { personas: next });
  };
  const roleOf = (a) => c.roles.find((r) => r.id === a.roleId) || {};
  const KIND = { outcome: 0, inflight: 1, responsibility: 2 };
  const sorted = [...list].sort((a, b) => (KIND[a.kind || 'outcome'] - KIND[b.kind || 'outcome']) || ((b.metrics || []).length - (a.metrics || []).length) || sortKey(roleOf(b)).localeCompare(sortKey(roleOf(a))));
  let title, subtitle;
  if (sel.type === 'role') {
    const r = c.roles.find((x) => x.id === sel.id) || {};
    title = `${r.title || 'Role'}`;
    const scope = r.scope || {};
    subtitle = [r.company, `${fmtDate(r.start)} – ${fmtDate(r.end)}`, scope.pnl && 'P&L ' + scope.pnl, scope.team && 'Team ' + scope.team].filter(Boolean).join(' · ');
  } else if (sel.type === 'theme') {
    title = label(sel.id);
    const roles = new Set(list.map((a) => a.roleId));
    subtitle = `${list.length} achievement${list.length === 1 ? '' : 's'} across ${roles.size} role${roles.size === 1 ? '' : 's'}`;
  } else {
    const p = (window.LU_PERSONAS || []).find((x) => x.id === sel.id) || {};
    title = `${p.code || ''} ${p.name || ''}`;
    const st = window.LU_CAREER.linkStatus ? window.LU_CAREER.linkStatus(p) : { linked: true, current: true };
    subtitle = `${list.length} achievement${list.length === 1 ? '' : 's'} linked` + (st.linked && !st.current ? ' · persona changed since its proof was linked' : '');
  }
  const outcomes = sorted.filter((a) => (a.kind || 'outcome') === 'outcome').length;
  const withNum = sorted.filter((a) => (a.kind || 'outcome') === 'outcome' && (a.metrics || []).length).length;
  return (
    <div style={{ ...cpBox, padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <div>
          <div style={cpMono}>{{ role: 'Role', theme: 'Theme', persona: 'Persona' }[sel.type]}</div>
          <div className="serif" style={{ fontSize: 20, color: 'var(--ink-1)', marginTop: 2 }}>{title}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>{subtitle}{outcomes ? ` · ${withNum} of ${outcomes} outcomes have a number` : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {sel.type === 'role' && onEditRoles && <button style={cpLink} onClick={onEditRoles}>Edit in Experience</button>}
          <button style={cpLink} onClick={onClose}>Close</button>
        </div>
      </div>
      {expertise.length > 0 && (
        <div style={{ margin: '12px 0 4px' }}>
          <div style={{ ...cpMono, marginBottom: 6 }}>Expertise ({expertise.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {expertise.map((x) => (
              <span key={x.id} title={(EXPERTISE_LABELS[x.type] || x.type) + (x.level ? ' · ' + x.level + ' of 5' : '')} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 12, fontSize: 12, border: '1px solid var(--line-2)', color: 'var(--ink-1)' }}>{x.name}<Level n={x.level}/></span>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginTop: 10 }}>
        {sorted.length > 0 && <div style={{ ...cpMono, margin: '10px 0 2px' }}>Achievements ({sorted.length}) · click a persona code to add or remove the link</div>}
        {sorted.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-3)', padding: '8px 0' }}>{sel.type === 'role' ? 'No achievements for this role yet. Add some in Experience.' : 'Nothing linked yet.'}</div>}
        {sorted.map((a) => {
          const r = roleOf(a);
          return (
            <div key={a.id} style={{ padding: '8px 0', borderTop: '1px solid var(--line-1)' }}>
              <div style={{ fontSize: 13.5, color: (a.kind || 'outcome') === 'responsibility' ? 'var(--ink-2)' : 'var(--ink-1)', lineHeight: 1.5 }}>
                {a.kind && a.kind !== 'outcome' && <span style={{ ...cpMono, marginRight: 8 }}>{a.kind === 'inflight' ? 'In flight' : 'Responsibility'}</span>}
                {a.text}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
                <Chips items={(a.metrics || []).map((m) => m.value)} mono/>
                {sel.type !== 'role' && <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{r.title} · {r.company}</span>}
                <span style={{ display: 'inline-flex', gap: 3, marginLeft: 'auto' }}>
                  {active.map((p) => {
                    const on = (a.personas || []).includes(p.id);
                    return (
                      <button key={p.id} onClick={() => togglePersona(a, p.id)} title={(on ? 'Unlink from ' : 'Link to ') + p.code + ' ' + p.name}
                        style={{ appearance: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, padding: '1px 5px', borderRadius: 3,
                          border: '1px solid ' + (on ? `oklch(68% 0.11 ${personaHue(p.id)})` : 'var(--line-2)'),
                          background: on ? `oklch(68% 0.11 ${personaHue(p.id)} / 0.25)` : 'transparent', color: on ? 'var(--ink-1)' : 'var(--ink-4)' }}>{p.code}</button>
                    );
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Persona lens: strength, best proof, requirements and gaps ──────────
function PersonaLens({ c, persona, sel, data, label, onClose }) {
  const L = window.LU_CAREER;
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const [showAll, setShowAll] = React.useState(false);
  if (!persona) return null;
  const lens = L.lensFor ? L.lensFor(persona) : null;
  const r = lens && lens.result;
  const ach = c.achievements.filter((a) => (a.personas || []).includes(persona.id));
  const exp = (c.expertise || []).filter((x) => (x.personas || []).includes(persona.id)).sort((a, b) => (b.level || 0) - (a.level || 0));
  const outcomes = ach.filter((a) => (a.kind || 'outcome') === 'outcome');
  const withNum = outcomes.filter((a) => (a.metrics || []).length).length;
  const roleOf = (a) => c.roles.find((x) => x.id === a.roleId) || {};
  const latest = [...ach].sort((a, b) => sortKey(roleOf(b)).localeCompare(sortKey(roleOf(a))))[0];
  const color = `oklch(68% 0.11 ${personaHue(persona.id)})`;
  const run = async () => {
    setBusy(true); setErr(null);
    try { await L.assessPersona(persona); } catch (e) { setErr(e.message || String(e)); } finally { setBusy(false); }
  };
  const byId = (id) => c.achievements.find((a) => a.id === id);
  const best = r ? r.best.map(byId).filter(Boolean) : [];
  const fallbackBest = [...outcomes].sort((a, b) => ((b.metrics || []).length - (a.metrics || []).length) || sortKey(roleOf(b)).localeCompare(sortKey(roleOf(a)))).slice(0, 6);
  const STATUS = { covered: ['✓', 'oklch(62% 0.12 150)', 'Covered'], partial: ['◐', 'oklch(70% 0.12 75)', 'Partly covered'], gap: ['▲', 'var(--signal)', 'Gap'] };
  const stat = (k, v) => <div style={{ flex: '1 1 120px' }}><div style={cpMono}>{k}</div><div className="serif" style={{ fontSize: 20, color: 'var(--ink-1)' }}>{v}</div></div>;
  const proofRow = (a) => (
    <div key={a.id} style={{ padding: '7px 0', borderTop: '1px solid var(--line-1)' }}>
      <div style={{ fontSize: 13.5, color: 'var(--ink-1)', lineHeight: 1.5 }}>{a.text}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 3 }}>
        <Chips items={(a.metrics || []).map((m) => m.value)} mono/>
        <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{roleOf(a).title} · {roleOf(a).company} · {fmtDate(roleOf(a).start)}–{fmtDate(roleOf(a).end)}</span>
      </div>
    </div>
  );
  return (
    <div style={{ ...cpBox, padding: '16px 18px', borderTop: '3px solid ' + color }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px' }}>
          <div style={cpMono}>Persona lens</div>
          <div className="serif" style={{ fontSize: 21, color: 'var(--ink-1)', marginTop: 2 }}>{persona.code} {persona.name}</div>
          {r && (
            <div style={{ marginTop: 6, display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span style={{ letterSpacing: 2, fontSize: 13, color }}>{'●'.repeat(r.strength)}<span style={{ color: 'var(--ink-4)' }}>{'○'.repeat(5 - r.strength)}</span></span>
              <span style={{ fontSize: 14, color: 'var(--ink-1)' }}>{r.label}</span>
            </div>
          )}
          {r && r.verdict && <div className="serif-italic" style={{ fontSize: 14.5, color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.5 }}>{r.verdict}</div>}
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {r && <button style={cpLink} disabled={busy} onClick={run}>{busy ? 'Assessing…' : 'Refresh'}</button>}
          <button style={cpLink} onClick={onClose}>Close</button>
        </div>
      </div>
      {lens && lens.stale && !busy && (
        <div style={{ marginTop: 10, padding: '8px 10px', border: '1px dashed var(--line-2)', borderRadius: 3, fontSize: 12.5, color: 'var(--ink-2)' }}>
          {lens.stale === 'persona' ? 'This persona has changed since it was assessed.' : 'Your profile has changed since this was assessed.'} <button style={cpLink} onClick={run}>Refresh (about 2¢)</button>
        </div>
      )}
      {!r && (
        <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Btn variant="outline" size="s" icon="spark" disabled={busy || !ach.length} onClick={run}>{busy ? 'Assessing…' : 'Assess strength and gaps (about 2¢)'}</Btn>
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{ach.length ? 'Claude reads the proof linked to this persona and compares it with the persona’s skills, sectors and company size.' : 'Nothing is linked to this persona yet.'}</span>
        </div>
      )}
      {err && <div style={{ fontSize: 12.5, color: 'var(--signal)', marginTop: 8 }}>Couldn’t assess: {err}</div>}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '14px 0 4px' }}>
        {stat('Achievements', ach.length)}
        {stat('Outcomes with numbers', outcomes.length ? `${withNum} of ${outcomes.length}` : '—')}
        {stat('Expertise', exp.length)}
        {stat('Latest proof', latest ? fmtDate(roleOf(latest).end) || fmtDate(roleOf(latest).start) : '—')}
      </div>

      {r && r.gaps.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ ...cpMono, marginBottom: 4 }}>Gaps to close</div>
          {r.gaps.map((g, i) => (
            <div key={i} style={{ padding: '7px 0', borderTop: '1px solid var(--line-1)', fontSize: 13.5 }}>
              <div style={{ color: 'var(--ink-1)' }}><span style={{ color: 'var(--signal)', marginRight: 6 }}>▲</span>{g.gap}</div>
              {g.why && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2, paddingLeft: 18 }}>{g.why}</div>}
              {g.fix && <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2, paddingLeft: 18 }}>Next step: {g.fix}</div>}
            </div>
          ))}
        </div>
      )}

      {r && r.requirements.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ ...cpMono, marginBottom: 4 }}>What this persona asks for</div>
          {r.requirements.map((q, i) => {
            const [icon, col, word] = STATUS[q.status];
            return (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '5px 0', borderTop: '1px solid var(--line-1)', fontSize: 13.5 }}>
                <span title={word} style={{ color: col, width: 14 }}>{icon}</span>
                <span style={{ color: 'var(--ink-1)', flex: '0 0 auto' }}>{q.item}</span>
                <span style={{ fontSize: 12.5, color: 'var(--ink-3)', flex: 1 }}>{q.note}{q.evidence.length ? ` · ${q.evidence.length} piece${q.evidence.length === 1 ? '' : 's'} of proof` : ''}</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <div style={{ ...cpMono, marginBottom: 2 }}>{r ? 'Best proof' : 'Strongest outcomes (by numbers and recency)'}</div>
        {(best.length ? best : fallbackBest).map(proofRow)}
        {!(best.length ? best : fallbackBest).length && <div style={{ fontSize: 13, color: 'var(--ink-3)', padding: '6px 0' }}>No outcomes linked yet.</div>}
      </div>

      {exp.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ ...cpMono, marginBottom: 6 }}>Supporting expertise ({exp.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {exp.map((x) => <span key={x.id} title={EXPERTISE_LABELS[x.type] || x.type} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 12, fontSize: 12, border: '1px solid var(--line-2)', color: 'var(--ink-1)' }}>{x.name}<Level n={x.level}/></span>)}
          </div>
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-3)' }}>
        Measured against this persona's positioning, skills, sectors and company size: edit them in Personas to change what it's measured against.
        {lens && <> Assessed {new Date(lens.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.</>}
        {' '}<button style={cpLink} onClick={() => setShowAll(!showAll)}>{showAll ? 'Hide' : `Show all ${ach.length} linked achievements`}</button>
      </div>
      {showAll && <div style={{ marginTop: 10 }}><MapPanel c={c} sel={sel} data={data} label={label} onClose={() => setShowAll(false)}/></div>}
    </div>
  );
}

Object.assign(window, { CareerMap, buildCareerMap });
