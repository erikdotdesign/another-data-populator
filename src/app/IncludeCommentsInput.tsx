import React, { useEffect, useState } from "react";
import { STORAGE_KEY_INCLUDE_COMMENTS } from "./constants";

interface IncludeCommentsInputProps {
  includeComments: boolean;
  storageLoaded: boolean;
  setIncludeComments: (includeComments: boolean) => void;
}

const IncludeCommentsInput: React.FC<IncludeCommentsInputProps> = ({ 
  includeComments,
  storageLoaded,
  setIncludeComments
}) => {

  const handleIncludeCommentsChange = () => {
    setIncludeComments(!includeComments);
  };

  useEffect(() => {
    if (storageLoaded) {
      parent.postMessage({
        pluginMessage: { type: "save-storage", key: STORAGE_KEY_INCLUDE_COMMENTS, value: includeComments },
      }, "*");
    }
  }, [includeComments]);

  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const posts = jsonText;

  //       const postsWithComments = await Promise.all(
  //         posts.map(async (post) => {
  //           const commentsRes = await fetch(`https://dummyjson.com/comments/post/${post.id}`);
  //           const commentsData = await commentsRes.json();
  //           return {
  //             ...post,
  //             comments: commentsData.comments,
  //           };
  //         })
  //       );
  //       // const res = await fetch('https://dummyjson.com/posts/tag-list');
  //       // const json = await res.json();
  //       // setTags([
  //       //   initialValue,
  //       //   ...json.map((tag) => ({
  //       //     name: tag,
  //       //     value: tag
  //       //   }))
  //       // ]);
  //     } catch {
  //       alert("Failed to fetch post tags.");
  //     }
  //   };

  //   fetchData();
  // }, []);

  return (
    <div className="c-control c-control--checkbox">
      <label 
        className="c-control__label"
        htmlFor="includeComments">
        Include comments
      </label>
      <input
        className="c-control__input"
        id="includeComments"
        type="checkbox"
        checked={includeComments}
        onChange={handleIncludeCommentsChange} />
      <span className="c-control__checkmark" />
    </div>
  );
};

export default IncludeCommentsInput;