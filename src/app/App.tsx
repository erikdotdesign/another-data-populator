import React, { useState, useRef } from 'react';
import Logo from "./Logo";
import EndpointSelector from './EndpointSelector';
import JsonInput from './JsonInput';
import "./App.css";

const DataPopulatorUI: React.FC = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState("");

  const handleEndpointChange = async (value: string) => {
    if (value === "__file__") {
      fileInputRef.current?.click();
      return;
    }

    setEndpoint(value);

    if (!value) return;

    try {
      const res = await fetch(`https://dummyjson.com/${value}`);
      const json = await res.json();
      const data = json[value] || json;
      const pretty = JSON.stringify(data, null, 2);
      setJsonText(pretty);
      setError(null);
      resetScroll();
    } catch (err) {
      alert("Failed to fetch data");
    }
  };

  const handleInputChange = (value: string) => {
    setJsonText(value);
    try {
      JSON.parse(value);
      setError(null);
    } catch (e: any) {
      setError("Invalid JSON: " + e.message);
    }
  };

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

  const resetScroll = () => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = 0;
    }
  };

  const handlePopulate = () => {
    try {
      const data = JSON.parse(jsonText);
      parent.postMessage({ pluginMessage: { type: "populate", data } }, "*");
    } catch (e: any) {
      setError("Invalid JSON: " + e.message);
    }
  };

  return (
    <div className="c-app">
      <Logo />
      <EndpointSelector 
        selected={endpoint} 
        onChange={handleEndpointChange} />
      <input
        type="file"
        accept=".json"
        style={{ display: "none" }}
        ref={fileInputRef}
        onChange={handleFileImport}
      />
      <JsonInput 
        value={jsonText} 
        onChange={handleInputChange} 
        error={error}
        textareaRef={textareaRef} />
      <button 
        className='c-button' 
        onClick={handlePopulate}>
        Populate to Selection
      </button>
    </div>
  );
};

export default DataPopulatorUI;