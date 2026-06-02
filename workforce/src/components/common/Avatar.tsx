import type { CSSProperties } from 'react';
import type { PrescriberRole } from '../../types';

const roleColors: Record<PrescriberRole, string> = {
  gp: '#0067B2',
  pharmacist: '#00AE42',
  nurse: '#C2185B',
  specialist: '#6A1B9A',
};

interface AvatarProps {
  initials: string;
  role: PrescriberRole;
  size?: number;
  style?: CSSProperties;
}

export function Avatar({ initials, role, size = 36, style }: AvatarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: roleColors[role],
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.36,
        fontWeight: 700,
        letterSpacing: '-0.01em',
        flexShrink: 0,
        ...style,
      }}
    >
      {initials}
    </div>
  );
}

export const ROLE_COLORS = roleColors;
