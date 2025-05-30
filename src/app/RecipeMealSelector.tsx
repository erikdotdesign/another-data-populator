import React, { useEffect, useState } from "react";
import SelectorIcon from "./SelectorIcon";
import { STORAGE_KEY_RECIPE_MEAL } from "./constants";

interface RecipeMealSelectorProps {
  recipeMeal: string;
  storageLoaded: boolean;
  setRecipeMeal: (recipeMeal: string) => void;
}

const initialValue = { value: "", name: "All meals" };

const RecipeMealSelector: React.FC<RecipeMealSelectorProps> = ({ 
  recipeMeal,
  storageLoaded,
  setRecipeMeal
}) => {
  const [meals, setMeals] = useState([initialValue]);

  const handleMealChange = (value: string) => {
    setRecipeMeal(value);
  };

  useEffect(() => {
    if (storageLoaded) {
      parent.postMessage({
        pluginMessage: { type: "save-storage", key: STORAGE_KEY_RECIPE_MEAL, value: recipeMeal },
      }, "*");
    }
  }, [recipeMeal]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('https://dummyjson.com/recipes?limit=100&select=mealType');
        const json = await res.json();
        const mealTypes = json.recipes.flatMap(recipe => recipe.mealType).filter(Boolean);
        const uniqueMealTypes = [...new Set(mealTypes)] as string[];
        setMeals([
          initialValue,
          ...uniqueMealTypes.map((meal) => ({
            value: meal,
            name: meal
          }))
        ]);
      } catch {
        alert("Failed to fetch recipe meal types.");
      }
    };

    fetchData();
  }, []);

  return (
    <div className="c-control">
      <label 
        className="c-control__label"
        htmlFor="meal">
        Meal
      </label>
      <select
        className="c-control__input"
        id="meal"
        value={recipeMeal}
        onChange={(e) => handleMealChange(e.target.value)}>
        {
          meals.map((opt) => (
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

export default RecipeMealSelector;