import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search, 
  X,
  Stethoscope
} from 'lucide-react';
import { AlertRecord } from '../types/clinical.ts';

interface AlertsViewProps {
  alerts: AlertRecord[];
  onAlertUpdated: () => void;
  setActiveTab: (tab: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  onAlertUpdated,
  setActiveTab
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedAlertForTask, setSelectedAlertForTask] = useState<AlertRecord | null>(null);

  const [taskTitle, setTaskTitle] = useState<string>('');
  const [intervention, setIntervention] = useState<'DIAGNOSTIC_LAB' | 'SPECIALIST_REFERRAL' | 'LIFESTYLE_INTERVENTION' | 'MEDICATION_REVIEW' | 'CARE_COORDINATION'>('DIAGNOSTIC_LAB');
  const [priority, setPriority] = useState<'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'>('URGENT');
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [assignedTo, setAssignedTo] = useState<string>('Clinical Care Coordinator Team');
  const [isSubmittingTask, setIsSubmittingTask] = useState<boolean>(false);

  const handleStatusChange = async (alertId: string, newStatus: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED') => {
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        onAlertUpdated();
      }
    } catch (err) {
      console.error('Failed to update alert:', err);
    }
  };

  const handleOpenTaskModal = (alert: AlertRecord) => {
    setSelectedAlertForTask(alert);
    setTaskTitle(`Diagnostic follow-up for ${alert.patient_ref} (Risk ${(alert.probability * 100).toFixed(0)}%)`);
    setPriority(alert.probability >= 0.85 ? 'URGENT' : 'HIGH');
  };

  const handleConvertAlertToTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlertForTask) return;

    setIsSubmittingTask(true);
    try {
      const res = await fetch(`/api/alerts/${selectedAlertForTask.id}/convert-to-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle,
          intervention,
          priority,
          due_date: dueDate,
          assigned_to: assignedTo
        })
      });

      if (res.ok) {
        onAlertUpdated();
        setSelectedAlertForTask(null);
        setActiveTab('tasks');
      }
    } catch (err) {
      console.error('Failed to convert alert to task:', err);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const filteredAlerts = alerts
    .filter((a) => (filterStatus === 'ALL' ? true : a.status === filterStatus))
    .filter((a) => a.patient_ref.toLowerCase().includes(searchTerm.toLowerCase()));

  const openCount = alerts.filter((a) => a.status === 'OPEN').length;
  const ackCount = alerts.filter((a) => a.status === 'ACKNOWLEDGED').length;
  const resolvedCount = alerts.filter((a) => a.status === 'RESOLVED').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-card rounded-lg p-5 border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Clinical alerts management</h1>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-destructive/10 text-destructive border border-destructive/20">
              ITDO triggers
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated alerts fired when estimated probability meets or exceeds the threshold (P &ge; 0.70).
          </p>
        </div>

        {/* Quick Filter Counters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-secondary rounded text-xs" role="tablist" aria-label="Alert status filters">
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
                filterStatus === 'ALL' ? 'bg-card text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('OPEN')}
              className={`px-3 py-1.5 rounded font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
                filterStatus === 'OPEN' ? 'bg-card text-destructive shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Open ({openCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('ACKNOWLEDGED')}
              className={`px-3 py-1.5 rounded font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
                filterStatus === 'ACKNOWLEDGED' ? 'bg-card text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Acknowledged ({ackCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('RESOLVED')}
              className={`px-3 py-1.5 rounded font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
                filterStatus === 'RESOLVED' ? 'bg-card text-primary shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" aria-hidden="true" />
        <label htmlFor="search-alerts" className="sr-only">Filter alerts by patient reference</label>
        <input
          id="search-alerts"
          type="text"
          placeholder="Filter alerts by patient reference (e.g. PID-7012)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-xs bg-card border border-border rounded text-foreground placeholder-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Alerts Grid / Cards */}
      {filteredAlerts.length === 0 ? (
        <div className="bg-card rounded-lg p-12 text-center border border-border">
          <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-3" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">No alerts matching filter</h2>
          <p className="text-xs text-muted-foreground mt-1">
            No active triggers correspond to the selected criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const probPct = (alert.probability * 100).toFixed(1);
            const isOpen = alert.status === 'OPEN';
            const isAck = alert.status === 'ACKNOWLEDGED';

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-lg border bg-card shadow-xs transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isOpen
                    ? 'border-destructive/30'
                    : 'border-border'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-mono font-bold text-foreground">{alert.patient_ref}</span>
                    <span aria-hidden="true" className="text-border">·</span>
                    <span className="text-xs font-bold text-destructive font-mono tabular-nums">
                      P = {probPct}% (&ge; 70% threshold)
                    </span>
                    <span aria-hidden="true" className="text-border">·</span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        isOpen
                          ? 'bg-destructive/10 text-destructive'
                          : isAck
                          ? 'bg-secondary text-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {alert.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>Assigned: {alert.assigned_to}</span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      {new Date(alert.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Triage & Operational Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  {isOpen && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(alert.id, 'ACKNOWLEDGED')}
                      className="px-3 py-1.5 rounded border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Acknowledge
                    </button>
                  )}

                  {isAck && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(alert.id, 'RESOLVED')}
                      className="px-3 py-1.5 rounded border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Resolve alert
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenTaskModal(alert)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Create care task</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Creation Modal */}
      {selectedAlertForTask && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="escalate-modal-title"
          className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-card text-card-foreground rounded-lg max-w-lg w-full p-6 shadow-lg border border-border animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-primary" aria-hidden="true" />
                <h2 id="escalate-modal-title" className="text-base font-bold text-foreground">
                  Create care task from trigger
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlertForTask(null)}
                aria-label="Close dialog"
                className="p-1 rounded text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConvertAlertToTask} className="mt-4 space-y-4">
              <div>
                <label htmlFor="task-title-input" className="text-xs font-semibold text-foreground block mb-1">
                  Task title
                </label>
                <input
                  id="task-title-input"
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-border bg-card text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="intervention-select" className="text-xs font-semibold text-foreground block mb-1">
                    Intervention type
                  </label>
                  <select
                    id="intervention-select"
                    value={intervention}
                    onChange={(e) => setIntervention(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded border border-border bg-card text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="DIAGNOSTIC_LAB">Diagnostic lab (HbA1c/OGTT)</option>
                    <option value="SPECIALIST_REFERRAL">Endocrinology specialist</option>
                    <option value="LIFESTYLE_INTERVENTION">Diabetes prevention program</option>
                    <option value="MEDICATION_REVIEW">Medication review</option>
                    <option value="CARE_COORDINATION">Care coordination call</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="priority-select" className="text-xs font-semibold text-foreground block mb-1">
                    Priority level
                  </label>
                  <select
                    id="priority-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded border border-border bg-card text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="URGENT">Urgent (48–72h)</option>
                    <option value="HIGH">High (1–2 weeks)</option>
                    <option value="MEDIUM">Medium (30 days)</option>
                    <option value="LOW">Low (Routine)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="due-date-input" className="text-xs font-semibold text-foreground block mb-1">
                    Due date
                  </label>
                  <input
                    id="due-date-input"
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded border border-border bg-card text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="assigned-to-input" className="text-xs font-semibold text-foreground block mb-1">
                    Assignee team
                  </label>
                  <input
                    id="assigned-to-input"
                    type="text"
                    required
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded border border-border bg-card text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAlertForTask(null)}
                  className="px-3.5 py-1.5 text-xs font-medium rounded border border-border bg-card text-foreground hover:bg-secondary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask}
                  className="px-4 py-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  {isSubmittingTask ? 'Creating task...' : 'Save care task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
