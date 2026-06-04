import type { Prescriber } from '../types';

// Service ID shorthand sets for role-based permissions
const PH = ['wh-01','wh-02','wh-05','wh-06','wh-07','wh-08','mh-01','mh-02','mh-03','mh-07','sh-01','sh-04','sh-05','sh-06','sh-08','derm-01','derm-02','derm-03','derm-05','derm-06','gen-01','gen-02','gen-03'];
const PH_FULL = [...PH, 'wh-04','mh-08','sh-07','wm-04','gen-04'];
const NU = ['wh-01','wh-02','wh-03','wh-04','wh-05','wh-06','wh-07','wh-08','wm-01','wm-02','wm-03','wm-04','sh-01','sh-02','sh-04','sh-05','sh-06','sh-07','sh-08','mntl-01','mntl-02','mntl-03','mntl-05','gen-01','gen-02','gen-03','gen-04'];
const NU_EXT = [...NU, 'derm-01','derm-02','derm-03','mntl-01','mntl-02'];
const GP = ['wh-01','wh-02','wh-03','wh-04','wh-05','wh-06','wh-07','wh-08','wh-09','mh-01','mh-02','mh-03','mh-04','mh-05','mh-07','mh-08','wm-01','wm-04','wm-05','sh-01','sh-02','sh-04','sh-05','sh-06','sh-07','sh-08','derm-01','derm-02','derm-03','derm-04','derm-06','mntl-01','mntl-02','mntl-03','mntl-05','gen-01','gen-02','gen-03','gen-04'];
const SP = ['wh-09','wh-10','mh-04','mh-05','mh-06','mh-08','wm-01','wm-02','wm-03','wm-05','wm-06','sh-02','sh-03','mntl-01','mntl-02','mntl-03','mntl-04','mntl-05','mntl-06'];

export const INITIAL_PRESCRIBERS: Prescriber[] = [
  // --- Original 10 ---
  { id:'p-01', name:'Dr Sarah Mitchell',    initials:'SM', role:'gp',          status:'online',    serviceIds:[...GP,'mh-02','derm-01','derm-02','derm-03'] },
  { id:'p-02', name:'James Okafor',         initials:'JO', role:'pharmacist',  status:'online',    serviceIds:PH },
  { id:'p-03', name:'Nurse Priya Sharma',   initials:'PS', role:'nurse',       status:'online',    serviceIds:NU },
  { id:'p-04', name:'Dr Aisha Patel',       initials:'AP', role:'specialist',  status:'online',    serviceIds:SP },
  { id:'p-05', name:'Dr Robert Chen',       initials:'RC', role:'gp',          status:'online',    serviceIds:GP },
  { id:'p-06', name:'Fatima Al-Hassan',     initials:'FA', role:'pharmacist',  status:'online',    serviceIds:PH },
  { id:'p-07', name:'Nurse Tom Bradley',    initials:'TB', role:'nurse',       status:'scheduled', serviceIds:NU },
  { id:'p-08', name:'Dr Lucy Watts',        initials:'LW', role:'gp',          status:'scheduled', serviceIds:GP },
  { id:'p-09', name:'Dr Marcus Singh',      initials:'MS', role:'specialist',  status:'offline',   serviceIds:SP },
  { id:'p-10', name:'Amy Thornton',         initials:'AT', role:'pharmacist',  status:'offline',   serviceIds:PH },

  // --- Additional pharmacists ---
  { id:'p-11', name:'Elena Morrison',       initials:'EM', role:'pharmacist',  status:'online',    serviceIds:PH_FULL },
  { id:'p-12', name:'David Park',           initials:'DP', role:'pharmacist',  status:'online',    serviceIds:PH },
  { id:'p-13', name:'Niamh O\'Brien',       initials:'NO', role:'pharmacist',  status:'online',    serviceIds:PH_FULL },
  { id:'p-14', name:'Kai Abdullah',         initials:'KA', role:'pharmacist',  status:'online',    serviceIds:PH },
  { id:'p-15', name:'Hannah Reid',          initials:'HR', role:'pharmacist',  status:'scheduled', serviceIds:PH_FULL },
  { id:'p-16', name:'Marcus Williams',      initials:'MW', role:'pharmacist',  status:'scheduled', serviceIds:PH },
  { id:'p-17', name:'Sofia Andreou',        initials:'SA', role:'pharmacist',  status:'online',    serviceIds:PH_FULL },
  { id:'p-18', name:'Ben Kaufman',          initials:'BK', role:'pharmacist',  status:'scheduled', serviceIds:PH },
  { id:'p-19', name:'Amara Osei',           initials:'AO', role:'pharmacist',  status:'online',    serviceIds:PH_FULL },
  { id:'p-20', name:'Josh Patel',           initials:'JP', role:'pharmacist',  status:'offline',   serviceIds:PH },
  { id:'p-21', name:'Rachel Liu',           initials:'RL', role:'pharmacist',  status:'online',    serviceIds:PH_FULL },
  { id:'p-22', name:'Sam Kowalski',         initials:'SK', role:'pharmacist',  status:'online',    serviceIds:PH },
  { id:'p-23', name:'Divya Nair',           initials:'DN', role:'pharmacist',  status:'scheduled', serviceIds:PH_FULL },
  { id:'p-24', name:'Owen Davies',          initials:'OD', role:'pharmacist',  status:'offline',   serviceIds:PH },
  { id:'p-25', name:'Zoe Lambert',          initials:'ZL', role:'pharmacist',  status:'online',    serviceIds:PH_FULL },
  { id:'p-26', name:'Carlos Mendez',        initials:'CM', role:'pharmacist',  status:'online',    serviceIds:PH },
  { id:'p-27', name:'Abbi Foster',          initials:'AF', role:'pharmacist',  status:'scheduled', serviceIds:PH_FULL },
  { id:'p-28', name:'Kevin Huang',          initials:'KH', role:'pharmacist',  status:'online',    serviceIds:PH },
  { id:'p-29', name:'Yemi Adeyinka',        initials:'YA', role:'pharmacist',  status:'online',    serviceIds:PH_FULL },
  { id:'p-30', name:'Chloe Barker',         initials:'CB', role:'pharmacist',  status:'online',    serviceIds:PH },

  // --- Additional nurses ---
  { id:'p-31', name:'Nurse Claire Stevens',    initials:'CS', role:'nurse',    status:'online',    serviceIds:NU_EXT },
  { id:'p-32', name:'Nurse Emmanuel Okafor',   initials:'EO', role:'nurse',    status:'online',    serviceIds:NU },
  { id:'p-33', name:'Nurse Lily Zhang',        initials:'LZ', role:'nurse',    status:'online',    serviceIds:NU_EXT },
  { id:'p-34', name:'Nurse Patrick O\'Sullivan',initials:'PO',role:'nurse',    status:'scheduled', serviceIds:NU },
  { id:'p-35', name:'Nurse Serena Thompson',   initials:'ST', role:'nurse',    status:'online',    serviceIds:NU_EXT },
  { id:'p-36', name:'Nurse Aditi Mehta',       initials:'AM', role:'nurse',    status:'online',    serviceIds:NU },
  { id:'p-37', name:'Nurse Jake Harrison',     initials:'JH', role:'nurse',    status:'scheduled', serviceIds:NU_EXT },
  { id:'p-38', name:'Nurse Maya Petrov',       initials:'MP', role:'nurse',    status:'online',    serviceIds:NU },
  { id:'p-39', name:'Nurse Sam Fitzpatrick',   initials:'SF', role:'nurse',    status:'online',    serviceIds:NU_EXT },
  { id:'p-40', name:'Nurse Isabel Santos',     initials:'IS', role:'nurse',    status:'scheduled', serviceIds:NU },
  { id:'p-41', name:'Nurse Ben Tran',          initials:'BT', role:'nurse',    status:'online',    serviceIds:NU_EXT },
  { id:'p-42', name:'Nurse Alice Murphy',      initials:'AM', role:'nurse',    status:'offline',   serviceIds:NU },
  { id:'p-43', name:'Nurse Chioma Eze',        initials:'CE', role:'nurse',    status:'online',    serviceIds:NU_EXT },
  { id:'p-44', name:'Nurse Ravi Kumar',        initials:'RK', role:'nurse',    status:'scheduled', serviceIds:NU },

  // --- Additional GPs ---
  { id:'p-45', name:'Dr James Okonkwo',    initials:'JO', role:'gp',       status:'online',    serviceIds:GP },
  { id:'p-46', name:'Dr Amelia Price',     initials:'AP', role:'gp',       status:'online',    serviceIds:GP },
  { id:'p-47', name:'Dr Raj Kapoor',       initials:'RK', role:'gp',       status:'online',    serviceIds:GP },
  { id:'p-48', name:'Dr Fiona Campbell',   initials:'FC', role:'gp',       status:'scheduled', serviceIds:GP },
  { id:'p-49', name:'Dr Thomas Weber',     initials:'TW', role:'gp',       status:'online',    serviceIds:GP },
  { id:'p-50', name:'Dr Nadia Al-Farsi',   initials:'NA', role:'gp',       status:'online',    serviceIds:GP },
  { id:'p-51', name:'Dr Chris Henderson',  initials:'CH', role:'gp',       status:'offline',   serviceIds:GP },
  { id:'p-52', name:'Dr Mei Lin',          initials:'ML', role:'gp',       status:'online',    serviceIds:GP },
  { id:'p-53', name:'Dr Paul Obinna',      initials:'PO', role:'gp',       status:'scheduled', serviceIds:GP },
  { id:'p-54', name:'Dr Sienna Brooks',    initials:'SB', role:'gp',       status:'online',    serviceIds:GP },

  // --- Additional specialists ---
  { id:'p-55', name:'Dr Helena Vasquez',   initials:'HV', role:'specialist', status:'online',    serviceIds:SP },
];
