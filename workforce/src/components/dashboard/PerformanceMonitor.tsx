import { useState, useMemo, useEffect } from 'react';
import { useWorkforce } from '../../store/WorkforceContext';
import { Avatar } from '../common/Avatar';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import type { PerformanceMonitorConfig, ExceptionalTaskReason } from '../../types';

const EXCEPTIONAL_REASON_LABELS: Record<ExceptionalTaskReason, string> = {
  complexity: 'Complex case',
  incident: 'Incident logging',
  safeguarding: 'Safeguarding',
  'patient-call': 'Patient call',
  other: 'Other',
};

type FlagLevel = 'action' | 'idle' | 'watch';

interface PrescriberFlag {
  prescriberId: string;
  name: string;
  initials: string;
  role: string;
  level: FlagLevel;
  durationMins: number;
  recentRate: number;
  avgRate: number;
  lastActivityMinsAgo: number | null;
}

const FLAG_META: Record<FlagLevel, { label: string; color: string; bg: string; border: string; icon: string }> = {
  action:  { label: 'Take Action', color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', icon: '🚨' },
  idle:    { label: 'Idle',        color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD', icon: '⏸' },
  watch:   { label: 'Watch',       color: '#D97706', bg: '#FFFBEB', border: '#FCD34D', icon: '👁' },
};

const inp: React.CSSProperties = {
  padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 'var(--r-md)',
  fontSize: 'var(--fs-small)', color: 'var(--fg1)', background: 'var(--surface)',
  width: '100%', outline: 'none',
};

function CfgField({
  label, hint, value, onChange, min = 1, max = 100, step = 1,
}: {
  label: string; hint: string; value: number;
  onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <input
        style={inp}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || min)}
      />
      <div style={{ fontSize: 10, color: 'var(--fg4)', lineHeight: 1.4 }}>{hint}</div>
    </div>
  );
}

function FlagCard({ flag, avgRate }: { flag: PrescriberFlag; avgRate: number }) {
  const meta = FLAG_META[flag.level];
  return (
    <div style={{
      padding: '8px 10px', borderRadius: 'var(--r-md)',
      background: meta.bg, border: `1px solid ${meta.border}`,
      display: 'flex', flexDirection: 'column', gap: 5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar initials={flag.initials} role={flag.role as never} size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--fg1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {flag.name}
          </div>
          <div style={{ fontSize: 10, color: 'var(--fg3)', textTransform: 'capitalize' }}>{flag.role}</div>
        </div>
      </div>
      {flag.level === 'idle' ? (
        <div style={{ fontSize: 10, color: meta.color, fontWeight: 600 }}>
          {flag.lastActivityMinsAgo !== null
            ? `No activity for ${flag.lastActivityMinsAgo}m`
            : 'No activity recorded'}
        </div>
      ) : (
        <div style={{ fontSize: 10, color: meta.color, fontWeight: 600 }}>
          {flag.recentRate.toFixed(1)}/h vs avg {avgRate.toFixed(1)}/h
          <span style={{ fontWeight: 400, color: 'var(--fg3)', marginLeft: 4 }}>
            ({flag.durationMins >= 60
              ? `${Math.floor(flag.durationMins / 60)}h${flag.durationMins % 60 > 0 ? ` ${flag.durationMins % 60}m` : ''}`
              : `${flag.durationMins}m`} below threshold)
          </span>
        </div>
      )}
    </div>
  );
}

function FlagSection({ level, flags, avgRate }: { level: FlagLevel; flags: PrescriberFlag[]; avgRate: number }) {
  const meta = FLAG_META[level];
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
        paddingBottom: 4, borderBottom: `2px solid ${meta.border}`,
      }}>
        <span style={{ fontSize: 12 }}>{meta.icon}</span>
        <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {meta.label}
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: meta.color,
          background: meta.bg, border: `1px solid ${meta.border}`,
          borderRadius: 999, padding: '1px 7px',
        }}>{flags.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {flags.map(f => <FlagCard key={f.prescriberId} flag={f} avgRate={avgRate} />)}
      </div>
    </div>
  );
}

export function PerformanceMonitor() {
  const { prescribers, prescriberActivity, performanceConfig, dispatch } = useWorkforce();
  const pausedPrescribers = prescribers.filter(p => p.status === 'paused');
  const onBreakPrescribers = prescribers.filter(p => p.status === 'on-break');
  const [configOpen, setConfigOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<PerformanceMonitorConfig>(performanceConfig);
  const [tick, setTick] = useState(0);

  // Refresh displayed durations every 30 seconds
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const { flags, avgRate } = useMemo(() => {
    const now = Date.now();
    const cfg = performanceConfig;
    const watchMs = cfg.watchHours * 3_600_000;
    const actionMs = cfg.actionHours * 3_600_000;
    const idleMs = cfg.idleMinutes * 60_000;
    const threshold = 1 - cfg.slowRateThresholdPct / 100;

    const allocatedPrescribers = prescribers.filter(p => p.status === 'allocated');
    if (allocatedPrescribers.length === 0) return { flags: [], avgRate: 0 };

    const watchStart = now - watchMs;
    const actionStart = now - actionMs;

    // Per-prescriber stats
    const stats = allocatedPrescribers.map(p => {
      const events = prescriberActivity.filter(e => e.prescriberId === p.id);
      const inWatch = events.filter(e => new Date(e.timestamp).getTime() >= watchStart).length;
      const inAction = events.filter(e => new Date(e.timestamp).getTime() >= actionStart).length;
      const lastTs = events.reduce<number | null>((mx, e) => {
        const t = new Date(e.timestamp).getTime();
        return mx === null ? t : Math.max(mx, t);
      }, null);
      return {
        p,
        watchRate: inWatch / cfg.watchHours,
        actionRate: inAction / cfg.actionHours,
        lastTs,
      };
    });

    // Average watch-window rate (exclude zeros so a freshly allocated prescriber doesn't pull down the average)
    const ratesWithData = stats.filter(s => s.watchRate > 0).map(s => s.watchRate);
    const computedAvg = ratesWithData.length > 0
      ? ratesWithData.reduce((sum, r) => sum + r, 0) / ratesWithData.length
      : 0;

    if (computedAvg === 0) return { flags: [], avgRate: 0 }; // No baseline yet

    const result: PrescriberFlag[] = [];

    for (const { p, watchRate, actionRate, lastTs } of stats) {
      const isIdle = lastTs !== null && (now - lastTs) > idleMs;
      const watchSlow = watchRate < computedAvg * threshold;
      const actionSlow = actionRate < computedAvg * threshold;

      let level: FlagLevel | null = null;
      let durationMins = 0;

      if (isIdle && !(watchSlow && actionSlow)) {
        // Idle but not in the slow category — flag as idle
        level = 'idle';
        durationMins = lastTs !== null ? Math.floor((now - lastTs) / 60_000) : 0;
      } else if (watchSlow && actionSlow) {
        level = 'action';
        durationMins = Math.round(cfg.actionHours * 60);
      } else if (watchSlow) {
        level = 'watch';
        durationMins = Math.round(cfg.watchHours * 60);
      }

      if (level) {
        result.push({
          prescriberId: p.id,
          name: p.name,
          initials: p.initials,
          role: p.role,
          level,
          durationMins,
          recentRate: Math.round(watchRate * 10) / 10,
          avgRate: Math.round(computedAvg * 10) / 10,
          lastActivityMinsAgo: lastTs !== null ? Math.floor((now - lastTs) / 60_000) : null,
        });
      }
    }

    const ORDER: Record<FlagLevel, number> = { action: 0, idle: 1, watch: 2 };
    result.sort((a, b) => ORDER[a.level] - ORDER[b.level]);
    return { flags: result, avgRate: Math.round(computedAvg * 10) / 10 };
  }, [prescribers, prescriberActivity, performanceConfig, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const actionFlags = flags.filter(f => f.level === 'action');
  const idleFlags = flags.filter(f => f.level === 'idle');
  const watchFlags = flags.filter(f => f.level === 'watch');

  const allocated = prescribers.filter(p => p.status === 'allocated').length;

  return (
    <>
      <div style={{
        width: 220,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        background: 'var(--surface)',
        borderRadius: 'var(--r-lg)',
        padding: 'var(--space-4)',
        boxShadow: 'var(--shadow-1)',
        border: '1px solid var(--border)',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 'var(--fs-small)', fontWeight: 700, color: 'var(--fg1)', margin: 0 }}>
            Performance
          </h3>
          <button
            onClick={() => { setEditConfig({ ...performanceConfig }); setConfigOpen(true); }}
            title="Configure thresholds"
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--fg3)', fontSize: 14, padding: '2px 4px', lineHeight: 1 }}
          >⚙</button>
        </div>

        {/* Stats summary */}
        <div style={{
          display: 'flex', gap: 6,
          padding: '6px 8px', borderRadius: 'var(--r-sm)',
          background: 'var(--surface-alt)', border: '1px solid var(--border)',
        }}>
          <Stat label="Allocated" value={allocated} />
          <Stat label="Flagged" value={flags.length} color={flags.some(f => f.level === 'action') ? '#DC2626' : flags.length > 0 ? '#D97706' : undefined} />
          {avgRate > 0 && <Stat label="Avg/h" value={avgRate} isNum />}
        </div>

        {/* Empty state */}
        {flags.length === 0 && (
          <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg4)', textAlign: 'center', padding: 'var(--space-4) 0', lineHeight: 1.6 }}>
            {allocated === 0
              ? 'No prescribers allocated'
              : prescriberActivity.length === 0
                ? 'No activity data yet.\nSimulate in Test Data.'
                : 'All prescribers on track'}
          </div>
        )}

        {/* Flag sections */}
        {actionFlags.length > 0 && (
          <FlagSection level="action" flags={actionFlags} avgRate={avgRate} />
        )}
        {idleFlags.length > 0 && (
          <FlagSection level="idle" flags={idleFlags} avgRate={avgRate} />
        )}
        {watchFlags.length > 0 && (
          <FlagSection level="watch" flags={watchFlags} avgRate={avgRate} />
        )}

        {/* Config hint */}
        {prescriberActivity.length > 0 && flags.length === 0 && (
          <div style={{ fontSize: 10, color: 'var(--fg4)', textAlign: 'center' }}>
            Threshold: {performanceConfig.slowRateThresholdPct}% below avg
          </div>
        )}

        {/* Exceptional tasks section */}
        {pausedPrescribers.length > 0 && (
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
              paddingBottom: 4, borderBottom: '2px solid #FDE68A',
            }}>
              <span style={{ fontSize: 12 }}>⚠️</span>
              <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Exceptional Tasks
              </span>
              <span style={{
                marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#92400E',
                background: '#FEF3C7', border: '1px solid #FDE68A',
                borderRadius: 999, padding: '1px 7px',
              }}>{pausedPrescribers.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pausedPrescribers.map(p => {
                const minsAgo = p.pausedAt ? Math.floor((Date.now() - new Date(p.pausedAt).getTime()) / 60000) : null;
                return (
                  <div key={p.id} style={{
                    padding: '8px 10px', borderRadius: 'var(--r-md)',
                    background: '#FFFBEB', border: '1px solid #FDE68A',
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar initials={p.initials} role={p.role} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--fg1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 10, color: '#92400E', fontWeight: 600 }}>
                          {p.pauseReason ? EXCEPTIONAL_REASON_LABELS[p.pauseReason] : 'Exceptional task'}
                          {minsAgo !== null && <span style={{ fontWeight: 400, color: 'var(--fg3)', marginLeft: 4 }}>{minsAgo}m ago</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => dispatch({ type: 'RESUME_PRESCRIBER', prescriberId: p.id })}
                        title="Resume"
                        style={{ border: '1px solid #FDE68A', background: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: 10, color: '#92400E', padding: '2px 6px' }}
                      >
                        ▶ Resume
                      </button>
                    </div>
                    {p.pauseNote && (
                      <div style={{ fontSize: 10, color: 'var(--fg3)', fontStyle: 'italic', paddingLeft: 36 }}>{p.pauseNote}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rest breaks section */}
        {onBreakPrescribers.length > 0 && (
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
              paddingBottom: 4, borderBottom: '2px solid #E0E7FF',
            }}>
              <span style={{ fontSize: 12 }}>☕</span>
              <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: '#3730A3', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                On Break
              </span>
              <span style={{
                marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#3730A3',
                background: '#EEF2FF', border: '1px solid #C7D2FE',
                borderRadius: 999, padding: '1px 7px',
              }}>{onBreakPrescribers.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {onBreakPrescribers.map(p => (
                <div key={p.id} style={{
                  padding: '7px 10px', borderRadius: 'var(--r-md)',
                  background: '#EEF2FF', border: '1px solid #C7D2FE',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Avatar initials={p.initials} role={p.role} size={26} style={{ filter: 'grayscale(0.4)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: 'var(--fg2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: '#3730A3' }}>Rest break</div>
                  </div>
                  <button
                    onClick={() => dispatch({ type: 'SET_PRESCRIBER_STATUS', prescriberId: p.id, status: 'online' })}
                    title="Return to pool"
                    style={{ border: '1px solid #C7D2FE', background: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: 10, color: '#3730A3', padding: '2px 6px' }}
                  >
                    Return
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Config modal */}
      <Modal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        title="Performance Monitor — Settings"
        width={380}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfigOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={() => {
              dispatch({ type: 'UPDATE_PERFORMANCE_CONFIG', config: editConfig });
              setConfigOpen(false);
            }}>Save</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <CfgField
            label="Slow rate threshold (%)"
            hint="Flag a prescriber whose rate is this % below the team average."
            value={editConfig.slowRateThresholdPct}
            onChange={v => setEditConfig(c => ({ ...c, slowRateThresholdPct: v }))}
            min={5} max={80}
          />
          <CfgField
            label="Watch after (hours)"
            hint="Show in Watch section after being below threshold for this long."
            value={editConfig.watchHours}
            onChange={v => setEditConfig(c => ({ ...c, watchHours: v }))}
            min={0.25} max={4} step={0.25}
          />
          <CfgField
            label="Take Action after (hours)"
            hint="Escalate to Take Action section after this long below threshold."
            value={editConfig.actionHours}
            onChange={v => setEditConfig(c => ({ ...c, actionHours: v }))}
            min={0.5} max={8} step={0.25}
          />
          <CfgField
            label="Idle threshold (minutes)"
            hint="Flag as Idle if no activity is recorded for this many minutes."
            value={editConfig.idleMinutes}
            onChange={v => setEditConfig(c => ({ ...c, idleMinutes: v }))}
            min={5} max={120}
          />
        </div>
      </Modal>
    </>
  );
}

function Stat({ label, value, color, isNum }: { label: string; value: number; color?: string; isNum?: boolean }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: color ?? 'var(--fg1)', lineHeight: 1 }}>
        {isNum ? value : value}
      </div>
      <div style={{ fontSize: 9, color: 'var(--fg4)', marginTop: 2, whiteSpace: 'nowrap' }}>{label}</div>
    </div>
  );
}
