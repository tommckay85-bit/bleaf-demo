import type { ServiceCategory, Service } from '../types';

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'womens-health',
    name: "Women's Health",
    color: '#C2185B',
    icon: '♀',
    serviceIds: ['wh-01','wh-02','wh-03','wh-04','wh-05','wh-06','wh-07','wh-08','wh-09','wh-10'],
  },
  {
    id: 'mens-health',
    name: "Men's Health",
    color: '#1565C0',
    icon: '♂',
    serviceIds: ['mh-01','mh-02','mh-03','mh-04','mh-05','mh-06','mh-07','mh-08'],
  },
  {
    id: 'weight-management',
    name: 'Weight Management',
    color: '#2E7D32',
    icon: '⚖',
    serviceIds: ['wm-01','wm-02','wm-03','wm-04','wm-05','wm-06'],
  },
  {
    id: 'sexual-health',
    name: 'Sexual Health',
    color: '#6A1B9A',
    icon: '❤',
    serviceIds: ['sh-01','sh-02','sh-03','sh-04','sh-05','sh-06','sh-07','sh-08'],
  },
  {
    id: 'dermatology',
    name: 'Dermatology',
    color: '#E65100',
    icon: '◈',
    serviceIds: ['derm-01','derm-02','derm-03','derm-04','derm-05','derm-06'],
  },
  {
    id: 'mental-health',
    name: 'Mental Health',
    color: '#00838F',
    icon: '🧠',
    serviceIds: ['mntl-01','mntl-02','mntl-03','mntl-04','mntl-05','mntl-06'],
  },
  {
    id: 'general-health',
    name: 'General Health',
    color: '#558B2F',
    icon: '✚',
    serviceIds: ['gen-01','gen-02','gen-03','gen-04'],
  },
];

export const SERVICES: Service[] = [
  // Women's Health
  { id: 'wh-01', name: 'Contraceptive Pill', categoryId: 'womens-health', slaHours: 24, requiredRoles: ['pharmacist','nurse','gp'] },
  { id: 'wh-02', name: 'Emergency Contraception', categoryId: 'womens-health', slaHours: 4, requiredRoles: ['pharmacist','nurse','gp'] },
  { id: 'wh-03', name: 'Hormone Replacement Therapy', categoryId: 'womens-health', slaHours: 48, requiredRoles: ['nurse','gp','specialist'] },
  { id: 'wh-04', name: 'Menopause Management', categoryId: 'womens-health', slaHours: 48, requiredRoles: ['nurse','gp','specialist'] },
  { id: 'wh-05', name: 'Thrush Treatment', categoryId: 'womens-health', slaHours: 12, requiredRoles: ['pharmacist','nurse'] },
  { id: 'wh-06', name: 'Cystitis Treatment', categoryId: 'womens-health', slaHours: 12, requiredRoles: ['pharmacist','nurse','gp'] },
  { id: 'wh-07', name: 'Vaginal Health', categoryId: 'womens-health', slaHours: 24, requiredRoles: ['pharmacist','nurse','gp'] },
  { id: 'wh-08', name: 'Period Delay', categoryId: 'womens-health', slaHours: 24, requiredRoles: ['pharmacist','nurse','gp'] },
  { id: 'wh-09', name: 'Endometriosis', categoryId: 'womens-health', slaHours: 72, requiredRoles: ['gp','specialist'] },
  { id: 'wh-10', name: 'Fertility Support', categoryId: 'womens-health', slaHours: 72, requiredRoles: ['specialist'] },

  // Men's Health
  { id: 'mh-01', name: 'Hair Loss (Finasteride)', categoryId: 'mens-health', slaHours: 48, requiredRoles: ['pharmacist','nurse','gp'] },
  { id: 'mh-02', name: 'Erectile Dysfunction', categoryId: 'mens-health', slaHours: 24, requiredRoles: ['pharmacist','nurse','gp'] },
  { id: 'mh-03', name: 'Premature Ejaculation', categoryId: 'mens-health', slaHours: 48, requiredRoles: ['pharmacist','nurse','gp'] },
  { id: 'mh-04', name: 'Testosterone Support', categoryId: 'mens-health', slaHours: 48, requiredRoles: ['gp','specialist'] },
  { id: 'mh-05', name: 'Benign Prostatic Hyperplasia', categoryId: 'mens-health', slaHours: 72, requiredRoles: ['gp','specialist'] },
  { id: 'mh-06', name: 'Male Infertility', categoryId: 'mens-health', slaHours: 72, requiredRoles: ['specialist'] },
  { id: 'mh-07', name: 'Androgenic Alopecia', categoryId: 'mens-health', slaHours: 48, requiredRoles: ['pharmacist','nurse','gp'] },
  { id: 'mh-08', name: 'Male Mental Health', categoryId: 'mens-health', slaHours: 48, requiredRoles: ['nurse','gp','specialist'] },

  // Weight Management
  { id: 'wm-01', name: 'Weight Loss Medication (GLP-1)', categoryId: 'weight-management', slaHours: 24, requiredRoles: ['nurse','gp','specialist'] },
  { id: 'wm-02', name: 'Weight Loss Coaching', categoryId: 'weight-management', slaHours: 48, requiredRoles: ['nurse','specialist'] },
  { id: 'wm-03', name: 'Nutrition Consultation', categoryId: 'weight-management', slaHours: 48, requiredRoles: ['nurse','specialist'] },
  { id: 'wm-04', name: 'BMI Management', categoryId: 'weight-management', slaHours: 24, requiredRoles: ['pharmacist','nurse','gp'] },
  { id: 'wm-05', name: 'Metabolic Health', categoryId: 'weight-management', slaHours: 72, requiredRoles: ['gp','specialist'] },
  { id: 'wm-06', name: 'Bariatric Support', categoryId: 'weight-management', slaHours: 72, requiredRoles: ['specialist'] },

  // Sexual Health
  { id: 'sh-01', name: 'STI Testing & Treatment', categoryId: 'sexual-health', slaHours: 24, requiredRoles: ['pharmacist','nurse','gp'] },
  { id: 'sh-02', name: 'PrEP', categoryId: 'sexual-health', slaHours: 48, requiredRoles: ['nurse','gp','specialist'] },
  { id: 'sh-03', name: 'HIV Management', categoryId: 'sexual-health', slaHours: 24, requiredRoles: ['specialist'] },
  { id: 'sh-04', name: 'Chlamydia Treatment', categoryId: 'sexual-health', slaHours: 12, requiredRoles: ['pharmacist','nurse','gp'] },
  { id: 'sh-05', name: 'Gonorrhoea Treatment', categoryId: 'sexual-health', slaHours: 12, requiredRoles: ['pharmacist','nurse','gp'] },
  { id: 'sh-06', name: 'Herpes Management', categoryId: 'sexual-health', slaHours: 24, requiredRoles: ['pharmacist','nurse','gp'] },
  { id: 'sh-07', name: 'HPV Vaccination', categoryId: 'sexual-health', slaHours: 72, requiredRoles: ['nurse','gp'] },
  { id: 'sh-08', name: 'Genital Warts', categoryId: 'sexual-health', slaHours: 48, requiredRoles: ['pharmacist','nurse','gp'] },

  // Dermatology
  { id: 'derm-01', name: 'Acne Treatment', categoryId: 'dermatology', slaHours: 48, requiredRoles: ['pharmacist','nurse','gp'] },
  { id: 'derm-02', name: 'Rosacea Management', categoryId: 'dermatology', slaHours: 48, requiredRoles: ['pharmacist','nurse','gp'] },
  { id: 'derm-03', name: 'Eczema', categoryId: 'dermatology', slaHours: 24, requiredRoles: ['pharmacist','nurse','gp'] },
  { id: 'derm-04', name: 'Psoriasis', categoryId: 'dermatology', slaHours: 48, requiredRoles: ['nurse','gp','specialist'] },
  { id: 'derm-05', name: 'Cold Sores', categoryId: 'dermatology', slaHours: 12, requiredRoles: ['pharmacist','nurse'] },
  { id: 'derm-06', name: 'Skin Infections', categoryId: 'dermatology', slaHours: 24, requiredRoles: ['pharmacist','nurse','gp'] },

  // Mental Health
  { id: 'mntl-01', name: 'Anxiety Management', categoryId: 'mental-health', slaHours: 48, requiredRoles: ['nurse','gp','specialist'] },
  { id: 'mntl-02', name: 'Depression (SSRI)', categoryId: 'mental-health', slaHours: 48, requiredRoles: ['nurse','gp','specialist'] },
  { id: 'mntl-03', name: 'Sleep Disorders', categoryId: 'mental-health', slaHours: 48, requiredRoles: ['nurse','gp','specialist'] },
  { id: 'mntl-04', name: 'ADHD Assessment', categoryId: 'mental-health', slaHours: 72, requiredRoles: ['specialist'] },
  { id: 'mntl-05', name: 'Stress Management', categoryId: 'mental-health', slaHours: 72, requiredRoles: ['nurse','gp'] },
  { id: 'mntl-06', name: 'Cognitive Support', categoryId: 'mental-health', slaHours: 72, requiredRoles: ['specialist'] },

  // General Health
  { id: 'gen-01', name: 'Allergy & Hay Fever', categoryId: 'general-health', slaHours: 24, requiredRoles: ['pharmacist','nurse','gp'] },
  { id: 'gen-02', name: 'Migraine Management', categoryId: 'general-health', slaHours: 24, requiredRoles: ['pharmacist','nurse','gp'] },
  { id: 'gen-03', name: 'Smoking Cessation', categoryId: 'general-health', slaHours: 48, requiredRoles: ['pharmacist','nurse','gp'] },
  { id: 'gen-04', name: 'Travel Health & Vaccination', categoryId: 'general-health', slaHours: 48, requiredRoles: ['nurse','gp'] },
];
