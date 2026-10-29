import { useRef, useState } from 'react';

// Drag-and-drop or click to choose any file(s).
export default function FileDrop({ onFiles, accept, multiple = true, children, className = '' }) {
  const [over, setOver] = useState(false);
  const inputRef = useRef(null);
  return (
    <div
      className={`file-drop ${over ? 'over' : ''} ${className}`}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]);
      }}
    >
      {children}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          if (e.target.files.length) onFiles([...e.target.files]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
