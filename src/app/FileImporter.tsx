import React from 'react';

interface Props {
  fileInputRef: any;
  setEndpoint: (endpoint: string) => void;
  setJsonText: (jsonText: string) => void;
  setError: (error: string) => void;
  resetScroll: () => void;
}

const FileImporter: React.FC<Props> = ({ 
  fileInputRef, 
  setEndpoint, 
  setJsonText, 
  setError, 
  resetScroll 
}) => {
  
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        const pretty = JSON.stringify(parsed, null, 2);
        setJsonText(pretty);
        setError(null);
        setEndpoint(""); // reset selector
        resetScroll();
      } catch {
        alert("Invalid JSON file.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <input
      type="file"
      accept=".json"
      style={{ display: "none" }}
      ref={fileInputRef}
      onChange={handleFileImport}/>
  );
};

export default FileImporter;