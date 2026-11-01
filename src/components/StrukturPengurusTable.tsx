import React, { useState, useMemo } from 'react';
import {
  Users,
  Shield,
  Crown,
  Wallet,
  Megaphone,
  Activity,
  CheckCircle2,
  Copy,
  Check,
  Search,
  Building,
  Home,
  Info,
  ExternalLink,
} from 'lucide-react';
import type { CommitteeMember } from '../types/finance';
import { DEFAULT_COMMITTEE_MEMBERS } from '../lib/seedData';

interface StrukturPengurusTableProps {
  committeeMembers?: CommitteeMember[];
  housingName?: string;
  rtRwLabel?: string;
  onSelectUnit?: (unitId: string) => void;
  className?: string;
}

export const StrukturPengurusTable: React.FC<StrukturPengurusTableProps> = ({
  committeeMembers = DEFAULT_COMMITTEE_MEMBERS,
  housingName = 'Perumahan Saung Kebun',
  rtRwLabel = 'Pengurus Lingkungan RT 004 / RW 009',
  onSelectUnit,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);

  const members = useMemo(() => {
    return committeeMembers && committeeMembers.length > 0
      ? committeeMembers
      : DEFAULT_COMMITTEE_MEMBERS;
  }, [committeeMembers]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (selectedCategory !== 'ALL' && m.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.addressDisplay.toLowerCase().includes(q) ||
        m.unitId.toLowerCase().includes(q) ||
        m.duties.toLowerCase().includes(q)
      );
    });
  }, [members, selectedCategory, searchQuery]);

  const getRoleBadge = (category: string, role: string) => {
    switch (category) {
      case 'pembina':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-xs">
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>{role}</span>
          </span>
        );
      case 'ketua':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-300 shadow-xs">
            <Crown className="w-3.5 h-3.5 text-blue-600" />
            <span>{role}</span>
          </span>
        );
      case 'bendahara':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs">
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span>{role}</span>
          </span>
        );
      case 'humas':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-900 border border-teal-300 shadow-xs">
            <Megaphone className="w-3.5 h-3.5 text-teal-600" />
            <span>{role}</span>
          </span>
        );
      case 'olahraga':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-900 border border-orange-300 shadow-xs">
            <Activity className="w-3.5 h-3.5 text-orange-600" />
            <span>{role}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>{role}</span>
          </span>
        );
    }
  };

  const handleCopyStructureText = () => {
    const textLines = [
      `🏛️ STRUKTUR KEPENGURUSAN ${housingName.toUpperCase()}`,
      `${rtRwLabel}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ...members.map((m, idx) => {
        return `${idx + 1}. *${m.role.toUpperCase()}*\n   👤 Nama: ${m.name}\n   🏠 Alamat: ${m.addressDisplay} (Unit ${m.unitId})\n   📋 Tugas: ${m.duties}\n`;
      }),
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Mari bersama-sama menjaga keamanan, kenyamanan & kebersihan Saung Kebun.`,
    ];

    const fullText = textLines.join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div
      data-testid="struktur-pengurus-table-container"
      className={`rounded-2xl border border-stone-200/90 bg-white shadow-sm overflow-hidden ${className}`}
    >
      {/* Top Header Strip */}
      <div className="bg-gradient-to-r from-[#0b2273] via-[#13459c] to-[#0f766e] text-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-300">
              <Building className="w-4 h-4" />
              <span>Bagan Organisasi &amp; Pelayanan Lingkungan</span>
            </div>
            <h2 className="font-display text-lg sm:text-2xl font-bold tracking-tight text-white">
              Struktur Kepengurusan {housingName}
            </h2>
            <p className="text-xs text-sky-100 max-w-2xl">
              Susunan pembina, pengurus harian, humas, dan seksi lingkungan resmi untuk melayani warga secara transparan dan akuntabel.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyStructureText}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-all backdrop-blur-xs self-start sm:self-auto cursor-pointer shadow-xs"
            title="Salin format teks pengurus untuk dibagikan ke WhatsApp"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span className="text-emerald-200 font-extrabold">Tersalin ke Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-sky-200" />
                <span>Salin Teks WhatsApp</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Control & Search Bar */}
      <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-[#0b2273] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-stone-200/70 border border-stone-200'
            }`}
          >
            Semua ({members.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('pembina')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              selectedCategory === 'pembina'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-900 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            Pembina
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('ketua')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              selectedCategory === 'ketua'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-blue-900 hover:bg-blue-50 border border-blue-200'
            }`}
          >
            Ketua
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('bendahara')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              selectedCategory === 'bendahara'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-emerald-900 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            Bendahara
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('humas')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              selectedCategory === 'humas'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-teal-900 hover:bg-teal-50 border border-teal-200'
            }`}
          >
            Humas
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('olahraga')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              selectedCategory === 'olahraga'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-white text-orange-900 hover:bg-orange-50 border border-orange-200'
            }`}
          >
            Olahraga
          </button>
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, jabatan, blok..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0b2273] focus:ring-1 focus:ring-[#0b2273]"
          />
        </div>
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-100/90 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-slate-700">
              <th className="py-3 px-4 w-12 text-center">No</th>
              <th className="py-3 px-4 w-52">Jabatan / Posisi</th>
              <th className="py-3 px-4 w-48">Nama Pengurus</th>
              <th className="py-3 px-4 w-44">Alamat Rumah</th>
              <th className="py-3 px-4">Tugas Pokok &amp; Fungsi (Tupoksi)</th>
              <th className="py-3 px-4 w-28 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-xs text-slate-800">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400">
                  Tidak ditemukan pengurus dengan kriteria pencarian tersebut.
                </td>
              </tr>
            ) : (
              filteredMembers.map((member, index) => {
                return (
                  <tr
                    key={member.id}
                    className="hover:bg-teal-50/40 transition-colors group"
                  >
                    {/* 1. No */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-500">
                      {index + 1}
                    </td>

                    {/* 2. Jabatan */}
                    <td className="py-3.5 px-4">
                      {getRoleBadge(member.category, member.role)}
                    </td>

                    {/* 3. Nama Pengurus */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-[13px] flex items-center gap-1.5">
                        <span>{member.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        ID: {member.id}
                      </span>
                    </td>

                    {/* 4. Alamat Rumah */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Home className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{member.addressDisplay}</span>
                      </div>
                      {onSelectUnit ? (
                        <button
                          type="button"
                          onClick={() => onSelectUnit(member.unitId)}
                          className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#13459c] hover:underline cursor-pointer"
                        >
                          <span>Unit {member.unitId}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      ) : (
                        <span className="font-mono text-[10px] font-semibold text-slate-500">
                          Unit: {member.unitId}
                        </span>
                      )}
                    </td>

                    {/* 5. Tugas Pokok & Fungsi */}
                    <td className="py-3.5 px-4 text-slate-600 text-xs leading-relaxed max-w-md">
                      {member.duties}
                    </td>

                    {/* 6. Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{member.status || 'Aktif'}</span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARD VIEW (Optimized for Phones) */}
      <div className="block md:hidden divide-y divide-stone-100">
        {filteredMembers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Tidak ditemukan pengurus yang sesuai.
          </div>
        ) : (
          filteredMembers.map((member, index) => (
            <div key={member.id} className="p-4 space-y-2.5 hover:bg-stone-50/60">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-mono font-bold text-slate-700">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{member.name}</h3>
                    <div className="mt-0.5">{getRoleBadge(member.category, member.role)}</div>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                  <span>{member.status || 'Aktif'}</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs bg-stone-50 rounded-lg p-2.5 border border-stone-200">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Home className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>{member.addressDisplay}</span>
                </div>

                {onSelectUnit ? (
                  <button
                    type="button"
                    onClick={() => onSelectUnit(member.unitId)}
                    className="font-mono text-[11px] font-bold text-[#13459c] hover:underline cursor-pointer"
                  >
                    Unit {member.unitId} →
                  </button>
                ) : (
                  <span className="font-mono text-[11px] text-slate-500 font-bold">
                    Unit {member.unitId}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed bg-white border border-stone-100 rounded-lg p-2.5">
                <strong className="text-slate-800 block mb-0.5 font-semibold">Tugas Pokok &amp; Fungsi:</strong>
                {member.duties}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Bottom Info Footer */}
      <div className="p-3.5 sm:p-4 bg-teal-50/50 border-t border-teal-100 text-[11px] text-teal-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-teal-700 shrink-0" />
          <span>
            Seluruh pengurus bertugas secara amanah untuk kemaslahatan, kerukunan, dan kenyamanan lingkungan {housingName}.
          </span>
        </div>
        <span className="font-mono text-[10px] text-teal-700 self-end sm:self-auto font-semibold">
          {rtRwLabel}
        </span>
      </div>
    </div>
  );
};
