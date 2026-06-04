import type { BreakGroup } from '../types';

export const INITIAL_BREAK_GROUPS: BreakGroup[] = [
  {
    id: 'break-early',
    name: 'Early Lunch',
    startTime: '12:00',
    endTime: '12:30',
    prescriberIds: ['p-01', 'p-02'],
    enabled: true,
    color: '#E65100',
  },
  {
    id: 'break-main',
    name: 'Main Lunch',
    startTime: '12:30',
    endTime: '13:00',
    prescriberIds: ['p-03', 'p-04'],
    enabled: true,
    color: '#D97706',
  },
  {
    id: 'break-late',
    name: 'Late Lunch',
    startTime: '13:00',
    endTime: '13:30',
    prescriberIds: ['p-05', 'p-06'],
    enabled: true,
    color: '#558B2F',
  },
];
