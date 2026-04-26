import React, { useState } from 'react';
import Floor from './Floor';

const Solitaire = () => {
  const [deck, setDeck] = useState(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);
  const [cardsOnFloor, setCardsOnFloor] = useState([]);

  const drawCard = () => {
    if (deck.length > 0) {
      const card = deck.pop();
      setCardsOnFloor([...cardsOnFloor, card]);
      setDeck(deck);
    }
  };

  return (
    <div className="flex flex-col items-center p-4">
      <h2 className="text-3xl font-bold">Draw a Card</h2>
      <button
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200"
        onClick={drawCard}
      >
        Draw Card
      </button>
      <Floor cards={cardsOnFloor} />
    </div>
  );
};

export default Solitaire;