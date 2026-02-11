import React, { useRef, useEffect, useState } from 'react';

const SPEED = 5; 
const TURN_SPEED = 0.18; 
const TAIL_LENGTH = 20;
const GROWTH_PER_FOOD = 8;
const SEGMENT_SPACING = 2; 
const SNAKE_WIDTH = 6;
const SNAKE_COLOR = '#6366f1';
const FOOD_COLOR = '#f59e0b';

interface Point {
  x: number;
  y: number;
}

export const SnakeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const pos = useRef<Point>({ x: 0, y: 0 });
  const angle = useRef<number>(0); 
  const targetAngle = useRef<number>(0);
  const history = useRef<Point[]>([]); 
  const food = useRef<Point>({ x: 0, y: 0 });
  const score = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayScore, setDisplayScore] = useState(0); 
  const isPlayingRef = useRef(false);
  const [headPos, setHeadPos] = useState({ x: 0, y: 0 });

  const width = useRef(window.innerWidth);
  const height = useRef(window.innerHeight);

  const startGame = () => {
    setIsPlaying(true);
    isPlayingRef.current = true;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      if (containerRef.current) {
        width.current = containerRef.current.clientWidth;
        height.current = containerRef.current.clientHeight;
        canvas.width = width.current;
        canvas.height = height.current;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const spawnFood = () => {
      const margin = 50;
      let valid = false;
      let newX = 0;
      let newY = 0;
      let attempts = 0;

      const centerX = width.current / 2;
      const centerY = height.current / 2;
      const forbiddenW = 340; 
      const forbiddenH = 260;

      while (!valid && attempts < 200) {
        newX = margin + Math.random() * (width.current - 2 * margin);
        newY = margin + Math.random() * (height.current - 2 * margin);
        
        const inForbiddenBox = (
          newX > (centerX - forbiddenW/2) && 
          newX < (centerX + forbiddenW/2) && 
          newY > (centerY - forbiddenH/2) && 
          newY < (centerY + forbiddenH/2)
        );

        if (!inForbiddenBox) {
          valid = true;
        }
        attempts++;
      }
      food.current = { x: newX, y: newY };
    };

    const initGame = (fullReset = false) => {
      const startX = width.current > 0 ? width.current - 60 : 300;
      const startY = height.current > 0 ? height.current - 60 : 500;
      pos.current = { x: startX, y: startY };
      setHeadPos({ ...pos.current });
      angle.current = Math.PI;
      targetAngle.current = angle.current;
      history.current = [];
      for(let i=0; i < (TAIL_LENGTH * SEGMENT_SPACING); i++) {
          history.current.push({ x: pos.current.x + (i * SPEED), y: pos.current.y });
      }
      score.current = 0;
      setDisplayScore(0);
      spawnFood();
      if (fullReset) {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    };

    const loop = () => {
      if (isPlayingRef.current) {
        let diff = targetAngle.current - angle.current;
        while (diff <= -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        angle.current += diff * TURN_SPEED;

        pos.current.x += Math.cos(angle.current) * SPEED;
        pos.current.y += Math.sin(angle.current) * SPEED;

        if (pos.current.x < 0) pos.current.x = width.current;
        if (pos.current.x > width.current) pos.current.x = 0;
        if (pos.current.y < 0) pos.current.y = height.current;
        if (pos.current.y > height.current) pos.current.y = 0;

        history.current.unshift({ ...pos.current });
        const currentLength = (TAIL_LENGTH + score.current * GROWTH_PER_FOOD) * SEGMENT_SPACING;
        if (history.current.length > currentLength) history.current.pop();

        const dx = pos.current.x - food.current.x;
        const dy = pos.current.y - food.current.y;
        if (Math.sqrt(dx*dx + dy*dy) < 20) {
            score.current += 1;
            setDisplayScore(score.current);
            spawnFood();
        }

        for (let i = 25; i < history.current.length; i += SEGMENT_SPACING) {
            const seg = history.current[i];
            const distHead = Math.sqrt(Math.pow(pos.current.x - seg.x, 2) + Math.pow(pos.current.y - seg.y, 2));
            const prevSeg = history.current[i-1];
            const segJump = Math.sqrt(Math.pow(seg.x - prevSeg.x, 2) + Math.pow(seg.y - prevSeg.y, 2));
            if (distHead < 5 && segJump < 50) initGame(true);
        }
      }

      if (!isPlayingRef.current) setHeadPos({ ...pos.current });

      ctx.clearRect(0, 0, width.current, height.current);

      if (!isNaN(food.current.x)) {
        ctx.fillStyle = FOOD_COLOR;
        ctx.shadowBlur = 15;
        ctx.shadowColor = FOOD_COLOR;
        ctx.beginPath();
        ctx.arc(food.current.x, food.current.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = SNAKE_WIDTH;
      ctx.strokeStyle = SNAKE_COLOR;
      ctx.beginPath();
      if (history.current.length > 0) {
          ctx.moveTo(history.current[0].x, history.current[0].y);
          for (let i = 1; i < history.current.length; i++) {
              const p1 = history.current[i-1];
              const p2 = history.current[i];
              if ((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 > 4000) ctx.moveTo(p2.x, p2.y);
              else ctx.lineTo(p2.x, p2.y);
          }
      }
      ctx.stroke();

      ctx.fillStyle = SNAKE_COLOR;
      ctx.beginPath();
      ctx.arc(pos.current.x, pos.current.y, 5, 0, Math.PI * 2);
      ctx.fill();

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    initGame();
    loop();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleInteraction = (clientX: number, clientY: number) => {
    if (!isPlayingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const dx = x - pos.current.x;
    const dy = y - pos.current.y;
    targetAngle.current = Math.atan2(dy, dx);
  };

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 z-0 overflow-hidden bg-slate-50 dark:bg-slate-950"
      onTouchMove={(e) => handleInteraction(e.touches[0].clientX, e.touches[0].clientY)}
      onMouseMove={(e) => e.buttons === 1 && handleInteraction(e.clientX, e.clientY)}
      onMouseDown={(e) => handleInteraction(e.clientX, e.clientY)}
    >
      <canvas ref={canvasRef} className="block" />
      
      {!isPlaying && (
        <div 
            className="absolute z-20 pointer-events-auto"
            style={{ 
                left: headPos.x, 
                top: headPos.y - 85, 
                transform: 'translateX(-85%)' 
            }}
        >
            <div className="flex flex-col items-end animate-in fade-in zoom-in duration-300">
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-5 py-3 rounded-2xl rounded-br-none shadow-2xl border border-white/50 dark:border-slate-700/50 flex flex-col items-center gap-2">
                    <span className="text-[10px] font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap tracking-tight">
                        Máme chvíľku... Zahraj si hadíka! 🐍
                    </span>
                    <button 
                        onClick={startGame}
                        className="w-full bg-[#6366f1] hover:bg-indigo-700 text-white text-[10px] font-black px-4 py-1.5 rounded-lg shadow-lg active:scale-95 transition-all"
                    >
                        Začať
                    </button>
                </div>
                <div className="w-4 h-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl transform rotate-45 -mt-2 mr-6 border-r border-b border-white/50 dark:border-slate-700/50"></div>
            </div>
        </div>
      )}

      {isPlaying && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/20 dark:bg-black/20 backdrop-blur-md px-4 py-1 rounded-full pointer-events-none">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Body: {displayScore}
            </span>
        </div>
      )}
    </div>
  );
};