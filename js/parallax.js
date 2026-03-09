/**
 * Separamos los datos de diseño de la lógica
 */
const PARALLAX_CONFIG = {
    GROUND_OFFSET: 50,
    GRID_SPACING: 40,
    STAR_COUNT: 100,
    COLORS: {
        SKY_TOP: '#020111',
        SKY_MID: '#20124d',
        SKY_BOTTOM: '#000022',
        SUN_TOP: '#ffcc00',
        SUN_BOTTOM: '#ff007f',
        GRID_LINES: '#00f3ff'
    }
};

/**
 * Procedural infinite background renderer.
 */
class ParallaxBackground {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.stars = this.generateStars(PARALLAX_CONFIG.STAR_COUNT);
        this.gridOffset = 0;
    }

    generateStars(count) {
        const starsArray = [];
        for (let i = 0; i < count; i++) {
            starsArray.push({
                x: Math.random() * this.width,
                y: Math.random() * (this.height - PARALLAX_CONFIG.GROUND_OFFSET),
                size: Math.random() * 2,
                speed: Math.random() * 0.5 + 0.1
            });
        }
        return starsArray;
    }

    update(speed) {
        this.stars.forEach(star => {
            star.x -= star.speed * speed;
            if (star.x < 0) {
                star.x = this.width;
                star.y = Math.random() * (this.height - PARALLAX_CONFIG.GROUND_OFFSET);
            }
        });

        this.gridOffset = (this.gridOffset + speed * 2) % PARALLAX_CONFIG.GRID_SPACING;
    }

    draw(ctx) {
        this.drawSky(ctx);
        this.drawStars(ctx);
        this.drawSun(ctx);
        this.drawGrid(ctx);
    }

    /* Métodos privados encargados de pintar una sola cosa */
    
    drawSky(ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, PARALLAX_CONFIG.COLORS.SKY_TOP);
        gradient.addColorStop(0.5, PARALLAX_CONFIG.COLORS.SKY_MID);
        gradient.addColorStop(1, PARALLAX_CONFIG.COLORS.SKY_BOTTOM);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
    }

    drawStars(ctx) {
        ctx.fillStyle = '#ffffff';
        this.stars.forEach(star => {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawSun(ctx) {
        ctx.save();
        ctx.shadowBlur = 40;
        ctx.shadowColor = PARALLAX_CONFIG.COLORS.SUN_BOTTOM;
        const sunGradient = ctx.createLinearGradient(0, 100, 0, 300);
        sunGradient.addColorStop(0, PARALLAX_CONFIG.COLORS.SUN_TOP);
        sunGradient.addColorStop(1, PARALLAX_CONFIG.COLORS.SUN_BOTTOM);
        ctx.fillStyle = sunGradient;
        ctx.beginPath();
        ctx.arc(this.width / 2, this.height - PARALLAX_CONFIG.GROUND_OFFSET, 120, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawGrid(ctx) {
        ctx.save();
        ctx.strokeStyle = PARALLAX_CONFIG.COLORS.GRID_LINES;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = PARALLAX_CONFIG.COLORS.GRID_LINES;

        const horizonY = this.height - PARALLAX_CONFIG.GROUND_OFFSET;

        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(this.width, horizonY);
        ctx.stroke();

        for (let i = 0; i < this.width + 200; i += PARALLAX_CONFIG.GRID_SPACING) {
            ctx.beginPath();
            const startX = i - this.gridOffset;
            ctx.moveTo(startX, horizonY);
            ctx.lineTo(startX - 200, this.height);
            ctx.stroke();
        }

        for (let j = 0; j < 50; j += 10) {
            ctx.beginPath();
            const yPos = horizonY + Math.pow(j, 1.5);
            if (yPos > this.height) continue;
            ctx.moveTo(0, yPos);
            ctx.lineTo(this.width, yPos);
            ctx.stroke();
        }
        ctx.restore();
    }
}