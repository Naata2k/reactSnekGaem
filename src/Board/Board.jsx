import React, { useEffect, useState } from 'react';
import {
  randomIntFromInterval,
  reverseLinkedList,
  useInterval,
} from '../lib/utils.js'; //tarvittavat apu funktiot

import './Board.css';

//linked listan node
class LinkedListNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

//linked lista
class LinkedList {
  constructor(value) {
    const node = new LinkedListNode(value);
    this.head = node;
    this.tail = node;
  }
}

//suunta vakiot
const Direction = {
  UP: 'UP',
  RIGHT: 'RIGHT',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
};

//peliin littyviä muuttujia
const BOARD_SIZE = 15;
const PROBABILITY_OF_DIRECTION_REVERSAL_FOOD = 0.3;
const defaultSpeed = 150;

//funktio käärmeen aloitus paikan selvittämiseksi
const getStartingSnakeLLValue = board => {
  const rowSize = board.length;
  const colSize = board[0].length;
  const startingRow = Math.round(rowSize / 3);
  const startingCol = Math.round(colSize / 3);
  const startingCell = board[startingRow][startingCol];
  return {
    row: startingRow,
    col: startingCol,
    cell: startingCell,
  };
};

const Board = () => {
  //tarvittavat muuttujat useState:lle
  const [speed, setSpeed] = useState(defaultSpeed);
  const [gameOver, setGameOver] = useState(false);
  const [board, setBoard] = useState(createBoard(BOARD_SIZE));
  const [score, setScore] = useState(0);
  const [snake, setSnake] = useState(
    new LinkedList(getStartingSnakeLLValue(board)),
  );
  const [snakeCells, setSnakeCells] = useState(
    new Set([snake.head.value.cell]),
  );
  const [foodCell, setFoodCell] = useState(snake.head.value.cell + 5);
  const [direction, setDirection] = useState(Direction.RIGHT);
  const [foodShouldReverseDirection, setFoodShouldReverseDirection] = useState(
    false,
  );

  const restartGame = () => {
    // Palauta muuttujien alkuperäiset arvot pelin loputtua
    setGameOver(false);
    setScore(0);
    const newBoard = createBoard(BOARD_SIZE);
    setBoard(newBoard);
    const startingSnakeLLValue = getStartingSnakeLLValue(newBoard);
    setSnake(new LinkedList(startingSnakeLLValue));
    setSnakeCells(new Set([startingSnakeLLValue.cell]));
    setFoodCell(startingSnakeLLValue.cell + 5);
    setDirection(Direction.RIGHT);
    setFoodShouldReverseDirection(false);
    setSpeed(defaultSpeed);
  };
  

  useEffect(() => {
    //suunnan vaihto
    const handleKeydown = e => {
      const newDirection = getDirectionFromKey(e.key);
      const isValidDirection = newDirection !== '';

      //onko suunta hyväksytty
      if (!isValidDirection) return;

      //tarkistetaan syökö käärme itsensä jos vaihtaa suuntaa
      const snakeWillRunIntoItself =
        getOppositeDirection(newDirection) === direction && snakeCells.size > 1;

      //jos kyllä, älä vaihda suuntaa
      if (snakeWillRunIntoItself) return;

      setDirection(newDirection);
    };

    window.addEventListener('keydown', handleKeydown);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [direction, snakeCells]);

  //jos peli ei ole ohi niin käärme liikkuu annetulla nopeudella
  useInterval(() => {
    if (!gameOver) {
      moveSnake();
    }
  }, speed);
  

  const moveSnake = () => {
    const currentHeadCoords = {
      row: snake.head.value.row,
      col: snake.head.value.col,
    };

    //seuraavat pään kordinaatit käärmeen suunnan perusteella
    const nextHeadCoords = getCoordsInDirection(currentHeadCoords, direction);

    //tsekataan onko käärme yli pelilaudan
    if (isOutOfBounds(nextHeadCoords, board)) {
      handleGameOver();
      return;
    }
    const nextHeadCell = board[nextHeadCoords.row][nextHeadCoords.col];

    //tarkistetaan osuuko käärme itseensä
    if (snakeCells.has(nextHeadCell)) {
      handleGameOver();
      return;
    }

    const newHead = new LinkedListNode({
      row: nextHeadCoords.row,
      col: nextHeadCoords.col,
      cell: nextHeadCell,
    });

    const currentHead = snake.head;
    snake.head = newHead;
    currentHead.next = newHead;

    //poistetaan käärmeen viimeinen ruutu (häntä) ja lisätään uusi käärmeen pää
    const newSnakeCells = new Set(snakeCells);
    newSnakeCells.delete(snake.tail.value.cell);
    newSnakeCells.add(nextHeadCell);

    //liikutetaan käärmeen häntä seuraavaan nodeen linked listassa
    snake.tail = snake.tail.next;
    if (snake.tail === null) snake.tail = snake.head;

    const foodConsumed = nextHeadCell === foodCell;
    if (foodConsumed) {
      //jos syö ruuan, kasvata käärmettä tai käännä suuntaa tarvittaessa
      growSnake(newSnakeCells);
      if (foodShouldReverseDirection) reverseSnake();
      handleFoodConsumption(newSnakeCells);
    }
    //päivitetään käärmeen solut
    setSnakeCells(newSnakeCells);
  };

  const growSnake = newSnakeCells => {
    const growthNodeCoords = getGrowthNodeCoords(snake.tail, direction);
    if (isOutOfBounds(growthNodeCoords, board)) {
      return;
    }
    const newTailCell = board[growthNodeCoords.row][growthNodeCoords.col];
    const newTail = new LinkedListNode({
      row: growthNodeCoords.row,
      col: growthNodeCoords.col,
      cell: newTailCell,
    });
    const currentTail = snake.tail;
    snake.tail = newTail;
    snake.tail.next = currentTail;

    newSnakeCells.add(newTailCell);
  };


  const reverseSnake = () => {
    const tailNextNodeDirection = getNextNodeDirection(snake.tail, direction);
    const newDirection = getOppositeDirection(tailNextNodeDirection);
    setDirection(newDirection);

    //käännetään linked lista alkaen käärmeen hännästä
    reverseLinkedList(snake.tail);

    //vaihda pään ja hännän paikat linked listassa
    const snakeHead = snake.head;
    snake.head = snake.tail;
    snake.tail = snakeHead;
  };


  const handleFoodConsumption = newSnakeCells => {
    const maxPossibleCellValue = BOARD_SIZE * BOARD_SIZE;
    let nextFoodCell;

    //luodaan satunnainen solu johon ruuan laitta, tsekataan että ruoka ei mene käärmeen päälle
    while (true) {
      nextFoodCell = randomIntFromInterval(1, maxPossibleCellValue);
      if (newSnakeCells.has(nextFoodCell) || foodCell === nextFoodCell)
        continue;
      break;
    }

    //päätetään onko ruoka käärmeen suunnan vaihtava
    const nextFoodShouldReverseDirection =
      Math.random() < PROBABILITY_OF_DIRECTION_REVERSAL_FOOD;

    //päivitetään pisteet, ruuan paikka, ja onko ruoka suuntaa vaihtava
    setFoodCell(nextFoodCell);
    setFoodShouldReverseDirection(nextFoodShouldReverseDirection);
    setScore(score + 1);
  };

  const handleGameOver = () => {
    //käärmeen vauhti 0, jotta käärme ei jatka liikkumista vaikka lopetus ruutu on näkyvillä
    setSpeed(0);
    setGameOver(true);
    const snakeLLStartingValue = getStartingSnakeLLValue(board);
    setSnake(new LinkedList(snakeLLStartingValue));
    setFoodCell(snakeLLStartingValue.cell + 5);
    setSnakeCells(new Set([snakeLLStartingValue.cell]));
    setDirection(Direction.RIGHT);
  };

  return (
    <>
      {gameOver ? (
        <div className="ending-screen">
          <h1>Game Over</h1>
          <p>Your Score: {score}</p>
          <button onClick={restartGame}>Restart</button>
        </div>
      ) : (
        <>
          <h1>Score: {score}</h1>
          <div className="board">
            {board.map((row, rowIdx) => (
              <div key={rowIdx} className="row">
                {row.map((cellValue, colIdx) => {
                  const className = getCellClassName(
                    cellValue,
                    foodCell,
                    foodShouldReverseDirection,
                    snakeCells,
                  );
                  return <div key={colIdx} className={className}></div>;
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
  
};

//luodaan peli lauta riippuen pelilaudan koosta
const createBoard = BOARD_SIZE => {
  let counter = 1;
  const board = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    const currentRow = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      currentRow.push(counter++);
    }
    board.push(currentRow);
  }
  return board;
};
//seuraavien kordinaattien laskenta, suunnan ja nykyisten kordinaattien perusteella
const getCoordsInDirection = (coords, direction) => {
  if (direction === Direction.UP) {
    return {
      row: coords.row - 1,
      col: coords.col,
    };
  }
  if (direction === Direction.RIGHT) {
    return {
      row: coords.row,
      col: coords.col + 1,
    };
  }
  if (direction === Direction.DOWN) {
    return {
      row: coords.row + 1,
      col: coords.col,
    };
  }
  if (direction === Direction.LEFT) {
    return {
      row: coords.row,
      col: coords.col - 1,
    };
  }
};

//funktio tarkistamaan onko käärme yli pelilaudan vai ei
const isOutOfBounds = (coords, board) => {
  const { row, col } = coords;
  if (row < 0 || col < 0) return true;
  if (row >= board.length || col >= board[0].length) return true;
  return false;
};

//suunnan vaihto
const getDirectionFromKey = key => {
  if (key === 'ArrowUp') return Direction.UP;
  if (key === 'ArrowRight') return Direction.RIGHT;
  if (key === 'ArrowDown') return Direction.DOWN;
  if (key === 'ArrowLeft') return Direction.LEFT;
  return '';
};

const getNextNodeDirection = (node, currentDirection) => {
  if (node.next === null) return currentDirection;
  const { row: currentRow, col: currentCol } = node.value;
  const { row: nextRow, col: nextCol } = node.next.value;

  if (
    (currentDirection === Direction.RIGHT && nextCol === currentCol - 1) ||
    (currentDirection === Direction.LEFT && nextCol === currentCol + 1) ||
    (currentDirection === Direction.DOWN && nextRow === currentRow - 1) ||
    (currentDirection === Direction.UP && nextRow === currentRow + 1)
  ) {
    return currentDirection;
  }
  //verrataan seuraava nodea nykyiseen nodeen 
  if (nextRow === currentRow && nextCol === currentCol + 1) {
    return Direction.RIGHT;
  }
  if (nextRow === currentRow && nextCol === currentCol - 1) {
    return Direction.LEFT;
  }
  if (nextCol === currentCol && nextRow === currentRow + 1) {
    return Direction.DOWN;
  }
  if (nextCol === currentCol && nextRow === currentRow - 1) {
    return Direction.UP;
  }

  return '';
};

const getGrowthNodeCoords = (snakeTail, currentDirection) => {
  const tailNextNodeDirection = getNextNodeDirection(
    snakeTail,
    currentDirection,
  );
  const growthDirection = getOppositeDirection(tailNextNodeDirection);
  const currentTailCoords = {
    row: snakeTail.value.row,
    col: snakeTail.value.col,
  };
  const growthNodeCoords = getCoordsInDirection(
    currentTailCoords,
    growthDirection,
  );
  return growthNodeCoords;
};

//vastakkaisen suunan laskenta, suunnan vaihtavaa ruokaa varten
const getOppositeDirection = direction => {
  if (direction === Direction.UP) return Direction.DOWN;
  if (direction === Direction.RIGHT) return Direction.LEFT;
  if (direction === Direction.DOWN) return Direction.UP;
  if (direction === Direction.LEFT) return Direction.RIGHT;
};


//css funktio solujen väreille
const getCellClassName = (
  cellValue,
  foodCell,
  foodShouldReverseDirection,
  snakeCells,
) => {
  let className = 'cell';
  if (cellValue === foodCell) {
    if (foodShouldReverseDirection) {
      className = 'cell cell-purple';
    } else {
      className = 'cell cell-red';
    }
  }

  if (snakeCells.has(cellValue)) className = 'cell cell-green';

  return className;
};

export default Board;
