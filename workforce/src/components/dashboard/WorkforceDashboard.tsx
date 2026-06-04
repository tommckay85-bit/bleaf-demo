import { useState } from 'react';
import { useWorkforce } from '../../store/WorkforceContext';
import { SERVICE_CATEGORIES } from '../../data/services';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Avatar, ROLE_COLORS } from '../common/Avatar';
import { Modal } from '../common/Modal';
import { BodconBanner } from './BodconBanner';
import type { Prescriber, ServiceCategory, NonPrescribingReason } from '../../types';

const DAYS_MINS = 480; // effective prescriber minutes per day

const NON_PRESCRIBING_REASONS: { value: NonPrescribingReason; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'training', label: 'Training' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'other', label: 'Other' },
];

function ragStatus(availableMins: number, requiredMins: number): 'green' | 'amber' | 'red' {
  const gap = requiredMins - availableMins;
  if (gap <= 0) return 'green';
  if (gap <= 180) return 'amber';
  return 'red';
}

const RAG_COLORS = { green: '#2E7D32', amber: '#D97706', red: '#DC2626' };

export function WorkforceDashboard() {
  const { prescribers, orders, allocations, messages, capacityConfigs, nonPrescribingSlots, appointments, clinicTypes, dispatch } = useWorkforce();
  const [dragPrescriberId, setDragPrescriberId] = useState<string | null>(null);
  const [dragFromCategory, setDragFromCategory] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [nonPrescribingModal, setNonPrescribingModal] = useState(false);
  const [npSelectedPrescriber, setNpSelectedPrescriber] = useState<string>('');
  const [npReason, setNpReason] = useState<NonPrescribingReason>('admin');
  const [npNote, setNpNote] = useState('');

  const poolPrescribers = prescribers.filter(p => p.status === 'online');
  const scheduledPrescribers = prescribers.filter(p => p.status === 'scheduled');
  const offlinePrescribers = prescribers.filter(p => p.status === 'offline');
  const nonPrescribingPrescribers = prescribers.filter(p => p.status === 'non-prescribing');
  const appointmentPrescribers = prescribers.filter(p => p.status === 'in-appointment');

  const pendingByCategory = SERVICE_CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat.id] = orders.filter(o =>
      cat.serviceIds.includes(o.serviceId) &&
      (o.status === 'pending' || o.status === 'escalated')
    ).length;
    return acc;
  }, {});

  const messagesByCategory = SERVICE_CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat.id] = messages.filter(m => m.categoryId === cat.id && m.status === 'pending').length;
    return acc;
  }, {});

  const totalPending = orders.filter(o => o.status === 'pending' || o.status === 'escalated').length;
  const allocatedPrescribers = prescribers.filter(p => p.status === 'allocated').length;
  const generalMessages = messages.filter(m => m.isGeneral && m.status === 'pending');

  // Aggregate RAG
  let totalRequired = 0;
  let totalAvailable = 0;
  SERVICE_CATEGORIES.forEach(cat => {
    const cfg = capacityConfigs.find(c => c.categoryId === cat.id);
    if (!cfg) return;
    const catAlloc = allocations.find(a => a.categoryId === cat.id);
    const allocCount = catAlloc?.prescriberIds.length || 0;
    totalAvailable += allocCount * DAYS_MINS;
    totalRequired += (pendingByCategory[cat.id] || 0) * cfg.orderAHTMins + (messagesByCategory[cat.id] || 0) * cfg.messageAHTMins;
  });
  const overallRag = ragStatus(totalAvailable, totalRequired);

  function handleDragStart(prescriberId: string, fromCategory: string | null) {
    setDragPrescriberId(prescriberId);
    setDragFromCategory(fromCategory);
  }

  function handleDrop(categoryId: string) {
    if (!dragPrescriberId) return;
    const p = prescribers.find(p => p.id === dragPrescriberId);
    if (!p) return;
    const cat = SERVICE_CATEGORIES.find(c => c.id === categoryId)!;
    const canWork = cat.serviceIds.some(sId => p.serviceIds.includes(sId));
    if (!canWork) {
      setDragPrescriberId(null);
      setDragFromCategory(null);
      setDropTarget(null);
      return;
    }
    if (dragFromCategory && dragFromCategory !== categoryId) {
      dispatch({ type: 'MOVE_PRESCRIBER', prescriberId: dragPrescriberId, fromCategoryId: dragFromCategory, toCategoryId: categoryId });
    } else if (!dragFromCategory) {
      dispatch({ type: 'ALLOCATE_PRESCRIBER', categoryId, prescriberId: dragPrescriberId });
    }
    setDragPrescriberId(null);
    setDragFromCategory(null);
    setDropTarget(null);
  }

  function handleDropPool() {
    if (!dragPrescriberId || !dragFromCategory) return;
    dispatch({ type: 'DEALLOCATE_PRESCRIBER', prescriberId: dragPrescriberId });
    setDragPrescriberId(null);
    setDragFromCategory(null);
    setDropTarget(null);
  }

  function handleDropNonPrescribing() {
    if (!dragPrescriberId) return;
    setNpSelectedPrescriber(dragPrescriberId);
    setDragPrescriberId(null);
    setDragFromCategory(null);
    setDropTarget(null);
    setNonPrescribingModal(true);
  }

  function submitNonPrescribing() {
    if (!npSelectedPrescriber) return;
    dispatch({
      type: 'ADD_NON_PRESCRIBING',
      slot: { prescriberId: npSelectedPrescriber, reason: npReason, note: npNote || undefined },
    });
    setNonPrescribingModal(false);
    setNpSelectedPrescriber('');
    setNpNote('');
    setNpReason('admin');
  }

  const draggingPrescriber = dragPrescriberId ? prescribers.find(p => p.id === dragPrescriberId) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', height: '100%' }}>
      {/* BODCON banner */}
      <BodconBanner />

      <div style={{ display: 'flex', gap: 'var(--space-5)', flex: 1, minHeight: 0 }}>
      {/* Main grid area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minWidth: 0, overflowY: 'auto' }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--surface)', borderRadius: 'var(--r-lg)',
          padding: 'var(--space-3) var(--space-4)',
          boxShadow: 'var(--shadow-1)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', gap: 'var(--space-5)', alignItems: 'center' }}>
            <Stat label="Pending orders" value={totalPending} color="#D97706" />
            <Stat label="Prescribers active" value={allocatedPrescribers} color="#00AE42" />
            <Stat label="In pool" value={poolPrescribers.length} color="#0067B2" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: RAG_COLORS[overallRag], flexShrink: 0 }} />
              <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)', fontWeight: 600 }}>
                Capacity {overallRag === 'green' ? 'OK' : overallRag === 'amber' ? 'Tight' : 'Critical'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'APPLY_BREAKS' })}>
              ☕ Apply Breaks
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              prescribers.filter(p => p.status === 'allocated').forEach(p => dispatch({ type: 'DEALLOCATE_PRESCRIBER', prescriberId: p.id }));
            }}>
              Clear allocations
            </Button>
            <Button variant="primary" size="sm" onClick={() => dispatch({ type: 'AUTO_ALLOCATE' })}>
              ⚡ Auto-allocate
            </Button>
          </div>
        </div>

        {/* Service category tiles */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 'var(--space-4)',
          alignContent: 'start',
        }}>
          {SERVICE_CATEGORIES.map(cat => {
            const catAlloc = allocations.find(a => a.categoryId === cat.id);
            const allocatedIds = catAlloc?.prescriberIds || [];
            const allocatedPresc = allocatedIds.map(id => prescribers.find(p => p.id === id)).filter(Boolean) as Prescriber[];
            const pending = pendingByCategory[cat.id] || 0;
            const msgs = messagesByCategory[cat.id] || 0;
            const cfg = capacityConfigs.find(c => c.categoryId === cat.id);
            const availMins = allocatedIds.length * DAYS_MINS;
            const reqMins = cfg ? pending * cfg.orderAHTMins + msgs * cfg.messageAHTMins : 0;
            const rag = ragStatus(availMins, reqMins);
            const isDropTarget = dropTarget === cat.id;

            const draggingCanWork = draggingPrescriber
              ? cat.serviceIds.some(sId => draggingPrescriber.serviceIds.includes(sId))
              : true;

            return (
              <ServiceTile
                key={cat.id}
                category={cat}
                allocatedPrescribers={allocatedPresc}
                pendingOrders={pending}
                pendingMessages={msgs}
                rag={rag}
                isDropTarget={isDropTarget}
                isDragIncompatible={!!draggingPrescriber && !draggingCanWork}
                onDragOver={e => { e.preventDefault(); setDropTarget(cat.id); }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={() => handleDrop(cat.id)}
                onPrescriberDragStart={(id) => handleDragStart(id, cat.id)}
                onPrescriberDragEnd={() => setDragPrescriberId(null)}
                onDeallocate={(id) => dispatch({ type: 'DEALLOCATE_PRESCRIBER', prescriberId: id })}
              />
            );
          })}
        </div>

        {/* Special tiles row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
          {/* Non-prescribing tile */}
          <div
            style={{
              background: dropTarget === '__non-prescribing__' ? '#F0F0F4' : 'var(--surface)',
              border: `2px ${dropTarget === '__non-prescribing__' ? 'dashed #6B7280' : 'solid var(--border)'}`,
              borderRadius: 'var(--r-lg)',
              padding: 'var(--space-4)',
              boxShadow: 'var(--shadow-1)',
              minHeight: 140,
            }}
            onDragOver={e => { e.preventDefault(); setDropTarget('__non-prescribing__'); }}
            onDragLeave={() => setDropTarget(null)}
            onDrop={() => { handleDropNonPrescribing(); setDropTarget(null); }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>⏸</span>
                <span style={{ fontWeight: 700, fontSize: 'var(--fs-small)', color: 'var(--fg2)' }}>Non-Prescribing</span>
              </div>
              <button
                onClick={() => { setNpSelectedPrescriber(''); setNonPrescribingModal(true); }}
                style={{
                  border: '1px solid var(--border)', background: 'var(--surface-alt)',
                  borderRadius: 'var(--r-sm)', cursor: 'pointer',
                  fontSize: 14, color: 'var(--fg3)', padding: '2px 8px', lineHeight: 1.4,
                }}
              >+</button>
            </div>
            {nonPrescribingPrescribers.length === 0 ? (
              <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg4)', textAlign: 'center', padding: '12px 0' }}>
                Drop prescriber here or use +
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {nonPrescribingPrescribers.map(p => {
                  const slot = nonPrescribingSlots.find(s => s.prescriberId === p.id);
                  return (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 8px', borderRadius: 'var(--r-sm)',
                      background: 'var(--surface-alt)', border: '1px solid var(--border)',
                    }}>
                      <Avatar initials={p.initials} role={p.role} size={26} style={{ filter: 'grayscale(0.6)' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: 'var(--fg2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        {slot && <div style={{ fontSize: 10, color: 'var(--fg3)', textTransform: 'capitalize' }}>{slot.reason}{slot.note ? ` — ${slot.note}` : ''}</div>}
                      </div>
                      <button
                        onClick={() => dispatch({ type: 'REMOVE_NON_PRESCRIBING', prescriberId: p.id })}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--fg3)', fontSize: 14, padding: '0 2px' }}
                        title="Return to pool"
                      >×</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Appointments tile */}
          <div style={{
            background: 'var(--surface)',
            border: '2px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            padding: 'var(--space-4)',
            boxShadow: 'var(--shadow-1)',
            minHeight: 140,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>📅</span>
              <span style={{ fontWeight: 700, fontSize: 'var(--fs-small)', color: 'var(--fg2)' }}>In Appointments</span>
              <Badge variant="info" size="sm">{appointments.filter(a => a.status === 'in-progress' || a.status === 'scheduled').length} today</Badge>
            </div>
            {appointmentPrescribers.length === 0 ? (
              <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg4)', textAlign: 'center', padding: '12px 0' }}>
                No prescribers currently in appointments
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {appointmentPrescribers.map(p => {
                  const appt = appointments.find(a => a.prescriberId === p.id && a.status === 'in-progress');
                  const ct = appt ? clinicTypes.find(ct => ct.id === appt.clinicTypeId) : null;
                  return (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 8px', borderRadius: 'var(--r-sm)',
                      background: 'var(--info-bg)', border: '1px solid var(--info)',
                    }}>
                      <Avatar initials={p.initials} role={p.role} size={26} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: 'var(--fg1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        {ct && <div style={{ fontSize: 10, color: 'var(--info)' }}>{ct.name}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* General Messages tile */}
          <div style={{
            background: 'var(--surface)',
            border: '2px solid var(--border)',
            borderLeft: '4px solid var(--info)',
            borderRadius: 'var(--r-lg)',
            padding: 'var(--space-4)',
            boxShadow: 'var(--shadow-1)',
            minHeight: 140,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>💬</span>
              <span style={{ fontWeight: 700, fontSize: 'var(--fs-small)', color: 'var(--fg2)' }}>General Messages</span>
            </div>
            <div style={{ fontSize: 'var(--fs-h3)', fontWeight: 700, color: 'var(--info)', marginBottom: 6 }}>
              {generalMessages.length}
              <span style={{ fontSize: 'var(--fs-small)', fontWeight: 400, color: 'var(--fg3)', marginLeft: 4 }}>pending</span>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {(['critical', 'urgent', 'routine'] as const).map(u => {
                const count = generalMessages.filter(m => m.urgency === u).length;
                if (count === 0) return null;
                return (
                  <Badge key={u} variant={u === 'critical' ? 'danger' : u === 'urgent' ? 'warning' : 'muted'} size="sm">
                    {count} {u}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: prescriber pool */}
      <div
        style={{
          width: 240,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          background: dropTarget === '__pool__' ? 'var(--info-bg)' : 'var(--surface)',
          borderRadius: 'var(--r-lg)',
          padding: 'var(--space-4)',
          boxShadow: 'var(--shadow-1)',
          border: dropTarget === '__pool__' ? '2px dashed var(--info)' : '1px solid var(--border)',
          overflowY: 'auto',
          transition: 'all 0.15s ease',
        }}
        onDragOver={e => { e.preventDefault(); setDropTarget('__pool__'); }}
        onDragLeave={() => setDropTarget(null)}
        onDrop={() => { handleDropPool(); setDropTarget(null); }}
      >
        <h3 style={{ fontSize: 'var(--fs-small)', fontWeight: 700, color: 'var(--fg1)', marginBottom: 4 }}>
          Available Pool
        </h3>

        {poolPrescribers.length === 0 && (
          <div style={{ fontSize: 'var(--fs-small)', color: 'var(--fg3)', textAlign: 'center', padding: 'var(--space-4) 0' }}>
            All online prescribers allocated
          </div>
        )}

        {poolPrescribers.map(p => (
          <PoolPrescriberCard
            key={p.id}
            prescriber={p}
            onDragStart={() => handleDragStart(p.id, null)}
            onDragEnd={() => setDragPrescriberId(null)}
          />
        ))}

        {scheduledPrescribers.length > 0 && (
          <>
            <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: 'var(--fg4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
              Scheduled
            </div>
            {scheduledPrescribers.map(p => (
              <PoolPrescriberCard
                key={p.id}
                prescriber={p}
                onDragStart={() => handleDragStart(p.id, null)}
                onDragEnd={() => setDragPrescriberId(null)}
                muted
              />
            ))}
          </>
        )}

        {offlinePrescribers.length > 0 && (
          <>
            <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: 'var(--fg4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
              Offline
            </div>
            {offlinePrescribers.map(p => (
              <OfflineCard key={p.id} prescriber={p} onMarkOnline={() => dispatch({ type: 'SET_PRESCRIBER_STATUS', prescriberId: p.id, status: 'online' })} />
            ))}
          </>
        )}

        {dragFromCategory && (
          <div style={{
            marginTop: 'auto',
            padding: 'var(--space-3)',
            background: 'var(--info-bg)',
            borderRadius: 'var(--r-md)',
            border: '1px dashed var(--info)',
            fontSize: 'var(--fs-micro)',
            color: 'var(--info)',
            textAlign: 'center',
          }}>
            Drop here to return to pool
          </div>
        )}
      </div>

      </div>{/* end flex row */}

      {/* Non-prescribing modal */}
      <Modal
        open={nonPrescribingModal}
        onClose={() => setNonPrescribingModal(false)}
        title="Move to Non-Prescribing"
        width={400}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setNonPrescribingModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={submitNonPrescribing} disabled={!npSelectedPrescriber}>Confirm</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div>
            <label style={labelStyle}>Prescriber</label>
            <select
              style={inputStyle}
              value={npSelectedPrescriber}
              onChange={e => setNpSelectedPrescriber(e.target.value)}
            >
              <option value="">Select prescriber…</option>
              {prescribers.filter(p => p.status !== 'offline' && p.status !== 'non-prescribing').map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Reason</label>
            <select style={inputStyle} value={npReason} onChange={e => setNpReason(e.target.value as NonPrescribingReason)}>
              {NON_PRESCRIBING_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Note (optional)</label>
            <input style={inputStyle} value={npNote} onChange={e => setNpNote(e.target.value)} placeholder="e.g. Team all-hands" />
          </div>
        </div>
      </Modal>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--fs-micro)',
  fontWeight: 600,
  color: 'var(--fg3)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 4,
};

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

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 'var(--fs-h3)', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

interface ServiceTileProps {
  category: ServiceCategory;
  allocatedPrescribers: Prescriber[];
  pendingOrders: number;
  pendingMessages: number;
  rag: 'green' | 'amber' | 'red';
  isDropTarget: boolean;
  isDragIncompatible: boolean;
  onDragOver: React.DragEventHandler;
  onDragLeave: React.DragEventHandler;
  onDrop: React.DragEventHandler;
  onPrescriberDragStart: (id: string) => void;
  onPrescriberDragEnd: () => void;
  onDeallocate: (id: string) => void;
}

function ServiceTile({
  category, allocatedPrescribers, pendingOrders, pendingMessages, rag, isDropTarget, isDragIncompatible,
  onDragOver, onDragLeave, onDrop, onPrescriberDragStart, onPrescriberDragEnd, onDeallocate,
}: ServiceTileProps) {
  const serviceCount = category.serviceIds.length;

  let borderColor = 'var(--border)';
  let bgColor = 'var(--surface)';
  if (isDragIncompatible) {
    borderColor = '#CBD5E1';
    bgColor = 'var(--surface-alt)';
  } else if (isDropTarget) {
    borderColor = category.color;
    bgColor = `${category.color}10`;
  }

  return (
    <div
      onDragOver={isDragIncompatible ? undefined : onDragOver}
      onDragLeave={onDragLeave}
      onDrop={isDragIncompatible ? undefined : onDrop}
      style={{
        background: bgColor,
        border: `2px solid ${isDropTarget && !isDragIncompatible ? borderColor : 'var(--border)'}`,
        borderRadius: 'var(--r-lg)',
        padding: 'var(--space-4)',
        boxShadow: 'var(--shadow-1)',
        transition: 'all 0.15s ease',
        opacity: isDragIncompatible ? 0.5 : 1,
        minHeight: 160,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* RAG indicator bar at top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: RAG_COLORS[rag],
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--r-md)',
            background: `${category.color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
          }}>
            {category.icon}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 'var(--fs-small)', color: 'var(--fg1)' }}>{category.name}</div>
            <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)' }}>{serviceCount} services</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {pendingOrders > 0 && (
            <Badge variant={pendingOrders > 10 ? 'danger' : pendingOrders > 5 ? 'warning' : 'success'} size="sm">{pendingOrders} orders</Badge>
          )}
          {pendingMessages > 0 && (
            <Badge variant="info" size="sm">{pendingMessages} msgs</Badge>
          )}
        </div>
      </div>

      {/* Allocated prescribers */}
      <div style={{ flex: 1 }}>
        {allocatedPrescribers.length === 0 ? (
          <div style={{
            border: '1.5px dashed var(--border-strong)',
            borderRadius: 'var(--r-md)',
            padding: 'var(--space-3)',
            textAlign: 'center',
            fontSize: 'var(--fs-micro)',
            color: 'var(--fg4)',
          }}>
            {isDragIncompatible ? 'Prescriber not qualified' : 'Drop prescriber here'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {allocatedPrescribers.map(p => (
              <AllocatedPrescriberRow
                key={p.id}
                prescriber={p}
                onDragStart={() => onPrescriberDragStart(p.id)}
                onDragEnd={onPrescriberDragEnd}
                onRemove={() => onDeallocate(p.id)}
              />
            ))}
            <div style={{
              border: '1.5px dashed var(--border)',
              borderRadius: 'var(--r-md)',
              padding: '6px',
              textAlign: 'center',
              fontSize: 'var(--fs-micro)',
              color: 'var(--fg4)',
            }}>
              + drop another
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AllocatedPrescriberRow({
  prescriber, onDragStart, onDragEnd, onRemove,
}: {
  prescriber: Prescriber;
  onDragStart: () => void;
  onDragEnd: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 8px',
        borderRadius: 'var(--r-sm)',
        background: 'var(--surface-alt)',
        border: '1px solid var(--border)',
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      <Avatar initials={prescriber.initials} role={prescriber.role} size={26} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: 'var(--fg1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {prescriber.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--fg3)', textTransform: 'capitalize' }}>{prescriber.role}</div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        style={{
          border: 'none', background: 'none', cursor: 'pointer',
          color: 'var(--fg3)', fontSize: 14, padding: '0 2px', lineHeight: 1,
          borderRadius: 4,
        }}
        title="Remove from category"
      >
        ×
      </button>
    </div>
  );
}

function PoolPrescriberCard({
  prescriber, onDragStart, onDragEnd, muted,
}: {
  prescriber: Prescriber;
  onDragStart: () => void;
  onDragEnd: () => void;
  muted?: boolean;
}) {
  return (
    <div
      draggable={!muted}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px',
        borderRadius: 'var(--r-md)',
        background: 'var(--surface-alt)',
        border: '1px solid var(--border)',
        cursor: muted ? 'default' : 'grab',
        opacity: muted ? 0.65 : 1,
        userSelect: 'none',
        transition: 'box-shadow 0.1s ease',
      }}
    >
      <Avatar initials={prescriber.initials} role={prescriber.role} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: 'var(--fg1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {prescriber.name}
        </div>
        <div style={{ fontSize: 10, color: ROLE_COLORS[prescriber.role], fontWeight: 600, textTransform: 'capitalize' }}>{prescriber.role}</div>
      </div>
      {!muted && (
        <div style={{ fontSize: 10, color: 'var(--fg4)' }}>⋮⋮</div>
      )}
      {muted && (
        <Badge variant="warning" size="sm">Sched</Badge>
      )}
    </div>
  );
}

function OfflineCard({ prescriber, onMarkOnline }: { prescriber: Prescriber; onMarkOnline: () => void }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px',
        borderRadius: 'var(--r-md)',
        background: 'var(--surface-alt)',
        border: '1px solid var(--border)',
        opacity: 0.6,
      }}
    >
      <Avatar initials={prescriber.initials} role={prescriber.role} size={28} style={{ filter: 'grayscale(1)' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: 'var(--fg3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {prescriber.name}
        </div>
      </div>
      <button
        onClick={onMarkOnline}
        title="Mark as online"
        style={{
          border: '1px solid var(--border)', background: 'none',
          borderRadius: 'var(--r-sm)', cursor: 'pointer',
          fontSize: 10, color: 'var(--fg3)', padding: '2px 6px',
        }}
      >
        Log in
      </button>
    </div>
  );
}
