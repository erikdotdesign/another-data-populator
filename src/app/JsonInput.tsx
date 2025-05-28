import React from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  error: string;
  textareaRef: any;
}

const JsonInput: React.FC<Props> = ({ value, onChange, error, textareaRef }) => {
  return (
    <div className='c-control'>
      <label 
        className='c-control__label'
        htmlFor="json">
        Paste or edit JSON
      </label>
      <textarea
        ref={textareaRef}
        className={`c-control__input c-control__input--textarea ${error ? 'c-control__input--error' : ''}`}
        id="json"
        value={value}
        onChange={(e) => onChange(e.target.value)} />
      <div className='c-control__message'>
        { error }
      </div>
    </div>
  );
};

export default JsonInput;