import React, { useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, Download, Eye, Maximize2, X, Image as ImageIcon } from 'lucide-react';

interface DocumentationPhotoGalleryProps {
  photos?: string[];
  title?: string;
  category?: string;
  aspectRatio?: 'video' | 'wide' | 'auto';
  className?: string;
}

export const DocumentationPhotoGallery: React.FC<DocumentationPhotoGalleryProps> = ({
  photos = [],
  title,
  category,
  aspectRatio = 'video',
  className = '',
}) => {
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) return null;

  const validPhotos = photos.filter(Boolean);
  if (validPhotos.length === 0) return null;

  const total = validPhotos.length;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveLightboxIndex((prev) => (prev !== null ? (prev - 1 + total) % total : 0));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveLightboxIndex((prev) => (prev !== null ? (prev + 1) % total : 0));
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 1 Photo View */}
      {total === 1 && (
        <div
          onClick={() => setActiveLightboxIndex(0)}
          className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200/90 bg-slate-900 shadow-2xs hover:shadow-md transition-all"
        >
          <img
            src={validPhotos[0]}
            alt={title || 'Dokumentasi kegiatan'}
            className="w-full h-44 sm:h-52 object-cover object-center group-hover:scale-102 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-[11px] bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-md">
              <Camera className="h-3 w-3 text-teal-300" />
              <span>Dokumentasi Foto</span>
            </span>
            <span className="flex items-center gap-1 text-[11px] bg-black/40 backdrop-blur-xs px-2 py-1 rounded-md text-white/90 group-hover:text-white">
              <Maximize2 className="h-3 w-3" />
              <span>Perbesar</span>
            </span>
          </div>
        </div>
      )}

      {/* 2 Photos View */}
      {total === 2 && (
        <div className="grid grid-cols-2 gap-2">
          {validPhotos.map((photo, idx) => (
            <div
              key={idx}
              onClick={() => setActiveLightboxIndex(idx)}
              className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200/90 bg-slate-900 shadow-2xs hover:shadow-md transition-all"
            >
              <img
                src={photo}
                alt={`${title || 'Dokumentasi'} - Foto ${idx + 1}`}
                className="w-full h-36 sm:h-44 object-cover object-center group-hover:scale-102 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-2 left-2.5 flex items-center gap-1 text-white text-[10px] font-semibold bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded">
                <Camera className="h-2.5 w-2.5 text-teal-300" />
                <span>Foto {idx + 1} dari 2</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3 Photos View */}
      {total === 3 && (
        <div className="grid grid-cols-3 gap-2">
          <div
            onClick={() => setActiveLightboxIndex(0)}
            className="group relative col-span-2 cursor-pointer overflow-hidden rounded-xl border border-slate-200/90 bg-slate-900 shadow-2xs hover:shadow-md transition-all"
          >
            <img
              src={validPhotos[0]}
              alt={`${title || 'Dokumentasi'} - Foto 1`}
              className="w-full h-44 sm:h-52 object-cover object-center group-hover:scale-102 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-2 left-2.5 flex items-center gap-1 text-white text-[10px] font-semibold bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded">
              <Camera className="h-2.5 w-2.5 text-teal-300" />
              <span>Foto Utama (1/3)</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {validPhotos.slice(1, 3).map((photo, idx) => (
              <div
                key={idx + 1}
                onClick={() => setActiveLightboxIndex(idx + 1)}
                className="group relative flex-1 cursor-pointer overflow-hidden rounded-xl border border-slate-200/90 bg-slate-900 shadow-2xs hover:shadow-md transition-all"
              >
                <img
                  src={photo}
                  alt={`${title || 'Dokumentasi'} - Foto ${idx + 2}`}
                  className="w-full h-[84px] sm:h-[98px] object-cover object-center group-hover:scale-102 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                <div className="absolute bottom-1.5 right-1.5 text-white text-[9px] font-bold bg-black/50 backdrop-blur-xs px-1.5 py-0.5 rounded">
                  Foto {idx + 2}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 or More Photos View (2x2 Grid with +N Overlay) */}
      {total >= 4 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {validPhotos.slice(0, 4).map((photo, idx) => {
            const isLastOfFour = idx === 3 && total > 4;
            const remainingCount = total - 4;

            return (
              <div
                key={idx}
                onClick={() => setActiveLightboxIndex(idx)}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200/90 bg-slate-900 shadow-2xs hover:shadow-md transition-all"
              >
                <img
                  src={photo}
                  alt={`${title || 'Dokumentasi'} - Foto ${idx + 1}`}
                  className="w-full h-28 sm:h-32 object-cover object-center group-hover:scale-102 transition-transform duration-300"
                  loading="lazy"
                />
                {isLastOfFour ? (
                  <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center text-white backdrop-blur-2xs">
                    <span className="font-display text-base font-bold text-white">+{remainingCount}</span>
                    <span className="text-[10px] text-teal-300 font-semibold">Foto Lainnya</span>
                  </div>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-1.5 left-2 text-white text-[9px] font-semibold bg-black/40 backdrop-blur-xs px-1.5 py-0.5 rounded">
                      Foto {idx + 1}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Fullscreen Modal */}
      {activeLightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Penampil Foto Dokumentasi"
          onClick={() => setActiveLightboxIndex(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-display text-xs sm:text-sm font-bold text-white truncate max-w-[280px] sm:max-w-md">
                    {title || 'Dokumentasi Kegiatan & Keamanan'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Foto {activeLightboxIndex + 1} dari {total} {category ? `· ${category}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={validPhotos[activeLightboxIndex]}
                  download={`dokumentasi-saung-kebun-${activeLightboxIndex + 1}.svg`}
                  title="Unduh Foto"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setActiveLightboxIndex(null)}
                  title="Tutup"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Main Photo Display Area */}
            <div className="relative flex-1 flex items-center justify-center bg-black/60 p-2 sm:p-6 min-h-[300px] max-h-[70vh]">
              <img
                src={validPhotos[activeLightboxIndex]}
                alt={`Dokumentasi foto ke-${activeLightboxIndex + 1}`}
                className="max-h-[64vh] max-w-full object-contain rounded-lg shadow-lg select-none"
              />

              {/* Prev / Next Buttons */}
              {total > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Foto Sebelumnya"
                    className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 text-white shadow-lg hover:bg-teal-600 backdrop-blur-xs transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Foto Berikutnya"
                    className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 text-white shadow-lg hover:bg-teal-600 backdrop-blur-xs transition-colors cursor-pointer"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Navigation Strip */}
            {total > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto p-3 bg-slate-950 border-t border-slate-800 justify-center">
                {validPhotos.map((photo, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveLightboxIndex(i)}
                    className={`relative shrink-0 h-12 w-16 rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
                      activeLightboxIndex === i
                        ? 'border-teal-400 ring-2 ring-teal-400/40 scale-105'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={photo} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
