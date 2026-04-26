import React from 'react';

const Square = ({ value, onClick }) => {
  return (
    <button
      className={`w-32 h-32 flex items-center justify-center text-5xl font-bold rounded-md transition-transform duration-200 ${
        value === 'X' ? 'bg-blue-500 text-white' : value === 'O' ? 'bg-blue-300 text-black' : 'bg-white'
      } border border-gray-300 hover:shadow-lg`}
      onClick={onClick}
    >
      {value}
    </button>
  );
};

export default Square;