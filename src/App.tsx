import React, { useState, useEffect, useRef } from 'react';
import { Trophy, RotateCcw, Play, Pause, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const BASE_SPEED = 150;

const WORDS = [
  "SERPENTE", "MELA", "GIOCO", "COMPUTER", "PROGRAMMA", 
  "TASTIERA", "PYTHON", "REACT", "JAVASCRIPT", "CODICE",
  "INFORMATICA", "SVILUPPO", "WEB", "INTERNET", "SCHERMO",
  "ALGORITMO", "VARIABILE", "FUNZIONE", "SISTEMA", "RETE"
];

const generateFoodsForWord = (word: string, snake: {x: number, y: number}[]) => {
  const foods: {id: string, x: number, y: number, letter: string}[] = [];
  const occupied = [...snake];
  
  for (let i = 0; i < word.length; i++) {
    let newPos;
    while (true) {
      newPos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      const isOccupied = occupied.some(pos => pos.x === newPos.x && pos.y === newPos.y);
      if (!isOccupied) break;
    }
    foods.push({ id: `${i}-${newPos.x}-${newPos.y}`, ...newPos, letter: word[i] });
    occupied.push(newPos);
  }
  
  return foods;
};

// Custom hook for intervals that always reads the latest state
function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current(), delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const directionQueue = useRef<{x: number, y: number}[]>([]);
  
  const [word, setWord] = useState(WORDS[0]);
  const [wordIndex, setWordIndex] = useState(0);
  const [foods, setFoods] = useState(() => generateFoodsForWord(WORDS[0], INITIAL_SNAKE));
  
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snakeSpellerHighScore');
    return saved ? parseInt(saved, 10) : 0;
  });
  
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(BASE_SPEED);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('snakeSpellerHighScore', score.toString());
    }
  }, [score, highScore]);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    directionQueue.current = [];
    const newWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    setWord(newWord);
    setWordIndex(0);
    setFoods(generateFoodsForWord(newWord, INITIAL_SNAKE));
    setScore(0);
    setSpeed(BASE_SPEED);
    setGameOver(false);
    setIsPaused(false);
    containerRef.current?.focus();
  };

  const startGame = () => {
    setHasStarted(true);
    containerRef.current?.focus();
  };

  useInterval(() => {
    if (!hasStarted || gameOver || isPaused) return;

    let currentNextDir = direction;
    if (directionQueue.current.length > 0) {
      currentNextDir = directionQueue.current.shift()!;
      setDirection(currentNextDir);
    }

    const head = snake[0];
    const newHead = {
      x: head.x + currentNextDir.x,
      y: head.y + currentNextDir.y
    };

    // Check wall collision
    if (
      newHead.x < 0 ||
      newHead.x >= GRID_SIZE ||
      newHead.y < 0 ||
      newHead.y >= GRID_SIZE
    ) {
      setGameOver(true);
      return;
    }

    // Check self collision
    if (snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
      setGameOver(true);
      return;
    }

    const newSnake = [newHead, ...snake];

    // Check food collision
    const eatenFoodIndex = foods.findIndex(f => f.x === newHead.x && f.y === newHead.y);
    if (eatenFoodIndex !== -1) {
      const eatenFood = foods[eatenFoodIndex];
      if (eatenFood.letter === word[wordIndex]) {
        // Correct letter!
        setScore(s => s + 10);
        
        const newFoods = [...foods];
        newFoods.splice(eatenFoodIndex, 1);
        
        const nextIndex = wordIndex + 1;
        if (nextIndex >= word.length) {
          setScore(s => s + 50); // Word completion bonus
          const nextWord = WORDS[Math.floor(Math.random() * WORDS.length)];
          setWord(nextWord);
          setWordIndex(0);
          setFoods(generateFoodsForWord(nextWord, newSnake));
          setSpeed(s => Math.max(60, s - 5)); // Increase speed slightly
        } else {
          setWordIndex(nextIndex);
          setFoods(newFoods);
        }
      } else {
        // Wrong letter!
        setGameOver(true);
        return;
      }
    } else {
      newSnake.pop(); // Remove tail if no food eaten
    }

    setSnake(newSnake);
  }, speed);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for game keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (!hasStarted || gameOver) return;
      
      const lastDir = directionQueue.current.length > 0 
        ? directionQueue.current[directionQueue.current.length - 1] 
        : direction;

      let newDir = null;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (lastDir.y !== 1) newDir = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (lastDir.y !== -1) newDir = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (lastDir.x !== 1) newDir = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (lastDir.x !== -1) newDir = { x: 1, y: 0 };
          break;
        case ' ':
        case 'Escape':
          setIsPaused(p => !p);
          return;
      }

      if (newDir) {
        if (lastDir.x !== newDir.x || lastDir.y !== newDir.y) {
          directionQueue.current.push(newDir);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, gameOver, direction]);

  const handleDirectionClick = (newDir: {x: number, y: number}) => {
    if (!hasStarted || gameOver || isPaused) return;
    
    const lastDir = directionQueue.current.length > 0 
      ? directionQueue.current[directionQueue.current.length - 1] 
      : direction;

    if (lastDir.x !== 0 && newDir.x === -lastDir.x) return;
    if (lastDir.y !== 0 && newDir.y === -lastDir.y) return;

    if (lastDir.x !== newDir.x || lastDir.y !== newDir.y) {
      directionQueue.current.push(newDir);
    }
  };

  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans selection:bg-emerald-500/30 outline-none"
    >
      
      {/* Header / Word Display */}
      <div className="flex space-x-1 sm:space-x-2 text-2xl sm:text-4xl font-black tracking-widest mb-6 h-12 items-center">
        {word.split('').map((letter, idx) => {
          let colorClass = "text-slate-700";
          let transformClass = "";
          
          if (idx < wordIndex) {
            colorClass = "text-emerald-400";
          } else if (idx === wordIndex) {
            colorClass = "text-rose-400";
            transformClass = "scale-125 -translate-y-1";
          }
          
          return (
            <span 
              key={idx} 
              className={`${colorClass} ${transformClass} transition-all duration-300 inline-block`}
            >
              {letter}
            </span>
          );
        })}
      </div>

      {/* Score Board */}
      <div className="flex justify-between w-full max-w-[500px] mb-4 text-slate-300 font-mono px-2">
        <div className="flex flex-col">
          <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider font-bold">Punteggio</span>
          <span className="text-xl sm:text-2xl font-bold text-white">{score}</span>
        </div>
        
        <button 
          onClick={() => {
            if (hasStarted && !gameOver) {
              setIsPaused(!isPaused);
              containerRef.current?.focus();
            }
          }}
          className="p-2 text-slate-400 hover:text-white transition-colors"
          disabled={!hasStarted || gameOver}
        >
          {isPaused ? <Play size={24} /> : <Pause size={24} />}
        </button>

        <div className="flex flex-col items-end">
          <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1">
            <Trophy size={12} /> Record
          </span>
          <span className="text-xl sm:text-2xl font-bold text-amber-400">{highScore}</span>
        </div>
      </div>

      {/* Game Board */}
      <div className="relative w-full max-w-[500px] aspect-square">
        <div 
          className="absolute inset-0 bg-slate-900 border-4 border-slate-800 rounded-xl overflow-hidden shadow-2xl shadow-emerald-900/20"
        >
          {/* Grid lines (optional, subtle) */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, #ffffff 1px, transparent 1px),
                linear-gradient(to bottom, #ffffff 1px, transparent 1px)
              `,
              backgroundSize: `${100/GRID_SIZE}% ${100/GRID_SIZE}%`
            }}
          />

          {/* Foods */}
          {foods.map((f) => (
            <div 
              key={f.id}
              className="absolute bg-rose-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.4)] flex items-center justify-center text-white font-bold text-xs sm:text-sm z-10"
              style={{
                left: `${(f.x / GRID_SIZE) * 100}%`,
                top: `${(f.y / GRID_SIZE) * 100}%`,
                width: `${100 / GRID_SIZE}%`,
                height: `${100 / GRID_SIZE}%`,
              }}
            >
              {f.letter}
            </div>
          ))}

          {/* Snake */}
          {snake.map((segment, idx) => {
            const isHead = idx === 0;
            return (
              <div
                key={`${segment.x}-${segment.y}-${idx}`}
                className={`absolute rounded-sm ${isHead ? 'bg-emerald-400 z-20' : 'bg-emerald-500/80 z-10'}`}
                style={{
                  left: `${(segment.x / GRID_SIZE) * 100}%`,
                  top: `${(segment.y / GRID_SIZE) * 100}%`,
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`,
                  transform: isHead ? 'scale(1.05)' : 'scale(0.85)',
                  transition: 'left 0.1s linear, top 0.1s linear'
                }}
              />
            );
          })}
        </div>

        {/* Overlays */}
        {!hasStarted && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-30 rounded-xl border-4 border-transparent">
            <h2 className="text-3xl sm:text-4xl font-black text-emerald-400 mb-4 tracking-tight">SNAKE SPELLER</h2>
            <p className="text-slate-300 mb-8 text-center px-6 text-sm sm:text-base">
              Mangia le lettere nell'ordine corretto per formare la parola in alto. Se sbagli lettera, hai perso!
            </p>
            <button 
              onClick={startGame}
              className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 py-4 rounded-full font-black text-lg transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
            >
              <Play size={24} fill="currentColor" />
              <span>GIOCA ORA</span>
            </button>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center z-30 rounded-xl border-4 border-rose-500/50">
            <h2 className="text-4xl sm:text-5xl font-black text-rose-500 mb-2 tracking-tighter">GAME OVER</h2>
            <p className="text-slate-300 mb-8 text-lg">
              Punteggio finale: <span className="text-emerald-400 font-bold text-2xl ml-2">{score}</span>
            </p>
            <button 
              onClick={resetGame}
              className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 py-4 rounded-full font-black text-lg transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
            >
              <RotateCcw size={24} />
              <span>RIPROVA</span>
            </button>
          </div>
        )}

        {isPaused && !gameOver && hasStarted && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center z-30 rounded-xl border-4 border-transparent">
            <h2 className="text-4xl font-black text-white tracking-widest mb-4">PAUSA</h2>
            <button 
              onClick={() => {
                setIsPaused(false);
                containerRef.current?.focus();
              }}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full font-bold transition-colors"
            >
              <Play size={20} fill="currentColor" />
              <span>Riprendi</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile Controls */}
      <div className="grid grid-cols-3 gap-2 mt-8 w-48 sm:hidden">
        <div />
        <button 
          onClick={() => handleDirectionClick({x: 0, y: -1})} 
          className="bg-slate-800 p-4 rounded-xl flex justify-center items-center active:bg-slate-700 active:scale-95 transition-all shadow-lg border border-slate-700"
        >
          <ChevronUp className="text-emerald-400" size={32} />
        </button>
        <div />
        <button 
          onClick={() => handleDirectionClick({x: -1, y: 0})} 
          className="bg-slate-800 p-4 rounded-xl flex justify-center items-center active:bg-slate-700 active:scale-95 transition-all shadow-lg border border-slate-700"
        >
          <ChevronLeft className="text-emerald-400" size={32} />
        </button>
        <button 
          onClick={() => handleDirectionClick({x: 0, y: 1})} 
          className="bg-slate-800 p-4 rounded-xl flex justify-center items-center active:bg-slate-700 active:scale-95 transition-all shadow-lg border border-slate-700"
        >
          <ChevronDown className="text-emerald-400" size={32} />
        </button>
        <button 
          onClick={() => handleDirectionClick({x: 1, y: 0})} 
          className="bg-slate-800 p-4 rounded-xl flex justify-center items-center active:bg-slate-700 active:scale-95 transition-all shadow-lg border border-slate-700"
        >
          <ChevronRight className="text-emerald-400" size={32} />
        </button>
      </div>

      {/* Desktop Instructions */}
      <div className="hidden sm:flex mt-8 text-slate-500 text-sm gap-8 font-mono">
        <div className="flex items-center gap-2">
          <kbd className="bg-slate-800 px-2 py-1 rounded border border-slate-700 text-slate-300">W</kbd>
          <kbd className="bg-slate-800 px-2 py-1 rounded border border-slate-700 text-slate-300">A</kbd>
          <kbd className="bg-slate-800 px-2 py-1 rounded border border-slate-700 text-slate-300">S</kbd>
          <kbd className="bg-slate-800 px-2 py-1 rounded border border-slate-700 text-slate-300">D</kbd>
          <span>o Frecce per muoverti</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="bg-slate-800 px-3 py-1 rounded border border-slate-700 text-slate-300">SPAZIO</kbd>
          <span>per pausa</span>
        </div>
      </div>

    </div>
  );
}
