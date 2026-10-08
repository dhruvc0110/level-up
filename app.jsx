// Level Up — root app with sidebar nav, tweaks, and history-aware navigation.
//
// All view/panel/modal transitions go through pushNav() which both updates
// React state AND pushes a history entry. popstate listens for back-gesture /
// back-button and restores the previous nav state. This gives Android (and
// desktop browsers) the natural back behavior: close modal → close panel →
// previous view, instead of dropping out to login.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "aesthetic": "quiet",
  "density": "regular",
  "personaChip": false,
  "stagePalette": "quiet"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // ── Navigation state (history-tracked) ────────────────────────────────
  const [view, _setView] = React.useState('pipeline');
  const [openOppId, _setOpenOppId] = React.useState(null);
  const [addOpen, _setAddOpen] = React.useState(false);
  // We track the curator by persona ID (or 'new' for "creating fresh"),
  // not the full persona object, so the value is serialisable into
  // history.state and survives a back/forward.
  const [curatorPersonaId, _setCuratorPersonaId] = React.useState(null);

  // ── Data state (not history-tracked) ──────────────────────────────────
  const [opportunities, setOpportunities] = React.useState(window.LU_OPPORTUNITIES);
  const [personas, setPersonas] = React.useState(window.LU_PERSONAS);

  // Keep the Pipeline in sync when data changes elsewhere (e.g. accepting an
  // Inbox email creates an opportunity outside this component).
  React.useEffect(() => {
    const onChange = () => setOpportunities([...window.LU_OPPORTUNITIES]);
    window.addEventListener('lu:opportunities-changed', onChange);
    return () => window.removeEventListener('lu:opportunities-changed', onChange);
  }, []);

  // LinkedIn enrichment of an accepted job opens that opportunity.
  React.useEffect(() => {
    const onOpen = (e) => pushNav({ view: 'pipeline', openOppId: e.detail, addOpen: false, curatorPersonaId: null });
    window.addEventListener('lu:open-opp', onOpen);
    return () => window.removeEventListener('lu:open-opp', onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply aesthetic tweak via CSS class on body
  React.useEffect(() => {
    document.body.dataset.aesthetic = t.aesthetic;
    document.body.dataset.density = t.density;
    document.body.dataset.personaChip = t.personaChip ? '1' : '0';
  }, [t.aesthetic, t.density, t.personaChip]);

  // Build a live snapshot of nav so pushNav can read it without stale closures
  const navSnapshot = { view, openOppId, addOpen, curatorPersonaId };
  const navRef = React.useRef(navSnapshot);
  navRef.current = navSnapshot;

  function applyNav(next) {
    _setView(next.view || 'pipeline');
    _setOpenOppId(next.openOppId || null);
    _setAddOpen(!!next.addOpen);
    _setCuratorPersonaId(next.curatorPersonaId || null);
  }

  function pushNav(partial) {
    const next = { ...navRef.current, ...partial };
    window.history.pushState({ lu: next }, '', hashForNav(next));
    applyNav(next);
  }

  function replaceNav(partial) {
    const next = { ...navRef.current, ...partial };
    window.history.replaceState({ lu: next }, '', hashForNav(next));
    applyNav(next);
  }

  // popstate: restore state from history WITHOUT re-pushing
  React.useEffect(() => {
    const onPop = (e) => {
      const next = (e.state && e.state.lu) || parseHashAsNav() || { view: 'pipeline' };
      applyNav(next);
    };
    window.addEventListener('popstate', onPop);

    // Initialize: parse any existing hash, replace the current history entry
    // so back-gesture from this entry exits the PWA (rather than going to login).
    const initial = parseHashAsNav() || { view: 'pipeline' };
    applyNav(initial);
    window.history.replaceState({ lu: initial }, '', hashForNav(initial));

    // Demo hash handlers — for the Handoff.html iframe deep-links.
    // These run as additional pushes after init so they show up as their
    // own history entries (back works as expected).
    const hash = window.location.hash.slice(1);
    const parts = hash.split('&').reduce((acc, p) => {
      const [k, v] = p.split('=');
      acc[k] = v == null ? true : v;
      return acc;
    }, {});
    if (parts.aesthetic) setTweak('aesthetic', parts.aesthetic);
    if (parts.demo === 'detail') {
      setTimeout(() => pushNav({ view: 'pipeline', openOppId: parts.opp || 'op-20' }), 350);
    } else if (parts.demo === 'curator') {
      setTimeout(() => pushNav({ view: 'personas', curatorPersonaId: 'new' }), 350);
    } else if (parts.demo === 'add') {
      setTimeout(() => pushNav({ addOpen: true }), 200);
    } else if (parts.demo === 'formats') {
      setTimeout(() => pushNav({ view: 'brand' }), 100);
    }

    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve curatorPersona object from the tracked ID
  const curatorPersona = curatorPersonaId === 'new'
    ? {}
    : curatorPersonaId
      ? (personas.find(p => p.id === curatorPersonaId) || null)
      : null;

  const openOpp = opportunities.find(o => o.id === openOppId) || null;

  // ── Public navigation handlers passed to children ─────────────────────
  // Each one pushes ONE history entry. Children call these instead of
  // touching state directly so back-gesture behavior stays consistent.
  const navToView = (v) => pushNav({ view: v, openOppId: null, addOpen: false, curatorPersonaId: null });
  const navOpenOpp = (id) => pushNav({ openOppId: id });
  const navCloseOpp = () => pushNav({ openOppId: null });
  const navOpenAdd = () => pushNav({ addOpen: true });
  const navCloseAdd = () => pushNav({ addOpen: false });
  const navOpenCurator = (persona) => pushNav({
    curatorPersonaId: persona && persona.id ? persona.id : 'new',
  });
  const navCloseCurator = () => pushNav({ curatorPersonaId: null });

  // ── Data CRUD handlers (unchanged behavior; now use navigation helpers) ─
  const updateOpp = (next) => {
    setOpportunities(arr => arr.map(o => o.id === next.id ? next : o));
    LU_API.put('/api/opportunities/' + next.id, next)
      .catch(e => console.error('[Level Up] updateOpp failed:', e));
  };
  const addOpp = (newOpp) => {
    setOpportunities(arr => [newOpp, ...arr]);
    // Close Add modal + open the new opp's detail panel in one history entry
    pushNav({ openOppId: newOpp.id, addOpen: false });
    LU_API.put('/api/opportunities/' + newOpp.id, newOpp)
      .catch(e => console.error('[Level Up] addOpp failed:', e));
  };
  const deleteOpp = (id) => {
    setOpportunities(arr => arr.filter(o => o.id !== id));
    pushNav({ openOppId: null });
    LU_API.delete('/api/opportunities/' + id)
      .catch(e => console.error('[Level Up] deleteOpp failed:', e));
  };
  const savePersona = (p) => {
    setPersonas(arr => {
      const exists = arr.find(x => x.id === p.id);
      if (exists) return arr.map(x => x.id === p.id ? { ...x, ...p } : x);
      return [...arr, p];
    });
    LU_API.put('/api/personas/' + p.id, p)
      .catch(e => console.error('[Level Up] savePersona failed:', e));
  };

  return (
    <div className="lu-shell" data-aesthetic={t.aesthetic} data-density={t.density}>
      <Sidebar view={view} onView={navToView} onAdd={navOpenAdd}
               personaChip={t.personaChip} personas={personas}/>
      <div className="lu-main">
        {view === 'dashboard' && (
          <DashboardView opportunities={opportunities}
            onOpen={navOpenOpp} onAdd={navOpenAdd}
            onNavPersonas={() => navToView('personas')}/>
        )}
        {view === 'pipeline' && (
          <PipelineView opportunities={opportunities}
            onOpen={navOpenOpp} onAdd={navOpenAdd}
            density={t.density}/>
        )}
        {view === 'inbox' && (
          <InboxView onOpenOpp={(id) => pushNav({ view: 'pipeline', openOppId: id })}
                     onNavSettings={() => navToView('settings')}/>
        )}
        {view === 'personas' && (
          <PersonasView personas={personas} opportunities={opportunities}
            onEdit={navOpenCurator}
            onAdd={() => navOpenCurator({})}
            onOpenOpp={(id) => pushNav({ view: 'pipeline', openOppId: id })}/>
        )}
        {view === 'network' && (
          <NetworkView contacts={window.LU_CONTACTS} opportunities={opportunities}
            onOpenOpp={(id) => pushNav({ view: 'pipeline', openOppId: id })}/>
        )}
        {view === 'brand' && (
          <BrandView posts={window.LU_POSTS}/>
        )}
        {view === 'settings' && (
          <SettingsView/>
        )}
      </div>

      {openOpp && (
        <DetailPanel opp={openOpp} onClose={navCloseOpp}
          onUpdate={updateOpp}
          onDelete={() => deleteOpp(openOpp.id)}/>
      )}
      {addOpen && (
        <AddOpportunityModal onClose={navCloseAdd} onSave={addOpp}/>
      )}
      {curatorPersona && (
        <PersonaCurator persona={curatorPersona} onClose={navCloseCurator}
          onSave={savePersona}/>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Aesthetic">
          <TweakSelect label="Direction" value={t.aesthetic}
            options={[
              { value: 'quiet',     label: 'Quiet luxury' },
              { value: 'editorial', label: 'Editorial war room' },
              { value: 'bloomberg', label: 'Bloomberg terminal' },
              { value: 'linear',    label: 'Linear / Pitch' },
            ]}
            onChange={(v) => setTweak('aesthetic', v)}/>
        </TweakSection>

        <TweakSection label="Density">
          <TweakRadio label="Kanban cards" value={t.density}
            options={['compact', 'regular', 'comfy']}
            onChange={(v) => setTweak('density', v)}/>
        </TweakSection>

        <TweakSection label="Shell">
          <TweakToggle label="Persona context chip in top bar"
            value={t.personaChip} onChange={(v) => setTweak('personaChip', v)}/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// ── Hash <-> nav state ────────────────────────────────────────────────────

function hashForNav(nav) {
  const parts = [];
  if (nav.view) parts.push('view=' + encodeURIComponent(nav.view));
  if (nav.openOppId) parts.push('opp=' + encodeURIComponent(nav.openOppId));
  if (nav.addOpen) parts.push('add=1');
  if (nav.curatorPersonaId) parts.push('curator=' + encodeURIComponent(nav.curatorPersonaId));
  return parts.length ? '#' + parts.join('&') : '';
}

function parseHashAsNav() {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  const parts = hash.split('&').reduce((acc, p) => {
    const [k, v] = p.split('=');
    acc[k] = v == null ? true : decodeURIComponent(v);
    return acc;
  }, {});
  // Only return if at least one nav-relevant field is present
  if (!parts.view && !parts.opp && !parts.add && !parts.curator) return null;
  return {
    view: parts.view || 'pipeline',
    openOppId: parts.opp || null,
    addOpen: !!parts.add,
    curatorPersonaId: parts.curator || null,
  };
}

// ── Sidebar ─────────────────────────────────────────────────────────────
function Sidebar({ view, onView, onAdd, personaChip, personas }) {
  const [signingOut, setSigningOut] = React.useState(false);
  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await LU_API.signOut();
  };

  return (
    <aside className="hl-r" style={{
      background: 'var(--bg-1)',
      display: 'flex', flexDirection: 'column',
      padding: '20px 0 16px',
      minWidth: 0,
    }}>
      {/* Wordmark */}
      <div style={{ padding: '0 22px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="serif" style={{
            fontSize: 22, letterSpacing: '-0.015em', color: 'var(--ink-1)',
            fontWeight: 400,
          }}>
            Level
          </span>
          <span className="serif-italic" style={{
            fontSize: 22, letterSpacing: '-0.015em', color: 'var(--ink-1)',
          }}>
            Up
          </span>
        </div>
        <div className="mono" style={{
          marginTop: 4, fontSize: 9.5, color: 'var(--ink-4)', letterSpacing: '0.14em',
        }}>
          CAREER · COMMAND CENTER
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <NavItem icon="dashboard" label="Dashboard"
          active={view === 'dashboard'} onClick={() => onView('dashboard')}/>
        <NavItem icon="pipeline" label="Pipeline"
          active={view === 'pipeline'} onClick={() => onView('pipeline')}/>
        <NavItem icon="article" label="Inbox"
          active={view === 'inbox'} onClick={() => onView('inbox')}/>
        <NavItem icon="personas" label="Personas"
          active={view === 'personas'} onClick={() => onView('personas')}/>
        <NavItem icon="network" label="Network"
          active={view === 'network'} onClick={() => onView('network')}/>
        <NavItem icon="brand" label="Brand"
          active={view === 'brand'} onClick={() => onView('brand')}/>
        <div style={{ height: 1, background: 'var(--line-1)', margin: '8px 10px' }}/>
        <NavItem icon="settings" label="Settings"
          active={view === 'settings'} onClick={() => onView('settings')}/>
      </nav>

      {/* Persona context chip (optional via Tweak) */}
      {personaChip && (
        <div style={{ padding: '20px 22px 0' }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Active context</div>
          <div style={{
            padding: '10px 12px', border: '1px solid var(--line-2)', borderRadius: 3,
            background: 'var(--bg-2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <PersonaDot personaId="cio" size={6}/>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.06em' }}>
                P-01
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-1)', fontWeight: 500 }}>
              Enterprise CIO
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1 }}/>

      {/* User + sign out */}
      <div style={{ padding: '0 14px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px',
          borderRadius: 3, transition: 'background .15s',
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'linear-gradient(140deg, #2a2a2a, #444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--line-2)',
            fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--ink-1)',
            fontStyle: 'italic', fontWeight: 400,
          }}>
            {((window.LU_USER && window.LU_USER.email) || 'T')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: 'var(--ink-1)', fontWeight: 500,
                           whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {(window.LU_USER && window.LU_USER.email) || 'Test mode'}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-4)',
                           whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {window.LU_USER && window.LU_USER.localMode ? 'This browser only' : 'Signed in with Google'}
            </div>
          </div>
          <button onClick={signOut} disabled={signingOut}
            title="Sign out"
            style={{
              appearance: 'none', background: 'transparent', border: 'none',
              padding: 6, color: 'var(--ink-3)', cursor: 'pointer', borderRadius: 3,
              display: 'flex', alignItems: 'center',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink-1)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-3)'}>
            <Icon name="arrow-right" size={14}/>
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        appearance: 'none',
        display: 'flex', alignItems: 'center', gap: 11,
        padding: '7px 10px',
        background: active ? 'var(--bg-3)' : 'transparent',
        border: 'none', borderRadius: 3,
        color: active ? 'var(--ink-1)' : 'var(--ink-2)',
        cursor: 'pointer',
        fontSize: 13, fontFamily: 'var(--sans)', fontWeight: 500, letterSpacing: '0.002em',
        transition: 'all .12s', textAlign: 'left',
        position: 'relative',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-2)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
      {active && (
        <span style={{
          position: 'absolute', left: -12, top: '50%', transform: 'translateY(-50%)',
          width: 2, height: 14, background: 'var(--ink-1)', borderRadius: 1,
        }}/>
      )}
      <Icon name={icon} size={14} stroke={1.5}/>
      {label}
    </button>
  );
}

// Wait for api.js bootstrap to populate window.LU_* from the backend
// before rendering. If bootstrap fails, api.js renders an error screen
// directly and rejects this promise — the .catch is a no-op safety net.
window.LU_INIT_PROMISE
  .then(() => {
    ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
  })
  .catch(() => { /* error UI already shown by api.js */ });
