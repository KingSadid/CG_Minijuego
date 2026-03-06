/**
 * Procedural infinite background renderer.
 */
class ParallaxBackground {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.stars = this.generateStars(100);
        this.gridOffset = 0;
    }

    generateStars(count) {
        const starsArray = [];
        for (let i = 0; i < count; i++) {
            starsArray.push({
                x: Math.random() * this.width,
                y: Math.random() * (this.height - 50),
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
                star.y = Math.random() * (this.height - 50);
            }
        });

        this.gridOffset = (this.gridOffset + speed * 2) % 40;
    }

    draw(ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#020111');
        gradient.addColorStop(0.5, '#20124d');
        gradient.addColorStop(1, '#000022');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = '#ffffff';
        this.stars.forEach(star => {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.save();
        ctx.shadowBlur = 40;
        ctx.shadowColor = '#ff007f';
        const sunGradient = ctx.createLinearGradient(0, 100, 0, 300);
        sunGradient.addColorStop(0, '#ffcc00');
        sunGradient.addColorStop(1, '#ff007f');
        ctx.fillStyle = sunGradient;
        ctx.beginPath();
        ctx.arc(this.width / 2, this.height - 50, 120, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f3ff';

        ctx.beginPath();
        ctx.moveTo(0, this.height - 50);
        ctx.lineTo(this.width, this.height - 50);
        ctx.stroke();

        for (let i = 0; i < this.width + 200; i += 40) {
            ctx.beginPath();
            const startX = i - this.gridOffset;
            ctx.moveTo(startX, this.height - 50);
            ctx.lineTo(startX - 200, this.height);
            ctx.stroke();
        }

        for (let j = 0; j < 50; j += 10) {
            ctx.beginPath();
            const yPos = (this.height - 50) + Math.pow(j, 1.5);
            if (yPos > this.height) continue;
            ctx.moveTo(0, yPos);
            ctx.lineTo(this.width, yPos);
            ctx.stroke();
        }
        ctx.restore();
    }
}
