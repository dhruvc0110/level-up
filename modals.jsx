// Level Up — Modals (Add Opportunity, Edit Persona)

function ModalShell({ children, onClose, width = 560 }) {
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
        width, maxWidth: '92vw', maxHeight: '88vh',
        background: 'var(--bg-1)',
        border: '1px solid var(--line-2)',
        borderRadius: 4,
        zIndex: 210,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 30px 90px rgba(0,0,0,0.6)',
        animation: 'lu-modal-in .22s cubic-bezier(.2,.7,.3,1)',
      }}>
        {children}
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

// ── Add Opportunity ─────────────────────────────────────────────────────
function AddOpportunityModal({ onClose, onSave }) {
  const [form, setForm] = React.useState({
    company: '', role: '',
    persona: 'cio', source: '',
    contactName: '', contactTitle: '', contactWarmth: 'cold',
    nextAction: '', dueDate: '',
    fit: 3,
  });

  const upd = (k, v) => setForm(s => ({ ...s, [k]: v }));
  const canSave = form.company && form.role;

  const submit = () => {
    if (!canSave) return;
    onSave({
      id: 'op-' + Math.random().toString(36).slice(2, 7),
      company: form.company, role: form.role,
      stage: 'discovered', persona: form.persona,
      fit: form.fit, source: form.source || 'Inbound',
      contact: form.contactName ? { name: form.contactName, title: form.contactTitle, warmth: form.contactWarmth } : null,
      nextAction: form.nextAction || 'Initial research',
      dueDate: form.dueDate || (() => { const d = new Date(window.LU_TODAY); d.setDate(d.getDate() + 3); return d.toISOString().slice(0,10); })(),
      notes: '',
      drafts: [],
    });
    onClose();
  };

  return (
    <ModalShell onClose={onClose}>
      <div style={{
        padding: '20px 24px 16px', borderBottom: '1px solid var(--line-1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>New entry</div>
          <h3 className="serif" style={{
            margin: 0, fontSize: 22, fontWeight: 400, letterSpacing: '-0.014em',
          }}>
            Add opportunity
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

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Company">
            <TextInput value={form.company} onChange={(v) => upd('company', v)}
              placeholder="e.g. Halcyon Industries"/>
          </Field>
          <Field label="Role title">
            <TextInput value={form.role} onChange={(v) => upd('role', v)}
              placeholder="e.g. Chief Information Officer"/>
          </Field>
          <Field label="Persona">
            <Select value={form.persona} onChange={(v) => upd('persona', v)}
              options={window.LU_PERSONAS.map(p => ({ value: p.id, label: `${p.code} · ${p.name}` }))}/>
          </Field>
          <Field label="Source">
            <TextInput value={form.source} onChange={(v) => upd('source', v)}
              placeholder="e.g. Spencer Stuart, Inbound, Personal network"/>
          </Field>
          <Field label="Fit score" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
              <FitStars value={form.fit} size={18} interactive onChange={(v) => upd('fit', v)}/>
              <span className="serif-italic" style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                Gut read, 1 to 5
              </span>
            </div>
          </Field>
        </div>

        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--line-1)' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Key contact (optional)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr', gap: 10 }}>
            <TextInput value={form.contactName} onChange={(v) => upd('contactName', v)} placeholder="Name"/>
            <TextInput value={form.contactTitle} onChange={(v) => upd('contactTitle', v)} placeholder="Title"/>
            <Select value={form.contactWarmth} onChange={(v) => upd('contactWarmth', v)}
              options={[{value:'cold',label:'Cold'},{value:'warm',label:'Warm'},{value:'strong',label:'Strong'},{value:'recruiter',label:'Recruiter'}]}/>
          </div>
        </div>

        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--line-1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
            <Field label="Next action">
              <TextInput value={form.nextAction} onChange={(v) => upd('nextAction', v)}
                placeholder="e.g. Send updated CIO bio"/>
            </Field>
            <Field label="Due">
              <input type="date" value={form.dueDate} onChange={(e) => upd('dueDate', e.target.value)}
                style={{
                  width: '100%', height: 32, padding: '0 10px',
                  background: 'var(--bg-1)', color: 'var(--ink-1)',
                  border: '1px solid var(--line-1)', borderRadius: 3,
                  fontFamily: 'var(--sans)', fontSize: 13, outline: 'none',
                  colorScheme: 'dark',
                }}/>
            </Field>
          </div>
        </div>
      </div>

      <div style={{
        padding: '14px 24px',
        borderTop: '1px solid var(--line-1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>
          Will appear in <span style={{ color: 'var(--ink-2)' }}>Discovered</span>
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={submit} disabled={!canSave}>Add opportunity</Btn>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Edit Persona ─────────────────────────────────────────────────────────
function PersonaModal({ persona, onClose, onSave }) {
  const isNew = !persona?.id;
  const [form, setForm] = React.useState(persona || {
    id: 'pers-' + Math.random().toString(36).slice(2, 7),
    name: '', code: 'P-0' + (window.LU_PERSONAS.length + 1),
    positioning: '', skills: [],
    companySize: '', targetSectors: [], tone: '',
    opportunities: 0,
  });
  const [skillsRaw, setSkillsRaw] = React.useState((form.skills || []).join(', '));
  const [sectorsRaw, setSectorsRaw] = React.useState((form.targetSectors || []).join(', '));

  const upd = (k, v) => setForm(s => ({ ...s, [k]: v }));
  const submit = () => {
    onSave({
      ...form,
      skills: skillsRaw.split(',').map(s => s.trim()).filter(Boolean),
      targetSectors: sectorsRaw.split(',').map(s => s.trim()).filter(Boolean),
    });
    onClose();
  };

  return (
    <ModalShell onClose={onClose} width={620}>
      <div style={{
        padding: '20px 24px 16px', borderBottom: '1px solid var(--line-1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            {isNew ? 'New persona' : `Persona · ${form.code}`}
          </div>
          <h3 className="serif" style={{
            margin: 0, fontSize: 22, fontWeight: 400, letterSpacing: '-0.014em',
          }}>
            {isNew ? 'Define a persona' : form.name || 'Untitled persona'}
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

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        <Field label="Name" style={{ marginBottom: 16 }}>
          <TextInput value={form.name} onChange={(v) => upd('name', v)}
            placeholder="e.g. Enterprise CIO"/>
        </Field>

        <Field label="Positioning statement" hint="One paragraph. Will inform every AI draft." style={{ marginBottom: 16 }}>
          <TextArea value={form.positioning} onChange={(v) => upd('positioning', v)} rows={5}
            placeholder="The story you tell about yourself when this persona walks into the room…"/>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <Field label="Company size">
            <TextInput value={form.companySize} onChange={(v) => upd('companySize', v)}
              placeholder="e.g. Fortune 1000"/>
          </Field>
          <Field label="Tone">
            <TextInput value={form.tone} onChange={(v) => upd('tone', v)}
              placeholder="e.g. Measured. Strategic."/>
          </Field>
        </div>

        <Field label="Skills" hint="Comma-separated. Top 3 surface in outreach drafts." style={{ marginBottom: 16 }}>
          <TextInput value={skillsRaw} onChange={setSkillsRaw}
            placeholder="e.g. Board reporting, M&A integration, P&L ownership"/>
        </Field>

        <Field label="Target sectors" hint="Comma-separated">
          <TextInput value={sectorsRaw} onChange={setSectorsRaw}
            placeholder="e.g. Financial Services, Industrials, Healthcare"/>
        </Field>
      </div>

      <div style={{
        padding: '14px 24px', borderTop: '1px solid var(--line-1)',
        display: 'flex', justifyContent: 'flex-end', gap: 8,
      }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={submit} disabled={!form.name}>
          {isNew ? 'Create persona' : 'Save changes'}
        </Btn>
      </div>
    </ModalShell>
  );
}

Object.assign(window, { AddOpportunityModal, PersonaModal });
