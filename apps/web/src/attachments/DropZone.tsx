import { IconUpload } from "@tabler/icons-react";
import { useState, type DragEvent, type ReactNode } from "react";
import styles from "./DropZone.module.css";

interface DropZoneProps {
  label: string;
  onFiles: (files: File[]) => void;
  children: ReactNode;
}

function hasFiles(event: DragEvent) {
  return event.dataTransfer.types.includes("Files");
}

export function DropZone({ label, onFiles, children }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Drop zones nest, e.g. a drawer in the drawer of an activity, so only the innermost one reacts.
  return (
    <div
      className={styles.dropZone}
      onDragOver={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsDragging(false);
        }
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        onFiles([...event.dataTransfer.files]);
      }}
    >
      {children}
      {isDragging && (
        <div className={styles.overlay} aria-hidden>
          <IconUpload size={24} stroke={2} />
          {label}
        </div>
      )}
    </div>
  );
}
