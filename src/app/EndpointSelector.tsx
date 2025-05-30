import React, { useEffect } from "react";
import SelectorIcon from "./SelectorIcon";
import { STORAGE_KEY_ENDPOINT } from "./constants";

interface EndpointSelectorProps {
  endpoint: string;
  fileInputRef: any;
  storageLoaded: boolean;
  setEndpoint: (endpoint: string) => void;
}

const endpoints = [
  { label: "-- Select a preset --", value: "" },
  { label: "Products", value: "products" },
  { label: "Carts", value: "carts" },
  { label: "Recipes", value: "recipes" },
  { label: "Users", value: "users" },
  { label: "Posts", value: "posts" },
  { label: "Comments", value: "comments" },
  { label: "Todos", value: "todos" },
  { label: "Quotes", value: "quotes" },
  { label: "Import JSON File", value: "__file__" }, // special case
];

const EndpointSelector: React.FC<EndpointSelectorProps> = ({ 
  endpoint, 
  fileInputRef, 
  storageLoaded,
  setEndpoint
}) => {

  const handleEndpointChange = async (value: string) => {
    if (value === "__file__") {
      fileInputRef.current?.click();
      return;
    }

    setEndpoint(value);

    if (!value) return;
  };

  useEffect(() => {
    if (storageLoaded) {
      parent.postMessage({
        pluginMessage: { type: "save-storage", key: STORAGE_KEY_ENDPOINT, value: endpoint },
      }, "*");
    }
  }, [endpoint]);

  return (
    <div className="c-control">
      <label 
        className="c-control__label"
        htmlFor="endpoint">
        Select preset JSON
      </label>
      <select
        className="c-control__input"
        id="endpoint"
        value={endpoint}
        onChange={(e) => handleEndpointChange(e.target.value)}>
        {
          endpoints.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))
        }
      </select>
      <SelectorIcon />
    </div>
  );
};

export default EndpointSelector;