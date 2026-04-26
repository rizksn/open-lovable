import React, { useState } from 'react';
import Chessboard from './Chessboard';

const ChessGame = () => {
  const [difficulty, setDifficulty] = useState('easy');

  return (
    <div className="py-10">
      <h2 className="text-3xl font-bold text-center mb-4">Play Chess</h2>
      <div className="text-center mb-6">
        <label className="mr-2">Select Difficulty:</label>
        <select
          className="border border-gray-300 rounded-md p-2"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>
      <Chessboard difficulty={difficulty} />
    </div>
  );
};

export default ChessGame;