'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { tasksApi } from '@/lib/api';
import { Task, TaskStatus } from '@/types';
import { Avatar } from './Avatar';
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  Pencil,
  GripVertical,
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ColumnConfig {
  id: TaskStatus;
  title: string;
  dotColor: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'TODO',
    title: 'TO DO',
    dotColor: 'bg-[#A89F91]',
  },
  {
    id: 'IN_PROGRESS',
    title: 'IN PROGRESS',
    dotColor: 'bg-[#125CB9]',
  },
  {
    id: 'COMPLETED',
    title: 'COMPLETED',
    dotColor: 'bg-[#00D26A]',
  },
];

export const TodoKanbanView: React.FC = () => {
  const { profile, partner } = useAuth();
  const { toast, confirm } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMobileCol, setActiveMobileCol] = useState<TaskStatus>('TODO');

  // Drag and Drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  // New task inline state
  const [addingToCol, setAddingToCol] = useState<TaskStatus | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Edit task modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<TaskStatus>('TODO');

  const channelRef = useRef<RealtimeChannel | null>(null);
  const duoId = profile?.active_duo_id;

  const fetchTasks = useCallback(async () => {
    try {
      const res = await tasksApi.list();
      setTasks(res.tasks || []);
    } catch (err) {
      console.warn('Failed to load tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Real-time synchronization
  useEffect(() => {
    if (!isSupabaseConfigured() || !duoId) return;

    const channel = supabase.channel(`todos:${duoId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'tasks_updated' }, () => {
      fetchTasks();
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [duoId, fetchTasks]);

  const broadcastUpdate = () => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'tasks_updated',
        payload: {},
      });
    }
  };

  // Add Task
  const handleAddTask = async (status: TaskStatus) => {
    if (!newTitle.trim()) return;

    try {
      const created = await tasksApi.create({
        title: newTitle.trim(),
        description: newDescription.trim(),
        status,
      });

      setTasks((prev) => [...prev, created]);
      setNewTitle('');
      setNewDescription('');
      setAddingToCol(null);
      toast.love('Task added to board', 'Task Added');
      broadcastUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add task.', 'Error');
    }
  };

  // Update Task Status (Drag & Drop or button move)
  const handleMoveStatus = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await tasksApi.update(taskId, { status: newStatus });
      if (newStatus === 'COMPLETED') {
        toast.love(`Completed "${task.title}"`, 'Task Complete');
      }
      broadcastUpdate();
    } catch (err: any) {
      toast.error('Failed to move task.', 'Error');
      fetchTasks();
    }
  };

  // Toggle Complete
  const handleToggleComplete = async (task: Task) => {
    const targetStatus: TaskStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    handleMoveStatus(task.id, targetStatus);
  };

  // Save Edit Task
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;

    try {
      const updated = await tasksApi.update(editingTask.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        status: editStatus,
      });

      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updated : t)));
      setEditingTask(null);
      toast.love('Task updated', 'Saved');
      broadcastUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update task.', 'Error');
    }
  };

  // Delete Task
  const handleDeleteTask = async (task: Task) => {
    const ok = await confirm({
      title: 'Delete Task?',
      message: `Remove "${task.title}" from our shared board?`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!ok) return;

    setTasks((prev) => prev.filter((t) => t.id !== task.id));

    try {
      await tasksApi.delete(task.id);
      toast.love('Task deleted.', 'Deleted');
      broadcastUpdate();
    } catch (err: any) {
      toast.error('Failed to delete task.', 'Error');
      fetchTasks();
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const related = e.relatedTarget as HTMLElement;
    if (!related || !e.currentTarget.contains(related)) {
      setDragOverCol(null);
    }
  };

  const handleDrop = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDragOverCol(null);
    setDraggedTaskId(null);

    if (taskId) {
      handleMoveStatus(taskId, colId);
    }
  };

  const formatTaskDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isToday(d)) return 'Today';
      if (isYesterday(d)) return 'Yesterday';
      return format(d, 'MMM d');
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <p className="text-xs font-mono text-theme-muted">Opening our to-do board...</p>
        </div>
      </div>
    );
  }

  const completedTotal = tasks.filter((t) => t.status === 'COMPLETED').length;

  return (
    <div className="w-full h-full flex flex-col p-4 sm:p-6 lg:p-8 min-h-0 overflow-hidden">
      {/* Board Header */}
      <div className="pb-5 border-b border-theme flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 shrink-0 max-w-6xl mx-auto w-full">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-theme-muted">
            <Sparkles className="h-3.5 w-3.5 text-[#125CB9]" />
            <span>Shared Workspace</span>
          </div>
          <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-theme-primary">
            Our To-Do Board
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-theme-secondary">
            Shared tasks and plans synced in real time between you and {partner?.name || 'your partner'}.
          </p>
        </div>

        {/* Counter Summary */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="text-xs font-mono text-theme-secondary bg-theme-input px-3 py-1 rounded-full border border-theme">
            {completedTotal} / {tasks.length} completed
          </span>
        </div>
      </div>

      {/* Mobile Column Switcher Tabs (<768px) */}
      <div className="md:hidden flex gap-1.5 overflow-x-auto py-3 shrink-0 scrollbar-none max-w-6xl mx-auto w-full">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const isActive = activeMobileCol === col.id;

          return (
            <button
              key={col.id}
              onClick={() => setActiveMobileCol(col.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border text-xs transition-all ${
                isActive
                  ? 'border-[#125CB9] bg-[#125CB9] text-white font-semibold shadow-xs'
                  : 'border-theme bg-theme-card text-theme-secondary hover:text-theme-primary'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-white' : col.dotColor}`} />
              <span>{col.title}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-theme-input text-theme-muted'
                }`}
              >
                {colTasks.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3-Column Kanban Board */}
      <div className="flex-1 min-h-0 pt-4 overflow-y-auto max-w-6xl mx-auto w-full">
        {/* Desktop 3 Columns Grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-5 h-full items-start pb-6">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            const isDropTarget = dragOverCol === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col rounded-2xl border border-theme bg-theme-input/40 p-3.5 transition-all duration-150 ${
                  isDropTarget ? 'ring-2 ring-[#125CB9]/40 bg-[#125CB9]/5 border-[#125CB9]' : ''
                }`}
              >
                {/* Column Header */}
                <div className="pb-3 mb-3 border-b border-theme flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-2">
                    <span className={`h-2 w-2 rounded-full ${col.dotColor}`} />
                    <h3 className="text-xs font-mono font-semibold tracking-wider text-theme-primary uppercase">
                      {col.title}
                    </h3>
                  </div>

                  <span className="text-xs font-mono text-theme-muted">
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards List */}
                <div className="space-y-2.5 min-h-[80px]">
                  {colTasks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-theme-muted select-none">
                      No tasks yet
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const isBeingDragged = draggedTaskId === task.id;
                      const creatorName = task.is_me ? (profile?.name || 'You') : task.created_by.name;

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          className={`group relative rounded-2xl border border-theme bg-theme-card p-3.5 transition-all duration-150 cursor-grab active:cursor-grabbing select-none hover:-translate-y-0.5 hover:shadow-md hover:border-theme-primary/30 ${
                            isBeingDragged
                              ? 'opacity-30 scale-95 border-dashed border-[#125CB9]'
                              : task.status === 'COMPLETED'
                              ? 'opacity-75 hover:opacity-100'
                              : 'shadow-xs'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {/* Complete Toggle Action */}
                            <button
                              type="button"
                              onClick={() => handleToggleComplete(task)}
                              className="mt-0.5 text-theme-muted hover:text-[#125CB9] transition-colors shrink-0"
                              title={task.status === 'COMPLETED' ? 'Mark incomplete' : 'Mark completed'}
                            >
                              {task.status === 'COMPLETED' ? (
                                <CheckCircle2 className="h-4 w-4 text-[#00D26A] fill-[#00D26A]/20" />
                              ) : (
                                <Circle className="h-4 w-4 text-theme-muted hover:text-[#125CB9]" />
                              )}
                            </button>

                            {/* Title and Description */}
                            <div className="flex-1 min-w-0">
                              <h4
                                className={`text-xs sm:text-sm font-medium leading-snug break-words ${
                                  task.status === 'COMPLETED'
                                    ? 'line-through text-theme-muted'
                                    : 'text-theme-primary'
                                }`}
                              >
                                {task.title}
                              </h4>
                              {task.description && (
                                <p className="mt-1 text-xs text-theme-secondary leading-relaxed break-words line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            {/* Card Actions (Edit / Delete) */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 shrink-0">
                              <button
                                onClick={() => {
                                  setEditingTask(task);
                                  setEditTitle(task.title);
                                  setEditDescription(task.description || '');
                                  setEditStatus(task.status);
                                }}
                                className="p-1 text-theme-muted hover:text-theme-primary rounded-lg hover:bg-theme-input transition-colors"
                                title="Edit task"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task)}
                                className="p-1 text-theme-muted hover:text-[#F43F5E] rounded-lg hover:bg-[#F43F5E]/10 transition-colors"
                                title="Delete task"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {/* Footer: Assignee Avatar + Metadata Date */}
                          <div className="mt-3 pt-2.5 border-t border-theme-subtle flex items-center justify-between text-xs text-theme-muted">
                            <div className="flex items-center space-x-1.5">
                              <Avatar
                                src={task.created_by.avatar_url}
                                name={creatorName}
                                size="xs"
                              />
                              <span className="text-[11px] text-theme-secondary font-medium truncate max-w-[100px]">
                                {task.is_me ? 'You' : task.created_by.name}
                              </span>
                            </div>

                            <span className="text-[11px] font-mono text-theme-muted">
                              {formatTaskDate(task.created_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Inline Add Task Action */}
                <div className="mt-3 pt-2">
                  {addingToCol === col.id ? (
                    <div className="rounded-xl border border-theme bg-theme-card p-3 space-y-2 shadow-xs">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Task title..."
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTask(col.id);
                          if (e.key === 'Escape') setAddingToCol(null);
                        }}
                        className="w-full rounded-lg border border-theme bg-theme-input px-3 py-1.5 text-xs text-theme-primary focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                      />
                      <input
                        type="text"
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Optional description..."
                        className="w-full rounded-lg border border-theme bg-theme-input px-3 py-1 text-xs text-theme-primary focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                      />
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setAddingToCol(null)}
                          className="px-2.5 py-1 text-xs text-theme-secondary hover:text-theme-primary"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddTask(col.id)}
                          className="px-3.5 py-1 rounded-full bg-[#125CB9] text-white hover:bg-[#0E4B99] text-xs font-medium shadow-xs"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingToCol(col.id);
                        setNewTitle('');
                        setNewDescription('');
                      }}
                      className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-card/60 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add task</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Single Active Column (<768px) */}
        <div className="md:hidden flex flex-col rounded-2xl border border-theme bg-theme-input/40 p-4 pb-6">
          {(() => {
            const activeColConfig = COLUMNS.find((c) => c.id === activeMobileCol) || COLUMNS[0];
            const colTasks = tasks.filter((t) => t.status === activeColConfig.id);

            return (
              <>
                <div className="pb-3 mb-3 border-b border-theme flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-2">
                    <span className={`h-2 w-2 rounded-full ${activeColConfig.dotColor}`} />
                    <h3 className="text-xs font-mono font-semibold tracking-wider text-theme-primary uppercase">
                      {activeColConfig.title}
                    </h3>
                  </div>

                  <span className="text-xs font-mono text-theme-muted">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5 min-h-[120px]">
                  {colTasks.length === 0 ? (
                    <div className="py-12 text-center text-xs text-theme-muted select-none">
                      No tasks yet
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const creatorName = task.is_me ? (profile?.name || 'You') : task.created_by.name;

                      return (
                        <div
                          key={task.id}
                          className="rounded-2xl border border-theme bg-theme-card p-3.5 shadow-xs space-y-2"
                        >
                          <div className="flex items-start gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleToggleComplete(task)}
                              className="mt-0.5 text-theme-muted hover:text-[#125CB9] transition-colors shrink-0"
                            >
                              {task.status === 'COMPLETED' ? (
                                <CheckCircle2 className="h-4 w-4 text-[#00D26A] fill-[#00D26A]/20" />
                              ) : (
                                <Circle className="h-4 w-4 text-theme-muted" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <h4
                                className={`text-xs sm:text-sm font-medium leading-snug break-words ${
                                  task.status === 'COMPLETED'
                                    ? 'line-through text-theme-muted'
                                    : 'text-theme-primary'
                                }`}
                              >
                                {task.title}
                              </h4>
                              {task.description && (
                                <p className="mt-1 text-xs text-theme-secondary leading-relaxed break-words">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                onClick={() => {
                                  setEditingTask(task);
                                  setEditTitle(task.title);
                                  setEditDescription(task.description || '');
                                  setEditStatus(task.status);
                                }}
                                className="p-1 text-theme-muted hover:text-theme-primary rounded-lg"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task)}
                                className="p-1 text-theme-muted hover:text-[#F43F5E] rounded-lg"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {/* Quick Mobile Status Move Buttons */}
                          <div className="pt-2 border-t border-theme-subtle flex items-center justify-between text-xs text-theme-muted">
                            <div className="flex items-center space-x-1.5">
                              <Avatar
                                src={task.created_by.avatar_url}
                                name={creatorName}
                                size="xs"
                              />
                              <span className="text-[11px] text-theme-secondary font-medium">
                                {task.is_me ? 'You' : task.created_by.name}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1.5 text-[11px] font-mono">
                              {activeColConfig.id !== 'TODO' && (
                                <button
                                  onClick={() => handleMoveStatus(task.id, 'TODO')}
                                  className="text-theme-muted hover:text-theme-primary underline"
                                >
                                  To Do
                                </button>
                              )}
                              {activeColConfig.id !== 'IN_PROGRESS' && (
                                <button
                                  onClick={() => handleMoveStatus(task.id, 'IN_PROGRESS')}
                                  className="text-theme-muted hover:text-theme-primary underline"
                                >
                                  In Progress
                                </button>
                              )}
                              {activeColConfig.id !== 'COMPLETED' && (
                                <button
                                  onClick={() => handleMoveStatus(task.id, 'COMPLETED')}
                                  className="text-theme-muted hover:text-[#00D26A] underline"
                                >
                                  Complete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Mobile Add Task Action */}
                <div className="mt-3 pt-2">
                  {addingToCol === activeColConfig.id ? (
                    <div className="rounded-xl border border-theme bg-theme-card p-3 space-y-2 shadow-xs">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Task title..."
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTask(activeColConfig.id);
                          if (e.key === 'Escape') setAddingToCol(null);
                        }}
                        className="w-full rounded-lg border border-theme bg-theme-input px-3 py-1.5 text-xs text-theme-primary focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                      />
                      <input
                        type="text"
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Optional description..."
                        className="w-full rounded-lg border border-theme bg-theme-input px-3 py-1 text-xs text-theme-primary focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                      />
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setAddingToCol(null)}
                          className="px-2.5 py-1 text-xs text-theme-secondary hover:text-theme-primary"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddTask(activeColConfig.id)}
                          className="px-3.5 py-1 rounded-full bg-[#125CB9] text-white hover:bg-[#0E4B99] text-xs font-medium shadow-xs"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingToCol(activeColConfig.id);
                        setNewTitle('');
                        setNewDescription('');
                      }}
                      className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-card transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add task</span>
                    </button>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-theme bg-theme-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-theme">
              <h3 className="font-serif text-lg font-bold text-theme-primary">Edit Task</h3>
              <button
                onClick={() => setEditingTask(null)}
                className="p-1 text-theme-muted hover:text-theme-primary rounded-full hover:bg-theme-input transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Task title..."
                  required
                  className="w-full rounded-xl border border-theme bg-theme-input px-3 py-2 text-xs sm:text-sm text-theme-primary focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional details or subtasks..."
                  rows={3}
                  className="w-full rounded-xl border border-theme bg-theme-input px-3 py-2 text-xs sm:text-sm text-theme-primary focus:border-[#125CB9] focus:bg-theme-card focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {COLUMNS.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setEditStatus(col.id)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-medium border transition-all ${
                        editStatus === col.id
                          ? 'border-[#125CB9] bg-[#125CB9] text-white font-semibold shadow-xs'
                          : 'border-theme bg-theme-input text-theme-secondary hover:text-theme-primary'
                      }`}
                    >
                      {col.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-theme">
                <button
                  type="button"
                  onClick={() => {
                    if (editingTask) handleDeleteTask(editingTask);
                    setEditingTask(null);
                  }}
                  className="text-xs text-[#F43F5E] hover:underline font-mono"
                >
                  Delete Task
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="px-3.5 py-1.5 rounded-full text-xs text-theme-secondary hover:bg-theme-input transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 rounded-full bg-[#125CB9] text-white hover:bg-[#0E4B99] text-xs font-semibold shadow-xs transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
