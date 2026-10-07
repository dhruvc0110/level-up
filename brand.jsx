// Level Up — Personal Brand Engine (Phase 2)
// Content calendar + theme distribution + AI post drafting + consistency reading
// Format-aware: Articles, Replies, Polls, Anecdotes, Updates, Quick takes.

const POST_FORMATS = [
  { id: 'article',  label: 'Article',              short: 'Article',  icon: 'article',
    hint: 'Long-form experience explainer · 600–1200 words' },
  { id: 'take',     label: 'Quick take',           short: 'Take',     icon: 'spark',
    hint: 'Direct opinion or observation · 1–2 paragraphs' },
  { id: 'anecdote', label: 'Anecdote',             short: 'Anecdote', icon: 'quote',
    hint: 'Short story that invites comments' },
  { id: 'poll',     label: 'Survey',               short: 'Poll',     icon: 'poll',
    hint: 'Question with 2–4 options · drives engagement' },
  { id: 'reply',    label: 'Reply',                short: 'Reply',    icon: 'reply',
    hint: 'Response to someone else\'s post · positions you in their orbit' },
  { id: 'update',   label: 'Professional update',  short: 'Update',   icon: 'flag',
    hint: 'Role change · milestone · announcement' },
];

function getFormat(id) {
  return POST_FORMATS.find(f => f.id === id) || POST_FORMATS[0];
}

function BrandView({ posts: initialPosts }) {
  const [posts, setPosts] = React.useState(initialPosts);
  const [selectedId, setSelectedId] = React.useState(initialPosts.find(p => p.status === 'draft')?.id || initialPosts[0]?.id);
  const [generating, setGenerating] = React.useState(false);
  const [instruction, setInstruction] = React.useState('');
  const [formatChooser, setFormatChooser] = React.useState(false);

  const selected = posts.find(p => p.id === selectedId);
  const published = posts.filter(p => p.status === 'published');
  const scheduled = posts.filter(p => p.status === 'scheduled');
  const drafts = posts.filter(p => p.status === 'draft' || p.status === 'idea');

  const updatePost = (next) => setPosts(arr => arr.map(p => p.id === next.id ? next : p));

  const generate = () => {
    setGenerating(true);
    setTimeout(() => {
      const theme = window.LU_THEMES.find(t => t.id === selected.theme);
      const generated = composePost(selected, theme, instruction);
      updatePost({ ...selected, ...generated });
      setGenerating(false);
      setInstruction('');
    }, 3000);
  };

  const createNewPost = (format) => {
    const fmt = getFormat(format);
    const id = 'p-' + Math.random().toString(36).slice(2, 7);
    const base = {
      id, date: null, status: 'idea',
      theme: 'leadership', format, title: '', body: '',
      engagement: null,
    };
    if (format === 'poll') Object.assign(base, { pollOptions: ['', '', ''], pollDuration: '1 week' });
    if (format === 'reply') Object.assign(base, { sourceAuthor: '', sourceQuote: '' });
    if (format === 'update') Object.assign(base, { updateKind: 'Role change' });
    setPosts(arr => [base, ...arr]);
    setSelectedId(id);
    setFormatChooser(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <BrandHeader published={published.length} scheduled={scheduled.length} drafts={drafts.length}
                   onNew={() => setFormatChooser(true)}/>

      <div className="lu-main-scroll" style={{ padding: '20px 28px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 14 }}>
          <ConsistencyModule posts={posts}/>
          <FormatMixModule posts={posts}/>
        </div>

        <CalendarModule posts={posts} selectedId={selectedId} onSelect={setSelectedId}/>

        <div style={{ marginTop: 14 }}>
          {selected && (
            <PostEditor post={selected} onUpdate={updatePost}
              instruction={instruction} setInstruction={setInstruction}
              generating={generating} onGenerate={generate}/>
          )}
        </div>
      </div>

      {formatChooser && (
        <FormatChooser onPick={createNewPost} onClose={() => setFormatChooser(false)}/>
      )}
    </div>
  );
}

function BrandHeader({ published, scheduled, drafts, onNew }) {
  return (
    <div style={{
      padding: '20px 28px 18px',
      borderBottom: '1px solid var(--line-1)',
      flex: '0 0 auto',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    }}>
      <div>
        <h1 className="serif" style={{
          margin: 0, fontSize: 30, fontWeight: 400, letterSpacing: '-0.02em',
        }}>
          Brand
        </h1>
        <div className="serif-italic" style={{
          fontSize: 14, color: 'var(--ink-3)', marginTop: 4,
        }}>
          Compounding presence. The recruiter calls itself.
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <Counter label="Published" value={published}/>
        <Counter label="Scheduled" value={scheduled}/>
        <Counter label="Drafts" value={drafts}/>
        <span style={{ width: 1, height: 28, background: 'var(--line-2)' }}/>
        <Btn variant="outline" icon="plus" onClick={onNew}>New post</Btn>
      </div>
    </div>
  );
}

// ── Consistency module ─────────────────────────────────────────────────
function ConsistencyModule({ posts }) {
  const published = posts.filter(p => p.status === 'published');
  const totalImpressions = published.reduce((s, p) => s + (p.engagement?.impressions || 0), 0);
  const totalReactions = published.reduce((s, p) => s + (p.engagement?.reactions || 0), 0);
  const avgImp = published.length ? Math.round(totalImpressions / published.length) : 0;
  // Cadence — days between posts
  const dates = published.map(p => new Date(p.date)).sort((a, b) => a - b);
  let totalGap = 0;
  for (let i = 1; i < dates.length; i++) totalGap += (dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24);
  const avgCadence = dates.length > 1 ? (totalGap / (dates.length - 1)).toFixed(1) : '—';
  const score = Math.min(100, 60 + published.length * 6);

  return (
    <div style={{
      background: 'var(--bg-1)',
      border: '1px solid var(--line-1)',
      borderRadius: 3,
      padding: '18px 22px',
    }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>Consistency</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
        <span className="serif" style={{
          fontSize: 44, fontWeight: 400, letterSpacing: '-0.025em', color: 'var(--ink-1)', lineHeight: 1,
        }}>
          {score}
        </span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>/ 100</span>
        <span className="serif-italic" style={{
          fontSize: 14, color: 'var(--ink-3)', marginLeft: 'auto',
        }}>
          Compounding nicely.
        </span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        borderTop: '1px solid var(--line-1)', paddingTop: 12, gap: 0,
      }}>
        <ConsStat label="Cadence"  value={`${avgCadence}d`} hint="avg gap"/>
        <ConsStat label="Posts/mo" value={published.length} hint="last 30d" divider/>
        <ConsStat label="Avg impr." value={`${(avgImp/1000).toFixed(1)}k`} divider/>
        <ConsStat label="Reactions" value={totalReactions} divider/>
      </div>
    </div>
  );
}

function ConsStat({ label, value, hint, divider }) {
  return (
    <div style={{
      padding: '0 14px',
      borderLeft: divider ? '1px solid var(--line-1)' : 'none',
    }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>{label}</div>
      <div className="serif" style={{
        fontSize: 18, fontWeight: 400, letterSpacing: '-0.015em',
        color: 'var(--ink-1)', lineHeight: 1,
      }}>
        {value}
      </div>
      {hint && <div className="serif-italic" style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

// ── Format mix module ──────────────────────────────────────────────────
function FormatMixModule({ posts }) {
  const counts = {};
  posts.filter(p => p.status === 'published' || p.status === 'scheduled').forEach(p => {
    const f = p.format || 'article';
    counts[f] = (counts[f] || 0) + 1;
  });
  const total = Object.values(counts).reduce((s, v) => s + v, 0) || 1;

  return (
    <div style={{
      background: 'var(--bg-1)',
      border: '1px solid var(--line-1)',
      borderRadius: 3,
      padding: '18px 22px',
    }}>
      <div className="eyebrow" style={{ marginBottom: 14 }}>Format mix · last 30 days</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {POST_FORMATS.map(f => {
          const c = counts[f.id] || 0;
          const pct = (c / total) * 100;
          return (
            <div key={f.id} style={{
              display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) 44px 24px',
              gap: 10, alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <Icon name={f.icon} size={12} stroke={1.5}
                      style={{ color: 'var(--ink-3)', flex: '0 0 12px' }}/>
                <span style={{
                  fontSize: 12, color: 'var(--ink-2)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {f.label}
                </span>
              </div>
              <div style={{ height: 3, background: 'var(--bg-3)', borderRadius: 1, overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%',
                  background: c > 0 ? 'var(--ink-2)' : 'var(--ink-4)',
                  opacity: 0.85, transition: 'width .35s',
                }}/>
              </div>
              <span className="mono" style={{
                fontSize: 11, color: c > 0 ? 'var(--ink-2)' : 'var(--ink-4)',
                textAlign: 'right',
              }}>
                {String(c).padStart(2, '0')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Themes module ──────────────────────────────────────────────────────
function ThemesModule({ posts }) {
  // Count posts per theme
  const counts = {};
  posts.filter(p => p.status === 'published').forEach(p => {
    counts[p.theme] = (counts[p.theme] || 0) + 1;
  });
  const total = Object.values(counts).reduce((s, v) => s + v, 0) || 1;

  return (
    <div style={{
      background: 'var(--bg-1)',
      border: '1px solid var(--line-1)',
      borderRadius: 3,
      padding: '18px 22px',
    }}>
      <div className="eyebrow" style={{ marginBottom: 14 }}>Voice · themes in play</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {window.LU_THEMES.map(t => {
          const c = counts[t.id] || 0;
          const pct = (c / total) * 100;
          return (
            <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 22px',
                                       gap: 10, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: `oklch(72% 0.05 ${t.color})`,
                }}/>
                <span style={{ fontSize: 12, color: 'var(--ink-2)',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.label}
                </span>
              </div>
              <div style={{ height: 3, background: 'var(--bg-3)', borderRadius: 1, overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%',
                  background: `oklch(72% 0.05 ${t.color})`,
                  opacity: 0.85, transition: 'width .35s',
                }}/>
              </div>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)', textAlign: 'right' }}>
                {String(c).padStart(2, '0')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Calendar module ────────────────────────────────────────────────────
function CalendarModule({ posts, selectedId, onSelect }) {
  // Show -28d to +14d as a single horizontal timeline
  const today = window.LU_TODAY;
  const start = new Date(today); start.setDate(start.getDate() - 28);
  const end   = new Date(today); end.setDate(end.getDate() + 14);
  const days = [];
  for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    days.push(new Date(dt));
  }

  // Bucket posts by day
  const postsByDay = {};
  posts.forEach(p => {
    if (!p.date) return;
    postsByDay[p.date] = postsByDay[p.date] || [];
    postsByDay[p.date].push(p);
  });

  // Ideas (no date)
  const ideas = posts.filter(p => !p.date);

  return (
    <div style={{
      background: 'var(--bg-1)',
      border: '1px solid var(--line-1)',
      borderRadius: 3,
      padding: '18px 22px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="eyebrow">Content calendar</div>
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--ink-3)' }}>
          <LegendDot label="Published" color="var(--ink-1)"/>
          <LegendDot label="Scheduled" color="var(--ink-2)" outlined/>
          <LegendDot label="Draft"     color="var(--ink-3)" dashed/>
          <LegendDot label="Idea"      color="var(--ink-4)"/>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', height: 96, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0,
          height: 1, background: 'var(--line-1)',
        }}/>
        {/* Today marker */}
        {(() => {
          const idx = days.findIndex(d => d.toISOString().slice(0, 10) === today.toISOString().slice(0, 10));
          const pct = (idx / (days.length - 1)) * 100;
          return (
            <>
              <div style={{
                position: 'absolute', top: 0, bottom: 0, left: `${pct}%`,
                width: 1, background: 'var(--ink-1)', opacity: 0.6,
              }}/>
              <div className="mono" style={{
                position: 'absolute', top: 2, left: `calc(${pct}% + 6px)`,
                fontSize: 9.5, color: 'var(--ink-1)', letterSpacing: '0.08em',
              }}>TODAY</div>
            </>
          );
        })()}

        {/* Day ticks */}
        {days.map((d, i) => {
          const pct = (i / (days.length - 1)) * 100;
          const isMonday = d.getDay() === 1;
          return (
            <div key={i} style={{
              position: 'absolute', top: 'calc(50% - 3px)', left: `${pct}%`,
              width: 1, height: isMonday ? 8 : 3,
              background: 'var(--line-2)',
              transform: 'translateX(-0.5px)',
            }}/>
          );
        })}

        {/* Post markers */}
        {Object.entries(postsByDay).map(([dateStr, dayPosts]) => {
          const dt = new Date(dateStr);
          const idx = days.findIndex(d => d.toISOString().slice(0, 10) === dateStr);
          if (idx < 0) return null;
          const pct = (idx / (days.length - 1)) * 100;
          return dayPosts.map((p, j) => {
            const isAbove = (j % 2 === 0);
            return (
              <PostMarker key={p.id} post={p}
                style={{
                  position: 'absolute', left: `${pct}%`,
                  [isAbove ? 'top' : 'bottom']: 4,
                  transform: 'translateX(-50%)',
                }}
                selected={p.id === selectedId} onClick={() => onSelect(p.id)}/>
            );
          });
        })}
      </div>

      {/* Month labels */}
      <div style={{ position: 'relative', height: 14 }}>
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const idx = Math.round(pct * (days.length - 1));
          const d = days[idx];
          return (
            <span key={i} className="mono" style={{
              position: 'absolute', left: `${pct * 100}%`,
              transform: pct === 0 ? 'none' : pct === 1 ? 'translateX(-100%)' : 'translateX(-50%)',
              fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.05em',
            }}>
              {d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }).toUpperCase()}
            </span>
          );
        })}
      </div>

      {/* Ideas inbox */}
      {ideas.length > 0 && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--line-1)' }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Ideas, undated</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ideas.map(p => (
              <button key={p.id} onClick={() => onSelect(p.id)} style={{
                appearance: 'none',
                padding: '5px 10px',
                background: p.id === selectedId ? 'var(--bg-3)' : 'var(--bg-2)',
                border: '1px dashed var(--line-2)', borderRadius: 999,
                fontSize: 11.5, color: 'var(--ink-2)', cursor: 'pointer',
                fontFamily: 'var(--sans)',
                transition: 'all .12s',
              }}>
                {p.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LegendDot({ label, color, outlined, dashed }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: outlined ? 'transparent' : color,
        border: outlined ? `1px solid ${color}` : dashed ? `1px dashed ${color}` : 'none',
      }}/>
      {label}
    </span>
  );
}

function PostMarker({ post, style, selected, onClick }) {
  const theme = window.LU_THEMES.find(t => t.id === post.theme);
  const color = theme ? `oklch(72% 0.05 ${theme.color})` : 'var(--ink-2)';
  const fmt = getFormat(post.format);
  const styles = {
    published: { bg: 'var(--ink-1)', border: 'var(--ink-1)', border_dash: false, glyph: 'var(--bg-0)' },
    scheduled: { bg: 'transparent', border: 'var(--ink-2)', border_dash: false, glyph: 'var(--ink-2)' },
    draft:     { bg: 'transparent', border: 'var(--ink-3)', border_dash: true,  glyph: 'var(--ink-3)' },
  }[post.status] || { bg: 'var(--ink-3)', border: 'var(--ink-3)', border_dash: false, glyph: 'var(--ink-3)' };

  const size = selected ? 18 : 14;
  return (
    <button onClick={onClick} title={`${fmt.label} · ${post.title}`}
      style={{
        appearance: 'none',
        width: size, height: size,
        borderRadius: '50%',
        background: styles.bg,
        border: `1.5px ${styles.border_dash ? 'dashed' : 'solid'} ${styles.border}`,
        boxShadow: selected ? `0 0 0 3px var(--bg-1), 0 0 0 4px ${color}` : 'none',
        padding: 0, cursor: 'pointer', transition: 'all .15s',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: styles.glyph,
        ...style,
      }}>
      <Icon name={fmt.icon} size={selected ? 10 : 8} stroke={1.8}/>
    </button>
  );
}

// ── Post editor ────────────────────────────────────────────────────────
function PostEditor({ post, onUpdate, instruction, setInstruction, generating, onGenerate }) {
  const theme = window.LU_THEMES.find(t => t.id === post.theme);
  const fmt = getFormat(post.format);
  const isPublished = post.status === 'published';

  const updFmt = (newFormat) => {
    const patch = { format: newFormat };
    if (newFormat === 'poll' && !post.pollOptions) {
      patch.pollOptions = ['', '', ''];
      patch.pollDuration = '1 week';
    }
    if (newFormat === 'reply' && post.sourceAuthor === undefined) {
      patch.sourceAuthor = '';
      patch.sourceQuote = '';
    }
    if (newFormat === 'update' && !post.updateKind) {
      patch.updateKind = 'Role change';
    }
    onUpdate({ ...post, ...patch });
  };

  return (
    <div style={{
      background: 'var(--bg-1)',
      border: '1px solid var(--line-1)',
      borderRadius: 3,
      display: 'grid', gridTemplateColumns: '1fr 340px',
      minHeight: 460,
    }}>
      {/* LEFT: post body */}
      <div style={{ padding: '20px 26px 22px', borderRight: '1px solid var(--line-1)',
                     display: 'flex', flexDirection: 'column' }}>
        {/* Format pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
          {POST_FORMATS.map(f => {
            const on = post.format === f.id;
            return (
              <button key={f.id} onClick={() => updFmt(f.id)} disabled={isPublished} title={f.hint}
                style={{
                  appearance: 'none',
                  padding: '6px 10px',
                  background: on ? 'var(--bg-3)' : 'transparent',
                  color: on ? 'var(--ink-1)' : 'var(--ink-3)',
                  border: '1px solid ' + (on ? 'var(--line-2)' : 'var(--line-1)'),
                  borderRadius: 999,
                  fontSize: 11.5, fontWeight: 500, cursor: isPublished ? 'default' : 'pointer',
                  opacity: isPublished && !on ? 0.4 : 1,
                  transition: 'all .12s',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  letterSpacing: '0.005em',
                }}
                onMouseEnter={(e) => { if (!on && !isPublished) { e.currentTarget.style.color = 'var(--ink-1)'; e.currentTarget.style.borderColor = 'var(--line-2)'; }}}
                onMouseLeave={(e) => { if (!on && !isPublished) { e.currentTarget.style.color = 'var(--ink-3)'; e.currentTarget.style.borderColor = 'var(--line-1)'; }}}>
                <Icon name={f.icon} size={11} stroke={1.6}/>
                {f.short}
              </button>
            );
          })}
        </div>

        {/* Status + theme + date strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 8px',
            border: '1px solid var(--line-2)', borderRadius: 999,
            fontSize: 10.5, color: 'var(--ink-2)',
            whiteSpace: 'nowrap',
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: theme ? `oklch(72% 0.05 ${theme.color})` : 'var(--ink-3)',
            }}/>
            {theme?.label}
          </span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.06em' }}>
            {post.status.toUpperCase()}
          </span>
          {post.date && (
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
              · {new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>

        {/* Format-specific lead-in row (reply source, update kind) */}
        {post.format === 'reply' && (
          <ReplySourceBlock post={post} onUpdate={onUpdate}/>
        )}
        {post.format === 'update' && (
          <UpdateKindBlock post={post} onUpdate={onUpdate}/>
        )}

        {/* Title — adapts per format */}
        <FormatTitle post={post} onUpdate={onUpdate}/>

        {/* Body / format-specific composition area */}
        <div style={{ flex: 1, marginTop: 12, position: 'relative', minHeight: 200 }}>
          {generating ? (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 14,
            }}>
              <LatticeAnim/>
              <div className="serif-italic" style={{ fontSize: 14, color: 'var(--ink-2)' }}>
                Drafting a {fmt.label.toLowerCase()} in your voice…
              </div>
            </div>
          ) : (
            <>
              <FormatBody post={post} onUpdate={onUpdate}/>
            </>
          )}
        </div>

        {!isPublished && (
          <div style={{
            paddingTop: 12, borderTop: '1px solid var(--line-1)', marginTop: 12,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Btn variant="outline" size="s">Schedule</Btn>
            <Btn variant="ghost" size="s">Save draft</Btn>
            <span style={{ flex: 1 }}/>
            <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
              {(post.body?.length || 0)} chars
            </span>
          </div>
        )}
      </div>

      {/* RIGHT: AI assistant or engagement */}
      <div style={{ padding: '22px 24px', background: 'var(--bg-0)',
                     display: 'flex', flexDirection: 'column' }}>
        {isPublished && post.engagement ? (
          <EngagementPanel engagement={post.engagement} post={post}/>
        ) : (
          <>
            <div className="eyebrow" style={{ marginBottom: 6 }}>AI draft</div>
            <div className="serif-italic" style={{
              fontSize: 13, color: 'var(--ink-3)', marginBottom: 12, lineHeight: 1.5,
            }}>
              {fmt.hint}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 14 }}>
              I will draft in <span style={{ color: 'var(--ink-1)' }}>your</span> voice — measured, executive-grade —
              shaped {/^[aeiou]/i.test(fmt.label) ? 'for an' : 'for a'} <span className="serif-italic">{fmt.label.toLowerCase()}</span>.
            </div>

            <div className="eyebrow" style={{ marginBottom: 8 }}>Instruction (optional)</div>
            <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)}
              placeholder={instructionPlaceholder(post.format)}
              rows={3}
              style={{
                width: '100%', padding: '8px 10px',
                background: 'var(--bg-1)', color: 'var(--ink-1)',
                border: '1px solid var(--line-1)', borderRadius: 3,
                fontFamily: 'var(--sans)', fontSize: 12.5, outline: 'none',
                resize: 'vertical', minHeight: 64, marginBottom: 12,
              }}/>

            <Btn variant="primary" icon={generating ? null : 'sparkles'} onClick={onGenerate} disabled={generating}>
              {generating ? 'Drafting…' : (post.body ? 'Regenerate' : `Draft ${fmt.label.toLowerCase()}`)}
            </Btn>

            <div style={{ flex: 1 }}/>

            <div style={{
              padding: '10px 12px', borderTop: '1px solid var(--line-1)', marginTop: 16,
              fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic',
              fontFamily: 'var(--serif)',
            }}>
              Nothing publishes itself. Every post needs your review.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function instructionPlaceholder(format) {
  return {
    article: 'e.g. "lead with a specific anecdote", "sharper opening", "more provocative"…',
    take: 'e.g. "more contrarian", "shorter and sharper", "name a real example"…',
    anecdote: 'e.g. "set the scene better", "more vulnerable", "land on a question"…',
    poll: 'e.g. "make options more polarizing", "rephrase question as challenge"…',
    reply: 'e.g. "add a counter-point", "warmer", "agree but extend"…',
    update: 'e.g. "more humble", "thank specific people", "name what comes next"…',
  }[format] || 'Optional shaping instruction…';
}

// ── Format-specific title field ────────────────────────────────────────
function FormatTitle({ post, onUpdate }) {
  const placeholders = {
    article:  'A title with an angle. Not a headline.',
    take:     'The take, in a sentence.',
    anecdote: 'The hook — what makes you stop scrolling.',
    poll:     'The question, posed sharply.',
    reply:    'Reply to [author] — your angle on it.',
    update:   'What changed?',
  };
  return (
    <textarea value={post.title}
      onChange={(e) => onUpdate({ ...post, title: e.target.value })}
      placeholder={placeholders[post.format] || 'Title'}
      rows={2}
      style={{
        width: '100%', padding: '6px 0',
        background: 'transparent', border: 'none', outline: 'none',
        color: 'var(--ink-1)', fontFamily: 'var(--serif)',
        fontSize: 24, fontWeight: 400, letterSpacing: '-0.018em', lineHeight: 1.2,
        resize: 'none',
      }}/>
  );
}

// ── Format-specific body area ──────────────────────────────────────────
function FormatBody({ post, onUpdate }) {
  if (post.format === 'poll') {
    return <PollBody post={post} onUpdate={onUpdate}/>;
  }
  // Article / take / anecdote / reply / update all use a textarea body,
  // with different placeholders & sizes
  const placeholders = {
    article: 'Open with the angle. Then the three things people miss. Then what to do about it…',
    take: 'One opinion, sharp. Two paragraphs of why. End with the question that earns the comments.',
    anecdote: 'Set the scene in one paragraph. Tell what happened. Land on what it taught you.',
    reply: 'The point you want to make. Reference what they said. Keep it short.',
    update: 'Announce what changed. Acknowledge who helped. Name what is next.',
  };
  return (
    <textarea value={post.body}
      onChange={(e) => onUpdate({ ...post, body: e.target.value })}
      placeholder={placeholders[post.format] || ''}
      style={{
        width: '100%', height: '100%', minHeight: 220,
        padding: '6px 0',
        background: 'transparent', border: 'none', outline: 'none',
        color: 'var(--ink-1)', fontFamily: 'var(--serif)',
        fontSize: 14.5, lineHeight: 1.65, resize: 'none',
        letterSpacing: '-0.003em',
      }}/>
  );
}

// ── Poll editor ────────────────────────────────────────────────────────
function PollBody({ post, onUpdate }) {
  const options = post.pollOptions || ['', '', ''];
  const updOpt = (i, v) => {
    const next = [...options];
    next[i] = v;
    onUpdate({ ...post, pollOptions: next });
  };
  const addOpt = () => onUpdate({ ...post, pollOptions: [...options, ''] });
  const removeOpt = (i) => onUpdate({ ...post, pollOptions: options.filter((_, j) => j !== i) });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Intro / framing */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Framing (optional)</div>
        <textarea value={post.body || ''}
          onChange={(e) => onUpdate({ ...post, body: e.target.value })}
          placeholder="One short paragraph of context above the poll — earns the engagement."
          rows={3}
          style={{
            width: '100%', padding: '8px 10px',
            background: 'var(--bg-2)', color: 'var(--ink-1)',
            border: '1px solid var(--line-1)', borderRadius: 3,
            fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.55, outline: 'none',
            resize: 'vertical', minHeight: 60,
            letterSpacing: '-0.003em',
          }}/>
      </div>

      {/* Options */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Options · 2 to 4</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {options.map((opt, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '22px 1fr 24px', gap: 8, alignItems: 'center',
            }}>
              <span className="mono" style={{
                fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.06em',
              }}>
                {String.fromCharCode(65 + i)}
              </span>
              <input value={opt} onChange={(e) => updOpt(i, e.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                style={{
                  width: '100%', height: 34, padding: '0 10px',
                  background: 'var(--bg-2)', color: 'var(--ink-1)',
                  border: '1px solid var(--line-1)', borderRadius: 3,
                  fontFamily: 'var(--sans)', fontSize: 13, outline: 'none',
                }}/>
              {options.length > 2 && (
                <button onClick={() => removeOpt(i)} title="Remove"
                  style={{
                    width: 24, height: 24, background: 'transparent', border: 'none',
                    color: 'var(--ink-3)', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <Icon name="close" size={11} stroke={1.6}/>
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 4 && (
          <button onClick={addOpt} style={{
            marginTop: 8, appearance: 'none', background: 'transparent',
            border: '1px dashed var(--line-2)', borderRadius: 3,
            color: 'var(--ink-3)', padding: '6px 12px', fontSize: 12,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="plus" size={11} stroke={1.6}/>
            Add option
          </button>
        )}
      </div>

      {/* Duration */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="eyebrow">Duration</span>
        <Select value={post.pollDuration || '1 week'}
          onChange={(v) => onUpdate({ ...post, pollDuration: v })}
          options={['1 day', '3 days', '1 week', '2 weeks']}
          style={{ width: 140 }}/>
      </div>
    </div>
  );
}

// ── Reply source block ─────────────────────────────────────────────────
function ReplySourceBlock({ post, onUpdate }) {
  return (
    <div style={{
      padding: '12px 14px', marginBottom: 14,
      background: 'var(--bg-2)',
      borderLeft: '2px solid var(--line-3)', borderRadius: '0 3px 3px 0',
    }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>Replying to</div>
      <input value={post.sourceAuthor || ''}
        onChange={(e) => onUpdate({ ...post, sourceAuthor: e.target.value })}
        placeholder="Original author"
        style={{
          width: '100%', background: 'transparent', border: 'none', outline: 'none',
          color: 'var(--ink-1)', fontSize: 13.5, fontWeight: 500,
          marginBottom: 4, padding: 0,
        }}/>
      <textarea value={post.sourceQuote || ''}
        onChange={(e) => onUpdate({ ...post, sourceQuote: e.target.value })}
        placeholder="Quote or paraphrase the part you're responding to…"
        rows={2}
        style={{
          width: '100%', padding: 0,
          background: 'transparent', border: 'none', outline: 'none',
          color: 'var(--ink-2)', fontFamily: 'var(--serif)',
          fontSize: 13.5, fontStyle: 'italic', lineHeight: 1.45,
          resize: 'none',
        }}/>
    </div>
  );
}

// ── Update kind block ──────────────────────────────────────────────────
function UpdateKindBlock({ post, onUpdate }) {
  const kinds = ['Role change', 'Board appointment', 'Milestone', 'Speaking engagement', 'Publication'];
  return (
    <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span className="eyebrow" style={{ marginRight: 4 }}>Kind</span>
      {kinds.map(k => {
        const on = post.updateKind === k;
        return (
          <button key={k} onClick={() => onUpdate({ ...post, updateKind: k })}
            style={{
              appearance: 'none', padding: '4px 10px',
              background: on ? 'var(--bg-3)' : 'transparent',
              color: on ? 'var(--ink-1)' : 'var(--ink-3)',
              border: '1px solid ' + (on ? 'var(--line-2)' : 'var(--line-1)'),
              borderRadius: 999, fontSize: 11.5, cursor: 'pointer',
              transition: 'all .12s',
            }}>
            {k}
          </button>
        );
      })}
    </div>
  );
}

// ── Format chooser modal ───────────────────────────────────────────────
function FormatChooser({ onPick, onClose }) {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
        zIndex: 200, animation: 'lu-fade-in .18s ease-out',
      }}/>
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 720, maxWidth: '92vw',
        background: 'var(--bg-1)',
        border: '1px solid var(--line-2)',
        borderRadius: 4, zIndex: 210,
        boxShadow: '0 30px 90px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column',
        animation: 'lu-modal-in .22s cubic-bezier(.2,.7,.3,1)',
      }}>
        <div style={{
          padding: '20px 24px 16px', borderBottom: '1px solid var(--line-1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>New post</div>
            <h3 className="serif" style={{
              margin: 0, fontSize: 22, fontWeight: 400, letterSpacing: '-0.014em',
            }}>
              Pick a format
            </h3>
          </div>
          <button onClick={onClose} aria-label="Close"
            style={{
              width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: '1px solid var(--line-1)', borderRadius: 3,
              color: 'var(--ink-2)', cursor: 'pointer',
            }}>
            <Icon name="close" size={14} stroke={1.4}/>
          </button>
        </div>

        <div style={{
          padding: '18px 24px 24px',
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
        }}>
          {POST_FORMATS.map(f => (
            <button key={f.id} onClick={() => onPick(f.id)}
              style={{
                appearance: 'none', textAlign: 'left',
                background: 'var(--bg-2)', border: '1px solid var(--line-1)',
                borderRadius: 3, padding: '16px 18px',
                cursor: 'pointer', transition: 'all .12s',
                display: 'flex', alignItems: 'flex-start', gap: 14,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.borderColor = 'var(--line-3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-2)'; e.currentTarget.style.borderColor = 'var(--line-1)'; }}>
              <div style={{
                width: 36, height: 36, borderRadius: 3,
                background: 'var(--bg-3)', border: '1px solid var(--line-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--ink-1)', flex: '0 0 36px',
              }}>
                <Icon name={f.icon} size={16} stroke={1.5}/>
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="serif" style={{
                  fontSize: 16, fontWeight: 400, letterSpacing: '-0.012em',
                  color: 'var(--ink-1)', marginBottom: 4,
                }}>
                  {f.label}
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5,
                }}>
                  {f.hint}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes lu-modal-in {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.985); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}

function EngagementPanel({ engagement, post }) {
  const isPoll = post?.format === 'poll' && engagement.votes;
  return (
    <>
      <div className="eyebrow" style={{ marginBottom: 12 }}>Engagement</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <BigStat label="Impressions" value={engagement.impressions.toLocaleString()}/>
        <div style={{ borderTop: '1px solid var(--line-1)', paddingTop: 14,
                       display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <BigStat label="Reactions" value={engagement.reactions} small/>
          <BigStat label="Comments" value={engagement.comments} small/>
        </div>
        {isPoll && (
          <div style={{ borderTop: '1px solid var(--line-1)', paddingTop: 14 }}>
            <BigStat label="Votes" value={engagement.votes.toLocaleString()}/>
            <PollResultBars options={post.pollOptions} totalVotes={engagement.votes}/>
          </div>
        )}
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{ paddingTop: 14, borderTop: '1px solid var(--line-1)' }}>
        <Btn variant="ghost" size="s">Boost in calendar</Btn>
      </div>
    </>
  );
}

function PollResultBars({ options, totalVotes }) {
  // Synthesise plausible distribution
  if (!options) return null;
  const weights = [0.34, 0.28, 0.22, 0.16].slice(0, options.length);
  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {options.map((o, i) => {
        const pct = weights[i] || 0.05;
        const votes = Math.round(totalVotes * pct);
        return (
          <div key={i}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 11, color: 'var(--ink-2)', marginBottom: 4,
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{o}</span>
              <span className="mono">{Math.round(pct * 100)}%</span>
            </div>
            <div style={{ height: 3, background: 'var(--bg-3)', borderRadius: 1, overflow: 'hidden' }}>
              <div style={{
                width: `${pct * 100}%`, height: '100%',
                background: i === 0 ? 'var(--ink-1)' : 'var(--ink-3)',
                opacity: i === 0 ? 1 : 0.6,
              }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BigStat({ label, value, small }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 4 }}>{label}</div>
      <div className="serif" style={{
        fontSize: small ? 22 : 32, fontWeight: 400, letterSpacing: '-0.022em',
        color: 'var(--ink-1)', lineHeight: 1,
      }}>
        {value}
      </div>
    </div>
  );
}

// Mock post composition — returns a patch with body (and format-specific fields)
function composePost(post, theme, instruction) {
  const tone = (instruction || '').toLowerCase();
  const format = post.format || 'article';

  if (format === 'poll') {
    return {
      body: `${tone.includes('challenge') ? 'A question that will split the room: ' : 'Curious where peers actually land on this.\n\n'}After twenty-five years of watching this same debate play out in board rooms, my own view is changing. The data has moved. The risk has shifted. The right answer two years ago is no longer the right answer.\n\nWhich of these do you think is the most under-governed today?`,
      pollOptions: post.pollOptions?.some(o => o) ? post.pollOptions : [
        'Third-party vendor AI',
        'Internal employee usage',
        'Customer-facing chatbots',
        'Decision-support tools',
      ],
      pollDuration: post.pollDuration || '1 week',
    };
  }

  if (format === 'reply') {
    const author = post.sourceAuthor?.split(' ')[0] || 'there';
    return {
      body: `${author} — your read here lined up with what I have been seeing across the last few diligences.\n\nThe part I would push back on, gently: ${tone.includes('counter') ? 'the framing leaves out a structural issue with the integrator\'s incentive, which I think changes the whole shape of the problem.' : 'this only works when the CEO actually owns the timeline. When they delegate it, the three things you describe collapse into the same failure mode.'}\n\nWould value a longer conversation on this — I have run into this pattern three times in twelve months and I am still not sure I have it right.`,
    };
  }

  if (format === 'update') {
    const kind = post.updateKind || 'milestone';
    return {
      body: `${tone.includes('humble') ? 'A quiet note: ' : ''}I am joining ${kind === 'Board appointment' ? 'the board of a company I have admired for years' : 'a new chapter'}.\n\nTwo people without whom this would not have happened: [name] and [name]. The kind of generosity neither asked credit for. I am grateful.\n\nWhat comes next: ${kind === 'Board appointment' ? 'audit committee work and a focused engagement on cyber governance' : 'continuing the work I care about, with more focus'}. Will write properly in a month once I have something to say beyond the announcement.\n\nIf this resonates and you want to compare notes, my inbox is open.`,
    };
  }

  if (format === 'anecdote') {
    return {
      body: `${tone.includes('vulnerable') ? 'I will admit it: I got this wrong for a decade.\n\n' : ''}Three weeks ago a CEO called me from a parking lot. Their board had just rejected the AI strategy paper. The CEO was furious. The board was right.\n\nWhat I learned in that conversation — and I am still learning — is that ${theme?.label?.toLowerCase() || 'this work'} is mostly about the decision rights nobody wrote down. The board does not want a strategy. They want to know who decides what, by when, with what evidence.\n\nWhich is harder than it sounds.\n\n${tone.includes('question') ? 'What is the one decision right your team is still not clear on?' : 'Curious whether others have walked into the same conversation.'}`,
    };
  }

  if (format === 'take') {
    return {
      body: `${tone.includes('contrarian') ? 'A position I will keep holding: ' : ''}${post.title || `${theme?.label || 'This'} is missing the point.`}\n\nMost senior leaders treat ${theme?.label?.toLowerCase() || 'this'} as a process problem. It is not. It is a permission problem. The people closest to the work already know what should happen — they are waiting for someone with enough title to say the words.\n\n${tone.includes('example') ? 'Specific example: at a recent client, four engineers had flagged the same risk for eighteen months. The fix was a one-week project. The blocker was a single conversation no one was authorized to have.\n\n' : ''}Worth a comment if this is your experience too.`,
    };
  }

  // Article (default)
  return {
    body: `Most conversations in this space stop at the principle. Boards adopt a policy. Executives approve a framework. The vendor presents a slide deck. Then nothing happens — or worse, the wrong thing happens slowly, for eighteen months.

Here is what I have actually seen work, twice this year:

  — First: name the decision rights explicitly. Who can say yes, who can say no, who is informed, who is consulted. A one-page RACI for ${(theme?.label || 'this').toLowerCase()} is worth more than a fifty-page policy.

  — Second: read the smallest version of the problem. Find the one customer interaction, the one supplier contract, the one operational decision where this principle bites. Walk it through, end to end. Then generalise.

  — Third: do not delegate the hard conversation. The board has hired senior people because the hard conversation is the job.

None of this is novel. All of it is missing from the average response to ${(theme?.label || 'this').toLowerCase()}. Which is why I keep writing about it.

${tone.includes('short') ? '' : 'Curious to hear what others are seeing. The pattern is, I think, generalisable — but only because senior leaders keep doing the same three things wrong.'}`,
  };
}

Object.assign(window, { BrandView });
