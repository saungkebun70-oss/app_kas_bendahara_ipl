import React, { useState } from 'react';
import {
  X,
  Layers,
  Plus,
  Edit3,
  Trash2,
  AlertCircle,
  Check,
  MapPin,
  Home,
  Shield,
  HelpCircle,
} from 'lucide-react';
import type { BlockConfig, DatabaseState } from '../types/finance';

interface ManageBlocksModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
  onAddBlock: (block: BlockConfig) => Promise<void>;
  onUpdateBlock: (id: string, updates: Partial<BlockConfig>) => Promise<void>;
  onDeleteBlock: (id: string) => Promise<void>;
  onAddStreet: (name: string) => Promise<void>;
  onDeleteStreet: (name: string) => Promise<void>;
}

export const ManageBlocksModal: React.FC<ManageBlocksModalProps> = ({
  isOpen,
  onClose,
  state,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  onAddStreet,
  onDeleteStreet,
}) => {
  const [activeTab, setActiveTab] = useState<'blocks' | 'streets'>('blocks');

  // Add block state
  const [newBlockId, setNewBlockId] = useState('');
  const [newBlockName, setNewBlockName] = useState('');
  const [newBlockStreet, setNewBlockStreet] = useState('Gang Duren');
  const [addingBlock, setAddingBlock] = useState(false);

  // Edit block state
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editBlockName, setEditBlockName] = useState('');
  const [editBlockStreet, setEditBlockStreet] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Add street state
  const [newStreetName, setNewStreetName] = useState('');
  const [addingStreet, setAddingStreet] = useState(false);

  // General state
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentBlocks: BlockConfig[] = state.settings.customBlocks || [
    { id: 'A', name: 'Blok A', defaultStreet: 'Gang Duren' },
    { id: 'B1', name: 'Blok B1', defaultStreet: 'Gang Anggur' },
    { id: 'B2', name: 'Blok B2', defaultStreet: 'Gang Anggur' },
    { id: 'B3', name: 'Blok B3', defaultStreet: 'Gang Anggur' },
    { id: 'B4', name: 'Blok B4', defaultStreet: 'Gang Duren' },
    { id: 'B5', name: 'Blok B5', defaultStreet: 'Gang Duren' },
    { id: 'B6', name: 'Blok B6', defaultStreet: 'Gang Duren' },
    { id: 'B7', name: 'Blok B7', defaultStreet: 'Gang Anggur' },
    { id: 'B8', name: 'Blok B8', defaultStreet: 'Gang Anggur' },
    { id: 'B9', name: 'Blok B9', defaultStreet: 'Gang Anggur' },
    { id: 'C', name: 'Blok C', defaultStreet: 'Gang Duren' },
    { id: 'D', name: 'Blok D', defaultStreet: 'Gang Anggur' },
  ];

  const currentStreets: string[] = state.settings.customStreets || [
    'Gang Duren',
    'Gang Anggur',
  ];

  // Helper to count residents per block
  const getResidentCountForBlock = (blockId: string) => {
    const cleanId = blockId.toUpperCase();
    return state.residents.filter(
      (r) => r.block.toUpperCase() === cleanId || r.id.startsWith(`${cleanId}-`)
    ).length;
  };

  // Helper to count residents per street
  const getResidentCountForStreet = (street: string) => {
    return state.residents.filter(
      (r) => r.streetName.toLowerCase() === street.toLowerCase()
    ).length;
  };

  const handleStartEdit = (b: BlockConfig) => {
    setError(null);
    setSuccessMessage(null);
    setEditingBlockId(b.id);
    setEditBlockName(b.name);
    setEditBlockStreet(b.defaultStreet || currentStreets[0] || 'Gang Duren');
  };

  const handleCancelEdit = () => {
    setEditingBlockId(null);
    setEditBlockName('');
    setEditBlockStreet('');
  };

  const handleSaveEdit = async (id: string) => {
    setError(null);
    if (!editBlockName.trim()) {
      setError('Nama blok tidak boleh kosong.');
      return;
    }
    setSavingEdit(true);
    try {
      await onUpdateBlock(id, {
        name: editBlockName.trim(),
        defaultStreet: editBlockStreet.trim(),
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
    if (!cleanId) {
      setError('Kode blok wajib diisi (contoh: B10, E, Blok F).');
      return;
    }

    if (currentBlocks.some((b) => b.id.toUpperCase() === cleanId)) {
      setError(`Kode Blok ${cleanId} sudah ada dalam daftar.`);
      return;
    }

    const cleanName = newBlockName.trim() || `Blok ${cleanId}`;
    setAddingBlock(true);
    try {
      await onAddBlock({
        id: cleanId,
        name: cleanName,
        defaultStreet: newBlockStreet.trim() || currentStreets[0] || 'Gang Duren',
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
    if (id.toUpperCase() === 'A') {
      setError('Blok A dilindungi karena merupakan blok pengurus lingkungan.');
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

  const handleAddStreetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanName = newStreetName.trim();
    if (!cleanName) {
      setError('Nama Gang / Jalan wajib diisi.');
      return;
    }

    if (currentStreets.some((s) => s.toLowerCase() === cleanName.toLowerCase())) {
      setError(`Nama '${cleanName}' sudah terdaftar.`);
      return;
    }

    setAddingStreet(true);
    try {
      await onAddStreet(cleanName);
      setSuccessMessage(`Nama '${cleanName}' berhasil ditambahkan ke daftar pilihan jalan.`);
      setNewStreetName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambahkan nama jalan');
    } finally {
      setAddingStreet(false);
    }
  };

  const handleDeleteStreetClick = async (street: string) => {
    setError(null);
    setSuccessMessage(null);

    if (street === 'Gang Duren' || street === 'Gang Anggur') {
      setError(`'${street}' adalah nama gang standar dan tidak dapat dihapus.`);
      return;
    }

    if (!window.confirm(`Yakin ingin menghapus '${street}' dari daftar pilihan jalan?`)) {
      return;
    }

    try {
      await onDeleteStreet(street);
      setSuccessMessage(`'${street}' berhasil dihapus.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus nama jalan');
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
                Kelola Blok &amp; Nama Gang
              </h2>
              <p className="text-xs text-slate-500">
                Atur daftar blok (B1, B2, ..., B9) dan nama gang (Gang Duren, Gang Anggur)
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

        {/* Tab switch */}
        <div className="flex border-b border-stone-200 bg-stone-100/70 px-5 pt-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('blocks');
              setError(null);
            }}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'blocks'
                ? 'border-emerald-800 text-emerald-900 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Home className="h-4 w-4" />
            <span>Daftar Blok ({currentBlocks.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('streets');
              setError(null);
            }}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'streets'
                ? 'border-emerald-800 text-emerald-900 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span>Nama Gang / Jalan ({currentStreets.length})</span>
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {activeTab === 'blocks' ? (
            <div className="space-y-5">
              {/* Add New Block Form */}
              <form
                onSubmit={handleAddBlockSubmit}
                className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Plus className="h-4 w-4 text-emerald-800" />
                    <span>Tambah Blok Baru (Misal: B1, B2, ..., B9)</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Kode Blok *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Misal: B1"
                      value={newBlockId}
                      onChange={(e) => setNewBlockId(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase text-slate-900 focus:border-emerald-800 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nama Tampilan
                    </label>
                    <input
                      type="text"
                      placeholder="Misal: Blok B1"
                      value={newBlockName}
                      onChange={(e) => setNewBlockName(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Default Nama Gang
                    </label>
                    <select
                      value={newBlockStreet}
                      onChange={(e) => setNewBlockStreet(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
                    >
                      {currentStreets.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2 flex items-end">
                    <button
                      type="submit"
                      disabled={addingBlock}
                      className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{addingBlock ? '...' : 'Tambah'}</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Block List Table */}
              <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-3.5 py-2.5">Kode</th>
                      <th className="px-3.5 py-2.5">Nama Blok</th>
                      <th className="px-3.5 py-2.5">Default Gang / Jalan</th>
                      <th className="px-3.5 py-2.5 text-center">Warga</th>
                      <th className="px-3.5 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {currentBlocks.map((b) => {
                      const count = getResidentCountForBlock(b.id);
                      const isEditing = editingBlockId === b.id;
                      const isProtected = b.id.toUpperCase() === 'A';

                      return (
                        <tr key={b.id} className="hover:bg-stone-50/70 transition-colors">
                          <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                            <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200 font-mono text-xs">
                              {b.id}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 font-medium text-slate-800">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editBlockName}
                                onChange={(e) => setEditBlockName(e.target.value)}
                                className="rounded border border-stone-300 px-2 py-1 text-xs text-slate-900 w-full max-w-[140px]"
                              />
                            ) : (
                              <span>{b.name}</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-600">
                            {isEditing ? (
                              <select
                                value={editBlockStreet}
                                onChange={(e) => setEditBlockStreet(e.target.value)}
                                className="rounded border border-stone-300 px-2 py-1 text-xs text-slate-900 w-full max-w-[150px]"
                              >
                                {currentStreets.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-emerald-800 shrink-0" />
                                {b.defaultStreet || '-'}
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            <span className="inline-block rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              {count} unit
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(b.id)}
                                  disabled={savingEdit}
                                  className="rounded bg-emerald-800 text-white px-2 py-1 text-[11px] font-semibold hover:bg-emerald-700 cursor-pointer"
                                >
                                  {savingEdit ? '...' : 'Simpan'}
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  className="rounded bg-stone-200 text-slate-700 px-2 py-1 text-[11px] font-semibold hover:bg-stone-300 cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(b)}
                                  title="Edit Nama Blok"
                                  className="rounded p-1 text-slate-600 hover:bg-stone-200/80 hover:text-slate-900 transition-colors cursor-pointer"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                {!isProtected && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBlockClick(b.id)}
                                    disabled={deletingId === b.id || count > 0}
                                    title={
                                      count > 0
                                        ? `Masih ada ${count} warga terdaftar pada blok ini`
                                        : 'Hapus Blok'
                                    }
                                    className="rounded p-1 text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Add New Street / Gang Form */}
              <form
                onSubmit={handleAddStreetSubmit}
                className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Plus className="h-4 w-4 text-emerald-800" />
                    <span>Tambah Nama Gang / Jalan Baru</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Gang Duren, Gang Anggur, Gang Mangga..."
                    value={newStreetName}
                    onChange={(e) => setNewStreetName(e.target.value)}
                    className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={addingStreet}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-900 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{addingStreet ? 'Menyimpan...' : 'Tambah Gang'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Nama gang yang ditambahkan akan otomatis muncul di formulir pendaftaran warga dan pengaturan blok.
                </p>
              </form>

              {/* Streets List Table */}
              <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-3.5 py-2.5">Nama Gang / Jalan</th>
                      <th className="px-3.5 py-2.5 text-center">Warga Menghuni</th>
                      <th className="px-3.5 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {currentStreets.map((street) => {
                      const count = getResidentCountForStreet(street);
                      const isDefaultStandard = street === 'Gang Duren' || street === 'Gang Anggur';

                      return (
                        <tr key={street} className="hover:bg-stone-50/70 transition-colors">
                          <td className="px-3.5 py-2.5 font-medium text-slate-900 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-emerald-800" />
                            <span>{street}</span>
                            {isDefaultStandard && (
                              <span className="rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold">
                                Utama
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            <span className="inline-block rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              {count} rumah
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            {!isDefaultStandard ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteStreetClick(street)}
                                title="Hapus Nama Gang"
                                className="rounded p-1 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Standar</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-stone-200 bg-stone-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-stone-200 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-stone-300 transition-colors cursor-pointer"
          >
            Selesai / Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
