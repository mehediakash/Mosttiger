import React, { useMemo } from "react";
import { FaFilePdf, FaPaperclip, FaTimes } from "react-icons/fa";

const AttachmentPreview = ({ file, progress, onRemove }) => {
  const previewUrl = useMemo(() => {
    if (!file || file.type === "application/pdf") return "";
    return URL.createObjectURL(file);
  }, [file]);

  if (!file) return null;

  return (
    <div className="border-t border-white/10 bg-[#171717] p-3">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={file.name}
            className="h-14 w-14 rounded-xl object-cover"
            onLoad={() => URL.revokeObjectURL(previewUrl)}
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-500/15 text-red-300">
            <FaFilePdf className="text-2xl" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <FaPaperclip className="shrink-0 text-white/50" />
            <span className="truncate">{file.name}</span>
          </div>
          <div className="mt-1 text-xs text-white/50">
            {(file.size / 1024).toFixed(1)} KB
          </div>
          {progress > 0 && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Remove attachment"
        >
          <FaTimes />
        </button>
      </div>
    </div>
  );
};

export default React.memo(AttachmentPreview);
