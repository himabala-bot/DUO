'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { tasksApi } from '@/lib/api';
import { Task, TaskStatus } from '@/types';
import {
  Plus,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock,
  Trash2,
  Edit3,
  MoveRight,
  MoveLeft,
  Sparkles,
  Heart,
  Calendar,
  X,
  GripVertical,
  ArrowRight,
  ListTodo,
} from 'lucide-react';
import { format } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ColumnConfig {
  id: TaskStatus;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  badgeBg: string;
  borderTop: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'TODO',
    title: 'To Do',
    icon: CircleDot,
    accent: 'text-[#FB923C]',
    badgeBg: 'bg-[#FB923C]/10 border-[#FB923C]/30 text-[#FB923C]',
    borderTop: '#FB923C',
  },
  {
    id: 'IN_PROGRESS',
    title: 'In Progress',
    icon: Clock,
    accent: 'text-[#125CB9]',
    badgeBg: 'bg-[#125CB9]/10 border-[#125CB9]/30 text-[#125CB9]',
    borderTop: '#125CB9',
  },
  {
    id: 'COMPLETED',
    title: 'Completed',
    icon: CheckCircle2,
    accent: 'text-[#00D26A]',
    badgeBg: 'bg-[#00D26A]/10 border-[#00D26A]/30 text-[#00D26A]',
    borderTop: '#00D26A',
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
      toast.love('Task added to list', 'Task Added');
      broadcastUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add task.', 'Error');
    }
  };

  // Update Task Status (Drag & Drop or button move)
  const handleMoveStatus = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Single source of truth update in local state - instant with zero duplicates
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await tasksApi.update(taskId, { status: newStatus });
      if (newStatus === 'COMPLETED') {
        toast.love(`Completed "${task.title}"`, 'Task Complete');
      } else {
        toast.love(`Moved to ${newStatus === 'IN_PROGRESS' ? 'In Progress' : 'To Do'}`, 'Updated');
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

  // HTML5 Drag and Drop Handlers with Visual Feedback
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
    // Prevent flickering when hovering child elements
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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <Heart className="h-6 w-6 text-[#EA5E86] animate-bounce mx-auto" />
          <p className="text-xs font-mono text-[#A89F91]">Opening shared to-do board...</p>
        </div>
      </div>
    );
  }

  const completedTotal = tasks.filter((t) => t.status === 'COMPLETED').length;

  return (
    <div className="w-full h-full flex flex-col p-3 sm:p-6 lg:p-8 min-h-0 overflow-hidden">
      {/* Top Header */}
      <div className="pb-5 border-b border-[#EFE8DC] flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-[#A89F91]">
            <Sparkles className="h-3.5 w-3.5 text-[#F49625]" />
            <span>Shared Couple Tasks</span>
          </div>
          <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-[#422F0E]">
            Our To-Do Board
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#6B5E4E]">
            Simple, shared couple tasks synced in real time between you and {partner?.name || 'your partner'}.
          </p>
        </div>

        {/* Top Action & Progress Pill */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border border-[#00D26A]/25 bg-[#00D26A]/10 text-[#00D26A]">
            <CheckCircle2 className="h-3 w-3 fill-current" />
            <span>{completedTotal} / {tasks.length} Done</span>
          </div>

          <button
            onClick={() => {
              setAddingToCol('TODO');
              setNewTitle('');
              setNewDescription('');
            }}
            className="flex items-center space-x-1.5 rounded-full bg-[#125CB9] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#0E4B99] transition-colors shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Mobile Column Tabs (<768px) */}
      <div className="md:hidden flex gap-1.5 overflow-x-auto py-2.5 shrink-0 scrollbar-none">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const isActive = activeMobileCol === col.id;
          const Icon = col.icon;

          return (
            <button
              key={col.id}
              onClick={() => setActiveMobileCol(col.id)}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-full border text-xs font-medium transition-all ${
                isActive
                  ? 'border-[#125CB9] bg-[#125CB9] text-white font-semibold shadow-xs'
                  : 'border-theme bg-theme-card text-theme-secondary hover:bg-theme-card-hover'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{col.title}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-theme-input text-theme-muted'
                }`}
              >
                {colTasks.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3-Column Kanban Grid (Desktop side-by-side / Mobile single active tab) */}
      <div className="flex-1 min-h-0 pt-2 overflow-x-auto overflow-y-hidden">
        {/* Desktop 3-Column Grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-5 h-full items-start pb-4 max-w-6xl mx-auto">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            const isDropTarget = dragOverCol === col.id;
            const Icon = col.icon;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
                style={{ borderTopColor: col.borderTop }}
                className={`h-full flex flex-col rounded-[45px] border border-theme border-t-4 bg-theme-card shadow-xs overflow-hidden transition-all duration-150 ${
                  isDropTarget ? 'border-dashed border-2 border-[#125CB9] bg-[#125CB9]/10' : ''
                }`}
              >
                {/* Column Header */}
                <div className="px-3.5 py-2.5 border-b border-theme bg-theme-page flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-2">
                    <Icon className={`h-3.5 w-3.5 ${col.accent}`} />
                    <h3 className="font-serif text-xs font-bold text-theme-primary">
                      {col.title}
                    </h3>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-medium px-2 py-0.2 rounded-full border ${col.badgeBg}`}
                  >
                    {colTasks.length}
                  </span>
                </div>

                {/* Tasks List */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
                  {colTasks.length === 0 ? (
                    <div className="p-6 text-center text-xs font-mono text-theme-muted border border-dashed border-theme rounded-xl">
                      No tasks yet
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const isBeingDragged = draggedTaskId === task.id;

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          className={`group relative rounded-xl border p-3 transition-all duration-100 cursor-grab active:cursor-grabbing ${
                            isBeingDragged
                              ? 'opacity-35 scale-95 border-dashed border-[#125CB9] bg-[#125CB9]/15'
                              : task.status === 'COMPLETED'
                              ? 'border-theme bg-theme-input/60 opacity-70 hover:opacity-100 hover:border-[#00D26A]'
                              : 'border-theme bg-theme-card shadow-xs hover:border-[#125CB9]'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {/* Complete Toggle Checkbox */}
                            <button
                              type="button"
                              onClick={() => handleToggleComplete(task)}
                              className="mt-0.5 text-[#125CB9] transition-transform shrink-0"
                              title={task.status === 'COMPLETED' ? 'Mark incomplete' : 'Mark completed'}
                            >
                              {task.status === 'COMPLETED' ? (
                                <CheckCircle2 className="h-3.5 w-3.5 fill-[#00D26A] text-white" />
                              ) : (
                                <Circle className="h-3.5 w-3.5 text-theme-muted hover:text-[#125CB9]" />
                              )}
                            </button>

                            {/* Title & Description */}
                            <div className="flex-1 min-w-0">
                              <span
                                className={`text-xs font-medium leading-snug break-words block ${
                                  task.status === 'COMPLETED'
                                    ? 'line-through text-theme-muted'
                                    : 'text-theme-primary'
                                }`}
                              >
                                {task.title}
                              </span>
                              {task.description && (
                                <p className="mt-0.5 text-[11px] text-theme-secondary leading-relaxed break-words">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            {/* Action Buttons (Edit / Delete) */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-0.5 shrink-0">
                              <button
                                onClick={() => {
                                  setEditingTask(task);
                                  setEditTitle(task.title);
                                  setEditDescription(task.description || '');
                                  setEditStatus(task.status);
                                }}
                                className="p-1 text-theme-muted hover:text-theme-primary rounded-full hover:bg-theme-input transition-colors"
                                title="Edit task"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>

                              <button
                                onClick={() => handleDeleteTask(task)}
                                className="p-1 text-theme-muted hover:text-[#F43F5E] rounded-full hover:bg-[#F43F5E]/10 transition-colors"
                                title="Delete task"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {/* Drag Handle & Quick Move Links */}
                          <div className="mt-1.5 pt-1.5 border-t border-theme-subtle flex items-center justify-between text-[10px] font-mono text-theme-muted">
                            <span className="flex items-center gap-1">
                              <GripVertical className="h-2.5 w-2.5 text-theme-muted" />
                              {task.is_me ? 'You' : task.created_by.name}
                            </span>

                            <div className="flex items-center space-x-1.5">
                              {col.id !== 'TODO' && (
                                <button
                                  onClick={() => handleMoveStatus(task.id, 'TODO')}
                                  className="hover:text-[#125CB9] hover:underline"
                                >
                                  To Do
                                </button>
                              )}
                              {col.id !== 'IN_PROGRESS' && (
                                <button
                                  onClick={() => handleMoveStatus(task.id, 'IN_PROGRESS')}
                                  className="hover:text-[#125CB9] hover:underline"
                                >
                                  In Progress
                                </button>
                              )}
                              {col.id !== 'COMPLETED' && (
                                <button
                                  onClick={() => handleMoveStatus(task.id, 'COMPLETED')}
                                  className="hover:text-[#00D26A] hover:underline"
                                >
                                  Done
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Task Trigger at Column Bottom */}
                <div className="p-2.5 border-t border-theme bg-theme-page shrink-0">
                  {addingToCol === col.id ? (
                    <div className="space-y-1.5">
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
                        className="w-full rounded-xl border border-theme bg-theme-input px-3 py-1.5 text-xs text-theme-primary focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                      />
                      <input
                        type="text"
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Optional details..."
                        className="w-full rounded-xl border border-theme bg-theme-input px-3 py-1 text-[11px] text-theme-primary focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                      />
                      <div className="flex gap-1.5 justify-end pt-0.5">
                        <button
                          type="button"
                          onClick={() => setAddingToCol(null)}
                          className="px-3 py-1 rounded-full text-xs text-theme-secondary hover:bg-theme-card"
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
                      className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded-xl border border-dashed border-theme hover:border-[#125CB9] hover:bg-theme-card text-xs font-medium text-theme-secondary hover:text-theme-primary transition-all"
                    >
                      <Plus className="h-3 w-3 text-[#125CB9]" />
                      <span>Add task</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Single Column View (<768px) */}
        <div className="md:hidden h-full flex flex-col rounded-2xl border border-theme bg-theme-card shadow-xs overflow-hidden">
          {(() => {
            const activeColConfig = COLUMNS.find((c) => c.id === activeMobileCol) || COLUMNS[0];
            const colTasks = tasks.filter((t) => t.status === activeColConfig.id);
            const Icon = activeColConfig.icon;

            return (
              <>
                <div className="px-3.5 py-2.5 border-b border-theme bg-theme-page flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-2">
                    <Icon className={`h-3.5 w-3.5 ${activeColConfig.accent}`} />
                    <h3 className="font-serif text-sm font-bold text-theme-primary">
                      {activeColConfig.title}
                    </h3>
                  </div>
                  <span className={`text-[11px] font-mono font-medium px-2.5 py-0.2 rounded-full border ${activeColConfig.badgeBg}`}>
                    {colTasks.length} tasks
                  </span>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
                  {colTasks.length === 0 ? (
                    <div className="p-6 text-center text-xs font-mono text-theme-muted">
                      No tasks in {activeColConfig.title} yet.
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`rounded-xl border p-3 flex flex-col space-y-2 ${
                          task.status === 'COMPLETED'
                            ? 'border-theme bg-theme-input/60 opacity-70'
                            : 'border-theme bg-theme-card shadow-xs'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(task)}
                            className="mt-0.5 text-[#125CB9] shrink-0"
                          >
                            {task.status === 'COMPLETED' ? (
                              <CheckCircle2 className="h-4 w-4 fill-[#00D26A] text-white" />
                            ) : (
                              <Circle className="h-4 w-4 text-theme-muted" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <span
                              className={`text-xs sm:text-sm font-medium ${
                                task.status === 'COMPLETED' ? 'line-through text-theme-muted' : 'text-theme-primary'
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.description && (
                              <p className="mt-0.5 text-[11px] text-theme-secondary leading-relaxed">
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
                              className="p-1 text-theme-muted hover:text-theme-primary"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task)}
                              className="p-1 text-theme-muted hover:text-[#F43F5E]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Move Status Buttons for Mobile */}
                        <div className="pt-1.5 border-t border-theme-subtle flex items-center justify-between text-[10px] font-mono">
                          <span className="text-theme-muted">Move:</span>
                          <div className="flex gap-1.5">
                            {COLUMNS.filter((c) => c.id !== task.status).map((c) => (
                              <button
                                key={c.id}
                                onClick={() => handleMoveStatus(task.id, c.id)}
                                className="px-2.5 py-0.5 rounded-full border border-theme bg-theme-input text-theme-secondary hover:text-theme-primary"
                              >
                                {c.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Mobile Add Task Bottom */}
                <div className="p-2.5 border-t border-theme bg-theme-page shrink-0">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder={`Add to ${activeColConfig.title}...`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTask(activeColConfig.id);
                      }}
                      className="flex-1 rounded-full border border-theme bg-theme-input px-3.5 py-1.5 text-xs text-theme-primary focus:outline-none focus:border-[#125CB9]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTask(activeColConfig.id)}
                      disabled={!newTitle.trim()}
                      className="rounded-full bg-[#125CB9] p-2 text-white hover:bg-[#0E4B99] disabled:opacity-30"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Edit Task Modal Dialog */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[45px] border border-theme bg-theme-card p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-theme">
              <h3 className="font-serif text-base font-bold text-theme-primary">Edit Task</h3>
              <button
                onClick={() => setEditingTask(null)}
                className="p-1.5 text-theme-muted hover:text-theme-primary rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1">Task Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full rounded-xl border border-theme bg-theme-input px-3.5 py-2 text-xs text-theme-primary focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1">Description (optional)</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-theme bg-theme-input p-3 text-xs text-theme-primary focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1">Column Status</label>
                <div className="flex gap-1.5">
                  {COLUMNS.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setEditStatus(col.id)}
                      className={`flex-1 py-1.5 rounded-full border text-xs font-medium transition-all ${
                        editStatus === col.id
                          ? 'border-[#125CB9] bg-[#125CB9] text-white font-semibold shadow-xs'
                          : 'border-theme bg-theme-input text-theme-secondary'
                      }`}
                    >
                      {col.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2.5 border-t border-theme">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-3.5 py-1.5 rounded-full border border-theme text-xs font-medium text-theme-secondary hover:bg-theme-input"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editTitle.trim()}
                  className="px-4 py-1.5 rounded-full bg-[#125CB9] text-white hover:bg-[#0E4B99] text-xs font-medium shadow-xs disabled:opacity-40"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
