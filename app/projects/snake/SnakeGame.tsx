"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { create } from "zustand";
import clsx from "clsx";
import styles from "./SnakeGame.module.css";

interface Point {
  x: number;
  y: number;
}

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

const BOARD_SIZE = 10;
const INIT_SNAKE: Point[] = [
  { x: 4, y: 5 },
  { x: 3, y: 5 },
];
const INIT_DIRECTION: Direction = "RIGHT";
const SPEED = 300;

interface SnakeStore {
  highScore: number;
  setHighScore: (score: number) => void;
}
const useSnakeStore = create<SnakeStore>((set) => ({
  highScore: 0,
  setHighScore: (score) => set((state) => ({ highScore: Math.max(state.highScore, score) })),
}));

const getRandomPoint = (snake: Point[]): Point => {
  let point: Point;
  do {
    point = {
      x: Math.floor(Math.random() * BOARD_SIZE),
      y: Math.floor(Math.random() * BOARD_SIZE),
    };
  } while (snake.some((s) => s.x === point.x && s.y === point.y));
  return point;
};

const getNextHead = (head: Point, dir: Direction): Point => {
  switch (dir) {
    case "UP":
      return { x: head.x, y: head.y - 1 };
    case "DOWN":
      return { x: head.x, y: head.y + 1 };
    case "LEFT":
      return { x: head.x - 1, y: head.y };
    case "RIGHT":
      return { x: head.x + 1, y: head.y };
  }
};

const isCollision = (snake: Point[], next: Point): boolean => {
  return next.x < 0 || next.x >= BOARD_SIZE || next.y < 0 || next.y >= BOARD_SIZE || snake.some((s) => s.x === next.x && s.y === next.y);
};

const SnakeGame: React.FC = (): React.JSX.Element => {
  const [snake, setSnake] = useState<Point[]>(INIT_SNAKE);
  const [direction, setDirection] = useState<Direction>(INIT_DIRECTION);
  const [food, setFood] = useState<Point>(() => getRandomPoint(INIT_SNAKE));
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const { highScore, setHighScore } = useSnakeStore();
  const moveRef = useRef<Direction>(direction);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const changeDirection = useCallback((dir: Direction): void => {
    setDirection((prev) => {
      if ((dir === "UP" && prev === "DOWN") || (dir === "DOWN" && prev === "UP") || (dir === "LEFT" && prev === "RIGHT") || (dir === "RIGHT" && prev === "LEFT")) {
        return prev;
      }
      return dir;
    });
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      const directionByKey: Partial<Record<string, Direction>> = { ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT" };
      const nextDirection = directionByKey[e.key];
      if (nextDirection) {
        e.preventDefault();
        changeDirection(nextDirection);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [changeDirection]);

  useEffect(() => {
    if (gameOver) return;
    moveRef.current = direction;
    intervalRef.current = setInterval(() => {
      setSnake((prevSnake) => {
        if (!prevSnake[0]) return prevSnake;
        const next = getNextHead(prevSnake[0], moveRef.current);
        if (isCollision(prevSnake, next)) {
          setTimeout(() => {
            setGameOver(true);
            setHighScore(score);
          }, 0);
          return prevSnake;
        }
        let newSnake;
        if (next.x === food.x && next.y === food.y) {
          newSnake = [next, ...prevSnake];
          setFood(getRandomPoint(newSnake));
          setScore((s) => s + 1);
        } else {
          newSnake = [next, ...prevSnake.slice(0, -1)];
        }
        return newSnake;
      });
    }, SPEED);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [direction, food, gameOver, score, setHighScore]);

  const handleRestart = (): void => {
    setSnake(INIT_SNAKE);
    setDirection(INIT_DIRECTION);
    setFood(getRandomPoint(INIT_SNAKE));
    setScore(0);
    setGameOver(false);
  };

  const renderBoard = useCallback((): React.JSX.Element[] => {
    const cells: React.JSX.Element[] = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const isHead = snake[0] ? snake[0].x === x && snake[0].y === y : false;
        const isBody = snake[0] ? snake.slice(1).some((s) => s.x === x && s.y === y) : false;
        const isFood = food.x === x && food.y === y;
        cells.push(
          <div
            key={`${x},${y}`}
            className={clsx(styles.cell, (isHead || isBody) && styles.snakeCell, isHead && styles.headCell, isFood && styles.foodCell)}
            aria-hidden="true"
          >
            {isHead ? "🐍" : isBody ? "🐍" : isFood ? "🐭" : null}
          </div>,
        );
      }
    }
    return cells;
  }, [snake, food]);

  const ArrowButton = ({ dir, icon, label }: { dir: Direction; icon: string; label: string }) => (
    <button
      type="button"
      aria-label={label}
      className={styles.controlButton}
      onClick={() => changeDirection(dir)}
    >
      {icon}
    </button>
  );

  return (
    <div className={styles.game}>
      <div className={styles.scoreboard} aria-live="polite">
        <span><small>Score</small><strong>{score}</strong></span>
        <span><small>Session best</small><strong>{highScore}</strong></span>
      </div>
      {mounted && (
        <div
          className={styles.board}
          role="img"
          aria-label={`Snake game board. Current score ${score}.`}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
          }}
        >
          {renderBoard()}
        </div>
      )}
      {!mounted && <div className={styles.boardPlaceholder} aria-label="Loading game board" />}
      {gameOver && (
        <div className={styles.gameOver} role="status">
          <strong>Game over</strong>
          <button type="button" onClick={handleRestart}>
            Play again
          </button>
        </div>
      )}
      <p className={styles.hint}>Use the arrow keys or controls below.</p>
      <div className={styles.controls} aria-label="Game controls">
        <div>
          <ArrowButton dir="UP" icon="↑" label="Up" />
        </div>
        <div>
          <ArrowButton dir="LEFT" icon="←" label="Left" />
          <ArrowButton dir="DOWN" icon="↓" label="Down" />
          <ArrowButton dir="RIGHT" icon="→" label="Right" />
        </div>
      </div>
    </div>
  );
};

export default SnakeGame;
