import { useWorkforce } from '../../store/WorkforceContext';

const VIEW_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Workforce Dashboard', subtitle: 'Allocate prescribers to service categories for today' },
  diary: { title: 'Appointment Diary', subtitle: 'Full-day appointment schedule across prescribers' },
  people: { title: 'People & Permissions', subtitle: 'Manage prescribers, roles and service access' },
  rules: { title: 'Rules & SLAs', subtitle: 'Configure allocation priorities and service-level agreements' },
  testdata: { title: 'Test Data Generator', subtitle: 'Generate orders and patient messages for testing' },
};

export function TopBar({ activeView }: { activeView: string }) {
  const { prescribers } = useWorkforce();
  const online = prescribers.filter(p => p.status === 'online' || p.status === 'allocated').length;
  const allocated = prescribers.filter(p => p.status === 'allocated').length;
  const scheduled = prescribers.filter(p => p.status === 'scheduled').length;

  const info = VIEW_TITLES[activeView] || VIEW_TITLES.dashboard;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <header style={{
      height: 'var(--topbar-h)',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 var(--space-5)',
      gap: 'var(--space-4)',
      flexShrink: 0,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontSize: 'var(--fs-h3)', fontWeight: 700, color: 'var(--fg1)' }}>{info.title}</h1>
        <p style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)', marginTop: 1 }}>{info.subtitle}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Pill color="#00AE42" label={`${online} online`} />
          <Pill color="#0067B2" label={`${allocated} allocated`} />
          {scheduled > 0 && <Pill color="#D97706" label={`${scheduled} scheduled`} />}
        </div>
        <div style={{
          textAlign: 'right',
          fontSize: 'var(--fs-small)',
          color: 'var(--fg3)',
          lineHeight: 1.3,
        }}>
          <div style={{ fontWeight: 600, color: 'var(--fg1)' }}>{timeStr}</div>
          <div>{dateStr}</div>
        </div>
      </div>
    </header>
  );
}

function Pill({ color, label }: { color: string; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '4px 10px',
      borderRadius: 'var(--r-pill)',
      background: 'var(--surface-alt)',
      fontSize: 'var(--fs-micro)',
      fontWeight: 600,
      color: 'var(--fg2)',
    }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
      {label}
    </div>
  );
}
