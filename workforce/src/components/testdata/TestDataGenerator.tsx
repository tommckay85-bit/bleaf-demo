import { useState } from 'react';
import { useWorkforce } from '../../store/WorkforceContext';
import { SERVICE_CATEGORIES, SERVICES } from '../../data/services';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import type { Order, Urgency, PatientMessage } from '../../types';

const URGENCY_WEIGHTS = { routine: 60, urgent: 30, critical: 10 };
const VALUE_RANGES = {
  routine: [14.99, 29.99, 34.99, 44.99],
  urgent: [39.99, 49.99, 64.99],
  critical: [34.99, 49.99, 79.99, 99.99],
};

function pickWeighted<T>(weights: Record<string, number>): T {
  const keys = Object.keys(weights);
  const total = keys.reduce((s, k) => s + weights[k], 0);
  let r = Math.random() * total;
  for (const k of keys) {
    r -= weights[k];
    if (r <= 0) return k as unknown as T;
  }
  return keys[keys.length - 1] as unknown as T;
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateOrders(
  serviceIds: string[],
  count: number,
  urgencyOverride: Urgency | 'mixed',
  ageRange: [number, number],
): Order[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const serviceId = rand(serviceIds);
    const urgency: Urgency = urgencyOverride === 'mixed' ? pickWeighted<Urgency>(URGENCY_WEIGHTS) : urgencyOverride;
    const ageHours = ageRange[0] + Math.random() * (ageRange[1] - ageRange[0]);
    const value = rand(VALUE_RANGES[urgency]);
    const status = (urgency === 'critical' && ageHours > 6 ? 'escalated' : 'pending') as Order['status'];
    return {
      id: `gen-${now}-${i}`,
      serviceId,
      patientRef: `PT-${Math.floor(1000 + Math.random() * 9000)}`,
      urgency,
      ageHours: Math.round(ageHours * 10) / 10,
      value,
      status,
      createdAt: new Date(now - ageHours * 3600000).toISOString(),
      priorityScore: 0,
    };
  });
}

function generateMessages(
  categoryId: string | null,
  serviceIds: string[],
  count: number,
  urgencyOverride: Urgency | 'mixed',
  ageRange: [number, number],
  isGeneral: boolean,
): PatientMessage[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const urgency: Urgency = urgencyOverride === 'mixed' ? pickWeighted<Urgency>(URGENCY_WEIGHTS) : urgencyOverride;
    const ageHours = ageRange[0] + Math.random() * (ageRange[1] - ageRange[0]);
    const serviceId = !isGeneral && serviceIds.length > 0 ? rand(serviceIds) : undefined;
    return {
      id: `gmsg-${now}-${i}`,
      categoryId: isGeneral ? undefined : (categoryId || undefined),
      serviceId,
      patientRef: `PT-${Math.floor(1000 + Math.random() * 9000)}`,
      urgency,
      ageHours: Math.round(ageHours * 10) / 10,
      status: 'pending' as const,
      isGeneral,
    };
  });
}

interface GeneratorConfig {
  mode: 'category' | 'service';
  categoryId: string;
  serviceIds: string[];
  count: number;
  urgency: Urgency | 'mixed';
  ageMin: number;
  ageMax: number;
}

interface MessageConfig {
  isGeneral: boolean;
  categoryId: string;
  count: number;
  urgency: Urgency | 'mixed';
  ageMin: number;
  ageMax: number;
}

export function TestDataGenerator() {
  const { orders, messages, dispatch } = useWorkforce();
  const [activeTab, setActiveTab] = useState<'orders' | 'messages'>('orders');
  const [cfg, setCfg] = useState<GeneratorConfig>({
    mode: 'category',
    categoryId: 'womens-health',
    serviceIds: [],
    count: 10,
    urgency: 'mixed',
    ageMin: 0,
    ageMax: 24,
  });
  const [msgCfg, setMsgCfg] = useState<MessageConfig>({
    isGeneral: false,
    categoryId: 'womens-health',
    count: 10,
    urgency: 'mixed',
    ageMin: 0,
    ageMax: 24,
  });
  const [lastGenCount, setLastGenCount] = useState<number | null>(null);
  const [lastMsgCount, setLastMsgCount] = useState<number | null>(null);

  const cat = SERVICE_CATEGORIES.find(c => c.id === cfg.categoryId)!;
  const catServices = SERVICES.filter(s => s.categoryId === cfg.categoryId);
  const msgCat = SERVICE_CATEGORIES.find(c => c.id === msgCfg.categoryId)!;
  const msgCatServices = SERVICES.filter(s => s.categoryId === msgCfg.categoryId);

  const effectiveServiceIds = cfg.mode === 'category'
    ? cat.serviceIds
    : cfg.serviceIds.length > 0
      ? cfg.serviceIds
      : cat.serviceIds.slice(0, 1);

  function generate() {
    const newOrders = generateOrders(effectiveServiceIds, cfg.count, cfg.urgency, [cfg.ageMin, cfg.ageMax]);
    dispatch({ type: 'ADD_ORDERS', orders: newOrders });
    setLastGenCount(newOrders.length);
  }

  function clearGenerated() {
    dispatch({ type: 'CLEAR_GENERATED_ORDERS' });
    setLastGenCount(null);
  }

  function generateMsgs() {
    const newMessages = generateMessages(
      msgCfg.isGeneral ? null : msgCfg.categoryId,
      msgCfg.isGeneral ? [] : msgCatServices.map(s => s.id),
      msgCfg.count,
      msgCfg.urgency,
      [msgCfg.ageMin, msgCfg.ageMax],
      msgCfg.isGeneral,
    );
    dispatch({ type: 'ADD_MESSAGES', messages: newMessages });
    setLastMsgCount(newMessages.length);
  }

  function clearGeneratedMsgs() {
    dispatch({ type: 'CLEAR_GENERATED_MESSAGES' });
    setLastMsgCount(null);
  }

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'escalated').length;
  const totalMessages = messages.length;
  const pendingMessages = messages.filter(m => m.status === 'pending').length;

  const ordersByCategory = SERVICE_CATEGORIES.map(c => ({
    ...c,
    count: orders.filter(o => c.serviceIds.includes(o.serviceId) && (o.status === 'pending' || o.status === 'escalated')).length,
    urgentCount: orders.filter(o => c.serviceIds.includes(o.serviceId) && o.urgency !== 'routine' && (o.status === 'pending' || o.status === 'escalated')).length,
  }));

  const messagesByCategory = SERVICE_CATEGORIES.map(c => ({
    ...c,
    count: messages.filter(m => m.categoryId === c.id && m.status === 'pending').length,
  }));
  const generalCount = messages.filter(m => m.isGeneral && m.status === 'pending').length;

  return (
    <div style={{ display: 'flex', gap: 'var(--space-5)' }}>
      {/* Generator panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 2,
          background: 'var(--surface)', padding: 4,
          borderRadius: 'var(--r-md)', width: 'fit-content',
          border: '1px solid var(--border)',
        }}>
          {(['orders', 'messages'] as const).map(tab => (
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
              {tab === 'orders' ? 'Orders' : 'Messages'}
            </button>
          ))}
        </div>

        {activeTab === 'orders' && (
          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--r-lg)',
            padding: 'var(--space-5)', boxShadow: 'var(--shadow-1)',
            border: '1px solid var(--border)',
          }}>
            <h2 style={{ fontSize: 'var(--fs-h3)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
              Generate Orders
            </h2>

            {/* Mode toggle */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <FieldLabel>Generation scope</FieldLabel>
              <div style={{ display: 'flex', gap: 2, background: 'var(--surface-alt)', padding: 3, borderRadius: 'var(--r-md)', width: 'fit-content' }}>
                {(['category', 'service'] as const).map(m => (
                  <button key={m} onClick={() => setCfg(c => ({ ...c, mode: m }))} style={{
                    padding: '5px 16px', border: 'none', borderRadius: 'var(--r-sm)',
                    cursor: 'pointer', fontWeight: 600, fontSize: 'var(--fs-small)',
                    background: cfg.mode === m ? '#fff' : 'transparent',
                    color: cfg.mode === m ? 'var(--fg1)' : 'var(--fg3)',
                    boxShadow: cfg.mode === m ? 'var(--shadow-1)' : 'none',
                    transition: 'all 0.1s',
                  }}>
                    {m === 'category' ? 'Whole category' : 'Specific services'}
                  </button>
                ))}
              </div>
            </div>

            {/* Category picker */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <FieldLabel>Service category</FieldLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SERVICE_CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setCfg(cfg => ({ ...cfg, categoryId: c.id, serviceIds: [] }))}
                    style={{
                      padding: '6px 12px', borderRadius: 'var(--r-pill)',
                      border: `1.5px solid ${cfg.categoryId === c.id ? c.color : 'var(--border)'}`,
                      background: cfg.categoryId === c.id ? `${c.color}15` : 'transparent',
                      color: cfg.categoryId === c.id ? c.color : 'var(--fg3)',
                      cursor: 'pointer', fontSize: 'var(--fs-small)',
                      fontWeight: cfg.categoryId === c.id ? 600 : 400,
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <span>{c.icon}</span>{c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Service picker */}
            {cfg.mode === 'service' && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <FieldLabel>Services within {cat.name} ({cfg.serviceIds.length} selected)</FieldLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {catServices.map(svc => {
                    const sel = cfg.serviceIds.includes(svc.id);
                    return (
                      <button
                        key={svc.id}
                        onClick={() => {
                          const ids = sel ? cfg.serviceIds.filter(id => id !== svc.id) : [...cfg.serviceIds, svc.id];
                          setCfg(c => ({ ...c, serviceIds: ids }));
                        }}
                        style={{
                          padding: '4px 10px', borderRadius: 'var(--r-pill)',
                          border: `1.5px solid ${sel ? cat.color : 'var(--border)'}`,
                          background: sel ? `${cat.color}15` : 'transparent',
                          color: sel ? cat.color : 'var(--fg3)',
                          cursor: 'pointer', fontSize: 'var(--fs-micro)',
                          fontWeight: sel ? 600 : 400,
                        }}
                      >
                        {svc.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div>
                <FieldLabel>Number of orders</FieldLabel>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {[5, 10, 25, 50, 100].map(n => (
                    <button
                      key={n}
                      onClick={() => setCfg(c => ({ ...c, count: n }))}
                      style={{
                        padding: '5px 10px', border: `1.5px solid ${cfg.count === n ? 'var(--boots-blue)' : 'var(--border)'}`,
                        borderRadius: 'var(--r-sm)', background: cfg.count === n ? 'var(--boots-blue)' : 'transparent',
                        color: cfg.count === n ? '#fff' : 'var(--fg2)', cursor: 'pointer',
                        fontSize: 'var(--fs-small)', fontWeight: 600,
                      }}
                    >
                      {n}
                    </button>
                  ))}
                  <input type="number" min={1} max={500} value={cfg.count} onChange={e => setCfg(c => ({ ...c, count: Math.min(500, Math.max(1, +e.target.value)) }))} style={{ ...inputSty, width: 60 }} />
                </div>
              </div>

              <div>
                <FieldLabel>Urgency mix</FieldLabel>
                <select value={cfg.urgency} onChange={e => setCfg(c => ({ ...c, urgency: e.target.value as Urgency | 'mixed' }))} style={inputSty}>
                  <option value="mixed">Mixed (60% routine, 30% urgent, 10% critical)</option>
                  <option value="routine">All routine</option>
                  <option value="urgent">All urgent</option>
                  <option value="critical">All critical</option>
                </select>
              </div>

              <div>
                <FieldLabel>Order age range (hours)</FieldLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="number" min={0} max={168} value={cfg.ageMin} onChange={e => setCfg(c => ({ ...c, ageMin: +e.target.value }))} style={{ ...inputSty, width: 60 }} />
                  <span style={{ color: 'var(--fg3)', fontSize: 'var(--fs-small)' }}>to</span>
                  <input type="number" min={0} max={168} value={cfg.ageMax} onChange={e => setCfg(c => ({ ...c, ageMax: +e.target.value }))} style={{ ...inputSty, width: 60 }} />
                  <span style={{ color: 'var(--fg3)', fontSize: 'var(--fs-small)' }}>hrs</span>
                </div>
                <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Fresh', min: 0, max: 2 },
                    { label: '0–12h', min: 0, max: 12 },
                    { label: '0–24h', min: 0, max: 24 },
                    { label: '12–48h', min: 12, max: 48 },
                    { label: 'Old', min: 24, max: 120 },
                  ].map(p => (
                    <button
                      key={p.label}
                      onClick={() => setCfg(c => ({ ...c, ageMin: p.min, ageMax: p.max }))}
                      style={{ padding: '2px 7px', border: '1px solid var(--border)', borderRadius: 'var(--r-pill)', background: 'transparent', color: 'var(--fg3)', cursor: 'pointer', fontSize: 'var(--fs-micro)' }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: 'var(--space-4)', background: 'var(--surface-alt)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', marginBottom: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--fs-small)', color: 'var(--fg2)', marginBottom: 4 }}>
                <strong>Preview:</strong> Generate <strong>{cfg.count}</strong> {cfg.urgency === 'mixed' ? 'mixed urgency' : cfg.urgency} orders
                {cfg.mode === 'category' ? ` across all ${catServices.length} ${cat.name} services` : cfg.serviceIds.length > 0 ? ` for ${cfg.serviceIds.length} selected service(s)` : ` for all ${catServices.length} ${cat.name} services`}
                , aged between <strong>{cfg.ageMin}h</strong> and <strong>{cfg.ageMax}h</strong>.
              </div>
              {cfg.ageMax > 24 && (
                <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--warning)' }}>
                  ⚠ Orders older than 24h may already be in SLA warning territory.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <Button variant="primary" size="md" onClick={generate}>⚗ Generate {cfg.count} orders</Button>
              <Button variant="ghost" size="md" onClick={clearGenerated}>Clear all generated</Button>
              {lastGenCount !== null && <Badge variant="success" size="md">✓ {lastGenCount} orders added</Badge>}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--r-lg)',
            padding: 'var(--space-5)', boxShadow: 'var(--shadow-1)',
            border: '1px solid var(--border)',
          }}>
            <h2 style={{ fontSize: 'var(--fs-h3)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
              Generate Patient Messages
            </h2>

            {/* General toggle */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <FieldLabel>Message type</FieldLabel>
              <div style={{ display: 'flex', gap: 2, background: 'var(--surface-alt)', padding: 3, borderRadius: 'var(--r-md)', width: 'fit-content' }}>
                {[
                  { id: false, label: 'Category-linked' },
                  { id: true, label: 'General (unlinked)' },
                ].map(opt => (
                  <button
                    key={String(opt.id)}
                    onClick={() => setMsgCfg(c => ({ ...c, isGeneral: opt.id }))}
                    style={{
                      padding: '5px 16px', border: 'none', borderRadius: 'var(--r-sm)',
                      cursor: 'pointer', fontWeight: 600, fontSize: 'var(--fs-small)',
                      background: msgCfg.isGeneral === opt.id ? '#fff' : 'transparent',
                      color: msgCfg.isGeneral === opt.id ? 'var(--fg1)' : 'var(--fg3)',
                      boxShadow: msgCfg.isGeneral === opt.id ? 'var(--shadow-1)' : 'none',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category picker (when not general) */}
            {!msgCfg.isGeneral && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <FieldLabel>Service category</FieldLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SERVICE_CATEGORIES.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setMsgCfg(cfg => ({ ...cfg, categoryId: c.id }))}
                      style={{
                        padding: '6px 12px', borderRadius: 'var(--r-pill)',
                        border: `1.5px solid ${msgCfg.categoryId === c.id ? c.color : 'var(--border)'}`,
                        background: msgCfg.categoryId === c.id ? `${c.color}15` : 'transparent',
                        color: msgCfg.categoryId === c.id ? c.color : 'var(--fg3)',
                        cursor: 'pointer', fontSize: 'var(--fs-small)',
                        fontWeight: msgCfg.categoryId === c.id ? 600 : 400,
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      <span>{c.icon}</span>{c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div>
                <FieldLabel>Number of messages</FieldLabel>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {[5, 10, 25, 50, 100].map(n => (
                    <button
                      key={n}
                      onClick={() => setMsgCfg(c => ({ ...c, count: n }))}
                      style={{
                        padding: '5px 10px', border: `1.5px solid ${msgCfg.count === n ? 'var(--boots-blue)' : 'var(--border)'}`,
                        borderRadius: 'var(--r-sm)', background: msgCfg.count === n ? 'var(--boots-blue)' : 'transparent',
                        color: msgCfg.count === n ? '#fff' : 'var(--fg2)', cursor: 'pointer',
                        fontSize: 'var(--fs-small)', fontWeight: 600,
                      }}
                    >
                      {n}
                    </button>
                  ))}
                  <input type="number" min={1} max={500} value={msgCfg.count} onChange={e => setMsgCfg(c => ({ ...c, count: Math.min(500, Math.max(1, +e.target.value)) }))} style={{ ...inputSty, width: 60 }} />
                </div>
              </div>

              <div>
                <FieldLabel>Urgency mix</FieldLabel>
                <select value={msgCfg.urgency} onChange={e => setMsgCfg(c => ({ ...c, urgency: e.target.value as Urgency | 'mixed' }))} style={inputSty}>
                  <option value="mixed">Mixed (60% routine, 30% urgent, 10% critical)</option>
                  <option value="routine">All routine</option>
                  <option value="urgent">All urgent</option>
                  <option value="critical">All critical</option>
                </select>
              </div>

              <div>
                <FieldLabel>Message age range (hours)</FieldLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="number" min={0} max={168} value={msgCfg.ageMin} onChange={e => setMsgCfg(c => ({ ...c, ageMin: +e.target.value }))} style={{ ...inputSty, width: 60 }} />
                  <span style={{ color: 'var(--fg3)', fontSize: 'var(--fs-small)' }}>to</span>
                  <input type="number" min={0} max={168} value={msgCfg.ageMax} onChange={e => setMsgCfg(c => ({ ...c, ageMax: +e.target.value }))} style={{ ...inputSty, width: 60 }} />
                  <span style={{ color: 'var(--fg3)', fontSize: 'var(--fs-small)' }}>hrs</span>
                </div>
                <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Fresh', min: 0, max: 2 },
                    { label: '0–12h', min: 0, max: 12 },
                    { label: '0–24h', min: 0, max: 24 },
                    { label: 'Old', min: 24, max: 120 },
                  ].map(p => (
                    <button
                      key={p.label}
                      onClick={() => setMsgCfg(c => ({ ...c, ageMin: p.min, ageMax: p.max }))}
                      style={{ padding: '2px 7px', border: '1px solid var(--border)', borderRadius: 'var(--r-pill)', background: 'transparent', color: 'var(--fg3)', cursor: 'pointer', fontSize: 'var(--fs-micro)' }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: 'var(--space-4)', background: 'var(--surface-alt)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', marginBottom: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--fs-small)', color: 'var(--fg2)' }}>
                <strong>Preview:</strong> Generate <strong>{msgCfg.count}</strong> {msgCfg.urgency === 'mixed' ? 'mixed urgency' : msgCfg.urgency} {msgCfg.isGeneral ? 'general (unlinked)' : `${msgCat?.name}`} messages aged <strong>{msgCfg.ageMin}h</strong>–<strong>{msgCfg.ageMax}h</strong>.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <Button variant="primary" size="md" onClick={generateMsgs}>💬 Generate {msgCfg.count} messages</Button>
              <Button variant="ghost" size="md" onClick={clearGeneratedMsgs}>Clear generated messages</Button>
              {lastMsgCount !== null && <Badge variant="success" size="md">✓ {lastMsgCount} messages added</Badge>}
            </div>
          </div>
        )}
      </div>

      {/* Right: current queue summary */}
      <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--r-lg)',
          padding: 'var(--space-4)', boxShadow: 'var(--shadow-1)',
          border: '1px solid var(--border)',
        }}>
          <h3 style={{ fontSize: 'var(--fs-small)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Queue Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <StatBox label="Total orders" value={totalOrders} color="var(--fg1)" />
            <StatBox label="Pending / esc." value={pendingOrders} color="var(--warning)" />
            <StatBox label="Critical" value={orders.filter(o => o.urgency === 'critical' && o.status !== 'complete').length} color="var(--danger)" />
            <StatBox label="Urgent" value={orders.filter(o => o.urgency === 'urgent' && o.status !== 'complete').length} color="#D97706" />
          </div>

          <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--fg4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Orders by category
          </div>
          {ordersByCategory.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 12, width: 16, textAlign: 'center' }}>{c.icon}</span>
              <span style={{ flex: 1, fontSize: 'var(--fs-micro)', color: 'var(--fg2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
              <span style={{ fontWeight: 700, fontSize: 'var(--fs-micro)', color: c.count > 0 ? 'var(--fg1)' : 'var(--fg4)', minWidth: 16, textAlign: 'right' }}>{c.count}</span>
              {c.urgentCount > 0 && <span style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 700 }}>+{c.urgentCount}!</span>}
            </div>
          ))}
        </div>

        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--r-lg)',
          padding: 'var(--space-4)', boxShadow: 'var(--shadow-1)',
          border: '1px solid var(--border)',
        }}>
          <h3 style={{ fontSize: 'var(--fs-small)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Messages Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <StatBox label="Total msgs" value={totalMessages} color="var(--fg1)" />
            <StatBox label="Pending" value={pendingMessages} color="var(--info)" />
            <StatBox label="General" value={generalCount} color="var(--fg3)" />
          </div>
          <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--fg4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Messages by category
          </div>
          {messagesByCategory.filter(c => c.count > 0).map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 12, width: 16, textAlign: 'center' }}>{c.icon}</span>
              <span style={{ flex: 1, fontSize: 'var(--fs-micro)', color: 'var(--fg2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
              <span style={{ fontWeight: 700, fontSize: 'var(--fs-micro)', color: 'var(--fg1)', minWidth: 16, textAlign: 'right' }}>{c.count}</span>
            </div>
          ))}
        </div>

        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--r-lg)',
          padding: 'var(--space-4)', boxShadow: 'var(--shadow-1)',
          border: '1px solid var(--border)',
          fontSize: 'var(--fs-micro)', color: 'var(--fg3)',
        }}>
          <div style={{ fontWeight: 700, color: 'var(--fg2)', marginBottom: 6 }}>Quick presets</div>
          {[
            { label: 'Morning rush — mixed queue', cat: 'womens-health', count: 30, urgency: 'mixed' as const, min: 0, max: 8 },
            { label: 'Critical sexual health backlog', cat: 'sexual-health', count: 15, urgency: 'critical' as const, min: 8, max: 20 },
            { label: 'Weight management pipeline', cat: 'weight-management', count: 20, urgency: 'mixed' as const, min: 2, max: 48 },
            { label: 'SLA breach scenario', cat: 'mental-health', count: 10, urgency: 'urgent' as const, min: 60, max: 100 },
          ].map(p => (
            <button
              key={p.label}
              onClick={() => {
                setActiveTab('orders');
                setCfg({ mode: 'category', categoryId: p.cat, serviceIds: [], count: p.count, urgency: p.urgency, ageMin: p.min, ageMax: p.max });
              }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '6px 8px', margin: '2px 0',
                border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                background: 'transparent', cursor: 'pointer', color: 'var(--fg2)',
                fontSize: 'var(--fs-micro)',
              }}
            >
              → {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
      {children}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)' }}>{label}</div>
    </div>
  );
}

const inputSty: React.CSSProperties = {
  padding: '7px 10px',
  border: '1.5px solid var(--border)',
  borderRadius: 'var(--r-md)',
  fontSize: 'var(--fs-small)',
  color: 'var(--fg1)',
  background: 'var(--surface)',
  outline: 'none',
  width: '100%',
};
