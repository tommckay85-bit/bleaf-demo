import { useState } from 'react';
import { useWorkforce } from '../../store/WorkforceContext';
import { SERVICE_CATEGORIES } from '../../data/services';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { Modal } from '../common/Modal';
import type { AllocationRule, SLAConfig, BreakGroup, ServiceCapacityConfig } from '../../types';

const FIELD_LABELS: Record<string, string> = {
  urgency: 'Urgency',
  ageHours: 'Order age (hours)',
  value: 'Order value (£)',
  slaHours: 'SLA window (hours)',
  role: 'Prescriber role',
};

const ACTION_LABELS: Record<string, string> = {
  boost: 'Boost priority',
  deprioritise: 'Deprioritise',
  escalate: 'Escalate',
};

const OP_LABELS: Record<string, string> = {
  gt: '>',
  lt: '<',
  gte: '≥',
  lte: '≤',
  eq: '=',
};

const BREAK_PRESET_COLORS = ['#E65100', '#D97706', '#558B2F', '#1565C0', '#6A1B9A', '#00838F'];

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

const DAYS_MINS = 480;

export function RulesConfig() {
  const { rules, slas, breakGroups, capacityConfigs, orders, messages, prescribers, allocations, dispatch } = useWorkforce();
  const [activeTab, setActiveTab] = useState<'rules' | 'slas' | 'breaks' | 'capacity'>('rules');
  const [editingRule, setEditingRule] = useState<AllocationRule | null>(null);
  const [editingSla, setEditingSla] = useState<SLAConfig | null>(null);
  const [editingBreakGroup, setEditingBreakGroup] = useState<Partial<BreakGroup> | null>(null);
  const [isNewBreakGroup, setIsNewBreakGroup] = useState(false);
  const [editingCapacity, setEditingCapacity] = useState<ServiceCapacityConfig | null>(null);

  function saveRule(rule: AllocationRule) {
    dispatch({ type: 'UPDATE_RULE', rule });
    setEditingRule(null);
  }

  function saveSla(sla: SLAConfig) {
    dispatch({ type: 'UPDATE_SLA', sla });
    setEditingSla(null);
  }

  function saveBreakGroup() {
    if (!editingBreakGroup?.name || !editingBreakGroup.startTime || !editingBreakGroup.endTime) return;
    if (isNewBreakGroup) {
      dispatch({
        type: 'ADD_BREAK_GROUP',
        breakGroup: {
          id: `bg-${Date.now()}`,
          name: editingBreakGroup.name!,
          startTime: editingBreakGroup.startTime!,
          endTime: editingBreakGroup.endTime!,
          prescriberIds: editingBreakGroup.prescriberIds || [],
          enabled: editingBreakGroup.enabled ?? true,
          color: editingBreakGroup.color || BREAK_PRESET_COLORS[0],
        },
      });
    } else {
      dispatch({ type: 'UPDATE_BREAK_GROUP', breakGroup: editingBreakGroup as BreakGroup });
    }
    setEditingBreakGroup(null);
  }

  function saveCapacity() {
    if (!editingCapacity) return;
    dispatch({ type: 'UPDATE_CAPACITY_CONFIG', config: editingCapacity });
    setEditingCapacity(null);
  }

  const sortedRules = [...rules].sort((a, b) => b.weight - a.weight);
  const activePrescribers = prescribers.filter(p => p.status === 'allocated');

  const tabs: { id: 'rules' | 'slas' | 'breaks' | 'capacity'; label: string }[] = [
    { id: 'rules', label: 'Allocation Rules' },
    { id: 'slas', label: 'SLA Configuration' },
    { id: 'breaks', label: 'Break Groups' },
    { id: 'capacity', label: 'Capacity' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 2,
        background: 'var(--surface)', padding: 4,
        borderRadius: 'var(--r-md)', width: 'fit-content',
        border: '1px solid var(--border)',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '6px 20px',
              border: 'none',
              borderRadius: 'var(--r-sm)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 'var(--fs-small)',
              background: activeTab === tab.id ? 'var(--boots-blue)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--fg3)',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'rules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{
            background: 'var(--info-bg)', border: '1px solid var(--info)',
            borderRadius: 'var(--r-md)', padding: 'var(--space-3) var(--space-4)',
            fontSize: 'var(--fs-small)', color: 'var(--info)',
          }}>
            Rules are evaluated in order of weight (highest first). The priority score is computed per order and used to rank the work queue.
          </div>

          {sortedRules.map(rule => (
            <RuleCard key={rule.id} rule={rule} onToggle={() => dispatch({ type: 'UPDATE_RULE', rule: { ...rule, enabled: !rule.enabled } })} onEdit={() => setEditingRule({ ...rule })} />
          ))}
        </div>
      )}

      {activeTab === 'slas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{
            background: 'var(--warning-bg)', border: '1px solid var(--warning)',
            borderRadius: 'var(--r-md)', padding: 'var(--space-3) var(--space-4)',
            fontSize: 'var(--fs-small)', color: 'var(--warning)',
          }}>
            SLA targets define expected response times per category. Warning and critical thresholds trigger badge alerts on the dashboard.
          </div>

          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--r-lg)',
            boxShadow: 'var(--shadow-1)', border: '1px solid var(--border)',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
                  {['Category', 'Target SLA', 'Warning Threshold', 'Critical Threshold', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slas.map((sla, i) => {
                  const cat = SERVICE_CATEGORIES.find(c => c.id === sla.categoryId);
                  return (
                    <tr
                      key={sla.categoryId}
                      style={{ borderBottom: i < slas.length - 1 ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-alt)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{cat?.icon}</span>
                          <span style={{ fontWeight: 600, fontSize: 'var(--fs-small)' }}>{cat?.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 'var(--fs-small)' }}>
                        {sla.targetHours}h
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge variant="warning" size="sm">{sla.warningThresholdPct}% elapsed</Badge>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge variant="danger" size="sm">{sla.criticalThresholdPct}% elapsed</Badge>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Button size="sm" variant="ghost" onClick={() => setEditingSla({ ...sla })}>Edit</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'breaks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" size="sm" onClick={() => {
              setEditingBreakGroup({ color: BREAK_PRESET_COLORS[0], prescriberIds: [], enabled: true, startTime: '12:00', endTime: '12:30' });
              setIsNewBreakGroup(true);
            }}>
              + Add Break Group
            </Button>
          </div>
          {breakGroups.map(bg => {
            const bgPrescribers = prescribers.filter(p => bg.prescriberIds.includes(p.id));
            return (
              <div key={bg.id} style={{
                background: 'var(--surface)', borderRadius: 'var(--r-lg)',
                border: `1.5px solid ${bg.enabled ? bg.color + '40' : 'var(--border)'}`,
                padding: 'var(--space-4)', boxShadow: 'var(--shadow-1)',
                opacity: bg.enabled ? 1 : 0.65,
                display: 'flex', gap: 'var(--space-4)', alignItems: 'center',
              }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: bg.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 'var(--fs-small)' }}>{bg.name}</span>
                    <Badge variant={bg.enabled ? 'success' : 'muted'} size="sm">{bg.enabled ? 'Active' : 'Disabled'}</Badge>
                    <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)', fontWeight: 600 }}>{bg.startTime} – {bg.endTime}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {bgPrescribers.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 'var(--r-pill)', background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                        <Avatar initials={p.initials} role={p.role} size={18} />
                        <span style={{ fontSize: 10, fontWeight: 600 }}>{p.name.split(' ').pop()}</span>
                      </div>
                    ))}
                    {bgPrescribers.length === 0 && <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg4)' }}>No prescribers assigned</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingBreakGroup({ ...bg }); setIsNewBreakGroup(false); }}>Edit</Button>
                  <Button size="sm" variant={bg.enabled ? 'ghost' : 'secondary'} onClick={() => dispatch({ type: 'UPDATE_BREAK_GROUP', breakGroup: { ...bg, enabled: !bg.enabled } })}>
                    {bg.enabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'capacity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{
            background: 'var(--success-bg)', border: '1px solid var(--success)',
            borderRadius: 'var(--r-md)', padding: 'var(--space-3) var(--space-4)',
            fontSize: 'var(--fs-small)', color: 'var(--success)',
          }}>
            Average Handling Time (AHT) is used to calculate capacity requirements. Orders and messages have separate AHT values.
          </div>
          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--r-lg)',
            boxShadow: 'var(--shadow-1)', border: '1px solid var(--border)',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
                  {['Category', 'Order AHT (mins)', 'Message AHT (mins)', 'Preview', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SERVICE_CATEGORIES.map((cat, i) => {
                  const cfg = capacityConfigs.find(c => c.categoryId === cat.id);
                  if (!cfg) return null;
                  const catAlloc = allocations.find(a => a.categoryId === cat.id);
                  const allocCount = catAlloc?.prescriberIds.length || 0;
                  const pendingOrders = orders.filter(o => cat.serviceIds.includes(o.serviceId) && (o.status === 'pending' || o.status === 'escalated')).length;
                  const pendingMsgs = messages.filter(m => m.categoryId === cat.id && m.status === 'pending').length;
                  const reqMins = pendingOrders * cfg.orderAHTMins + pendingMsgs * cfg.messageAHTMins;
                  const availMins = allocCount * DAYS_MINS;
                  const gap = reqMins - availMins;
                  const gapColor = gap <= 0 ? 'var(--success)' : gap <= 180 ? 'var(--warning)' : 'var(--danger)';

                  return (
                    <tr
                      key={cat.id}
                      style={{ borderBottom: i < SERVICE_CATEGORIES.length - 1 ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-alt)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{cat.icon}</span>
                          <span style={{ fontWeight: 600, fontSize: 'var(--fs-small)' }}>{cat.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 'var(--fs-small)' }}>{cfg.orderAHTMins} mins</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 'var(--fs-small)' }}>{cfg.messageAHTMins} mins</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)' }}>
                          {allocCount} prescriber{allocCount !== 1 ? 's' : ''}, {pendingOrders} orders, {pendingMsgs} msgs
                        </div>
                        <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: gapColor, marginTop: 2 }}>
                          {gap <= 0
                            ? `+${Math.abs(Math.round(gap / 60 * 10) / 10)}h spare`
                            : `${Math.round(gap / 60 * 10) / 10}h over capacity`}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Button size="sm" variant="ghost" onClick={() => setEditingCapacity({ ...cfg })}>Edit</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--r-lg)',
            padding: 'var(--space-4)', boxShadow: 'var(--shadow-1)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--fs-small)', marginBottom: 8 }}>Overall Capacity Summary</div>
            <div style={{ fontSize: 'var(--fs-small)', color: 'var(--fg2)' }}>
              <strong>{activePrescribers.length}</strong> active prescribers contributing <strong>{activePrescribers.length * DAYS_MINS} mins</strong> total capacity today.
            </div>
          </div>
        </div>
      )}

      {/* Rule edit modal */}
      <Modal
        open={!!editingRule}
        onClose={() => setEditingRule(null)}
        title="Edit Rule"
        width={500}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditingRule(null)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={() => editingRule && saveRule(editingRule)}>Save rule</Button>
          </>
        }
      >
        {editingRule && <RuleForm rule={editingRule} onChange={setEditingRule} />}
      </Modal>

      {/* SLA edit modal */}
      <Modal
        open={!!editingSla}
        onClose={() => setEditingSla(null)}
        title="Edit SLA"
        width={440}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditingSla(null)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={() => editingSla && saveSla(editingSla)}>Save SLA</Button>
          </>
        }
      >
        {editingSla && <SlaForm sla={editingSla} onChange={setEditingSla} />}
      </Modal>

      {/* Break group modal */}
      <Modal
        open={!!editingBreakGroup}
        onClose={() => setEditingBreakGroup(null)}
        title={isNewBreakGroup ? 'New Break Group' : 'Edit Break Group'}
        width={500}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditingBreakGroup(null)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={saveBreakGroup} disabled={!editingBreakGroup?.name}>
              {isNewBreakGroup ? 'Add break group' : 'Save changes'}
            </Button>
          </>
        }
      >
        {editingBreakGroup && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <FF label="Name">
              <input style={inp} value={editingBreakGroup.name || ''} onChange={e => setEditingBreakGroup(b => ({ ...b!, name: e.target.value }))} placeholder="e.g. Early Lunch" />
            </FF>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FF label="Start time">
                <input style={inp} type="time" value={editingBreakGroup.startTime || '12:00'} onChange={e => setEditingBreakGroup(b => ({ ...b!, startTime: e.target.value }))} />
              </FF>
              <FF label="End time">
                <input style={inp} type="time" value={editingBreakGroup.endTime || '12:30'} onChange={e => setEditingBreakGroup(b => ({ ...b!, endTime: e.target.value }))} />
              </FF>
            </div>
            <FF label="Colour">
              <div style={{ display: 'flex', gap: 8 }}>
                {BREAK_PRESET_COLORS.map(col => (
                  <button
                    key={col}
                    onClick={() => setEditingBreakGroup(b => ({ ...b!, color: col }))}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: col,
                      border: `3px solid ${editingBreakGroup.color === col ? '#fff' : 'transparent'}`,
                      outline: editingBreakGroup.color === col ? `2px solid ${col}` : 'none',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </FF>
            <FF label="Enabled">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={editingBreakGroup.enabled ?? true}
                  onChange={e => setEditingBreakGroup(b => ({ ...b!, enabled: e.target.checked }))}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 'var(--fs-small)', color: 'var(--fg2)' }}>Break group is active</span>
              </div>
            </FF>
            <FF label={`Prescribers (${(editingBreakGroup.prescriberIds || []).length} selected)`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                {prescribers.filter(p => p.status !== 'offline').map(p => {
                  const selected = (editingBreakGroup.prescriberIds || []).includes(p.id);
                  return (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 'var(--r-sm)', cursor: 'pointer', background: selected ? `${editingBreakGroup.color || '#E65100'}10` : 'transparent' }}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          const current = editingBreakGroup.prescriberIds || [];
                          const next = selected ? current.filter(id => id !== p.id) : [...current, p.id];
                          setEditingBreakGroup(b => ({ ...b!, prescriberIds: next }));
                        }}
                        style={{ width: 14, height: 14 }}
                      />
                      <Avatar initials={p.initials} role={p.role} size={22} />
                      <span style={{ fontSize: 'var(--fs-small)' }}>{p.name}</span>
                    </label>
                  );
                })}
              </div>
            </FF>
          </div>
        )}
      </Modal>

      {/* Capacity edit modal */}
      <Modal
        open={!!editingCapacity}
        onClose={() => setEditingCapacity(null)}
        title="Edit Capacity Config"
        width={400}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditingCapacity(null)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={saveCapacity}>Save</Button>
          </>
        }
      >
        {editingCapacity && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ padding: '10px 12px', background: 'var(--surface-alt)', borderRadius: 'var(--r-md)' }}>
              <span style={{ fontWeight: 600 }}>{SERVICE_CATEGORIES.find(c => c.id === editingCapacity.categoryId)?.name}</span>
            </div>
            <FF label="Order AHT (mins)">
              <input style={inp} type="number" min={1} max={120} value={editingCapacity.orderAHTMins} onChange={e => setEditingCapacity(c => ({ ...c!, orderAHTMins: +e.target.value }))} />
            </FF>
            <FF label="Message AHT (mins)">
              <input style={inp} type="number" min={1} max={60} value={editingCapacity.messageAHTMins} onChange={e => setEditingCapacity(c => ({ ...c!, messageAHTMins: +e.target.value }))} />
            </FF>
          </div>
        )}
      </Modal>
    </div>
  );
}

function RuleCard({ rule, onToggle, onEdit }: { rule: AllocationRule; onToggle: () => void; onEdit: () => void }) {
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 'var(--r-lg)',
      border: '1.5px solid var(--border)',
      padding: 'var(--space-4)',
      boxShadow: 'var(--shadow-1)',
      opacity: rule.enabled ? 1 : 0.6,
      display: 'flex',
      gap: 'var(--space-4)',
      alignItems: 'flex-start',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 'var(--r-md)',
        background: 'var(--surface-alt)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, flexDirection: 'column', gap: 1,
      }}>
        <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--fg3)' }}>W</div>
        <div style={{ fontSize: 'var(--fs-h3)', fontWeight: 700, color: 'var(--fg1)', lineHeight: 1 }}>{rule.weight}</div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 'var(--fs-small)' }}>{rule.name}</span>
          <Badge variant={rule.enabled ? 'success' : 'muted'} size="sm">{rule.enabled ? 'Active' : 'Disabled'}</Badge>
          <Badge variant={rule.action === 'escalate' ? 'danger' : rule.action === 'boost' ? 'info' : 'warning'} size="sm">
            {ACTION_LABELS[rule.action]}
            {rule.action !== 'escalate' && ` +${rule.actionValue}`}
          </Badge>
        </div>
        <p style={{ fontSize: 'var(--fs-small)', color: 'var(--fg3)', marginBottom: 6 }}>{rule.description}</p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 10px', background: 'var(--surface-alt)',
          borderRadius: 'var(--r-pill)', border: '1px solid var(--border)',
          fontSize: 'var(--fs-micro)', fontWeight: 600, color: 'var(--fg2)',
        }}>
          <span style={{ color: 'var(--fg3)' }}>IF</span>
          <span>{FIELD_LABELS[rule.field] || rule.field}</span>
          <span style={{ color: 'var(--fg3)' }}>{OP_LABELS[rule.operator]}</span>
          <span>"{rule.value}"</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <Button size="sm" variant="ghost" onClick={onEdit}>Edit</Button>
        <Button size="sm" variant={rule.enabled ? 'ghost' : 'secondary'} onClick={onToggle}>
          {rule.enabled ? 'Disable' : 'Enable'}
        </Button>
      </div>
    </div>
  );
}

function RuleForm({ rule, onChange }: { rule: AllocationRule; onChange: (r: AllocationRule) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <FF label="Rule name">
        <input style={inp} value={rule.name} onChange={e => onChange({ ...rule, name: e.target.value })} />
      </FF>
      <FF label="Description">
        <textarea style={{ ...inp, height: 60, resize: 'vertical' }} value={rule.description} onChange={e => onChange({ ...rule, description: e.target.value })} />
      </FF>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FF label="Weight (1–10)">
          <input style={inp} type="number" min={1} max={10} value={rule.weight} onChange={e => onChange({ ...rule, weight: +e.target.value })} />
        </FF>
        <FF label="Field">
          <select style={inp} value={rule.field} onChange={e => onChange({ ...rule, field: e.target.value as AllocationRule['field'] })}>
            {Object.entries(FIELD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </FF>
        <FF label="Operator">
          <select style={inp} value={rule.operator} onChange={e => onChange({ ...rule, operator: e.target.value as AllocationRule['operator'] })}>
            {Object.entries(OP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </FF>
        <FF label="Value">
          <input style={inp} value={rule.value} onChange={e => onChange({ ...rule, value: e.target.value })} />
        </FF>
        <FF label="Action">
          <select style={inp} value={rule.action} onChange={e => onChange({ ...rule, action: e.target.value as AllocationRule['action'] })}>
            {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </FF>
        {rule.action !== 'escalate' && (
          <FF label="Score delta">
            <input style={inp} type="number" value={rule.actionValue} onChange={e => onChange({ ...rule, actionValue: +e.target.value })} />
          </FF>
        )}
      </div>
    </div>
  );
}

function SlaForm({ sla, onChange }: { sla: SLAConfig; onChange: (s: SLAConfig) => void }) {
  const cat = SERVICE_CATEGORIES.find(c => c.id === sla.categoryId);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--surface-alt)', borderRadius: 'var(--r-md)' }}>
        <span style={{ fontSize: 20 }}>{cat?.icon}</span>
        <span style={{ fontWeight: 600 }}>{cat?.name}</span>
      </div>
      <FF label="Target SLA (hours)">
        <input style={inp} type="number" min={1} value={sla.targetHours} onChange={e => onChange({ ...sla, targetHours: +e.target.value })} />
      </FF>
      <FF label="Warning threshold (% of SLA elapsed)">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input style={{ ...inp, flex: 1 }} type="range" min={10} max={95} value={sla.warningThresholdPct} onChange={e => onChange({ ...sla, warningThresholdPct: +e.target.value })} />
          <span style={{ fontWeight: 700, minWidth: 36, color: 'var(--warning)' }}>{sla.warningThresholdPct}%</span>
        </div>
      </FF>
      <FF label="Critical threshold (% of SLA elapsed)">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input style={{ ...inp, flex: 1 }} type="range" min={10} max={100} value={sla.criticalThresholdPct} onChange={e => onChange({ ...sla, criticalThresholdPct: +e.target.value })} />
          <span style={{ fontWeight: 700, minWidth: 36, color: 'var(--danger)' }}>{sla.criticalThresholdPct}%</span>
        </div>
      </FF>
      <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)', padding: '8px 12px', background: 'var(--surface-alt)', borderRadius: 'var(--r-sm)' }}>
        Warning fires at {Math.round(sla.targetHours * sla.warningThresholdPct / 100)}h. Critical fires at {Math.round(sla.targetHours * sla.criticalThresholdPct / 100)}h.
      </div>
    </div>
  );
}
