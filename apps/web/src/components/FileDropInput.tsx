"use client";

import { FileUp } from "lucide-react";
import { useId, useRef, useState } from "react";

type FileDropInputProps = {
  accept?: string;
  buttonLabel?: string;
  description: string;
  disabled?: boolean;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  selectedLabel?: string | null;
  title: string;
};

export function FileDropInput({
  accept,
  buttonLabel = "Browse files",
  description,
  disabled = false,
  multiple = false,
  onFilesSelected,
  selectedLabel,
  title,
}: FileDropInputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);

  function openPicker() {
    if (!disabled) {
      inputRef.current?.click();
    }
  }

  function commitFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);

    if (files.length === 0 || disabled) {
      return;
    }

    onFilesSelected(files);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <button
      type="button"
      onClick={openPicker}
      onDragEnter={(event) => {
        event.preventDefault();

        if (disabled) {
          return;
        }

        dragDepthRef.current += 1;
        setIsDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();

        if (!disabled) {
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDragLeave={(event) => {
        event.preventDefault();

        if (disabled) {
          return;
        }

        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

        if (dragDepthRef.current === 0) {
          setIsDragging(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();

        dragDepthRef.current = 0;
        setIsDragging(false);
        commitFiles(event.dataTransfer.files);
      }}
      className="w-full rounded-[1.75rem] border border-dashed px-6 py-10 text-center transition-colors"
      style={{
        borderColor: isDragging ? "#9945FF" : "var(--border)",
        background: isDragging ? "#9945FF10" : "var(--surface-low)",
        opacity: disabled ? 0.6 : 1,
      }}
      disabled={disabled}
    >
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(event) => commitFiles(event.target.files)}
      />

      <FileUp className="mx-auto mb-3 h-7 w-7 text-[#9945FF]" />

      <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
        {selectedLabel || title}
      </p>
      <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
        {description}
      </p>

      <span className="btn-outline mt-5 inline-flex">{buttonLabel}</span>
    </button>
  );
}
