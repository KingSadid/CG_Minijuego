/**
 * Configuraciones de partículas centralizadas
 */
const PARTICLE_CONFIG = {
    EXPLOSION_LIFETIME: 40,
    TRAIL_LIFETIME: 20,
    BASE_SIZE: 2,
    SIZE_VARIANCE: 3,
    EXPLOSION_MIN_SPEED: 2,
    EXPLOSION_SPEED_VARIANCE: 5
};

/**
 * Partículas de efecto visual.
 */
class Particle {
    constructor(x, y, color, velocityX, velocityY, lifeTime) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.lifeTime = lifeTime;
        this.maxLife = lifeTime;
        this.alpha = 1;
        this.size = Math.random() * PARTICLE_CONFIG.SIZE_VARIANCE + PARTICLE_CONFIG.BASE_SIZE;
    }

    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.lifeTime--;
        this.alpha = Math.max(0, this.lifeTime / this.maxLife);
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Gestiona colecciones de partículas para retroalimentación visual.
 */
class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emitExplosion(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * PARTICLE_CONFIG.EXPLOSION_SPEED_VARIANCE + PARTICLE_CONFIG.EXPLOSION_MIN_SPEED;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            this.particles.push(new Particle(x, y, color, vx, vy, PARTICLE_CONFIG.EXPLOSION_LIFETIME));
        }
    }

    emitTrail(x, y, color) {
        const vx = (Math.random() - 0.5) * 2;
        const vy = Math.random() * 2;
        this.particles.push(new Particle(x, y, color, vx, vy, PARTICLE_CONFIG.TRAIL_LIFETIME));
    }

    update() {
        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.lifeTime > 0);
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }
}