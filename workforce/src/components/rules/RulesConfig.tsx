import { useState } from 'react';
import { useWorkforce } from '../../store/WorkforceContext';
import { SERVICE_CATEGORIES } from '../../data/services';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import type { AllocationRule, SLAConfig } from '../../types';

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

export function RulesConfig() {
  const { rules, slas, dispatch } = useWorkforce();
  const [activeTab, setActiveTab] = useState<'rules' | 'slas'>('rules');
  const [editingRule, setEditingRule] = useState<AllocationRule | null>(null);
  const [editingSla, setEditingSla] = useState<SLAConfig | null>(null);

  function saveRule(rule: AllocationRule) {
    dispatch({ type: 'UPDATE_RULE', rule });
    setEditingRule(null);
  }

  function saveSla(sla: SLAConfig) {
    dispatch({ type: 'UPDATE_SLA', sla });
    setEditingSla(null);
  }

  const sortedRules = [...rules].sort((a, b) => b.weight - a.weight);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 2,
        background: 'var(--surface)', padding: 4,
        borderRadius: 'var(--r-md)', width: 'fit-content',
        border: '1px solid var(--border)',
      }}>
        {(['rules', 'slas'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 20px',
              border: 'none',
              borderRadius: 'var(--r-sm)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 'var(--fs-small)',
              background: activeTab === tab ? 'var(--boots-blue)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--fg3)',
              transition: 'all 0.15s ease',
            }}
          >
            {tab === 'rules' ? 'Allocation Rules' : 'SLA Configuration'}
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
        {editingRule && (
          <RuleForm rule={editingRule} onChange={setEditingRule} />
        )}
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
        {editingSla && (
          <SlaForm sla={editingSla} onChange={setEditingSla} />
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
      border: `1.5px solid ${rule.enabled ? 'var(--border)' : 'var(--border)'}`,
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

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );
}

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
