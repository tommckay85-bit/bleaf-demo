export type PrescriberRole = 'pharmacist' | 'nurse' | 'gp' | 'specialist';
export type PrescriberStatus = 'online' | 'allocated' | 'scheduled' | 'offline' | 'on-break' | 'in-appointment' | 'non-prescribing' | 'paused';
export type OrderStatus = 'pending' | 'allocated' | 'in-progress' | 'complete' | 'escalated';
export type Urgency = 'routine' | 'urgent' | 'critical';
export type ExceptionalTaskReason = 'complexity' | 'incident' | 'safeguarding' | 'patient-call' | 'other';

export interface ServiceCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  serviceIds: string[];
}

export interface Service {
  id: string;
  name: string;
  categoryId: string;
  slaHours: number;
  requiredRoles: PrescriberRole[];
}

export interface Prescriber {
  id: string;
  name: string;
  initials: string;
  role: PrescriberRole;
  serviceIds: string[];
  specialistServiceIds?: string[];
  status: PrescriberStatus;
  avatar?: string;
  allocatedCategoryId?: string;
  allocationStyle?: 'sessional' | 'rotation';
  rotationIntervalMins?: 30 | 60 | 90 | 120;
  pauseReason?: ExceptionalTaskReason;
  pausedAt?: string;
  pauseNote?: string;
  email?: string;
  phone?: string;
  notificationPrefs?: { email: boolean; sms: boolean };
  workingPattern?: WorkingPattern;
}

export interface PowerHourConfig {
  serviceIds: string[];
  startedAt: string; // ISO timestamp
}

export interface Order {
  id: string;
  serviceId: string;
  patientRef: string;
  urgency: Urgency;
  ageHours: number;
  value: number;
  prescriberId?: string;
  status: OrderStatus;
  createdAt: string;
  priorityScore?: number;
}

export interface AllocationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  weight: number;
  field: 'urgency' | 'ageHours' | 'value' | 'slaHours' | 'role';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number | string;
  action: 'boost' | 'deprioritise' | 'escalate';
  actionValue: number;
}

export interface SLAConfig {
  categoryId: string;
  targetHours: number;
  warningThresholdPct: number;
  criticalThresholdPct: number;
}

export interface DayAllocation {
  categoryId: string;
  prescriberIds: string[];
}

export type NonPrescribingReason = 'admin' | 'training' | 'meeting' | 'lunch' | 'other';

export interface NonPrescribingSlot {
  prescriberId: string;
  reason: NonPrescribingReason;
  note?: string;
}

export interface ClinicType {
  id: string;
  name: string;
  color: string;
  defaultDurationMins: number;
  requiredRoles: PrescriberRole[];
}

export interface Appointment {
  id: string;
  patientRef: string;
  clinicTypeId: string;
  prescriberId: string;
  startTime: string; // "HH:MM" 24h
  durationMins: number;
  notes?: string;
  status: 'scheduled' | 'in-progress' | 'complete' | 'cancelled';
}

export interface BreakGroup {
  id: string;
  name: string;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  prescriberIds: string[];
  enabled: boolean;
  color: string;
}

export interface PatientMessage {
  id: string;
  serviceId?: string;
  categoryId?: string;
  patientRef: string;
  urgency: Urgency;
  ageHours: number;
  status: 'pending' | 'allocated' | 'complete';
  isGeneral: boolean;
  prescriberId?: string;
  priorityScore?: number;
}

export interface ServiceCapacityConfig {
  categoryId: string;
  orderAHTMins: number;
  messageAHTMins: number;
}

export interface PrescriberActivityEvent {
  id: string;
  prescriberId: string;
  type: 'order' | 'message';
  timestamp: string; // ISO 8601
}

export interface PerformanceMonitorConfig {
  slowRateThresholdPct: number; // % below team average to trigger flag (default 20)
  watchHours: number;            // hours below threshold → Watch flag (default 1)
  actionHours: number;           // hours below threshold → Take Action flag (default 2)
  idleMinutes: number;           // minutes with no activity → Idle flag (default 20)
}

export type WorkingPatternType = 'standard-weekly' | 'two-week-rotation' | 'alternate-weekends' | 'monthly-weekend';

export interface WorkingPattern {
  type: WorkingPatternType;
  weekDays?: number[];    // 0=Sun…6=Sat, for standard-weekly / alternate-weekends weekdays
  week1Days?: number[];   // for two-week-rotation
  week2Days?: number[];   // for two-week-rotation
}

export interface ShiftType {
  id: string;
  name: string;
  startTime: string; // "HH:MM"
  endTime: string;
  color: string;
  textColor: string;
  hoursValue: number;
  defaultRequired: number; // target headcount
  defaultMin: number;
  defaultMax: number;
  activeWeekdays: boolean; // show on Mon-Fri
  activeWeekends: boolean; // show on Sat-Sun
}

export type LeaveType = 'annual-leave' | 'training' | 'non-pims' | 'sick' | 'other';

export interface LeaveRequest {
  id: string;
  prescriberId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  type: LeaveType;
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
  requestedAt: string; // ISO
}

export interface ShiftSwapRequest {
  id: string;
  requesterId: string;
  targetPrescriberId: string;
  requesterDate: string;
  requesterShiftTypeId: string;
  targetDate: string;
  targetShiftTypeId: string;
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
  requestedAt: string;
}

export interface RotaEntry {
  id: string;
  prescriberId: string;
  date: string; // YYYY-MM-DD
  shiftTypeId: string;
  status: 'scheduled' | 'confirmed' | 'holiday' | 'training' | 'non-pims' | 'sick' | 'swapped';
  note?: string;
}

export interface RotaTrainingSession {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  mandatory: boolean;
  capacity: number;
  attendeeIds: string[];
  note?: string;
}

export interface BankHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: 'statutory' | 'observance';
}

export interface HolidayWorkedRecord {
  prescriberId: string;
  holidayId: string;
  year: number;
  worked: boolean;
}

export type HolidayShiftPreference = 'happy-to-work' | 'prefer-off' | 'flexible';

export interface ShiftPreference {
  prescriberId: string;
  holidayId: string;
  preference: HolidayShiftPreference;
}

export interface RotaPublishState {
  yearMonth: string; // "YYYY-MM"
  published: boolean;
  publishedAt?: string;
}
