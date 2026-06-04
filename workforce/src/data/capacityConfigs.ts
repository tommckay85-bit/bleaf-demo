import type { ServiceCapacityConfig } from '../types';

export const INITIAL_CAPACITY_CONFIGS: ServiceCapacityConfig[] = [
  // Women's Health — moderate complexity, mix of quick and slower
  { categoryId: 'womens-health', orderAHTMins: 10, messageAHTMins: 5 },
  // Men's Health — similar to women's
  { categoryId: 'mens-health', orderAHTMins: 10, messageAHTMins: 5 },
  // Weight Management — slightly more involved consultations
  { categoryId: 'weight-management', orderAHTMins: 12, messageAHTMins: 6 },
  // Sexual Health — faster turnaround for most, urgent cases
  { categoryId: 'sexual-health', orderAHTMins: 8, messageAHTMins: 4 },
  // Dermatology — straightforward assessments
  { categoryId: 'dermatology', orderAHTMins: 9, messageAHTMins: 4 },
  // Mental Health — complex, longer per-case handling
  { categoryId: 'mental-health', orderAHTMins: 15, messageAHTMins: 8 },
  // General Health — quick, routine prescriptions
  { categoryId: 'general-health', orderAHTMins: 8, messageAHTMins: 4 },
];
