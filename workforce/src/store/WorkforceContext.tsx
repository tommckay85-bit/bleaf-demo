import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type {
  Prescriber, Order, AllocationRule, SLAConfig, DayAllocation,
  NonPrescribingSlot, Appointment, ClinicType, BreakGroup, PatientMessage, ServiceCapacityConfig,
  PrescriberActivityEvent, PerformanceMonitorConfig,
} from '../types';
import { INITIAL_PRESCRIBERS } from '../data/prescribers';
import { INITIAL_ORDERS } from '../data/orders';
import { INITIAL_RULES, INITIAL_SLAS } from '../data/rules';
import { SERVICES, SERVICE_CATEGORIES } from '../data/services';
import { INITIAL_APPOINTMENTS } from '../data/appointments';
import { INITIAL_CLINIC_TYPES } from '../data/clinicTypes';
import { INITIAL_BREAK_GROUPS } from '../data/breakGroups';
import { INITIAL_MESSAGES } from '../data/messages';
import { INITIAL_CAPACITY_CONFIGS } from '../data/capacityConfigs';

interface State {
  prescribers: Prescriber[];
  orders: Order[];
  allocations: DayAllocation[];
  rules: AllocationRule[];
  slas: SLAConfig[];
  nonPrescribingSlots: NonPrescribingSlot[];
  appointments: Appointment[];
  clinicTypes: ClinicType[];
  breakGroups: BreakGroup[];
  messages: PatientMessage[];
  capacityConfigs: ServiceCapacityConfig[];
  prescriberActivity: PrescriberActivityEvent[];
  performanceConfig: PerformanceMonitorConfig;
}

type Action =
  | { type: 'ALLOCATE_PRESCRIBER'; categoryId: string; prescriberId: string }
  | { type: 'DEALLOCATE_PRESCRIBER'; prescriberId: string }
  | { type: 'MOVE_PRESCRIBER'; prescriberId: string; fromCategoryId: string; toCategoryId: string }
  | { type: 'AUTO_ALLOCATE' }
  | { type: 'UPDATE_PRESCRIBER'; prescriber: Prescriber }
  | { type: 'UPDATE_RULE'; rule: AllocationRule }
  | { type: 'UPDATE_SLA'; sla: SLAConfig }
  | { type: 'ASSIGN_ORDER'; orderId: string; prescriberId: string }
  | { type: 'UPDATE_ORDER_STATUS'; orderId: string; status: Order['status'] }
  | { type: 'SET_PRESCRIBER_STATUS'; prescriberId: string; status: Prescriber['status'] }
  | { type: 'ADD_ORDERS'; orders: Order[] }
  | { type: 'CLEAR_GENERATED_ORDERS' }
  | { type: 'ADD_NON_PRESCRIBING'; slot: NonPrescribingSlot }
  | { type: 'REMOVE_NON_PRESCRIBING'; prescriberId: string }
  | { type: 'ADD_APPOINTMENT'; appointment: Appointment }
  | { type: 'UPDATE_APPOINTMENT'; appointment: Appointment }
  | { type: 'DELETE_APPOINTMENT'; appointmentId: string }
  | { type: 'UPDATE_CLINIC_TYPE'; clinicType: ClinicType }
  | { type: 'ADD_CLINIC_TYPE'; clinicType: ClinicType }
  | { type: 'UPDATE_BREAK_GROUP'; breakGroup: BreakGroup }
  | { type: 'ADD_BREAK_GROUP'; breakGroup: BreakGroup }
  | { type: 'APPLY_BREAKS' }
  | { type: 'UPDATE_CAPACITY_CONFIG'; config: ServiceCapacityConfig }
  | { type: 'ADD_MESSAGES'; messages: PatientMessage[] }
  | { type: 'CLEAR_GENERATED_MESSAGES' }
  | { type: 'ADD_ACTIVITY_EVENTS'; events: PrescriberActivityEvent[] }
  | { type: 'LOG_ACTIVITY'; prescriberId: string; activityType: 'order' | 'message' }
  | { type: 'CLEAR_ACTIVITY_EVENTS' }
  | { type: 'UPDATE_PERFORMANCE_CONFIG'; config: PerformanceMonitorConfig };

function computePriorityScore(order: Order, rules: AllocationRule[], slas: SLAConfig[]): number {
  const service = SERVICES.find(s => s.id === order.serviceId);
  const sla = slas.find(s => service && s.categoryId === service.categoryId);
  let score = 0;

  const urgencyBase = order.urgency === 'critical' ? 80 : order.urgency === 'urgent' ? 40 : 0;
  score += urgencyBase;

  if (sla) {
    const pctElapsed = (order.ageHours / sla.targetHours) * 100;
    if (pctElapsed >= sla.criticalThresholdPct) score += 60;
    else if (pctElapsed >= sla.warningThresholdPct) score += 30;
  }

  for (const rule of rules) {
    if (!rule.enabled) continue;
    let match = false;
    const numVal = Number(rule.value);
    if (rule.field === 'urgency') {
      match = rule.operator === 'eq' && order.urgency === rule.value;
    } else if (rule.field === 'ageHours') {
      match = rule.operator === 'gt' ? order.ageHours > numVal
        : rule.operator === 'lt' ? order.ageHours < numVal
        : rule.operator === 'gte' ? order.ageHours >= numVal
        : rule.operator === 'lte' ? order.ageHours <= numVal
        : order.ageHours === numVal;
    } else if (rule.field === 'value') {
      match = rule.operator === 'gt' ? order.value > numVal
        : rule.operator === 'lt' ? order.value < numVal
        : rule.operator === 'gte' ? order.value >= numVal
        : rule.operator === 'lte' ? order.value <= numVal
        : order.value === numVal;
    }
    if (match) {
      if (rule.action === 'boost') score += rule.actionValue;
      else if (rule.action === 'deprioritise') score -= rule.actionValue;
      else if (rule.action === 'escalate') score += 200;
    }
  }

  return Math.max(0, score);
}

function autoAllocate(state: State): State {
  const onlinePrescribers = state.prescribers.filter(p => p.status === 'online' || p.status === 'scheduled');
  const newAllocations: DayAllocation[] = SERVICE_CATEGORIES.map(cat => ({ categoryId: cat.id, prescriberIds: [] }));
  const newPrescribers: Prescriber[] = state.prescribers.map(p => ({ ...p, allocatedCategoryId: undefined as string | undefined }));

  // Compute workload per category and how many prescribers are needed
  const categoryWorkload = SERVICE_CATEGORIES.map(cat => {
    const catServiceIds = cat.serviceIds;
    const pendingCount = state.orders.filter(o => catServiceIds.includes(o.serviceId) && (o.status === 'pending' || o.status === 'escalated')).length;
    const msgCount = state.messages.filter(m => m.categoryId === cat.id && m.status === 'pending').length;
    const cfg = state.capacityConfigs.find(c => c.categoryId === cat.id);
    const reqMins = cfg ? pendingCount * cfg.orderAHTMins + msgCount * cfg.messageAHTMins : pendingCount * 10;
    // Target: 1 prescriber per 480 mins of work, minimum 1 if any pending
    const prescribersNeeded = pendingCount + msgCount > 0 ? Math.max(1, Math.ceil(reqMins / 480)) : 0;
    return { categoryId: cat.id, count: pendingCount + msgCount, prescribersNeeded };
  }).filter(c => c.count > 0).sort((a, b) => b.count - a.count);

  const assigned = new Set<string>();

  // First pass: assign at least one prescriber to each category with work
  for (const catEntry of categoryWorkload) {
    const cat = SERVICE_CATEGORIES.find(c => c.id === catEntry.categoryId)!;
    const eligible = onlinePrescribers.filter(p =>
      !assigned.has(p.id) &&
      cat.serviceIds.some(sId => p.serviceIds.includes(sId))
    );
    if (eligible.length === 0) continue;
    const prescriber = eligible[0];
    assigned.add(prescriber.id);
    const alloc = newAllocations.find(a => a.categoryId === catEntry.categoryId)!;
    alloc.prescriberIds.push(prescriber.id);
    const idx = newPrescribers.findIndex(p => p.id === prescriber.id);
    newPrescribers[idx] = { ...newPrescribers[idx], status: 'allocated', allocatedCategoryId: catEntry.categoryId };
  }

  // Second pass: add extra prescribers where needed (proportional to workload)
  const remaining = onlinePrescribers.filter(p => !assigned.has(p.id));
  for (const catEntry of categoryWorkload) {
    if (assigned.size >= onlinePrescribers.length) break;
    const alreadyAssigned = newAllocations.find(a => a.categoryId === catEntry.categoryId)!.prescriberIds.length;
    const extra = catEntry.prescribersNeeded - alreadyAssigned;
    if (extra <= 0) continue;
    const cat = SERVICE_CATEGORIES.find(c => c.id === catEntry.categoryId)!;
    const eligible = remaining.filter(p =>
      !assigned.has(p.id) &&
      cat.serviceIds.some(sId => p.serviceIds.includes(sId))
    );
    for (let i = 0; i < Math.min(extra, eligible.length); i++) {
      const prescriber = eligible[i];
      assigned.add(prescriber.id);
      const alloc = newAllocations.find(a => a.categoryId === catEntry.categoryId)!;
      alloc.prescriberIds.push(prescriber.id);
      const idx = newPrescribers.findIndex(p => p.id === prescriber.id);
      newPrescribers[idx] = { ...newPrescribers[idx], status: 'allocated', allocatedCategoryId: catEntry.categoryId };
    }
  }

  const updatedOrders = state.orders.map(o => ({
    ...o,
    priorityScore: computePriorityScore(o, state.rules, state.slas),
  }));

  return { ...state, allocations: newAllocations, prescribers: newPrescribers, orders: updatedOrders };
}

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ALLOCATE_PRESCRIBER': {
      const existing = state.allocations.find(a => a.categoryId === action.categoryId);
      const newAllocations = existing
        ? state.allocations.map(a =>
            a.categoryId === action.categoryId
              ? { ...a, prescriberIds: [...new Set([...a.prescriberIds, action.prescriberId])] }
              : a
          )
        : [...state.allocations, { categoryId: action.categoryId, prescriberIds: [action.prescriberId] }];
      const newPrescribers = state.prescribers.map(p =>
        p.id === action.prescriberId
          ? { ...p, status: 'allocated' as const, allocatedCategoryId: action.categoryId }
          : p
      );
      return { ...state, allocations: newAllocations, prescribers: newPrescribers };
    }
    case 'DEALLOCATE_PRESCRIBER': {
      const newAllocations = state.allocations.map(a => ({
        ...a,
        prescriberIds: a.prescriberIds.filter(id => id !== action.prescriberId),
      }));
      const newPrescribers = state.prescribers.map(p =>
        p.id === action.prescriberId
          ? { ...p, status: 'online' as const, allocatedCategoryId: undefined }
          : p
      );
      return { ...state, allocations: newAllocations, prescribers: newPrescribers };
    }
    case 'MOVE_PRESCRIBER': {
      const newAllocations = state.allocations.map(a => {
        if (a.categoryId === action.fromCategoryId) return { ...a, prescriberIds: a.prescriberIds.filter(id => id !== action.prescriberId) };
        if (a.categoryId === action.toCategoryId) return { ...a, prescriberIds: [...new Set([...a.prescriberIds, action.prescriberId])] };
        return a;
      });
      const newPrescribers = state.prescribers.map(p =>
        p.id === action.prescriberId
          ? { ...p, allocatedCategoryId: action.toCategoryId }
          : p
      );
      return { ...state, allocations: newAllocations, prescribers: newPrescribers };
    }
    case 'AUTO_ALLOCATE':
      return autoAllocate(state);
    case 'UPDATE_PRESCRIBER': {
      const exists = state.prescribers.some(p => p.id === action.prescriber.id);
      const newPrescribers = exists
        ? state.prescribers.map(p => p.id === action.prescriber.id ? action.prescriber : p)
        : [...state.prescribers, action.prescriber];
      return { ...state, prescribers: newPrescribers };
    }
    case 'UPDATE_RULE': {
      const newRules = state.rules.map(r => r.id === action.rule.id ? action.rule : r);
      return { ...state, rules: newRules };
    }
    case 'UPDATE_SLA': {
      const newSlas = state.slas.map(s => s.categoryId === action.sla.categoryId ? action.sla : s);
      return { ...state, slas: newSlas };
    }
    case 'ASSIGN_ORDER': {
      const newOrders = state.orders.map(o =>
        o.id === action.orderId ? { ...o, prescriberId: action.prescriberId, status: 'allocated' as const } : o
      );
      return { ...state, orders: newOrders };
    }
    case 'UPDATE_ORDER_STATUS': {
      const newOrders = state.orders.map(o =>
        o.id === action.orderId ? { ...o, status: action.status } : o
      );
      return { ...state, orders: newOrders };
    }
    case 'SET_PRESCRIBER_STATUS': {
      const newPrescribers = state.prescribers.map(p =>
        p.id === action.prescriberId ? { ...p, status: action.status } : p
      );
      return { ...state, prescribers: newPrescribers };
    }
    case 'ADD_ORDERS': {
      const withScores = action.orders.map(o => ({
        ...o,
        priorityScore: computePriorityScore(o, state.rules, state.slas),
      }));
      return { ...state, orders: [...state.orders, ...withScores] };
    }
    case 'CLEAR_GENERATED_ORDERS': {
      const cleared = state.orders.filter(o => !o.id.startsWith('gen-'));
      return { ...state, orders: cleared };
    }
    case 'ADD_NON_PRESCRIBING': {
      // Remove from allocations, set status to non-prescribing
      const newAllocations = state.allocations.map(a => ({
        ...a,
        prescriberIds: a.prescriberIds.filter(id => id !== action.slot.prescriberId),
      }));
      const newPrescribers = state.prescribers.map(p =>
        p.id === action.slot.prescriberId
          ? { ...p, status: 'non-prescribing' as const, allocatedCategoryId: undefined }
          : p
      );
      const newSlots = [
        ...state.nonPrescribingSlots.filter(s => s.prescriberId !== action.slot.prescriberId),
        action.slot,
      ];
      return { ...state, allocations: newAllocations, prescribers: newPrescribers, nonPrescribingSlots: newSlots };
    }
    case 'REMOVE_NON_PRESCRIBING': {
      const newSlots = state.nonPrescribingSlots.filter(s => s.prescriberId !== action.prescriberId);
      const newPrescribers = state.prescribers.map(p =>
        p.id === action.prescriberId ? { ...p, status: 'online' as const } : p
      );
      return { ...state, nonPrescribingSlots: newSlots, prescribers: newPrescribers };
    }
    case 'ADD_APPOINTMENT': {
      return { ...state, appointments: [...state.appointments, action.appointment] };
    }
    case 'UPDATE_APPOINTMENT': {
      const newAppts = state.appointments.map(a => a.id === action.appointment.id ? action.appointment : a);
      return { ...state, appointments: newAppts };
    }
    case 'DELETE_APPOINTMENT': {
      return { ...state, appointments: state.appointments.filter(a => a.id !== action.appointmentId) };
    }
    case 'UPDATE_CLINIC_TYPE': {
      const newTypes = state.clinicTypes.map(ct => ct.id === action.clinicType.id ? action.clinicType : ct);
      return { ...state, clinicTypes: newTypes };
    }
    case 'ADD_CLINIC_TYPE': {
      return { ...state, clinicTypes: [...state.clinicTypes, action.clinicType] };
    }
    case 'UPDATE_BREAK_GROUP': {
      const newGroups = state.breakGroups.map(bg => bg.id === action.breakGroup.id ? action.breakGroup : bg);
      return { ...state, breakGroups: newGroups };
    }
    case 'ADD_BREAK_GROUP': {
      return { ...state, breakGroups: [...state.breakGroups, action.breakGroup] };
    }
    case 'APPLY_BREAKS': {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const activeBreaks = state.breakGroups.filter(bg => {
        if (!bg.enabled) return false;
        const start = timeToMins(bg.startTime);
        const end = timeToMins(bg.endTime);
        return nowMins >= start && nowMins < end;
      });
      if (activeBreaks.length === 0) return state;

      const prescriberIdsToBreak = new Set<string>();
      for (const bg of activeBreaks) {
        for (const pid of bg.prescriberIds) {
          prescriberIdsToBreak.add(pid);
        }
      }

      const newAllocations = state.allocations.map(a => ({
        ...a,
        prescriberIds: a.prescriberIds.filter(id => !prescriberIdsToBreak.has(id)),
      }));
      const newPrescribers = state.prescribers.map(p =>
        prescriberIdsToBreak.has(p.id) && p.status === 'allocated'
          ? { ...p, status: 'on-break' as const, allocatedCategoryId: undefined }
          : p
      );
      return { ...state, allocations: newAllocations, prescribers: newPrescribers };
    }
    case 'UPDATE_CAPACITY_CONFIG': {
      const exists = state.capacityConfigs.some(c => c.categoryId === action.config.categoryId);
      const newConfigs = exists
        ? state.capacityConfigs.map(c => c.categoryId === action.config.categoryId ? action.config : c)
        : [...state.capacityConfigs, action.config];
      return { ...state, capacityConfigs: newConfigs };
    }
    case 'ADD_MESSAGES': {
      return { ...state, messages: [...state.messages, ...action.messages] };
    }
    case 'CLEAR_GENERATED_MESSAGES': {
      const cleared = state.messages.filter(m => !m.id.startsWith('gmsg-'));
      return { ...state, messages: cleared };
    }
    case 'ADD_ACTIVITY_EVENTS':
      return { ...state, prescriberActivity: [...state.prescriberActivity, ...action.events] };
    case 'LOG_ACTIVITY': {
      const event: PrescriberActivityEvent = {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        prescriberId: action.prescriberId,
        type: action.activityType,
        timestamp: new Date().toISOString(),
      };
      return { ...state, prescriberActivity: [...state.prescriberActivity, event] };
    }
    case 'CLEAR_ACTIVITY_EVENTS':
      return { ...state, prescriberActivity: [] };
    case 'UPDATE_PERFORMANCE_CONFIG':
      return { ...state, performanceConfig: action.config };
    default:
      return state;
  }
}

const initialState: State = {
  prescribers: INITIAL_PRESCRIBERS,
  orders: INITIAL_ORDERS.map(o => ({ ...o, priorityScore: 0 })),
  allocations: SERVICE_CATEGORIES.map(c => ({ categoryId: c.id, prescriberIds: [] })),
  rules: INITIAL_RULES,
  slas: INITIAL_SLAS,
  nonPrescribingSlots: [],
  appointments: INITIAL_APPOINTMENTS,
  clinicTypes: INITIAL_CLINIC_TYPES,
  breakGroups: INITIAL_BREAK_GROUPS,
  messages: INITIAL_MESSAGES,
  capacityConfigs: INITIAL_CAPACITY_CONFIGS,
  prescriberActivity: [],
  performanceConfig: {
    slowRateThresholdPct: 20,
    watchHours: 1,
    actionHours: 2,
    idleMinutes: 20,
  },
};

interface WorkforceContextValue extends State {
  dispatch: React.Dispatch<Action>;
}

const WorkforceContext = createContext<WorkforceContextValue | null>(null);

export function WorkforceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <WorkforceContext.Provider value={{ ...state, dispatch }}>
      {children}
    </WorkforceContext.Provider>
  );
}

export function useWorkforce() {
  const ctx = useContext(WorkforceContext);
  if (!ctx) throw new Error('useWorkforce must be used inside WorkforceProvider');
  return ctx;
}
