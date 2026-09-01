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
  emoji: string;
  accent: string;
  badgeBg: string;
  borderTop: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'TODO',
    title: 'To Do',
    emoji: '📝',
    accent: 'text-[#F49625]',
    badgeBg: 'bg-[#FFF9EE] border-[#FFD094]',
    borderTop: '#F49625',
  },
  {
    id: 'IN_PROGRESS',
    title: 'In Progress',
    emoji: '⚡',
    accent: 'text-[#EA5E86]',
    badgeBg: 'bg-[#FFF5F5] border-[#FCC4C0]',
    borderTop: '#EA5E86',
  },
  {
    id: 'COMPLETED',
    title: 'Completed',
    emoji: '✨',
    accent: 'text-[#037F71]',
    badgeBg: 'bg-[#F5FBEF] border-[#DDF2B8]',
    borderTop: '#037F71',
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
      toast.love('Task added to list ✨', 'Task Added');
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
        toast.love(`Completed "${task.title}" 🎉`, 'Great Job!');
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
      toast.love('Task updated ✨', 'Saved');
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

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
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
        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#FCC4C0] bg-[#FFF5F5] text-xs font-semibold text-[#EA5E86] shadow-sm">
            <Heart className="h-3.5 w-3.5 fill-current" />
            <span>{completedTotal} / {tasks.length} Done</span>
          </div>

          <button
            onClick={() => {
              setAddingToCol('TODO');
              setNewTitle('');
              setNewDescription('');
            }}
            className="flex items-center space-x-1.5 rounded-full bg-[#422F0E] px-4 py-2 text-xs sm:text-sm font-medium text-[#FAF7F2] hover:bg-[#EA5E86] transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Mobile Column Tabs (<768px) */}
      <div className="md:hidden flex gap-2 overflow-x-auto py-3 shrink-0 scrollbar-none">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const isActive = activeMobileCol === col.id;

          return (
            <button
              key={col.id}
              onClick={() => setActiveMobileCol(col.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-full border text-xs font-medium transition-all ${
                isActive
                  ? 'border-[#422F0E] bg-[#422F0E] text-[#FAF7F2] font-semibold shadow-sm'
                  : 'border-[#EFE8DC] bg-[#FFFFFF] text-[#6B5E4E] hover:bg-[#FAF7F2]'
              }`}
            >
              <span>{col.emoji}</span>
              <span>{col.title}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#FAF7F2] text-[#A89F91]'
                }`}
              >
                {colTasks.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3-Column Kanban Grid (Desktop side-by-side / Mobile single active tab) */}
      <div className="flex-1 min-h-0 pt-4 overflow-x-auto overflow-y-hidden">
        {/* Desktop 3-Column Grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 h-full items-start pb-4 max-w-6xl mx-auto">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            const isDropTarget = dragOverCol === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
                style={{ borderTopColor: col.borderTop }}
                className={`h-full flex flex-col rounded-3xl border border-[#EFE8DC] border-t-4 bg-[#FFFFFF] shadow-[0_2px_12px_rgba(66,47,14,0.03)] overflow-hidden transition-all ${
                  isDropTarget ? 'ring-2 ring-[#EA5E86] bg-[#FFF8FA]/50 scale-[1.01]' : ''
                }`}
              >
                {/* Column Header */}
                <div className="p-4 border-b border-[#EFE8DC] bg-[#FAF7F2] flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{col.emoji}</span>
                    <h3 className="font-serif text-base font-bold text-[#422F0E]">
                      {col.title}
                    </h3>
                  </div>

                  <span
                    className={`text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full border ${col.badgeBg} ${col.accent}`}
                  >
                    {colTasks.length}
                  </span>
                </div>

                {/* Tasks List */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3">
                  {colTasks.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#A89F91] border-2 border-dashed border-[#EFE8DC] rounded-2xl">
                      Drop tasks here or add one below ✨
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        className={`group relative rounded-2xl border p-3.5 transition-all cursor-grab active:cursor-grabbing ${
                          task.status === 'COMPLETED'
                            ? 'border-[#EFE8DC] bg-[#FAF7F2]/60 opacity-70'
                            : 'border-[#EFE8DC] bg-[#FFFFFF] shadow-sm hover:border-[#FCC4C0] hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Complete Toggle Checkbox */}
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(task)}
                            className="mt-0.5 text-[#EA5E86] hover:scale-110 transition-transform shrink-0"
                            title={task.status === 'COMPLETED' ? 'Mark incomplete' : 'Mark completed'}
                          >
                            {task.status === 'COMPLETED' ? (
                              <CheckCircle2 className="h-4 w-4 fill-[#037F71] text-white" />
                            ) : (
                              <Circle className="h-4 w-4 text-[#D4CEC2] hover:text-[#EA5E86]" />
                            )}
                          </button>

                          {/* Title & Description */}
                          <div className="flex-1 min-w-0">
                            <span
                              className={`text-xs sm:text-sm font-medium leading-snug break-words block ${
                                task.status === 'COMPLETED'
                                  ? 'line-through text-[#8C857B]'
                                  : 'text-[#422F0E]'
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.description && (
                              <p className="mt-1 text-[11px] text-[#A89F91] leading-relaxed break-words">
                                {task.description}
                              </p>
                            )}
                          </div>

                          {/* Action Buttons (Edit / Move / Delete) */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingTask(task);
                                setEditTitle(task.title);
                                setEditDescription(task.description || '');
                                setEditStatus(task.status);
                              }}
                              className="p-1 text-[#A89F91] hover:text-[#422F0E] rounded-full hover:bg-black/5"
                              title="Edit task"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteTask(task)}
                              className="p-1 text-[#A89F91] hover:text-[#EA5E86] rounded-full hover:bg-black/5"
                              title="Delete task"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Drag Handle & Quick Move Links */}
                        <div className="mt-2 pt-2 border-t border-[#F5EFE6] flex items-center justify-between text-[10px] font-mono text-[#A89F91]">
                          <span className="flex items-center gap-1">
                            <GripVertical className="h-3 w-3 text-[#D4CEC2]" />
                            {task.is_me ? 'You' : task.created_by.name}
                          </span>

                          <div className="flex items-center space-x-2">
                            {col.id !== 'TODO' && (
                              <button
                                onClick={() => handleMoveStatus(task.id, 'TODO')}
                                className="hover:text-[#422F0E] hover:underline"
                              >
                                ← To Do
                              </button>
                            )}
                            {col.id !== 'IN_PROGRESS' && (
                              <button
                                onClick={() => handleMoveStatus(task.id, 'IN_PROGRESS')}
                                className="hover:text-[#EA5E86] hover:underline"
                              >
                                In Progress
                              </button>
                            )}
                            {col.id !== 'COMPLETED' && (
                              <button
                                onClick={() => handleMoveStatus(task.id, 'COMPLETED')}
                                className="hover:text-[#037F71] hover:underline"
                              >
                                Done →
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Task Trigger at Column Bottom */}
                <div className="p-3 border-t border-[#EFE8DC] bg-[#FAF7F2] shrink-0">
                  {addingToCol === col.id ? (
                    <div className="space-y-2">
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
                        className="w-full rounded-full border border-[#EFE8DC] bg-white px-3.5 py-2 text-xs text-[#422F0E] focus:border-[#EA5E86] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Optional details or link..."
                        className="w-full rounded-full border border-[#EFE8DC] bg-white px-3.5 py-1.5 text-[11px] text-[#422F0E] focus:border-[#EA5E86] focus:outline-none"
                      />
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setAddingToCol(null)}
                          className="px-3 py-1 rounded-full text-xs text-[#6B5E4E] hover:bg-black/5"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddTask(col.id)}
                          className="px-4 py-1 rounded-full bg-[#422F0E] text-white hover:bg-[#EA5E86] text-xs font-medium"
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
                      className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-full border border-dashed border-[#D4CEC2] bg-white/60 hover:bg-white text-xs font-medium text-[#6B5E4E] hover:text-[#422F0E] transition-all"
                    >
                      <Plus className="h-3.5 w-3.5 text-[#EA5E86]" />
                      <span>Add to {col.title}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Single Column View (<768px) */}
        <div className="md:hidden h-full flex flex-col rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] shadow-sm overflow-hidden">
          {(() => {
            const activeColConfig = COLUMNS.find((c) => c.id === activeMobileCol) || COLUMNS[0];
            const colTasks = tasks.filter((t) => t.status === activeColConfig.id);

            return (
              <>
                <div className="p-4 border-b border-[#EFE8DC] bg-[#FAF7F2] flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{activeColConfig.emoji}</span>
                    <h3 className="font-serif text-lg font-bold text-[#422F0E]">
                      {activeColConfig.title}
                    </h3>
                  </div>
                  <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full border ${activeColConfig.badgeBg} ${activeColConfig.accent}`}>
                    {colTasks.length} tasks
                  </span>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                  {colTasks.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#A89F91]">
                      No tasks in {activeColConfig.title} yet.
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`rounded-2xl border p-3.5 flex flex-col space-y-2.5 ${
                          task.status === 'COMPLETED'
                            ? 'border-[#EFE8DC] bg-[#FAF7F2]/60 opacity-70'
                            : 'border-[#EFE8DC] bg-[#FFFFFF] shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(task)}
                            className="mt-0.5 text-[#EA5E86] shrink-0"
                          >
                            {task.status === 'COMPLETED' ? (
                              <CheckCircle2 className="h-5 w-5 fill-[#037F71] text-white" />
                            ) : (
                              <Circle className="h-5 w-5 text-[#D4CEC2]" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <span
                              className={`text-sm font-medium ${
                                task.status === 'COMPLETED' ? 'line-through text-[#8C857B]' : 'text-[#422F0E]'
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.description && (
                              <p className="mt-1 text-xs text-[#A89F91] leading-relaxed">
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
                              className="p-1 text-[#A89F91] hover:text-[#422F0E]"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task)}
                              className="p-1 text-[#A89F91] hover:text-[#EA5E86]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Move Status Buttons for Mobile */}
                        <div className="pt-2 border-t border-[#F5EFE6] flex items-center justify-between text-[11px] font-mono">
                          <span className="text-[#A89F91]">Move to:</span>
                          <div className="flex gap-2">
                            {COLUMNS.filter((c) => c.id !== task.status).map((c) => (
                              <button
                                key={c.id}
                                onClick={() => handleMoveStatus(task.id, c.id)}
                                className="px-2.5 py-1 rounded-full border border-[#EFE8DC] bg-[#FAF7F2] text-[#422F0E] hover:bg-[#F2ECE1]"
                              >
                                {c.emoji} {c.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Mobile Add Task Bottom */}
                <div className="p-3 border-t border-[#EFE8DC] bg-[#FAF7F2] shrink-0">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder={`Add task to ${activeColConfig.title}...`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTask(activeColConfig.id);
                      }}
                      className="flex-1 rounded-full border border-[#EFE8DC] bg-white px-4 py-2 text-xs text-[#422F0E] focus:outline-none focus:border-[#EA5E86]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTask(activeColConfig.id)}
                      disabled={!newTitle.trim()}
                      className="rounded-full bg-[#422F0E] p-2 text-white hover:bg-[#EA5E86] disabled:opacity-30"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[3px]">
          <div className="w-full max-w-md rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] p-6 shadow-xl animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE8DC]">
              <h3 className="font-serif text-xl font-bold text-[#422F0E]">Edit Task</h3>
              <button
                onClick={() => setEditingTask(null)}
                className="p-1.5 text-[#A89F91] hover:text-[#422F0E] rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#6B5E4E] mb-1.5">Task Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full rounded-full border border-[#EFE8DC] bg-[#FAF7F2] px-4 py-2 text-xs sm:text-sm text-[#422F0E] focus:border-[#EA5E86] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6B5E4E] mb-1.5">Description (optional)</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-[#EFE8DC] bg-[#FAF7F2] p-3 text-xs text-[#422F0E] focus:border-[#EA5E86] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6B5E4E] mb-1.5">Column Status</label>
                <div className="flex gap-2">
                  {COLUMNS.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setEditStatus(col.id)}
                      className={`flex-1 py-2 rounded-full border text-xs font-medium transition-all ${
                        editStatus === col.id
                          ? 'border-[#422F0E] bg-[#422F0E] text-white font-semibold'
                          : 'border-[#EFE8DC] bg-[#FAF7F2] text-[#6B5E4E]'
                      }`}
                    >
                      {col.emoji} {col.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EFE8DC]">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-5 py-2 rounded-full border border-[#EFE8DC] text-xs font-medium text-[#6B5E4E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editTitle.trim()}
                  className="px-6 py-2 rounded-full bg-[#422F0E] text-white hover:bg-[#EA5E86] text-xs font-medium shadow-sm disabled:opacity-40"
                >
                  Save Changes ✨
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
