import { useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { CameraIcon } from './icons';

export interface FileDropzoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  hint?: ReactNode;
  className?: string;
}

/** Drag-and-drop photo upload area (PLAN §16.1 — garden / dog photos). */
export function FileDropzone({
  onFiles,
  accept = 'image/*',
  multiple = true,
  hint = 'Przeciągnij zdjęcia lub kliknij, aby wybrać (JPG/PNG, do 5 MB).',
  className,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function emit(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    onFiles(Array.from(fileList));
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    emit(event.dataTransfer.files);
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        'flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center transition',
        dragging ? 'border-green-700 bg-green-50' : 'border-ink-200 bg-surface hover:border-green-300',
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-green-50 text-green-700">
        <CameraIcon size={24} />
      </span>
      <span className="text-sm text-ink-500">{hint}</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => emit(e.target.files)}
      />
    </button>
  );
}
