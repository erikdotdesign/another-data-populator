import React from 'react';

interface PopulateButtonProps {
  jsonText: string;
  setError: (error: string) => void;
}

const PopulateButton: React.FC<PopulateButtonProps> = ({jsonText, setError}) => {

  const handlePopulate = () => {
    try {
      const data = JSON.parse(jsonText);
      parent.postMessage({ pluginMessage: { type: "populate", data } }, "*");
    } catch (e: any) {
      setError("Invalid JSON: " + e.message);
    }
  };

  return (
    <button 
      className="c-button" 
      onClick={handlePopulate}>
      Populate selection
    </button>
  );
};

export default PopulateButton;