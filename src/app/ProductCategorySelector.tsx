import React, { useEffect, useState } from "react";
import SelectorIcon from "./SelectorIcon";
import { STORAGE_KEY_PRODUCT_CATEGORY } from "./constants";

interface ProductCategorySelectorProps {
  productCategory: string;
  storageLoaded: boolean;
  setProductCategory: (productCategory: string) => void;
}

const initialValue = { slug: "", name: "All categories" };

const ProductCategorySelector: React.FC<ProductCategorySelectorProps> = ({ 
  productCategory,
  storageLoaded,
  setProductCategory
}) => {
  const [categories, setCategories] = useState([initialValue]);

  const handleCategoryChange = (value: string) => {
    setProductCategory(value);
  };

  useEffect(() => {
    if (storageLoaded) {
      parent.postMessage({
        pluginMessage: { type: "save-storage", key: STORAGE_KEY_PRODUCT_CATEGORY, value: productCategory },
      }, "*");
    }
  }, [productCategory]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('https://dummyjson.com/products/categories');
        const json = await res.json();
        setCategories([
          initialValue,
          ...json
        ]);
      } catch {
        alert("Failed to fetch product categories.");
      }
    };

    fetchData();
  }, []);

  return (
    <div className="c-control">
      <label 
        className="c-control__label"
        htmlFor="category">
        Category
      </label>
      <select
        className="c-control__input"
        id="category"
        value={productCategory}
        onChange={(e) => handleCategoryChange(e.target.value)}>
        {
          categories.map((opt) => (
            <option key={opt.slug} value={opt.slug}>
              {opt.name}
            </option>
          ))
        }
      </select>
      <SelectorIcon />
    </div>
  );
};

export default ProductCategorySelector;