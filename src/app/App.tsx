import React, { useState, useRef, useEffect } from 'react';
import debounce from 'lodash.debounce';
import Logo from "./Logo";
import EndpointSelector from './EndpointSelector';
import JsonInput from './JsonInput';
import LimitInput from './LimitInput';
import PopulateButton from './PopulateButton';
import FileImporter from './FileImporter';
import ProductCategorySelector from './ProductCategorySelector';
import { STORAGE_KEY_LIMIT, STORAGE_KEY_ENDPOINT, STORAGE_KEY_JSON_TEXT, STORAGE_KEY_PRODUCT_CATEGORY } from "./constants";

import "./App.css";

const DataPopulatorUI: React.FC = () => {
  const [endpoint, setEndpoint] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [limit, setLimit] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);
  const [storageLoaded, setStorageLoaded] = useState<boolean>(false);
  const [productCategory, setProductCategory] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFileImport = endpoint === "__file__";

  const resetScroll = () => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = 0;
    }
  };

  useEffect(() => {
    const validEndpoint = endpoint && endpoint !== "__file__";
    if (!validEndpoint) return;

    const fetchData = async () => {
      try {
        let url = `https://dummyjson.com/${endpoint}`;
        if (endpoint === "products" && productCategory) {
          url += `/category/${productCategory}`;
        }
        url += `?limit=${limit}`;
        
        const res = await fetch(url);
        const json = await res.json();
        const data = json[endpoint] || json;
        const pretty = JSON.stringify(data, null, 2);
        setJsonText(pretty);
        setError(null);
        resetScroll();
      } catch {
        alert("Failed to fetch data with new limit.");
      }
    };

    const debouncedFetch = debounce(fetchData, 250);
    debouncedFetch();

    return () => {
      debouncedFetch.cancel();
    };
  }, [limit, endpoint, productCategory]);

  // load cached values
  useEffect(() => {
    parent.postMessage({ pluginMessage: { type: "load-storage", key: STORAGE_KEY_ENDPOINT } }, "*");
    parent.postMessage({ pluginMessage: { type: "load-storage", key: STORAGE_KEY_LIMIT } }, "*");
    parent.postMessage({ pluginMessage: { type: "load-storage", key: STORAGE_KEY_PRODUCT_CATEGORY } }, "*");
    parent.postMessage({ pluginMessage: { type: "load-storage", key: STORAGE_KEY_JSON_TEXT } }, "*");

    window.onmessage = (event) => {
      const msg = event.data.pluginMessage;
      if (msg.type === "storage-loaded") {
        if (msg.key === STORAGE_KEY_ENDPOINT) setEndpoint(msg.value || "");
        if (msg.key === STORAGE_KEY_LIMIT) setLimit(msg.value || "");
        if (msg.key === STORAGE_KEY_PRODUCT_CATEGORY) setProductCategory(msg.value || "");
        if (msg.key === STORAGE_KEY_JSON_TEXT) setJsonText(msg.value || "");
        setStorageLoaded(true);
      }
    };
  }, []);

  return (
    <div className="c-app">
      <div className="c-app__body">
        <Logo />
        <EndpointSelector 
          endpoint={endpoint} 
          fileInputRef={fileInputRef}
          setEndpoint={setEndpoint}
          storageLoaded={storageLoaded} />
        <div className="c-control-group">
          {
            endpoint && !isFileImport
            ? <LimitInput 
                limit={limit} 
                setLimit={setLimit}
                storageLoaded={storageLoaded} />
            : null
          }
          {
            endpoint && endpoint === 'products'
            ? <ProductCategorySelector
                productCategory={productCategory}
                storageLoaded={storageLoaded}
                setProductCategory={setProductCategory} />
            : null
          }
        </div>
        <FileImporter
          fileInputRef={fileInputRef}
          setEndpoint={setEndpoint}
          setError={setError}
          setJsonText={setJsonText}
          resetScroll={resetScroll} />
        <JsonInput 
          textareaRef={textareaRef}
          error={error}
          jsonText={jsonText}
          setError={setError}
          setJsonText={setJsonText}
          storageLoaded={storageLoaded} />
      </div>
      <div className="c-app__footer">
        <PopulateButton
          jsonText={jsonText}
          setError={setError} />
      </div>
    </div>
  );
};

export default DataPopulatorUI;