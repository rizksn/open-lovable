import React, { useEffect, useState } from 'react';
import Square from './Square';

const Chessboard = ({ difficulty }) => {
  const initialBoard = [
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ];
  const [board, setBoard] = useState(initialBoard);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);

  useEffect(() => {
    if (!isPlayerTurn) {
      makeComputerMove();
    }
  }, [isPlayerTurn]);

  const makeComputerMove = () => {
    const bestMove = getBestMove(difficulty);
    if (bestMove) {
      const newBoard = [...board];
      newBoard[bestMove[0]][bestMove[1]] = 'X'; // Assume 'X' is the computer's piece
      setBoard(newBoard);
      setIsPlayerTurn(true);
    }
  };

  const getBestMove = (difficulty) => {
    const availableMoves = getAvailableMoves();
    if (difficulty === 'easy') {
      return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }
    return availableMoves[0]; // Placeholder for harder difficulty
  };

  const getAvailableMoves = () => {
    // Placeholder for actual available moves
    return [[0, 0]]; 
  };

  const handleSquareClick = (row, col) => {
    if (isPlayerTurn && !board[row][col]) {
      const newBoard = [...board];
      newBoard[row][col] = 'O'; // Assume 'O' is the player's piece
      setBoard(newBoard);
      setIsPlayerTurn(false);
    }
  };

  return (
    <div className="grid grid-cols-8 gap-1">
      {board.map((row, rowIndex) =>
        row.map((cell, colIndex) => (
          <Square
            key={`${rowIndex}-${colIndex}`}
            value={cell}
            onClick={() => handleSquareClick(rowIndex, colIndex)}
          />
        ))
      )}
    </div>
  );
};

export default Chessboard;