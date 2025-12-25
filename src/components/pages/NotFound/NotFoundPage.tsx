import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [restartKey, setRestartKey] = useState(0);
    const scoreRef = useRef(0); // keep live score

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const box = 20; // grid size
        const snake = [
            { x: 8 * box, y: 10 * box },
            { x: 7 * box, y: 10 * box },
            { x: 6 * box, y: 10 * box },
        ];

        let food = randomFood();
        let d: string | null = 'RIGHT';

        function randomFood() {
            return {
                x: Math.floor(Math.random() * (canvas!.width / box)) * box,
                y: Math.floor(Math.random() * (canvas!.height / box)) * box,
            };
        }

        const direction = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && d !== 'RIGHT') d = 'LEFT';
            if (e.key === 'ArrowUp' && d !== 'DOWN') d = 'UP';
            if (e.key === 'ArrowRight' && d !== 'LEFT') d = 'RIGHT';
            if (e.key === 'ArrowDown' && d !== 'UP') d = 'DOWN';
        };

        document.addEventListener('keydown', direction);

        const draw = () => {
            ctx.fillStyle = '#fdfdfd';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw snake
            for (let i = 0; i < snake.length; i++) {
                ctx.fillStyle = i === 0 ? '#2ecc71' : '#27ae60';
                ctx.fillRect(snake[i].x, snake[i].y, box, box);

                ctx.strokeStyle = '#ecf0f1';
                ctx.strokeRect(snake[i].x, snake[i].y, box, box);
            }

            // Draw food
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(food.x, food.y, box, box);

            // Snake head
            let snakeX = snake[0].x;
            let snakeY = snake[0].y;

            if (d === 'LEFT') snakeX -= box;
            if (d === 'UP') snakeY -= box;
            if (d === 'RIGHT') snakeX += box;
            if (d === 'DOWN') snakeY += box;

            // Check if snake eats food
            const ateFood = snakeX === food.x && snakeY === food.y;
            if (ateFood) {
                scoreRef.current += 1;
                setScore(scoreRef.current); // update React UI
                food = randomFood();
                // 🚨 DO NOT remove tail -> snake grows
            } else {
                snake.pop(); // remove tail if not eating
            }

            const newHead = { x: snakeX, y: snakeY };

            // Check collision
            if (
                snakeX < 0 ||
                snakeY < 0 ||
                snakeX >= canvas.width ||
                snakeY >= canvas.height ||
                collision(newHead, snake)
            ) {
                setGameOver(true);
                clearInterval(game);
                document.removeEventListener('keydown', direction);
            }

            snake.unshift(newHead);

            // Score on canvas
            ctx.fillStyle = '#2c3e50';
            ctx.font = '18px Arial';
            ctx.fillText('Score: ' + scoreRef.current, box, box);
        };

        const collision = (head: { x: number; y: number }, array: any[]) => {
            for (let i = 0; i < array.length; i++) {
                if (head.x === array[i].x && head.y === array[i].y) {
                    return true;
                }
            }
            return false;
        };

        const game = setInterval(draw, 100);
        return () => {
            clearInterval(game);
            document.removeEventListener('keydown', direction);
        };
    }, [restartKey]);

    return (
        <div className="flex flex-col items-center p-6 font-sans m-4">
            <h1 className="text-7xl font-bold text-red-600">404</h1>
            <p className="m-4 text-lg text-gray-700">Oops! Page not found.</p>

            {!gameOver ? (
                <canvas
                    key={restartKey}
                    ref={canvasRef}
                    width={600}
                    height={400}
                    className="border border-gray-400 rounded shadow"
                />
            ) : (
                <div className="flex flex-col items-center">
                    <p className="text-xl text-red-600 font-semibold m-4">
                        💀 Game Over! Final Score: {score}
                    </p>
                    <button
                        onClick={() => {
                            setScore(0);
                            scoreRef.current = 0;
                            setGameOver(false);
                            setRestartKey((k) => k + 1);
                        }}
                        className="mt-4 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-800"
                    >
                        🔄 Restart Game
                    </button>
                </div>
            )}

            <Link
                to="/"
                className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-800 transition"
            >
                Go Back Home
            </Link>
        </div>
    );
}
