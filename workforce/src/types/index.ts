export type PrescriberRole = 'pharmacist' | 'nurse' | 'gp' | 'specialist';
export type PrescriberStatus = 'online' | 'allocated' | 'scheduled' | 'offline' | 'on-break' | 'in-appointment' | 'non-prescribing';
export type OrderStatus = 'pending' | 'allocated' | 'in-progress' | 'complete' | 'escalated';
export type Urgency = 'routine' | 'urgent' | 'critical';

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
  status: PrescriberStatus;
  avatar?: string;
  allocatedCategoryId?: string;
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
