import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type {
  Prescriber, Order, AllocationRule, SLAConfig, DayAllocation,
  NonPrescribingSlot, Appointment, ClinicType, BreakGroup, PatientMessage, ServiceCapacityConfig,
  PrescriberActivityEvent, PerformanceMonitorConfig, PowerHourConfig, ExceptionalTaskReason,
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

const DAYS_MINS = 480;

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
  powerHour: PowerHourConfig | null;
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
  | { type: 'UPDATE_PERFORMANCE_CONFIG'; config: PerformanceMonitorConfig }
  | { type: 'REALLOCATE' }
  | { type: 'SET_POWER_HOUR'; config: PowerHourConfig }
  | { type: 'CLEAR_POWER_HOUR' }
  | { type: 'PAUSE_PRESCRIBER'; prescriberId: string; reason: ExceptionalTaskReason; note?: string; pausedAt: string }
  | { type: 'RESUME_PRESCRIBER'; prescriberId: string };

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
  const available = state.prescribers.filter(p => p.status === 'online' || p.status === 'scheduled');
  const newAllocations: DayAllocation[] = SERVICE_CATEGORIES.map(cat => ({ categoryId: cat.id, prescriberIds: [] as string[] }));
  const newPrescribers: Prescriber[] = state.prescribers.map(p => ({ ...p, allocatedCategoryId: undefined as string | undefined }));
  const assigned = new Set<string>();

  function assignTo(prescriberId: string, categoryId: string) {
    assigned.add(prescriberId);
    newAllocations.find(a => a.categoryId === categoryId)!.prescriberIds.push(prescriberId);
    const idx = newPrescribers.findIndex(p => p.id === prescriberId);
    newPrescribers[idx] = { ...newPrescribers[idx], status: 'allocated', allocatedCategoryId: categoryId };
  }

  // Compute workload per category
  const workload = SERVICE_CATEGORIES.map(cat => {
    const pending = state.orders.filter(o =>
      cat.serviceIds.includes(o.serviceId) && (o.status === 'pending' || o.status === 'escalated')
    ).length;
    const msgs = state.messages.filter(m => m.categoryId === cat.id && m.status === 'pending').length;
    const cfg = state.capacityConfigs.find(c => c.categoryId === cat.id);
    const reqMins = cfg ? pending * cfg.orderAHTMins + msgs * cfg.messageAHTMins : (pending + msgs) * 10;
    return { categoryId: cat.id, reqMins, total: pending + msgs };
  });

  const totalReqMins = workload.reduce((s, w) => s + w.reqMins, 0);
  const n = available.length;

  if (totalReqMins > 0 && n > 0) {
    // Compute proportional targets — every prescriber should be allocated
    const targets = workload.map(w => ({
      categoryId: w.categoryId,
      // Proportional share, min 1 for categories with work
      target: w.reqMins > 0 ? Math.max(1, Math.round(n * w.reqMins / totalReqMins)) : 0,
    }));

    // Normalise: total targets must equal n exactly
    let total = targets.reduce((s, t) => s + t.target, 0);
    // Trim over-count from least important categories first
    const withWork = targets.filter(t => t.target > 0).sort((a, b) => a.target - b.target);
    while (total > n && withWork.length > 0) {
      const t = withWork.find(t => t.target > 1);
      if (!t) break;
      t.target--;
      total--;
    }
    // Add under-count to busiest category
    if (total < n) {
      const busiest = targets.reduce((best, t) => t.target > best.target ? t : best, targets[0]);
      busiest.target += (n - total);
    }

    // Assign by target, largest-first so busiest categories are filled first
    const sorted = [...targets].sort((a, b) => b.target - a.target);
    for (const { categoryId, target } of sorted) {
      if (target <= 0) continue;
      const cat = SERVICE_CATEGORIES.find(c => c.id === categoryId)!;
      const eligible = available.filter(p => !assigned.has(p.id) && cat.serviceIds.some(sId => p.serviceIds.includes(sId)));
      for (let i = 0; i < Math.min(target, eligible.length); i++) {
        assignTo(eligible[i].id, categoryId);
      }
    }
  }

  // Assign any remaining unallocated prescribers (specialty mismatch or no-work scenario)
  // Use the category with the most workload they're eligible for; fallback to any eligible category
  const sortedByWorkload = [...workload].sort((a, b) => b.reqMins - a.reqMins);
  for (const p of available.filter(p => !assigned.has(p.id))) {
    const best = sortedByWorkload.find(w => {
      const cat = SERVICE_CATEGORIES.find(c => c.id === w.categoryId)!;
      return cat.serviceIds.some(sId => p.serviceIds.includes(sId));
    });
    if (best) assignTo(p.id, best.categoryId);
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

    case 'REALLOCATE': {
      // Sessional prescribers stay in current categories; rotation prescribers are moved to different categories
      const sessionalAllocated = state.prescribers.filter(
        p => (p.allocationStyle !== 'rotation') && p.status === 'allocated'
      );
      const rotationAllocated = state.prescribers.filter(
        p => p.allocationStyle === 'rotation' && p.status === 'allocated'
      );
      const rotationOnline = state.prescribers.filter(
        p => p.allocationStyle === 'rotation' && p.status === 'online'
      );

      // Seed new allocations with sessional prescribers' current positions
      const newAllocations: DayAllocation[] = SERVICE_CATEGORIES.map(cat => ({
        categoryId: cat.id,
        prescriberIds: sessionalAllocated.filter(p => p.allocatedCategoryId === cat.id).map(p => p.id),
      }));

      // Free rotation prescribers from their current categories
      const newPrescribers: Prescriber[] = state.prescribers.map(p => {
        if (rotationAllocated.some(r => r.id === p.id)) {
          return { ...p, status: 'online' as const, allocatedCategoryId: undefined };
        }
        return p;
      });

      const workload = SERVICE_CATEGORIES.map(cat => {
        const pending = state.orders.filter(o =>
          cat.serviceIds.includes(o.serviceId) && (o.status === 'pending' || o.status === 'escalated')
        ).length;
        const msgs = state.messages.filter(m => m.categoryId === cat.id && m.status === 'pending').length;
        const cfg = state.capacityConfigs.find(c => c.categoryId === cat.id);
        const reqMins = cfg ? pending * cfg.orderAHTMins + msgs * cfg.messageAHTMins : (pending + msgs) * 10;
        const sessionalMins = sessionalAllocated.filter(p => p.allocatedCategoryId === cat.id).length * DAYS_MINS;
        return { categoryId: cat.id, reqMins: Math.max(0, reqMins - sessionalMins) };
      });

      const toAllocate = [...rotationAllocated, ...rotationOnline];
      for (const p of toAllocate) {
        const prevCat = p.allocatedCategoryId;
        const eligible = workload
          .filter(w => {
            const cat = SERVICE_CATEGORIES.find(c => c.id === w.categoryId)!;
            return cat.serviceIds.some(sId => p.serviceIds.includes(sId));
          })
          .sort((a, b) => {
            // Prefer a different category to the one they were in
            const aPrev = a.categoryId === prevCat ? 1 : 0;
            const bPrev = b.categoryId === prevCat ? 1 : 0;
            if (aPrev !== bPrev) return aPrev - bPrev;
            return b.reqMins - a.reqMins;
          });
        if (eligible.length > 0) {
          const target = eligible[0].categoryId;
          newAllocations.find(a => a.categoryId === target)!.prescriberIds.push(p.id);
          const idx = newPrescribers.findIndex(np => np.id === p.id);
          newPrescribers[idx] = { ...newPrescribers[idx], status: 'allocated' as const, allocatedCategoryId: target };
        }
      }

      return { ...state, allocations: newAllocations, prescribers: newPrescribers };
    }

    case 'SET_POWER_HOUR': {
      const targetCategoryIds = [
        ...new Set(
          action.config.serviceIds
            .map(sId => SERVICES.find(s => s.id === sId)?.categoryId)
            .filter((id): id is string => !!id)
        ),
      ];

      const newAllocations: DayAllocation[] = state.allocations.map(a => ({ ...a, prescriberIds: [...a.prescriberIds] }));
      const newPrescribers: Prescriber[] = [...state.prescribers];

      const eligible = state.prescribers.filter(p =>
        (p.status === 'allocated' || p.status === 'online') &&
        targetCategoryIds.some(catId => {
          const cat = SERVICE_CATEGORIES.find(c => c.id === catId)!;
          return cat.serviceIds.some(sId => p.serviceIds.includes(sId));
        })
      );

      for (const p of eligible) {
        const bestCat = targetCategoryIds
          .filter(catId => {
            const cat = SERVICE_CATEGORIES.find(c => c.id === catId)!;
            return cat.serviceIds.some(sId => p.serviceIds.includes(sId));
          })
          .sort((a, b) => {
            const wA = newAllocations.find(al => al.categoryId === a)?.prescriberIds.length ?? 0;
            const wB = newAllocations.find(al => al.categoryId === b)?.prescriberIds.length ?? 0;
            return wA - wB; // least loaded first for even spread
          })[0];
        if (!bestCat) continue;

        if (p.allocatedCategoryId && p.allocatedCategoryId !== bestCat) {
          const cur = newAllocations.find(a => a.categoryId === p.allocatedCategoryId);
          if (cur) cur.prescriberIds = cur.prescriberIds.filter(id => id !== p.id);
        }
        const target = newAllocations.find(a => a.categoryId === bestCat)!;
        if (!target.prescriberIds.includes(p.id)) target.prescriberIds.push(p.id);

        const idx = newPrescribers.findIndex(np => np.id === p.id);
        newPrescribers[idx] = { ...newPrescribers[idx], status: 'allocated' as const, allocatedCategoryId: bestCat };
      }

      return { ...state, allocations: newAllocations, prescribers: newPrescribers, powerHour: action.config };
    }

    case 'CLEAR_POWER_HOUR':
      return { ...state, powerHour: null };

    case 'PAUSE_PRESCRIBER': {
      const newPrescribers = state.prescribers.map(p =>
        p.id === action.prescriberId
          ? { ...p, status: 'paused' as const, pauseReason: action.reason, pausedAt: action.pausedAt, pauseNote: action.note }
          : p
      );
      return { ...state, prescribers: newPrescribers };
    }

    case 'RESUME_PRESCRIBER': {
      const target = state.prescribers.find(p => p.id === action.prescriberId);
      const resumeStatus = target?.allocatedCategoryId ? 'allocated' as const : 'online' as const;
      const newPrescribers = state.prescribers.map(p =>
        p.id === action.prescriberId
          ? { ...p, status: resumeStatus, pauseReason: undefined, pausedAt: undefined, pauseNote: undefined }
          : p
      );
      return { ...state, prescribers: newPrescribers };
    }

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
  powerHour: null,
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
