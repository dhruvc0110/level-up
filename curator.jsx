// Level Up — Persona Curator (slide-over)
// Focused workflow for building a persona AND its voice.
// Left: identity + positioning + voice + targeting. Right: live voice preview.

const TONE_DESCRIPTORS = [
  'Measured', 'Direct', 'Warm', 'Dry', 'Plainspoken', 'Polished',
  'Confident', 'Considered', 'Contrarian', 'Technical', 'Light',
  'Patient', 'Sharp', 'Quiet', 'Witty', 'Senior',
];

const RHYTHM_OPTIONS = [
  { value: 'terse', label: 'Terse' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'longform', label: 'Long-form' },
];

const PREVIEW_SCENARIOS = [
  { id: 'recruiter', label: 'Recruiter outreach', icon: 'send' },
  { id: 'cold', label: 'Cold email to CEO', icon: 'arrow-right' },
  { id: 'linkedin', label: 'LinkedIn post opener', icon: 'sparkles' },
  { id: 'bio', label: 'Short bio paragraph', icon: 'edit' },
];

function PersonaCurator({ persona, onClose, onSave }) {
  const isNew = !persona?.id;
  const [draft, setDraft] = React.useState(() => ({
    id: persona?.id || 'pers-' + Math.random().toString(36).slice(2, 7),
    code: persona?.code || 'P-0' + (window.LU_PERSONAS.length + 1),
    name: persona?.name || '',
    positioning: persona?.positioning || '',
    skills: persona?.skills || [],
    companySize: persona?.companySize || '',
    targetSectors: persona?.targetSectors || [],
    tone: persona?.tone || '',
    // Voice fields (new)
    toneDescriptors: persona?.toneDescriptors || ['Measured', 'Direct'],
    rhythm: persona?.rhythm || 'balanced',
    useWords: persona?.useWords || [],
    avoidWords: persona?.avoidWords || [],
    writingSamples: persona?.writingSamples || ['', '', ''],
    opportunities: persona?.opportunities || 0,
  }));
  const [scenario, setScenario] = React.useState('recruiter');
  const [previewGenerating, setPreviewGenerating] = React.useState(false);
  const [previewText, setPreviewText] = React.useState('');

  // Body scroll lock
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Auto-generate preview when key voice attributes change (debounced)
  React.useEffect(() => {
    if (!draft.name) return;
    const t = setTimeout(() => regeneratePreview(false), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [draft.toneDescriptors, draft.rhythm, draft.useWords, draft.avoidWords, scenario, draft.positioning]);

  const upd = (k, v) => setDraft(s => ({ ...s, [k]: v }));

  const regeneratePreview = (showLoading = true) => {
    if (showLoading) {
      setPreviewGenerating(true);
      setTimeout(() => {
        setPreviewText(composeVoicePreview(draft, scenario));
        setPreviewGenerating(false);
      }, 1100);
    } else {
      setPreviewText(composeVoicePreview(draft, scenario));
    }
  };

  const save = () => {
    onSave({ ...draft });
    onClose();
  };

  const completeness = computeCompleteness(draft);

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
        zIndex: 90, animation: 'lu-fade-in .18s ease-out',
      }}/>
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(1240px, 94vw)',
        background: 'var(--bg-1)',
        borderLeft: '1px solid var(--line-2)',
        zIndex: 100,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-30px 0 60px rgba(0,0,0,0.4)',
        animation: 'lu-slide-in .22s cubic-bezier(.2,.7,.3,1)',
      }}>
        {/* Header */}
        <CuratorHeader draft={draft} isNew={isNew} completeness={completeness}
                       onClose={onClose} onSave={save}/>

        {/* Body — split */}
        <div style={{
          flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
          minHeight: 0,
        }}>
          {/* LEFT — curation form */}
          <div style={{
            overflow: 'auto', padding: '20px 28px 32px',
            borderRight: '1px solid var(--line-1)',
          }}>
            <Section eyebrow="01 · Identity" title="Who is this persona?">
              <FieldRow>
                <Field label="Persona name">
                  <TextInput value={draft.name} onChange={(v) => upd('name', v)}
                    placeholder="e.g. Enterprise CIO"/>
                </Field>
                <Field label="Code">
                  <TextInput value={draft.code} onChange={(v) => upd('code', v)}/>
                </Field>
              </FieldRow>
            </Section>

            <Section eyebrow="02 · Positioning" title="The story you tell">
              <Field hint="The paragraph this persona walks into a room with. AI drafts will pull from this directly.">
                <TextArea value={draft.positioning} onChange={(v) => upd('positioning', v)} rows={5}
                  placeholder="Twenty-five-year operator. Have run technology for two Fortune 500s through full modernization cycles…"/>
              </Field>
            </Section>

            <Section eyebrow="03 · Voice" title="How this persona sounds">
              <Field label="Tone descriptors" hint="Pick 3 to 5. These set the temperature of every draft.">
                <TonePicker value={draft.toneDescriptors}
                  onChange={(v) => upd('toneDescriptors', v)}/>
              </Field>

              <Field label="Sentence rhythm">
                <RhythmControl value={draft.rhythm} onChange={(v) => upd('rhythm', v)}/>
              </Field>

              <FieldRow>
                <Field label="Vocabulary — use" hint="Words this persona reaches for.">
                  <TagInput value={draft.useWords} onChange={(v) => upd('useWords', v)}
                    placeholder="press enter to add"/>
                </Field>
                <Field label="Vocabulary — avoid" hint="Words this persona never uses.">
                  <TagInput value={draft.avoidWords} onChange={(v) => upd('avoidWords', v)}
                    placeholder="press enter to add"/>
                </Field>
              </FieldRow>

              <Field label="Writing samples" hint="Paste 1–3 paragraphs you have actually written in this voice. AI will learn from rhythm, word choice, sentence shape.">
                <SamplesEditor value={draft.writingSamples}
                  onChange={(v) => upd('writingSamples', v)}/>
              </Field>
            </Section>

            <Section eyebrow="04 · Targeting" title="Where this persona plays">
              <FieldRow>
                <Field label="Company size">
                  <TextInput value={draft.companySize} onChange={(v) => upd('companySize', v)}
                    placeholder="e.g. Fortune 1000"/>
                </Field>
                <Field label="Sectors">
                  <TagInput value={draft.targetSectors} onChange={(v) => upd('targetSectors', v)}
                    placeholder="press enter to add"/>
                </Field>
              </FieldRow>
              <Field label="Skills to lead with" hint="Top 3 surface in outreach drafts.">
                <TagInput value={draft.skills} onChange={(v) => upd('skills', v)}
                  placeholder="press enter to add"/>
              </Field>
            </Section>
          </div>

          {/* RIGHT — live voice preview */}
          <div style={{
            overflow: 'auto', background: 'var(--bg-0)',
            display: 'flex', flexDirection: 'column',
          }}>
            <PreviewPane draft={draft}
              scenario={scenario} setScenario={setScenario}
              text={previewText} generating={previewGenerating}
              onRegenerate={() => regeneratePreview(true)}/>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes lu-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes lu-slide-in { from { transform: translateX(20px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
      `}</style>
    </>
  );
}

// ── Header ─────────────────────────────────────────────────────────────
function CuratorHeader({ draft, isNew, completeness, onClose, onSave }) {
  return (
    <div style={{
      padding: '20px 28px 18px',
      borderBottom: '1px solid var(--line-1)',
      flex: '0 0 auto',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24,
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span className="eyebrow">Persona curation</span>
          <span style={{ width: 1, height: 10, background: 'var(--line-2)' }}/>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.06em' }}>
            {draft.code}
          </span>
          <span style={{ width: 1, height: 10, background: 'var(--line-2)' }}/>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
            {isNew ? 'NEW' : 'EDITING'}
          </span>
        </div>
        <h2 className="serif" style={{
          margin: 0, fontSize: 28, fontWeight: 400, letterSpacing: '-0.018em',
          lineHeight: 1.15, color: 'var(--ink-1)',
        }}>
          {draft.name || <span className="serif-italic" style={{ color: 'var(--ink-3)' }}>Untitled persona</span>}
        </h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <CompletenessRing pct={completeness}/>
        <Btn variant="ghost" size="m" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" size="m" onClick={onSave} disabled={!draft.name}>
          {isNew ? 'Create persona' : 'Save persona'}
        </Btn>
      </div>
    </div>
  );
}

function CompletenessRing({ pct }) {
  const r = 12, c = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width="34" height="34" viewBox="0 0 34 34">
        <circle cx="17" cy="17" r={r} fill="none" stroke="var(--line-2)" strokeWidth="2"/>
        <circle cx="17" cy="17" r={r} fill="none" stroke="var(--ink-1)" strokeWidth="2"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
          strokeLinecap="round" transform="rotate(-90 17 17)"
          style={{ transition: 'stroke-dashoffset .35s' }}/>
      </svg>
      <div style={{ textAlign: 'left' }}>
        <div className="eyebrow" style={{ fontSize: 9, marginBottom: 1 }}>Curation</div>
        <div className="mono" style={{ fontSize: 12, color: 'var(--ink-1)', fontVariantNumeric: 'tabular-nums' }}>
          {pct}%
        </div>
      </div>
    </div>
  );
}

// ── Section / Field helpers ────────────────────────────────────────────
function Section({ eyebrow, title, children }) {
  return (
    <section style={{
      paddingBottom: 28, marginBottom: 28,
      borderBottom: '1px solid var(--line-1)',
    }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</div>
      <div className="serif" style={{
        fontSize: 19, fontWeight: 400, letterSpacing: '-0.014em',
        color: 'var(--ink-1)', lineHeight: 1.2, marginBottom: 18,
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {children}
      </div>
    </section>
  );
}

function FieldRow({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {children}
    </div>
  );
}

// ── Tone descriptor picker ─────────────────────────────────────────────
function TonePicker({ value, onChange }) {
  const toggle = (d) => {
    if (value.includes(d)) onChange(value.filter(x => x !== d));
    else onChange([...value, d]);
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {TONE_DESCRIPTORS.map(d => {
        const on = value.includes(d);
        return (
          <button key={d} onClick={() => toggle(d)} style={{
            appearance: 'none',
            padding: '5px 11px',
            background: on ? 'var(--ink-1)' : 'transparent',
            border: '1px solid ' + (on ? 'var(--ink-1)' : 'var(--line-2)'),
            color: on ? 'var(--bg-0)' : 'var(--ink-2)',
            borderRadius: 999, fontSize: 11.5, fontWeight: 500,
            cursor: 'pointer', transition: 'all .12s',
            letterSpacing: '0.005em',
          }}
          onMouseEnter={(e) => { if (!on) { e.currentTarget.style.borderColor = 'var(--line-3)'; e.currentTarget.style.color = 'var(--ink-1)'; }}}
          onMouseLeave={(e) => { if (!on) { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--ink-2)'; }}}>
            {d}
          </button>
        );
      })}
    </div>
  );
}

// ── Rhythm control ─────────────────────────────────────────────────────
function RhythmControl({ value, onChange }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 0,
      border: '1px solid var(--line-2)', borderRadius: 3, overflow: 'hidden',
    }}>
      {RHYTHM_OPTIONS.map((o, i) => {
        const on = value === o.value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            appearance: 'none', padding: '12px 14px',
            background: on ? 'var(--bg-3)' : 'transparent',
            color: on ? 'var(--ink-1)' : 'var(--ink-3)',
            border: 'none',
            borderLeft: i === 0 ? 'none' : '1px solid var(--line-1)',
            cursor: 'pointer', textAlign: 'left',
            transition: 'all .12s',
          }}
          onMouseEnter={(e) => { if (!on) { e.currentTarget.style.background = 'var(--bg-2)'; e.currentTarget.style.color = 'var(--ink-2)'; }}}
          onMouseLeave={(e) => { if (!on) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-3)'; }}}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              {o.label}
            </div>
            <RhythmGlyph kind={o.value} active={on}/>
          </button>
        );
      })}
    </div>
  );
}

function RhythmGlyph({ kind, active }) {
  const bars = {
    terse:     [6, 8, 6, 9, 7, 5],
    balanced:  [10, 14, 8, 16, 12, 18],
    longform:  [22, 28, 18, 32, 24, 30],
  }[kind];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 16 }}>
      {bars.map((w, i) => (
        <span key={i} style={{
          height: 2, width: w,
          background: active ? 'var(--ink-2)' : 'var(--ink-4)',
        }}/>
      ))}
    </div>
  );
}

// ── Tag input ──────────────────────────────────────────────────────────
function TagInput({ value, onChange, placeholder }) {
  const [text, setText] = React.useState('');
  const add = () => {
    const t = text.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
    setText('');
  };
  const remove = (t) => onChange(value.filter(x => x !== t));

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 5, padding: '6px 6px 6px 10px',
      border: '1px solid var(--line-1)', borderRadius: 3, background: 'var(--bg-1)',
      minHeight: 32, alignItems: 'center',
    }}>
      {value.map(t => (
        <span key={t} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 4px 3px 9px',
          background: 'var(--bg-3)', border: '1px solid var(--line-2)', borderRadius: 999,
          fontSize: 11.5, color: 'var(--ink-1)',
        }}>
          {t}
          <button onClick={() => remove(t)} style={{
            appearance: 'none', background: 'transparent', border: 'none',
            color: 'var(--ink-3)', cursor: 'pointer', width: 14, height: 14,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
          }}>
            <Icon name="close" size={10} stroke={1.6}/>
          </button>
        </span>
      ))}
      <input value={text} onChange={(e) => setText(e.target.value)}
        placeholder={value.length === 0 ? placeholder : ''}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); add(); }
          if (e.key === 'Backspace' && !text && value.length) remove(value[value.length - 1]);
        }}
        onBlur={add}
        style={{
          flex: 1, minWidth: 80,
          background: 'transparent', border: 'none', outline: 'none',
          color: 'var(--ink-1)', fontFamily: 'var(--sans)', fontSize: 12.5,
          padding: '3px 4px',
        }}/>
    </div>
  );
}

// ── Writing samples editor ─────────────────────────────────────────────
function SamplesEditor({ value, onChange }) {
  const upd = (i, v) => {
    const next = [...value];
    next[i] = v;
    onChange(next);
  };
  const charCount = (v) => v?.length || 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {value.map((sample, i) => (
        <div key={i} style={{
          border: '1px solid var(--line-1)', borderRadius: 3,
          background: 'var(--bg-1)', overflow: 'hidden',
        }}>
          <div style={{
            padding: '6px 12px',
            borderBottom: sample ? '1px solid var(--line-1)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.06em' }}>
              SAMPLE · {String(i + 1).padStart(2, '0')}
            </span>
            <span className="mono" style={{
              fontSize: 10, color: charCount(sample) > 200 ? 'var(--ink-2)' : 'var(--ink-4)',
              letterSpacing: '0.02em',
            }}>
              {charCount(sample)} CHARS{charCount(sample) > 200 ? ' · LEARNED' : ''}
            </span>
          </div>
          <textarea value={sample} onChange={(e) => upd(i, e.target.value)}
            placeholder={i === 0 ? 'Paste a paragraph you would actually write…' : ''}
            rows={3}
            style={{
              width: '100%', padding: '10px 12px',
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--ink-1)', fontFamily: 'var(--serif)',
              fontSize: 13.5, lineHeight: 1.55, resize: 'vertical',
              minHeight: 60,
              letterSpacing: '-0.003em',
            }}/>
        </div>
      ))}
    </div>
  );
}

// ── Preview pane (right side) ──────────────────────────────────────────
function PreviewPane({ draft, scenario, setScenario, text, generating, onRegenerate }) {
  return (
    <>
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: '1px solid var(--line-1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="eyebrow">Voice preview</div>
          <button onClick={onRegenerate} style={{
            appearance: 'none', background: 'transparent', border: 'none',
            color: 'var(--ink-3)', fontSize: 11.5, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink-1)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-3)'}>
            <Icon name="sparkles" size={11} stroke={1.4}/>
            Regenerate
          </button>
        </div>
        <div className="serif-italic" style={{
          fontSize: 14, color: 'var(--ink-3)', marginBottom: 14,
        }}>
          Sample drafts in this persona's voice — updating live as you curate.
        </div>

        {/* Scenario selector */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {PREVIEW_SCENARIOS.map(s => {
            const on = scenario === s.id;
            return (
              <button key={s.id} onClick={() => setScenario(s.id)} style={{
                appearance: 'none', padding: '5px 10px',
                background: on ? 'var(--bg-3)' : 'transparent',
                border: '1px solid ' + (on ? 'var(--line-2)' : 'var(--line-1)'),
                color: on ? 'var(--ink-1)' : 'var(--ink-3)',
                borderRadius: 3, fontSize: 11.5, fontWeight: 500,
                cursor: 'pointer', transition: 'all .12s',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                <Icon name={s.icon} size={11} stroke={1.5}/>
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview body */}
      <div style={{ flex: 1, padding: '20px 24px', minHeight: 0, overflow: 'auto' }}>
        {generating ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 14, padding: '60px 0', minHeight: 200,
          }}>
            <LatticeAnim/>
            <div className="serif-italic" style={{ fontSize: 13.5, color: 'var(--ink-3)' }}>
              Listening to the voice…
            </div>
          </div>
        ) : (
          <div className="serif" style={{
            fontSize: 14.5, lineHeight: 1.65, color: 'var(--ink-1)',
            letterSpacing: '-0.003em', whiteSpace: 'pre-wrap',
            opacity: text ? 1 : 0.4,
          }}>
            {text || 'Add a name and tone to see the voice come through.'}
          </div>
        )}
      </div>

      {/* Voice fingerprint */}
      <div style={{
        padding: '14px 24px 20px',
        borderTop: '1px solid var(--line-1)', background: 'var(--bg-1)',
      }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Voice fingerprint</div>
        <VoiceFingerprint draft={draft}/>
      </div>
    </>
  );
}

function VoiceFingerprint({ draft }) {
  const totalSamples = draft.writingSamples.reduce((s, x) => s + (x?.length || 0), 0);
  const tones = draft.toneDescriptors.length;
  const vocab = draft.useWords.length + draft.avoidWords.length;
  const sentenceLen = { terse: 'short', balanced: 'mixed', longform: 'extended' }[draft.rhythm];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
    }}>
      <FpStat label="Tones" value={tones}/>
      <FpStat label="Rhythm" valueText={sentenceLen}/>
      <FpStat label="Vocab" value={vocab}/>
      <FpStat label="Sample" valueText={totalSamples > 500 ? 'rich' : totalSamples > 100 ? 'thin' : '—'}/>
    </div>
  );
}

function FpStat({ label, value, valueText }) {
  return (
    <div>
      <div className="eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>{label}</div>
      {value !== undefined ? (
        <div className="serif" style={{ fontSize: 18, color: 'var(--ink-1)', lineHeight: 1 }}>
          {String(value).padStart(2, '0')}
        </div>
      ) : (
        <div className="serif-italic" style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.1 }}>
          {valueText}
        </div>
      )}
    </div>
  );
}

// ── Voice preview composition (mock) ────────────────────────────────────
function composeVoicePreview(draft, scenario) {
  if (!draft.name) return '';
  const tones = draft.toneDescriptors.map(t => t.toLowerCase());
  const isMeasured = tones.includes('measured') || tones.includes('considered');
  const isDirect = tones.includes('direct') || tones.includes('sharp');
  const isWarm = tones.includes('warm');
  const isDry = tones.includes('dry') || tones.includes('plainspoken');
  const isContrarian = tones.includes('contrarian');

  const rhythm = draft.rhythm;
  const useWords = draft.useWords;
  const positioning = draft.positioning.split('.')[0] || 'A senior technology operator with two decades of pattern recognition';

  const opener = isDirect
    ? (isContrarian ? 'An unpopular view, but: ' : 'Direct on this: ')
    : isWarm
    ? 'Genuinely glad to be in touch — '
    : isDry
    ? ''
    : 'A short note. ';

  const useWord = useWords[0] || (isMeasured ? 'considered' : 'practical');

  if (scenario === 'recruiter') {
    return `${opener}I am the candidate you described, with one caveat — I will only consider roles where the board is genuinely engaged with technology, not where it sits as the eighth agenda item.

${positioning}.

If that fits the search you are running, ${rhythm === 'terse' ? 'twenty minutes is enough.' : 'I would welcome twenty minutes of your time to compare notes on the mandate, the people, and what year one actually looks like.'}

Best,
[Sender]`;
  }

  if (scenario === 'cold') {
    const greeting = isWarm ? 'Hope this finds you well.' : isDry ? '' : 'I will keep this short.';
    return `Subject: A ${useWord} note

${greeting}${greeting ? ' ' : ''}I read your recent piece on ${rhythm === 'longform' ? 'transformation governance and the difficulty of executive accountability across a multi-year program' : 'execution at scale'} — it lined up with what I have seen across the last decade of operating at that level.

${positioning}.

${rhythm === 'terse' ? 'Worth a conversation?' : 'If there is ever a conversation to be had on the work you are framing, I would welcome twenty minutes.'}

Best,
[Sender]`;
  }

  if (scenario === 'linkedin') {
    return `${isContrarian ? 'A view I will keep holding: ' : ''}${rhythm === 'terse' ? 'Three things the average board still misses about technology.' : 'After twenty-five years of sitting across the table from boards, three things they still consistently get wrong about technology.'}

${rhythm === 'terse' ? '' : 'Most boards confuse oversight with operating. They want metrics. They get vanity ones. They ask about cyber once a quarter and AI once a year. Neither is enough.'}

${useWord.charAt(0).toUpperCase() + useWord.slice(1)} thoughts in the comments — would value the disagreement.`;
  }

  // bio
  return `${draft.name}. ${positioning}.

${draft.companySize ? `Operates at ${draft.companySize.toLowerCase()} scale. ` : ''}${draft.skills.length ? `Strongest in ${draft.skills.slice(0, 3).join(', ').toLowerCase()}. ` : ''}${isMeasured ? 'Known for the considered call.' : isDirect ? 'Known for getting to the point.' : ''}`;
}

// ── Completeness ───────────────────────────────────────────────────────
function computeCompleteness(d) {
  let score = 0;
  if (d.name) score += 8;
  if (d.positioning?.length > 60) score += 18;
  if (d.toneDescriptors?.length >= 3) score += 16;
  if (d.rhythm) score += 8;
  if (d.useWords?.length >= 2) score += 8;
  if (d.avoidWords?.length >= 1) score += 6;
  const sampleChars = (d.writingSamples || []).reduce((s, x) => s + (x?.length || 0), 0);
  if (sampleChars > 100) score += 8;
  if (sampleChars > 400) score += 8;
  if (d.companySize) score += 6;
  if (d.targetSectors?.length >= 1) score += 6;
  if (d.skills?.length >= 3) score += 8;
  return Math.min(100, score);
}

Object.assign(window, { PersonaCurator });
