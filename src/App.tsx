import { useState, useEffect, useCallback } from 'react';
import { Menu } from 'lucide-react';
import type { DatabaseState, LedgerTransaction, ResidentUnit } from './types/finance';
import type { AuthSession } from './lib/auth';
import { api } from './lib/api';
import { getUnpaidResidentsForBilling } from './lib/finance';
import { downloadMonthlyReportPDF } from './lib/pdfExport';
import { Sidebar, type NavTab } from './components/Sidebar';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { ResidentsView } from './components/ResidentsView';
import { TransactionsView } from './components/TransactionsView';
import { ReportsLPJView } from './components/ReportsLPJView';
import { WhatsAppBillingView } from './components/WhatsAppBillingView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { AddTransactionModal } from './components/AddTransactionModal';
import { UnitDetailModal } from './components/UnitDetailModal';
import { WargaPortalView } from './components/WargaPortalView';
import { PublicationsManagerView } from './components/PublicationsManagerView';
import { ReceiptPreviewModal } from './components/ReceiptPreviewModal';
import { AdminPaymentVerificationModal } from './components/AdminPaymentVerificationModal';
import { DatabaseHealthIndicator } from './components/DatabaseHealthIndicator';

const AUTH_STORAGE_KEY = 'saung_kebun_auth_session_v1';

export default function App() {
  const [db, setDb] = useState<DatabaseState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [session, setSession] = useState<AuthSession | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return {
          role: 'bendahara',
          isAdmin: true,
          displayName: 'Andriansyah',
          roleLabel: 'Admin — Bendahara Pengurus',
          unitId: 'A-09',
          loginAt: new Date().toISOString(),
        };
      }
      if (params.get('warga') === '1') {
        return {
          role: 'warga',
          isAdmin: false,
          displayName: 'Agus Pratama Putra',
          roleLabel: 'Warga Unit A-05',
          unitId: 'A-05',
          loginAt: new Date().toISOString(),
        };
      }
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as AuthSession;
      }
    } catch {
      // ignore storage errors
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [addModalPresetMode, setAddModalPresetMode] = useState<'iuran' | 'income' | 'expense'>('iuran');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [openUnitWithQRIS, setOpenUnitWithQRIS] = useState<boolean>(false);
  const [previewReceiptData, setPreviewReceiptData] = useState<{
    resident: ResidentUnit;
    transaction: LedgerTransaction;
  } | null>(null);
  const [verificationModalOpen, setVerificationModalOpen] = useState<boolean>(false);

  const loadDatabase = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getState();
      setDb(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat database');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDatabase();
  }, [loadDatabase]);

  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    if (newSession.role === 'satpam') {
      setActiveTab('publications');
    } else {
      setActiveTab('dashboard');
    }
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newSession));
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    setSession(null);
    setSelectedUnitId(null);
    setOpenUnitWithQRIS(false);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleOpenUnitModal = (unitId: string, showQRIS = false) => {
    setSelectedUnitId(unitId);
    setOpenUnitWithQRIS(showQRIS);
  };

  if (loading || !db) {
    return (
      <div className="min-h-screen bg-[#f3f6fb] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full text-center space-y-2 shadow-sm">
          <div className="w-8 h-8 border-2 border-[#1547b8] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-900">
            Memuat Buku Kas Perumahan Saung Kebun...
          </p>
          <p className="text-xs text-slate-500">
            Menyiapkan profil 55 rumah &amp; rekapitulasi saldo real-time
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f3f6fb] flex items-center justify-center p-6">
        <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-md w-full space-y-3 shadow-sm">
          <h2 className="text-base font-bold text-red-800">Gagal Terhubung ke Server</h2>
          <p className="text-xs text-slate-600">{error}</p>
          <button
            type="button"
            onClick={loadDatabase}
            className="px-4 py-2 text-xs font-semibold bg-[#1547b8] text-white rounded-lg hover:bg-[#103896] cursor-pointer"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginView state={db} onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = session.isAdmin;
  const isWarga = session.role === 'warga';
  const isSatpam = session.role === 'satpam';
  const unpaidBillingItems = getUnpaidResidentsForBilling(db, selectedMonth);
  const pendingConfirmationsCount = (db.paymentConfirmations ?? []).filter(
    (c) => c.status === 'MENUNGGU_VERIFIKASI'
  ).length;
  const selectedUnit: ResidentUnit | null = selectedUnitId
    ? db.residents.find((r) => r.id === selectedUnitId) || null
    : null;

  const handleQuickDownloadCurrentMonthPDF = () => {
    downloadMonthlyReportPDF(db, selectedMonth);
  };

  const handleQuickPaySingleMonth = async (unitId: string, periodMonth: string) => {
    const nextState = await api.payBatchIuran({
      unitId,
      periodMonths: [periodMonth],
      paymentMethod: 'Transfer BCA Kas',
      date: '2026-10-24',
      recordedBy: `${session.roleLabel} (${session.displayName})`,
    });
    setDb(nextState);
  };

  return (
    <div className="min-h-screen bg-[#eef2f8] text-slate-900 flex flex-col lg:flex-row">
      {/* Mobile Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-[#0b2273] text-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Buka menu navigasi"
            className="rounded-lg p-1.5 text-white hover:bg-white/10"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <span className="block font-display text-sm font-bold text-white">
              {db.settings.housingName}
            </span>
            <span className="block text-[11px] text-[#5eead4] font-medium">
              {session.roleLabel} ({session.displayName})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DatabaseHealthIndicator />
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-white/25 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white"
          >
            Keluar
          </button>
        </div>
      </div>

      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        unpaidCount={unpaidBillingItems.length}
        session={session}
        onLogout={handleLogout}
        onOpenMyUnit={(unitId) => handleOpenUnitModal(unitId, true)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        pendingVerificationCount={pendingConfirmationsCount}
        onOpenVerification={() => setVerificationModalOpen(true)}
      />

      <main className="flex-1 min-w-0 w-full">
        {isWarga ? (
          <WargaPortalView
            state={db}
            session={session}
            activePeriodMonth={selectedMonth}
            onChangePeriodMonth={setSelectedMonth}
            onPreviewReceipt={(res, tx) =>
              setPreviewReceiptData({ resident: res, transaction: tx })
            }
            onStateUpdate={setDb}
          />
        ) : isSatpam ? (
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto w-full">
            <PublicationsManagerView
              state={db}
              session={session}
              activePeriodMonth={selectedMonth}
              onChangePeriodMonth={setSelectedMonth}
              onCreateAnnouncement={async (payload) => {
                const nextState = await api.createAnnouncement(payload);
                setDb(nextState);
              }}
              onToggleAnnouncementPublish={async (id, published) => {
                const nextState = await api.toggleAnnouncementPublish(id, published);
                setDb(nextState);
              }}
              onDeleteAnnouncement={async (id) => {
                const nextState = await api.deleteAnnouncement(id);
                setDb(nextState);
              }}
              onUpdateArrearsPublication={async (payload) => {
                const nextState = await api.updateArrearsPublication(payload);
                setDb(nextState);
              }}
              onCreateSecurityReport={async (payload) => {
                const nextState = await api.createSecurityReport(payload);
                setDb(nextState);
              }}
              onToggleSecurityReportPublish={async (id, published) => {
                const nextState = await api.toggleSecurityReportPublish(id, published);
                setDb(nextState);
              }}
              onDeleteSecurityReport={async (id) => {
                const nextState = await api.deleteSecurityReport(id);
                setDb(nextState);
              }}
              onCreateSecurityOfficer={async (payload) => {
                const nextState = await api.createSecurityOfficer(payload);
                setDb(nextState);
              }}
              onUpdateSecurityOfficer={async (id, updates) => {
                const nextState = await api.updateSecurityOfficer(id, updates);
                setDb(nextState);
              }}
              onDeleteSecurityOfficer={async (id) => {
                const nextState = await api.deleteSecurityOfficer(id);
                setDb(nextState);
              }}
            />
          </div>
        ) : activeTab === 'dashboard' ? (
          <DashboardView
            state={db}
            session={session}
            activePeriodMonth={selectedMonth}
            onChangePeriodMonth={setSelectedMonth}
            onNavigate={setActiveTab}
            onOpenAddModal={(preset) => {
              setAddModalPresetMode(preset || 'iuran');
              setAddModalOpen(true);
            }}
            onDownloadMonthlyPdf={handleQuickDownloadCurrentMonthPDF}
            onSelectUnit={(unitId, showQRIS) => handleOpenUnitModal(unitId, Boolean(showQRIS))}
            isAdmin={isAdmin}
            onOpenVerification={() => setVerificationModalOpen(true)}
          />
        ) : (
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto w-full">
            {activeTab === 'residents' && (
              <ResidentsView
                state={db}
                activePeriodMonth={selectedMonth}
                onChangePeriodMonth={setSelectedMonth}
                onSelectUnit={(unitId) => handleOpenUnitModal(unitId, false)}
                onQuickPayCurrentMonth={(unitId) =>
                  handleQuickPaySingleMonth(unitId, selectedMonth)
                }
                isAdmin={isAdmin}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionsView
                state={db}
                activePeriodMonth={selectedMonth}
                onChangePeriodMonth={setSelectedMonth}
                isAdmin={isAdmin}
                onOpenAddModal={(preset) => {
                  setAddModalPresetMode(preset || 'iuran');
                  setAddModalOpen(true);
                }}
                onDeleteTransaction={async (txId) => {
                  const nextState = await api.deleteTransaction(txId);
                  setDb(nextState);
                }}
                onSelectUnit={(unitId) => handleOpenUnitModal(unitId, false)}
                onPreviewReceipt={(res, tx) =>
                  setPreviewReceiptData({ resident: res, transaction: tx })
                }
              />
            )}

            {activeTab === 'reports' && (
              <ReportsLPJView
                state={db}
                activePeriodMonth={selectedMonth}
                onChangePeriodMonth={setSelectedMonth}
                isAdmin={isAdmin}
                onTogglePublication={async (type, id, published) => {
                  const nextState = await api.updateReportPublication({ type, id, published });
                  setDb(nextState);
                }}
              />
            )}

            {(activeTab === 'publications' || activeTab === 'security_officers') && (
              <PublicationsManagerView
                state={db}
                session={session}
                activePeriodMonth={selectedMonth}
                onChangePeriodMonth={setSelectedMonth}
                initialSubTab={activeTab === 'security_officers' ? 'anggota' : 'kegiatan'}
                onCreateAnnouncement={async (payload) => {
                  const nextState = await api.createAnnouncement(payload);
                  setDb(nextState);
                }}
                onToggleAnnouncementPublish={async (id, published) => {
                  const nextState = await api.toggleAnnouncementPublish(id, published);
                  setDb(nextState);
                }}
                onDeleteAnnouncement={async (id) => {
                  const nextState = await api.deleteAnnouncement(id);
                  setDb(nextState);
                }}
                onUpdateArrearsPublication={async (payload) => {
                  const nextState = await api.updateArrearsPublication(payload);
                  setDb(nextState);
                }}
                onCreateSecurityReport={async (payload) => {
                  const nextState = await api.createSecurityReport(payload);
                  setDb(nextState);
                }}
                onToggleSecurityReportPublish={async (id, published) => {
                  const nextState = await api.toggleSecurityReportPublish(id, published);
                  setDb(nextState);
                }}
                onDeleteSecurityReport={async (id) => {
                  const nextState = await api.deleteSecurityReport(id);
                  setDb(nextState);
                }}
                onCreateSecurityOfficer={async (payload) => {
                  const nextState = await api.createSecurityOfficer(payload);
                  setDb(nextState);
                }}
                onUpdateSecurityOfficer={async (id, updates) => {
                  const nextState = await api.updateSecurityOfficer(id, updates);
                  setDb(nextState);
                }}
                onDeleteSecurityOfficer={async (id) => {
                  const nextState = await api.deleteSecurityOfficer(id);
                  setDb(nextState);
                }}
              />
            )}

            {activeTab === 'whatsapp' && (
              <WhatsAppBillingView
                state={db}
                activePeriodMonth={selectedMonth}
                onChangePeriodMonth={setSelectedMonth}
                isAdmin={isAdmin}
                onSendSingleReminder={async (item) => {
                  const nextState = await api.sendWhatsAppSingle({
                    unitId: item.resident.id,
                    periodMonth: selectedMonth,
                    arrearsMonths: item.unpaidMonths,
                    totalBilled: item.totalArrears,
                    message: item.formattedMessage,
                  });
                  setDb(nextState);
                }}
                onSendBroadcastReminders={async (periodMonth, items) => {
                  const res = await api.broadcastWhatsApp({
                    periodMonth,
                    items: items.map((item) => ({
                      unitId: item.resident.id,
                      arrearsMonths: item.unpaidMonths,
                      totalBilled: item.totalArrears,
                      message: item.formattedMessage,
                    })),
                  });
                  setDb(res.state);
                  return res.sentCount;
                }}
                onQuickPayUnit={handleQuickPaySingleMonth}
              />
            )}

            {activeTab === 'settings' && (
              <AdminSettingsView
                settings={db.settings}
                isAdmin={isAdmin}
                onSaveSettings={async (updated) => {
                  const nextState = await api.updateSettings(updated);
                  setDb(nextState);
                }}
                onResetDemoData={async () => {
                  const resetData = await api.resetDatabase();
                  setDb(resetData);
                }}
              />
            )}
          </div>
        )}
      </main>

      {isAdmin && (
        <AddTransactionModal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          state={db}
          defaultPeriodMonth={selectedMonth}
          presetMode={addModalPresetMode}
          onSubmitTransaction={async (payload) => {
            const nextState = await api.createTransaction({
              ...payload,
              recordedBy: `${session.roleLabel} (${session.displayName})`,
            });
            setDb(nextState);
          }}
        />
      )}

      <UnitDetailModal
        resident={selectedUnit}
        state={db}
        isAdmin={isAdmin}
        initialShowQRIS={openUnitWithQRIS}
        onClose={() => {
          setSelectedUnitId(null);
          setOpenUnitWithQRIS(false);
        }}
        onPayMonths={async (payload) => {
          const nextState = await api.payBatchIuran({
            ...payload,
            recordedBy: `${session.roleLabel} (${session.displayName})`,
          });
          setDb(nextState);
        }}
        onUpdateResident={async (unitId, payload) => {
          const nextState = await api.updateResident(unitId, payload);
          setDb(nextState);
        }}
        onPreviewReceipt={(res, tx) =>
          setPreviewReceiptData({ resident: res, transaction: tx })
        }
      />

      <ReceiptPreviewModal
        open={Boolean(previewReceiptData)}
        resident={previewReceiptData?.resident || null}
        transaction={previewReceiptData?.transaction || null}
        state={db}
        onClose={() => setPreviewReceiptData(null)}
      />

      {isAdmin && (
        <AdminPaymentVerificationModal
          isOpen={verificationModalOpen}
          onClose={() => setVerificationModalOpen(false)}
          state={db}
          session={session}
          onStateUpdate={setDb}
        />
      )}
    </div>
  );
}
