import React from 'react';

interface Props {
  value: string;
  onChange: (endpoint: string) => void;
}

const PresetSelector: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className='c-control'>
      <label
        className='c-control__label'
        htmlFor="endpoint">
        Select preset JSON
      </label>
      <select
        className='c-control__input'
        id="endpoint"
        onChange={(e) => onChange(e.target.value)}
        value={value}>
        <option value="">Select preset</option>
        <option value="products">Products</option>
        <option value="carts">Carts</option>
        <option value="recipes">Recipes</option>
        <option value="users">Users</option>
        <option value="posts">Posts</option>
        <option value="comments">Comments</option>
        <option value="todos">Todos</option>
        <option value="quotes">Quotes</option>
      </select>
      <div className="c-control__icon">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000"><path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/></svg>
      </div>
    </div>
  );
};

export default PresetSelector;