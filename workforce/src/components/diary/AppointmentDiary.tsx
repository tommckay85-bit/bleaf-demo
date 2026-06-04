import { useState } from 'react';
import { useWorkforce } from '../../store/WorkforceContext';
import { Button } from '../common/Button';
import { Avatar } from '../common/Avatar';
import { Modal } from '../common/Modal';
import type { Appointment, ClinicType, PrescriberRole } from '../../types';

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

const PRESET_COLORS = ['#00838F', '#1565C0', '#6A1B9A', '#2E7D32', '#C2185B', '#E65100', '#D97706', '#0067B2'];
const ROLES: { value: PrescriberRole; label: string }[] = [
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'gp', label: 'GP' },
  { value: 'specialist', label: 'Specialist' },
];

const inp: React.CSSProperties = {
  padding: '8px 12px', border: '1.5px solid var(--border)',
  borderRadius: 'var(--r-md)', fontSize: 'var(--fs-small)',
  color: 'var(--fg1)', background: 'var(--surface)', width: '100%', outline: 'none',
};

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );
}

// Returns the slots (0-based) that an appointment occupies
function getAppointmentSlots(startTime: string, durationMins: number): number[] {
  const startSlot = timeToSlot(startTime);
  const numSlots = Math.ceil(durationMins / SLOT_MINS);
  return Array.from({ length: numSlots }, (_, i) => startSlot + i);
}

export function AppointmentDiary() {
  const { prescribers, appointments, clinicTypes, breakGroups, dispatch } = useWorkforce();

  const [editingAppt, setEditingAppt] = useState<Partial<Appointment> | null>(null);
  const [isNewAppt, setIsNewAppt] = useState(false);
  const [editingClinicType, setEditingClinicType] = useState<Partial<ClinicType> | null>(null);
  const [isNewClinicType, setIsNewClinicType] = useState(false);
  const [expandedCell, setExpandedCell] = useState<{ clinicTypeId: string; slot: number } | null>(null);

  function openNewAppt(clinicTypeId: string, slotIndex: number) {
    const ct = clinicTypes.find(c => c.id === clinicTypeId);
    setEditingAppt({
      id: '',
      clinicTypeId,
      prescriberId: '',
      startTime: slotToTime(slotIndex),
      durationMins: ct?.defaultDurationMins || 30,
      patientRef: '',
      status: 'scheduled',
    });
    setIsNewAppt(true);
    setExpandedCell(null);
  }

  function openEditAppt(appt: Appointment) {
    setEditingAppt({ ...appt });
    setIsNewAppt(false);
    setExpandedCell(null);
  }

  function saveAppt() {
    if (!editingAppt?.patientRef || !editingAppt?.prescriberId || !editingAppt?.clinicTypeId) return;
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

  function cancelAppt() {
    if (editingAppt?.id) {
      dispatch({ type: 'UPDATE_APPOINTMENT', appointment: { ...(editingAppt as Appointment), status: 'cancelled' } });
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

  const CELL_H = 44;
  const TIME_W = 56;
  const COL_W = 180;

  // Build slot groups: for each clinicType × slot, which appointments start there?
  const slotGroups: Record<string, Appointment[]> = {};
  for (const appt of appointments) {
    if (appt.status === 'cancelled') continue;
    const key = `${appt.clinicTypeId}::${timeToSlot(appt.startTime)}`;
    if (!slotGroups[key]) slotGroups[key] = [];
    slotGroups[key].push(appt);
  }

  // Slots occupied (to show continuation spans)
  const occupied: Record<string, boolean> = {};
  for (const appt of appointments) {
    if (appt.status === 'cancelled') continue;
    const slots = getAppointmentSlots(appt.startTime, appt.durationMins);
    for (const s of slots) {
      occupied[`${appt.clinicTypeId}::${s}`] = true;
    }
  }

  const expandedAppts = expandedCell
    ? (slotGroups[`${expandedCell.clinicTypeId}::${expandedCell.slot}`] || [])
    : [];

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
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                borderRadius: 'var(--r-pill)', border: `1.5px solid ${ct.color}`,
                background: `${ct.color}15`, color: ct.color,
                cursor: 'pointer', fontSize: 'var(--fs-micro)', fontWeight: 600,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: ct.color, display: 'inline-block' }} />
              {ct.name} ({ct.defaultDurationMins}m)
            </button>
          ))}
          {breakGroups.filter(bg => bg.enabled).map(bg => (
            <div key={bg.id} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
              borderRadius: 'var(--r-pill)', border: `1.5px solid ${bg.color}`,
              background: `${bg.color}15`, color: bg.color,
              fontSize: 'var(--fs-micro)', fontWeight: 600,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: bg.color, display: 'inline-block' }} />
              {bg.name} {bg.startTime}–{bg.endTime}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button variant="ghost" size="sm" onClick={() => { setEditingClinicType({ color: PRESET_COLORS[clinicTypes.length % PRESET_COLORS.length], defaultDurationMins: 30, requiredRoles: [] }); setIsNewClinicType(true); }}>
            + Clinic Type
          </Button>
        </div>
      </div>

      {/* Diary grid */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-1)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', minWidth: TIME_W + clinicTypes.length * COL_W }}>

          {/* Time column */}
          <div style={{ width: TIME_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 10, background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
            <div style={{ height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-alt)', position: 'sticky', top: 0, zIndex: 11 }}>
              <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg4)', fontWeight: 600 }}>Time</span>
            </div>
            {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
              const isHour = i % 2 === 0;
              return (
                <div key={i} style={{
                  height: CELL_H, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  paddingRight: 8, borderBottom: `1px solid ${isHour ? 'var(--border)' : 'var(--border)'}`,
                  background: isHour ? 'transparent' : 'rgba(0,0,0,0.01)',
                }}>
                  {isHour && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg4)' }}>{slotToTime(i)}</span>}
                </div>
              );
            })}
          </div>

          {/* Clinic type columns */}
          {clinicTypes.map(ct => {
            const ctAppointments = appointments.filter(a => a.clinicTypeId === ct.id && a.status !== 'cancelled');
            const totalToday = ctAppointments.length;

            return (
              <div key={ct.id} style={{ width: COL_W, flexShrink: 0, borderRight: '1px solid var(--border)' }}>
                {/* Column header */}
                <div style={{
                  height: 56, borderBottom: '1px solid var(--border)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--surface-alt)', padding: '0 8px',
                  position: 'sticky', top: 0, zIndex: 5,
                  borderTop: `3px solid ${ct.color}`,
                  gap: 2,
                }}>
                  <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: ct.color, whiteSpace: 'nowrap' }}>{ct.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--fg3)' }}>{totalToday} appt{totalToday !== 1 ? 's' : ''} today · {ct.defaultDurationMins}m</div>
                </div>

                {/* Cells */}
                <div style={{ position: 'relative' }}>
                  {Array.from({ length: TOTAL_SLOTS }, (_, slotIdx) => {
                    const cellKey = `${ct.id}::${slotIdx}`;
                    const cellAppts = slotGroups[cellKey] || [];
                    const isOccupiedContinuation = occupied[cellKey] && cellAppts.length === 0;
                    const isHour = slotIdx % 2 === 0;
                    const isExpanded = expandedCell?.clinicTypeId === ct.id && expandedCell?.slot === slotIdx;

                    // Break band
                    const hasBreak = breakGroups.some(bg => {
                      if (!bg.enabled) return false;
                      const start = timeToSlot(bg.startTime);
                      const end = timeToSlot(bg.endTime);
                      return slotIdx >= start && slotIdx < end;
                    });
                    const breakBg = hasBreak ? breakGroups.find(bg => {
                      if (!bg.enabled) return false;
                      const start = timeToSlot(bg.startTime);
                      const end = timeToSlot(bg.endTime);
                      return slotIdx >= start && slotIdx < end;
                    }) : null;

                    return (
                      <div
                        key={slotIdx}
                        onClick={() => {
                          if (cellAppts.length > 1) {
                            setExpandedCell(isExpanded ? null : { clinicTypeId: ct.id, slot: slotIdx });
                          } else if (cellAppts.length === 1) {
                            openEditAppt(cellAppts[0]);
                          } else if (!isOccupiedContinuation) {
                            openNewAppt(ct.id, slotIdx);
                          }
                        }}
                        style={{
                          height: CELL_H,
                          borderBottom: `1px solid ${isHour ? 'var(--border)' : 'rgba(0,0,0,0.04)'}`,
                          cursor: isOccupiedContinuation ? 'default' : 'pointer',
                          background: breakBg
                            ? `${breakBg.color}12`
                            : isOccupiedContinuation
                              ? 'transparent'
                              : isHour ? 'transparent' : 'rgba(0,0,0,0.008)',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 6px',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => {
                          if (!isOccupiedContinuation && !breakBg) e.currentTarget.style.background = 'var(--surface-hover)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = breakBg ? `${breakBg.color}12` : isOccupiedContinuation ? 'transparent' : isHour ? 'transparent' : 'rgba(0,0,0,0.008)';
                        }}
                      >
                        {/* Break label on first slot */}
                        {breakBg && slotIdx === timeToSlot(breakBg.startTime) && (
                          <span style={{ fontSize: 10, color: breakBg.color, fontWeight: 600, opacity: 0.8 }}>{breakBg.name}</span>
                        )}

                        {/* Single appointment */}
                        {cellAppts.length === 1 && (
                          <AppointmentBlock appt={cellAppts[0]} ct={ct} prescribers={prescribers} compact={false} />
                        )}

                        {/* Multiple appointments */}
                        {cellAppts.length > 1 && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: `${ct.color}20`, border: `1.5px solid ${ct.color}`,
                            borderRadius: 6, padding: '4px 8px', width: '100%',
                          }}>
                            <div style={{
                              background: ct.color, color: '#fff',
                              width: 20, height: 20, borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 700, flexShrink: 0,
                            }}>{cellAppts.length}</div>
                            <span style={{ fontSize: 10, fontWeight: 600, color: ct.color }}>appts · click to expand</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded slot popover */}
      {expandedCell && expandedAppts.length > 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(5,5,75,0.35)', backdropFilter: 'blur(2px)',
        }} onClick={() => setExpandedCell(null)}>
          <div
            style={{
              background: 'var(--surface)', borderRadius: 'var(--r-xl)',
              boxShadow: 'var(--shadow-3)', padding: 'var(--space-4)', minWidth: 340, maxWidth: 480,
            }}
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const ct = clinicTypes.find(c => c.id === expandedCell.clinicTypeId)!;
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: ct?.color }}>{ct?.name}</div>
                      <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)' }}>{slotToTime(expandedCell.slot)} · {expandedAppts.length} appointments</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="sm" variant="primary" onClick={() => openNewAppt(expandedCell.clinicTypeId, expandedCell.slot)}>+ Add</Button>
                      <button onClick={() => setExpandedCell(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--fg3)' }}>×</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {expandedAppts.map(appt => {
                      const prescriber = prescribers.find(p => p.id === appt.prescriberId);
                      return (
                        <div
                          key={appt.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 10px', borderRadius: 'var(--r-md)',
                            background: 'var(--surface-alt)', border: '1px solid var(--border)',
                            cursor: 'pointer',
                          }}
                          onClick={() => openEditAppt(appt)}
                        >
                          {prescriber && <Avatar initials={prescriber.initials} role={prescriber.role} size={28} />}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 'var(--fs-small)' }}>{appt.patientRef}</div>
                            <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)' }}>
                              {prescriber?.name} · {appt.startTime} · {appt.durationMins}m
                            </div>
                          </div>
                          <StatusBadge status={appt.status} />
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Add/Edit appointment modal */}
      <Modal
        open={!!editingAppt}
        onClose={() => setEditingAppt(null)}
        title={isNewAppt ? 'New Appointment' : 'Edit Appointment'}
        width={500}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {!isNewAppt && editingAppt?.status !== 'cancelled' && (
                <Button variant="ghost" size="sm" onClick={cancelAppt} style={{ color: 'var(--warning)' }}>Cancel appt</Button>
              )}
              {!isNewAppt && (
                <Button variant="danger" size="sm" onClick={deleteAppt}>Delete</Button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" size="sm" onClick={() => setEditingAppt(null)}>Close</Button>
              <Button variant="primary" size="sm" onClick={saveAppt} disabled={!editingAppt?.patientRef || !editingAppt?.clinicTypeId || !editingAppt?.prescriberId}>
                {isNewAppt ? 'Add appointment' : 'Save changes'}
              </Button>
            </div>
          </div>
        }
      >
        {editingAppt && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FF label="Patient reference">
                <input style={inp} value={editingAppt.patientRef || ''} onChange={e => setEditingAppt(a => ({ ...a!, patientRef: e.target.value }))} placeholder="PT-XXXX" />
              </FF>
              <FF label="Clinic type">
                <select style={inp} value={editingAppt.clinicTypeId || ''} onChange={e => {
                  const ct = clinicTypes.find(c => c.id === e.target.value);
                  setEditingAppt(a => ({ ...a!, clinicTypeId: e.target.value, durationMins: ct?.defaultDurationMins || a!.durationMins }));
                }}>
                  <option value="">Select…</option>
                  {clinicTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                </select>
              </FF>
              <FF label="Prescriber">
                <select style={inp} value={editingAppt.prescriberId || ''} onChange={e => setEditingAppt(a => ({ ...a!, prescriberId: e.target.value }))}>
                  <option value="">Select…</option>
                  {(() => {
                    const ct = clinicTypes.find(c => c.id === editingAppt.clinicTypeId);
                    const eligible = ct?.requiredRoles.length
                      ? prescribers.filter(p => ct.requiredRoles.includes(p.role) && p.status !== 'offline')
                      : prescribers.filter(p => p.status !== 'offline');
                    return eligible.map(p => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>);
                  })()}
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
              <textarea style={{ ...inp, height: 56, resize: 'vertical' }} value={editingAppt.notes || ''} onChange={e => setEditingAppt(a => ({ ...a!, notes: e.target.value }))} />
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
                  <button key={col} onClick={() => setEditingClinicType(c => ({ ...c!, color: col }))} style={{
                    width: 28, height: 28, borderRadius: '50%', background: col,
                    border: `3px solid ${editingClinicType.color === col ? '#fff' : 'transparent'}`,
                    outline: editingClinicType.color === col ? `2px solid ${col}` : 'none',
                    cursor: 'pointer',
                  }} />
                ))}
              </div>
            </FF>
            <FF label="Required roles">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ROLES.map(r => {
                  const selected = (editingClinicType.requiredRoles || []).includes(r.value);
                  return (
                    <button key={r.value} onClick={() => {
                      const current = editingClinicType.requiredRoles || [];
                      const next = selected ? current.filter(x => x !== r.value) : [...current, r.value];
                      setEditingClinicType(c => ({ ...c!, requiredRoles: next }));
                    }} style={{
                      padding: '4px 10px', borderRadius: 'var(--r-pill)',
                      border: `1.5px solid ${selected ? (editingClinicType.color || '#0067B2') : 'var(--border)'}`,
                      background: selected ? `${editingClinicType.color || '#0067B2'}15` : 'transparent',
                      color: selected ? (editingClinicType.color || '#0067B2') : 'var(--fg3)',
                      cursor: 'pointer', fontSize: 'var(--fs-micro)', fontWeight: selected ? 600 : 400,
                    }}>
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

function AppointmentBlock({ appt, ct, prescribers, compact }: {
  appt: Appointment; ct: ClinicType; prescribers: ReturnType<typeof useWorkforce>['prescribers']; compact: boolean;
}) {
  const prescriber = prescribers.find(p => p.id === appt.prescriberId);
  const color = ct.color;
  return (
    <div style={{
      background: `${color}18`, border: `1.5px solid ${color}`,
      borderRadius: 6, padding: '3px 6px', width: '100%',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {prescriber && <Avatar initials={prescriber.initials} role={prescriber.role} size={16} />}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {appt.patientRef}
          </div>
          {!compact && prescriber && (
            <div style={{ fontSize: 9, color: 'var(--fg3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {prescriber.name.split(' ').slice(-1)[0]}
            </div>
          )}
        </div>
        <StatusBadge status={appt.status} tiny />
      </div>
    </div>
  );
}

function StatusBadge({ status, tiny }: { status: Appointment['status']; tiny?: boolean }) {
  const map: Record<string, { label: string; color: string }> = {
    scheduled: { label: 'Sched', color: '#1565C0' },
    'in-progress': { label: 'Live', color: '#2E7D32' },
    complete: { label: 'Done', color: '#6B7280' },
    cancelled: { label: 'Canc', color: '#DC2626' },
  };
  const s = map[status] || map.scheduled;
  return (
    <span style={{
      fontSize: tiny ? 8 : 10,
      fontWeight: 600,
      color: s.color,
      background: `${s.color}18`,
      padding: tiny ? '1px 3px' : '2px 5px',
      borderRadius: 3,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>{s.label}</span>
  );
}
