import type { CSSProperties, ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
  size?: 'sm' | 'md';
  style?: CSSProperties;
}

const variantStyles: Record<string, CSSProperties> = {
  default: { background: 'var(--surface-alt)', color: 'var(--fg2)' },
  success: { background: 'var(--success-bg)', color: 'var(--success)' },
  warning: { background: 'var(--warning-bg)', color: 'var(--warning)' },
  danger: { background: 'var(--danger-bg)', color: 'var(--danger)' },
  info: { background: 'var(--info-bg)', color: 'var(--info)' },
  muted: { background: 'var(--border)', color: 'var(--fg3)' },
};

export function Badge({ children, variant = 'default', size = 'sm', style }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        borderRadius: 'var(--r-pill)',
        fontSize: size === 'sm' ? 'var(--fs-micro)' : 'var(--fs-small)',
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
