import React, { useState, useRef, useEffect } from 'react';
import debounce from 'lodash.debounce';
import Logo from "./Logo";
import EndpointSelector from './EndpointSelector';
import JsonInput from './JsonInput';
import LimitInput from './LimitInput';
import PopulateButton from './PopulateButton';
import FileImporter from './FileImporter';
import ProductCategorySelector from './ProductCategorySelector';
import RecipeMealSelector from './RecipeMealSelector';
import PostTagSelector from './PostTagSelector';
import IncludeCommentsInput from './IncludeCommentsInput';
import { STORAGE_KEY_LIMIT, STORAGE_KEY_ENDPOINT, STORAGE_KEY_JSON_TEXT, STORAGE_KEY_PRODUCT_CATEGORY, STORAGE_KEY_RECIPE_MEAL, STORAGE_KEY_POST_TAG, STORAGE_KEY_INCLUDE_COMMENTS } from "./constants";

import "./App.css";

const DataPopulatorUI: React.FC = () => {
  const [endpoint, setEndpoint] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [limit, setLimit] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);
  const [storageLoaded, setStorageLoaded] = useState<boolean>(false);
  const [productCategory, setProductCategory] = useState<string>("");
  const [recipeMeal, setRecipeMeal] = useState<string>("");
  const [postTag, setPostTag] = useState<string>("");
  const [includeComments, setIncludeComments] = useState<boolean>(false);
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
        if (endpoint === "recipes" && recipeMeal) {
          url += `/meal-type/${recipeMeal}`;
        }
        if (endpoint === "posts" && postTag) {
          url += `/tag/${postTag}`;
        }
        url += `?limit=${limit}`;
        
        const res = await fetch(url);
        const json = await res.json();
        let data = json[endpoint] || json;

        if (includeComments) {
          const postsWithComments = await Promise.all(
            data.map(async (post) => {
              const commentsRes = await fetch(`https://dummyjson.com/comments/post/${post.id}`);
              const commentsData = await commentsRes.json();
              return {
                ...post,
                comments: commentsData.comments,
              };
            })
          );
          data = postsWithComments;
        }

        const pretty = JSON.stringify(data, null, 2);
        setJsonText(pretty);
        setError(null);
        resetScroll();
      } catch {
        alert("Failed to fetch data with new parameters.");
      }
    };

    const debouncedFetch = debounce(fetchData, 250);
    debouncedFetch();

    return () => {
      debouncedFetch.cancel();
    };
  }, [limit, endpoint, productCategory, recipeMeal, postTag, includeComments]);

  // reset endpoint filters on endpoint change
  useEffect(() => {
    setProductCategory("");
    setRecipeMeal("");
    setPostTag("");
    setIncludeComments(false);
  }, [endpoint]);

  // load cached values
  useEffect(() => {
    parent.postMessage({ pluginMessage: { type: "load-storage", key: STORAGE_KEY_ENDPOINT } }, "*");
    parent.postMessage({ pluginMessage: { type: "load-storage", key: STORAGE_KEY_LIMIT } }, "*");
    parent.postMessage({ pluginMessage: { type: "load-storage", key: STORAGE_KEY_PRODUCT_CATEGORY } }, "*");
    parent.postMessage({ pluginMessage: { type: "load-storage", key: STORAGE_KEY_JSON_TEXT } }, "*");
    parent.postMessage({ pluginMessage: { type: "load-storage", key: STORAGE_KEY_RECIPE_MEAL } }, "*");
    parent.postMessage({ pluginMessage: { type: "load-storage", key: STORAGE_KEY_POST_TAG } }, "*");
    parent.postMessage({ pluginMessage: { type: "load-storage", key: STORAGE_KEY_INCLUDE_COMMENTS } }, "*");

    window.onmessage = (event) => {
      const msg = event.data.pluginMessage;
      if (msg.type === "storage-loaded") {
        if (msg.key === STORAGE_KEY_ENDPOINT) setEndpoint(msg.value || "");
        if (msg.key === STORAGE_KEY_LIMIT) setLimit(msg.value || "");
        if (msg.key === STORAGE_KEY_PRODUCT_CATEGORY) setProductCategory(msg.value || "");
        if (msg.key === STORAGE_KEY_JSON_TEXT) setJsonText(msg.value || "");
        if (msg.key === STORAGE_KEY_RECIPE_MEAL) setRecipeMeal(msg.value || "");
        if (msg.key === STORAGE_KEY_POST_TAG) setPostTag(msg.value || "");
        if (msg.key === STORAGE_KEY_INCLUDE_COMMENTS) setIncludeComments(msg.value || "");
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
          {
            endpoint && endpoint === 'recipes'
            ? <RecipeMealSelector
                recipeMeal={recipeMeal}
                storageLoaded={storageLoaded}
                setRecipeMeal={setRecipeMeal} />
            : null
          }
          {
            endpoint && endpoint === 'posts'
            ? <PostTagSelector
                postTag={postTag}
                storageLoaded={storageLoaded}
                setPostTag={setPostTag} />
            : null
          }
        </div>
        {
          endpoint && endpoint === 'posts'
          ? <IncludeCommentsInput
              includeComments={includeComments}
              storageLoaded={storageLoaded}
              setIncludeComments={setIncludeComments} />
          : null
        }
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