// Expected daily orders per service category by day of week (0=Sun, 1=Mon, ... 6=Sat)
// Derived from real order data (week of 2026-05-28 to 2026-06-03)
// womens-health combines: Period Delay + Emergency Contraception + Oral Contraception + Cystitis + other
// weight-management: Weight Loss (new, excl. refills)
// mens-health: ED + Hair Loss + other mens services
// sexual-health: STI + PrEP + other sexual health
// dermatology: Acne + Cold Sore + other derm
// mental-health: estimated from operational data
// general-health: Hayfever + other general

export interface DailyOrderConfig {
  categoryId: string;
  // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  expectedOrders: [number, number, number, number, number, number, number];
}

export const DAILY_ORDER_CONFIG: DailyOrderConfig[] = [
  { categoryId: 'womens-health',     expectedOrders: [1968, 2150, 1767, 1609, 1471, 1537, 1685] },
  { categoryId: 'weight-management', expectedOrders: [1801, 2035, 1886, 1890, 1896, 1967, 1535] },
  { categoryId: 'mens-health',       expectedOrders: [209,  311,  275,  259,  278,  263,  218] },
  { categoryId: 'sexual-health',     expectedOrders: [340,  420,  380,  350,  320,  380,  410] },
  { categoryId: 'dermatology',       expectedOrders: [311,  307,  318,  344,  343,  304,  287] },
  { categoryId: 'mental-health',     expectedOrders: [120,  180,  165,  155,  150,  160,  130] },
  { categoryId: 'general-health',    expectedOrders: [187,  280,  184,  185,  228,  194,  169] },
];

// BODCON thresholds — number of red and amber guardrails (service tiles)
export const BODCON_LEVELS = [
  {
    level: 1,
    label: 'BODCON 1',
    color: '#DC2626',
    bgColor: '#7F1D1D',
    description: 'Critical — well behind capacity',
    trigger: '≥4 guardrails red, or 3 red + 3 amber',
    action: 'All non-essential PIMs cancelled. MD, RM, Medical Director and Ops Director to meet within 30 mins. Twice-daily standups until resolved.',
    slackUpdates: 'Continuous updates',
  },
  {
    level: 2,
    label: 'BODCON 2',
    color: '#EA580C',
    bgColor: '#7C2D12',
    description: 'Severe — significant backlog building',
    trigger: '3 red, or 2 red + 3 amber, or 1 red + 6 amber',
    action: 'MD, RM, Medical Director and Ops Director notified to meet within 2 hours. Agree significant paid marketing and/or service suspensions.',
    slackUpdates: 'Meeting within 2 hours',
  },
  {
    level: 3,
    label: 'BODCON 3',
    color: '#D97706',
    bgColor: '#78350F',
    description: 'Elevated — approaching capacity limits',
    trigger: '2 red, or 6 amber, or 1 red + 3 amber',
    action: 'Consider easing marketing activity and/or implementing short firebreaks on services. Clinical ops provide regular Slack updates.',
    slackUpdates: '×3 daily updates on clinical ops Slack',
  },
  {
    level: 4,
    label: 'BODCON 4',
    color: '#CA8A04',
    bgColor: '#713F12',
    description: 'Monitoring — minor capacity pressure',
    trigger: '1 red, or 3 amber',
    action: 'Clinical ops provide daily updates specifying corrective action until all guardrails turn green.',
    slackUpdates: '×2 update on clinical ops Slack',
  },
  {
    level: 5,
    label: 'BODCON 5',
    color: '#16A34A',
    bgColor: '#14532D',
    description: 'Normal operations',
    trigger: '1–2 amber, or all green',
    action: 'Monitor as usual. 1 daily plan of action message.',
    slackUpdates: '×1 morning update',
  },
];

export function computeBodconLevel(redCount: number, amberCount: number): number {
  if (redCount >= 4 || (redCount >= 3 && amberCount >= 3)) return 1;
  if (redCount >= 3 || (redCount >= 2 && amberCount >= 3) || (redCount >= 1 && amberCount >= 6)) return 2;
  if (redCount >= 2 || amberCount >= 6 || (redCount >= 1 && amberCount >= 3)) return 3;
  if (redCount >= 1 || amberCount >= 3) return 4;
  return 5;
}

export function getExtraPrescribersSuggestion(
  totalRequiredMins: number,
  totalAvailableMins: number,
  prescriberDayMins: number = 480,
): number {
  const gap = totalRequiredMins - totalAvailableMins;
  if (gap <= 0) return 0;
  return Math.ceil(gap / prescriberDayMins);
}
