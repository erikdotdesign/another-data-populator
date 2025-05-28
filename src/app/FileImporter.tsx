import React, { useRef } from 'react';

interface Props {
  onImport: (json: object) => void;
}

const FileImporter: React.FC<Props> = ({ onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        onImport(parsed);
      } catch {
        alert('Invalid JSON file.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className='c-control'>
      <label className='c-control__label'>Import JSON</label>
      <label 
        className='c-control__input c-control__input--button'
        htmlFor="fileInput">
        Import file
      </label>
      <input
        ref={fileInputRef}
        type="file"
        id="fileInput"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange} />
    </div>
  );
};

export default FileImporter;