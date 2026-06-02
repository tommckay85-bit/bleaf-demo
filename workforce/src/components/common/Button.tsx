import type { ButtonHTMLAttributes, ReactNode, CSSProperties } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  loading?: boolean;
}

const base: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  border: 'none',
  borderRadius: 'var(--r-md)',
  fontWeight: 600,
  transition: 'all 0.15s ease',
  whiteSpace: 'nowrap',
  letterSpacing: '0.01em',
};

const variants: Record<string, CSSProperties> = {
  primary: { background: 'var(--boots-blue)', color: '#fff' },
  secondary: { background: 'var(--surface)', color: 'var(--fg1)', border: '1.5px solid var(--border-strong)' },
  ghost: { background: 'transparent', color: 'var(--fg2)', border: '1.5px solid transparent' },
  danger: { background: 'var(--danger)', color: '#fff' },
  success: { background: 'var(--bleaf-green)', color: '#fff' },
};

const sizes: Record<string, CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: 'var(--fs-small)' },
  md: { padding: '8px 16px', fontSize: 'var(--fs-body)' },
  lg: { padding: '12px 24px', fontSize: 'var(--fs-h4)' },
};

export function Button({ variant = 'secondary', size = 'md', icon, loading, children, style, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        ...base,
        ...variants[variant],
        ...sizes[size],
        opacity: (disabled || loading) ? 0.55 : 1,
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {loading ? <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} /> : icon}
      {children}
    </button>
  );
}
