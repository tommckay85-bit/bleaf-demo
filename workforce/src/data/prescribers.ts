import type { Prescriber } from '../types';

export const INITIAL_PRESCRIBERS: Prescriber[] = [
  {
    id: 'p-01', name: 'Dr Sarah Mitchell', initials: 'SM',
    role: 'gp', status: 'online',
    serviceIds: ['wh-01','wh-02','wh-03','wh-04','wh-05','wh-06','wh-07','wh-08','wh-09','mh-02','derm-01','derm-02','derm-03','gen-01','gen-02','gen-03'],
  },
  {
    id: 'p-02', name: 'James Okafor', initials: 'JO',
    role: 'pharmacist', status: 'online',
    serviceIds: ['wh-01','wh-02','wh-05','wh-06','wh-07','wh-08','mh-01','mh-02','mh-03','mh-07','sh-01','sh-04','sh-05','sh-06','sh-08','derm-01','derm-02','derm-03','derm-05','derm-06','gen-01','gen-02','gen-03'],
  },
  {
    id: 'p-03', name: 'Nurse Priya Sharma', initials: 'PS',
    role: 'nurse', status: 'online',
    serviceIds: ['wh-01','wh-02','wh-03','wh-04','wh-05','wh-06','wh-07','wh-08','wm-01','wm-02','wm-03','wm-04','sh-01','sh-02','sh-04','sh-05','sh-06','sh-07','sh-08','mntl-01','mntl-02','mntl-03','mntl-05','gen-01','gen-02','gen-03','gen-04'],
  },
  {
    id: 'p-04', name: 'Dr Aisha Patel', initials: 'AP',
    role: 'specialist', status: 'online',
    serviceIds: ['wh-09','wh-10','wm-01','wm-02','wm-03','wm-05','wm-06','sh-02','sh-03','mntl-01','mntl-02','mntl-03','mntl-04','mntl-05','mntl-06','mh-04','mh-05','mh-06','mh-08'],
  },
  {
    id: 'p-05', name: 'Dr Robert Chen', initials: 'RC',
    role: 'gp', status: 'online',
    serviceIds: ['mh-01','mh-02','mh-03','mh-04','mh-05','mh-07','mh-08','wm-01','wm-04','wm-05','sh-01','sh-02','sh-04','sh-05','sh-06','sh-07','sh-08','derm-01','derm-02','derm-03','derm-04','derm-06','mntl-01','mntl-02','mntl-03','mntl-05','gen-01','gen-02','gen-03','gen-04'],
  },
  {
    id: 'p-06', name: 'Fatima Al-Hassan', initials: 'FA',
    role: 'pharmacist', status: 'online',
    serviceIds: ['wh-01','wh-02','wh-05','wh-06','wh-07','wh-08','mh-01','mh-02','mh-07','sh-04','sh-05','sh-06','sh-08','derm-01','derm-02','derm-03','derm-05','derm-06','gen-01','gen-02','gen-03'],
  },
  {
    id: 'p-07', name: 'Nurse Tom Bradley', initials: 'TB',
    role: 'nurse', status: 'scheduled',
    serviceIds: ['wh-01','wh-02','wh-05','wh-06','mh-01','mh-02','mh-03','sh-01','sh-04','sh-05','sh-06','sh-07','sh-08','derm-01','derm-03','derm-05','gen-01','gen-02','gen-03','gen-04'],
  },
  {
    id: 'p-08', name: 'Dr Lucy Watts', initials: 'LW',
    role: 'gp', status: 'scheduled',
    serviceIds: ['wh-01','wh-02','wh-03','wh-04','wh-05','wh-06','wh-07','wh-08','wh-09','mh-02','mh-04','mh-05','mh-08','wm-01','wm-04','sh-01','sh-02','sh-04','sh-05','sh-06','sh-07','sh-08','derm-01','derm-02','derm-03','derm-04','derm-06','mntl-01','mntl-02','mntl-03','mntl-05','gen-01','gen-02','gen-03','gen-04'],
  },
  {
    id: 'p-09', name: 'Dr Marcus Singh', initials: 'MS',
    role: 'specialist', status: 'offline',
    serviceIds: ['wh-09','wh-10','mh-04','mh-05','mh-06','mh-08','wm-05','wm-06','sh-02','sh-03','mntl-03','mntl-04','mntl-06'],
  },
  {
    id: 'p-10', name: 'Amy Thornton', initials: 'AT',
    role: 'pharmacist', status: 'offline',
    serviceIds: ['wh-01','wh-02','wh-05','wh-06','wh-07','wh-08','mh-01','mh-02','mh-03','mh-07','derm-01','derm-02','derm-03','derm-05','gen-01','gen-02','gen-03'],
  },
];
