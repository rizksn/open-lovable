import React from 'react';

const Floor = ({ cards }) => {
  return (
    <div className="flex justify-center space-x-2 mt-4">
      {cards.map((card, index) => (
        <div key={index} className="w-16 h-24 bg-white shadow-md rounded-md flex items-center justify-center">
          {card}
        </div>
      ))}
    </div>
  );
};

export default Floor;