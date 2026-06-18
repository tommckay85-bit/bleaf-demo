import type { BankHoliday } from '../types';

function h(date: string, name: string, type: 'statutory' | 'observance'): BankHoliday {
  return { id: `bh-${date}`, date, name, type };
}

export const BANK_HOLIDAYS: BankHoliday[] = [
  // --- 2024 statutory ---
  h('2024-01-01', "New Year's Day", 'statutory'),
  h('2024-03-29', 'Good Friday', 'statutory'),
  h('2024-04-01', 'Easter Monday', 'statutory'),
  h('2024-05-06', 'Early May Bank Holiday', 'statutory'),
  h('2024-05-27', 'Spring Bank Holiday', 'statutory'),
  h('2024-08-26', 'Summer Bank Holiday', 'statutory'),
  h('2024-12-25', 'Christmas Day', 'statutory'),
  h('2024-12-26', 'Boxing Day', 'statutory'),
  // --- 2025 statutory ---
  h('2025-01-01', "New Year's Day", 'statutory'),
  h('2025-04-18', 'Good Friday', 'statutory'),
  h('2025-04-21', 'Easter Monday', 'statutory'),
  h('2025-05-05', 'Early May Bank Holiday', 'statutory'),
  h('2025-05-26', 'Spring Bank Holiday', 'statutory'),
  h('2025-08-25', 'Summer Bank Holiday', 'statutory'),
  h('2025-12-25', 'Christmas Day', 'statutory'),
  h('2025-12-26', 'Boxing Day', 'statutory'),
  // --- 2026 statutory ---
  h('2026-01-01', "New Year's Day", 'statutory'),
  h('2026-04-03', 'Good Friday', 'statutory'),
  h('2026-04-06', 'Easter Monday', 'statutory'),
  h('2026-05-04', 'Early May Bank Holiday', 'statutory'),
  h('2026-05-25', 'Spring Bank Holiday', 'statutory'),
  h('2026-08-31', 'Summer Bank Holiday', 'statutory'),
  h('2026-12-25', 'Christmas Day', 'statutory'),
  h('2026-12-28', 'Boxing Day (substitute)', 'statutory'),
  // --- 2027 statutory ---
  h('2027-01-01', "New Year's Day", 'statutory'),
  h('2027-03-26', 'Good Friday', 'statutory'),
  h('2027-03-29', 'Easter Monday', 'statutory'),
  h('2027-05-03', 'Early May Bank Holiday', 'statutory'),
  h('2027-05-31', 'Spring Bank Holiday', 'statutory'),
  h('2027-08-30', 'Summer Bank Holiday', 'statutory'),
  h('2027-12-27', 'Christmas Day (substitute)', 'statutory'),
  h('2027-12-28', 'Boxing Day (substitute)', 'statutory'),
  // --- 2028 statutory ---
  h('2028-01-03', "New Year's Day (substitute)", 'statutory'),
  h('2028-04-14', 'Good Friday', 'statutory'),
  h('2028-04-17', 'Easter Monday', 'statutory'),
  h('2028-05-01', 'Early May Bank Holiday', 'statutory'),
  h('2028-05-29', 'Spring Bank Holiday', 'statutory'),
  h('2028-08-28', 'Summer Bank Holiday', 'statutory'),
  h('2028-12-25', 'Christmas Day', 'statutory'),
  h('2028-12-26', 'Boxing Day', 'statutory'),

  // --- Observances (special days — not labelled religious) ---
  h('2024-04-10', 'Eid al-Fitr', 'observance'),
  h('2025-03-30', 'Eid al-Fitr', 'observance'),
  h('2026-03-20', 'Eid al-Fitr', 'observance'),
  h('2027-03-10', 'Eid al-Fitr', 'observance'),
  h('2028-02-27', 'Eid al-Fitr', 'observance'),

  h('2024-06-16', 'Eid al-Adha', 'observance'),
  h('2025-06-06', 'Eid al-Adha', 'observance'),
  h('2026-05-27', 'Eid al-Adha', 'observance'),
  h('2027-05-16', 'Eid al-Adha', 'observance'),
  h('2028-05-05', 'Eid al-Adha', 'observance'),

  h('2024-10-31', 'Diwali', 'observance'),
  h('2025-10-20', 'Diwali', 'observance'),
  h('2026-11-08', 'Diwali', 'observance'),
  h('2027-10-29', 'Diwali', 'observance'),
  h('2028-10-17', 'Diwali', 'observance'),

  h('2024-12-25', 'Hanukkah (first night)', 'observance'),
  h('2025-12-14', 'Hanukkah (first night)', 'observance'),
  h('2026-12-04', 'Hanukkah (first night)', 'observance'),
  h('2027-12-24', 'Hanukkah (first night)', 'observance'),
  h('2028-12-12', 'Hanukkah (first night)', 'observance'),
];

export function bankHolidayForDate(date: string): BankHoliday | undefined {
  return BANK_HOLIDAYS.find(b => b.date === date);
}
