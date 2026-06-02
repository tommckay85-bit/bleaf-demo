import type { ReactNode } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
  activeView: string;
  onViewChange: (v: string) => void;
}

export function Layout({ children, activeView, onViewChange }: LayoutProps) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar activeView={activeView} onViewChange={onViewChange} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopBar activeView={activeView} />
        <main style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-5)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
