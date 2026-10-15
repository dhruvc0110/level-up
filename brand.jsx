// Level Up — Brand: one stream of LinkedIn posts from three sources (your
// experience, your job pipeline, your own idea). Claude drafts from the record;
// you refine with instructions and persona lenses, copy, post and mark posted.

const brMono = { fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-4)' };
const brLink = { appearance: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--ink-2)', textDecoration: 'underline', textDecorationColor: 'var(--line-2)', textUnderlineOffset: 3, fontFamily: 'var(--sans)' };
const brInput = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-1)', color: 'var(--ink-1)', border: '1px solid var(--line-1)', borderRadius: 3, fontFamily: 'var(--sans)', fontSize: 13, padding: '7px 9px', outline: 'none' };
const BR_SOURCES = {
  experience: { label: 'From your experience', icon: 'profile', hint: 'Lessons, results and decisions from your Career profile.' },
  pipeline: { label: 'From your job pipeline', icon: 'pipeline', hint: 'Themes the roles you saved or applied to care about. Posts never name them.' },
  own: { label: 'Your idea', icon: 'article', hint: 'A prompt or a rough draft to work on together.' },
};

function BrandView() {
  const B = window.LU_BRAND;
  const [, bump] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const on = () => bump();
    ['lu:brand-changed', 'lu:opportunities-changed', 'lu:model-changed'].forEach((e) => window.addEventListener(e, on));
    return () => ['lu:brand-changed', 'lu:opportunities-changed', 'lu:model-changed'].forEach((e) => window.removeEventListener(e, on));
  }, []);
  const [selected, setSelected] = React.useState(null);
  const [busy, setBusy] = React.useState(null); // which action is running
  const [error, setError] = React.useState(null);
  if (!B || !B.posts) return <div style={{ padding: 40, color: 'var(--ink-3)' }}>Refresh the page (Cmd+Shift+R) to load Brand.</div>;

  const posts = B.posts();
  const current = posts.find((p) => p.id === selected) || posts.find((p) => p.status === 'draft') || posts[0] || null;
  const run = async (key, fn) => {
    setBusy(key); setError(null);
    try { const r = await fn(); if (r && r.id) setSelected(r.id); }
    catch (e) { setError(String(e.message || e).slice(0, 200)); }
    finally { setBusy(null); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <BrandTop/>
      <div className="lu-main-scroll" style={{ padding: '18px 28px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 12 }}>
          <IdeaSource source="experience" busy={busy} run={run}/>
          <IdeaSource source="pipeline" busy={busy} run={run}/>
          <OwnIdea busy={busy} run={run}/>
        </div>
        {error && <div style={{ fontSize: 12.5, color: 'var(--signal)', margin: '0 0 12px' }}>Couldn’t finish: {error}</div>}
        <PostWorkspace posts={posts} current={current} onSelect={setSelected} busy={busy} run={run}/>
      </div>
    </div>
  );
}

// ── Header with the weekly rhythm ──
function BrandTop() {
  const B = window.LU_BRAND;
  const r = B.rhythm(6);
  const left = Math.max(0, r.target - r.thisWeek);
  return (
    <div style={{ padding: '18px 28px 16px', borderBottom: '1px solid var(--line-1)', flex: '0 0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
      <div>
        <h1 className="serif" style={{ margin: 0, fontSize: 30, fontWeight: 400, letterSpacing: '-0.02em' }}>Brand</h1>
        <div className="serif-italic" style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 4 }}>Show up when recruiters and executives look.</div>
        <div style={{ marginTop: 8 }}><ModelPicker task="brand"/></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, flexWrap: 'wrap' }}>
        <div>
          <div style={brMono}>This week</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span className="serif" style={{ fontSize: 26, color: 'var(--ink-1)' }}>{r.thisWeek}<span style={{ fontSize: 15, color: 'var(--ink-3)' }}> / {r.target}</span></span>
            <span style={{ display: 'flex', gap: 3 }}>
              {Array.from({ length: r.target }).map((_, i) => <span key={i} style={{ width: 22, height: 6, borderRadius: 3, background: i < r.thisWeek ? 'oklch(62% 0.12 150)' : 'var(--line-2)' }}/>)}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 }}>
            {left ? `${left} more to stay on rhythm` : 'On rhythm this week'} · target{' '}
            <select aria-label="Posts per week" value={r.target} onChange={(e) => B.setTarget(+e.target.value)} style={{ background: 'transparent', color: 'var(--ink-2)', border: 'none', fontSize: 11.5, fontFamily: 'var(--sans)', cursor: 'pointer' }}>
              {[2, 3, 4].map((n) => <option key={n} value={n}>{n} a week</option>)}
            </select>
          </div>
        </div>
        <div title="Posts marked posted, last 6 weeks">
          <div style={brMono}>Last 6 weeks</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 30, marginTop: 6 }}>
            {r.weeks.map((w, i) => (
              <div key={i} title={`Week of ${w.from.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: ${w.count}`}
                style={{ width: 12, height: Math.max(3, Math.min(30, w.count * 8)), borderRadius: 2, background: w.count >= r.target ? 'oklch(62% 0.12 150)' : w.count ? 'var(--ink-3)' : 'var(--line-2)' }}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SourceShell({ source, children, footer }) {
  const S = BR_SOURCES[source];
  return (
    <div style={{ border: '1px solid var(--line-1)', borderRadius: 4, background: 'var(--bg-2)', padding: '12px 14px', display: 'flex', flexDirection: 'column', minHeight: 200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <Icon name={S.icon} size={13}/><span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-1)' }}>{S.label}</span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', margin: '3px 0 8px' }}>{S.hint}</div>
      <div style={{ flex: 1 }}>{children}</div>
      {footer && <div style={{ marginTop: 8 }}>{footer}</div>}
    </div>
  );
}

function IdeaSource({ source, busy, run }) {
  const B = window.LU_BRAND;
  const ideas = B.ideas(source);
  const opps = source === 'pipeline' ? B.pipelineOpps() : [];
  const noRecord = !(((window.LU_CORE && window.LU_CORE.doc().career) || {}).achievements || []).length;
  const working = busy === 'ideas:' + source;
  const blocked = noRecord ? 'Add your resumes in Career profile first.' : source === 'pipeline' && !opps.length ? 'No roles saved or applied to in the last 60 days.' : null;
  return (
    <SourceShell source={source} footer={
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button style={brLink} disabled={!!busy || !!blocked} onClick={() => run('ideas:' + source, () => B.suggestIdeas(source, 5))}>
          {working ? 'Thinking…' : ideas.length ? 'More ideas' : 'Suggest ideas'}
        </button>
        <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>about 1–2¢{source === 'pipeline' && opps.length ? ` · from ${opps.length} recent role${opps.length === 1 ? '' : 's'}` : ''}</span>
      </div>}>
      {blocked && <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{blocked}</div>}
      {!blocked && !ideas.length && <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>No ideas yet. Click <b style={{ fontWeight: 500 }}>Suggest ideas</b>.</div>}
      {ideas.slice(0, 5).map((x) => (
        <div key={x.id} style={{ borderTop: '1px solid var(--line-1)', padding: '7px 0' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-1)', lineHeight: 1.35 }}>{x.title}{x.format === 'article' && <span style={{ fontSize: 10.5, color: 'var(--ink-3)', marginLeft: 6 }}>ARTICLE</span>}</div>
          {x.angle && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.4 }}>{x.angle}</div>}
          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            <button style={{ ...brLink, color: 'var(--ink-1)' }} disabled={!!busy} onClick={() => run('draft:' + x.id, () => B.draftFromIdea(source, x))}>{busy === 'draft:' + x.id ? 'Drafting…' : 'Draft'}</button>
            <button style={{ ...brLink, color: 'var(--ink-4)' }} disabled={!!busy} onClick={() => B.dismissIdea(source, x.id)}>Not this one</button>
          </div>
        </div>
      ))}
    </SourceShell>
  );
}

function OwnIdea({ busy, run }) {
  const B = window.LU_BRAND;
  const [text, setText] = React.useState('');
  const [format, setFormat] = React.useState('post');
  const go = () => run('own', async () => { const p = await B.draftOwn(text.trim(), format); setText(''); return p; });
  return (
    <SourceShell source="own" footer={
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select aria-label="Format" value={format} onChange={(e) => setFormat(e.target.value)} style={{ ...brInput, width: 'auto', padding: '4px 6px', fontSize: 12 }}>
          <option value="post">Post</option><option value="article">Article / newsletter</option>
        </select>
        <Btn size="s" variant="primary" icon="sparkles" disabled={!!busy || !text.trim()} onClick={go}>{busy === 'own' ? 'Working…' : 'Work on it with ' + aiName('brand')}</Btn>
        <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>about 2–3¢</span>
      </div>}>
      <textarea aria-label="Your idea or rough draft" value={text} onChange={(e) => setText(e.target.value)} rows={5}
        placeholder="e.g. “Why most AI pilots never reach production” — or paste a rough draft"
        style={{ ...brInput, resize: 'vertical', lineHeight: 1.5, fontSize: 12.5 }}/>
    </SourceShell>
  );
}

// ── Drafts and posted list + editor ──
function PostWorkspace({ posts, current, onSelect, busy, run }) {
  if (!posts.length) {
    return (
      <div style={{ border: '1px dashed var(--line-2)', borderRadius: 4, padding: '22px 20px', color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.6 }}>
        Your drafts will appear here. Pick an idea above and click <b style={{ fontWeight: 500, color: 'var(--ink-2)' }}>Draft</b>, or write your own. Then refine it, view it through a persona, copy it to LinkedIn and mark it posted.
      </div>
    );
  }
  const drafts = posts.filter((p) => p.status !== 'posted'), posted = posts.filter((p) => p.status === 'posted');
  const row = (p) => (
    <button key={p.id} onClick={() => onSelect(p.id)} style={{
      appearance: 'none', display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--sans)', padding: '8px 10px', border: 'none',
      borderLeft: current && current.id === p.id ? '2px solid var(--ink-1)' : '2px solid transparent', background: current && current.id === p.id ? 'var(--bg-3)' : 'transparent',
    }}>
      <div style={{ fontSize: 12.5, color: 'var(--ink-1)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {p.title || String(p.body || p.ideaTitle || p.prompt || 'Untitled').split('\n')[0]}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 2 }}>
        {BR_SOURCES[p.source] ? BR_SOURCES[p.source].label.replace(/^From your /, '').replace(/^Your idea$/, 'your idea') : ''}{p.format === 'article' ? ' · article' : ''}
        {p.status === 'posted' && p.postedAt ? ' · posted ' + new Date(p.postedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
      </div>
    </button>
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 260px) minmax(0, 1fr)', border: '1px solid var(--line-1)', borderRadius: 4, minHeight: 420 }}>
      <div style={{ borderRight: '1px solid var(--line-1)', padding: '10px 0', overflow: 'auto' }}>
        <div style={{ ...brMono, padding: '0 10px 4px' }}>Drafts · {drafts.length}</div>
        {drafts.map(row)}
        {posted.length > 0 && <div style={{ ...brMono, padding: '12px 10px 4px' }}>Posted · {posted.length}</div>}
        {posted.map(row)}
      </div>
      {current ? <PostEditor key={current.id} post={current} busy={busy} run={run}/> : <div/>}
    </div>
  );
}

function PostEditor({ post, busy, run }) {
  const B = window.LU_BRAND;
  const [instruction, setInstruction] = React.useState('');
  const [lenses, setLenses] = React.useState(post.lenses || []);
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => { setLenses(post.lenses || []); }, [JSON.stringify(post.lenses || [])]);
  const personas = window.activePersonas ? window.activePersonas() : (window.LU_PERSONAS || []);
  const career = (window.LU_CORE && window.LU_CORE.doc().career) || {};
  const ach = career.achievements || [];
  const opps = (window.LU_CORE.doc().opportunities || []).filter((o) => ((post.basedOn && post.basedOn.opps) || []).includes(o.id));
  const save = (patch) => B.savePost(post.id, patch);
  const lensesChanged = JSON.stringify([...lenses].sort()) !== JSON.stringify([...(post.lenses || [])].sort());
  const working = busy === 'write:' + post.id;
  const refine = () => run('write:' + post.id, async () => { const r = await B.write(post, { instruction: instruction.trim() || undefined, lenses }); setInstruction(''); return r; });
  const limit = post.format === 'article' ? null : B.LIMIT.post;
  const len = String(post.body || '').length;
  const hook = String(post.body || '').split('\n')[0];
  const named = B.mentions((post.title || '') + ' ' + (post.body || ''));
  const toggle = (id) => setLenses((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  if (!post.body) {
    return (
      <div style={{ padding: 20, fontSize: 13, color: 'var(--ink-3)' }}>
        {busy && busy.startsWith('draft') || busy === 'own' ? aiName('brand') + ' is drafting… about 20–40 seconds.' : post.error ? <>This draft didn’t finish: {post.error}. <button style={brLink} onClick={refine}>Try again</button> · <button style={brLink} onClick={() => B.removePost(post.id)}>Delete</button></> : <button style={brLink} onClick={refine}>Draft it</button>}
      </div>
    );
  }
  return (
    <div style={{ padding: '14px 18px 18px', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span style={brMono}>{BR_SOURCES[post.source] ? BR_SOURCES[post.source].label : 'Post'} · {post.format === 'article' ? 'article' : 'post'}</span>
        <span style={{ display: 'flex', gap: 12 }}>
          {(post.versions || []).length > 0 && <button style={brLink} disabled={!!busy} onClick={() => B.undo(post.id)} title="Go back to the previous version">Undo last change</button>}
          <button style={{ ...brLink, color: 'var(--ink-4)' }} onClick={() => { if (window.confirm('Delete this draft?')) B.removePost(post.id); }}>Delete</button>
        </span>
      </div>
      {(post.ideaTitle || post.prompt) && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{post.ideaTitle ? 'Idea: ' + post.ideaTitle : 'Your prompt: ' + String(post.prompt).slice(0, 140) + (String(post.prompt).length > 140 ? '…' : '')}</div>}

      {post.format === 'article' && (
        <input aria-label="Article title" value={post.title || ''} onChange={(e) => save({ title: e.target.value })} placeholder="Title"
          style={{ ...brInput, marginTop: 10, fontFamily: 'var(--serif)', fontSize: 18 }}/>
      )}
      <textarea aria-label="Post text" value={post.body} onChange={(e) => save({ body: e.target.value })}
        rows={post.format === 'article' ? 22 : 12}
        style={{ ...brInput, marginTop: 10, fontFamily: 'var(--serif)', fontSize: 15, lineHeight: 1.6, resize: 'vertical' }}/>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4, flexWrap: 'wrap' }}>
        <span>Shown before “see more”: <i style={{ color: 'var(--ink-2)' }}>{hook.slice(0, 150)}{hook.length > 150 ? '…' : ''}</i></span>
        {limit && <span style={{ color: len > limit ? 'var(--signal)' : 'var(--ink-4)' }}>{len.toLocaleString()} / {limit.toLocaleString()}</span>}
      </div>
      <input aria-label="Hashtags" value={(post.hashtags || []).join(' ')} onChange={(e) => save({ hashtags: e.target.value.split(/[\s,]+/).filter(Boolean).map((h) => '#' + h.replace(/^#+/, '')) })}
        placeholder="#Hashtags" style={{ ...brInput, marginTop: 8, fontSize: 12.5 }}/>

      {/* Persona lenses */}
      <div style={{ marginTop: 14 }}>
        <div style={brMono}>View through a persona</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
          {personas.map((p) => {
            const on = lenses.includes(p.id), applied = (post.lenses || []).includes(p.id);
            return (
              <button key={p.id} onClick={() => toggle(p.id)} aria-pressed={on} style={{
                appearance: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 3, fontSize: 12, fontFamily: 'var(--sans)',
                border: '1px solid ' + (on ? 'var(--line-3)' : 'var(--line-1)'), background: on ? 'var(--bg-3)' : 'transparent', color: on ? 'var(--ink-1)' : 'var(--ink-3)',
              }}>
                <PersonaDot personaId={p.id} size={6}/>{p.name}{applied && <span style={{ color: 'oklch(62% 0.12 150)' }}>✓</span>}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 4 }}>Pick one or more, then click <b style={{ fontWeight: 500 }}>Apply lens</b>: the same topic, re-expressed for those roles. ✓ marks lenses already applied.</div>
      </div>

      {/* Refine */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <input aria-label="Instruction for Claude" value={instruction} onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !busy && (instruction.trim() || lensesChanged)) refine(); }}
          placeholder="Refine: “shorter”, “lead with the number”, “end with a question”"
          style={{ ...brInput, flex: '1 1 260px' }}/>
        <Btn size="s" variant="primary" icon="sparkles" disabled={!!busy || (!instruction.trim() && !lensesChanged)} onClick={refine}>
          {working ? 'Working…' : instruction.trim() ? 'Refine' : lensesChanged ? 'Apply lens' : 'Refine'}
        </Btn>
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 3 }}>about 2–3¢ each · Undo goes back a version</div>

      {(named.length > 0 || (post.check || []).length > 0) && (
        <div style={{ marginTop: 14 }}>
          <div style={brMono}>Check before posting</div>
          {named.map((n) => <div key={n} style={{ fontSize: 12.5, color: 'var(--signal)', padding: '2px 0' }}>▲ Mentions “{n}”, a company in your pipeline: remove it before posting.</div>)}
          {(post.check || []).filter((x) => !/a company in your pipeline/.test(x)).map((x, i) => <div key={i} style={{ fontSize: 12, color: 'var(--ink-2)', padding: '2px 0' }}><span style={{ color: 'oklch(70% 0.12 75)', marginRight: 6 }}>▲</span>{x}</div>)}
        </div>
      )}
      {((post.basedOn && post.basedOn.achievements) || []).length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={brMono}>Based on</div>
          {post.basedOn.achievements.map((id) => { const a = ach.find((x) => x.id === id); return a ? <div key={id} style={{ fontSize: 12, color: 'var(--ink-3)', padding: '2px 0' }}>· {a.text}</div> : null; })}
        </div>
      )}
      {opps.length > 0 && <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 6 }}>Prompted by roles in your pipeline (only you see this): {opps.map((o) => o.role).join(' · ')}</div>}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--line-1)', flexWrap: 'wrap' }}>
        <Btn size="s" variant="outline" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(B.copyText(post)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'Copied' : 'Copy for LinkedIn'}</Btn>
        {post.status === 'posted'
          ? <><span style={{ fontSize: 12, color: 'oklch(62% 0.12 150)' }}>● Posted {new Date(post.postedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span><button style={brLink} onClick={() => B.markPosted(post.id, false)}>Undo</button></>
          : <Btn size="s" variant="primary" onClick={() => { B.markPosted(post.id, true); window.LU_CORE.pill('Marked as posted'); }}>Mark as posted</Btn>}
        <span style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>Post it on LinkedIn yourself, then mark it posted.</span>
      </div>
    </div>
  );
}

Object.assign(window, { BrandView });
