import type { ClinicType } from '../types';

export const INITIAL_CLINIC_TYPES: ClinicType[] = [
  {
    id: 'mental-health',
    name: 'Mental Health Consultation',
    color: '#00838F',
    defaultDurationMins: 60,
    requiredRoles: ['nurse', 'gp', 'specialist'],
  },
  {
    id: 'nhs-adhd',
    name: 'NHS ADHD Assessment',
    color: '#1565C0',
    defaultDurationMins: 90,
    requiredRoles: ['specialist'],
  },
  {
    id: 'private-adhd',
    name: 'Private ADHD Assessment',
    color: '#6A1B9A',
    defaultDurationMins: 60,
    requiredRoles: ['specialist'],
  },
  {
    id: 'medical-cannabis',
    name: 'Medical Cannabis Review',
    color: '#2E7D32',
    defaultDurationMins: 30,
    requiredRoles: ['gp', 'specialist'],
  },
];
