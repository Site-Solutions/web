"use client";

import { X, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { colors } from "@/lib/colors";
import { useEffect, useCallback } from "react";

interface ImageLightboxProps {
  image: { url: string; name: string; index: number };
  totalImages: number;
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
}

export default function ImageLightbox({
  image,
  totalImages,
  onClose,
  onNavigate,
}: ImageLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && image.index > 0) onNavigate("prev");
      if (e.key === "ArrowRight" && image.index < totalImages - 1) onNavigate("next");
    },
    [image.index, totalImages, onClose, onNavigate]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Image viewer: ${image.name}`}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white/90 truncate max-w-[200px] sm:max-w-md">
            {image.name}
          </span>
          {totalImages > 1 && (
            <span className="text-xs text-white/50">
              {image.index + 1} / {totalImages}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={image.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white rounded-lg transition-colors"
            style={{ backgroundColor: colors.primary }}
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Open Original</span>
          </a>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Navigation arrows */}
      {totalImages > 1 && image.index > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate("prev");
          }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-colors"
          aria-label="Previous image"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {totalImages > 1 && image.index < totalImages - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate("next");
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-colors"
          aria-label="Next image"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Image */}
      <div className="p-4 sm:p-12 max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={image.name}
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
          onError={(e) => {
            // If image fails to load in modal, show error message
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div class="flex flex-col items-center gap-3 text-white p-8">
                  <svg class="w-16 h-16 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p class="text-lg font-medium">Unable to load image</p>
                  <p class="text-sm text-white/70">Try opening the original file instead</p>
                </div>
              `;
            }
          }}
        />
      </div>
    </div>
  );
}
