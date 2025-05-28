import React, { useState, useRef } from 'react';
import Logo from "./Logo";
import PresetSelector from './PresetSelector';
import JsonInput from './JsonInput';
import FileImporter from './FileImporter';
import "./App.css";

const DataPopulatorUI: React.FC = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState("");

  const handleInputChange = (value: string) => {
    setJson(value);
    try {
      JSON.parse(value);
      setError(null);
    } catch (e: any) {
      setError("Invalid JSON: " + e.message);
    }
  };

  const resetTextAreaScroll = () => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = 0;
    }
  }

  const handlePresetChange = async (endpoint: string) => {
    setSelectedEndpoint(endpoint);
    if (!endpoint) return;

    const url = `https://dummyjson.com/${endpoint}`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      const data = json[endpoint] || json;
      const pretty = JSON.stringify(data, null, 2);
      handleInputChange(pretty);
      resetTextAreaScroll();
    } catch {
      alert("Failed to fetch data");
    }
  };

  const handleFileImport = (fileJson: object) => {
    const pretty = JSON.stringify(fileJson, null, 2);
    setSelectedEndpoint("");
    handleInputChange(pretty);
    resetTextAreaScroll();
  };

  const handlePopulate = () => {
    try {
      const data = JSON.parse(json);
      parent.postMessage({ pluginMessage: { type: "populate", data } }, "*");
    } catch (e: any) {
      setError("Invalid JSON: " + e.message);
    }
  };

  return (
    <div className="c-app">
      <Logo />
      <PresetSelector 
        value={selectedEndpoint} 
        onChange={handlePresetChange} />
      <FileImporter onImport={handleFileImport} />
      <JsonInput 
        value={json} 
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