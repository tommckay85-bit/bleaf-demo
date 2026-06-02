import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { Prescriber, Order, AllocationRule, SLAConfig, DayAllocation } from '../types';
import { INITIAL_PRESCRIBERS } from '../data/prescribers';
import { INITIAL_ORDERS } from '../data/orders';
import { INITIAL_RULES, INITIAL_SLAS } from '../data/rules';
import { SERVICES, SERVICE_CATEGORIES } from '../data/services';

interface State {
  prescribers: Prescriber[];
  orders: Order[];
  allocations: DayAllocation[];
  rules: AllocationRule[];
  slas: SLAConfig[];
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
  | { type: 'CLEAR_GENERATED_ORDERS' };

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

  const categoryOrderCounts = SERVICE_CATEGORIES.map(cat => {
    const catServiceIds = cat.serviceIds;
    const pendingCount = state.orders.filter(o => catServiceIds.includes(o.serviceId) && (o.status === 'pending' || o.status === 'escalated')).length;
    return { categoryId: cat.id, count: pendingCount };
  }).filter(c => c.count > 0).sort((a, b) => b.count - a.count);

  const assigned = new Set<string>();

  for (const catEntry of categoryOrderCounts) {
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

  const updatedOrders = state.orders.map(o => {
    const score = computePriorityScore(o, state.rules, state.slas);
    return { ...o, priorityScore: score };
  });

  return { ...state, allocations: newAllocations, prescribers: newPrescribers, orders: updatedOrders };
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
      const newPrescribers = state.prescribers.map(p => p.id === action.prescriber.id ? action.prescriber : p);
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
