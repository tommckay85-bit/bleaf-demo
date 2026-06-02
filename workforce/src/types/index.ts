export type PrescriberRole = 'pharmacist' | 'nurse' | 'gp' | 'specialist';
export type PrescriberStatus = 'online' | 'allocated' | 'scheduled' | 'offline';
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
