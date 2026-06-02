import type { Order } from '../types';

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();

export const INITIAL_ORDERS: Order[] = [
  { id: 'ord-001', serviceId: 'wh-02', patientRef: 'PT-8821', urgency: 'critical', ageHours: 1.2, value: 34.99, status: 'pending', createdAt: hoursAgo(1.2) },
  { id: 'ord-002', serviceId: 'sh-04', patientRef: 'PT-4412', urgency: 'urgent', ageHours: 2.5, value: 19.99, status: 'pending', createdAt: hoursAgo(2.5) },
  { id: 'ord-003', serviceId: 'wm-01', patientRef: 'PT-7703', urgency: 'routine', ageHours: 4.0, value: 79.99, status: 'pending', createdAt: hoursAgo(4.0) },
  { id: 'ord-004', serviceId: 'mh-02', patientRef: 'PT-2290', urgency: 'urgent', ageHours: 3.1, value: 29.99, status: 'pending', createdAt: hoursAgo(3.1) },
  { id: 'ord-005', serviceId: 'wh-01', patientRef: 'PT-5567', urgency: 'routine', ageHours: 6.0, value: 24.99, status: 'allocated', createdAt: hoursAgo(6.0), prescriberId: 'p-01' },
  { id: 'ord-006', serviceId: 'derm-01', patientRef: 'PT-3344', urgency: 'routine', ageHours: 8.5, value: 39.99, status: 'pending', createdAt: hoursAgo(8.5) },
  { id: 'ord-007', serviceId: 'sh-05', patientRef: 'PT-9900', urgency: 'urgent', ageHours: 1.8, value: 24.99, status: 'pending', createdAt: hoursAgo(1.8) },
  { id: 'ord-008', serviceId: 'mntl-01', patientRef: 'PT-6612', urgency: 'routine', ageHours: 22.0, value: 49.99, status: 'pending', createdAt: hoursAgo(22.0) },
  { id: 'ord-009', serviceId: 'wh-03', patientRef: 'PT-1123', urgency: 'routine', ageHours: 10.0, value: 54.99, status: 'pending', createdAt: hoursAgo(10.0) },
  { id: 'ord-010', serviceId: 'wm-01', patientRef: 'PT-8834', urgency: 'routine', ageHours: 5.5, value: 79.99, status: 'pending', createdAt: hoursAgo(5.5) },
  { id: 'ord-011', serviceId: 'mh-01', patientRef: 'PT-4478', urgency: 'routine', ageHours: 12.0, value: 34.99, status: 'pending', createdAt: hoursAgo(12.0) },
  { id: 'ord-012', serviceId: 'sh-01', patientRef: 'PT-7723', urgency: 'urgent', ageHours: 4.5, value: 44.99, status: 'pending', createdAt: hoursAgo(4.5) },
  { id: 'ord-013', serviceId: 'wh-05', patientRef: 'PT-2211', urgency: 'routine', ageHours: 7.0, value: 14.99, status: 'pending', createdAt: hoursAgo(7.0) },
  { id: 'ord-014', serviceId: 'derm-03', patientRef: 'PT-8890', urgency: 'routine', ageHours: 14.0, value: 24.99, status: 'allocated', createdAt: hoursAgo(14.0), prescriberId: 'p-05' },
  { id: 'ord-015', serviceId: 'gen-02', patientRef: 'PT-3301', urgency: 'urgent', ageHours: 2.0, value: 29.99, status: 'pending', createdAt: hoursAgo(2.0) },
  { id: 'ord-016', serviceId: 'mntl-02', patientRef: 'PT-5590', urgency: 'routine', ageHours: 30.0, value: 44.99, status: 'escalated', createdAt: hoursAgo(30.0) },
  { id: 'ord-017', serviceId: 'wh-04', patientRef: 'PT-6678', urgency: 'routine', ageHours: 18.0, value: 54.99, status: 'pending', createdAt: hoursAgo(18.0) },
  { id: 'ord-018', serviceId: 'sh-02', patientRef: 'PT-4456', urgency: 'routine', ageHours: 26.0, value: 64.99, status: 'pending', createdAt: hoursAgo(26.0) },
  { id: 'ord-019', serviceId: 'wm-02', patientRef: 'PT-9912', urgency: 'routine', ageHours: 3.5, value: 29.99, status: 'pending', createdAt: hoursAgo(3.5) },
  { id: 'ord-020', serviceId: 'derm-02', patientRef: 'PT-1145', urgency: 'routine', ageHours: 20.0, value: 34.99, status: 'pending', createdAt: hoursAgo(20.0) },
  { id: 'ord-021', serviceId: 'mh-08', patientRef: 'PT-7789', urgency: 'urgent', ageHours: 6.0, value: 49.99, status: 'pending', createdAt: hoursAgo(6.0) },
  { id: 'ord-022', serviceId: 'wh-01', patientRef: 'PT-3378', urgency: 'routine', ageHours: 9.0, value: 24.99, status: 'pending', createdAt: hoursAgo(9.0) },
  { id: 'ord-023', serviceId: 'gen-01', patientRef: 'PT-6634', urgency: 'routine', ageHours: 5.0, value: 19.99, status: 'pending', createdAt: hoursAgo(5.0) },
  { id: 'ord-024', serviceId: 'sh-06', patientRef: 'PT-2267', urgency: 'routine', ageHours: 11.0, value: 24.99, status: 'in-progress', createdAt: hoursAgo(11.0), prescriberId: 'p-03' },
  { id: 'ord-025', serviceId: 'wm-04', patientRef: 'PT-8845', urgency: 'routine', ageHours: 8.0, value: 34.99, status: 'pending', createdAt: hoursAgo(8.0) },
];
