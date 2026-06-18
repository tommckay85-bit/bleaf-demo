import type { ShiftType } from '../types';

export const DEFAULT_SHIFT_TYPES: ShiftType[] = [
  { id: 'shift-early', name: 'Early', startTime: '07:00', endTime: '15:00', color: '#FEF08A', textColor: '#713F12', hoursValue: 8, defaultRequired: 3, defaultMin: 2, defaultMax: 5, activeWeekdays: true, activeWeekends: true },
  { id: 'shift-day',   name: 'Day',   startTime: '09:00', endTime: '17:00', color: '#BFDBFE', textColor: '#1E3A8A', hoursValue: 8, defaultRequired: 6, defaultMin: 4, defaultMax: 10, activeWeekdays: true, activeWeekends: true },
  { id: 'shift-late',  name: 'Late',  startTime: '13:00', endTime: '21:00', color: '#DDD6FE', textColor: '#4C1D95', hoursValue: 8, defaultRequired: 3, defaultMin: 2, defaultMax: 5, activeWeekdays: true, activeWeekends: true },
  { id: 'shift-night', name: 'Night', startTime: '21:00', endTime: '07:00', color: '#1E293B', textColor: '#E2E8F0', hoursValue: 10, defaultRequired: 1, defaultMin: 1, defaultMax: 2, activeWeekdays: true, activeWeekends: true },
];
