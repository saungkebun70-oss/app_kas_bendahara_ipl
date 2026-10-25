import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  Calendar,
  ExternalLink,
  Copy,
  Sparkles,
  CheckCheck,
} from 'lucide-react';
import type { DatabaseState } from '../types/finance';
import {
  formatRupiah,
  formatMonthLabel,
  getUnpaidResidentsForBilling,
  type UnpaidResidentBillingItem,
} from '../lib/finance';

interface WhatsAppBillingViewProps {
  state: DatabaseState;
  activePeriodMonth: string;
  onChangePeriodMonth: (month: string) => void;
  isAdmin: boolean;
  onSendSingleReminder: (item: UnpaidResidentBillingItem) => Promise<void>;
  onSendBroadcastReminders: (
    periodMonth: string,
    items: UnpaidResidentBillingItem[]
  ) => Promise<number>;
  onQuickPayUnit: (unitId: string, periodMonth: string) => Promise<void>;
}

export const WhatsAppBillingView: React.FC<WhatsAppBillingViewProps> = ({
  state,
  activePeriodMonth,
  onChangePeriodMonth,
  isAdmin,
  onSendSingleReminder,
  onSendBroadcastReminders,
  onQuickPayUnit,
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const unpaidList = useMemo(
    () => getUnpaidResidentsForBilling(state, activePeriodMonth),
    [state, activePeriodMonth]
  );

  const activePreviewItem = useMemo(() => {
    if (unpaidList.length === 0) return null;
    return unpaidList.find((item) => item.resident.id === selectedUnitId) || unpaidList[0];
  }, [unpaidList, selectedUnitId]);

  const handleSendOne = async (item: UnpaidResidentBillingItem) => {
    setSendingId(item.resident.id);
    try {
      await onSendSingleReminder(item);
      setBannerMessage(
        `Notifikasi penagihan WhatsApp berhasil dikirim ke Unit ${item.resident.id} (${item.resident.headOfFamily} - ${item.resident.whatsapp}).`
      );
      setTimeout(() => setBannerMessage(null), 5000);
    } finally {
      setSendingId(null);
    }
  };

  const handleBroadcastAll = async () => {
    if (unpaidList.length === 0) return;
    setBroadcasting(true);
    try {
      const sentCount = await onSendBroadcastReminders(activePeriodMonth, unpaidList);
      setBannerMessage(
        `Penagihan WhatsApp otomatis berhasil dikirim serentak ke ${sentCount} warga yang belum membayar iuran periode ${formatMonthLabel(activePeriodMonth)}.`
      );
      setTimeout(() => setBannerMessage(null), 5000);
    } finally {
      setBroadcasting(false);
    }
  };

  const handleCopyMessage = (unitId: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedId(unitId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const totalArrearsNominal = unpaidList.reduce((acc, item) => acc + item.totalArrears, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-900">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Otomasi Penagihan Iuran Warga via WhatsApp</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Notifikasi Penagihan WhatsApp — {formatMonthLabel(activePeriodMonth)}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Daftar warga yang belum membayar iuran {formatRupiah(state.settings.monthlyFee)} beserta pengiriman pesan tagihan otomatis via WhatsApp Gateway.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-lg px-3 py-2">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={activePeriodMonth}
              onChange={(e) => onChangePeriodMonth(e.target.value)}
              aria-label="Pilih Periode Penagihan"
              className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="2026-07">Juli 2026</option>
              <option value="2026-08">Agustus 2026</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-10">Oktober 2026</option>
              <option value="2026-11">November 2026</option>
              <option value="2026-12">Desember 2026</option>
            </select>
          </div>

          {isAdmin && unpaidList.length > 0 && (
            <button
              type="button"
              disabled={broadcasting}
              onClick={handleBroadcastAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-900 text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {broadcasting
                  ? 'Mengirim Siaran...'
                  : `Kirim WA Otomatis ke Semua (${unpaidList.length} Rumah)`}
              </span>
            </button>
          )}
        </div>
      </div>

      {bannerMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-emerald-950">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
            <span>{bannerMessage}</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-800">Tercatat di Log Gateway</span>
        </div>
      )}

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Unpaid Queue */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
            <div>
              <h2 className="font-display text-sm font-bold text-slate-900">
                Daftar Warga Belum Membayar ({unpaidList.length} Rumah)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Total potensi tunggakan kumulatif:{' '}
                <span className="font-mono font-semibold text-amber-900">
                  {formatRupiah(totalArrearsNominal)}
                </span>
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Jatuh tempo tgl {state.settings.dueDayOfMonth}
            </span>
          </div>

          {unpaidList.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto" />
              <p className="text-sm font-semibold text-slate-900">
                Seluruh 55 Rumah Sudah Lunas!
              </p>
              <p className="text-xs text-slate-500">
                Tidak ada tunggakan iuran pada periode {formatMonthLabel(activePeriodMonth)}.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {unpaidList.map((item) => {
                const isSelected =
                  activePreviewItem?.resident.id === item.resident.id;

                return (
                  <div
                    key={item.resident.id}
                    onClick={() => setSelectedUnitId(item.resident.id)}
                    className={`py-3.5 px-3 rounded-lg transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected ? 'bg-emerald-50/70' : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded">
                          {item.resident.id}
                        </span>
                        <span className="font-semibold text-xs text-slate-900">
                          {item.resident.headOfFamily}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          · {item.resident.whatsapp}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        <span>
                          Bulan belum lunas:{' '}
                          <strong className="text-red-700">
                            {item.unpaidLabels.join(', ')}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <div className="text-right mr-1">
                        <div className="text-xs font-mono font-bold text-red-700 tabular-nums">
                          {formatRupiah(item.totalArrears)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.unpaidMonths.length} bln × 100rb
                        </div>
                      </div>

                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            disabled={sendingId === item.resident.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendOne(item);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-emerald-900 text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>
                              {sendingId === item.resident.id ? 'Mengirim...' : 'Kirim WA'}
                            </span>
                          </button>

                          <a
                            href={item.waWebUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="Buka di Aplikasi WhatsApp"
                            className="p-1.5 text-slate-600 hover:text-emerald-900 bg-stone-100 hover:bg-emerald-50 rounded-md border border-stone-200"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickPayUnit(item.resident.id, activePeriodMonth);
                            }}
                            className="px-2 py-1.5 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100 rounded-md border border-emerald-200 cursor-pointer"
                          >
                            Tandai Lunas
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 5 Cols: Active WhatsApp Message Preview & Recent Notification Log */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-800" />
                <h2 className="font-display text-sm font-bold text-slate-900">
                  Pratinjau Pesan Tagihan Otomatis
                </h2>
              </div>
              {activePreviewItem && (
                <span className="text-xs font-mono text-emerald-900 font-semibold">
                  Unit {activePreviewItem.resident.id}
                </span>
              )}
            </div>

            {activePreviewItem ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-emerald-950 text-emerald-50 text-xs font-mono whitespace-pre-wrap leading-relaxed border border-emerald-900">
                  {activePreviewItem.formattedMessage}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyMessage(
                        activePreviewItem.resident.id,
                        activePreviewItem.formattedMessage
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>
                      {copiedId === activePreviewItem.resident.id
                        ? 'Pesan Tersalin!'
                        : 'Salin Teks WA'}
                    </span>
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleSendOne(activePreviewItem)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-900 text-white hover:bg-emerald-800 rounded-lg cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Sekarang ke {activePreviewItem.resident.whatsapp}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">
                Pilih salah satu unit rumah untuk melihat format pesan WhatsApp.
              </p>
            )}
          </div>

          {/* Notification Log History */}
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h2 className="font-display text-sm font-bold text-slate-900">
                  Riwayat Terkirim WhatsApp ({state.whatsappLogs.length})
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">Log Gateway</span>
            </div>

            <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
              {state.whatsappLogs.slice(0, 15).map((log) => (
                <div key={log.id} className="py-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      Unit {log.unitId} — {log.residentName}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
                      <CheckCheck className="w-3.5 h-3.5" />
                      {log.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                    <span>{log.whatsapp}</span>
                    <span>Tagihan: {formatRupiah(log.totalBilled)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                    {new Date(log.sentAt).toLocaleString('id-ID')} · Periode{' '}
                    {formatMonthLabel(log.periodMonth)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
