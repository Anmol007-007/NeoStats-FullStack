'use client';

import React from 'react';
import { Modal } from './modal';
import { Button } from './button';
import { Task } from '@/lib/types';
import { AlertTriangle, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getPriorityBadgeStyle, getStatusBadgeStyle, getStatusLabel } from '@/lib/utils';

interface ConflictFieldDiff {
  fieldName: string;
  myValue: any;
  serverValue: any;
}

interface ConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentTask: Task | null;
  myDraft: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string | null;
    assigneeId?: string | null;
    [key: string]: any;
  };
  onLoadLatest: (latestTask: Task) => void;
  onReapplyChanges: (latestTask: Task) => void;
  isReapplying?: boolean;
}

export function ConflictDialog({
  isOpen,
  onClose,
  currentTask,
  myDraft,
  onLoadLatest,
  onReapplyChanges,
  isReapplying = false,
}: ConflictDialogProps) {
  if (!currentTask) return null;

  // Compute differences
  const diffs: ConflictFieldDiff[] = [];

  if (myDraft.title !== undefined && myDraft.title !== currentTask.title) {
    diffs.push({
      fieldName: 'Title',
      myValue: myDraft.title,
      serverValue: currentTask.title,
    });
  }

  if (
    myDraft.description !== undefined &&
    myDraft.description !== (currentTask.description || '')
  ) {
    diffs.push({
      fieldName: 'Description',
      myValue: myDraft.description || '(empty)',
      serverValue: currentTask.description || '(empty)',
    });
  }

  if (myDraft.status !== undefined && myDraft.status !== currentTask.status) {
    diffs.push({
      fieldName: 'Status',
      myValue: myDraft.status,
      serverValue: currentTask.status,
    });
  }

  if (
    myDraft.priority !== undefined &&
    myDraft.priority !== currentTask.priority
  ) {
    diffs.push({
      fieldName: 'Priority',
      myValue: myDraft.priority,
      serverValue: currentTask.priority,
    });
  }

  if (
    myDraft.dueDate !== undefined &&
    myDraft.dueDate !== (currentTask.dueDate || '')
  ) {
    diffs.push({
      fieldName: 'Due Date',
      myValue: myDraft.dueDate || '(no due date)',
      serverValue: currentTask.dueDate || '(no due date)',
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Concurrent Task Update Conflict"
      description="Another team member updated this task while you were editing it. Review the differences below to decide how to proceed."
      maxWidth="xl"
    >
      <div className="flex flex-col gap-5">
        {/* Warning Alert Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold">Version Mismatch: </span>
            The server rejected your update because the task moved from version{' '}
            <span className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded">
              v{currentTask.version - 1}
            </span>{' '}
            to{' '}
            <span className="font-mono font-bold bg-amber-200/80 px-1 py-0.5 rounded">
              v{currentTask.version}
            </span>
            . To avoid overwriting changes, choose either to discard your edits
            and view the latest data, or explicitly force re-applying your
            changes over version v{currentTask.version}.
          </div>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="grid grid-cols-2 bg-slate-100/80 px-4 py-2.5 text-xs font-semibold text-slate-700 border-b border-slate-200">
            <div>Your Draft Changes</div>
            <div>Latest Server State (v{currentTask.version})</div>
          </div>

          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {diffs.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No direct field conflicts detected in your current inputs. The
                task was simply modified by another user.
              </div>
            ) : (
              diffs.map((diff) => (
                <div key={diff.fieldName} className="p-3 bg-white">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {diff.fieldName}
                  </div>
                  <div className="grid grid-cols-2 gap-4 items-center text-xs">
                    <div className="p-2 rounded bg-rose-50/60 border border-rose-200 text-rose-900 font-medium break-words">
                      {diff.myValue}
                    </div>
                    <div className="p-2 rounded bg-emerald-50/60 border border-emerald-200 text-emerald-900 font-medium break-words">
                      {diff.serverValue}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onLoadLatest(currentTask)}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-1.5 text-slate-500" />
            Load Latest (Discard Mine)
          </Button>

          <Button
            type="button"
            variant="teal"
            isLoading={isReapplying}
            onClick={() => onReapplyChanges(currentTask)}
            className="w-full sm:w-auto shadow-sm"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Re-apply My Changes on v{currentTask.version}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
