// Level Up — Network Intelligence (Phase 2)
// Contact directory + warm path finder.

function NetworkView({ contacts, opportunities, onOpenOpp }) {
  const [filter, setFilter] = React.useState('all'); // all|strong|warm|cold|recruiter
  const [personaFilter, setPersonaFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [selectedId, setSelectedId] = React.useState(null);
  const [view, setView] = React.useState('paths'); // 'paths' | 'contact'

  const filtered = contacts.filter(c => {
    if (filter !== 'all' && c.strength !== filter) return false;
    if (personaFilter !== 'all' && !c.personas.includes(personaFilter)) return false;
    if (search && !`${c.name} ${c.company} ${c.title}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selected = contacts.find(c => c.id === selectedId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <NetworkHeader count={contacts.length}
        search={search} setSearch={setSearch}
        filter={filter} setFilter={setFilter}
        personaFilter={personaFilter} setPersonaFilter={setPersonaFilter}/>

      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
      }}>
        {/* LEFT: contact list */}
        <div style={{
          overflow: 'auto',
          borderRight: '1px solid var(--line-1)',
        }}>
          {filtered.length === 0 && <NetworkEmpty/>}
          {filtered.map(c => (
            <ContactRow key={c.id} contact={c}
              opportunities={opportunities.filter(o => c.opportunities.includes(o.id))}
              active={selectedId === c.id}
              onClick={() => { setSelectedId(c.id); setView('contact'); }}/>
          ))}
        </div>

        {/* RIGHT: warm paths OR contact detail */}
        <div style={{ overflow: 'auto', background: 'var(--bg-0)' }}>
          <div style={{
            padding: '14px 22px', borderBottom: '1px solid var(--line-1)',
            display: 'flex', gap: 4,
          }}>
            <TabPill active={view === 'paths'} onClick={() => setView('paths')}>Warm paths</TabPill>
            <TabPill active={view === 'contact'} onClick={() => setView('contact')} disabled={!selected}>
              {selected ? selected.name.split(' ')[0] : 'Contact'}
            </TabPill>
          </div>
          {view === 'paths' && (
            <WarmPathsPanel contacts={contacts} opportunities={opportunities}
              onOpenContact={(id) => { setSelectedId(id); setView('contact'); }}
              onOpenOpp={onOpenOpp}/>
          )}
          {view === 'contact' && selected && (
            <ContactDetailPanel contact={selected} opportunities={opportunities} onOpenOpp={onOpenOpp}/>
          )}
          {view === 'contact' && !selected && (
            <div style={{ padding: 28, color: 'var(--ink-3)', fontSize: 13 }}>
              Select a contact to see their detail.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NetworkHeader({ count, search, setSearch, filter, setFilter, personaFilter, setPersonaFilter }) {
  return (
    <div style={{
      padding: '20px 28px 16px',
      borderBottom: '1px solid var(--line-1)',
      flex: '0 0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h1 className="serif" style={{
            margin: 0, fontSize: 30, fontWeight: 400, letterSpacing: '-0.02em',
          }}>
            Network
          </h1>
          <div className="serif-italic" style={{
            fontSize: 14, color: 'var(--ink-3)', marginTop: 4,
          }}>
            Senior roles are won by relationships. {count} of them, tracked.
          </div>
        </div>
        <Btn variant="outline" icon="plus">New contact</Btn>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 260 }}>
          <Icon name="search" size={13} stroke={1.5} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--ink-3)', pointerEvents: 'none',
          }}/>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, company, title"
            style={{
              width: '100%', height: 30, padding: '0 10px 0 30px',
              background: 'var(--bg-1)', color: 'var(--ink-1)',
              border: '1px solid var(--line-1)', borderRadius: 3,
              fontFamily: 'var(--sans)', fontSize: 12.5, outline: 'none',
            }}/>
        </div>

        <span style={{ width: 1, height: 18, background: 'var(--line-2)' }}/>

        <FilterPills value={filter} onChange={setFilter}
          options={[
            { v: 'all',       l: 'All',       i: '·' },
            { v: 'strong',    l: 'Strong',    i: '●' },
            { v: 'warm',      l: 'Warm',      i: '◐' },
            { v: 'cold',      l: 'Cold',      i: '○' },
            { v: 'recruiter', l: 'Recruiters', i: '◇' },
          ]}/>

        <span style={{ width: 1, height: 18, background: 'var(--line-2)' }}/>

        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Persona:</span>
        <select value={personaFilter} onChange={(e) => setPersonaFilter(e.target.value)}
          style={{
            height: 26, padding: '0 8px', background: 'var(--bg-1)', color: 'var(--ink-2)',
            border: '1px solid var(--line-1)', borderRadius: 3, fontSize: 12, outline: 'none',
            fontFamily: 'var(--sans)',
          }}>
          <option value="all">Any</option>
          {window.LU_PERSONAS.map(p => (
            <option key={p.id} value={p.id}>{p.code} · {p.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function FilterPills({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {options.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)} style={{
          appearance: 'none', padding: '5px 10px',
          background: value === o.v ? 'var(--bg-3)' : 'transparent',
          color: value === o.v ? 'var(--ink-1)' : 'var(--ink-3)',
          border: '1px solid ' + (value === o.v ? 'var(--line-2)' : 'transparent'),
          borderRadius: 3, fontSize: 12, fontWeight: 500, cursor: 'pointer',
          transition: 'all .12s', letterSpacing: '0.002em',
        }}
        onMouseEnter={(e) => { if (value !== o.v) e.currentTarget.style.color = 'var(--ink-2)'; }}
        onMouseLeave={(e) => { if (value !== o.v) e.currentTarget.style.color = 'var(--ink-3)'; }}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function TabPill({ children, active, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        appearance: 'none', padding: '5px 12px',
        background: active ? 'var(--bg-3)' : 'transparent',
        color: active ? 'var(--ink-1)' : 'var(--ink-3)',
        border: '1px solid ' + (active ? 'var(--line-2)' : 'transparent'),
        borderRadius: 3, fontSize: 12, fontWeight: 500, cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1, transition: 'all .12s',
        letterSpacing: '0.002em',
      }}>
      {children}
    </button>
  );
}

// ── Contact row ────────────────────────────────────────────────────────────
function ContactRow({ contact, opportunities, active, onClick }) {
  const monogram = contact.name.split(' ').map(w => w[0]).slice(0, 2).join('');
  return (
    <button onClick={onClick}
      style={{
        appearance: 'none', textAlign: 'left',
        width: '100%',
        background: active ? 'var(--bg-3)' : 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--line-1)',
        padding: '14px 22px',
        display: 'grid',
        gridTemplateColumns: '36px 1fr auto auto',
        gap: 14, alignItems: 'center',
        cursor: 'pointer', transition: 'background .12s',
        position: 'relative',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-2)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>

      {active && (
        <span style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 2, background: 'var(--ink-1)',
        }}/>
      )}

      {/* Monogram */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: 'var(--bg-3)',
        border: '1px solid var(--line-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--serif)', fontStyle: 'italic',
        fontSize: 14, color: 'var(--ink-2)',
      }}>
        {monogram}
      </div>

      {/* Identity */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 2,
        }}>
          <span style={{
            fontSize: 14, color: 'var(--ink-1)', fontWeight: 500,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {contact.name}
          </span>
          <StrengthDot strength={contact.strength}/>
        </div>
        <div style={{
          fontSize: 12, color: 'var(--ink-3)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {contact.title} · <span style={{ color: 'var(--ink-2)' }}>{contact.company}</span>
        </div>
        {opportunities.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
            {opportunities.slice(0, 3).map(o => (
              <OppBadge key={o.id} opp={o}/>
            ))}
            {opportunities.length > 3 && (
              <span style={{ fontSize: 11, color: 'var(--ink-4)', alignSelf: 'center' }}>
                +{opportunities.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Personas */}
      <div style={{ display: 'flex', gap: 4 }}>
        {contact.personas.slice(0, 3).map(pid => (
          <PersonaDot key={pid} personaId={pid} size={6}/>
        ))}
      </div>

      {/* Last contact */}
      <div style={{ textAlign: 'right' }}>
        <div className="mono" style={{
          fontSize: 11, color: contact.lastContacted === 'never' ? 'var(--ink-4)' : 'var(--ink-2)',
          letterSpacing: '0.02em', fontVariantNumeric: 'tabular-nums',
        }}>
          {contact.lastContacted === 'never' ? 'NEVER' : contact.lastContacted.toUpperCase()}
        </div>
        <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 1 }}>
          last touch
        </div>
      </div>
    </button>
  );
}

function StrengthDot({ strength }) {
  const cfg = {
    strong:    { c: 'var(--ink-1)', l: 'Strong' },
    warm:      { c: 'var(--ink-2)', l: 'Warm' },
    cold:      { c: 'var(--ink-4)', l: 'Cold' },
    recruiter: { c: 'var(--st-evaluating)', l: 'Recruiter' },
  }[strength] || { c: 'var(--ink-4)', l: strength };
  return (
    <span title={cfg.l} style={{
      width: 6, height: 6, borderRadius: '50%', background: cfg.c,
      display: 'inline-block', flex: '0 0 auto',
    }}/>
  );
}

function OppBadge({ opp }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 10.5, color: 'var(--ink-2)',
      padding: '2px 7px', border: '1px solid var(--line-2)', borderRadius: 999,
      whiteSpace: 'nowrap',
      fontFamily: 'var(--sans)', letterSpacing: '0.005em',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: stageColor(opp.stage),
      }}/>
      {opp.company}
    </span>
  );
}

function NetworkEmpty() {
  return (
    <div style={{ padding: '48px 28px', textAlign: 'left' }}>
      <div className="serif-italic" style={{ fontSize: 18, color: 'var(--ink-2)', marginBottom: 8 }}>
        No matches.
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
        Loosen your filters, or add a contact.
      </div>
    </div>
  );
}

// ── Warm paths panel ───────────────────────────────────────────────────────
function WarmPathsPanel({ contacts, opportunities, onOpenContact, onOpenOpp }) {
  // For each opportunity, find contacts that touch it
  const paths = opportunities.map(o => ({
    opp: o,
    contacts: contacts.filter(c => c.opportunities.includes(o.id))
      .sort((a, b) => {
        const order = { strong: 0, warm: 1, recruiter: 2, cold: 3 };
        return order[a.strength] - order[b.strength];
      }),
  })).filter(p => p.contacts.length > 0)
    .sort((a, b) => b.opp.fit - a.opp.fit);

  const strongest = paths.filter(p => p.contacts.some(c => c.strength === 'strong'));
  const exposed = opportunities.filter(o => !contacts.some(c => c.opportunities.includes(o.id)));

  return (
    <div style={{ padding: '20px 24px 32px' }}>
      {/* Summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0,
        marginBottom: 22,
        border: '1px solid var(--line-1)', borderRadius: 3,
        background: 'var(--bg-1)',
      }}>
        <PathStat label="With warm path" value={strongest.length}/>
        <PathStat label="With any contact" value={paths.length} divider/>
        <PathStat label="No path" value={exposed.length} divider signal={exposed.length > 0}/>
      </div>

      {/* Path list — top opportunities */}
      <div className="eyebrow" style={{ marginBottom: 12 }}>
        Top opportunities · paths in
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {paths.slice(0, 8).map(p => (
          <PathRow key={p.opp.id} opp={p.opp} contacts={p.contacts}
            onOpenContact={onOpenContact} onOpenOpp={onOpenOpp}/>
        ))}
      </div>

      {exposed.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginTop: 28, marginBottom: 12, color: 'var(--signal)' }}>
            Exposed · no warm path
          </div>
          <div style={{
            border: '1px dashed var(--line-2)', borderRadius: 3,
            padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 0,
          }}>
            {exposed.slice(0, 5).map((o, i) => (
              <button key={o.id} onClick={() => onOpenOpp(o.id)} style={{
                appearance: 'none', background: 'transparent', border: 'none', textAlign: 'left',
                padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--line-1)',
                display: 'grid', gridTemplateColumns: '1fr auto', gap: 10,
                alignItems: 'center', cursor: 'pointer',
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-1)' }}>
                    {o.company}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>
                    {o.role}
                  </div>
                </div>
                <FitStars value={o.fit} size={9}/>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PathStat({ label, value, divider, signal }) {
  return (
    <div style={{
      padding: '14px 16px',
      borderLeft: divider ? '1px solid var(--line-1)' : 'none',
    }}>
      <div className="eyebrow" style={{ marginBottom: 4, color: 'var(--ink-3)' }}>{label}</div>
      <div className="serif" style={{
        fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em',
        color: signal ? 'var(--signal)' : 'var(--ink-1)', lineHeight: 1,
      }}>
        {String(value).padStart(2, '0')}
      </div>
    </div>
  );
}

function PathRow({ opp, contacts, onOpenContact, onOpenOpp }) {
  return (
    <div style={{
      border: '1px solid var(--line-1)', borderRadius: 3,
      background: 'var(--bg-1)',
    }}>
      <button onClick={() => onOpenOpp(opp.id)} style={{
        appearance: 'none', background: 'transparent', border: 'none', textAlign: 'left',
        width: '100%', padding: '11px 14px',
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center',
        cursor: 'pointer', borderBottom: '1px solid var(--line-1)',
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-1)', fontWeight: 500,
                         whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {opp.role}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1 }}>
            {opp.company}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: stageColor(opp.stage),
          }}/>
          <FitStars value={opp.fit} size={9}/>
        </div>
      </button>
      <div style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {contacts.map(c => (
          <button key={c.id} onClick={() => onOpenContact(c.id)} style={{
            appearance: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 9px',
            background: 'var(--bg-2)', border: '1px solid var(--line-2)',
            borderRadius: 999, fontSize: 11.5, color: 'var(--ink-2)',
            cursor: 'pointer', transition: 'all .12s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--ink-1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-2)'; e.currentTarget.style.color = 'var(--ink-2)'; }}>
            <StrengthDot strength={c.strength}/>
            {c.name.split(' ')[0]} {c.name.split(' ').slice(-1)[0][0]}.
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Contact detail panel ───────────────────────────────────────────────────
function ContactDetailPanel({ contact, opportunities, onOpenOpp }) {
  const linked = opportunities.filter(o => contact.opportunities.includes(o.id));
  const monogram = contact.name.split(' ').map(w => w[0]).slice(0, 2).join('');

  return (
    <div style={{ padding: '20px 24px 28px' }}>
      {/* Identity header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--bg-3)',
          border: '1px solid var(--line-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--serif)', fontStyle: 'italic',
          fontSize: 20, color: 'var(--ink-1)',
        }}>
          {monogram}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="serif" style={{
            fontSize: 22, fontWeight: 400, letterSpacing: '-0.014em', color: 'var(--ink-1)',
          }}>
            {contact.name}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>
            {contact.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
            {contact.company}
          </div>
        </div>
      </div>

      {/* Meta strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        border: '1px solid var(--line-1)', borderRadius: 3,
        marginBottom: 20,
      }}>
        <ContactMeta label="Strength" value={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StrengthDot strength={contact.strength}/>
            <span style={{ fontSize: 13, color: 'var(--ink-1)', textTransform: 'capitalize' }}>{contact.strength}</span>
          </div>
        }/>
        <ContactMeta label="Last touch" divider value={
          <span className="mono" style={{ fontSize: 13, color: 'var(--ink-1)' }}>
            {contact.lastContacted === 'never' ? 'NEVER' : contact.lastContacted}
          </span>
        }/>
      </div>

      {/* Source */}
      <DetailField label="Source">
        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{contact.source}</div>
      </DetailField>

      {/* Relevant personas */}
      <DetailField label="Relevant to">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {contact.personas.map(pid => <PersonaTag key={pid} personaId={pid}/>)}
        </div>
      </DetailField>

      {/* Linked opportunities */}
      <DetailField label="Opportunities they enable">
        {linked.length === 0 ? (
          <div className="serif-italic" style={{ fontSize: 13, color: 'var(--ink-3)' }}>
            No active opportunities — yet. Worth a coffee anyway.
          </div>
        ) : (
          <div style={{ border: '1px solid var(--line-1)', borderRadius: 3 }}>
            {linked.map((o, i) => (
              <button key={o.id} onClick={() => onOpenOpp(o.id)} style={{
                appearance: 'none', background: 'transparent', border: 'none', textAlign: 'left',
                width: '100%', padding: '11px 14px',
                borderTop: i === 0 ? 'none' : '1px solid var(--line-1)',
                display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center',
                cursor: 'pointer', transition: 'background .12s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink-1)' }}>{o.role}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1 }}>{o.company}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: stageColor(o.stage) }}/>
                  <Icon name="arrow-right" size={11} stroke={1.5} style={{ color: 'var(--ink-3)' }}/>
                </div>
              </button>
            ))}
          </div>
        )}
      </DetailField>

      {/* Notes */}
      <DetailField label="Notes">
        <div className="serif" style={{
          fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)',
          padding: '4px 0',
        }}>
          {contact.notes}
        </div>
      </DetailField>

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <Btn variant="primary" icon="send">Draft outreach</Btn>
        <Btn variant="outline" icon="edit">Edit contact</Btn>
      </div>
    </div>
  );
}

function ContactMeta({ label, value, divider }) {
  return (
    <div style={{
      padding: '12px 14px',
      borderLeft: divider ? '1px solid var(--line-1)' : 'none',
    }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      {value}
    </div>
  );
}

Object.assign(window, { NetworkView });
