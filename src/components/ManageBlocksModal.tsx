import React, { useState } from 'react';
import {
  X,
  Layers,
  Plus,
  Edit3,
  Trash2,
  AlertCircle,
  Check,
  Home,
  Shield,
} from 'lucide-react';
import type { BlockConfig, DatabaseState } from '../types/finance';

interface ManageBlocksModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
  onAddBlock: (block: BlockConfig) => Promise<void>;
  onUpdateBlock: (id: string, updates: Partial<BlockConfig>) => Promise<void>;
  onDeleteBlock: (id: string) => Promise<void>;
  onAddStreet?: (name: string) => Promise<void>;
  onDeleteStreet?: (name: string) => Promise<void>;
}

export const ManageBlocksModal: React.FC<ManageBlocksModalProps> = ({
  isOpen,
  onClose,
  state,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
}) => {
  // Add block state
  const [newBlockId, setNewBlockId] = useState('');
  const [newBlockName, setNewBlockName] = useState('');
  const [addingBlock, setAddingBlock] = useState(false);

  // Edit block state
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editBlockName, setEditBlockName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // General state
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentBlocks: BlockConfig[] = state.settings.customBlocks || [
    { id: 'B3', name: 'Blok B3' },
    { id: 'B5', name: 'Blok B5' },
    { id: 'B6', name: 'Blok B6' },
    { id: 'B7', name: 'Blok B7' },
    { id: 'B8', name: 'Blok B8' },
  ];

  // Helper to count residents per block
  const getResidentCountForBlock = (blockId: string) => {
    const cleanId = blockId.toUpperCase();
    return state.residents.filter(
      (r) => r.block.toUpperCase() === cleanId || r.id.startsWith(`${cleanId}-`)
    ).length;
  };

  const handleStartEdit = (b: BlockConfig) => {
    setError(null);
    setSuccessMessage(null);
    setEditingBlockId(b.id);
    setEditBlockName(b.name);
  };

  const handleCancelEdit = () => {
    setEditingBlockId(null);
    setEditBlockName('');
  };

  const handleSaveEdit = async (id: string) => {
    setError(null);
    setSuccessMessage(null);
    const cleanName = editBlockName.trim();
    if (!cleanName) {
      setError('Nama blok tidak boleh kosong.');
      return;
    }

    setSavingEdit(true);
    try {
      await onUpdateBlock(id, {
        name: cleanName,
      });
      setSuccessMessage(`Blok ${id} berhasil diperbarui.`);
      setEditingBlockId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui blok');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanId = newBlockId.trim().toUpperCase();
    const cleanName = newBlockName.trim() || `Blok ${cleanId}`;

    if (!cleanId) {
      setError('Kode blok (contoh: B3, B9, C) wajib diisi.');
      return;
    }

    if (currentBlocks.some((b) => b.id.toUpperCase() === cleanId)) {
      setError(`Blok dengan kode '${cleanId}' sudah terdaftar.`);
      return;
    }

    setAddingBlock(true);
    try {
      await onAddBlock({
        id: cleanId,
        name: cleanName,
      });
      setSuccessMessage(`Blok ${cleanId} berhasil ditambahkan!`);
      setNewBlockId('');
      setNewBlockName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambahkan blok');
    } finally {
      setAddingBlock(false);
    }
  };

  const handleDeleteBlockClick = async (id: string) => {
    setError(null);
    setSuccessMessage(null);

    const count = getResidentCountForBlock(id);
    if (count > 0) {
      setError(`Blok ${id} tidak dapat dihapus karena masih ada ${count} data warga terdaftar di blok ini.`);
      return;
    }

    if (!window.confirm(`Yakin ingin menghapus Blok ${id}?`)) {
      return;
    }

    setDeletingId(id);
    try {
      await onDeleteBlock(id);
      setSuccessMessage(`Blok ${id} berhasil dihapus.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus blok');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-blocks-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50/90 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900 text-white shadow-xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 id="manage-blocks-title" className="font-display text-base font-bold text-slate-900">
                Kelola Blok Perumahan
              </h2>
              <p className="text-xs text-slate-500">
                Atur susunan blok hunian lingkungan (B3, B5, B6, B7, B8)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-stone-200/70 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Alerts */}
        <div className="px-5 pt-3">
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {successMessage && (
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 animate-in fade-in">
              <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Form Add New Block */}
          <form
            onSubmit={handleAddBlockSubmit}
            className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-3"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-emerald-800" />
              <span>Tambah Blok Baru</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Blok (Singkat) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: B9"
                  value={newBlockId}
                  onChange={(e) => setNewBlockId(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-900 focus:border-emerald-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Label / Nama Blok
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Blok B9"
                  value={newBlockName}
                  onChange={(e) => setNewBlockName(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-800 focus:outline-none font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={addingBlock}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{addingBlock ? 'Menambahkan...' : 'Tambah Blok'}</span>
              </button>
            </div>
          </form>

          {/* List of current blocks */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
              <span>Daftar Blok Terdaftar ({currentBlocks.length})</span>
            </h3>

            <div className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white overflow-hidden shadow-2xs">
              {currentBlocks.map((b) => {
                const isEditing = editingBlockId === b.id;
                const residentCount = getResidentCountForBlock(b.id);

                return (
                  <div
                    key={b.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/50 transition-colors"
                  >
                    {isEditing ? (
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-md">
                            {b.id}
                          </span>
                          <input
                            type="text"
                            value={editBlockName}
                            onChange={(e) => setEditBlockName(e.target.value)}
                            placeholder="Nama blok"
                            className="flex-1 rounded-lg border border-stone-300 px-3 py-1 text-xs text-slate-900"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            disabled={savingEdit}
                            onClick={() => handleSaveEdit(b.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-900 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                          >
                            <Check className="h-3 w-3" />
                            <span>Simpan</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 font-mono text-xs font-bold text-emerald-900 border border-emerald-200">
                            {b.id}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              <span>{b.name}</span>
                              <span className="text-[11px] font-normal text-slate-400">
                                ({residentCount} unit terdaftar)
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(b)}
                            className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-stone-50 cursor-pointer"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Ubah</span>
                          </button>

                          <button
                            type="button"
                            disabled={deletingId === b.id || residentCount > 0}
                            onClick={() => handleDeleteBlockClick(b.id)}
                            title={
                              residentCount > 0
                                ? 'Tidak bisa dihapus karena masih ada unit warga di blok ini'
                                : 'Hapus blok ini'
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-stone-200 bg-stone-50 px-5 py-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Perubahan blok tersinkronisasi otomatis ke direktori warga
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
