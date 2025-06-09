// SnakeGame.tsx - Classic Snake game as a mobile-first, responsive React component
// Uses 🐍 for snake, 🐭 for food, dark background, and supports clickable arrow controls

"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { create } from "zustand";
import clsx from "clsx";

// Types
interface Point {
  x: number;
  y: number;
}

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

// Game constants
const BOARD_SIZE = 10; // 10x10 grid
const INIT_SNAKE: Point[] = [
  { x: 4, y: 5 },
  { x: 3, y: 5 },
];
const INIT_DIRECTION: Direction = "RIGHT";
const SPEED = 300; // ms per move

// Zustand store for high score
interface SnakeStore {
  highScore: number;
  setHighScore: (score: number) => void;
}
const useSnakeStore = create<SnakeStore>((set) => ({
  highScore: 0,
  setHighScore: (score) => set((state) => ({ highScore: Math.max(state.highScore, score) })),
}));

// Utility
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
  // Wall or self
  if (next.x < 0 || next.x >= BOARD_SIZE || next.y < 0 || next.y >= BOARD_SIZE || snake.some((s) => s.x === next.x && s.y === next.y)) {
    return true;
  }
  return false;
};

// Main component
const SnakeGame: React.FC = (): JSX.Element => {
  // State
  const [snake, setSnake] = useState<Point[]>(INIT_SNAKE);
  const [direction, setDirection] = useState<Direction>(INIT_DIRECTION);
  const [food, setFood] = useState<Point>(() => getRandomPoint(INIT_SNAKE));
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const { highScore, setHighScore } = useSnakeStore();
  const moveRef = useRef<Direction>(direction);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  // Ensure board only renders on client to avoid hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle direction change (no reverse)
  const changeDirection = useCallback((dir: Direction): void => {
    setDirection((prev) => {
      if ((dir === "UP" && prev === "DOWN") || (dir === "DOWN" && prev === "UP") || (dir === "LEFT" && prev === "RIGHT") || (dir === "RIGHT" && prev === "LEFT")) {
        return prev;
      }
      return dir;
    });
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "ArrowUp") changeDirection("UP");
      if (e.key === "ArrowDown") changeDirection("DOWN");
      if (e.key === "ArrowLeft") changeDirection("LEFT");
      if (e.key === "ArrowRight") changeDirection("RIGHT");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [changeDirection]);

  // Main game loop
  useEffect(() => {
    if (gameOver) return;
    moveRef.current = direction;
    intervalRef.current = setInterval(() => {
      setSnake((prevSnake) => {
        if (!prevSnake[0]) return prevSnake;
        const next = getNextHead(prevSnake[0], moveRef.current);
        if (isCollision(prevSnake, next)) {
          // Move setHighScore and setGameOver OUTSIDE of render cycle
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

  // Reset game
  const handleRestart = (): void => {
    setSnake(INIT_SNAKE);
    setDirection(INIT_DIRECTION);
    setFood(getRandomPoint(INIT_SNAKE));
    setScore(0);
    setGameOver(false);
  };

  // Render board
  const renderBoard = useCallback((): JSX.Element[] => {
    const cells: JSX.Element[] = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const isHead = snake[0] ? snake[0].x === x && snake[0].y === y : false;
        const isBody = snake[0] ? snake.slice(1).some((s) => s.x === x && s.y === y) : false;
        const isFood = food.x === x && food.y === y;
        cells.push(
          <div
            key={`${x},${y}`}
            className={clsx("sq:text-3xl flex items-center justify-center text-2xl", "sq:h-10 sq:w-10 h-7 w-7 border border-gray-700", isHead && "z-10", isFood && "z-20")}
            style={{ background: isHead || isBody ? "#222" : "#18181b" }}
          >
            {isHead ? "🐍" : isBody ? "🐍" : isFood ? "🐭" : null}
          </div>,
        );
      }
    }
    return cells;
  }, [snake, food]);

  // Arrow button UI
  const ArrowButton = ({ dir, icon, label }: { dir: Direction; icon: string; label: string }) => (
    <button
      aria-label={label}
      className="sq:h-14 sq:w-14 flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 text-2xl text-white shadow-md active:bg-gray-700"
      onClick={() => changeDirection(dir)}
      tabIndex={0}
    >
      {icon}
    </button>
  );

  return (
    <div className="sq:max-w-md mx-auto flex w-full max-w-xs flex-col items-center py-4">
      <div className="mb-2 flex w-full justify-between">
        <span className="text-accent font-bold">Score: {score}</span>
        <span className="text-accent font-bold">High: {highScore}</span>
      </div>
      {mounted && (
        <div
          className="sq:p-2 rounded-lg bg-zinc-900 p-1 shadow-lg"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
            gap: "2px",
            width: "min-content",
          }}
        >
          {renderBoard()}
        </div>
      )}
      {!mounted && <div className="sq:h-[400px] sq:w-[400px] h-[280px] w-[280px] animate-pulse rounded-lg bg-zinc-900" />}
      {gameOver && (
        <div className="mt-4 text-center">
          <div className="mb-2 text-lg font-bold text-red-400">Game Over</div>
          <button className="bg-accent hover:bg-accent/90 rounded-lg px-4 py-2 font-semibold text-white shadow-md" onClick={handleRestart}>
            Restart
          </button>
        </div>
      )}
      {/* Arrow controls */}
      <div className="mt-4 flex flex-col items-center gap-2 select-none">
        <div className="flex gap-8">
          <ArrowButton dir="UP" icon="↑" label="Up" />
        </div>
        <div className="flex gap-8">
          <ArrowButton dir="LEFT" icon="←" label="Left" />
          <ArrowButton dir="DOWN" icon="↓" label="Down" />
          <ArrowButton dir="RIGHT" icon="→" label="Right" />
        </div>
      </div>
    </div>
  );
};

export default SnakeGame;
