"use client";

import { FileText, Image as ImageIcon, Download } from "lucide-react";
import { colors } from "@/lib/colors";

interface FileData {
  _id: string;
  _creationTime: number;
  name: string;
  googleUrl?: string;
  fileType?: string;
  workOrderId?: string;
}

interface FilesGalleryProps {
  files: FileData[];
  onSelectImage: (image: { url: string; name: string; index: number }) => void;
  formatDate: (timestamp: number) => string;
  selectedWoid: string | null;
}

function isImageFile(fileName: string, fileType?: string): boolean {
  if (fileType && fileType.includes("image")) return true;
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"];
  return imageExtensions.some((ext) => fileName.toLowerCase().endsWith(ext));
}

export default function FilesGallery({
  files,
  onSelectImage,
  formatDate,
  selectedWoid,
}: FilesGalleryProps) {
  // Filter by selected WOID if one is selected
  const filteredFiles = selectedWoid
    ? files.filter((f) => f.workOrderId === selectedWoid)
    : files;
  
  const images = filteredFiles.filter((f) => isImageFile(f.name, f.fileType));
  const documents = filteredFiles.filter((f) => !isImageFile(f.name, f.fileType));

  if (filteredFiles.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">
          {selectedWoid ? "No files for this work order" : "No files uploaded yet"}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* File count summary */}
      <div className="flex items-center gap-3 mb-5">
        <h3 className="text-base font-semibold text-gray-900">
          Files ({filteredFiles.length})
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {images.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
              <ImageIcon className="w-3 h-3" />
              {images.length} image{images.length !== 1 ? "s" : ""}
            </span>
          )}
          {documents.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              <FileText className="w-3 h-3" />
              {documents.length} doc{documents.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Image Thumbnail Grid */}
      {images.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Images
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {images.map((file, idx) => (
              <button
                key={file._id}
                onClick={() =>
                  onSelectImage({
                    url: file.googleUrl || "",
                    name: file.name,
                    index: idx,
                  })
                }
                className="group relative aspect-[4/3] rounded-xl border border-gray-200 overflow-hidden bg-gray-100 hover:shadow-md transition-all"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.googleUrl || ""}
                  alt={file.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    // If image fails to load, show a placeholder icon
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const parent = target.parentElement;
                    if (parent) {
                      parent.classList.add("flex", "items-center", "justify-center");
                      parent.innerHTML = `
                        <div class="flex flex-col items-center gap-2 text-gray-400">
                          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p class="text-xs">Click to view</p>
                        </div>
                      `;
                    }
                  }}
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs font-medium text-white truncate">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-white/70">
                    {formatDate(file._creationTime)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Documents List */}
      {documents.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Documents
          </h4>
          <div className="space-y-2">
            {documents.map((file) => (
              <a
                key={file._id}
                href={file.googleUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors">
                    <FileText className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium text-gray-900 group-hover:text-gray-700 truncate"
                    >
                      {file.name || "Unnamed File"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(file._creationTime)}
                    </div>
                  </div>
                </div>
                <Download
                  className="h-4 w-4 text-gray-300 group-hover:text-gray-600 flex-shrink-0 ml-2 transition-colors"
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
