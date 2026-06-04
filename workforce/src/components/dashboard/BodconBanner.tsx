import { useState } from 'react';
import { useWorkforce } from '../../store/WorkforceContext';
import { SERVICE_CATEGORIES } from '../../data/services';
import { DAILY_ORDER_CONFIG, BODCON_LEVELS, computeBodconLevel, getExtraPrescribersSuggestion } from '../../data/bodconConfig';
import { Modal } from '../common/Modal';

const DAYS_MINS = 480;
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 20;
const WORK_HOURS = WORK_END_HOUR - WORK_START_HOUR;

function ragStatus(availMins: number, reqMins: number): 'green' | 'amber' | 'red' {
  const gap = reqMins - availMins;
  if (gap <= 0) return 'green';
  if (gap <= 180) return 'amber';
  return 'red';
}

export function BodconBanner() {
  const { prescribers, orders, messages, allocations, capacityConfigs } = useWorkforce();
  const [detailOpen, setDetailOpen] = useState(false);

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const currentHour = now.getHours();
  const hoursElapsed = Math.max(0, currentHour - WORK_START_HOUR);
  const hoursRemaining = Math.max(0, WORK_END_HOUR - currentHour);
  const fractionRemaining = hoursRemaining / WORK_HOURS;

  // Per-category RAG + capacity
  let totalRequired = 0;
  let totalAvailable = 0;
  const categoryData = SERVICE_CATEGORIES.map(cat => {
    const cfg = capacityConfigs.find(c => c.categoryId === cat.id);
    const catAlloc = allocations.find(a => a.categoryId === cat.id);
    const allocCount = catAlloc?.prescriberIds.length || 0;
    const pendingOrders = orders.filter(o => cat.serviceIds.includes(o.serviceId) && (o.status === 'pending' || o.status === 'escalated')).length;
    const pendingMsgs = messages.filter(m => m.categoryId === cat.id && m.status === 'pending').length;

    // Projected remaining orders for today
    const dailyCfg = DAILY_ORDER_CONFIG.find(d => d.categoryId === cat.id);
    const expectedToday = dailyCfg ? dailyCfg.expectedOrders[dayOfWeek] : 0;
    const projectedRemaining = Math.round(expectedToday * fractionRemaining);

    const availMins = allocCount * DAYS_MINS;
    const currentReqMins = cfg ? pendingOrders * cfg.orderAHTMins + pendingMsgs * cfg.messageAHTMins : 0;
    const projectedReqMins = cfg ? projectedRemaining * cfg.orderAHTMins : 0;
    const totalReqMins = currentReqMins + projectedReqMins;

    totalRequired += totalReqMins;
    totalAvailable += availMins;

    return {
      cat,
      rag: ragStatus(availMins, totalReqMins),
      pendingOrders,
      pendingMsgs,
      projectedRemaining,
      allocCount,
      availMins,
      totalReqMins,
    };
  });

  const redCount = categoryData.filter(d => d.rag === 'red').length;
  const amberCount = categoryData.filter(d => d.rag === 'amber').length;
  const bodconLevel = computeBodconLevel(redCount, amberCount);
  const bodconInfo = BODCON_LEVELS.find(b => b.level === bodconLevel)!;
  const extraNeeded = getExtraPrescribersSuggestion(totalRequired, totalAvailable);

  const onlinePrescribers = prescribers.filter(p => p.status === 'online' || p.status === 'allocated').length;
  const allocatedPrescribers = prescribers.filter(p => p.status === 'allocated').length;

  const bodconColors: Record<number, { bg: string; border: string; text: string }> = {
    1: { bg: '#FEF2F2', border: '#DC2626', text: '#DC2626' },
    2: { bg: '#FFF7ED', border: '#EA580C', text: '#EA580C' },
    3: { bg: '#FFFBEB', border: '#D97706', text: '#D97706' },
    4: { bg: '#FEFCE8', border: '#CA8A04', text: '#CA8A04' },
    5: { bg: '#F0FDF4', border: '#16A34A', text: '#16A34A' },
  };
  const bc = bodconColors[bodconLevel];

  return (
    <>
      <div style={{
        background: bc.bg,
        border: `2px solid ${bc.border}`,
        borderRadius: 'var(--r-lg)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-5)',
        flexWrap: 'wrap',
      }}>
        {/* BODCON level */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 'var(--r-md)',
            background: bodconInfo.color,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', opacity: 0.85 }}>BODCON</div>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{bodconLevel}</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 'var(--fs-small)', color: bc.text }}>{bodconInfo.description}</div>
            <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)', marginTop: 2 }}>{bodconInfo.trigger}</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 40, background: `${bc.border}40`, flexShrink: 0 }} />

        {/* Guardrail summary */}
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <GuardrailStat label="Red guardrails" value={redCount} color="#DC2626" />
          <GuardrailStat label="Amber guardrails" value={amberCount} color="#D97706" />
          <GuardrailStat label="Green guardrails" value={SERVICE_CATEGORIES.length - redCount - amberCount} color="#16A34A" />
          <GuardrailStat label="Prescribers online" value={onlinePrescribers} color="var(--boots-blue)" />
          <GuardrailStat label="Allocated" value={allocatedPrescribers} color="#0067B2" />
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 40, background: `${bc.border}40`, flexShrink: 0 }} />

        {/* Capacity + extra duty */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)', marginBottom: 3 }}>
            Today's projected workload vs capacity
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CapacityBar required={totalRequired} available={totalAvailable} />
            <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg2)', whiteSpace: 'nowrap' }}>
              {Math.round(totalRequired / 60)}h req / {Math.round(totalAvailable / 60)}h avail
            </div>
          </div>
          {extraNeeded > 0 && (
            <div style={{
              marginTop: 5, fontSize: 'var(--fs-micro)', fontWeight: 600,
              color: bodconLevel <= 2 ? '#DC2626' : '#D97706',
            }}>
              ⚠ Suggest +{extraNeeded} extra prescriber{extraNeeded > 1 ? 's' : ''} to meet projected demand
            </div>
          )}
        </div>

        {/* Detail button */}
        <button
          onClick={() => setDetailOpen(true)}
          style={{
            border: `1.5px solid ${bc.border}`, background: 'transparent',
            color: bc.text, borderRadius: 'var(--r-md)',
            padding: '6px 14px', cursor: 'pointer',
            fontSize: 'var(--fs-micro)', fontWeight: 600,
            flexShrink: 0,
          }}
        >
          Actions & detail
        </button>
      </div>

      {/* Detail modal */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={`${bodconInfo.label} — ${bodconInfo.description}`}
        width={680}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Level summary */}
          <div style={{
            padding: 'var(--space-4)', borderRadius: 'var(--r-md)',
            background: bc.bg, border: `1.5px solid ${bc.border}`,
          }}>
            <div style={{ fontWeight: 700, color: bc.text, marginBottom: 4 }}>Required actions at this level:</div>
            <div style={{ fontSize: 'var(--fs-small)', color: 'var(--fg2)', lineHeight: 1.6 }}>{bodconInfo.action}</div>
            <div style={{ marginTop: 8, fontSize: 'var(--fs-small)', fontWeight: 600, color: 'var(--fg3)' }}>
              Comms: {bodconInfo.slackUpdates}
            </div>
          </div>

          {/* All BODCON levels reference */}
          <div>
            <div style={{ fontSize: 'var(--fs-small)', fontWeight: 700, marginBottom: 8 }}>BODCON Reference</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {BODCON_LEVELS.map(b => (
                <div
                  key={b.level}
                  style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    padding: '8px 10px', borderRadius: 'var(--r-sm)',
                    background: b.level === bodconLevel ? bc.bg : 'var(--surface-alt)',
                    border: `1px solid ${b.level === bodconLevel ? bc.border : 'var(--border)'}`,
                    opacity: b.level === bodconLevel ? 1 : 0.7,
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: b.color, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, flexShrink: 0,
                  }}>{b.level}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 'var(--fs-small)' }}>{b.description}</span>
                      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)' }}>Trigger: {b.trigger}</span>
                    </div>
                    <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)', marginTop: 2 }}>{b.slackUpdates}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Per-category breakdown */}
          <div>
            <div style={{ fontSize: 'var(--fs-small)', fontWeight: 700, marginBottom: 8 }}>Category breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {categoryData.map(d => {
                const ragColor = d.rag === 'red' ? '#DC2626' : d.rag === 'amber' ? '#D97706' : '#16A34A';
                return (
                  <div key={d.cat.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 'var(--r-sm)',
                    background: 'var(--surface-alt)', border: '1px solid var(--border)',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: ragColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 12 }}>{d.cat.icon}</span>
                    <span style={{ flex: 1, fontSize: 'var(--fs-small)', fontWeight: 600 }}>{d.cat.name}</span>
                    <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)' }}>{d.pendingOrders} orders · {d.pendingMsgs} msgs</span>
                    <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)' }}>~{d.projectedRemaining} projected</span>
                    <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 600 }}>{d.allocCount} prescriber{d.allocCount !== 1 ? 's' : ''}</span>
                    <span style={{ fontSize: 'var(--fs-micro)', color: ragColor, fontWeight: 700, textTransform: 'uppercase' }}>{d.rag}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {extraNeeded > 0 && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: '#FFF7ED', border: '1px solid #EA580C',
              borderRadius: 'var(--r-md)', fontSize: 'var(--fs-small)',
            }}>
              <strong>Extra duty recommendation:</strong> Based on projected workload vs current capacity,
              an additional <strong>{extraNeeded} prescriber{extraNeeded > 1 ? 's' : ''}</strong> would be needed
              to clear today's expected volume. Consider calling in extra duty or restricting marketing on high-demand services.
            </div>
          )}

          <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg4)', lineHeight: 1.5 }}>
            Projected orders use {hoursElapsed.toFixed(0)}h elapsed / {WORK_HOURS}h working day.
            {hoursRemaining.toFixed(0)}h remaining. Expected volumes from 7-day historical average by day of week.
          </div>
        </div>
      </Modal>
    </>
  );
}

function GuardrailStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 'var(--fs-h3)', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function CapacityBar({ required, available }: { required: number; available: number }) {
  const max = Math.max(required, available, 1);
  const reqPct = Math.min(100, (required / max) * 100);
  const avlPct = Math.min(100, (available / max) * 100);
  const isOver = required > available;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ fontSize: 9, color: 'var(--fg3)', width: 52, flexShrink: 0 }}>Required</div>
        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${reqPct}%`, height: '100%', background: isOver ? '#DC2626' : '#16A34A', borderRadius: 3 }} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ fontSize: 9, color: 'var(--fg3)', width: 52, flexShrink: 0 }}>Available</div>
        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${avlPct}%`, height: '100%', background: '#0067B2', borderRadius: 3 }} />
        </div>
      </div>
    </div>
  );
}
