/**
 * Minijuego Arcade: Star Dodger 2099
 * Nave espacial de 16 bits que esquiva asteroides y recolecta núcleos de energía en el espacio profundo.
 */

export class StarDodgerGame {
  constructor(canvas, onGameOver) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onGameOver = onGameOver;

    this.ship = {
      x: canvas.width / 2,
      y: canvas.height - 40,
      width: 24,
      height: 24,
      speed: 6.0
    };

    this.stars = [];
    this.obstacles = [];
    this.energyCores = [];
    this.particles = [];
    this.score = 0;
    this.running = false;
    this.keys = { left: false, right: false, up: false, down: false };
    this.spawnTimer = 0;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.loop = this.loop.bind(this);
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < 40; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        speed: 1 + Math.random() * 3,
        size: Math.random() < 0.3 ? 2 : 1
      });
    }
  }

  start() {
    this.score = 0;
    this.ship.x = this.canvas.width / 2;
    this.ship.y = this.canvas.height - 40;
    this.obstacles = [];
    this.energyCores = [];
    this.particles = [];
    this.initStars();
    this.running = true;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  handleKeyDown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = true;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = true;
  }

  handleKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = false;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = false;
  }

  update(dt) {
    // Mover nave
    if (this.keys.left) this.ship.x = Math.max(12, this.ship.x - this.ship.speed);
    if (this.keys.right) this.ship.x = Math.min(this.canvas.width - 12, this.ship.x + this.ship.speed);
    if (this.keys.up) this.ship.y = Math.max(20, this.ship.y - this.ship.speed);
    if (this.keys.down) this.ship.y = Math.min(this.canvas.height - 20, this.ship.y + this.ship.speed);

    // Escape de motor de nave (partículas)
    if (Math.random() < 0.6) {
      this.particles.push({
        x: this.ship.x + (Math.random() - 0.5) * 6,
        y: this.ship.y + 12,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 2 + Math.random() * 2,
        alpha: 0.8,
        color: '#00ffff'
      });
    }

    // Mover estrellas
    for (const s of this.stars) {
      s.y += s.speed;
      if (s.y > this.canvas.height) {
        s.y = 0;
        s.x = Math.random() * this.canvas.width;
      }
    }

    // Spawn de meteoros y núcleos
    this.spawnTimer += dt;
    if (this.spawnTimer >= 0.45) {
      this.spawnTimer = 0;
      if (Math.random() < 0.75) {
        // Asteroide
        this.obstacles.push({
          x: 20 + Math.random() * (this.canvas.width - 40),
          y: -20,
          radius: 10 + Math.random() * 12,
          speed: 2.5 + Math.random() * 2.5,
          color: '#ff0055'
        });
      } else {
        // Núcleo de energía (+25 pts)
        this.energyCores.push({
          x: 20 + Math.random() * (this.canvas.width - 40),
          y: -15,
          radius: 7,
          speed: 2.0,
          color: '#ffe600'
        });
      }
    }

    // Actualizar obstáculos y colisión
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.y += obs.speed;

      // Colisión con la nave
      const dist = Math.hypot(this.ship.x - obs.x, this.ship.y - obs.y);
      if (dist < obs.radius + 10) {
        this.createExplosion(this.ship.x, this.ship.y, '#ff0055', 20);
        this.triggerGameOver();
        return;
      }

      if (obs.y > this.canvas.height + 30) {
        this.obstacles.splice(i, 1);
        this.score += 5; // Puntos por esquivar
      }
    }

    // Actualizar núcleos de energía
    for (let i = this.energyCores.length - 1; i >= 0; i--) {
      const core = this.energyCores[i];
      core.y += core.speed;

      const dist = Math.hypot(this.ship.x - core.x, this.ship.y - core.y);
      if (dist < core.radius + 12) {
        this.score += 30;
        this.createExplosion(core.x, core.y, '#ffe600', 10);
        this.energyCores.splice(i, 1);
        continue;
      }

      if (core.y > this.canvas.height + 20) {
        this.energyCores.splice(i, 1);
      }
    }

    // Partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.05;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  createExplosion(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 1.5 + Math.random() * 3.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
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
    this.update(0.016);
    this.render();
    requestAnimationFrame(this.loop);
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Fondo espacial
    ctx.fillStyle = '#050212';
    ctx.fillRect(0, 0, w, h);

    // Estrellas
    ctx.fillStyle = '#ffffff';
    for (const s of this.stars) {
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    // Partículas
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
      ctx.restore();
    }

    // Núcleos de energía
    for (const c of this.energyCores) {
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ffe600';
      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Obstáculos (asteroides neón)
    for (const obs of this.obstacles) {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = obs.color;
      ctx.fillStyle = obs.color;
      ctx.beginPath();
      ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Nave espacial (triángulo de combate neón)
    ctx.save();
    ctx.translate(this.ship.x, this.ship.y);
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#00ffff';
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(11, 10);
    ctx.lineTo(0, 5);
    ctx.lineTo(-11, 10);
    ctx.closePath();
    ctx.fill();

    // Cabina
    ctx.fillStyle = '#ff00aa';
    ctx.fillRect(-3, -4, 6, 6);
    ctx.restore();

    // Marcador
    ctx.fillStyle = '#00ffcc';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText(`SCORE: ${this.score}`, 14, 24);
  }
}
