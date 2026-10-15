// Level Up — Outreach: networking messages not tied to an opportunity.
// People list (grouped) · person panel · a chat with Claude beside the draft.

const nwMono = { fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-4)' };
const nwLink = { appearance: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--ink-2)', textDecoration: 'underline', textDecorationColor: 'var(--line-2)', textUnderlineOffset: 3, fontFamily: 'var(--sans)' };
const nwInput = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-1)', color: 'var(--ink-1)', border: '1px solid var(--line-1)', borderRadius: 3, fontFamily: 'var(--sans)', fontSize: 13, padding: '7px 9px', outline: 'none' };
const nwAgo = (t) => { if (!t) return null; const d = Math.round((Date.now() - t) / 864e5); return d < 1 ? 'today' : d < 45 ? d + 'd ago' : d < 540 ? Math.round(d / 30) + ' months ago' : Math.round(d / 365) + ' years ago'; };

function NetworkingView() {
  const N = window.LU_NETWORKING;
  const [, bump] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const on = () => bump();
    ['lu:networking-changed', 'lu:contacts-changed', 'lu:opportunities-changed'].forEach((e) => window.addEventListener(e, on));
    return () => ['lu:networking-changed', 'lu:contacts-changed', 'lu:opportunities-changed'].forEach((e) => window.removeEventListener(e, on));
  }, []);
  const [group, setGroup] = React.useState('reconnect');
  const [q, setQ] = React.useState('');
  const [selected, setSelected] = React.useState(null);
  const [adding, setAdding] = React.useState(false);
  const [limit, setLimit] = React.useState(60);
  if (!N) return <div style={{ padding: 40, color: 'var(--ink-3)' }}>Refresh the page (Cmd+Shift+R) to load Outreach.</div>;

  const all = N.everyone();
  const counts = {};
  all.forEach((p) => { counts[p.groupKey] = (counts[p.groupKey] || 0) + 1; });
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let list = all.filter((p) => (group === 'all' || p.groupKey === group) && words.every((w) => [p.name, p.title, p.company, p.context].join(' ').toLowerCase().includes(w)));
  list.sort((a, b) => (group === 'reconnect' ? (a.touch || 0) - (b.touch || 0) : (b.touch || 0) - (a.touch || 0)) || String(a.name).localeCompare(String(b.name)));
  const current = selected ? (all.find((x) => x.id === selected) || N.person(selected)) : null; // carries the group

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '18px 28px 14px', borderBottom: '1px solid var(--line-1)', flex: '0 0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="serif" style={{ margin: 0, fontSize: 30, fontWeight: 400, letterSpacing: '-0.02em' }}>Outreach</h1>
          <div className="serif-italic" style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 4 }}>Build and extend your network, before a role exists.</div>
        </div>
        <Btn size="s" variant="outline" icon="plus" onClick={() => setAdding(true)}>Add a person</Btn>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) minmax(0, 1fr)' }}>
        <div style={{ borderRight: '1px solid var(--line-1)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line-1)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Object.entries(N.GROUPS).map(([k, l]) => (
                <button key={k} onClick={() => { setGroup(k); setLimit(60); }} style={{
                  appearance: 'none', cursor: 'pointer', padding: '3px 9px', borderRadius: 3, fontSize: 11.5, fontFamily: 'var(--sans)',
                  border: '1px solid ' + (group === k ? 'var(--line-3)' : 'var(--line-1)'), background: group === k ? 'var(--bg-3)' : 'transparent', color: group === k ? 'var(--ink-1)' : 'var(--ink-3)',
                }}>{l} <span className="mono" style={{ fontSize: 10.5 }}>{k === 'all' ? all.length : counts[k] || 0}</span></button>
              ))}
            </div>
            <input type="search" aria-label="Search people" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, title, company…" style={{ ...nwInput, padding: '6px 9px' }}/>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {!list.length && <div style={{ padding: 16, fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
              {group === 'reconnect' ? 'No strong or warm contacts have gone quiet. Mark contacts strong or warm in Network, or check Everyone.' : group === 'new' ? 'Add someone you want to know with Add a person.' : 'Nobody here yet.'}
            </div>}
            {list.slice(0, limit).map((p) => (
              <button key={p.id} onClick={() => setSelected(p.id)} aria-label={p.name} style={{
                appearance: 'none', display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--sans)', padding: '9px 12px', border: 'none', borderBottom: '1px solid var(--line-1)',
                borderLeft: selected === p.id ? '2px solid var(--ink-1)' : '2px solid transparent', background: selected === p.id ? 'var(--bg-3)' : 'transparent',
              }}>
                <div style={{ fontSize: 13.5, color: 'var(--ink-1)' }}>{p.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[p.title, p.company].filter(Boolean).join(' · ') || '—'}</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 2 }}>
                  {[p.strength, p.lastSentAt ? 'messaged ' + nwAgo(new Date(p.lastSentAt).getTime()) : p.touch ? 'last touch ' + nwAgo(p.touch) : 'no touch recorded', (p.threads || []).some((t) => !t.sentAt && t.drafts.length) && 'draft in progress'].filter(Boolean).join(' · ')}
                </div>
              </button>
            ))}
            {list.length > limit && <div style={{ padding: 12 }}><button style={nwLink} onClick={() => setLimit(limit + 100)}>Show more ({list.length - limit})</button></div>}
          </div>
        </div>

        <div style={{ minWidth: 0, minHeight: 0, overflow: 'auto' }}>
          {current ? <PersonPanel key={current.id} p={current}/> : (
            <div style={{ padding: 32, color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.6, maxWidth: 560 }}>
              Pick someone on the left, or <button style={nwLink} onClick={() => setAdding(true)}>add a person</button>. Then choose why you're reaching out and how, and work on the message with Claude.
            </div>
          )}
        </div>
      </div>
      {adding && <AddPersonModal onClose={() => setAdding(false)} onAdded={(id) => { setAdding(false); setQ(''); setGroup('all'); setSelected(id); }}/>}
    </div>
  );
}

function AddPersonModal({ onClose, onAdded }) {
  const N = window.LU_NETWORKING;
  const [f, setF] = React.useState({ linkedinUrl: '', profileText: '', name: '', title: '', company: '', group: 'auto', context: '' });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const go = async () => {
    setBusy(true); setError(null);
    try { onAdded(await N.addPerson(f)); } catch (e) { setError(String(e.message || e).slice(0, 200)); } finally { setBusy(false); }
  };
  const reads = f.profileText.trim().length > 40;
  return (
    <ModalShell onClose={onClose} width={600}>
      <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line-1)' }}>
        <div className="serif" style={{ fontSize: 22 }}>Add a person</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>Paste their LinkedIn link. For the details, copy the text of their profile page (select all, copy) and paste it below, or type the basics.</div>
      </div>
      <div style={{ padding: '16px 22px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input aria-label="LinkedIn profile link" value={f.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} placeholder="https://www.linkedin.com/in/…" style={nwInput}/>
        <textarea aria-label="Profile text" value={f.profileText} onChange={(e) => set('profileText', e.target.value)} rows={5} placeholder="Paste their profile text (optional): Claude reads name, role, company and what you have in common" style={{ ...nwInput, resize: 'vertical', fontSize: 12.5 }}/>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <input aria-label="Name" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder={reads ? 'Name (from the text)' : 'Name'} style={nwInput}/>
          <input aria-label="Title" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Title" style={nwInput}/>
          <input aria-label="Company" value={f.company} onChange={(e) => set('company', e.target.value)} placeholder="Company" style={nwInput}/>
        </div>
        <select aria-label="Group" value={f.group} onChange={(e) => set('group', e.target.value)} style={nwInput}>
          <option value="auto">Group: decide for me</option><option value="search">Search partner</option><option value="peers">Target peer</option><option value="new">New person</option><option value="reconnect">Reconnect</option>
        </select>
        <textarea aria-label="How you know them" value={f.context} onChange={(e) => set('context', e.target.value)} rows={2} placeholder="How you know them, or why you want to (optional)" style={{ ...nwInput, resize: 'vertical', fontSize: 12.5 }}/>
        {error && <div style={{ fontSize: 12.5, color: 'var(--signal)' }}>{error}</div>}
      </div>
      <div style={{ padding: '12px 22px', borderTop: '1px solid var(--line-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>{reads ? 'Claude reads the profile text: about 1¢' : 'No Claude call'}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={busy || (!reads && !f.name.trim())} onClick={go}>{busy ? 'Reading…' : 'Add'}</Btn>
        </div>
      </div>
    </ModalShell>
  );
}

function PersonPanel({ p }) {
  const N = window.LU_NETWORKING;
  const threads = p.threads || [];
  const [tid, setTid] = React.useState(() => (threads.find((t) => !t.sentAt) || threads[0] || {}).id || null);
  const [purpose, setPurpose] = React.useState(p.groupKey === 'search' || p.groupKey === 'new' || p.groupKey === 'peers' ? 'introduce' : 'reconnect');
  const [channel, setChannel] = React.useState('linkedin');
  const [via, setVia] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [ctx, setCtx] = React.useState(p.context || '');
  const t = tid ? N.thread(p.id, tid) : null;
  const people = React.useMemo(() => N.everyone().filter((x) => x.id !== p.id).map((x) => ({ id: x.id, label: x.name + (x.company ? ' · ' + x.company : '') })), [p.id]);

  const start = async () => {
    setBusy(true); setError(null);
    try {
      const viaId = purpose === 'intro' ? ((people.find((x) => x.label === via) || {}).id || null) : null;
      if (purpose === 'intro' && !viaId) throw new Error('Pick who you want to be introduced to.');
      const id = N.startThread(p.id, purpose, channel, viaId);
      setTid(id);
      await N.say(p.id, id, '', {});
    } catch (e) { setError(String(e.message || e).slice(0, 200)); } finally { setBusy(false); }
  };

  return (
    <div style={{ padding: '16px 22px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <div className="serif" style={{ fontSize: 24, color: 'var(--ink-1)' }}>{p.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{[p.title, p.company].filter(Boolean).join(' · ')}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 3 }}>
            {[p.strength, p.touch ? 'last touch ' + nwAgo(p.touch) : 'no touch recorded', p.source].filter(Boolean).join(' · ')}
            {p.linkedinUrl && <> · <a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ ...nwLink, fontSize: 11.5 }}>LinkedIn ↗</a></>}
          </div>
        </div>
        <select aria-label="Group" value={p.group || 'auto'} onChange={(e) => N.savePerson(p.id, { group: e.target.value === 'auto' ? undefined : e.target.value })} style={{ ...nwInput, width: 'auto', fontSize: 12, padding: '4px 6px' }}>
          <option value="auto">Group: automatic ({N.GROUPS[p.groupKey] || 'other'})</option>
          {['reconnect', 'search', 'peers', 'new'].map((k) => <option key={k} value={k}>{N.GROUPS[k]}</option>)}
        </select>
      </div>
      {p.profile && (p.profile.summary || (p.profile.common || []).length > 0) && (
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.5 }}>
          {p.profile.summary}{(p.profile.common || []).length > 0 && <div style={{ color: 'var(--ink-3)', marginTop: 2 }}>In common: {p.profile.common.join(' · ')}</div>}
        </div>
      )}
      <textarea aria-label="How you know them" value={ctx} onChange={(e) => setCtx(e.target.value)} onBlur={() => ctx !== (p.context || '') && N.savePerson(p.id, { context: ctx })} rows={2}
        placeholder="How you know them, or why you want to (Claude uses this)" style={{ ...nwInput, marginTop: 10, fontSize: 12.5, resize: 'vertical' }}/>

      {/* New conversation */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line-1)' }}>
        <span style={nwMono}>New message</span>
        <select aria-label="Purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} style={{ ...nwInput, width: 'auto', padding: '5px 7px', fontSize: 12.5 }}>
          {Object.entries(N.PURPOSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select aria-label="Channel" value={channel} onChange={(e) => setChannel(e.target.value)} style={{ ...nwInput, width: 'auto', padding: '5px 7px', fontSize: 12.5 }}>
          {Object.entries(N.CHANNELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {purpose === 'intro' && (
          <>
            <input aria-label="Introduce me to" list="nw-people" value={via} onChange={(e) => setVia(e.target.value)} placeholder="Introduce me to…" style={{ ...nwInput, width: 220, padding: '5px 7px', fontSize: 12.5 }}/>
            <datalist id="nw-people">{people.slice(0, 2000).map((x) => <option key={x.id} value={x.label}/>)}</datalist>
          </>
        )}
        <Btn size="s" variant="primary" icon="sparkles" disabled={busy} onClick={start}>{busy && !t ? 'Drafting…' : 'Draft with Claude'}</Btn>
        <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>about 1–2¢ per turn</span>
      </div>
      {error && <div style={{ fontSize: 12.5, color: 'var(--signal)', marginTop: 8 }}>{error}</div>}

      {threads.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {threads.map((x) => (
            <button key={x.id} onClick={() => setTid(x.id)} style={{
              appearance: 'none', cursor: 'pointer', padding: '3px 9px', borderRadius: 3, fontSize: 11.5, fontFamily: 'var(--sans)',
              border: '1px solid ' + (tid === x.id ? 'var(--line-3)' : 'var(--line-1)'), background: tid === x.id ? 'var(--bg-3)' : 'transparent', color: 'var(--ink-2)',
            }}>{N.PURPOSES[x.purpose].label} · {N.CHANNELS[x.channel].label.replace('LinkedIn ', '')}{x.sentAt ? ' · sent ' + new Date(x.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ' · draft'}</button>
          ))}
        </div>
      )}

      {t && <Conversation key={t.id} p={p} t={t} busy={busy} setBusy={setBusy} setError={setError} onDeleted={() => setTid(null)}/>}

      {(p.log || []).length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={nwMono}>Sent</div>
          {p.log.map((l, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--ink-3)', padding: '4px 0', borderTop: i ? '1px solid var(--line-1)' : 'none' }}>
              <span style={{ color: 'var(--ink-2)' }}>{new Date(l.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {(N.PURPOSES[l.purpose] || {}).label} · {(N.CHANNELS[l.channel] || {}).label}</span>
              <div style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{l.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Conversation({ p, t, busy, setBusy, setError, onDeleted }) {
  const N = window.LU_NETWORKING;
  const [text, setText] = React.useState('');
  const [view, setView] = React.useState(null); // index of an older version being viewed
  const [copied, setCopied] = React.useState(false);
  const chatEnd = React.useRef(null);
  React.useEffect(() => { if (chatEnd.current) chatEnd.current.scrollTop = chatEnd.current.scrollHeight; }, [t.messages.length]);
  const personas = window.activePersonas ? window.activePersonas() : (window.LU_PERSONAS || []);
  const C = N.CHANNELS[t.channel];
  const latest = t.drafts[t.drafts.length - 1];
  const shown = view != null ? t.drafts[view] : latest;
  const send = async (msg, opts) => {
    if (!msg.trim()) return;
    setBusy(true); setError(null); setView(null);
    try { await N.say(p.id, t.id, msg.trim(), opts || {}); setText(''); } catch (e) { setError(String(e.message || e).slice(0, 200)); } finally { setBusy(false); }
  };
  const lens = (pp) => {
    const on = (t.lenses || []).includes(pp.id);
    send(on ? `Drop the ${pp.name} lens.` : `View it through the ${pp.name} lens.`, { lenses: on ? t.lenses.filter((x) => x !== pp.id) : [...(t.lenses || []), pp.id] });
  };
  const chip = { appearance: 'none', cursor: 'pointer', padding: '3px 8px', borderRadius: 3, fontSize: 11.5, fontFamily: 'var(--sans)', border: '1px solid var(--line-1)', background: 'transparent', color: 'var(--ink-2)' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginTop: 12 }}>
      {/* Chat */}
      <div style={{ border: '1px solid var(--line-1)', borderRadius: 4, display: 'flex', flexDirection: 'column', minHeight: 380, maxHeight: 560 }}>
        <div ref={chatEnd} style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!t.messages.length && <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{busy ? 'Claude is writing the first draft…' : 'No messages yet.'}</div>}
          {t.messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', fontSize: 12.5, lineHeight: 1.5, padding: '7px 10px', borderRadius: 6,
              background: m.role === 'user' ? 'var(--bg-3)' : 'var(--bg-2)', border: '1px solid var(--line-1)', color: 'var(--ink-1)',
            }}>
              {m.text}
              {m.v && <div style={{ marginTop: 3 }}><button style={{ ...nwLink, fontSize: 11 }} onClick={() => setView(m.v - 1 === t.drafts.length - 1 ? null : m.v - 1)}>version {m.v}</button></div>}
            </div>
          ))}
          {busy && t.messages.length > 0 && <div style={{ alignSelf: 'flex-start', fontSize: 12, color: 'var(--ink-3)' }}>Claude is thinking…</div>}
        </div>
        <div style={{ borderTop: '1px solid var(--line-1)', padding: 10 }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
            {personas.map((pp) => <button key={pp.id} style={{ ...chip, background: (t.lenses || []).includes(pp.id) ? 'var(--bg-3)' : 'transparent' }} disabled={busy} onClick={() => lens(pp)}>{(t.lenses || []).includes(pp.id) ? '✓ ' : '+ '}{pp.name}</button>)}
            {['Shorter', 'Warmer', 'More direct'].map((x) => <button key={x} style={chip} disabled={busy} onClick={() => send(x)}>{x}</button>)}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <textarea aria-label="Message to Claude" value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Tell Claude what to change, or ask its view…"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!busy) send(text); } }}
              style={{ ...nwInput, resize: 'none', fontSize: 12.5 }}/>
            <Btn size="s" variant="primary" disabled={busy || !text.trim()} onClick={() => send(text)}>Send</Btn>
          </div>
        </div>
      </div>

      {/* Draft */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span style={nwMono}>{N.PURPOSES[t.purpose].label} · {C.label}{t.drafts.length ? ` · version ${view != null ? view + 1 : t.drafts.length} of ${t.drafts.length}` : ''}</span>
          {t.drafts.length > 1 && (
            <select aria-label="Version" value={view != null ? view : t.drafts.length - 1} onChange={(e) => setView(+e.target.value === t.drafts.length - 1 ? null : +e.target.value)} style={{ ...nwInput, width: 'auto', padding: '2px 6px', fontSize: 11.5 }}>
              {t.drafts.map((_, i) => <option key={i} value={i}>Version {i + 1}{i === t.drafts.length - 1 ? ' (current)' : ''}</option>)}
            </select>
          )}
        </div>
        {!shown && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 10 }}>{busy ? 'Drafting…' : 'No draft yet.'}</div>}
        {shown && (
          <>
            {view != null && <div style={{ fontSize: 12, color: 'var(--ink-2)', background: 'var(--bg-2)', border: '1px solid var(--line-1)', borderRadius: 3, padding: '6px 10px', marginTop: 8 }}>
              Viewing version {view + 1}. <button style={nwLink} onClick={() => { N.restoreVersion(p.id, t.id, view); setView(null); }}>Use this version</button> · <button style={nwLink} onClick={() => setView(null)}>Back to current</button>
            </div>}
            {C.subject && <input aria-label="Subject" value={shown.subject || ''} readOnly={view != null} onChange={(e) => N.editDraft(p.id, t.id, { subject: e.target.value })} placeholder="Subject" style={{ ...nwInput, marginTop: 8, fontWeight: 500 }}/>}
            <textarea aria-label="Draft message" value={shown.body} readOnly={view != null} onChange={(e) => N.editDraft(p.id, t.id, { body: e.target.value })} rows={10}
              style={{ ...nwInput, marginTop: 8, fontFamily: 'var(--serif)', fontSize: 14.5, lineHeight: 1.6, resize: 'vertical' }}/>
            {C.limit && <div style={{ fontSize: 11.5, textAlign: 'right', color: shown.body.length > C.limit ? 'var(--signal)' : 'var(--ink-4)' }}>{shown.body.length} / {C.limit}</div>}
            {shown.blurb != null && (
              <>
                <div style={{ ...nwMono, marginTop: 8 }}>Forwardable blurb</div>
                <textarea aria-label="Forwardable blurb" value={shown.blurb || ''} readOnly={view != null} onChange={(e) => N.editDraft(p.id, t.id, { blurb: e.target.value })} rows={4} style={{ ...nwInput, marginTop: 4, fontSize: 12.5, resize: 'vertical' }}/>
              </>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
              <Btn size="s" variant="outline" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(N.copyText(t)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'Copied' : 'Copy'}</Btn>
              {t.sentAt
                ? <span style={{ fontSize: 12, color: 'oklch(62% 0.12 150)' }}>● Sent {new Date(t.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                : <Btn size="s" variant="primary" onClick={() => { N.markSent(p.id, t.id); window.LU_CORE.pill('Logged as sent'); }}>Mark sent</Btn>}
              <button style={{ ...nwLink, color: 'var(--ink-4)' }} onClick={() => { if (window.confirm('Delete this conversation?')) { N.removeThread(p.id, t.id); onDeleted(); } }}>Delete</button>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 6 }}>Send it yourself on {t.channel === 'email' ? 'email' : 'LinkedIn'}, then mark it sent.</div>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { NetworkingView });
