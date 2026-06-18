import { useMemo, useState } from 'react';
import { useWorkforce } from '../../store/WorkforceContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';
import { BANK_HOLIDAYS } from '../../data/bankHolidays';
import { isWorkingDay } from '../../store/WorkforceContext';
import type {
  Prescriber, ShiftType, RotaEntry, LeaveRequest, LeaveType, ShiftSwapRequest,
  RotaTrainingSession, BankHoliday, HolidayShiftPreference,
} from '../../types';

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: 'annual-leave', label: 'Annual Leave' },
  { value: 'training', label: 'Training' },
  { value: 'non-pims', label: 'Non-PIMS (non-prescribing)' },
  { value: 'sick', label: 'Sick' },
  { value: 'other', label: 'Other' },
];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
function fmtLong(s: string): string {
  const d = parseYmd(s);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

type StaffStatus = 'red' | 'amber' | 'green' | 'blue';
function staffStatus(count: number, shift: ShiftType): StaffStatus {
  if (count > shift.defaultMax) return 'blue';
  if (count >= shift.defaultMin && count >= shift.defaultRequired) return 'green';
  if (count >= shift.defaultMin) return 'amber';
  if (count >= shift.defaultMin - 1) return 'amber';
  return 'red';
}
const STATUS_ICON: Record<StaffStatus, string> = { red: '🔴', amber: '🟡', green: '🟢', blue: '🔵' };
const STATUS_DOT: Record<StaffStatus, string> = { red: '#DC2626', amber: '#D97706', green: '#16A34A', blue: '#2563EB' };

export function RotaTool() {
  const ctx = useWorkforce();
  const { prescribers, shiftTypes, rotaEntries, leaveRequests, swapRequests, rotaTrainingSessions, holidayWorkedRecords, shiftPreferences, rotaPublishStates, dispatch } = ctx;

  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const [sidePanel, setSidePanel] = useState<'requests' | 'training' | 'settings'>('requests');
  const [fairnessOpen, setFairnessOpen] = useState(false);

  // Modals
  const [assignCtx, setAssignCtx] = useState<{ date: string; shiftTypeId: string } | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [trainingEdit, setTrainingEdit] = useState<RotaTrainingSession | null>(null);
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

  const publishState = rotaPublishStates.find(p => p.yearMonth === yearMonth);
  const isPublished = publishState?.published ?? false;

  const prescriberById = useMemo(() => {
    const m = new Map<string, Prescriber>();
    for (const p of prescribers) m.set(p.id, p);
    return m;
  }, [prescribers]);

  const monthEntries = useMemo(() => rotaEntries.filter(e => e.date.startsWith(yearMonth)), [rotaEntries, yearMonth]);
  const entriesByDate = useMemo(() => {
    const m = new Map<string, RotaEntry[]>();
    for (const e of monthEntries) {
      if (!m.has(e.date)) m.set(e.date, []);
      m.get(e.date)!.push(e);
    }
    return m;
  }, [monthEntries]);

  // Build calendar grid (Mon-first), padded to full weeks
  const calendarDays = useMemo(() => {
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const holidayByDate = useMemo(() => {
    const m = new Map<string, BankHoliday>();
    for (const b of BANK_HOLIDAYS) m.set(b.date, b);
    return m;
  }, []);

  function shiftActiveOn(shift: ShiftType, date: Date): boolean {
    const dow = date.getDay();
    const weekend = dow === 0 || dow === 6;
    return weekend ? shift.activeWeekends : shift.activeWeekdays;
  }

  const pendingLeave = leaveRequests.filter(r => r.status === 'pending');
  const pendingSwaps = swapRequests.filter(r => r.status === 'pending');

  // --- Holiday fairness (this year) ---
  const fairness = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of holidayWorkedRecords) {
      if (r.year === year && r.worked) counts.set(r.prescriberId, (counts.get(r.prescriberId) ?? 0) + 1);
    }
    const rows = prescribers
      .map(p => ({ prescriber: p, count: counts.get(p.id) ?? 0 }))
      .filter(r => r.count > 0 || prescribers.length <= 12);
    const avg = rows.length ? rows.reduce((s, r) => s + r.count, 0) / rows.length : 0;
    return { rows: rows.sort((a, b) => b.count - a.count), avg, max: Math.max(1, ...rows.map(r => r.count)) };
  }, [holidayWorkedRecords, year, prescribers]);

  function goMonth(delta: number) {
    setCursor(new Date(year, month + delta, 1));
    setWeekStart(null);
  }

  function eligibleFor(date: Date, shiftTypeId: string, dateStr: string): Prescriber[] {
    const assigned = new Set((entriesByDate.get(dateStr) ?? []).filter(e => e.shiftTypeId !== shiftTypeId).map(e => e.prescriberId));
    return prescribers.filter(p =>
      (p.status === 'online' || p.status === 'scheduled' || p.status === 'allocated') &&
      isWorkingDay(p, date) &&
      !assigned.has(p.id) &&
      !leaveRequests.some(lr => lr.prescriberId === p.id && lr.status === 'approved' && dateStr >= lr.startDate && dateStr <= lr.endDate)
    );
  }

  // ---------- Day cell ----------
  function DayCell({ date }: { date: Date }) {
    const dateStr = ymd(date);
    const dayEntries = entriesByDate.get(dateStr) ?? [];
    const holiday = holidayByDate.get(dateStr);
    const isToday = ymd(today) === dateStr;
    return (
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-sm)',
        background: isToday ? '#F0F4FF' : 'var(--surface)',
        minHeight: 130,
        padding: 5,
        display: 'flex', flexDirection: 'column', gap: 2,
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
          <span style={{ fontWeight: 700, fontSize: 'var(--fs-small)', color: isToday ? '#05054B' : 'var(--fg2)' }}>{date.getDate()}</span>
          {isPublished && <span title="Published" style={{ fontSize: 9 }}>🔒</span>}
          {holiday && (
            <span title={holiday.name} style={{
              fontSize: 9, fontWeight: 600, padding: '0 5px', borderRadius: 'var(--r-pill)',
              background: holiday.type === 'statutory' ? '#FEF3C7' : '#EDE9FE',
              color: holiday.type === 'statutory' ? '#B45309' : '#6D28D9',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90,
            }}>{holiday.type === 'statutory' ? '🏦' : '✦'} {holiday.name}</span>
          )}
        </div>
        {shiftTypes.map(shift => {
          if (!shiftActiveOn(shift, date)) return null;
          const assigned = dayEntries.filter(e => e.shiftTypeId === shift.id);
          const status = staffStatus(assigned.length, shift);
          return (
            <button
              key={shift.id}
              onClick={() => setAssignCtx({ date: dateStr, shiftTypeId: shift.id })}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '2px 4px', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                border: '1px solid transparent', background: `${shift.color}55`, textAlign: 'left',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: shift.color, flexShrink: 0, border: '1px solid rgba(0,0,0,0.1)' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: shift.textColor, width: 30, flexShrink: 0 }}>{shift.name}</span>
              <span style={{ flex: 1, display: 'flex', gap: 1, flexWrap: 'wrap', minWidth: 0 }}>
                {assigned.slice(0, 6).map(e => {
                  const p = prescriberById.get(e.prescriberId);
                  if (!p) return null;
                  return <span key={e.id} title={p.name} style={{ fontSize: 8, fontWeight: 700, color: '#fff', background: dotColor(p), borderRadius: 3, padding: '0 2px', lineHeight: '12px' }}>{p.initials}</span>;
                })}
                {assigned.length > 6 && <span style={{ fontSize: 8, color: 'var(--fg3)' }}>+{assigned.length - 6}</span>}
              </span>
              <span style={{ fontSize: 8, color: 'var(--fg3)', flexShrink: 0 }}>{assigned.length}/{shift.defaultRequired}</span>
              <span style={{ fontSize: 8, flexShrink: 0 }}>{STATUS_ICON[status]}</span>
            </button>
          );
        })}
      </div>
    );
  }

  function dotColor(p: Prescriber): string {
    return { gp: '#0067B2', pharmacist: '#00AE42', nurse: '#C2185B', specialist: '#6A1B9A' }[p.role];
  }

  // ---------- Week view ----------
  const weekDays = useMemo(() => {
    if (!weekStart) return [];
    return Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));
  }, [weekStart]);

  function openWeekFor(date: Date) {
    const offset = (date.getDay() + 6) % 7;
    setWeekStart(new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset));
    setViewMode('week');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 'var(--space-3)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap',
        boxShadow: 'var(--shadow-1)', border: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Button size="sm" variant="ghost" onClick={() => goMonth(-1)}>←</Button>
          <div style={{ fontWeight: 700, fontSize: 'var(--fs-h4)', minWidth: 150, textAlign: 'center' }}>{MONTH_NAMES[month]} {year}</div>
          <Button size="sm" variant="ghost" onClick={() => goMonth(1)}>→</Button>
        </div>

        <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
          {(['month', 'week'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setViewMode(m); if (m === 'week' && !weekStart) openWeekFor(today.getMonth() === month ? today : new Date(year, month, 1)); }}
              style={{
                padding: '6px 14px', border: 'none', cursor: 'pointer',
                background: viewMode === m ? 'var(--boots-blue)' : 'var(--surface)',
                color: viewMode === m ? '#fff' : 'var(--fg2)', fontSize: 'var(--fs-small)', fontWeight: 600,
              }}
            >{m === 'month' ? 'Month' : 'Week'}</button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <Button size="sm" variant="primary" onClick={() => dispatch({ type: 'GENERATE_ROTA', yearMonth })}>⚡ Generate Rota</Button>
        <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Clear all rota entries for ${MONTH_NAMES[month]} ${year}?`)) dispatch({ type: 'CLEAR_ROTA_MONTH', yearMonth }); }}>Clear month</Button>
        <Button size="sm" variant="ghost" onClick={() => copyPreviousMonth()}>Copy prev</Button>
        <Button size="sm" variant={isPublished ? 'success' : 'secondary'} onClick={() => dispatch({ type: 'SET_ROTA_PUBLISH_STATE', yearMonth, published: !isPublished })}>
          {isPublished ? '🔒 Published' : '🔓 Lock / Publish'}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setNotifyOpen(true)}>🔔 Notify Team</Button>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', flex: 1, minHeight: 0 }}>
        {/* Main calendar area */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {/* Fairness strip */}
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-1)' }}>
            <button onClick={() => setFairnessOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: 12 }}>⚖️</span>
              <span style={{ fontWeight: 700, fontSize: 'var(--fs-small)' }}>Holiday fairness — {year}</span>
              <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)' }}>avg {fairness.avg.toFixed(1)} special days / prescriber</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: 'var(--fg3)' }}>{fairnessOpen ? '▲' : '▼'}</span>
            </button>
            {fairnessOpen && (
              <div style={{ padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 200, overflowY: 'auto' }}>
                {fairness.rows.length === 0 && <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)' }}>No holiday shifts worked yet. Generate a rota to populate.</div>}
                {fairness.rows.map(r => {
                  const diff = r.count - fairness.avg;
                  const color = diff >= 2 ? '#DC2626' : diff <= -1 ? '#2563EB' : '#16A34A';
                  return (
                    <div key={r.prescriber.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 90, fontSize: 'var(--fs-micro)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.prescriber.name}</span>
                      <div style={{ flex: 1, height: 10, background: 'var(--surface-alt)', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{ width: `${(r.count / fairness.max) * 100}%`, height: '100%', background: color }} />
                      </div>
                      <span style={{ width: 24, fontSize: 'var(--fs-micro)', fontWeight: 700, color, textAlign: 'right' }}>{r.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {viewMode === 'month' ? (
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-1)', padding: 'var(--space-3)', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
                {WEEKDAY_HEADERS.map(h => (
                  <div key={h} style={{ textAlign: 'center', fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--fg3)', textTransform: 'uppercase' }}>{h}</div>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'min-content', gap: 4 }}>
                {calendarDays.map((d, i) => d ? (
                  <div key={i} onDoubleClick={() => openWeekFor(d)} title="Double-click for week view">
                    <DayCell date={d} />
                  </div>
                ) : <div key={i} />)}
              </div>
            </div>
          ) : (
            <WeekView />
          )}
        </div>

        {/* Side panel */}
        <div style={{ width: 230, flexShrink: 0, background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {(['requests', 'training', 'settings'] as const).map(t => (
              <button key={t} onClick={() => setSidePanel(t)} style={{
                flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer', background: 'transparent',
                borderBottom: sidePanel === t ? '2px solid var(--boots-blue)' : '2px solid transparent',
                color: sidePanel === t ? 'var(--fg1)' : 'var(--fg3)', fontSize: 'var(--fs-micro)', fontWeight: 700,
                textTransform: 'capitalize',
              }}>{t === 'requests' ? `Requests` : t}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-3)' }}>
            {sidePanel === 'requests' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div>
                  <div style={panelHeading}>Pending Leave ({pendingLeave.length})</div>
                  {pendingLeave.length === 0 && <Empty>No pending leave</Empty>}
                  {pendingLeave.map(r => (
                    <RequestCard key={r.id} title={prescriberById.get(r.prescriberId)?.name ?? '?'}
                      subtitle={`${LEAVE_TYPES.find(t => t.value === r.type)?.label} · ${r.startDate} → ${r.endDate}`}
                      onApprove={() => dispatch({ type: 'UPDATE_LEAVE_REQUEST', request: { ...r, status: 'approved' } })}
                      onReject={() => dispatch({ type: 'UPDATE_LEAVE_REQUEST', request: { ...r, status: 'rejected' } })} />
                  ))}
                </div>
                <div>
                  <div style={panelHeading}>Pending Swaps ({pendingSwaps.length})</div>
                  {pendingSwaps.length === 0 && <Empty>No pending swaps</Empty>}
                  {pendingSwaps.map(r => (
                    <RequestCard key={r.id} title={`${prescriberById.get(r.requesterId)?.initials} ⇄ ${prescriberById.get(r.targetPrescriberId)?.initials}`}
                      subtitle={`${r.requesterDate} ⇄ ${r.targetDate}`}
                      onApprove={() => dispatch({ type: 'UPDATE_SWAP_REQUEST', request: { ...r, status: 'approved' } })}
                      onReject={() => dispatch({ type: 'UPDATE_SWAP_REQUEST', request: { ...r, status: 'rejected' } })} />
                  ))}
                </div>
                <Button size="sm" variant="secondary" onClick={() => setLeaveOpen(true)}>+ New leave request</Button>
                <Button size="sm" variant="ghost" onClick={() => setSwapOpen(true)}>+ New swap request</Button>
              </div>
            )}
            {sidePanel === 'training' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={panelHeading}>Training Sessions</div>
                {rotaTrainingSessions.length === 0 && <Empty>No sessions planned</Empty>}
                {[...rotaTrainingSessions].sort((a, b) => a.date.localeCompare(b.date)).map(s => (
                  <button key={s.id} onClick={() => { setTrainingEdit(s); setTrainingOpen(true); }} style={{
                    textAlign: 'left', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 8, cursor: 'pointer', background: 'var(--surface)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 'var(--fs-small)', flex: 1 }}>{s.title}</span>
                      {s.mandatory && <Badge variant="danger" size="sm">Mandatory</Badge>}
                    </div>
                    <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)', marginTop: 2 }}>{fmtLong(s.date)} · {s.startTime}–{s.endTime}</div>
                    <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)' }}>{s.attendeeIds.length}/{s.capacity} attendees</div>
                  </button>
                ))}
                <Button size="sm" variant="secondary" onClick={() => { setTrainingEdit(null); setTrainingOpen(true); }}>+ New training session</Button>
              </div>
            )}
            {sidePanel === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={panelHeading}>Shift configuration</div>
                {shiftTypes.map(s => (
                  <div key={s.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, border: '1px solid rgba(0,0,0,0.1)' }} />
                      <span style={{ fontWeight: 700, fontSize: 'var(--fs-small)' }}>{s.name}</span>
                      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)' }}>{s.startTime}–{s.endTime}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 6px', alignItems: 'center' }}>
                      {(['defaultRequired', 'defaultMin', 'defaultMax'] as const).map(k => (
                        <ConfigRow key={k} label={k === 'defaultRequired' ? 'Required' : k === 'defaultMin' ? 'Min' : 'Max'} value={s[k]}
                          onChange={v => dispatch({ type: 'UPDATE_SHIFT_TYPE', shiftType: { ...s, [k]: v } })} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-micro)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={s.activeWeekdays} onChange={e => dispatch({ type: 'UPDATE_SHIFT_TYPE', shiftType: { ...s, activeWeekdays: e.target.checked } })} /> Weekdays
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-micro)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={s.activeWeekends} onChange={e => dispatch({ type: 'UPDATE_SHIFT_TYPE', shiftType: { ...s, activeWeekends: e.target.checked } })} /> Weekends
                      </label>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)', background: 'var(--surface-alt)', padding: 8, borderRadius: 'var(--r-md)', lineHeight: 1.4 }}>
                  ℹ️ Staffing indicators compare scheduled vs required headcount. Future integration with order forecasting will refine required headcount per shift based on predicted demand.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {assignCtx && <AssignShiftModal />}
      {leaveOpen && <LeaveRequestModal />}
      {swapOpen && <SwapRequestModal />}
      {trainingOpen && <TrainingSessionModal />}
      {notifyOpen && <NotifyModal />}
    </div>
  );

  // ============ Week View ============
  function WeekView() {
    if (weekDays.length === 0) return <div style={{ padding: 20, color: 'var(--fg3)' }}>Select a week.</div>;
    return (
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-1)', padding: 'var(--space-3)', flex: 1, minHeight: 0, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Button size="sm" variant="ghost" onClick={() => weekStart && setWeekStart(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() - 7))}>← Prev week</Button>
          <span style={{ fontWeight: 700, fontSize: 'var(--fs-small)' }}>{fmtLong(ymd(weekDays[0]))} – {fmtLong(ymd(weekDays[6]))}</span>
          <Button size="sm" variant="ghost" onClick={() => weekStart && setWeekStart(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7))}>Next week →</Button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `70px repeat(7, 1fr)`, gap: 4 }}>
          <div />
          {weekDays.map(d => {
            const holiday = holidayByDate.get(ymd(d));
            return (
              <div key={ymd(d)} style={{ textAlign: 'center', fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--fg2)', padding: '2px 0' }}>
                {d.toLocaleDateString('en-GB', { weekday: 'short' })} {d.getDate()}
                {holiday && <div style={{ fontSize: 8, color: holiday.type === 'statutory' ? '#B45309' : '#6D28D9' }}>{holiday.type === 'statutory' ? '🏦' : '✦'}</div>}
              </div>
            );
          })}
          {shiftTypes.map(shift => (
            <RowFragment key={shift.id} shift={shift} />
          ))}
        </div>
      </div>
    );

    function RowFragment({ shift }: { shift: ShiftType }) {
      return (
        <>
          <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: shift.textColor, background: `${shift.color}55`, borderRadius: 'var(--r-sm)', padding: '4px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {shift.name}<span style={{ fontWeight: 400, fontSize: 8 }}>{shift.startTime}–{shift.endTime}</span>
          </div>
          {weekDays.map(d => {
            const dateStr = ymd(d);
            if (!shiftActiveOn(shift, d)) return <div key={dateStr} style={{ background: 'var(--surface-alt)', borderRadius: 'var(--r-sm)' }} />;
            const assigned = (entriesByDate.get(dateStr) ?? []).filter(e => e.shiftTypeId === shift.id);
            const status = staffStatus(assigned.length, shift);
            return (
              <button key={dateStr} onClick={() => setAssignCtx({ date: dateStr, shiftTypeId: shift.id })} style={{
                border: `1px solid var(--border)`, borderLeft: `3px solid ${STATUS_DOT[status]}`, borderRadius: 'var(--r-sm)', background: 'var(--surface)',
                minHeight: 48, padding: 4, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left',
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, flex: 1 }}>
                  {assigned.map(e => {
                    const p = prescriberById.get(e.prescriberId);
                    if (!p) return null;
                    return <span key={e.id} title={p.name} style={{ fontSize: 8, fontWeight: 700, color: '#fff', background: dotColor(p), borderRadius: 3, padding: '0 3px' }}>{p.initials}</span>;
                  })}
                </div>
                <span style={{ fontSize: 8, color: 'var(--fg3)' }}>{assigned.length}/{shift.defaultRequired} {STATUS_ICON[status]}</span>
              </button>
            );
          })}
        </>
      );
    }
  }

  // ============ Assign Shift Modal ============
  function AssignShiftModal() {
    if (!assignCtx) return null;
    const { date, shiftTypeId } = assignCtx;
    const dateObj = parseYmd(date);
    const shift = shiftTypes.find(s => s.id === shiftTypeId)!;
    const holiday = holidayByDate.get(date);
    const assigned = (entriesByDate.get(date) ?? []).filter(e => e.shiftTypeId === shiftTypeId);
    const assignedIds = new Set(assigned.map(e => e.prescriberId));
    const eligible = eligibleFor(dateObj, shiftTypeId, date);

    function toggle(p: Prescriber) {
      const existing = assigned.find(e => e.prescriberId === p.id);
      if (existing) {
        dispatch({ type: 'DELETE_ROTA_ENTRY', id: existing.id });
      } else {
        dispatch({ type: 'ADD_ROTA_ENTRY', entry: { id: uid('rota'), prescriberId: p.id, date, shiftTypeId, status: 'scheduled' } });
      }
    }

    const prefFor = (pid: string): HolidayShiftPreference | null => {
      if (!holiday) return null;
      return shiftPreferences.find(s => s.prescriberId === pid && s.holidayId === holiday.id)?.preference ?? 'flexible';
    };

    return (
      <Modal open onClose={() => setAssignCtx(null)} width={560}
        title={`Assign to ${shift.name} — ${fmtLong(date)}`}
        footer={<Button size="sm" variant="primary" onClick={() => setAssignCtx(null)}>Done</Button>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {holiday && <Badge variant={holiday.type === 'statutory' ? 'warning' : 'info'}>{holiday.type === 'statutory' ? '🏦' : '✦'} {holiday.name} — preferences shown below</Badge>}
          <div style={{ fontSize: 'var(--fs-small)', color: 'var(--fg3)' }}>Assigned {assigned.length} / target {shift.defaultRequired} (min {shift.defaultMin}, max {shift.defaultMax})</div>
          <div>
            <div style={panelHeading}>Assigned</div>
            {assigned.length === 0 && <Empty>None assigned</Empty>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {assigned.map(e => {
                const p = prescriberById.get(e.prescriberId);
                if (!p) return null;
                return (
                  <button key={e.id} onClick={() => toggle(p)} title="Remove" style={chipStyle(true)}>
                    <Avatar initials={p.initials} role={p.role} size={20} /> {p.name} ✕
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div style={panelHeading}>Eligible prescribers</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
              {eligible.filter(p => !assignedIds.has(p.id)).map(p => {
                const pref = prefFor(p.id);
                return (
                  <button key={p.id} onClick={() => toggle(p)} style={chipStyle(false)}>
                    <Avatar initials={p.initials} role={p.role} size={20} /> {p.name}
                    {pref && pref !== 'flexible' && <span style={{ fontSize: 9, color: pref === 'happy-to-work' ? '#16A34A' : '#DC2626' }}>{pref === 'happy-to-work' ? '👍' : '🚫'}</span>}
                  </button>
                );
              })}
              {eligible.filter(p => !assignedIds.has(p.id)).length === 0 && <Empty>No further eligible prescribers (pattern/leave)</Empty>}
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // ============ Leave Request Modal ============
  function LeaveRequestModal() {
    const [prescriberId, setPid] = useState(prescribers[0]?.id ?? '');
    const [type, setType] = useState<LeaveType>('annual-leave');
    const [startDate, setStart] = useState(ymd(today));
    const [endDate, setEnd] = useState(ymd(today));
    const [note, setNote] = useState('');

    function submit(approve: boolean) {
      const req: LeaveRequest = { id: uid('leave'), prescriberId, startDate, endDate, type, status: approve ? 'approved' : 'pending', note, requestedAt: new Date().toISOString() };
      dispatch({ type: 'ADD_LEAVE_REQUEST', request: req });
      if (approve) dispatch({ type: 'UPDATE_LEAVE_REQUEST', request: req });
      setLeaveOpen(false);
    }

    return (
      <Modal open onClose={() => setLeaveOpen(false)} title="New leave request" width={460}
        footer={<>
          <Button size="sm" variant="ghost" onClick={() => setLeaveOpen(false)}>Cancel</Button>
          <Button size="sm" variant="secondary" onClick={() => submit(false)}>Submit as pending</Button>
          <Button size="sm" variant="primary" onClick={() => submit(true)}>Approve now</Button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Field label="Prescriber"><select style={selectStyle} value={prescriberId} onChange={e => setPid(e.target.value)}>{prescribers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Type"><select style={selectStyle} value={type} onChange={e => setType(e.target.value as LeaveType)}>{LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Field label="Start date"><input type="date" style={inputStyle} value={startDate} onChange={e => setStart(e.target.value)} /></Field>
            <Field label="End date"><input type="date" style={inputStyle} value={endDate} onChange={e => setEnd(e.target.value)} /></Field>
          </div>
          <Field label="Note"><input style={inputStyle} value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" /></Field>
        </div>
      </Modal>
    );
  }

  // ============ Swap Request Modal ============
  function SwapRequestModal() {
    const [requesterId, setReq] = useState(prescribers[0]?.id ?? '');
    const [requesterDate, setReqDate] = useState(ymd(today));
    const [requesterShiftTypeId, setReqShift] = useState(shiftTypes[0]?.id ?? '');
    const [targetPrescriberId, setTarget] = useState(prescribers[1]?.id ?? '');
    const [targetDate, setTargetDate] = useState(ymd(today));
    const [targetShiftTypeId, setTargetShift] = useState(shiftTypes[0]?.id ?? '');
    const [note, setNote] = useState('');

    const requester = prescriberById.get(requesterId);
    // Similarly trained: shares at least one trained service
    const similar = prescribers.filter(p => p.id !== requesterId && requester && p.serviceIds.some(s => requester.serviceIds.includes(s)));

    function submit() {
      const req: ShiftSwapRequest = { id: uid('swap'), requesterId, targetPrescriberId, requesterDate, requesterShiftTypeId, targetDate, targetShiftTypeId, status: 'pending', note, requestedAt: new Date().toISOString() };
      dispatch({ type: 'ADD_SWAP_REQUEST', request: req });
      setSwapOpen(false);
    }

    return (
      <Modal open onClose={() => setSwapOpen(false)} title="New shift swap request" width={500}
        footer={<><Button size="sm" variant="ghost" onClick={() => setSwapOpen(false)}>Cancel</Button><Button size="sm" variant="primary" onClick={submit}>Submit swap</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Field label="Requester"><select style={selectStyle} value={requesterId} onChange={e => { setReq(e.target.value); }}>{prescribers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Field label="Their date"><input type="date" style={inputStyle} value={requesterDate} onChange={e => setReqDate(e.target.value)} /></Field>
            <Field label="Their shift"><select style={selectStyle} value={requesterShiftTypeId} onChange={e => setReqShift(e.target.value)}>{shiftTypes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          </div>
          <Field label="Swap with (similarly trained)"><select style={selectStyle} value={targetPrescriberId} onChange={e => setTarget(e.target.value)}>{similar.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Field label="Target date"><input type="date" style={inputStyle} value={targetDate} onChange={e => setTargetDate(e.target.value)} /></Field>
            <Field label="Target shift"><select style={selectStyle} value={targetShiftTypeId} onChange={e => setTargetShift(e.target.value)}>{shiftTypes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          </div>
          <Field label="Note"><input style={inputStyle} value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" /></Field>
        </div>
      </Modal>
    );
  }

  // ============ Training Session Modal ============
  function TrainingSessionModal() {
    const editing = trainingEdit;
    const [title, setTitle] = useState(editing?.title ?? '');
    const [date, setDate] = useState(editing?.date ?? ymd(today));
    const [startTime, setStart] = useState(editing?.startTime ?? '09:00');
    const [endTime, setEnd] = useState(editing?.endTime ?? '12:00');
    const [mandatory, setMandatory] = useState(editing?.mandatory ?? false);
    const [capacity, setCapacity] = useState(editing?.capacity ?? 10);
    const [note, setNote] = useState(editing?.note ?? '');
    const [attendeeIds, setAttendees] = useState<string[]>(editing?.attendeeIds ?? []);

    function toggleAtt(id: string) {
      setAttendees(a => a.includes(id) ? a.filter(x => x !== id) : a.length < capacity ? [...a, id] : a);
    }
    function save() {
      if (!title.trim()) return;
      const session: RotaTrainingSession = { id: editing?.id ?? uid('train'), title, date, startTime, endTime, mandatory, capacity, attendeeIds, note };
      dispatch({ type: editing ? 'UPDATE_ROTA_TRAINING_SESSION' : 'ADD_ROTA_TRAINING_SESSION', session });
      setTrainingOpen(false);
    }

    return (
      <Modal open onClose={() => setTrainingOpen(false)} title={editing ? 'Edit training session' : 'New training session'} width={520}
        footer={<>
          {editing && <Button size="sm" variant="danger" onClick={() => { dispatch({ type: 'DELETE_ROTA_TRAINING_SESSION', id: editing.id }); setTrainingOpen(false); }}>Delete</Button>}
          <Button size="sm" variant="ghost" onClick={() => setTrainingOpen(false)}>Cancel</Button>
          <Button size="sm" variant="primary" onClick={save} disabled={!title.trim()}>Save</Button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Field label="Title"><input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Safeguarding refresher" /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
            <Field label="Date"><input type="date" style={inputStyle} value={date} onChange={e => setDate(e.target.value)} /></Field>
            <Field label="Start"><input type="time" style={inputStyle} value={startTime} onChange={e => setStart(e.target.value)} /></Field>
            <Field label="End"><input type="time" style={inputStyle} value={endTime} onChange={e => setEnd(e.target.value)} /></Field>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-small)', cursor: 'pointer' }}>
              <input type="checkbox" checked={mandatory} onChange={e => setMandatory(e.target.checked)} /> Mandatory
            </label>
            <Field label="Capacity"><input type="number" min={1} style={{ ...inputStyle, width: 80 }} value={capacity} onChange={e => setCapacity(Math.max(1, Number(e.target.value)))} /></Field>
            <Button size="sm" variant="ghost" onClick={() => setAttendees(prescribers.slice(0, capacity).map(p => p.id))}>Auto-fill</Button>
          </div>
          <div>
            <div style={panelHeading}>Attendees ({attendeeIds.length}/{capacity})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 200, overflowY: 'auto' }}>
              {prescribers.map(p => {
                const sel = attendeeIds.includes(p.id);
                return <button key={p.id} onClick={() => toggleAtt(p.id)} style={chipStyle(sel)}><Avatar initials={p.initials} role={p.role} size={18} /> {p.name}</button>;
              })}
            </div>
          </div>
          <Field label="Note"><input style={inputStyle} value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" /></Field>
        </div>
      </Modal>
    );
  }

  // ============ Notify Modal ============
  function NotifyModal() {
    const [sendEmail, setSendEmail] = useState(true);
    const [sendSms, setSendSms] = useState(false);
    const [sent, setSent] = useState(false);
    const recipients = prescribers.filter(p => p.email || p.phone);
    const message = `Hi team — the rota for ${MONTH_NAMES[month]} ${year} is now ${isPublished ? 'published' : 'available to preview'}. Please review your shifts and raise any leave or swap requests via PIMS.`;

    return (
      <Modal open onClose={() => setNotifyOpen(false)} title="Notify Team" width={520}
        footer={<>
          <Button size="sm" variant="ghost" onClick={() => setNotifyOpen(false)}>Close</Button>
          <Button size="sm" variant="primary" disabled={!sendEmail && !sendSms} onClick={() => setSent(true)}>Send</Button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {sent && <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: 10, borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 'var(--fs-small)' }}>✓ Notification queued to {recipients.length} prescriber(s) via {[sendEmail && 'Email', sendSms && 'SMS'].filter(Boolean).join(' & ')}. (Demonstration only — nothing is actually sent.)</div>}
          <div>
            <div style={panelHeading}>Message preview</div>
            <div style={{ background: 'var(--surface-alt)', borderRadius: 'var(--r-md)', padding: 12, fontSize: 'var(--fs-small)', lineHeight: 1.5 }}>{message}</div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-small)', cursor: 'pointer' }}><input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} /> Send via Email</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-small)', cursor: 'pointer' }}><input type="checkbox" checked={sendSms} onChange={e => setSendSms(e.target.checked)} /> Send via SMS</label>
          </div>
          <div>
            <div style={panelHeading}>Recipients ({recipients.length})</div>
            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {recipients.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-micro)', padding: '3px 0' }}>
                  <Avatar initials={p.initials} role={p.role} size={20} />
                  <span style={{ flex: 1, fontWeight: 600 }}>{p.name}</span>
                  <span style={{ color: 'var(--fg3)' }}>{p.email || '—'}</span>
                  <span style={{ color: 'var(--fg3)' }}>{p.phone || '—'}</span>
                </div>
              ))}
              {recipients.length === 0 && <Empty>No prescribers have contact details. Add them in People.</Empty>}
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  function copyPreviousMonth() {
    const prev = new Date(year, month - 1, 1);
    const prevYm = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    const prevEntries = rotaEntries.filter(e => e.date.startsWith(prevYm));
    if (prevEntries.length === 0) { alert('No entries in the previous month to copy.'); return; }
    dispatch({ type: 'CLEAR_ROTA_MONTH', yearMonth });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (const e of prevEntries) {
      const dayOfMonth = Number(e.date.slice(8, 10));
      if (dayOfMonth > daysInMonth) continue;
      const newDate = `${yearMonth}-${String(dayOfMonth).padStart(2, '0')}`;
      dispatch({ type: 'ADD_ROTA_ENTRY', entry: { ...e, id: uid('rota'), date: newDate } });
    }
  }
}

// ---------- Small presentational helpers ----------
const panelHeading: React.CSSProperties = { fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 };

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)', padding: '4px 0' }}>{children}</div>;
}

function RequestCard({ title, subtitle, onApprove, onReject }: { title: string; subtitle: string; onApprove: () => void; onReject: () => void }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 8, marginBottom: 6 }}>
      <div style={{ fontWeight: 700, fontSize: 'var(--fs-small)' }}>{title}</div>
      <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)', marginBottom: 6 }}>{subtitle}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onApprove} style={{ flex: 1, padding: '3px 0', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--success-bg)', color: 'var(--success)', fontSize: 'var(--fs-micro)', fontWeight: 700, cursor: 'pointer' }}>Approve</button>
        <button onClick={onReject} style={{ flex: 1, padding: '3px 0', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: 'var(--fs-micro)', fontWeight: 700, cursor: 'pointer' }}>Reject</button>
      </div>
    </div>
  );
}

function ConfigRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <>
      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)' }}>{label}</span>
      <input type="number" min={0} value={value} onChange={e => onChange(Math.max(0, Number(e.target.value)))}
        style={{ width: 56, padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 'var(--fs-micro)' }} />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 8px 3px 4px', borderRadius: 'var(--r-pill)', cursor: 'pointer',
    border: `1.5px solid ${active ? '#05054B' : 'var(--border)'}`,
    background: active ? '#F0F4FF' : 'var(--surface)',
    color: active ? '#05054B' : 'var(--fg2)', fontSize: 'var(--fs-micro)', fontWeight: 600,
  };
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--r-md)',
  fontSize: 'var(--fs-small)', color: 'var(--fg1)', background: 'var(--surface)', width: '100%', outline: 'none',
};
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };
