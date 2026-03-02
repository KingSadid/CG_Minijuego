// ── Cacheo de funciones nativas ──
const { random: rng, PI } = Math;
const TAU = PI * 2;
const rand = (min, max) => rng() * (max - min) + min;

// ── Configuración ──
const C = {
    BG:       '#000000',
    GRAV:     0.6,
    JUMP:     -10,
    SPD:      5,
    SPD_INC:  0.001,
    SP_MIN:   60,
    SP_MAX:   120,
    BASE_Y:   350,
    P_COLOR:  '#FFD700',
    P_RAD:    15,
    P_X:      50,
    O_COLOR:  '#FF4444',
    O_WMIN:   20,
    O_WMAX:   50,
    O_HMIN:   30,
    O_HMAX:   70,
    FONT_SM:  "20px 'Courier New',monospace",
    FONT_LG:  "40px 'Courier New',monospace"
};

// Precálculo: radio² para colisiones
const P_RAD_SQ = C.P_RAD * C.P_RAD;

// ── Jugador ──
class Player {
    constructor() {
        this.x = C.P_X;
        this.y = C.BASE_Y - C.P_RAD;
        this.dy = 0;
        this.grounded = true;
    }

    jump() {
        if (this.grounded) {
            this.dy = C.JUMP;
            this.grounded = false;
        }
    }

    update() {
        if (!this.grounded) {
            this.dy += C.GRAV;
            this.y += this.dy;
        }
        // Colisión con suelo
        if (this.y + C.P_RAD >= C.BASE_Y) {
            this.y = C.BASE_Y - C.P_RAD;
            this.dy = 0;
            this.grounded = true;
        }
    }

    draw(ctx) {
        // Bola principal
        ctx.fillStyle = C.P_COLOR;
        ctx.beginPath();
        ctx.arc(this.x, this.y, C.P_RAD, 0, TAU);
        ctx.fill();

        // Brillo (efecto 3D)
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(this.x - 3, this.y - 3, C.P_RAD / 3, 0, TAU);
        ctx.fill();
    }
}

// ── Obstáculo ──
class Obstacle {
    constructor(canvasW) {
        this.w = rand(C.O_WMIN, C.O_WMAX);
        this.h = rand(C.O_HMIN, C.O_HMAX);
        this.x = canvasW + this.w;
        this.y = C.BASE_Y - this.h;
    }

    update(speed) {
        this.x -= speed;
    }

    draw(ctx) {
        ctx.fillStyle = C.O_COLOR;
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }
}

// ── Juego Principal ──
class Game {
    constructor(id) {
        const cvs = document.getElementById(id);
        this.ctx = cvs.getContext('2d');

        // Cacheo de dimensiones (evita acceso repetido al DOM)
        this.W = cvs.width;
        this.H = cvs.height;

        this.player = new Player();
        this.obstacles = [];
        this.score = 0;
        this.speed = C.SPD;
        this.spawnTimer = 0;
        this.gameOver = false;

        this.initInput(cvs);
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    initInput(cvs) {
        const act = () => {
            if (this.gameOver) this.restart();
            else this.player.jump();
        };

        window.addEventListener('keydown', e => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                act();
            }
        });

        cvs.addEventListener('touchstart', e => { e.preventDefault(); act(); });
        cvs.addEventListener('mousedown', act);
    }

    /**
     * Colisión Círculo vs Rectángulo
     * comparamos distancia² contra radio²
     */
    collides(px, py, obs) {
        // Clamp del centro del círculo al rectángulo
        let dx = px, dy = py;
        const ox = obs.x, oy = obs.y, ow = obs.w, oh = obs.h;

        if (px < ox)          dx = ox;
        else if (px > ox + ow) dx = ox + ow;

        if (py < oy)          dy = oy;
        else if (py > oy + oh) dy = oy + oh;

        dx -= px;
        dy -= py;

        // distancia² <= radio² 
        return dx * dx + dy * dy <= P_RAD_SQ;
    }

    update() {
        if (this.gameOver) return;

        this.player.update();

        // Spawn de obstáculos
        if (--this.spawnTimer <= 0) {
            this.obstacles.push(new Obstacle(this.W));
            this.spawnTimer = rand(C.SP_MIN, C.SP_MAX);
        }

        const obs = this.obstacles;
        const spd = this.speed;
        const px = this.player.x;
        const py = this.player.y;

        // Actualizar y limpiar obstáculos (recorrido inverso para splice seguro)
        for (let i = obs.length - 1; i >= 0; i--) {
            obs[i].update(spd);
            if (obs[i].x + obs[i].w < 0) {
                obs.splice(i, 1);
            } else if (this.collides(px, py, obs[i])) {
                this.gameOver = true;
                return;
            }
        }

        this.speed += C.SPD_INC;
        this.score++;
    }

    draw() {
        const ctx = this.ctx;
        const W = this.W;
        const H = this.H;

        // Fondo
        ctx.fillStyle = C.BG;
        ctx.fillRect(0, 0, W, H);

        // Suelo
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(0, C.BASE_Y);
        ctx.lineTo(W, C.BASE_Y);
        ctx.stroke();

        // Entidades
        this.player.draw(ctx);
        const obs = this.obstacles;
        for (let i = 0, len = obs.length; i < len; i++) obs[i].draw(ctx);

        // Score
        ctx.fillStyle = '#fff';
        ctx.font = C.FONT_SM;
        ctx.textAlign = 'right';
        ctx.fillText('SCORE: ' + (this.score / 10 | 0), W - 20, 30);

        // Game Over overlay
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';

            ctx.font = C.FONT_LG;
            ctx.fillText('GAME OVER', W / 2, H / 2);

            ctx.font = C.FONT_SM;
            ctx.fillText('Presiona ESPACIO para reiniciar', W / 2, H / 2 + 40);
        }
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }

    restart() {
        this.player = new Player();
        this.obstacles.length = 0;   // Vaciar sin crear nuevo array
        this.score = 0;
        this.speed = C.SPD;
        this.gameOver = false;
        this.spawnTimer = 0;
    }
}

// ── Inicialización ──
window.onload = () => new Game('gameCanvas');