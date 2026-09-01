'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { todosApi } from '@/lib/api';
import { TodoCategory, TodoItem } from '@/types';
import {
  Plus,
  Check,
  Trash2,
  MoreVertical,
  MoveRight,
  Sparkles,
  Heart,
  Calendar,
  CheckCircle2,
  Circle,
  X,
  ListTodo,
} from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';

const PRESET_EMOJIS = ['📍', '🍜', '🎬', '🛹', '💡', '✈️', '🏖️', '🍰', '🎮', '🏠', '🎁', '✨'];
const PRESET_COLORS = ['#AECFD0', '#FFD094', '#F9D4F8', '#DDF2B8', '#F7E9B2', '#FCC4C0', '#57B1A8'];

export const TodoKanbanView: React.FC = () => {
  const { profile, partner } = useAuth();
  const { toast, confirm } = useToast();
  const [categories, setCategories] = useState<TodoCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMobileColId, setActiveMobileColId] = useState<string | null>(null);

  // New Item modal / inline state
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');

  // New Category modal
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCatTitle, setNewCatTitle] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('📍');
  const [newCatColor, setNewCatColor] = useState('#AECFD0');

  const channelRef = useRef<RealtimeChannel | null>(null);
  const duoId = profile?.active_duo_id;

  const fetchBoard = useCallback(async () => {
    try {
      const res = await todosApi.getBoard();
      setCategories(res.categories || []);
      if (res.categories && res.categories.length > 0 && !activeMobileColId) {
        setActiveMobileColId(res.categories[0].id);
      }
    } catch (err) {
      console.warn('Failed to load To-Do board:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeMobileColId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // Real-time channel sync for To-Dos
  useEffect(() => {
    if (!isSupabaseConfigured() || !duoId) return;

    const channel = supabase.channel(`todos:${duoId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'todos_updated' }, () => {
      fetchBoard();
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [duoId, fetchBoard]);

  const broadcastUpdate = () => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'todos_updated',
        payload: {},
      });
    }
  };

  // Add Item to Category
  const handleAddItem = async (categoryId: string) => {
    if (!newItemTitle.trim()) return;

    try {
      const item = await todosApi.createItem({
        category_id: categoryId,
        title: newItemTitle.trim(),
        description: newItemDesc.trim(),
      });

      setCategories((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, items: [...c.items, item] } : c))
      );

      setNewItemTitle('');
      setNewItemDesc('');
      setAddingToCategory(null);
      toast.love('Item added to list ✨', 'To-Do Added');
      broadcastUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add item.', 'Error');
    }
  };

  // Toggle Item Complete
  const handleToggleComplete = async (item: TodoItem) => {
    const nextStatus = !item.is_completed;

    setCategories((prev) =>
      prev.map((c) =>
        c.id === item.category_id
          ? {
              ...c,
              items: c.items.map((it) =>
                it.id === item.id ? { ...it, is_completed: nextStatus } : it
              ),
            }
          : c
      )
    );

    try {
      await todosApi.updateItem(item.id, { is_completed: nextStatus });
      if (nextStatus) {
        toast.love(`Checked off "${item.title}" 💕`, 'Done!');
      }
      broadcastUpdate();
    } catch (err: any) {
      toast.error('Failed to update item.', 'Error');
      fetchBoard();
    }
  };

  // Move Item to Another Category
  const handleMoveItem = async (itemId: string, currentCatId: string, newCatId: string) => {
    try {
      await todosApi.updateItem(itemId, { category_id: newCatId });
      toast.love('Item moved between boards ✨', 'Moved');
      fetchBoard();
      broadcastUpdate();
    } catch (err: any) {
      toast.error('Failed to move item.', 'Error');
    }
  };

  // Delete Item
  const handleDeleteItem = async (itemId: string, categoryId: string) => {
    const ok = await confirm({
      title: 'Delete Item?',
      message: 'Remove this item from your shared bucket list.',
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!ok) return;

    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId ? { ...c, items: c.items.filter((it) => it.id !== itemId) } : c
      )
    );

    try {
      await todosApi.deleteItem(itemId);
      toast.love('Item removed.', 'Deleted');
      broadcastUpdate();
    } catch (err: any) {
      toast.error('Failed to delete item.', 'Error');
      fetchBoard();
    }
  };

  // Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatTitle.trim()) return;

    try {
      const cat = await todosApi.createCategory({
        title: newCatTitle.trim(),
        emoji: newCatEmoji,
        color: newCatColor,
      });

      setCategories((prev) => [...prev, cat]);
      setNewCatTitle('');
      setShowNewCategoryModal(false);
      toast.love(`Created board: ${cat.emoji} ${cat.title}`, 'Board Created');
      broadcastUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create board.', 'Error');
    }
  };

  // Delete Category
  const handleDeleteCategory = async (categoryId: string, title: string) => {
    const ok = await confirm({
      title: `Delete "${title}"?`,
      message: 'This will delete the board and all items inside it.',
      confirmText: 'Delete Board',
      type: 'danger',
    });
    if (!ok) return;

    try {
      await todosApi.deleteCategory(categoryId);
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      toast.love('Board deleted.', 'Deleted');
      broadcastUpdate();
    } catch (err: any) {
      toast.error('Failed to delete board.', 'Error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <Heart className="h-6 w-6 text-[#EA5E86] animate-bounce mx-auto" />
          <p className="text-xs font-mono text-[#A89F91]">Opening our bucket lists...</p>
        </div>
      </div>
    );
  }

  const activeMobileCat = categories.find((c) => c.id === activeMobileColId) || categories[0];

  return (
    <div className="w-full h-full flex flex-col p-3 sm:p-6 lg:p-8 min-h-0 overflow-hidden">
      {/* Top Header */}
      <div className="pb-5 border-b border-[#EFE8DC] flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-[#A89F91]">
            <Sparkles className="h-3.5 w-3.5 text-[#F49625]" />
            <span>Shared Bucket Lists & Plans</span>
          </div>
          <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-[#422F0E]">
            Our Bucket List Board
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#6B5E4E]">
            Places to explore, foods to taste, and adventures to make together.
          </p>
        </div>

        <button
          onClick={() => setShowNewCategoryModal(true)}
          className="flex items-center space-x-2 rounded-full bg-[#422F0E] px-5 py-2.5 text-xs sm:text-sm font-medium text-[#FAF7F2] hover:bg-[#EA5E86] transition-all shadow-sm self-start sm:self-auto shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New List</span>
        </button>
      </div>

      {/* Mobile Column Tabs (<768px) */}
      <div className="md:hidden flex gap-2 overflow-x-auto py-3 shrink-0 scrollbar-none">
        {categories.map((cat) => {
          const isActive = (activeMobileCat?.id === cat.id);
          const doneCount = cat.items.filter((i) => i.is_completed).length;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveMobileColId(cat.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full border text-xs whitespace-nowrap transition-all ${
                isActive
                  ? 'border-[#422F0E] bg-[#422F0E] text-[#FAF7F2] font-semibold shadow-sm'
                  : 'border-[#EFE8DC] bg-[#FFFFFF] text-[#6B5E4E] hover:bg-[#FAF7F2]'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.title}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-[#FAF7F2] text-[#A89F91]'}`}>
                {doneCount}/{cat.items.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Columns Stream (Desktop side-by-side / Mobile single active column) */}
      <div className="flex-1 min-h-0 pt-4 overflow-x-auto overflow-y-hidden">
        {/* Desktop Grid Layout */}
        <div className="hidden md:flex gap-5 h-full items-start pb-4">
          {categories.map((cat) => {
            const completedCount = cat.items.filter((i) => i.is_completed).length;

            return (
              <div
                key={cat.id}
                className="w-80 max-w-[320px] h-full flex flex-col rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] shadow-[0_2px_12px_rgba(66,47,14,0.03)] shrink-0 overflow-hidden"
              >
                {/* Column Header */}
                <div
                  style={{ borderTopColor: cat.color || '#EA5E86' }}
                  className="p-4 border-t-4 border-b border-[#EFE8DC] bg-[#FAF7F2] flex items-center justify-between shrink-0"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-lg">{cat.emoji}</span>
                    <h3 className="font-serif text-base font-bold text-[#422F0E] truncate">
                      {cat.title}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] font-mono text-[#A89F91] px-2 py-0.5 rounded-full bg-white border border-[#EFE8DC]">
                      {completedCount}/{cat.items.length}
                    </span>
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.title)}
                      className="p-1 text-[#A89F91] hover:text-[#EA5E86] rounded-full hover:bg-black/5"
                      title="Delete board"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Items List */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
                  {cat.items.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#A89F91]">
                      No items yet. Add something fun!
                    </div>
                  ) : (
                    cat.items.map((item) => (
                      <div
                        key={item.id}
                        className={`group relative rounded-2xl border p-3 transition-all ${
                          item.is_completed
                            ? 'border-[#EFE8DC] bg-[#FAF7F2]/60 opacity-60'
                            : 'border-[#EFE8DC] bg-[#FFFFFF] shadow-sm hover:border-[#FCC4C0]'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(item)}
                            className="mt-0.5 text-[#EA5E86] hover:scale-110 transition-transform shrink-0"
                          >
                            {item.is_completed ? (
                              <CheckCircle2 className="h-4 w-4 fill-[#EA5E86] text-white" />
                            ) : (
                              <Circle className="h-4 w-4 text-[#D4CEC2] hover:text-[#EA5E86]" />
                            )}
                          </button>

                          {/* Title & Desc */}
                          <div className="flex-1 min-w-0">
                            <span
                              className={`text-xs sm:text-sm font-medium leading-snug break-words ${
                                item.is_completed ? 'line-through text-[#8C857B]' : 'text-[#422F0E]'
                              }`}
                            >
                              {item.title}
                            </span>
                            {item.description && (
                              <p className="mt-1 text-[11px] text-[#A89F91] leading-relaxed break-words">
                                {item.description}
                              </p>
                            )}
                          </div>

                          {/* Quick Actions (Move & Delete) */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 shrink-0">
                            {/* Move to another category dropdown */}
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleMoveItem(item.id, cat.id, e.target.value);
                                }
                              }}
                              className="text-[10px] font-mono rounded-full border border-[#EFE8DC] bg-white text-[#6B5E4E] px-1.5 py-0.5 focus:outline-none"
                              title="Move to list"
                            >
                              <option value="" disabled>
                                Move...
                              </option>
                              {categories
                                .filter((c) => c.id !== cat.id)
                                .map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.emoji} {c.title}
                                  </option>
                                ))}
                            </select>

                            <button
                              onClick={() => handleDeleteItem(item.id, cat.id)}
                              className="p-1 text-[#A89F91] hover:text-[#EA5E86] rounded-full hover:bg-black/5"
                              title="Delete item"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Item Bottom Trigger */}
                <div className="p-3 border-t border-[#EFE8DC] bg-[#FAF7F2] shrink-0">
                  {addingToCategory === cat.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newItemTitle}
                        onChange={(e) => setNewItemTitle(e.target.value)}
                        placeholder="What's the idea? ✨"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddItem(cat.id);
                          if (e.key === 'Escape') setAddingToCategory(null);
                        }}
                        className="w-full rounded-full border border-[#EFE8DC] bg-white px-3.5 py-2 text-xs text-[#422F0E] focus:border-[#EA5E86] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={newItemDesc}
                        onChange={(e) => setNewItemDesc(e.target.value)}
                        placeholder="Add a tiny note or link (optional)"
                        className="w-full rounded-full border border-[#EFE8DC] bg-white px-3.5 py-1.5 text-[11px] text-[#422F0E] focus:border-[#EA5E86] focus:outline-none"
                      />
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setAddingToCategory(null)}
                          className="px-3 py-1 rounded-full text-xs text-[#6B5E4E] hover:bg-black/5"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddItem(cat.id)}
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
                        setAddingToCategory(cat.id);
                        setNewItemTitle('');
                        setNewItemDesc('');
                      }}
                      className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-full border border-dashed border-[#D4CEC2] bg-white/60 hover:bg-white text-xs font-medium text-[#6B5E4E] hover:text-[#422F0E] transition-all"
                    >
                      <Plus className="h-3.5 w-3.5 text-[#EA5E86]" />
                      <span>Add item</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Single Column View (<768px) */}
        {activeMobileCat && (
          <div className="md:hidden h-full flex flex-col rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#EFE8DC] bg-[#FAF7F2] flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2 truncate">
                <span className="text-xl">{activeMobileCat.emoji}</span>
                <h3 className="font-serif text-lg font-bold text-[#422F0E] truncate">
                  {activeMobileCat.title}
                </h3>
              </div>
              <button
                onClick={() => handleDeleteCategory(activeMobileCat.id, activeMobileCat.title)}
                className="p-1.5 text-[#A89F91] hover:text-[#EA5E86] rounded-full"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              {activeMobileCat.items.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#A89F91]">
                  No items in this list yet.
                </div>
              ) : (
                activeMobileCat.items.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-3.5 flex items-start gap-3 ${
                      item.is_completed
                        ? 'border-[#EFE8DC] bg-[#FAF7F2]/60 opacity-60'
                        : 'border-[#EFE8DC] bg-[#FFFFFF] shadow-sm'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(item)}
                      className="mt-0.5 text-[#EA5E86] shrink-0"
                    >
                      {item.is_completed ? (
                        <CheckCircle2 className="h-5 w-5 fill-[#EA5E86] text-white" />
                      ) : (
                        <Circle className="h-5 w-5 text-[#D4CEC2]" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-sm font-medium ${
                          item.is_completed ? 'line-through text-[#8C857B]' : 'text-[#422F0E]'
                        }`}
                      >
                        {item.title}
                      </span>
                      {item.description && (
                        <p className="mt-1 text-xs text-[#A89F91] leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteItem(item.id, activeMobileCat.id)}
                      className="p-1.5 text-[#A89F91] hover:text-[#EA5E86] rounded-full shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Mobile Add Item */}
            <div className="p-3 border-t border-[#EFE8DC] bg-[#FAF7F2] shrink-0">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder={`Add to ${activeMobileCat.title}...`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddItem(activeMobileCat.id);
                  }}
                  className="flex-1 rounded-full border border-[#EFE8DC] bg-white px-4 py-2 text-xs text-[#422F0E] focus:outline-none focus:border-[#EA5E86]"
                />
                <button
                  type="button"
                  onClick={() => handleAddItem(activeMobileCat.id)}
                  disabled={!newItemTitle.trim()}
                  className="rounded-full bg-[#422F0E] p-2 text-white hover:bg-[#EA5E86] disabled:opacity-30"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Category Modal Dialog */}
      {showNewCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[3px]">
          <div className="w-full max-w-md rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#EFE8DC]">
              <h3 className="font-serif text-xl font-bold text-[#422F0E]">Create New Bucket List</h3>
              <button
                onClick={() => setShowNewCategoryModal(false)}
                className="p-1.5 text-[#A89F91] hover:text-[#422F0E] rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-medium text-[#6B5E4E] mb-1.5">List Title</label>
                <input
                  type="text"
                  value={newCatTitle}
                  onChange={(e) => setNewCatTitle(e.target.value)}
                  placeholder="e.g. Dream Trips / Coffee Shops"
                  required
                  className="w-full rounded-full border border-[#EFE8DC] bg-[#FAF7F2] px-4 py-2.5 text-xs sm:text-sm text-[#422F0E] focus:border-[#EA5E86] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6B5E4E] mb-1.5">Choose Emoji Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setNewCatEmoji(em)}
                      className={`h-10 rounded-2xl border text-lg transition-all ${
                        newCatEmoji === em
                          ? 'border-[#422F0E] bg-[#FFF8FA] ring-2 ring-[#FCC4C0]'
                          : 'border-[#EFE8DC] bg-[#FAF7F2]'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewCategoryModal(false)}
                  className="px-5 py-2 rounded-full border border-[#EFE8DC] text-xs font-medium text-[#6B5E4E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCatTitle.trim()}
                  className="px-6 py-2 rounded-full bg-[#422F0E] text-white hover:bg-[#EA5E86] text-xs font-medium shadow-sm disabled:opacity-40"
                >
                  Create List ✨
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
