/**
 * Game Configuration
 * Centralized constants for easy balancing.
 */
const GAME_CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 400,
    GRAVITY: 0.6,
    JUMP_FORCE: -10,
    INITIAL_SPEED: 5,
    SPEED_INCREMENT: 0.001,
    SPAWN_TIME_MIN: 60,
    SPAWN_TIME_MAX: 120,
    GROUND_Y: 350,
    PLAYER: {
        COLOR: '#FFD700',
        RADIUS: 15,
        START_X: 50
    },
    OBSTACLE: {
        COLOR: '#FF4444',
        WIDTH_MIN: 20,
        WIDTH_MAX: 50,
        HEIGHT_MIN: 30,
        HEIGHT_MAX: 60
    },
    FONTS: {
        SMALL: "20px 'Courier New', monospace",
        LARGE: "40px 'Courier New', monospace"
    }
};

/**
 * Entity: Player
 * Handles physics and state for the user's character.
 */
class Player {
    constructor() {
        this.radius = GAME_CONFIG.PLAYER.RADIUS;
        this.x = GAME_CONFIG.PLAYER.START_X;
        this.y = GAME_CONFIG.GROUND_Y - this.radius;
        this.verticalVelocity = 0;
        this.isGrounded = true;
    }

    jump() {
        if (this.isGrounded) {
            this.verticalVelocity = GAME_CONFIG.JUMP_FORCE;
            this.isGrounded = false;
        }
    }

    update() {
        if (!this.isGrounded) {
            this.verticalVelocity += GAME_CONFIG.GRAVITY;
            this.y += this.verticalVelocity;
        }

        const floorLimit = GAME_CONFIG.GROUND_Y - this.radius;
        
        if (this.y >= floorLimit) {
            this.y = floorLimit;
            this.verticalVelocity = 0;
            this.isGrounded = true;
        }
    }
}

/**
 * Entity: Obstacle
 * Represents a single hazard in the game world.
 */
class Obstacle {
    constructor(startX) {
        this.width = this.getRandomValue(GAME_CONFIG.OBSTACLE.WIDTH_MIN, GAME_CONFIG.OBSTACLE.WIDTH_MAX);
        this.height = this.getRandomValue(GAME_CONFIG.OBSTACLE.HEIGHT_MIN, GAME_CONFIG.OBSTACLE.HEIGHT_MAX);
        this.x = startX + this.width;
        this.y = GAME_CONFIG.GROUND_Y - this.height;
        this.markedForDeletion = false;
    }

    getRandomValue(min, max) {
        return Math.random() * (max - min) + min;
    }

    update(speed) {
        this.x -= speed;
        if (this.x + this.width < 0) {
            this.markedForDeletion = true;
        }
    }
}

/**
 * System: Renderer
 * RESPONSIBILITY: Strictly visual output. No game logic.
 */
class Renderer {
    constructor(canvas) {
        if (!canvas) throw new Error('Canvas element not found.');
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        
        if (!this.ctx) throw new Error('Unable to obtain 2D context.');

        this.width = canvas.width;
        this.height = canvas.height;
    }

    clear() {
        this.ctx.fillStyle = '#000000'; // Background color
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawFloor() {
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.moveTo(0, GAME_CONFIG.GROUND_Y);
        this.ctx.lineTo(this.width, GAME_CONFIG.GROUND_Y);
        this.ctx.stroke();
    }

    drawPlayer(player) {
        this.ctx.fillStyle = GAME_CONFIG.PLAYER.COLOR;
        this.ctx.beginPath();
        this.ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Cosmetic shine
        this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
        this.ctx.beginPath();
        this.ctx.arc(player.x - 3, player.y - 3, player.radius / 3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawObstacles(obstacles) {
        this.ctx.fillStyle = GAME_CONFIG.OBSTACLE.COLOR;
        obstacles.forEach(obs => {
            this.ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        });
    }

    drawScore(score) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = GAME_CONFIG.FONTS.SMALL;
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`SCORE: ${Math.floor(score / 10)}`, this.width - 20, 30);
    }

    drawGameOver() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.font = GAME_CONFIG.FONTS.LARGE;
        this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2);

        this.ctx.font = GAME_CONFIG.FONTS.SMALL;
        this.ctx.fillText('Press SPACE to restart', this.width / 2, this.height / 2 + 40);
    }
}

/**
 * System: InputHandler
 * RESPONSIBILITY: Capturing and normalizing user input.
 */
class InputHandler {
    constructor(actionCallback, resetCallback) {
        this.actionCallback = actionCallback;
        this.resetCallback = resetCallback;
        this.bindEvents();
    }

    bindEvents() {
        const handleAction = (e) => {
            if (e.type === 'keydown') {
                if (e.code === 'Space' || e.code === 'ArrowUp') {
                    e.preventDefault();
                    this.triggerAction();
                }
            } else {
                // Touch or Click
                e.preventDefault();
                this.triggerAction();
            }
        };

        window.addEventListener('keydown', handleAction);
        window.addEventListener('touchstart', handleAction, { passive: false });
        window.addEventListener('mousedown', handleAction);
    }

    triggerAction() {
        if (this.actionCallback) this.actionCallback();
    }
}

/**
 * Core: GameEngine
 * RESPONSIBILITY: Main loop, collision detection, and wiring systems together.
 */
class GameEngine {
    constructor(canvasId) {
        const canvas = document.getElementById(canvasId);
        this.renderer = new Renderer(canvas);
        
        this.player = new Player();
        this.obstacles = [];
        
        this.score = 0;
        this.gameSpeed = GAME_CONFIG.INITIAL_SPEED;
        this.spawnTimer = 0;
        this.isGameOver = false;

        // Bind logic to input
        this.inputHandler = new InputHandler(
            () => this.handleInput(), 
            () => this.restart()
        );

        this.lastTime = 0;
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    handleInput() {
        if (this.isGameOver) {
            this.restart();
        } else {
            this.player.jump();
        }
    }

    checkCollision(player, obstacle) {
        // AABB (Axis-Aligned Bounding Box) vs Circle collision approximation
        // Clamping the circle center to the rectangle bounds
        let testX = player.x;
        let testY = player.y;

        if (player.x < obstacle.x) testX = obstacle.x;
        else if (player.x > obstacle.x + obstacle.width) testX = obstacle.x + obstacle.width;

        if (player.y < obstacle.y) testY = obstacle.y;
        else if (player.y > obstacle.y + obstacle.height) testY = obstacle.y + obstacle.height;

        const distX = player.x - testX;
        const distY = player.y - testY;
        const distance = Math.sqrt((distX * distX) + (distY * distY));

        return distance <= player.radius;
    }

    update() {
        if (this.isGameOver) return;

        this.player.update();

        // Obstacle Spawning
        this.spawnTimer--;
        if (this.spawnTimer <= 0) {
            this.obstacles.push(new Obstacle(GAME_CONFIG.CANVAS_WIDTH));
            this.spawnTimer = Math.random() * (GAME_CONFIG.SPAWN_TIME_MAX - GAME_CONFIG.SPAWN_TIME_MIN) + GAME_CONFIG.SPAWN_TIME_MIN;
        }

        // Obstacle Updates & Collision
        this.obstacles.forEach(obs => {
            obs.update(this.gameSpeed);
            
            if (this.checkCollision(this.player, obs)) {
                this.isGameOver = true;
            }
        });

        // Cleanup off-screen obstacles
        this.obstacles = this.obstacles.filter(obs => !obs.markedForDeletion);

        this.gameSpeed += GAME_CONFIG.SPEED_INCREMENT;
        this.score++;
    }

    draw() {
        this.renderer.clear();
        this.renderer.drawFloor();
        this.renderer.drawPlayer(this.player);
        this.renderer.drawObstacles(this.obstacles);
        this.renderer.drawScore(this.score);

        if (this.isGameOver) {
            this.renderer.drawGameOver();
        }
    }

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(this.animate);
    }

    restart() {
        this.player = new Player();
        this.obstacles = [];
        this.score = 0;
        this.gameSpeed = GAME_CONFIG.INITIAL_SPEED;
        this.isGameOver = false;
        this.spawnTimer = 0;
    }
}

// Initialize Game
// Enclosed in a try-catch to satisfy error handling requirements
try {
    new GameEngine('gameCanvas');
} catch (error) {
    console.error("Failed to initialize game:", error);
}