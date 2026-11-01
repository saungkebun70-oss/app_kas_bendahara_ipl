import React, { useState, useEffect } from 'react';
import { X, UserPlus, Edit3, Home, User, Phone, AlertCircle, Shuffle, KeyRound } from 'lucide-react';
import type { BlockCode, BlockConfig, OccupancyStatus, ResidentUnit } from '../types/finance';

interface ResidentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  resident?: ResidentUnit | null;
  existingIds: string[];
  onSave: (data: Partial<ResidentUnit>) => Promise<void>;
  availableBlocks?: BlockConfig[];
  availableStreets?: string[];
  onOpenManageBlocks?: () => void;
}

const FALLBACK_BLOCKS: BlockConfig[] = [
  { id: 'B3', name: 'Blok B3' },
  { id: 'B5', name: 'Blok B5' },
  { id: 'B6', name: 'Blok B6' },
  { id: 'B7', name: 'Blok B7' },
  { id: 'B8', name: 'Blok B8' },
];

function generateUniqueCode(block: string, existingIds: string[]): string {
  const existingNums = existingIds
    .filter((id) => id.toUpperCase().startsWith(`${block.toUpperCase()}-`))
    .map((id) => parseInt(id.split('-')[1], 10))
    .filter((n) => !isNaN(n));
  const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
  const candidate = `${block}-${String(nextNum).padStart(2, '0')}`;
  if (!existingIds.some((id) => id.toLowerCase() === candidate.toLowerCase())) {
    return candidate;
  }
  return `${block}-U${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export const ResidentFormModal: React.FC<ResidentFormModalProps> = ({
  isOpen,
  onClose,
  mode,
  resident,
  existingIds,
  onSave,
  availableBlocks,
  onOpenManageBlocks,
}) => {
  const blocks = availableBlocks && availableBlocks.length > 0 ? availableBlocks : FALLBACK_BLOCKS;

  const [unitId, setUnitId] = useState('');
  const [block, setBlock] = useState<BlockCode>('B3');
  const [houseNumber, setHouseNumber] = useState('');
  const [headOfFamily, setHeadOfFamily] = useState('');
  const [nik, setNik] = useState('');
  const [kkNumber, setKkNumber] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [occupancyStatus, setOccupancyStatus] = useState<OccupancyStatus>('Dihuni Pemilik');
  const [familyMembers, setFamilyMembers] = useState<number>(2);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [accessPin, setAccessPin] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (mode === 'edit' && resident) {
        setUnitId(resident.id);
        setBlock(resident.block);
        setHouseNumber(resident.houseNumber || '');
        setHeadOfFamily(resident.headOfFamily || '');
        setNik(resident.nik || '');
        setKkNumber(resident.kkNumber || '');
        setWhatsapp(resident.whatsapp || '');
        setEmail(resident.email || '');
        setOccupancyStatus(resident.occupancyStatus || 'Dihuni Pemilik');
        setFamilyMembers(resident.familyMembers ?? 1);
        setVehiclePlate(resident.vehiclePlate || '');
        setAccessPin(resident.accessPin || '');
        setNotes(resident.notes || '');
      } else {
        const defaultBlk = blocks[0]?.id || 'B3';
        const autoCode = generateUniqueCode(defaultBlk, existingIds);
        setUnitId(autoCode);
        setBlock(defaultBlk);
        setHouseNumber('');
        setHeadOfFamily('');
        setNik('');
        setKkNumber('');
        setWhatsapp('');
        setEmail('');
        setOccupancyStatus('Dihuni Pemilik');
        setFamilyMembers(2);
        setVehiclePlate('');
        setAccessPin(String(Math.floor(1000 + Math.random() * 9000)));
        setNotes('');
      }
    }
  }, [isOpen, mode, resident, blocks, existingIds]);

  const handleBlockChange = (newBlock: BlockCode) => {
    setBlock(newBlock);
    if (mode === 'add') {
      const autoCode = generateUniqueCode(newBlock, existingIds);
      setUnitId(autoCode);
    }
  };

  const handleGenerateNewCode = () => {
    if (mode === 'add') {
      const newCode = `${block}-U${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      setUnitId(newCode);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = headOfFamily.trim();
    if (cleanName.length < 2) {
      setError('Nama Kepala Keluarga minimal 2 karakter.');
      return;
    }

    const cleanPin = accessPin.trim() || String(Math.floor(1000 + Math.random() * 9000));
    setLoading(true);

    try {
      if (mode === 'add') {
        const finalUnitId = unitId.trim() || generateUniqueCode(block, existingIds);
        await onSave({
          id: finalUnitId,
          block,
          houseNumber: houseNumber.trim() || finalUnitId.split('-')[1] || '-',
          headOfFamily: cleanName,
          nik: nik.trim(),
          kkNumber: kkNumber.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim(),
          occupancyStatus,
          familyMembers: Number(familyMembers) || 1,
          vehiclePlate: vehiclePlate.trim() || '-',
          joinedYear: 2026,
          notes: notes.trim(),
          accessPin: cleanPin,
        });
      } else if (resident) {
        // Edit mode: ID Unit selalu dipertahankan dari kode unik resident.id
        await onSave({
          id: resident.id,
          block,
          houseNumber: houseNumber.trim() || resident.houseNumber,
          headOfFamily: cleanName,
          nik: nik.trim(),
          kkNumber: kkNumber.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim(),
          occupancyStatus,
          familyMembers: Number(familyMembers) || 1,
          vehiclePlate: vehiclePlate.trim() || '-',
          notes: notes.trim(),
          accessPin: cleanPin,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data warga.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resident-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between bg-stone-900 text-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              {mode === 'add' ? <UserPlus className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
            </div>
            <div>
              <h3 id="resident-modal-title" className="font-display text-sm sm:text-base font-bold">
                {mode === 'add' ? 'Tambah Warga Baru' : `Perbarui Data Warga (${resident?.id})`}
              </h3>
              <p className="text-[11px] text-stone-300">
                {mode === 'add'
                  ? 'ID Unit dibuat dari kode unik otomatis sehingga data dapat diperbarui bebas'
                  : 'Ubah informasi profil warga tanpa mengubah kode unik ID unit'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Unit & Block Section */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5 text-emerald-800" />
                <span>Identitas Unit &amp; Kode Unik</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1">
                  ID Unit: {mode === 'edit' ? resident?.id : unitId}
                </span>
                {mode === 'add' && (
                  <button
                    type="button"
                    onClick={handleGenerateNewCode}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 bg-white border border-stone-300 rounded px-2 py-0.5 cursor-pointer shadow-2xs"
                  >
                    <Shuffle className="w-3 h-3" />
                    <span>Acak Kode</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Pilih Blok <span className="text-rose-600">*</span>
                  </label>
                  {onOpenManageBlocks && (
                    <button
                      type="button"
                      onClick={onOpenManageBlocks}
                      className="text-[10px] text-emerald-800 hover:text-emerald-950 font-semibold underline cursor-pointer"
                    >
                      Kelola Blok
                    </button>
                  )}
                </div>
                <select
                  value={block}
                  onChange={(e) => handleBlockChange(e.target.value as BlockCode)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-800 focus:outline-none"
                >
                  {blocks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Rumah (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 01, 15, atau -"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs font-semibold text-slate-900 focus:border-emerald-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Resident Profile Section */}
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-emerald-800" />
              <span>Data Kepala Keluarga &amp; Kontak</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Kepala Keluarga <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama warga / kepala keluarga"
                  value={headOfFamily}
                  onChange={(e) => setHeadOfFamily(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor WhatsApp / Telepon (Opsional)
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="Kosongkan jika tidak ada"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 font-mono text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Warga (Opsional)
                </label>
                <input
                  type="email"
                  placeholder="Kosongkan jika tidak ada"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIK KTP (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Kosongkan jika tidak ada"
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Kartu Keluarga (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Kosongkan jika tidak ada"
                  value={kkNumber}
                  onChange={(e) => setKkNumber(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Occupancy & Security Settings */}
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-emerald-800" />
              <span>Status Hunian &amp; PIN Akses</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Hunian
                </label>
                <select
                  value={occupancyStatus}
                  onChange={(e) => setOccupancyStatus(e.target.value as OccupancyStatus)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-800 focus:outline-none"
                >
                  <option value="Dihuni Pemilik">Dihuni Pemilik</option>
                  <option value="Dikontrakkan">Dikontrakkan</option>
                  <option value="Kosong Terawat">Kosong Terawat</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jumlah Jiwa
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={familyMembers}
                  onChange={(e) => setFamilyMembers(Number(e.target.value))}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Plat Kendaraan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: T 1234 KBN / -"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-800 focus:outline-none uppercase"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    PIN Akses Portal Warga
                  </label>
                  <button
                    type="button"
                    onClick={() => setAccessPin(String(Math.floor(1000 + Math.random() * 9000)))}
                    className="text-[10px] text-emerald-800 hover:text-emerald-950 font-semibold underline cursor-pointer"
                  >
                    Acak PIN
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="PIN angka unik (contoh: 3001)"
                  value={accessPin}
                  onChange={(e) => setAccessPin(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-900 focus:border-emerald-800 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Tambahan
                </label>
                <input
                  type="text"
                  placeholder="Catatan khusus unit rumah ini..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? (
                <span>Menyimpan...</span>
              ) : (
                <span>{mode === 'add' ? 'Simpan Warga Baru' : 'Simpan Perubahan'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
