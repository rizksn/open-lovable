import React, { useState } from 'react';

const Calculator = () => {
  const [input, setInput] = useState('');

  const handleButtonClick = (value) => {
    setInput((prev) => prev + value);
  };

  const handleClear = () => {
    setInput('');
  };

  const handleCalculate = () => {
    try {
      setInput(eval(input).toString());
    } catch {
      setInput('Error');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-right mb-4">
        <input
          type="text"
          value={input}
          readOnly
          className="w-full p-3 border border-gray-300 rounded-md text-xl"
        />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {['7', '8', '9', '/'].map((value) => (
          <button
            key={value}
            className="p-4 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition-all duration-200"
            onClick={() => handleButtonClick(value)}
          >
            {value}
          </button>
        ))}
        {['4', '5', '6', '*'].map((value) => (
          <button
            key={value}
            className="p-4 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition-all duration-200"
            onClick={() => handleButtonClick(value)}
          >
            {value}
          </button>
        ))}
        {['1', '2', '3', '-'].map((value) => (
          <button
            key={value}
            className="p-4 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition-all duration-200"
            onClick={() => handleButtonClick(value)}
          >
            {value}
          </button>
        ))}
        {['0', '.', '=', '+'].map((value) => (
          <button
            key={value}
            className="p-4 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition-all duration-200"
            onClick={value === '=' ? handleCalculate : () => handleButtonClick(value)}
          >
            {value}
          </button>
        ))}
        <button
          className="col-span-4 p-4 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition-all duration-200"
          onClick={handleClear}
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default Calculator;