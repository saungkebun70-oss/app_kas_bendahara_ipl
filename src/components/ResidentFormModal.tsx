import React, { useState, useEffect } from 'react';
import { X, UserPlus, Edit3, Home, User, Phone, Shield, AlertCircle, MapPin, Layers } from 'lucide-react';
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
  { id: 'B1', name: 'Blok B1', defaultStreet: 'Gang Duren' },
  { id: 'B2', name: 'Blok B2', defaultStreet: 'Gang Duren' },
  { id: 'B3', name: 'Blok B3', defaultStreet: 'Gang Duren' },
  { id: 'B4', name: 'Blok B4', defaultStreet: 'Gang Duren' },
  { id: 'B5', name: 'Blok B5', defaultStreet: 'Gang Duren' },
  { id: 'B6', name: 'Blok B6', defaultStreet: 'Gang Anggur' },
  { id: 'B7', name: 'Blok B7', defaultStreet: 'Gang Anggur' },
  { id: 'B8', name: 'Blok B8', defaultStreet: 'Gang Anggur' },
  { id: 'B9', name: 'Blok B9', defaultStreet: 'Gang Anggur' },
  { id: 'B10', name: 'Blok B10', defaultStreet: 'Gang Anggur' },
];

const FALLBACK_STREETS: string[] = ['Gang Duren', 'Gang Anggur'];

export const ResidentFormModal: React.FC<ResidentFormModalProps> = ({
  isOpen,
  onClose,
  mode,
  resident,
  existingIds,
  onSave,
  availableBlocks,
  availableStreets,
  onOpenManageBlocks,
}) => {
  const blocks = availableBlocks && availableBlocks.length > 0 ? availableBlocks : FALLBACK_BLOCKS;
  const streets = availableStreets && availableStreets.length > 0 ? availableStreets : FALLBACK_STREETS;

  const [block, setBlock] = useState<BlockCode>('B1');
  const [houseNumber, setHouseNumber] = useState('');
  const [streetName, setStreetName] = useState('Gang Duren');
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
        setBlock(resident.block);
        const initHouseNum =
          resident.houseNumber ||
          (resident.id.includes('-') ? resident.id.split('-').slice(1).join('-') : resident.id);
        setHouseNumber(initHouseNum);
        let initialStreet = resident.streetName || 'Gang Duren';
        if (
          initialStreet.startsWith('Jl. Saung Melati') ||
          initialStreet.includes('Melati') ||
          initialStreet.includes('Cendana')
        ) {
          initialStreet = 'Gang Duren';
        } else if (
          initialStreet.startsWith('Jl. Kebun') ||
          initialStreet.includes('Mawar') ||
          initialStreet.includes('Kenanga') ||
          initialStreet.includes('Asri')
        ) {
          initialStreet = 'Gang Anggur';
        }
        setStreetName(initialStreet);
        setNik(resident.nik || '');
        setKkNumber(resident.kkNumber || '');
        setWhatsapp(resident.whatsapp);
        setEmail(resident.email || '');
        setOccupancyStatus(resident.occupancyStatus);
        setFamilyMembers(resident.familyMembers || 1);
        setVehiclePlate(resident.vehiclePlate || '');
        setAccessPin(resident.accessPin || '');
        setNotes(resident.notes || '');
      } else {
        // Reset form for add
        const defaultBlk = blocks[0]?.id || 'A';
        const blkMatch = blocks.find((b) => b.id === defaultBlk);
        const defStreet = blkMatch?.defaultStreet || streets[0] || 'Gang Duren';
        setBlock(defaultBlk);
        setHouseNumber('');
        setStreetName(defStreet);
        setHeadOfFamily('');
        setNik('');
        setKkNumber('');
        setWhatsapp('');
        setEmail('');
        setOccupancyStatus('Dihuni Pemilik');
        setFamilyMembers(2);
        setVehiclePlate('');
        setAccessPin('');
        setNotes('');
      }
    }
  }, [isOpen, mode, resident, blocks, streets]);

  const handleBlockChange = (newBlock: BlockCode) => {
    setBlock(newBlock);
    const blkMatch = blocks.find((b) => b.id.toUpperCase() === newBlock.toUpperCase());
    const targetStreet = blkMatch?.defaultStreet || (newBlock.toUpperCase().startsWith('B') ? 'Gang Anggur' : 'Gang Duren');
    setStreetName(targetStreet);
  };

  const handleWhatsappChange = (value: string) => {
    setWhatsapp(value);
    // If adding and PIN is empty or derived from old WA, suggest last 4 digits
    if (mode === 'add') {
      const digits = value.replace(/\D/g, '');
      if (digits.length >= 4) {
        setAccessPin(digits.slice(-4));
      }
    }
  };

  const computedUnitId = `${block}-${houseNumber.trim() ? houseNumber.trim().padStart(2, '0') : '??'}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = headOfFamily.trim();
    if (cleanName.length < 2) {
      setError('Nama Kepala Keluarga minimal 2 karakter.');
      return;
    }

    const cleanWa = whatsapp.trim();
    const waDigits = cleanWa.replace(/\D/g, '');
    if (waDigits.length < 9) {
      setError('Nomor WhatsApp harus valid minimal 9 digit.');
      return;
    }

    const cleanNum = houseNumber.trim();
    if (!cleanNum) {
      setError('Nomor rumah wajib diisi.');
      return;
    }
    const unitId = `${block}-${cleanNum.padStart(2, '0')}`;

    if (mode === 'add') {
      if (existingIds.some((id) => id.toLowerCase() === unitId.toLowerCase())) {
        setError(`Unit ${unitId} sudah terdaftar dalam sistem.`);
        return;
      }
    } else if (resident && unitId.toLowerCase() !== resident.id.toLowerCase()) {
      if (
        existingIds.some(
          (id) =>
            id.toLowerCase() === unitId.toLowerCase() &&
            id.toLowerCase() !== resident.id.toLowerCase()
        )
      ) {
        setError(`Unit ${unitId} sudah digunakan oleh warga lain. Silakan masukkan nomor lain.`);
        return;
      }
    }

    const cleanPin = accessPin.trim() || waDigits.slice(-4) || '1234';

    setLoading(true);
    try {
      if (mode === 'add') {
        await onSave({
          id: unitId,
          block,
          houseNumber: cleanNum,
          streetName: streetName.trim() || streets[0] || 'Gang Duren',
          headOfFamily: cleanName,
          nik: nik.trim() || `320101${waDigits.slice(-6).padStart(6, '0')}0001`,
          kkNumber: kkNumber.trim() || `320101${waDigits.slice(-6).padStart(6, '0')}0002`,
          whatsapp: cleanWa,
          email: email.trim(),
          occupancyStatus,
          familyMembers: Number(familyMembers) || 1,
          vehiclePlate: vehiclePlate.trim() || '-',
          joinedYear: 2026,
          notes: notes.trim(),
          accessPin: cleanPin,
        });
      } else if (resident) {
        await onSave({
          id: unitId,
          block,
          houseNumber: cleanNum,
          streetName: streetName.trim() || resident.streetName,
          headOfFamily: cleanName,
          nik: nik.trim(),
          kkNumber: kkNumber.trim(),
          whatsapp: cleanWa,
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
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resident-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900 text-white shadow-xs">
              {mode === 'add' ? <UserPlus className="h-5 w-5" /> : <Edit3 className="h-5 w-5" />}
            </div>
            <div>
              <h2 id="resident-modal-title" className="font-display text-base font-bold text-slate-900">
                {mode === 'add' ? 'Tambah Data Warga Baru' : `Ubah Data Warga (${resident?.id})`}
              </h2>
              <p className="text-xs text-slate-500">
                {mode === 'add'
                  ? 'Daftarkan rumah dan warga baru ke dalam pembukuan kas & portal lingkungan'
                  : `Perbarui profil dan data kepemilikan unit ${resident?.id}`}
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
                <span>Identitas Unit Rumah</span>
              </span>
              <span className="font-mono text-xs font-bold rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200 px-2.5 py-1">
                ID Unit: {computedUnitId}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-4">
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
                      {b.name} ({b.defaultStreet || 'Gang Duren'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Rumah <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 02"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs font-semibold text-slate-900 focus:border-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-800"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Dapat diubah bebas
                </p>
              </div>

              <div className="sm:col-span-5">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Nama Jalan / Gang <span className="text-rose-600">*</span>
                  </label>
                  {onOpenManageBlocks && (
                    <button
                      type="button"
                      onClick={onOpenManageBlocks}
                      className="text-[10px] text-emerald-800 hover:text-emerald-950 font-semibold underline cursor-pointer"
                    >
                      + Tambah Gang
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  list="resident-street-suggestions"
                  required
                  placeholder="Pilih atau ketik nama gang..."
                  value={streetName}
                  onChange={(e) => setStreetName(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-800 focus:outline-none font-medium"
                />
                <datalist id="resident-street-suggestions">
                  {streets.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>

                {/* Quick-click pills for Gang Duren, Gang Anggur, etc. */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  <span className="text-[10px] text-slate-400">Pilih cepat:</span>
                  {streets.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStreetName(s)}
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium border transition-colors cursor-pointer ${
                        streetName === s
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                          : 'bg-stone-100 text-slate-600 border-stone-200 hover:bg-stone-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
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
                  placeholder="Nama lengkap sesuai KTP"
                  value={headOfFamily}
                  onChange={(e) => setHeadOfFamily(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor WhatsApp (Aktif) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="0812-xxxx-xxxx"
                    value={whatsapp}
                    onChange={(e) => handleWhatsappChange(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 font-mono text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  Digunakan untuk notifikasi tagihan iuran &amp; broadcast warga.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email (Opsional)
                </label>
                <input
                  type="email"
                  placeholder="warga@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Induk Kependudukan (NIK)
                </label>
                <input
                  type="text"
                  maxLength={16}
                  placeholder="16 digit NIK KTP"
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Kartu Keluarga (KK)
                </label>
                <input
                  type="text"
                  maxLength={16}
                  placeholder="16 digit No. KK"
                  value={kkNumber}
                  onChange={(e) => setKkNumber(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Occupancy & Security Details */}
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-800" />
              <span>Status Hunian &amp; Akses Portal</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Hunian
                </label>
                <select
                  value={occupancyStatus}
                  onChange={(e) => setOccupancyStatus(e.target.value as OccupancyStatus)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
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
                  min={1}
                  max={25}
                  value={familyMembers}
                  onChange={(e) => setFamilyMembers(Number(e.target.value) || 1)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Plat Nomor Kendaraan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: F 1120 SK"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PIN Masuk Portal Warga (4 Digit)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Default: 4 digit terakhir WA"
                  value={accessPin}
                  onChange={(e) => setAccessPin(e.target.value)}
                  className="w-48 rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-900 tracking-wider focus:border-emerald-800 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const random = Math.floor(1000 + Math.random() * 9000).toString();
                    setAccessPin(random);
                  }}
                  className="rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  Acak PIN Baru
                </button>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">
                Warga menggunakan Nomor Unit dan PIN ini saat masuk ke Portal Warga mandiri.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Tambahan (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Catatan khusus terkait unit/warga..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Menyimpan...</span>
              ) : mode === 'add' ? (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Simpan Warga Baru</span>
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
