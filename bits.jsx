// Level Up — shared primitives (icons, stars, persona tag, due chip, fit, etc.)

// ── Icons ──────────────────────────────────────────────────────────────────
function Icon({ name, size = 16, stroke = 1.5, style }) {
  const props = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: stroke,
    strokeLinecap: 'round', strokeLinejoin: 'round', style,
  };
  switch (name) {
    case 'dashboard':
      return <svg {...props}>
        <rect x="3" y="3" width="7" height="9" rx="1"/>
        <rect x="14" y="3" width="7" height="5" rx="1"/>
        <rect x="14" y="12" width="7" height="9" rx="1"/>
        <rect x="3" y="16" width="7" height="5" rx="1"/>
      </svg>;
    case 'pipeline':
      return <svg {...props}>
        <rect x="3"  y="4" width="4" height="16" rx="0.5"/>
        <rect x="10" y="4" width="4" height="10" rx="0.5"/>
        <rect x="17" y="4" width="4" height="13" rx="0.5"/>
      </svg>;
    case 'personas':
      return <svg {...props}>
        <circle cx="9" cy="9" r="3"/>
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
        <circle cx="17" cy="7" r="2.2"/>
        <path d="M14 13c3 0 6 1.8 6 6"/>
      </svg>;
    case 'network':
      return <svg {...props}>
        <circle cx="5" cy="6" r="2"/>
        <circle cx="19" cy="6" r="2"/>
        <circle cx="12" cy="13" r="2.2"/>
        <circle cx="6" cy="19" r="2"/>
        <circle cx="18" cy="19" r="2"/>
        <path d="M7 7l3.5 4.5M17 7l-3.5 4.5M11 14.5 7.5 18M13 14.5l3.5 3.5"/>
      </svg>;
    case 'brand':
      return <svg {...props}>
        <path d="M4 4v16M4 4h10l-2 4 2 4H4M4 14h7"/>
      </svg>;
    case 'search':
      return <svg {...props}><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'plus':
      return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'close':
      return <svg {...props}><path d="M6 6l12 12M18 6 6 18"/></svg>;
    case 'arrow-right':
      return <svg {...props}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case 'arrow-left':
      return <svg {...props}><path d="M19 12H5M11 18l-6-6 6-6"/></svg>;
    case 'sparkles':
      return <svg {...props}>
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>
      </svg>;
    case 'copy':
      return <svg {...props}>
        <rect x="9" y="9" width="11" height="11" rx="1.5"/>
        <path d="M5 15V5a1 1 0 0 1 1-1h10"/>
      </svg>;
    case 'check':
      return <svg {...props}><path d="M4 12.5 9 17.5 20 6.5"/></svg>;
    case 'chevron-down':
      return <svg {...props}><path d="m6 9 6 6 6-6"/></svg>;
    case 'chevron-right':
      return <svg {...props}><path d="m9 6 6 6-6 6"/></svg>;
    case 'circle-dot':
      return <svg {...props}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg>;
    case 'edit':
      return <svg {...props}><path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="m14 6 4 4"/></svg>;
    case 'star':
      return <svg {...props} fill="currentColor" stroke="none">
        <path d="M12 2.5 14.6 8.8l6.4.5-4.9 4.2 1.5 6.3L12 16.5l-5.6 3.3 1.5-6.3L3 9.3l6.4-.5L12 2.5z"/>
      </svg>;
    case 'star-empty':
      return <svg {...props}><path d="M12 2.5 14.6 8.8l6.4.5-4.9 4.2 1.5 6.3L12 16.5l-5.6 3.3 1.5-6.3L3 9.3l6.4-.5L12 2.5z"/></svg>;
    case 'dot':
      return <svg {...props} fill="currentColor" stroke="none"><circle cx="12" cy="12" r="3"/></svg>;
    case 'send':
      return <svg {...props}><path d="m4 12 16-8-6 16-2.5-6.5L4 12z"/></svg>;
    case 'article':
      return <svg {...props}>
        <path d="M5 4h14v16H5z"/>
        <path d="M8 8h8M8 12h8M8 16h5"/>
      </svg>;
    case 'reply':
      return <svg {...props}>
        <path d="M9 10 4 14l5 4"/>
        <path d="M4 14h11a5 5 0 0 1 5 5v1"/>
      </svg>;
    case 'poll':
      return <svg {...props}>
        <rect x="4" y="14" width="4" height="6"/>
        <rect x="10" y="9" width="4" height="11"/>
        <rect x="16" y="4" width="4" height="16"/>
      </svg>;
    case 'quote':
      return <svg {...props}>
        <path d="M7 7v6a4 4 0 0 1-4 4M17 7v6a4 4 0 0 1-4 4"/>
      </svg>;
    case 'flag':
      return <svg {...props}>
        <path d="M5 21V4M5 4h12l-2.5 4L17 12H5"/>
      </svg>;
    case 'spark':
      return <svg {...props}>
        <path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M5.6 18.4l4.2-4.2M14.2 9.8l4.2-4.2"/>
      </svg>;
    case 'settings':
      return <svg {...props}>
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>;
    case 'key':
      return <svg {...props}>
        <circle cx="8" cy="15" r="4"/>
        <path d="M10.85 12.15 19 4M18 6l3 3M15 9l3 3"/>
      </svg>;
    case 'trash':
      return <svg {...props}>
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"/>
      </svg>;
    case 'eye':
      return <svg {...props}>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>;
    case 'eye-off':
      return <svg {...props}>
        <path d="M9.88 4.24A10 10 0 0 1 12 4c6.5 0 10 7 10 7-.78 1.55-1.83 3-3.12 4.16M6.7 6.7C4.3 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.49-.53 4.95-1.41M1 1l22 22M14.12 9.88a3 3 0 1 1-4.24 4.24"/>
      </svg>;
    default:
      return null;
  }
}

// ── Persona tag ─────────────────────────────────────────────────────────────
function PersonaTag({ personaId, size = 's' }) {
  const p = window.LU_PERSONAS.find(x => x.id === personaId);
  if (!p) return null;
  const dims = size === 'l'
    ? { fs: 12, pad: '4px 9px', font: 'var(--mono)' }
    : { fs: 10.5, pad: '2px 7px', font: 'var(--mono)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: dims.font, fontSize: dims.fs, fontWeight: 500,
      letterSpacing: '0.04em', color: 'var(--ink-2)',
      padding: dims.pad,
      border: '1px solid var(--line-2)', borderRadius: 3,
      whiteSpace: 'nowrap', lineHeight: 1.2,
    }}>
      <span style={{ color: 'var(--ink-4)' }}>{p.code}</span>
      <span>{p.name}</span>
    </span>
  );
}

function PersonaDot({ personaId, size = 8 }) {
  const idx = window.LU_PERSONAS.findIndex(x => x.id === personaId);
  // Each persona gets a slot on a quiet hue ring — used as tiny indicator dots
  const hues = [250, 280, 170, 80, 30, 200];
  const c = `oklch(70% 0.05 ${hues[idx] ?? 0})`;
  return <span style={{
    display: 'inline-block', width: size, height: size,
    borderRadius: '50%', background: c, flex: '0 0 auto',
  }} />;
}

// ── Stage indicator ─────────────────────────────────────────────────────────
function stageColor(stageId) {
  const map = {
    discovered: 'var(--st-discovered)',
    evaluating: 'var(--st-evaluating)',
    applied: 'var(--st-applied)',
    conversations: 'var(--st-conversations)',
    decision: 'var(--st-decision)',
  };
  return map[stageId] || 'var(--ink-3)';
}

function StageBar({ stageId, style }) {
  return <div style={{
    height: 1, width: '100%', background: stageColor(stageId),
    opacity: 0.55, ...style,
  }} />;
}

// ── Fit score (1–5 stars) ──────────────────────────────────────────────────
function FitStars({ value = 0, size = 11, interactive = false, onChange }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2,
                   color: 'var(--ink-2)', lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map(n => {
        const filled = n <= value;
        return (
          <span key={n}
            onClick={interactive ? () => onChange?.(n) : undefined}
            style={{
              cursor: interactive ? 'pointer' : 'default',
              color: filled ? 'var(--ink-1)' : 'var(--ink-4)',
              display: 'inline-flex',
            }}>
            <Icon name={filled ? 'star' : 'star-empty'} size={size} stroke={1.4}/>
          </span>
        );
      })}
    </span>
  );
}

// ── Due date chip ──────────────────────────────────────────────────────────
function dueState(dueDateStr) {
  if (!dueDateStr) return null;
  const today = window.LU_TODAY;
  const d = new Date(dueDateStr);
  const t = new Date(today);
  const diffDays = Math.round((d - t) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { kind: 'overdue', days: diffDays, label: `${-diffDays}d overdue` };
  if (diffDays === 0) return { kind: 'today', days: 0, label: 'Today' };
  if (diffDays === 1) return { kind: 'soon', days: 1, label: 'Tomorrow' };
  if (diffDays <= 3) return { kind: 'soon', days: diffDays, label: `${diffDays}d` };
  return { kind: 'future', days: diffDays, label: `${diffDays}d` };
}

function DueChip({ dueDate, mode = 'inline' }) {
  const s = dueState(dueDate);
  if (!s) return null;
  const palette = {
    overdue: { fg: 'var(--signal)', bg: 'transparent', dot: 'var(--signal)' },
    today:   { fg: 'var(--ink-1)', bg: 'transparent', dot: 'var(--ink-1)' },
    soon:    { fg: 'var(--ink-2)', bg: 'transparent', dot: 'var(--ink-3)' },
    future:  { fg: 'var(--ink-3)', bg: 'transparent', dot: 'var(--ink-4)' },
  }[s.kind];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 500,
      letterSpacing: '0.02em', color: palette.fg, lineHeight: 1.2,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%', background: palette.dot,
        display: 'inline-block',
      }}/>
      {s.label}
    </span>
  );
}

// ── Contact warmth dot ─────────────────────────────────────────────────────
function WarmthDot({ warmth }) {
  if (!warmth) return null;
  const c = {
    strong:   'var(--ink-1)',
    warm:     'var(--ink-2)',
    cold:     'var(--ink-4)',
    recruiter:'var(--ink-3)',
  }[warmth] || 'var(--ink-4)';
  return <span style={{
    width: 6, height: 6, borderRadius: '50%', background: c,
    display: 'inline-block', flex: '0 0 auto',
  }}/>;
}

// ── Button ─────────────────────────────────────────────────────────────────
function Btn({ children, variant = 'ghost', size = 'm', icon, onClick, style, type, disabled }) {
  const sizeStyle = {
    s: { h: 24, fs: 12, pad: '0 8px', gap: 5, iconSize: 12 },
    m: { h: 30, fs: 12.5, pad: '0 11px', gap: 6, iconSize: 13 },
    l: { h: 36, fs: 13, pad: '0 14px', gap: 7, iconSize: 14 },
  }[size];
  const variants = {
    primary: {
      background: 'var(--ink-1)', color: 'var(--bg-0)',
      border: '1px solid var(--ink-1)',
    },
    secondary: {
      background: 'var(--bg-2)', color: 'var(--ink-1)',
      border: '1px solid var(--line-2)',
    },
    ghost: {
      background: 'transparent', color: 'var(--ink-2)',
      border: '1px solid transparent',
    },
    outline: {
      background: 'transparent', color: 'var(--ink-1)',
      border: '1px solid var(--line-2)',
    },
  };
  return (
    <button type={type || 'button'} onClick={onClick} disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: sizeStyle.gap, height: sizeStyle.h, padding: sizeStyle.pad,
        fontSize: sizeStyle.fs, fontWeight: 500, letterSpacing: '0.005em',
        borderRadius: 4, lineHeight: 1, transition: 'all .12s',
        opacity: disabled ? 0.4 : 1, ...variants[variant], ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (variant === 'ghost') e.currentTarget.style.background = 'var(--bg-2)';
        if (variant === 'secondary') e.currentTarget.style.background = 'var(--bg-3)';
        if (variant === 'outline') e.currentTarget.style.background = 'var(--bg-2)';
        if (variant === 'primary') e.currentTarget.style.background = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = variants[variant].background;
      }}>
      {icon && <Icon name={icon} size={sizeStyle.iconSize} stroke={1.6}/>}
      {children}
    </button>
  );
}

// ── Field (input wrapper) ──────────────────────────────────────────────────
function Field({ label, hint, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && <div className="eyebrow">{label}</div>}
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>{hint}</div>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, style }) {
  return (
    <input type="text" value={value || ''} onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', height: 32, padding: '0 10px',
        background: 'var(--bg-1)', color: 'var(--ink-1)',
        border: '1px solid var(--line-1)', borderRadius: 3,
        fontFamily: 'var(--sans)', fontSize: 13, outline: 'none',
        transition: 'border-color .12s',
        ...style,
      }}
      onFocus={(e) => e.currentTarget.style.borderColor = 'var(--line-3)'}
      onBlur={(e) => e.currentTarget.style.borderColor = 'var(--line-1)'}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3, style }) {
  return (
    <textarea value={value || ''} onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder} rows={rows}
      style={{
        width: '100%', padding: '8px 10px',
        background: 'var(--bg-1)', color: 'var(--ink-1)',
        border: '1px solid var(--line-1)', borderRadius: 3,
        fontFamily: 'var(--sans)', fontSize: 13, lineHeight: 1.55,
        outline: 'none', resize: 'vertical', minHeight: 40,
        transition: 'border-color .12s',
        ...style,
      }}
      onFocus={(e) => e.currentTarget.style.borderColor = 'var(--line-3)'}
      onBlur={(e) => e.currentTarget.style.borderColor = 'var(--line-1)'}
    />
  );
}

function Select({ value, onChange, options, style }) {
  return (
    <select value={value} onChange={(e) => onChange?.(e.target.value)}
      style={{
        width: '100%', height: 32, padding: '0 10px',
        background: 'var(--bg-1)', color: 'var(--ink-1)',
        border: '1px solid var(--line-1)', borderRadius: 3,
        fontFamily: 'var(--sans)', fontSize: 13, outline: 'none',
        appearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%23A6A39C' d='M0 0h10L5 6z'/></svg>")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
        paddingRight: 28,
        ...style,
      }}>
      {options.map(o => {
        const v = typeof o === 'object' ? o.value : o;
        const l = typeof o === 'object' ? o.label : o;
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
  );
}

// ── Job intel (from the LinkedIn job page) ─────────────────────────────────
const introLink = { color: 'var(--ink-1)', textDecoration: 'underline', textDecorationColor: 'var(--line-2)', textUnderlineOffset: 3 };

function JobIntel({ enrichment }) {
  if (!enrichment) return null;
  const e = enrichment;
  const hm = e.hiringManager;
  const rows = [
    ['Location', [e.location, e.workplace].filter(Boolean).join(' · ')],
    ['Size', e.companySize ? e.companySize + (e.companySizeEstimated ? ' (estimate)' : '') : null],
    ['Industry', e.industry],
  ].filter(r => r[1]);
  return (
    <div style={{ border: '1px solid var(--line-1)', borderRadius: 3, padding: '12px 14px', background: 'var(--bg-2)' }}>
      {e.summary && (
        <div className="serif-italic" style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: rows.length || hm ? 10 : 0 }}>
          {e.summary}
        </div>
      )}
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 10, fontSize: 12.5, padding: '3px 0' }}>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase', paddingTop: 2 }}>{k}</span>
          <span style={{ color: 'var(--ink-1)' }}>{v}</span>
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 10, fontSize: 12.5, padding: '3px 0' }}>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase', paddingTop: 2 }}>Hiring mgr</span>
        <span style={{ color: hm ? 'var(--ink-1)' : 'var(--ink-3)' }}>
          {hm ? <>
            {hm.url ? <a href={hm.url} target="_blank" rel="noopener noreferrer" style={introLink}>{hm.name}</a> : hm.name}
            {hm.title && <span style={{ color: 'var(--ink-3)' }}> · {hm.title}</span>}
            {hm.degree && <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', marginLeft: 8 }}>{hm.degree}</span>}
          </> : 'Not named on the posting'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 12 }}>
        {e.jobUrl && <a href={e.jobUrl} target="_blank" rel="noopener noreferrer" style={introLink}>Job on LinkedIn ↗</a>}
        {e.companyUrl && <a href={e.companyUrl} target="_blank" rel="noopener noreferrer" style={introLink}>Company on LinkedIn ↗</a>}
      </div>
    </div>
  );
}

// ── People Dhruv knows at a company (from Network contacts) ────────────────
function NetworkAt({ company, hiringManager }) {
  const [showAll, setShowAll] = React.useState(false);
  if (!window.LU_NETWORK_FOR) return null;
  if (!company) return <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Add the company name to see who you know there.</div>;
  const { atCompany, knowsHiringManager } = window.LU_NETWORK_FOR(company, hiringManager && hiringManager.name);
  const list = showAll ? atCompany : atCompany.slice(0, 5);
  const hasLinkedIn = (window.LU_CONTACTS || []).some(c => c.source === 'LinkedIn');
  return (
    <div>
      {knowsHiringManager && (
        <div style={{ fontSize: 12.5, color: 'var(--ink-1)', marginBottom: 8 }}>
          You already know the hiring manager — <b>{knowsHiringManager.name}</b> is in your contacts.
        </div>
      )}
      {atCompany.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          No one in your contacts lists {company} as their company.
          {!hasLinkedIn && ' Upload your LinkedIn connections in Settings to widen this.'}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--line-1)', borderRadius: 3 }}>
          {list.map((c, i) => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              borderTop: i ? '1px solid var(--line-1)' : 'none', fontSize: 12.5,
            }}>
              <WarmthDot warmth={c.strength}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ color: 'var(--ink-1)' }}>
                  {c.linkedinUrl ? <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" style={introLink}>{c.name}</a> : c.name}
                </span>
                {c.title && <span style={{ color: 'var(--ink-3)' }}> · {c.title}</span>}
              </div>
              {c.email && <a href={'mailto:' + c.email} style={{ ...introLink, fontSize: 11.5 }}>Email</a>}
            </div>
          ))}
          {atCompany.length > 5 && (
            <button onClick={() => setShowAll(!showAll)} style={{
              width: '100%', padding: '7px 12px', background: 'transparent', border: 'none',
              borderTop: '1px solid var(--line-1)', color: 'var(--ink-3)', fontSize: 12, textAlign: 'left', cursor: 'pointer',
            }}>{showAll ? 'Show fewer' : `Show all ${atCompany.length}`}</button>
          )}
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  Icon, PersonaTag, PersonaDot, stageColor, StageBar,
  FitStars, DueChip, dueState, WarmthDot,
  Btn, Field, TextInput, TextArea, Select,
  JobIntel, NetworkAt,
});
