import React, { useState, useEffect } from 'react';
import Square from './Square';

const Board = ({ onWinner }) => {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [gameStatus, setGameStatus] = useState('');

  const resetGame = () => {
    setSquares(Array(9).fill(null));
    setXIsNext(true);
    setGameStatus('');
  };

  useEffect(() => {
    const winner = calculateWinner(squares);
    if (winner) {
      onWinner(winner);
    } else {
      setGameStatus(`Next player: ${xIsNext ? 'X' : 'O'}`);
    }
  }, [squares, xIsNext, onWinner]);

  const handleClick = (index) => {
    if (squares[index] || calculateWinner(squares)) return;

    const newSquares = squares.slice();
    newSquares[index] = 'X';
    setSquares(newSquares);
    setXIsNext(false);
  };

  useEffect(() => {
    if (!xIsNext) {
      const bestMove = findBestMove(squares);
      if (bestMove !== null) {
        const newSquares = squares.slice();
        newSquares[bestMove] = 'O';
        setSquares(newSquares);
        setXIsNext(true);
      }
    }
  }, [xIsNext, squares]);

  const findBestMove = (squares) => {
    const availableMoves = squares.reduce((acc, curr, index) => {
      if (curr === null) acc.push(index);
      return acc;
    }, []);
    
    for (let move of availableMoves) {
      const newSquares = squares.slice();
      newSquares[move] = 'O';
      if (calculateWinner(newSquares)) {
        return move; 
      }
    }
    
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  };

  return (
    <div className="text-center">
      <div className="grid grid-cols-3 gap-4 mb-4">
        {squares.map((value, index) => (
          <Square key={index} value={value} onClick={() => handleClick(index)} />
        ))}
      </div>
      <button className="reset-button px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200" onClick={resetGame}>
        Reset Game
      </button>
      <div className="status">{gameStatus}</div>
    </div>
  );
};

const calculateWinner = (squares) => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
};

export default Board;