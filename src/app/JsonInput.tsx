import React, { useEffect } from 'react';
import { STORAGE_KEY_JSON_TEXT } from "./constants";

interface Props {
  jsonText: string;
  error: string;
  textareaRef: any;
  storageLoaded: boolean;
  setJsonText: (jsonText: string) => void;
  setError: (error: string) => void;
}

const JsonInput: React.FC<Props> = ({ 
  jsonText, 
  error, 
  textareaRef,
  storageLoaded,
  setJsonText, 
  setError
}) => {

  const handleInputChange = (value: string) => {
    setJsonText(value);
    try {
      JSON.parse(value);
      setError(null);
    } catch (e: any) {
      setError("Invalid JSON: " + e.message);
    }
  };

  useEffect(() => {
    if (storageLoaded) {
      parent.postMessage({
        pluginMessage: { type: "save-storage", key: STORAGE_KEY_JSON_TEXT, value: jsonText },
      }, "*");
    }
  }, [jsonText]);

  return (
    <div className={`c-control ${error ? 'c-control--error' : ''}`}>
      <label 
        className="c-control__label"
        htmlFor="json">
        Paste or edit JSON
      </label>
      <textarea
        ref={textareaRef}
        className="c-control__input c-control__input--textarea"
        id="json"
        value={jsonText}
        onChange={(e) => handleInputChange(e.target.value)} />
      <div className="c-control__message">
        { error }
      </div>
    </div>
  );
};

export default JsonInput;