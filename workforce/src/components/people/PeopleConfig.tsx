import { useState } from 'react';
import { useWorkforce } from '../../store/WorkforceContext';
import { SERVICE_CATEGORIES, SERVICES } from '../../data/services';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Avatar, ROLE_COLORS } from '../common/Avatar';
import { Modal } from '../common/Modal';
import type { Prescriber, PrescriberRole, PrescriberStatus } from '../../types';

const ROLES: { value: PrescriberRole; label: string }[] = [
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'gp', label: 'GP' },
  { value: 'specialist', label: 'Specialist' },
];

const STATUS_OPTIONS: { value: PrescriberStatus; label: string }[] = [
  { value: 'online', label: 'Online' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'offline', label: 'Offline' },
];

const roleVariant = (role: PrescriberRole) => {
  if (role === 'gp') return 'info';
  if (role === 'pharmacist') return 'success';
  if (role === 'nurse') return 'danger';
  return 'default';
};

const statusVariant = (status: PrescriberStatus) => {
  if (status === 'online' || status === 'allocated') return 'success';
  if (status === 'scheduled') return 'warning';
  return 'muted';
};

function makeInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(-2).map(n => n[0]).join('').toUpperCase();
}

const emptyPrescriber: Omit<Prescriber, 'id'> = {
  name: '', initials: '', role: 'pharmacist', status: 'online', serviceIds: [],
};

export function PeopleConfig() {
  const { prescribers, dispatch } = useWorkforce();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<Omit<Prescriber, 'id'>>(emptyPrescriber);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  function openEdit(p: Prescriber) {
    setEditingId(p.id);
    setForm({ name: p.name, initials: p.initials, role: p.role, status: p.status, serviceIds: [...p.serviceIds] });
    setIsCreating(false);
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyPrescriber });
    setIsCreating(true);
  }

  function closeModal() {
    setEditingId(null);
    setIsCreating(false);
  }

  function saveEdit() {
    if (!form.name.trim()) return;
    const initials = makeInitials(form.name);
    if (editingId) {
      dispatch({ type: 'UPDATE_PRESCRIBER', prescriber: { ...form, initials, id: editingId } });
    } else {
      const id = `p-${Date.now()}`;
      dispatch({ type: 'UPDATE_PRESCRIBER', prescriber: { ...form, initials, id } });
    }
    closeModal();
  }

  function toggleService(serviceId: string) {
    const ids = form.serviceIds.includes(serviceId)
      ? form.serviceIds.filter(id => id !== serviceId)
      : [...form.serviceIds, serviceId];
    setForm(f => ({ ...f, serviceIds: ids }));
  }

  function selectCategoryServices(categoryId: string, add: boolean) {
    const cat = SERVICE_CATEGORIES.find(c => c.id === categoryId)!;
    if (add) {
      const merged = Array.from(new Set([...form.serviceIds, ...cat.serviceIds]));
      setForm(f => ({ ...f, serviceIds: merged }));
    } else {
      setForm(f => ({ ...f, serviceIds: f.serviceIds.filter(id => !cat.serviceIds.includes(id)) }));
    }
  }

  const filtered = prescribers.filter(p => {
    if (filterRole !== 'all' && p.role !== filterRole) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const isOpen = !!editingId || isCreating;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Filters & actions */}
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 'var(--space-4)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        boxShadow: 'var(--shadow-1)', border: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        <input
          type="search"
          placeholder="Search prescribers…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={inputStyle}
        />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={selectStyle}>
          <option value="all">All roles</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <Button variant="primary" size="sm" onClick={openCreate}>+ Add prescriber</Button>
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        {ROLES.map(r => {
          const count = prescribers.filter(p => p.role === r.value).length;
          return (
            <div key={r.value} style={{
              flex: 1, background: 'var(--surface)', borderRadius: 'var(--r-lg)',
              padding: 'var(--space-4)', boxShadow: 'var(--shadow-1)', border: '1px solid var(--border)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: ROLE_COLORS[r.value] }}>{count}</div>
              <div style={{ fontSize: 'var(--fs-small)', color: 'var(--fg3)' }}>{r.label}s</div>
            </div>
          );
        })}
      </div>

      {/* People table */}
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--shadow-1)', border: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
              {['Prescriber', 'Role', 'Status', 'Services', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr
                key={p.id}
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-alt)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar initials={p.initials} role={p.role} size={34} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--fs-small)' }}>{p.name}</div>
                      <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)' }}>{p.id}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Badge variant={roleVariant(p.role)} size="sm">{p.role}</Badge>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Badge variant={statusVariant(p.status)} size="sm">{p.status}</Badge>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg2)' }}>
                    <span style={{ fontWeight: 700 }}>{p.serviceIds.length}</span>
                    <span style={{ color: 'var(--fg3)' }}> / 48 services</span>
                  </div>
                  <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                    {SERVICE_CATEGORIES.map(cat => {
                      const hasAny = cat.serviceIds.some(sid => p.serviceIds.includes(sid));
                      return hasAny ? (
                        <div key={cat.id} title={cat.name} style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: cat.color, opacity: 0.85,
                        }} />
                      ) : null;
                    })}
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--fg3)', fontSize: 'var(--fs-small)' }}>
            No prescribers match your filters
          </div>
        )}
      </div>

      {/* Edit / Create Modal */}
      <Modal
        open={isOpen}
        onClose={closeModal}
        title={isCreating ? 'Add New Prescriber' : `Edit: ${form.name}`}
        width={640}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={saveEdit} disabled={!form.name.trim()}>
              {isCreating ? 'Add prescriber' : 'Save changes'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Basic info */}
          <Section title="Basic information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <FormField label="Full name">
                <input
                  style={inputStyle}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value, initials: makeInitials(e.target.value) }))}
                  placeholder="Dr Jane Smith"
                />
              </FormField>
              <FormField label="Role">
                <select style={selectStyle} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as PrescriberRole }))}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </FormField>
              <FormField label="Status">
                <select style={selectStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as PrescriberStatus }))}>
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </FormField>
            </div>
          </Section>

          {/* Service permissions */}
          <Section title={`Service permissions (${form.serviceIds.length} selected)`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {SERVICE_CATEGORIES.map(cat => {
                const catServices = SERVICES.filter(s => s.categoryId === cat.id);
                const selectedCount = catServices.filter(s => form.serviceIds.includes(s.id)).length;
                const allSelected = selectedCount === catServices.length;

                return (
                  <div key={cat.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      padding: '8px 12px', background: 'var(--surface-alt)',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <span style={{ fontSize: 14 }}>{cat.icon}</span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: 'var(--fs-small)' }}>{cat.name}</span>
                      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--fg3)' }}>{selectedCount}/{catServices.length}</span>
                      <button
                        onClick={() => selectCategoryServices(cat.id, !allSelected)}
                        style={{
                          border: '1px solid var(--border-strong)', background: 'var(--surface)',
                          borderRadius: 'var(--r-sm)', cursor: 'pointer',
                          fontSize: 'var(--fs-micro)', color: 'var(--fg2)', padding: '2px 8px',
                        }}
                      >
                        {allSelected ? 'Remove all' : 'Select all'}
                      </button>
                    </div>
                    <div style={{ padding: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {catServices.map(svc => {
                        const selected = form.serviceIds.includes(svc.id);
                        return (
                          <button
                            key={svc.id}
                            onClick={() => toggleService(svc.id)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 'var(--r-pill)',
                              border: `1.5px solid ${selected ? cat.color : 'var(--border)'}`,
                              background: selected ? `${cat.color}15` : 'transparent',
                              color: selected ? cat.color : 'var(--fg3)',
                              cursor: 'pointer',
                              fontSize: 'var(--fs-micro)',
                              fontWeight: selected ? 600 : 400,
                              transition: 'all 0.1s ease',
                            }}
                          >
                            {svc.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>
      </Modal>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 'var(--fs-small)', fontWeight: 700, color: 'var(--fg2)', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1.5px solid var(--border)',
  borderRadius: 'var(--r-md)',
  fontSize: 'var(--fs-small)',
  color: 'var(--fg1)',
  background: 'var(--surface)',
  width: '100%',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none' as const,
};
