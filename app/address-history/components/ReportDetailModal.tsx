"use client";

import { X, FileText, Image as ImageIcon } from "lucide-react";
import { colors } from "@/lib/colors";
import { useEffect } from "react";

interface ReportDetailModalProps {
  report: any;
  onClose: () => void;
  onViewImage: (image: { url: string; name: string }) => void;
  formatDate: (timestamp: number) => string;
  formatTime: (timestamp: number) => string;
}

function isImageFile(fileName: string, fileType?: string): boolean {
  if (fileType && fileType.includes("image")) return true;
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"];
  return imageExtensions.some((ext) => fileName.toLowerCase().endsWith(ext));
}

export default function ReportDetailModal({
  report,
  onClose,
  onViewImage,
  formatDate,
  formatTime,
}: ReportDetailModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Daily report details"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Daily Report</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatDate(report.date)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto max-h-[calc(85vh-80px)] space-y-5">
          {/* WOID */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Work Order
            </label>
            <p className="text-sm font-mono font-semibold text-gray-900 mt-1">
              {report.workOrderId}
            </p>
          </div>

          {/* Status */}
          {report.completionStatus && (
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Status
              </label>
              <div className="mt-1">
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                    report.completionStatus === "complete"
                      ? "bg-green-100 text-green-800"
                      : report.completionStatus === "void"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {report.completionStatus}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          {(report.notes || report.comment) && (
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Notes
              </label>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap leading-relaxed">
                {report.notes || report.comment}
              </p>
            </div>
          )}

          {/* Details */}
          {report.details && Object.keys(report.details).length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                Report Details
              </label>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                {Object.entries(report.details).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-500">{key}</span>
                    <span className="text-xs text-gray-900 font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attached Files */}
          {report.files && report.files.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                Attached Files ({report.files.length})
              </label>
              <div className="space-y-2">
                {report.files.map((file: any) => {
                  const isImage = isImageFile(file.name, file.fileType);
                  return (
                    <div
                      key={file._id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isImage ? (
                          <ImageIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        )}
                        <span className="text-sm text-gray-900 truncate">{file.name}</span>
                      </div>
                      {isImage ? (
                        <button
                          onClick={() => {
                            onClose();
                            onViewImage({ url: file.googleUrl || "", name: file.name });
                          }}
                          className="text-xs font-medium flex-shrink-0 ml-2"
                          style={{ color: colors.primary }}
                        >
                          View
                        </button>
                      ) : (
                        <a
                          href={file.googleUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium flex-shrink-0 ml-2"
                          style={{ color: colors.primary }}
                        >
                          Download
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
