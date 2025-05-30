import React, { useEffect, useState } from "react";
import SelectorIcon from "./SelectorIcon";
import { STORAGE_KEY_POST_TAG } from "./constants";

interface PostTagSelectorProps {
  postTag: string;
  storageLoaded: boolean;
  setPostTag: (postTag: string) => void;
}

const initialValue = { value: "", name: "All tags" };

const PostTagSelector: React.FC<PostTagSelectorProps> = ({ 
  postTag,
  storageLoaded,
  setPostTag
}) => {
  const [tags, setTags] = useState([initialValue]);

  const handleTagChange = (value: string) => {
    setPostTag(value);
  };

  useEffect(() => {
    if (storageLoaded) {
      parent.postMessage({
        pluginMessage: { type: "save-storage", key: STORAGE_KEY_POST_TAG, value: postTag },
      }, "*");
    }
  }, [postTag]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('https://dummyjson.com/posts/tag-list');
        const json = await res.json();
        setTags([
          initialValue,
          ...json.map((tag) => ({
            name: tag.charAt(0).toUpperCase() + tag.slice(1),
            value: tag
          }))
        ]);
      } catch {
        alert("Failed to fetch post tags.");
      }
    };

    fetchData();
  }, []);

  return (
    <div className="c-control">
      <label 
        className="c-control__label"
        htmlFor="postTag">
        Tag
      </label>
      <select
        className="c-control__input"
        id="postTag"
        value={postTag}
        onChange={(e) => handleTagChange(e.target.value)}>
        {
          tags.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.name}
            </option>
          ))
        }
      </select>
      <SelectorIcon />
    </div>
  );
};

export default PostTagSelector;