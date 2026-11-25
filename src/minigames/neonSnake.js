/**
 * Minijuego Arcade: Neon Cyber Snake
 * Clásico juego de la serpiente cyberpunk con estética de fósforo verde y neón cian.
 */

export class NeonSnakeGame {
  constructor(canvas, onGameOver) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onGameOver = onGameOver;
    this.gridSize = 20;
    this.cols = Math.floor(canvas.width / this.gridSize);
    this.rows = Math.floor(canvas.height / this.gridSize);

    this.snake = [];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.food = { x: 5, y: 5, type: 'normal' };
    this.score = 0;
    this.running = false;
    this.tickRate = 110; // ms por tick
    this.lastTick = 0;
    this.particles = [];

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.loop = this.loop.bind(this);
  }

  start() {
    this.score = 0;
    this.snake = [
      { x: 5, y: 10 },
      { x: 4, y: 10 },
      { x: 3, y: 10 }
    ];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.spawnFood();
    this.particles = [];
    this.running = true;
    this.lastTick = performance.now();

    window.addEventListener('keydown', this.handleKeyDown);
    requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown(e) {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        if (this.dir.y === 0) this.nextDir = { x: 0, y: -1 };
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        if (this.dir.y === 0) this.nextDir = { x: 0, y: 1 };
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        if (this.dir.x === 0) this.nextDir = { x: -1, y: 0 };
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        if (this.dir.x === 0) this.nextDir = { x: 1, y: 0 };
        break;
    }
  }

  spawnFood() {
    let valid = false;
    while (!valid) {
      const rx = Math.floor(Math.random() * this.cols);
      const ry = Math.floor(Math.random() * this.rows);
      valid = !this.snake.some(seg => seg.x === rx && seg.y === ry);
      if (valid) {
        this.food = {
          x: rx,
          y: ry,
          type: Math.random() < 0.25 ? 'bonus' : 'normal'
        };
      }
    }
  }

  update() {
    this.dir = this.nextDir;
    const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };

    // Colisiones con pared
    if (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows) {
      this.triggerGameOver();
      return;
    }

    // Colisión consigo misma
    if (this.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
      this.triggerGameOver();
      return;
    }

    this.snake.unshift(head);

    // Comer alimento
    if (head.x === this.food.x && head.y === this.food.y) {
      const pts = this.food.type === 'bonus' ? 25 : 10;
      this.score += pts;
      this.createBurst(
        head.x * this.gridSize + this.gridSize / 2,
        head.y * this.gridSize + this.gridSize / 2,
        this.food.type === 'bonus' ? '#ff00aa' : '#00ffff'
      );
      this.spawnFood();
      // Incrementar velocidad sutilmente
      this.tickRate = Math.max(65, this.tickRate - 1.5);
    } else {
      this.snake.pop();
    }
  }

  createBurst(x, y, color) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * (2 + Math.random() * 2),
        vy: Math.sin(angle) * (2 + Math.random() * 2),
        alpha: 1.0,
        color
      });
    }
  }

  triggerGameOver() {
    this.running = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.onGameOver) {
      this.onGameOver(this.score);
    }
  }

  loop(now) {
    if (!this.running) return;

    if (now - this.lastTick >= this.tickRate) {
      this.update();
      this.lastTick = now;
    }

    this.render();
    requestAnimationFrame(this.loop);
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Fondo CRT oscuro
    ctx.fillStyle = '#0a0518';
    ctx.fillRect(0, 0, w, h);

    // Rejilla de fondo
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.04;
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

    // Alimento de neón
    ctx.save();
    ctx.shadowBlur = 12;
    if (this.food.type === 'bonus') {
      ctx.shadowColor = '#ff00bb';
      ctx.fillStyle = '#ff00bb';
    } else {
      ctx.shadowColor = '#00ffff';
      ctx.fillStyle = '#00ffff';
    }
    ctx.fillRect(
      this.food.x * this.gridSize + 2,
      this.food.y * this.gridSize + 2,
      this.gridSize - 4,
      this.gridSize - 4
    );
    ctx.restore();

    // Serpiente con resplandor
    for (let i = 0; i < this.snake.length; i++) {
      const seg = this.snake[i];
      const isHead = i === 0;

      ctx.save();
      ctx.shadowBlur = isHead ? 14 : 6;
      ctx.shadowColor = isHead ? '#39ff14' : '#00e5ff';
      ctx.fillStyle = isHead ? '#39ff14' : '#00c3ff';
      ctx.fillRect(
        seg.x * this.gridSize + 1,
        seg.y * this.gridSize + 1,
        this.gridSize - 2,
        this.gridSize - 2
      );
      ctx.restore();
    }

    // HUD Marcador Arcade
    ctx.fillStyle = '#ffff00';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillText(`SCORE: ${this.score}`, 16, 26);
  }
}
