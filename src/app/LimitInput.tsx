import React, { useEffect } from "react";
import { STORAGE_KEY_LIMIT } from "./constants";

interface LimitInputProps {
  limit: number;
  storageLoaded: boolean;
  setLimit: (limit: number) => void;
}

const LimitInput: React.FC<LimitInputProps> = ({ 
  limit, 
  storageLoaded, 
  setLimit 
}) => {

  const handleLimitChange = (value: number) => {
    setLimit(value);
  }

  useEffect(() => {
    if (storageLoaded) {
      parent.postMessage({
        pluginMessage: { type: "save-storage", key: STORAGE_KEY_LIMIT, value: limit },
      }, "*");
    }
  }, [limit]);

  return (
    <div className="c-control">
      <label 
        className="c-control__label"
        htmlFor="limit">
        Limit
      </label>
      <input
        className="c-control__input"
        id="limit"
        value={limit}
        type="number"
        onChange={(e) => handleLimitChange(e.target.value)} />
    </div>
  );
};

export default LimitInput;