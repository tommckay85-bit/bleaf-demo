import { useState } from 'react';
import { useWorkforce } from '../../store/WorkforceContext';
import { SERVICE_CATEGORIES, SERVICES } from '../../data/services';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Avatar, ROLE_COLORS } from '../common/Avatar';
import { Modal } from '../common/Modal';
import { BANK_HOLIDAYS } from '../../data/bankHolidays';
import type { Prescriber, PrescriberRole, PrescriberStatus, WorkingPatternType, HolidayShiftPreference } from '../../types';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PATTERN_OPTIONS: { value: WorkingPatternType; label: string; desc: string }[] = [
  { value: 'standard-weekly', label: 'Standard weekly', desc: 'Same days every week' },
  { value: 'two-week-rotation', label: 'Two-week rotation', desc: 'Different days week 1 vs week 2' },
  { value: 'alternate-weekends', label: 'Alternate weekends', desc: 'Weekdays + every other weekend' },
  { value: 'monthly-weekend', label: 'Monthly weekend', desc: 'Weekdays + first weekend of month' },
];

const HOLIDAY_PREF_OPTIONS: { value: HolidayShiftPreference; label: string }[] = [
  { value: 'happy-to-work', label: 'Happy to work' },
  { value: 'flexible', label: 'Flexible' },
  { value: 'prefer-off', label: 'Prefer off' },
];

const ROTATION_INTERVALS: { value: 30 | 60 | 90 | 120; label: string }[] = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '60 minutes' },
  { value: 90, label: '90 minutes' },
  { value: 120, label: '2 hours' },
];

const ROLES: { value: PrescriberRole; label: string }[] = [
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'gp', label: 'GP' },
  { value: 'specialist', label: 'Specialist' },
];

const STATUS_OPTIONS: { value: PrescriberStatus; label: string }[] = [
  { value: 'online', label: 'Online' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'offline', label: 'Offline' },
];

const roleVariant = (role: PrescriberRole) => {
  if (role === 'gp') return 'info';
  if (role === 'pharmacist') return 'success';
  if (role === 'nurse') return 'danger';
  return 'default';
};

const statusVariant = (status: PrescriberStatus) => {
  if (status === 'online' || status === 'allocated') return 'success';
  if (status === 'scheduled') return 'warning';
  return 'muted';
};

function makeInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(-2).map(n => n[0]).join('').toUpperCase();
}

const emptyPrescriber: Omit<Prescriber, 'id'> = {
  name: '', initials: '', role: 'pharmacist', status: 'online',
  serviceIds: [], specialistServiceIds: [], allocationStyle: 'sessional',
  email: '', phone: '', notificationPrefs: { email: true, sms: false },
  workingPattern: { type: 'standard-weekly', weekDays: [1, 2, 3, 4, 5] },
};

export function PeopleConfig() {
  const { prescribers, shiftPreferences, dispatch } = useWorkforce();
  const [holidayPrefs, setHolidayPrefs] = useState<Record<string, HolidayShiftPreference>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<Omit<Prescriber, 'id'>>(emptyPrescriber);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  function loadHolidayPrefs(prescriberId: string) {
    const map: Record<string, HolidayShiftPreference> = {};
    for (const sp of shiftPreferences) {
      if (sp.prescriberId === prescriberId) map[sp.holidayId] = sp.preference;
    }
    setHolidayPrefs(map);
  }

  function openEdit(p: Prescriber) {
    setEditingId(p.id);
    setForm({
      name: p.name, initials: p.initials, role: p.role, status: p.status,
      serviceIds: [...p.serviceIds],
      specialistServiceIds: [...(p.specialistServiceIds ?? [])],
      allocationStyle: p.allocationStyle ?? 'sessional',
      rotationIntervalMins: p.rotationIntervalMins,
      email: p.email ?? '',
      phone: p.phone ?? '',
      notificationPrefs: p.notificationPrefs ?? { email: true, sms: false },
      workingPattern: p.workingPattern ?? { type: 'standard-weekly', weekDays: [1, 2, 3, 4, 5] },
    });
    loadHolidayPrefs(p.id);
    setIsCreating(false);
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyPrescriber });
    setHolidayPrefs({});
    setIsCreating(true);
  }

  function closeModal() {
    setEditingId(null);
    setIsCreating(false);
  }

  function saveEdit() {
    if (!form.name.trim()) return;
    const initials = makeInitials(form.name);
    const id = editingId ?? `p-${Date.now()}`;
    dispatch({ type: 'UPDATE_PRESCRIBER', prescriber: { ...form, initials, id } });
    for (const [holidayId, preference] of Object.entries(holidayPrefs)) {
      dispatch({ type: 'SET_SHIFT_PREFERENCE', pref: { prescriberId: id, holidayId, preference } });
    }
    closeModal();
  }

  function toggleWeekDay(field: 'weekDays' | 'week1Days' | 'week2Days', dow: number) {
    setForm(f => {
      const wp = f.workingPattern ?? { type: 'standard-weekly' as WorkingPatternType };
      const current = wp[field] ?? [];
      const next = current.includes(dow) ? current.filter(d => d !== dow) : [...current, dow].sort((a, b) => a - b);
      return { ...f, workingPattern: { ...wp, [field]: next } };
    });
  }

  // Three-state cycle per service: none → trained → specialist → none
  function cycleService(serviceId: string) {
    const isSpecialist = form.specialistServiceIds?.includes(serviceId);
    const isTrained = form.serviceIds.includes(serviceId);
    if (isSpecialist) {
      // specialist → none
      setForm(f => ({
        ...f,
        serviceIds: f.serviceIds.filter(id => id !== serviceId),
        specialistServiceIds: (f.specialistServiceIds ?? []).filter(id => id !== serviceId),
      }));
    } else if (isTrained) {
      // trained → specialist
      setForm(f => ({
        ...f,
        specialistServiceIds: [...(f.specialistServiceIds ?? []), serviceId],
      }));
    } else {
      // none → trained
      setForm(f => ({ ...f, serviceIds: [...f.serviceIds, serviceId] }));
    }
  }

  function selectCategoryServices(categoryId: string, add: boolean) {
    const cat = SERVICE_CATEGORIES.find(c => c.id === categoryId)!;
    if (add) {
      const merged = Array.from(new Set([...form.serviceIds, ...cat.serviceIds]));
      setForm(f => ({ ...f, serviceIds: merged }));
    } else {
      setForm(f => ({
        ...f,
        serviceIds: f.serviceIds.filter(id => !cat.serviceIds.includes(id)),
        specialistServiceIds: (f.specialistServiceIds ?? []).filter(id => !cat.serviceIds.includes(id)),
      }));
    }
  }

  const filtered = prescribers.filter(p => {
    if (filterRole !== 'all' && p.role !== filterRole) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const isOpen = !!editingId || isCreating;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Filters & actions */}
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 'var(--space-4)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        boxShadow: 'var(--shadow-1)', border: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        <input
          type="search"
          placeholder="Search prescribers…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={inputStyle}
        />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={selectStyle}>
          <option value="all">All roles</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <Button variant="primary" size="sm" onClick={openCreate}>+ Add prescriber</Button>
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        {ROLES.map(r => {
          const count = prescribers.filter(p => p.role === r.value).length;
          return (
            <div key={r.value} style={{
              flex: 1, background: 'var(--surface)', borderRadius: 'var(--r-lg)',
              padding: 'var(--space-4)', boxShadow: 'var(--shadow-1)', border: '1px solid var(--border)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: ROLE_COLORS[r.value] }}>{count}</div>
              <div style={{ fontSize: 'var(--fs-small)', color: 'var(--fg3)' }}>{r.label}s</div>
            </div>
          );
        })}
      </div>

      {/* People table */}
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--shadow-1)', border: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
              {['Prescriber', 'Role', 'Status', 'Services', 'Work Style', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr
                key={p.id}
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-alt)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar initials={p.initials} role={p.role} size={34} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--fs-small)' }}>{p.name}</div>
                      <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)' }}>{p.id}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Badge variant={roleVariant(p.role)} size="sm">{p.role}</Badge>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Badge variant={statusVariant(p.status)} size="sm">{p.status}</Badge>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg2)' }}>
                    <span style={{ fontWeight: 700 }}>{p.serviceIds.length}</span>
                    <span style={{ color: 'var(--fg3)' }}> trained</span>
                    {(p.specialistServiceIds?.length ?? 0) > 0 && (
                      <span style={{ color: '#B45309', marginLeft: 4, fontWeight: 600 }}>
                        · ★ {p.specialistServiceIds!.length} specialist
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                    {SERVICE_CATEGORIES.map(cat => {
                      const hasSpecialist = cat.serviceIds.some(sid => (p.specialistServiceIds ?? []).includes(sid));
                      const hasAny = cat.serviceIds.some(sid => p.serviceIds.includes(sid));
                      if (!hasAny) return null;
                      return (
                        <div key={cat.id} title={`${cat.name}${hasSpecialist ? ' (specialist)' : ''}`} style={{
                          width: 8, height: 8, borderRadius: hasSpecialist ? 2 : '50%',
                          background: cat.color,
                          outline: hasSpecialist ? `2px solid ${cat.color}` : 'none',
                          outlineOffset: 1,
                          opacity: 0.9,
                        }} />
                      );
                    })}
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: 'var(--fs-micro)', color: p.allocationStyle === 'rotation' ? '#0067B2' : 'var(--fg3)', fontWeight: p.allocationStyle === 'rotation' ? 600 : 400 }}>
                    {p.allocationStyle === 'rotation'
                      ? `↺ ${p.rotationIntervalMins ?? 60}m`
                      : '⏱ Sessional'}
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--fg3)', fontSize: 'var(--fs-small)' }}>
            No prescribers match your filters
          </div>
        )}
      </div>

      {/* Edit / Create Modal */}
      <Modal
        open={isOpen}
        onClose={closeModal}
        title={isCreating ? 'Add New Prescriber' : `Edit: ${form.name}`}
        width={640}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={saveEdit} disabled={!form.name.trim()}>
              {isCreating ? 'Add prescriber' : 'Save changes'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Basic info */}
          <Section title="Basic information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <FormField label="Full name">
                <input
                  style={inputStyle}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value, initials: makeInitials(e.target.value) }))}
                  placeholder="Dr Jane Smith"
                />
              </FormField>
              <FormField label="Role">
                <select style={selectStyle} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as PrescriberRole }))}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </FormField>
              <FormField label="Status">
                <select style={selectStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as PrescriberStatus }))}>
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </FormField>
            </div>
          </Section>

          {/* Allocation style */}
          <Section title="Work style preference">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                {(['sessional', 'rotation'] as const).map(style => (
                  <button
                    key={style}
                    onClick={() => setForm(f => ({ ...f, allocationStyle: style, rotationIntervalMins: style === 'rotation' ? (f.rotationIntervalMins ?? 60) : undefined }))}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: 'var(--r-md)', cursor: 'pointer',
                      border: `2px solid ${form.allocationStyle === style ? '#05054B' : 'var(--border)'}`,
                      background: form.allocationStyle === style ? '#F0F4FF' : 'var(--surface)',
                      textAlign: 'left', transition: 'all 0.1s',
                    }}
                  >
                    <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: form.allocationStyle === style ? '#05054B' : 'var(--fg2)' }}>
                      {style === 'sessional' ? '⏱ Sessional' : '↺ Rotation'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--fg3)', marginTop: 2 }}>
                      {style === 'sessional'
                        ? 'Half-day blocks on same activity'
                        : 'Switches between categories at intervals'}
                    </div>
                  </button>
                ))}
              </div>
              {form.allocationStyle === 'rotation' && (
                <FormField label="Switch interval">
                  <select
                    style={selectStyle}
                    value={form.rotationIntervalMins ?? 60}
                    onChange={e => setForm(f => ({ ...f, rotationIntervalMins: Number(e.target.value) as 30 | 60 | 90 | 120 }))}
                  >
                    {ROTATION_INTERVALS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </FormField>
              )}
            </div>
          </Section>

          {/* Contact & Working Pattern */}
          <Section title="Contact & Working Pattern">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <FormField label="Email">
                <input
                  type="email"
                  style={inputStyle}
                  value={form.email ?? ''}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="jane.smith@boots.com"
                />
              </FormField>
              <FormField label="Phone">
                <input
                  type="tel"
                  style={inputStyle}
                  value={form.phone ?? ''}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="07700 900000"
                />
              </FormField>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-small)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.notificationPrefs?.email ?? false}
                  onChange={e => setForm(f => ({ ...f, notificationPrefs: { email: e.target.checked, sms: f.notificationPrefs?.sms ?? false } }))}
                />
                Email notifications
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-small)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.notificationPrefs?.sms ?? false}
                  onChange={e => setForm(f => ({ ...f, notificationPrefs: { email: f.notificationPrefs?.email ?? false, sms: e.target.checked } }))}
                />
                SMS notifications
              </label>
            </div>

            <div style={{ marginTop: 'var(--space-4)', fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Working pattern
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
              {PATTERN_OPTIONS.map(opt => {
                const active = (form.workingPattern?.type ?? 'standard-weekly') === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setForm(f => ({ ...f, workingPattern: { ...(f.workingPattern ?? {}), type: opt.value } }))}
                    style={{
                      padding: '8px 10px', borderRadius: 'var(--r-md)', cursor: 'pointer', textAlign: 'left',
                      border: `2px solid ${active ? '#05054B' : 'var(--border)'}`,
                      background: active ? '#F0F4FF' : 'var(--surface)',
                    }}
                  >
                    <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: active ? '#05054B' : 'var(--fg2)' }}>{opt.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--fg3)', marginTop: 2 }}>{opt.desc}</div>
                  </button>
                );
              })}
            </div>

            {(() => {
              const type = form.workingPattern?.type ?? 'standard-weekly';
              const dayPicker = (field: 'weekDays' | 'week1Days' | 'week2Days', label: string) => (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--fg3)', marginBottom: 4 }}>{label}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3, 4, 5, 6, 0].map(dow => {
                      const sel = (form.workingPattern?.[field] ?? []).includes(dow);
                      return (
                        <button
                          key={dow}
                          onClick={() => toggleWeekDay(field, dow)}
                          style={{
                            flex: 1, padding: '6px 0', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                            border: `1.5px solid ${sel ? '#05054B' : 'var(--border)'}`,
                            background: sel ? '#05054B' : 'var(--surface)',
                            color: sel ? '#fff' : 'var(--fg3)',
                            fontSize: 10, fontWeight: 600,
                          }}
                        >
                          {WEEKDAY_LABELS[dow]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
              if (type === 'standard-weekly') return dayPicker('weekDays', 'Working days');
              if (type === 'two-week-rotation') return <>{dayPicker('week1Days', 'Week 1 days')}{dayPicker('week2Days', 'Week 2 days')}</>;
              if (type === 'alternate-weekends') return dayPicker('weekDays', 'Weekday pattern (weekends alternate automatically)');
              if (type === 'monthly-weekend') return dayPicker('weekDays', 'Weekday pattern (first weekend of month worked)');
              return null;
            })()}
          </Section>

          {/* Holiday shift preferences */}
          <Section title="Holiday shift preferences">
            <div style={{ fontSize: 10, color: 'var(--fg3)', marginBottom: 8 }}>
              Used by the rota generator to fairly allocate special days.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
              {BANK_HOLIDAYS.map(bh => {
                const current = holidayPrefs[bh.id] ?? 'flexible';
                return (
                  <div key={bh.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <span style={{ width: 12, fontSize: 12 }}>{bh.type === 'statutory' ? '🏦' : '✦'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bh.name}</div>
                      <div style={{ fontSize: 9, color: 'var(--fg3)' }}>{bh.date}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {HOLIDAY_PREF_OPTIONS.map(opt => {
                        const active = current === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setHolidayPrefs(h => ({ ...h, [bh.id]: opt.value }))}
                            style={{
                              padding: '2px 7px', borderRadius: 'var(--r-pill)', cursor: 'pointer',
                              border: `1.5px solid ${active ? '#05054B' : 'var(--border)'}`,
                              background: active ? '#05054B' : 'var(--surface)',
                              color: active ? '#fff' : 'var(--fg3)',
                              fontSize: 9, fontWeight: 600, whiteSpace: 'nowrap',
                            }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Service permissions */}
          <Section title={`Service permissions — trained: ${form.serviceIds.length} · specialist: ${(form.specialistServiceIds ?? []).length}`}>
            <div style={{ fontSize: 10, color: 'var(--fg3)', marginBottom: 8 }}>
              Click once = trained (✓) · click again = specialist (★) · click again = remove
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {SERVICE_CATEGORIES.map(cat => {
                const catServices = SERVICES.filter(s => s.categoryId === cat.id);
                const selectedCount = catServices.filter(s => form.serviceIds.includes(s.id)).length;
                const allSelected = selectedCount === catServices.length;

                return (
                  <div key={cat.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      padding: '8px 12px', background: 'var(--surface-alt)',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <span style={{ fontSize: 14 }}>{cat.icon}</span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: 'var(--fs-small)' }}>{cat.name}</span>
                      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)' }}>{selectedCount}/{catServices.length}</span>
                      <button
                        onClick={() => selectCategoryServices(cat.id, !allSelected)}
                        style={{
                          border: '1px solid var(--border-strong)', background: 'var(--surface)',
                          borderRadius: 'var(--r-sm)', cursor: 'pointer',
                          fontSize: 'var(--fs-micro)', color: 'var(--fg2)', padding: '2px 8px',
                        }}
                      >
                        {allSelected ? 'Remove all' : 'Select all'}
                      </button>
                    </div>
                    <div style={{ padding: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {catServices.map(svc => {
                        const isSpecialist = (form.specialistServiceIds ?? []).includes(svc.id);
                        const isTrained = form.serviceIds.includes(svc.id);
                        return (
                          <button
                            key={svc.id}
                            onClick={() => cycleService(svc.id)}
                            title={isSpecialist ? 'Specialist — click to remove' : isTrained ? 'Trained — click to mark specialist' : 'Click to add as trained'}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 'var(--r-pill)',
                              border: `1.5px solid ${isSpecialist ? '#B45309' : isTrained ? cat.color : 'var(--border)'}`,
                              background: isSpecialist ? '#FEF3C7' : isTrained ? `${cat.color}15` : 'transparent',
                              color: isSpecialist ? '#B45309' : isTrained ? cat.color : 'var(--fg3)',
                              cursor: 'pointer',
                              fontSize: 'var(--fs-micro)',
                              fontWeight: isSpecialist || isTrained ? 600 : 400,
                              transition: 'all 0.1s ease',
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                            }}
                          >
                            {isSpecialist && <span>★</span>}
                            {!isSpecialist && isTrained && <span>✓</span>}
                            {svc.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>
      </Modal>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 'var(--fs-small)', fontWeight: 700, color: 'var(--fg2)', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1.5px solid var(--border)',
  borderRadius: 'var(--r-md)',
  fontSize: 'var(--fs-small)',
  color: 'var(--fg1)',
  background: 'var(--surface)',
  width: '100%',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none' as const,
};
