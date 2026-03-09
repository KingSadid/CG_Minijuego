/**
 * Game Configuration Constants
 */
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 400,
    GRAVITY: 0.6,
    JUMP_FORCE: -11,
    INITIAL_SPEED: 6,
    SPEED_INCREMENT: 0.002,
    SPAWN_TIME_MIN: 50,
    SPAWN_TIME_MAX: 110,
    GROUND_Y: 350,
    COLORS: {
        PLAYER: '#00f3ff',
        OBSTACLE: '#ff003c'
    }
};

/**
 * SRP: Gestión de almacenamiento local (Storage)
 */
class StorageManager {
    static getHighScore(key = 'cyberRunnerHighScore') {
        return Number(localStorage.getItem(key)) || 0;
    }

    static saveHighScore(key = 'cyberRunnerHighScore', score) {
        localStorage.setItem(key, score);
    }
}

/**
 * SRP: Manejo de la Interfaz de Usuario (DOM)
 */
class UIManager {
    constructor(uiElements) {
        this.scoreElement = uiElements.score;
        this.highScoreElement = uiElements.highScore;
        this.gameOverScreen = uiElements.gameOver;
    }

    updateScore(score) {
        if (this.scoreElement) {
            this.scoreElement.innerText = Math.floor(score / 10).toString().padStart(5, '0');
        }
    }

    updateHighScore(highScore) {
        if (this.highScoreElement) {
            this.highScoreElement.innerText = highScore.toString().padStart(5, '0');
        }
    }

    showGameOver() {
        if (this.gameOverScreen) this.gameOverScreen.classList.add('visible');
    }

    hideGameOver() {
        if (this.gameOverScreen) this.gameOverScreen.classList.remove('visible');
    }
}

/**
 * SRP: Manejo de entradas del usuario (Teclado, Touch, Mouse)
 */
class InputHandler {
    constructor(onActionCallback) {
        this.onAction = onActionCallback;
        this.bindEvents();
    }

    bindEvents() {
        const handleAction = (event) => {
            if (event.type === 'keydown' && (event.code !== 'Space' && event.code !== 'ArrowUp')) {
                return;
            }
            event.preventDefault();
            this.onAction();
        };

        window.addEventListener('keydown', handleAction);
        window.addEventListener('touchstart', handleAction, { passive: false });
        window.addEventListener('mousedown', handleAction);
    }
}

/**
 * SRP: Utilidad de físicas y colisiones (Matemáticas puras)
 */
class Physics {
    static checkCollision(circleEntity, rectEntity) {
        let testX = circleEntity.x;
        let testY = circleEntity.y;

        if (circleEntity.x < rectEntity.x) testX = rectEntity.x;
        else if (circleEntity.x > rectEntity.x + rectEntity.width) testX = rectEntity.x + rectEntity.width;

        if (circleEntity.y < rectEntity.y) testY = rectEntity.y;
        else if (circleEntity.y > rectEntity.y + rectEntity.height) testY = rectEntity.y + rectEntity.height;

        const distX = circleEntity.x - testX;
        const distY = circleEntity.y - testY;
        const distance = Math.sqrt((distX * distX) + (distY * distY));

        return distance <= circleEntity.radius - 2; 
    }
}

/**
 * Player Entity handling user character physics.
 */
class Player {
    constructor() {
        this.radius = 16;
        this.x = 60;
        this.y = CONFIG.GROUND_Y - this.radius;
        this.verticalVelocity = 0;
        this.isGrounded = true;
    }

    jump() {
        if (this.isGrounded) {
            this.verticalVelocity = CONFIG.JUMP_FORCE;
            this.isGrounded = false;
        }
    }

    update() {
        if (!this.isGrounded) {
            this.verticalVelocity += CONFIG.GRAVITY;
            this.y += this.verticalVelocity;
        }

        const floorLimit = CONFIG.GROUND_Y - this.radius;
        if (this.y >= floorLimit) {
            this.y = floorLimit;
            this.verticalVelocity = 0;
            this.isGrounded = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = CONFIG.COLORS.PLAYER;
        ctx.shadowBlur = 20;
        ctx.shadowColor = CONFIG.COLORS.PLAYER;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(this.x - 4, this.y - 4, this.radius / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Obstacle Entity moving against the player.
 */
class Obstacle {
    constructor(startX, minWidth, maxWidth, minHeight, maxHeight) {
        this.width = Math.random() * (maxWidth - minWidth) + minWidth;
        this.height = Math.random() * (maxHeight - minHeight) + minHeight;
        this.x = startX + this.width;
        this.y = CONFIG.GROUND_Y - this.height;
        this.markedForDeletion = false;
    }

    update(speed) {
        this.x -= speed;
        if (this.x + this.width < 0) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = '#000';
        ctx.strokeStyle = CONFIG.COLORS.OBSTACLE;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = CONFIG.COLORS.OBSTACLE;

        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        ctx.beginPath();
        ctx.moveTo(this.x + 5, this.y + 5);
        ctx.lineTo(this.x + this.width - 5, this.y + this.height - 5);
        ctx.stroke();

        ctx.restore();
    }
}

/**
 * Core Engine logic: Actúa como Orquestador (Inversión de Dependencias)
 */
class GameEngine {
    constructor(canvasId, uiManager) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) throw new Error('Canvas not found');

        this.ctx = canvas.getContext('2d', { alpha: false });
        this.width = canvas.width;
        this.height = canvas.height;

        this.uiManager = uiManager;
        this.inputHandler = new InputHandler(() => this.handlePlayerAction());

        this.player = new Player();
        this.obstacles = [];
        this.particleSystem = new ParticleSystem();
        this.parallax = new ParallaxBackground(this.width, this.height);

        this.score = 0;
        this.highScore = StorageManager.getHighScore();
        this.gameSpeed = CONFIG.INITIAL_SPEED;
        this.spawnTimer = 0;
        this.isGameOver = false;

        this.uiManager.updateHighScore(this.highScore);

        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    handlePlayerAction() {
        if (this.isGameOver) {
            this.restart();
        } else {
            this.player.jump();
        }
    }

    update() {
        if (this.isGameOver) {
            this.particleSystem.update();
            return;
        }

        this.parallax.update(this.gameSpeed);
        this.player.update();

        if (this.player.isGrounded) {
            this.particleSystem.emitTrail(this.player.x, this.player.y + this.player.radius, CONFIG.COLORS.PLAYER);
        }

        this.handleObstacles();
        this.particleSystem.update();

        this.updateScore();
    }

    handleObstacles() {
        this.spawnTimer--;
        if (this.spawnTimer <= 0) {
            const minW = 25, maxW = 45, minH = 30, maxH = 65;
            this.obstacles.push(new Obstacle(this.width, minW, maxW, minH, maxH));
            this.spawnTimer = Math.random() * (CONFIG.SPAWN_TIME_MAX - CONFIG.SPAWN_TIME_MIN) + CONFIG.SPAWN_TIME_MIN;
        }

        this.obstacles.forEach(obstacle => {
            obstacle.update(this.gameSpeed);
            if (Physics.checkCollision(this.player, obstacle)) {
                this.triggerGameOver();
            }
        });

        this.obstacles = this.obstacles.filter(obstacle => !obstacle.markedForDeletion);
    }

    updateScore() {
        this.gameSpeed += CONFIG.SPEED_INCREMENT;
        this.score++;

        if (this.score % 10 === 0) {
            this.uiManager.updateScore(this.score);
        }
    }

    triggerGameOver() {
        this.isGameOver = true;
        const currentDisplayScore = Math.floor(this.score / 10);

        if (currentDisplayScore > this.highScore) {
            this.highScore = currentDisplayScore;
            StorageManager.saveHighScore('cyberRunnerHighScore', this.highScore);
            this.uiManager.updateHighScore(this.highScore);
        }

        this.particleSystem.emitExplosion(this.player.x, this.player.y, CONFIG.COLORS.PLAYER, 30);
        this.uiManager.showGameOver();
    }

    draw() {
        this.parallax.draw(this.ctx);
        this.obstacles.forEach(obstacle => obstacle.draw(this.ctx));
        this.particleSystem.draw(this.ctx);

        if (!this.isGameOver) {
            this.player.draw(this.ctx);
        }
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }

    restart() {
        this.player = new Player();
        this.obstacles = [];
        this.score = 0;
        this.gameSpeed = CONFIG.INITIAL_SPEED;
        this.isGameOver = false;
        this.spawnTimer = 0;

        this.uiManager.updateScore(0);
        this.uiManager.hideGameOver();
        this.particleSystem.particles = [];
    }
}

/**
 * Punto de entrada: Composición e Inyección de Control
 */
window.onload = () => {
    try {
        const uiElements = {
            score: document.getElementById('score-value'),
            highScore: document.getElementById('high-score-value'),
            gameOver: document.getElementById('game-over-screen')
        };
        
        const uiManager = new UIManager(uiElements);
        new GameEngine('game-canvas', uiManager);
    } catch (error) {
        console.error("Fallo en la inicialización:", error);
    }
};