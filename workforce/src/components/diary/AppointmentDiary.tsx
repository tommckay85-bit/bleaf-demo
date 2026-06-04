import { useState } from 'react';
import { useWorkforce } from '../../store/WorkforceContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import type { Appointment, ClinicType, PrescriberRole } from '../../types';

// Time grid: 08:00 to 20:00 in 30-min slots = 24 rows
const START_HOUR = 8;
const END_HOUR = 20;
const SLOT_MINS = 30;
const TOTAL_SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_MINS; // 24

function timeToSlot(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return ((h - START_HOUR) * 60 + m) / SLOT_MINS;
}

function slotToTime(slot: number): string {
  const totalMins = START_HOUR * 60 + slot * SLOT_MINS;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function durationToSlots(mins: number): number {
  return mins / SLOT_MINS;
}

const STATUS_COLORS: Record<Appointment['status'], string> = {
  scheduled: '#1565C0',
  'in-progress': '#2E7D32',
  complete: '#6B7280',
  cancelled: '#DC2626',
};

const PRESET_COLORS = ['#00838F', '#1565C0', '#6A1B9A', '#2E7D32', '#C2185B', '#E65100'];

const ROLES: { value: PrescriberRole; label: string }[] = [
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'gp', label: 'GP' },
  { value: 'specialist', label: 'Specialist' },
];

const inp: React.CSSProperties = {
  padding: '8px 12px',
  border: '1.5px solid var(--border)',
  borderRadius: 'var(--r-md)',
  fontSize: 'var(--fs-small)',
  color: 'var(--fg1)',
  background: 'var(--surface)',
  width: '100%',
  outline: 'none',
};

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );
}

export function AppointmentDiary() {
  const { prescribers, appointments, clinicTypes, breakGroups, nonPrescribingSlots, dispatch } = useWorkforce();

  const [editingAppt, setEditingAppt] = useState<Partial<Appointment> | null>(null);
  const [isNewAppt, setIsNewAppt] = useState(false);
  const [editingClinicType, setEditingClinicType] = useState<Partial<ClinicType> | null>(null);
  const [isNewClinicType, setIsNewClinicType] = useState(false);

  // Show prescribers who are gp/specialist or have appointments today
  const diaryPrescribers = prescribers.filter(p => {
    const hasAppt = appointments.some(a => a.prescriberId === p.id);
    const isApptRole = p.role === 'gp' || p.role === 'specialist';
    return (hasAppt || isApptRole) && p.status !== 'offline';
  });

  function openNewAppt(prescriberId: string, slotIndex: number) {
    const ct = clinicTypes[0];
    setEditingAppt({
      id: '',
      prescriberId,
      startTime: slotToTime(slotIndex),
      durationMins: ct?.defaultDurationMins || 30,
      clinicTypeId: ct?.id || '',
      patientRef: '',
      status: 'scheduled',
    });
    setIsNewAppt(true);
  }

  function openEditAppt(appt: Appointment) {
    setEditingAppt({ ...appt });
    setIsNewAppt(false);
  }

  function saveAppt() {
    if (!editingAppt || !editingAppt.patientRef || !editingAppt.prescriberId || !editingAppt.clinicTypeId) return;
    if (isNewAppt) {
      dispatch({
        type: 'ADD_APPOINTMENT',
        appointment: {
          id: `appt-${Date.now()}`,
          patientRef: editingAppt.patientRef!,
          clinicTypeId: editingAppt.clinicTypeId!,
          prescriberId: editingAppt.prescriberId!,
          startTime: editingAppt.startTime!,
          durationMins: editingAppt.durationMins || 30,
          notes: editingAppt.notes,
          status: editingAppt.status || 'scheduled',
        },
      });
    } else {
      dispatch({ type: 'UPDATE_APPOINTMENT', appointment: editingAppt as Appointment });
    }
    setEditingAppt(null);
  }

  function deleteAppt() {
    if (editingAppt?.id) {
      dispatch({ type: 'DELETE_APPOINTMENT', appointmentId: editingAppt.id });
    }
    setEditingAppt(null);
  }

  function saveClinicType() {
    if (!editingClinicType?.name || !editingClinicType.color) return;
    if (isNewClinicType) {
      dispatch({
        type: 'ADD_CLINIC_TYPE',
        clinicType: {
          id: `ct-${Date.now()}`,
          name: editingClinicType.name!,
          color: editingClinicType.color!,
          defaultDurationMins: editingClinicType.defaultDurationMins || 30,
          requiredRoles: editingClinicType.requiredRoles || [],
        },
      });
    } else {
      dispatch({ type: 'UPDATE_CLINIC_TYPE', clinicType: editingClinicType as ClinicType });
    }
    setEditingClinicType(null);
  }

  const CELL_HEIGHT = 40; // px per 30-min slot
  const COL_WIDTH = 160;
  const TIME_COL_WIDTH = 56;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', height: '100%' }}>
      {/* Legend + toolbar */}
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 'var(--space-3) var(--space-4)',
        boxShadow: 'var(--shadow-1)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', flex: 1 }}>
          {clinicTypes.map(ct => (
            <button
              key={ct.id}
              onClick={() => { setEditingClinicType({ ...ct }); setIsNewClinicType(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 'var(--r-pill)',
                border: `1.5px solid ${ct.color}`,
                background: `${ct.color}15`,
                color: ct.color,
                cursor: 'pointer', fontSize: 'var(--fs-micro)', fontWeight: 600,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: ct.color, display: 'inline-block' }} />
              {ct.name} ({ct.defaultDurationMins}m)
            </button>
          ))}
          {breakGroups.filter(bg => bg.enabled).map(bg => (
            <div
              key={bg.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 'var(--r-pill)',
                border: `1.5px solid ${bg.color}`,
                background: `${bg.color}15`,
                color: bg.color,
                fontSize: 'var(--fs-micro)', fontWeight: 600,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: bg.color, display: 'inline-block' }} />
              {bg.name} {bg.startTime}–{bg.endTime}
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setEditingClinicType({ color: PRESET_COLORS[0], defaultDurationMins: 30, requiredRoles: [] }); setIsNewClinicType(true); }}>
          + Add Clinic Type
        </Button>
      </div>

      {/* Diary grid */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-1)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', minWidth: TIME_COL_WIDTH + diaryPrescribers.length * COL_WIDTH }}>
          {/* Time column */}
          <div style={{ width: TIME_COL_WIDTH, flexShrink: 0, position: 'sticky', left: 0, zIndex: 10, background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
            {/* Header */}
            <div style={{ height: 48, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-alt)' }}>
              <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg4)', fontWeight: 600 }}>Time</span>
            </div>
            {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
              const t = slotToTime(i);
              const isHour = i % 2 === 0;
              return (
                <div key={i} style={{
                  height: CELL_HEIGHT,
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  paddingRight: 8,
                  borderBottom: '1px solid var(--border)',
                  background: isHour ? 'var(--surface)' : 'transparent',
                }}>
                  {isHour && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg4)' }}>{t}</span>}
                </div>
              );
            })}
          </div>

          {/* Prescriber columns */}
          {diaryPrescribers.map(prescriber => {
            const prescriberAppts = appointments.filter(a => a.prescriberId === prescriber.id);
            const npSlot = nonPrescribingSlots.find(s => s.prescriberId === prescriber.id);

            return (
              <div key={prescriber.id} style={{ width: COL_WIDTH, flexShrink: 0, borderRight: '1px solid var(--border)', position: 'relative' }}>
                {/* Header */}
                <div style={{
                  height: 48, borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                  background: 'var(--surface-alt)', padding: '0 8px',
                  position: 'sticky', top: 0, zIndex: 5,
                }}>
                  <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--fg1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: COL_WIDTH - 16 }}>
                    {prescriber.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--fg3)', textTransform: 'capitalize' }}>{prescriber.role}</div>
                </div>

                {/* Grid cells (click to add) */}
                <div style={{ position: 'relative' }}>
                  {Array.from({ length: TOTAL_SLOTS }, (_, i) => (
                    <div
                      key={i}
                      onClick={() => openNewAppt(prescriber.id, i)}
                      style={{
                        height: CELL_HEIGHT,
                        borderBottom: `1px solid ${i % 2 === 0 ? 'var(--border)' : 'var(--border)'}`,
                        cursor: 'pointer',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-alt)')}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)')}
                    />
                  ))}

                  {/* Break group bands */}
                  {breakGroups.filter(bg => bg.enabled && bg.prescriberIds.includes(prescriber.id)).map(bg => {
                    const startSlot = timeToSlot(bg.startTime);
                    const endSlot = timeToSlot(bg.endTime);
                    if (startSlot < 0 || endSlot > TOTAL_SLOTS) return null;
                    return (
                      <div
                        key={bg.id}
                        style={{
                          position: 'absolute',
                          top: startSlot * CELL_HEIGHT,
                          height: (endSlot - startSlot) * CELL_HEIGHT,
                          left: 0, right: 0,
                          background: `${bg.color}25`,
                          borderLeft: `3px solid ${bg.color}`,
                          pointerEvents: 'none',
                          display: 'flex', alignItems: 'flex-start',
                          padding: '4px 6px',
                        }}
                      >
                        <span style={{ fontSize: 10, color: bg.color, fontWeight: 600 }}>{bg.name}</span>
                      </div>
                    );
                  })}

                  {/* Non-prescribing band */}
                  {npSlot && (
                    <div style={{
                      position: 'absolute',
                      top: 0, bottom: 0, left: 0, right: 0,
                      background: 'repeating-linear-gradient(45deg, rgba(107,114,128,0.05) 0px, rgba(107,114,128,0.05) 4px, transparent 4px, transparent 10px)',
                      borderLeft: '3px solid #9CA3AF',
                      pointerEvents: 'none',
                      display: 'flex', alignItems: 'flex-start',
                      padding: '4px 6px',
                    }}>
                      <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 600 }}>Non-prescribing: {npSlot.reason}</span>
                    </div>
                  )}

                  {/* Appointments */}
                  {prescriberAppts.map(appt => {
                    const ct = clinicTypes.find(c => c.id === appt.clinicTypeId);
                    const startSlot = timeToSlot(appt.startTime);
                    const slotSpan = durationToSlots(appt.durationMins);
                    if (startSlot < 0 || startSlot >= TOTAL_SLOTS) return null;
                    const color = ct?.color || STATUS_COLORS[appt.status];
                    return (
                      <div
                        key={appt.id}
                        onClick={e => { e.stopPropagation(); openEditAppt(appt); }}
                        style={{
                          position: 'absolute',
                          top: startSlot * CELL_HEIGHT + 2,
                          height: Math.max(slotSpan * CELL_HEIGHT - 4, 20),
                          left: 4, right: 4,
                          background: `${color}22`,
                          border: `1.5px solid ${color}`,
                          borderRadius: 6,
                          cursor: 'pointer',
                          padding: '3px 6px',
                          overflow: 'hidden',
                          zIndex: 2,
                        }}
                      >
                        <div style={{ fontSize: 10, fontWeight: 700, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {appt.patientRef}
                        </div>
                        {slotSpan >= 1.5 && ct && (
                          <div style={{ fontSize: 9, color: 'var(--fg3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ct.name}
                          </div>
                        )}
                        <Badge
                          variant={appt.status === 'complete' ? 'muted' : appt.status === 'in-progress' ? 'success' : appt.status === 'cancelled' ? 'danger' : 'info'}
                          size="sm"
                          style={{ fontSize: 9, padding: '1px 4px', marginTop: 2 }}
                        >
                          {appt.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit appointment modal */}
      <Modal
        open={!!editingAppt}
        onClose={() => setEditingAppt(null)}
        title={isNewAppt ? 'New Appointment' : 'Edit Appointment'}
        width={480}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div>
              {!isNewAppt && (
                <Button variant="danger" size="sm" onClick={deleteAppt}>Delete</Button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" size="sm" onClick={() => setEditingAppt(null)}>Cancel</Button>
              <Button
                variant="primary" size="sm"
                onClick={saveAppt}
                disabled={!editingAppt?.patientRef || !editingAppt?.clinicTypeId || !editingAppt?.prescriberId}
              >
                {isNewAppt ? 'Add appointment' : 'Save changes'}
              </Button>
            </div>
          </div>
        }
      >
        {editingAppt && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <FF label="Patient reference">
              <input style={inp} value={editingAppt.patientRef || ''} onChange={e => setEditingAppt(a => ({ ...a!, patientRef: e.target.value }))} placeholder="PT-XXXX" />
            </FF>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FF label="Clinic type">
                <select style={inp} value={editingAppt.clinicTypeId || ''} onChange={e => {
                  const ct = clinicTypes.find(c => c.id === e.target.value);
                  setEditingAppt(a => ({ ...a!, clinicTypeId: e.target.value, durationMins: ct?.defaultDurationMins || a!.durationMins }));
                }}>
                  <option value="">Select type…</option>
                  {clinicTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                </select>
              </FF>
              <FF label="Prescriber">
                <select style={inp} value={editingAppt.prescriberId || ''} onChange={e => setEditingAppt(a => ({ ...a!, prescriberId: e.target.value }))}>
                  <option value="">Select…</option>
                  {prescribers.filter(p => p.status !== 'offline').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </FF>
              <FF label="Start time">
                <input style={inp} type="time" value={editingAppt.startTime || '09:00'} onChange={e => setEditingAppt(a => ({ ...a!, startTime: e.target.value }))} />
              </FF>
              <FF label="Duration (mins)">
                <input style={inp} type="number" min={15} max={480} step={15} value={editingAppt.durationMins || 30} onChange={e => setEditingAppt(a => ({ ...a!, durationMins: +e.target.value }))} />
              </FF>
              <FF label="Status">
                <select style={inp} value={editingAppt.status || 'scheduled'} onChange={e => setEditingAppt(a => ({ ...a!, status: e.target.value as Appointment['status'] }))}>
                  <option value="scheduled">Scheduled</option>
                  <option value="in-progress">In progress</option>
                  <option value="complete">Complete</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </FF>
            </div>
            <FF label="Notes (optional)">
              <textarea style={{ ...inp, height: 60, resize: 'vertical' }} value={editingAppt.notes || ''} onChange={e => setEditingAppt(a => ({ ...a!, notes: e.target.value }))} />
            </FF>
          </div>
        )}
      </Modal>

      {/* Add/Edit clinic type modal */}
      <Modal
        open={!!editingClinicType}
        onClose={() => setEditingClinicType(null)}
        title={isNewClinicType ? 'New Clinic Type' : 'Edit Clinic Type'}
        width={440}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditingClinicType(null)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={saveClinicType} disabled={!editingClinicType?.name}>
              {isNewClinicType ? 'Add clinic type' : 'Save changes'}
            </Button>
          </>
        }
      >
        {editingClinicType && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <FF label="Name">
              <input style={inp} value={editingClinicType.name || ''} onChange={e => setEditingClinicType(c => ({ ...c!, name: e.target.value }))} />
            </FF>
            <FF label="Default duration (mins)">
              <input style={inp} type="number" min={15} max={480} step={15} value={editingClinicType.defaultDurationMins || 30} onChange={e => setEditingClinicType(c => ({ ...c!, defaultDurationMins: +e.target.value }))} />
            </FF>
            <FF label="Colour">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PRESET_COLORS.map(col => (
                  <button
                    key={col}
                    onClick={() => setEditingClinicType(c => ({ ...c!, color: col }))}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: col, border: `3px solid ${editingClinicType.color === col ? '#fff' : 'transparent'}`,
                      outline: editingClinicType.color === col ? `2px solid ${col}` : 'none',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </FF>
            <FF label="Required roles">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ROLES.map(r => {
                  const selected = (editingClinicType.requiredRoles || []).includes(r.value);
                  return (
                    <button
                      key={r.value}
                      onClick={() => {
                        const current = editingClinicType.requiredRoles || [];
                        const next = selected ? current.filter(x => x !== r.value) : [...current, r.value];
                        setEditingClinicType(c => ({ ...c!, requiredRoles: next }));
                      }}
                      style={{
                        padding: '4px 10px', borderRadius: 'var(--r-pill)',
                        border: `1.5px solid ${selected ? (editingClinicType.color || '#0067B2') : 'var(--border)'}`,
                        background: selected ? `${editingClinicType.color || '#0067B2'}15` : 'transparent',
                        color: selected ? (editingClinicType.color || '#0067B2') : 'var(--fg3)',
                        cursor: 'pointer', fontSize: 'var(--fs-micro)', fontWeight: selected ? 600 : 400,
                      }}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </FF>
          </div>
        )}
      </Modal>
    </div>
  );
}
