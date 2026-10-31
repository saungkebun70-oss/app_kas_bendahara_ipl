import React, { useState } from 'react';
import {
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Layers,
  MapPin,
  Maximize2,
  Megaphone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import type { CommunityActivityAnnouncement, SecurityGuardReport } from '../types/finance';
import { formatShortDate } from '../lib/finance';
import { DocumentationPhotoGallery } from './DocumentationPhotoGallery';

interface HeadlineInformasiShowcaseProps {
  announcements: CommunityActivityAnnouncement[];
  securityReports: SecurityGuardReport[];
  onNavigateTab?: (tab: 'kegiatan' | 'keamanan') => void;
  className?: string;
}

export const HeadlineInformasiShowcase: React.FC<HeadlineInformasiShowcaseProps> = ({
  announcements,
  securityReports,
  onNavigateTab,
  className = '',
}) => {
  const publishedAnnouncements = announcements.filter((a) => a.published);
  const publishedSecurityReports = securityReports.filter((s) => s.published);

  const [activeMode, setActiveMode] = useState<'kegiatan' | 'keamanan'>('kegiatan');
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // If no items at all, don't render empty box
  if (publishedAnnouncements.length === 0 && publishedSecurityReports.length === 0) {
    return null;
  }

  const currentAnnouncement = publishedAnnouncements[activeItemIndex % (publishedAnnouncements.length || 1)];
  const currentSecurity = publishedSecurityReports[activeItemIndex % (publishedSecurityReports.length || 1)];

  const isKegiatan = activeMode === 'kegiatan';
  const currentPhotos = isKegiatan
    ? currentAnnouncement?.photos || []
    : currentSecurity?.photos || [];

  const handleNextItem = () => {
    setActivePhotoIndex(0);
    const listLen = isKegiatan ? publishedAnnouncements.length : publishedSecurityReports.length;
    setActiveItemIndex((prev) => (prev + 1) % listLen);
  };

  const handlePrevItem = () => {
    setActivePhotoIndex(0);
    const listLen = isKegiatan ? publishedAnnouncements.length : publishedSecurityReports.length;
    setActiveItemIndex((prev) => (prev - 1 + listLen) % listLen);
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPhotos.length > 0) {
      setActivePhotoIndex((prev) => (prev + 1) % currentPhotos.length);
    }
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPhotos.length > 0) {
      setActivePhotoIndex((prev) => (prev - 1 + currentPhotos.length) % currentPhotos.length);
    }
  };

  return (
    <div
      data-testid="headline-informasi-showcase"
      className={`rounded-2xl border border-teal-200/90 bg-gradient-to-br from-white via-stone-50/70 to-teal-50/40 p-4 sm:p-5 shadow-sm space-y-4 ${className}`}
    >
      {/* Top Banner Header with Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-900 to-teal-700 text-white shadow-xs">
            <Sparkles className="h-4 w-4 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                Headline Informasi &amp; Dokumentasi
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-900 px-2 py-0.5 text-[10px] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>Terbaru</span>
              </span>
            </div>
            <h2 className="font-display text-sm sm:text-base font-bold text-slate-900">
              Dokumentasi Resmi Kegiatan Warga &amp; Patroli Pos Keamanan
            </h2>
          </div>
        </div>

        {/* Switcher Buttons: Kegiatan vs Keamanan */}
        <div className="flex items-center gap-1.5 bg-stone-200/70 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setActiveMode('kegiatan');
              setActiveItemIndex(0);
              setActivePhotoIndex(0);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              isKegiatan
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Megaphone className="h-3.5 w-3.5" />
            <span>Kegiatan Warga ({publishedAnnouncements.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMode('keamanan');
              setActiveItemIndex(0);
              setActivePhotoIndex(0);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              !isKegiatan
                ? 'bg-[#0f766e] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Keamanan Satpam ({publishedSecurityReports.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Left Showcase Photo + Right Details */}
      {isKegiatan && currentAnnouncement ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Left: Photo Carousel / Featured Visual */}
          <div className="lg:col-span-6 space-y-2">
            <div className="relative group overflow-hidden rounded-xl border border-stone-200 bg-slate-950 shadow-sm aspect-video flex items-center justify-center">
              {currentPhotos.length > 0 ? (
                <>
                  <img
                    src={currentPhotos[activePhotoIndex % currentPhotos.length]}
                    alt={currentAnnouncement.title}
                    className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                  {/* Photo Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="rounded-md bg-emerald-900/90 text-white backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      {currentAnnouncement.category}
                    </span>
                    <span className="rounded-md bg-black/60 text-white backdrop-blur-xs px-2 py-0.5 text-[10px] font-medium flex items-center gap-1">
                      <Camera className="h-2.5 w-2.5 text-teal-300" />
                      <span>{currentPhotos.length} Foto Dokumentasi</span>
                    </span>
                  </div>

                  {/* Photo Counter */}
                  <div className="absolute bottom-2.5 right-2.5 text-white text-[10px] font-bold bg-black/60 backdrop-blur-xs px-2 py-1 rounded">
                    Foto {activePhotoIndex + 1} dari {currentPhotos.length}
                  </div>

                  {/* Prev/Next Photo Arrows */}
                  {currentPhotos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrevPhoto}
                        aria-label="Foto Sebelumnya"
                        className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-emerald-800 transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextPhoto}
                        aria-label="Foto Berikutnya"
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-emerald-800 transition-colors cursor-pointer"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center text-slate-400 p-6 space-y-1">
                  <Camera className="h-8 w-8 mx-auto text-slate-500" />
                  <p className="text-xs">Belum ada foto dokumentasi terlampir</p>
                </div>
              )}
            </div>

            {/* Thumbnail dots/pills if multiple photos */}
            {currentPhotos.length > 1 && (
              <div className="flex items-center gap-1.5 justify-center overflow-x-auto py-1">
                {currentPhotos.map((photo, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => setActivePhotoIndex(pIdx)}
                    className={`h-9 w-12 rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
                      activePhotoIndex === pIdx
                        ? 'border-emerald-800 ring-2 ring-emerald-300 scale-105'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Details & Headline Summary */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Calendar className="h-3.5 w-3.5 text-emerald-800" />
                <span>Pelaksanaan: {formatShortDate(currentAnnouncement.eventDate)}</span>
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <MapPin className="h-3 w-3 text-slate-400" />
                <span>{currentAnnouncement.location}</span>
              </span>
            </div>

            <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {currentAnnouncement.title}
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
              {currentAnnouncement.content}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200 text-xs">
              <span className="text-slate-500">
                Dipublikasikan oleh: <strong className="text-slate-800 font-semibold">{currentAnnouncement.authorName}</strong>
              </span>

              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('kegiatan')}
                  className="font-bold text-emerald-900 hover:text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Buka Semua Agenda Kegiatan &rarr;</span>
                </button>
              )}
            </div>

            {/* Pagination Controls for Announcements */}
            {publishedAnnouncements.length > 1 && (
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                <span>
                  Pengumuman <strong>{activeItemIndex + 1}</strong> dari <strong>{publishedAnnouncements.length}</strong>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevItem}
                    className="rounded-md border border-stone-300 bg-white px-2 py-1 hover:bg-stone-100 cursor-pointer"
                  >
                    &larr; Sebelumnya
                  </button>
                  <button
                    type="button"
                    onClick={handleNextItem}
                    className="rounded-md border border-stone-300 bg-white px-2 py-1 hover:bg-stone-100 cursor-pointer"
                  >
                    Berikutnya &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : !isKegiatan && currentSecurity ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Left: Security Photo Carousel */}
          <div className="lg:col-span-6 space-y-2">
            <div className="relative group overflow-hidden rounded-xl border border-teal-200 bg-slate-950 shadow-sm aspect-video flex items-center justify-center">
              {currentPhotos.length > 0 ? (
                <>
                  <img
                    src={currentPhotos[activePhotoIndex % currentPhotos.length]}
                    alt={currentSecurity.title}
                    className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                  {/* Security Status Badge */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        currentSecurity.situationStatus === 'Aman Terkendali'
                          ? 'bg-teal-500 text-slate-950'
                          : 'bg-amber-400 text-slate-950'
                      }`}
                    >
                      {currentSecurity.situationStatus}
                    </span>
                    <span className="rounded-md bg-black/60 text-white backdrop-blur-xs px-2 py-0.5 text-[10px] font-medium flex items-center gap-1">
                      <Camera className="h-2.5 w-2.5 text-teal-300" />
                      <span>{currentPhotos.length} Foto Dokumentasi</span>
                    </span>
                  </div>

                  {/* Photo Counter */}
                  <div className="absolute bottom-2.5 right-2.5 text-white text-[10px] font-bold bg-black/60 backdrop-blur-xs px-2 py-1 rounded">
                    Foto {activePhotoIndex + 1} dari {currentPhotos.length}
                  </div>

                  {/* Prev/Next Photo Arrows */}
                  {currentPhotos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrevPhoto}
                        aria-label="Foto Sebelumnya"
                        className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-teal-700 transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextPhoto}
                        aria-label="Foto Berikutnya"
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-teal-700 transition-colors cursor-pointer"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center text-slate-400 p-6 space-y-1">
                  <ShieldCheck className="h-8 w-8 mx-auto text-teal-400" />
                  <p className="text-xs">Belum ada foto dokumentasi pos satpam</p>
                </div>
              )}
            </div>

            {/* Thumbnail dots/pills if multiple photos */}
            {currentPhotos.length > 1 && (
              <div className="flex items-center gap-1.5 justify-center overflow-x-auto py-1">
                {currentPhotos.map((photo, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => setActivePhotoIndex(pIdx)}
                    className={`h-9 w-12 rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
                      activePhotoIndex === pIdx
                        ? 'border-teal-600 ring-2 ring-teal-300 scale-105'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Security Report Details */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 font-semibold text-[#0f766e]">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatShortDate(currentSecurity.reportDate)} · {currentSecurity.shift}</span>
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <MapPin className="h-3 w-3 text-slate-400" />
                <span>{currentSecurity.patrolArea}</span>
              </span>
            </div>

            <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {currentSecurity.title}
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
              {currentSecurity.summary}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200 text-xs">
              <span className="text-slate-500">
                Petugas Jaga: <strong className="text-slate-800 font-semibold">{currentSecurity.guardName}</strong>
              </span>

              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('keamanan')}
                  className="font-bold text-[#0f766e] hover:text-teal-900 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Buka Semua Laporan Satpam &rarr;</span>
                </button>
              )}
            </div>

            {/* Pagination Controls for Security Reports */}
            {publishedSecurityReports.length > 1 && (
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                <span>
                  Laporan <strong>{activeItemIndex + 1}</strong> dari <strong>{publishedSecurityReports.length}</strong>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevItem}
                    className="rounded-md border border-stone-300 bg-white px-2 py-1 hover:bg-stone-100 cursor-pointer"
                  >
                    &larr; Sebelumnya
                  </button>
                  <button
                    type="button"
                    onClick={handleNextItem}
                    className="rounded-md border border-stone-300 bg-white px-2 py-1 hover:bg-stone-100 cursor-pointer"
                  >
                    Berikutnya &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
