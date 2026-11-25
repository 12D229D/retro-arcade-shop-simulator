/**
 * Minijuego Arcade: Pixel Breaker 1994
 * Demolición de ladrillos con paleta y bola de neón estilo Arkanoid de los 90.
 */

export class PixelBreakerGame {
  constructor(canvas, onGameOver) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onGameOver = onGameOver;

    this.paddle = {
      width: 75,
      height: 12,
      x: (canvas.width - 75) / 2,
      y: canvas.height - 28,
      speed: 6.5
    };

    this.ball = {
      x: canvas.width / 2,
      y: canvas.height - 45,
      radius: 5,
      vx: 3.5,
      vy: -3.5,
      speed: 4.8
    };

    this.bricks = [];
    this.score = 0;
    this.lives = 3;
    this.running = false;
    this.keys = { left: false, right: false };
    this.particles = [];

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.loop = this.loop.bind(this);
  }

  initBricks() {
    this.bricks = [];
    const rows = 5;
    const cols = 8;
    const brickWidth = 48;
    const brickHeight = 16;
    const padding = 6;
    const offsetTop = 45;
    const offsetLeft = (this.canvas.width - (cols * (brickWidth + padding) - padding)) / 2;

    const rowColors = ['#ff0055', '#ff7700', '#ffe600', '#00ff88', '#00d0ff'];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.bricks.push({
          x: offsetLeft + c * (brickWidth + padding),
          y: offsetTop + r * (brickHeight + padding),
          w: brickWidth,
          h: brickHeight,
          color: rowColors[r % rowColors.length],
          status: 1,
          pts: (rows - r) * 10
        });
      }
    }
  }

  start() {
    this.score = 0;
    this.lives = 3;
    this.initBricks();
    this.resetBall();
    this.running = true;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);

    requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
  }

  handleKeyDown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;
  }

  handleKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width, mouseX - this.paddle.width / 2));
  }

  resetBall() {
    this.ball.x = this.canvas.width / 2;
    this.ball.y = this.canvas.height - 50;
    const angle = (Math.PI / 4) + (Math.random() * Math.PI / 2); // Disparo hacia arriba
    this.ball.vx = Math.cos(angle) * this.ball.speed * (Math.random() > 0.5 ? 1 : -1);
    this.ball.vy = -Math.abs(Math.sin(angle) * this.ball.speed);
  }

  update() {
    // Mover paleta con teclado
    if (this.keys.left) {
      this.paddle.x = Math.max(0, this.paddle.x - this.paddle.speed);
    }
    if (this.keys.right) {
      this.paddle.x = Math.min(this.canvas.width - this.paddle.width, this.paddle.x + this.paddle.speed);
    }

    // Mover bola
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Rebote en paredes laterales
    if (this.ball.x - this.ball.radius <= 0) {
      this.ball.x = this.ball.radius;
      this.ball.vx = Math.abs(this.ball.vx);
    } else if (this.ball.x + this.ball.radius >= this.canvas.width) {
      this.ball.x = this.canvas.width - this.ball.radius;
      this.ball.vx = -Math.abs(this.ball.vx);
    }

    // Rebote en techo
    if (this.ball.y - this.ball.radius <= 0) {
      this.ball.y = this.ball.radius;
      this.ball.vy = Math.abs(this.ball.vy);
    }

    // Colisión con la paleta
    if (
      this.ball.y + this.ball.radius >= this.paddle.y &&
      this.ball.y - this.ball.radius <= this.paddle.y + this.paddle.height &&
      this.ball.x >= this.paddle.x &&
      this.ball.x <= this.paddle.x + this.paddle.width
    ) {
      const hitPoint = (this.ball.x - (this.paddle.x + this.paddle.width / 2)) / (this.paddle.width / 2);
      const bounceAngle = hitPoint * (Math.PI / 3); // max 60 deg
      const currentSpeed = Math.min(8.0, Math.hypot(this.ball.vx, this.ball.vy) + 0.1);
      this.ball.vx = Math.sin(bounceAngle) * currentSpeed;
      this.ball.vy = -Math.cos(bounceAngle) * currentSpeed;
      this.ball.y = this.paddle.y - this.ball.radius;
      this.createBurst(this.ball.x, this.paddle.y, '#00ffff', 6);
    }

    // Colisión con ladrillos
    let allCleared = true;
    for (const b of this.bricks) {
      if (b.status === 1) {
        allCleared = false;
        if (
          this.ball.x >= b.x &&
          this.ball.x <= b.x + b.w &&
          this.ball.y - this.ball.radius <= b.y + b.h &&
          this.ball.y + this.ball.radius >= b.y
        ) {
          b.status = 0;
          this.ball.vy = -this.ball.vy;
          this.score += b.pts;
          this.createBurst(b.x + b.w / 2, b.y + b.h / 2, b.color, 12);
          break;
        }
      }
    }

    if (allCleared) {
      // Siguiente ronda de ladrillos
      this.initBricks();
      this.resetBall();
    }

    // Pérdida de bola por abajo
    if (this.ball.y - this.ball.radius > this.canvas.height) {
      this.lives--;
      if (this.lives <= 0) {
        this.triggerGameOver();
      } else {
        this.resetBall();
      }
    }
  }

  createBurst(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        alpha: 1.0,
        color
      });
    }
  }

  triggerGameOver() {
    this.running = false;
    this.stop();
    if (this.onGameOver) {
      this.onGameOver(this.score);
    }
  }

  loop() {
    if (!this.running) return;
    this.update();
    this.render();
    requestAnimationFrame(this.loop);
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Fondo
    ctx.fillStyle = '#0f051d';
    ctx.fillRect(0, 0, w, h);

    // Partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.05;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
      ctx.restore();
    }

    // Ladrillos
    for (const b of this.bricks) {
      if (b.status === 1) {
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(b.x, b.y, b.w, b.h);

        // Bisel retro
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(b.x, b.y, b.w, 3);
        ctx.fillRect(b.x, b.y, 3, b.h);
        ctx.restore();
      }
    }

    // Paleta
    ctx.save();
    ctx.fillStyle = '#ffaa00';
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = 10;
    ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.paddle.x + 4, this.paddle.y + 2, this.paddle.width - 8, 2);
    ctx.restore();

    // Bola
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Marcador
    ctx.fillStyle = '#ffff00';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText(`SCORE: ${this.score}`, 14, 24);
    ctx.fillText(`LIVES: ${'♥'.repeat(this.lives)}`, w - 125, 24);
  }
}
