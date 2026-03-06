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
 * Core Engine logic coordinating all systems.
 */
class GameEngine {
    constructor(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) throw new Error('Canvas not found');

        this.ctx = canvas.getContext('2d', { alpha: false });
        this.width = canvas.width;
        this.height = canvas.height;

        this.player = new Player();
        this.obstacles = [];
        this.particleSystem = new ParticleSystem();
        this.parallax = new ParallaxBackground(this.width, this.height);

        this.uiScore = document.getElementById('score-value');
        this.uiGameOver = document.getElementById('game-over-screen');

        this.score = 0;
        this.gameSpeed = CONFIG.INITIAL_SPEED;
        this.spawnTimer = 0;
        this.isGameOver = false;

        this.bindEvents();

        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    bindEvents() {
        const handleAction = (event) => {
            if (event.type === 'keydown' && (event.code !== 'Space' && event.code !== 'ArrowUp')) {
                return;
            }
            event.preventDefault();

            if (this.isGameOver) {
                this.restart();
            } else {
                this.player.jump();
            }
        };

        window.addEventListener('keydown', handleAction);
        window.addEventListener('touchstart', handleAction, { passive: false });
        window.addEventListener('mousedown', handleAction);
    }

    checkCollision(player, obstacle) {
        let testX = player.x;
        let testY = player.y;

        if (player.x < obstacle.x) testX = obstacle.x;
        else if (player.x > obstacle.x + obstacle.width) testX = obstacle.x + obstacle.width;

        if (player.y < obstacle.y) testY = obstacle.y;
        else if (player.y > obstacle.y + obstacle.height) testY = obstacle.y + obstacle.height;

        const distX = player.x - testX;
        const distY = player.y - testY;
        const distance = Math.sqrt((distX * distX) + (distY * distY));

        return distance <= player.radius - 2;
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

        this.spawnTimer--;
        if (this.spawnTimer <= 0) {
            this.obstacles.push(new Obstacle(this.width, 25, 45, 30, 65));
            this.spawnTimer = Math.random() * (CONFIG.SPAWN_TIME_MAX - CONFIG.SPAWN_TIME_MIN) + CONFIG.SPAWN_TIME_MIN;
        }

        this.obstacles.forEach(obstacle => {
            obstacle.update(this.gameSpeed);
            if (this.checkCollision(this.player, obstacle)) {
                this.triggerGameOver();
            }
        });

        this.obstacles = this.obstacles.filter(obstacle => !obstacle.markedForDeletion);
        this.particleSystem.update();

        this.gameSpeed += CONFIG.SPEED_INCREMENT;
        this.score++;

        if (this.score % 10 === 0 && this.uiScore) {
            this.uiScore.innerText = Math.floor(this.score / 10).toString().padStart(5, '0');
        }
    }

    triggerGameOver() {
        this.isGameOver = true;
        this.particleSystem.emitExplosion(this.player.x, this.player.y, CONFIG.COLORS.PLAYER, 30);
        if (this.uiGameOver) {
            this.uiGameOver.classList.add('visible');
        }
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

        if (this.uiScore) this.uiScore.innerText = "00000";
        if (this.uiGameOver) this.uiGameOver.classList.remove('visible');
        this.particleSystem.particles = [];
    }
}

window.onload = () => {
    try {
        new GameEngine('game-canvas');
    } catch (error) {
        console.error("Initialization failed:", error);
    }
};
