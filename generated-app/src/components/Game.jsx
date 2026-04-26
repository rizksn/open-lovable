import React, { useState } from 'react';
import Board from './Board';

const Game = () => {
  const [winner, setWinner] = useState(null);

  const handleWinner = (winState) => {
    setWinner(winState);
  };

  return (
    <div className="py-10">
      <h2 className="text-3xl font-bold text-center mb-4">Tic Tac Toe</h2>
      <Board onWinner={handleWinner} />
      {winner && (
        <h3 className="text-xl font-bold text-center mt-4">
          {winner === 'X' ? 'You Win!' : 'Computer Wins!'}
        </h3>
      )}
      <div className="text-center mt-4">
        <button className="reset-button px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200" onClick={() => setWinner(null)}>
          Play Again
        </button>
      </div>
    </div>
  );
};

export default Game;