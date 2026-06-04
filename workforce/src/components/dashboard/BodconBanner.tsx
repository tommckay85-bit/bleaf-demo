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

const BODCON_COLORS: Record<number, { bg: string; border: string; text: string; badge: string }> = {
  1: { bg: '#FEF2F2', border: '#DC2626', text: '#DC2626', badge: '#DC2626' },
  2: { bg: '#FFF7ED', border: '#EA580C', text: '#EA580C', badge: '#EA580C' },
  3: { bg: '#FFFBEB', border: '#D97706', text: '#D97706', badge: '#D97706' },
  4: { bg: '#FEFCE8', border: '#CA8A04', text: '#CA8A04', badge: '#CA8A04' },
  5: { bg: 'var(--surface)', border: 'var(--border)', text: 'var(--fg3)', badge: '#16A34A' },
};

export function BodconBanner() {
  const { prescribers, orders, messages, allocations, capacityConfigs } = useWorkforce();
  const [detailOpen, setDetailOpen] = useState(false);

  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentHour = now.getHours();
  const hoursElapsed = Math.max(0, currentHour - WORK_START_HOUR);
  const hoursRemaining = Math.max(0, WORK_END_HOUR - currentHour);
  const fractionRemaining = hoursRemaining / WORK_HOURS;

  let totalCurrentReq = 0;
  let totalAvailable = 0;

  const categoryData = SERVICE_CATEGORIES.map(cat => {
    const cfg = capacityConfigs.find(c => c.categoryId === cat.id);
    const catAlloc = allocations.find(a => a.categoryId === cat.id);
    const allocCount = catAlloc?.prescriberIds.length || 0;
    const pendingOrders = orders.filter(o =>
      cat.serviceIds.includes(o.serviceId) && (o.status === 'pending' || o.status === 'escalated')
    ).length;
    const pendingMsgs = messages.filter(m => m.categoryId === cat.id && m.status === 'pending').length;

    const availMins = allocCount * DAYS_MINS;
    // BODCON is based on current queue only — no projection
    const currentReqMins = cfg ? pendingOrders * cfg.orderAHTMins + pendingMsgs * cfg.messageAHTMins : 0;

    // Projection for the separate warning
    const dailyCfg = DAILY_ORDER_CONFIG.find(d => d.categoryId === cat.id);
    const expectedToday = dailyCfg ? dailyCfg.expectedOrders[dayOfWeek] : 0;
    const projectedRemaining = Math.round(expectedToday * fractionRemaining);
    const projectedReqMins = cfg ? projectedRemaining * cfg.orderAHTMins : 0;
    const totalWithProjection = currentReqMins + projectedReqMins;

    totalCurrentReq += currentReqMins;
    totalAvailable += availMins;

    return {
      cat,
      rag: ragStatus(availMins, currentReqMins),         // current only → drives BODCON
      projectedRag: ragStatus(availMins, totalWithProjection), // projected → drives warning
      pendingOrders,
      pendingMsgs,
      projectedRemaining,
      allocCount,
      availMins,
      currentReqMins,
      totalWithProjection,
    };
  });

  const redCount = categoryData.filter(d => d.rag === 'red').length;
  const amberCount = categoryData.filter(d => d.rag === 'amber').length;
  const greenCount = SERVICE_CATEGORIES.length - redCount - amberCount;
  const bodconLevel = computeBodconLevel(redCount, amberCount);
  const bodconInfo = BODCON_LEVELS.find(b => b.level === bodconLevel)!;

  // Categories where projection would worsen the current RAG
  const projectedStrain = categoryData.filter(d =>
    d.projectedRag !== d.rag &&
    (d.projectedRag === 'red' || (d.projectedRag === 'amber' && d.rag === 'green'))
  );

  const extraNeeded = getExtraPrescribersSuggestion(totalCurrentReq, totalAvailable);
  const onlineCount = prescribers.filter(p => p.status === 'online' || p.status === 'allocated').length;
  const allocatedCount = prescribers.filter(p => p.status === 'allocated').length;

  const bc = BODCON_COLORS[bodconLevel];

  return (
    <>
      {/* Compact single-row status bar */}
      <div style={{
        background: bc.bg,
        border: `1.5px solid ${bc.border}`,
        borderRadius: 'var(--r-lg)',
        padding: '0 14px',
        height: 46,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        flexShrink: 0,
        overflow: 'hidden',
      }}>

        {/* BODCON badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 'var(--r-sm)',
            background: bodconInfo.color,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0, gap: 0,
          }}>
            <div style={{ fontSize: 6.5, fontWeight: 700, letterSpacing: '0.08em', opacity: 0.9, lineHeight: 1 }}>BODCON</div>
            <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.1 }}>{bodconLevel}</div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--fs-small)', fontWeight: 700, color: bc.text, lineHeight: 1 }}>
              {bodconInfo.description}
            </div>
            <div style={{ fontSize: 10, color: 'var(--fg4)', marginTop: 1 }}>
              Based on current queue
            </div>
          </div>
        </div>

        <Sep />

        {/* Guardrail dots */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <RagDot color="#DC2626" value={redCount} label="red" />
          <RagDot color="#D97706" value={amberCount} label="amber" />
          <RagDot color="#16A34A" value={greenCount} label="green" />
        </div>

        <Sep />

        {/* Prescribers */}
        <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)', flexShrink: 0, whiteSpace: 'nowrap' }}>
          <span style={{ fontWeight: 700, color: 'var(--fg1)' }}>{onlineCount}</span> online ·{' '}
          <span style={{ fontWeight: 700, color: 'var(--boots-blue)' }}>{allocatedCount}</span> allocated
        </div>

        {/* Projected strain — subtle amber warning */}
        {projectedStrain.length > 0 && (
          <>
            <Sep />
            <div style={{
              fontSize: 'var(--fs-micro)', color: '#B45309', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
            }}>
              <span style={{ opacity: 0.7 }}>▲</span>
              Projected pressure:{' '}
              <span style={{ fontWeight: 600 }}>
                {projectedStrain.map(d => d.cat.name).join(', ')}
              </span>
              {hoursRemaining > 0 && (
                <span style={{ opacity: 0.65 }}>
                  ({Math.round(projectedStrain.reduce((s, d) => s + d.projectedRemaining, 0))} orders expected in {hoursRemaining.toFixed(0)}h)
                </span>
              )}
            </div>
          </>
        )}

        <div style={{ flex: 1 }} />

        {/* Details button */}
        <button
          onClick={() => setDetailOpen(true)}
          style={{
            border: `1px solid ${bc.border}`, background: 'transparent',
            color: bc.text, borderRadius: 'var(--r-md)',
            padding: '4px 12px', cursor: 'pointer',
            fontSize: 'var(--fs-micro)', fontWeight: 600, flexShrink: 0,
          }}
        >
          Details ›
        </button>
      </div>

      {/* Detail modal */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={`${bodconInfo.label} — ${bodconInfo.description}`}
        width={700}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* Current level action card */}
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

          {/* Per-category breakdown */}
          <div>
            <div style={{ fontSize: 'var(--fs-small)', fontWeight: 700, marginBottom: 8 }}>
              Current queue status <span style={{ fontWeight: 400, color: 'var(--fg3)' }}>(BODCON basis)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {categoryData.map(d => {
                const ragColor = d.rag === 'red' ? '#DC2626' : d.rag === 'amber' ? '#D97706' : '#16A34A';
                const projColor = d.projectedRag === 'red' ? '#DC2626' : d.projectedRag === 'amber' ? '#D97706' : '#16A34A';
                const projWorsens = d.projectedRag !== d.rag;
                return (
                  <div key={d.cat.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 'var(--r-sm)',
                    background: 'var(--surface-alt)', border: '1px solid var(--border)',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: ragColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 13 }}>{d.cat.icon}</span>
                    <span style={{ flex: 1, fontSize: 'var(--fs-small)', fontWeight: 600 }}>{d.cat.name}</span>
                    <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)' }}>
                      {d.pendingOrders} orders · {d.pendingMsgs} msgs
                    </span>
                    <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 600 }}>
                      {d.allocCount} prescriber{d.allocCount !== 1 ? 's' : ''}
                    </span>
                    <span style={{ fontSize: 'var(--fs-micro)', color: ragColor, fontWeight: 700, textTransform: 'uppercase' }}>
                      {d.rag}
                    </span>
                    {projWorsens && fractionRemaining > 0 && (
                      <span style={{
                        fontSize: 'var(--fs-micro)', color: projColor, fontWeight: 600,
                        background: `${projColor}15`, border: `1px solid ${projColor}40`,
                        borderRadius: 'var(--r-sm)', padding: '1px 6px',
                      }}>
                        ▲ proj. {d.projectedRag.toUpperCase()} (+{d.projectedRemaining})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Projected strain callout */}
          {projectedStrain.length > 0 && fractionRemaining > 0 && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: '#FFFBEB', border: '1px solid #FCD34D',
              borderRadius: 'var(--r-md)', fontSize: 'var(--fs-small)',
            }}>
              <strong style={{ color: '#92400E' }}>Projected pressure warning:</strong>{' '}
              <span style={{ color: 'var(--fg2)' }}>
                Based on typical {now.toLocaleDateString('en-GB', { weekday: 'long' })} volumes,{' '}
                {projectedStrain.map(d => d.cat.name).join(' and ')} may move to a higher stress level
                in the remaining {hoursRemaining.toFixed(0)}h of the day.
              </span>
              {extraNeeded > 0 && (
                <div style={{ marginTop: 6, color: '#92400E', fontWeight: 600 }}>
                  +{extraNeeded} prescriber{extraNeeded > 1 ? 's' : ''} would be needed to absorb projected volume.
                </div>
              )}
            </div>
          )}

          {/* BODCON Reference */}
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
                    opacity: b.level === bodconLevel ? 1 : 0.65,
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

          <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg4)', lineHeight: 1.5 }}>
            BODCON reflects current pending queue only.
            Projected figures use {hoursElapsed.toFixed(0)}h elapsed / {WORK_HOURS}h working day
            ({hoursRemaining.toFixed(0)}h remaining) with historical {now.toLocaleDateString('en-GB', { weekday: 'long' })} volumes.
          </div>
        </div>
      </Modal>
    </>
  );
}

function Sep() {
  return <div style={{ width: 1, height: 26, background: 'var(--border)', flexShrink: 0 }} />;
}

function RagDot({ color, value, label }: { color: string; value: number; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 10, color: 'var(--fg4)', lineHeight: 1 }}>{label}</span>
    </div>
  );
}
