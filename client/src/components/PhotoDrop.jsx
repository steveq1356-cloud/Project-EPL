import { useEffect, useRef, useState } from 'react';

const isImage = (file) => file.type.startsWith('image/');

// Drop zone + file picker + clipboard paste.
// A paste goes to the drop zone whose form has focus; with pasteWhenIdle it also
// takes pastes made while nothing in particular is focused.
export default function PhotoDrop({ onFiles, label = 'Drop photos here, paste, or', compact = false, pasteWhenIdle = false }) {
  const [over, setOver] = useState(false);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;

  useEffect(() => {
    function onPaste(e) {
      const files = [...(e.clipboardData?.files ?? [])].filter(isImage);
      if (!files.length) return;
      const scope = rootRef.current?.closest('form') ?? rootRef.current;
      const active = document.activeElement;
      const idle = !active || active === document.body;
      if (!scope?.contains(active) && !(idle && pasteWhenIdle)) return;
      e.preventDefault();
      onFilesRef.current(files.map(named));
    }
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [pasteWhenIdle]);

  function accept(fileList) {
    const files = [...fileList].filter(isImage);
    if (files.length) onFiles(files.map(named));
  }

  return (
    <div
      ref={rootRef}
      className={`photo-drop ${over ? 'over' : ''} ${compact ? 'compact' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        accept(e.dataTransfer.files);
      }}
    >
      <span className="muted">{label}</span>{' '}
      <button type="button" className="btn btn-small" onClick={() => inputRef.current.click()}>
        choose files
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          accept(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// Pasted screenshots arrive as "image.png"; give them a dated name instead.
function named(file) {
  if (file.name && file.name !== 'image.png') return file;
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  return new File([file], `pasted-${stamp}.${file.type.split('/')[1] || 'png'}`, { type: file.type });
}
