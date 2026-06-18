import type { CSSProperties } from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Workforce', icon: '⊞' },
  { id: 'diary', label: 'Diary', icon: '📅' },
  { id: 'rota', label: 'Rota', icon: '📋' },
  { id: 'people', label: 'People', icon: '👤' },
  { id: 'rules', label: 'Rules & SLAs', icon: '⚙' },
  { id: 'testdata', label: 'Test Data', icon: '⚗' },
];

interface SidebarProps {
  activeView: string;
  onViewChange: (v: string) => void;
}

const itemBase: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 14px',
  borderRadius: 'var(--r-md)',
  cursor: 'pointer',
  border: 'none',
  background: 'transparent',
  color: 'rgba(255,255,255,0.7)',
  fontSize: 'var(--fs-small)',
  fontWeight: 500,
  width: '100%',
  textAlign: 'left',
  transition: 'all 0.15s ease',
};

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      background: 'var(--boots-blue)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100vh',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            background: '#fff',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <img
              src="/bleaf-demo/assets/pims-sidebar-logo.png"
              alt="PIMS"
              style={{ width: 28, height: 28, objectFit: 'contain' }}
            />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 'var(--fs-small)', lineHeight: 1.2 }}>PIMS</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--fs-micro)' }}>Boots Online Doctor</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            style={{
              ...itemBase,
              background: activeView === item.id ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: activeView === item.id ? '#fff' : 'rgba(255,255,255,0.65)',
            }}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        fontSize: 'var(--fs-micro)',
        color: 'rgba(255,255,255,0.35)',
      }}>
        PIMS v1.0
      </div>
    </aside>
  );
}
