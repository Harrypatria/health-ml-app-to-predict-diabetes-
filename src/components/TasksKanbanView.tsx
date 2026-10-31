import React, { useState } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Calendar, 
  Check, 
  X, 
  MoveRight
} from 'lucide-react';
import { TaskRecord } from '../types/clinical.ts';

interface TasksKanbanViewProps {
  tasks: TaskRecord[];
  onTaskUpdated: () => void;
}

export const TasksKanbanView: React.FC<TasksKanbanViewProps> = ({
  tasks,
  onTaskUpdated
}) => {
  const [isCreatingTask, setIsCreatingTask] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newPatientRef, setNewPatientRef] = useState<string>('PID-7890');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newIntervention, setNewIntervention] = useState<TaskRecord['intervention']>('DIAGNOSTIC_LAB');
  const [newPriority, setNewPriority] = useState<TaskRecord['priority']>('HIGH');
  const [newDueDate, setNewDueDate] = useState<string>(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [newAssignedTo, setNewAssignedTo] = useState<string>('Clinical Care Coordinator Team');

  const columns: Array<{ id: TaskRecord['status']; label: string; countColor: string }> = [
    { id: 'TODO', label: 'To do (pending intake)', countColor: 'text-foreground' },
    { id: 'IN_PROGRESS', label: 'In progress (active care)', countColor: 'text-primary' },
    { id: 'DONE', label: 'Completed (resolved)', countColor: 'text-primary font-bold' },
    { id: 'CANCELLED', label: 'Deferred', countColor: 'text-muted-foreground' }
  ];

  const handleMoveStatus = async (taskId: string, targetStatus: TaskRecord['status']) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      });
      if (res.ok) {
        onTaskUpdated();
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: `pat-${Date.now()}`,
          patient_ref: newPatientRef,
          title: newTitle,
          description: newDescription,
          intervention: newIntervention,
          priority: newPriority,
          status: 'TODO',
          due_date: newDueDate,
          assigned_to: newAssignedTo,
          created_by: 'Physician Direct Order'
        })
      });

      if (res.ok) {
        onTaskUpdated();
        setIsCreatingTask(false);
        setNewTitle('');
        setNewDescription('');
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-card rounded-lg p-5 border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Clinical care tasks</h1>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-accent text-accent-foreground border border-border">
              ITDO operations
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational board for scheduling diagnostic labs, specialist referrals, and lifestyle interventions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreatingTask(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>New care task</span>
        </button>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);

          return (
            <div
              key={col.id}
              className="bg-secondary/40 rounded-lg p-3.5 border border-border min-h-[500px] flex flex-col"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-border mb-3">
                <span className="text-xs font-semibold text-foreground">
                  {col.label}
                </span>
                <span className={`text-xs font-mono tabular-nums ${col.countColor}`}>
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No tasks in this lane
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const isUrgent = task.priority === 'URGENT';
                    const isHigh = task.priority === 'HIGH';

                    return (
                      <div
                        key={task.id}
                        className="bg-card rounded p-3.5 border border-border shadow-2xs hover:border-foreground/30 transition-colors space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-foreground font-mono">
                            {task.patient_ref}
                          </span>
                          <span
                            className={`text-xs font-medium px-1.5 py-0.2 rounded ${
                              isUrgent
                                ? 'bg-destructive/10 text-destructive'
                                : isHigh
                                ? 'bg-secondary text-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        <div>
                          <h2 className="text-xs font-semibold text-foreground leading-snug">
                            {task.title}
                          </h2>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2">
                          <span className="font-medium text-foreground">
                            {task.intervention.replace('_', ' ')}
                          </span>
                          <span className="flex items-center gap-1 font-mono tabular-nums">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                            {task.due_date}
                          </span>
                        </div>

                        {/* Quick Move Action Buttons */}
                        <div className="pt-2 border-t border-border flex items-center justify-between gap-1">
                          {col.id !== 'TODO' && (
                            <button
                              type="button"
                              onClick={() => handleMoveStatus(task.id, 'TODO')}
                              className="text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                            >
                              &larr; To do
                            </button>
                          )}
                          {col.id === 'TODO' && (
                            <button
                              type="button"
                              onClick={() => handleMoveStatus(task.id, 'IN_PROGRESS')}
                              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 ml-auto focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                            >
                              <span>Start care</span>
                              <MoveRight className="w-3 h-3" aria-hidden="true" />
                            </button>
                          )}
                          {col.id === 'IN_PROGRESS' && (
                            <button
                              type="button"
                              onClick={() => handleMoveStatus(task.id, 'DONE')}
                              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 ml-auto focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                            >
                              <span>Complete task</span>
                              <Check className="w-3 h-3" aria-hidden="true" />
                            </button>
                          )}
                          {col.id === 'DONE' && (
                            <button
                              type="button"
                              onClick={() => handleMoveStatus(task.id, 'IN_PROGRESS')}
                              className="text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Task Modal */}
      {isCreatingTask && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="new-task-modal-title"
          className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-card text-card-foreground rounded-lg max-w-lg w-full p-6 shadow-lg border border-border animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-primary" aria-hidden="true" />
                <h2 id="new-task-modal-title" className="text-base font-bold text-foreground">
                  Create care task
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingTask(false)}
                aria-label="Close dialog"
                className="p-1 rounded text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="modal-patient-ref" className="text-xs font-semibold text-foreground block mb-1">
                    Patient reference ID
                  </label>
                  <input
                    id="modal-patient-ref"
                    type="text"
                    required
                    value={newPatientRef}
                    onChange={(e) => setNewPatientRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded border border-border bg-card text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="modal-intervention-type" className="text-xs font-semibold text-foreground block mb-1">
                    Intervention type
                  </label>
                  <select
                    id="modal-intervention-type"
                    value={newIntervention}
                    onChange={(e) => setNewIntervention(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded border border-border bg-card text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="DIAGNOSTIC_LAB">Diagnostic lab (HbA1c/OGTT)</option>
                    <option value="SPECIALIST_REFERRAL">Endocrinology specialist</option>
                    <option value="LIFESTYLE_INTERVENTION">Diabetes prevention program</option>
                    <option value="MEDICATION_REVIEW">Medication review</option>
                    <option value="CARE_COORDINATION">Care coordination call</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="modal-task-title" className="text-xs font-semibold text-foreground block mb-1">
                  Task title
                </label>
                <input
                  id="modal-task-title"
                  type="text"
                  required
                  placeholder="e.g. Schedule confirmatory 2-hr oral glucose tolerance test"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-border bg-card text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring font-medium"
                />
              </div>

              <div>
                <label htmlFor="modal-task-desc" className="text-xs font-semibold text-foreground block mb-1">
                  Clinical description
                </label>
                <textarea
                  id="modal-task-desc"
                  rows={2}
                  placeholder="Instructions for the care coordinator or clinic nurse..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-border bg-card text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="modal-task-priority" className="text-xs font-semibold text-foreground block mb-1">
                    Priority
                  </label>
                  <select
                    id="modal-task-priority"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded border border-border bg-card text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="URGENT">Urgent (48–72h)</option>
                    <option value="HIGH">High (1–2 weeks)</option>
                    <option value="MEDIUM">Medium (30 days)</option>
                    <option value="LOW">Low (Routine)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="modal-task-due" className="text-xs font-semibold text-foreground block mb-1">
                    Due date
                  </label>
                  <input
                    id="modal-task-due"
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded border border-border bg-card text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingTask(false)}
                  className="px-3.5 py-1.5 text-xs font-medium rounded border border-border bg-card text-foreground hover:bg-secondary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Create task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
