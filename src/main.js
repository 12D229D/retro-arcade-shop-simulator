/**
 * Bucle Principal y Controlador del Simulador
 * Integra:
 * - Renderizador Isométrico Canvas 2D
 * - Simulación de Agentes Clientes y A* Pathfinding
 * - Motor de Economía y Desgaste/Averías
 * - Editor de Distribución (LayoutEditor)
 * - Persistencia SQLite
 * - Minijuegos Arcade interactivos
 * - Audio Chiptune Procedural
 */

import { SQLiteStorage } from './storage/sqlite.js';
import { IsoRenderer } from './render/isoRenderer.js';
import { GridPathfinder } from './sim/pathfinding.js';
import { CustomerAgent } from './sim/customerAgent.js';
import { EconomySystem } from './sim/economy.js';
import { BreakdownSystem } from './sim/breakdowns.js';
import { LayoutEditor } from './build/layoutEditor.js';
import { audioSystem } from './audio.js';
import { NeonSnakeGame } from './minigames/neonSnake.js';
import { PixelBreakerGame } from './minigames/pixelBreaker.js';
import { StarDodgerGame } from './minigames/starDodger.js';

class ArcadeShopApp {
  constructor() {
    this.storage = new SQLiteStorage();
    this.economy = new EconomySystem(this.storage);
    this.breakdowns = new BreakdownSystem(this.storage, this.economy);
    this.pathfinder = new GridPathfinder(10, 10);

    this.shopState = this.storage.getShopState();
    this.placedCabinets = this.storage.getPlacedCabinets();
    this.catalog = [];

    this.customers = [];
    this.nextCustomerId = 1;
    this.spawnInterval = 7.0; // Segundos entre potenciales clientes
    this.spawnTimer = 2.0;

    // Reloj del día: de 10:00 (600 mins) a 22:00 (1320 mins)
    this.timeMinutes = this.shopState.time_minutes || 600;
    this.day = this.shopState.day || 1;
    this.timeScale = 8; // Velocidad del reloj de simulación (minutos de juego por segundo real)
    this.isDayActive = true;

    // Componentes de vista
    this.canvas = document.getElementById('iso-canvas');
    this.renderer = new IsoRenderer(this.canvas);
    this.layoutEditor = null; // Inicializado tras cargar el catálogo

    // Minijuegos
    this.activeMinigame = null;

    this.lastFrameTime = performance.now();
  }

  async init() {
    this.setupWindowResize();

    // Cargar catálogo de muebles
    try {
      const res = await fetch('./src/build/catalog.json');
      this.catalog = await res.json();
    } catch (e) {
      console.warn('Error fetching catalog.json, using fallback:', e);
      this.catalog = this.getFallbackCatalog();
    }

    this.layoutEditor = new LayoutEditor(this.storage, this.economy, this.catalog, this.pathfinder);

    // Obstáculos iniciales en el pathfinding
    this.pathfinder.updateObstacles(this.placedCabinets);

    // Inicializar UI y Eventos
    this.renderCatalogDrawer();
    this.bindEvents();
    this.updateHUD();

    // Bucle principal a 60 FPS
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  getFallbackCatalog() {
    return [
      { id: 'cab_snake', title: 'Neon Cyber Snake', category: 'arcade', minigameId: 'neonSnake', price: 250, powerDrawWatts: 180, themeColor: '#00ffcc', accentColor: '#ff007f' },
      { id: 'cab_breaker', title: 'Pixel Breaker 1994', category: 'arcade', minigameId: 'pixelBreaker', price: 320, powerDrawWatts: 220, themeColor: '#ffaa00', accentColor: '#00e5ff' },
      { id: 'cab_star', title: 'Star Dodger 2099', category: 'arcade', minigameId: 'starDodger', price: 400, powerDrawWatts: 260, themeColor: '#9900ff', accentColor: '#ffe600' },
      { id: 'vending_change', title: "Cambiador 'Token-O-Matic'", category: 'utility', minigameId: null, price: 180, powerDrawWatts: 60, themeColor: '#00f0ff', accentColor: '#ffea00' },
      { id: 'vending_soda', title: "Refrescos 'Neon Cola'", category: 'snack', minigameId: null, price: 220, powerDrawWatts: 150, themeColor: '#ff0055', accentColor: '#ffffff' },
      { id: 'deco_plant', title: 'Palmera Cyber-Retro', category: 'decor', minigameId: null, price: 60, powerDrawWatts: 0, themeColor: '#00ff66', accentColor: '#008833' }
    ];
  }

  setupWindowResize() {
    const resize = () => {
      const container = document.getElementById('canvas-container');
      this.canvas.width = container.clientWidth;
      this.canvas.height = container.clientHeight;
      this.renderer.resize();
    };
    window.addEventListener('resize', resize);
    resize();
  }

  bindEvents() {
    // Interacción Canvas con el ratón
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const gridPos = this.renderer.screenToGrid(sx, sy);
      this.layoutEditor.updateHover(gridPos.x, gridPos.y, this.placedCabinets);
    });

    this.canvas.addEventListener('click', (e) => {
      audioSystem.ensureContext();
      audioSystem.startBGM();

      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const gridPos = this.renderer.screenToGrid(sx, sy);

      const result = this.layoutEditor.handleClick(gridPos.x, gridPos.y, this.placedCabinets);
      if (result) {
        if (result.action === 'PLACED') {
          audioSystem.playRepairSound();
          this.placedCabinets = this.storage.getPlacedCabinets();
          this.pathfinder.updateObstacles(this.placedCabinets);
          this.hideEditorBanner();
          this.updateHUD();
        } else if (result.action === 'BLOCKED') {
          audioSystem.playErrorSound();
        } else if (result.action === 'SELECTED') {
          audioSystem.playBeep(520, 'sine', 0.08);
          this.showObjectInspector(result.cabinet);
        } else if (result.action === 'DESELECTED') {
          this.hideObjectInspector();
        }
      }
    });

    // Botones del HUD
    document.getElementById('btn-sound-toggle')?.addEventListener('click', () => {
      const isMuted = audioSystem.toggleMute();
      document.getElementById('sound-icon').textContent = isMuted ? '🔇' : '🔊';
    });

    document.getElementById('btn-pricing-modal')?.addEventListener('click', () => {
      this.openPricingModal();
    });

    document.getElementById('btn-cancel-placement')?.addEventListener('click', () => {
      this.layoutEditor.cancelPlacement();
      this.hideEditorBanner();
    });

    // Inspector Acciones
    document.getElementById('btn-inspect-play')?.addEventListener('click', () => {
      const sel = this.layoutEditor.selectedPlacedObject;
      if (sel && sel.category === 'arcade') {
        const cat = this.catalog.find(c => c.id === sel.catalog_id);
        if (cat && cat.minigameId) {
          this.launchMinigame(cat.minigameId, sel.title);
        }
      }
    });

    document.getElementById('btn-inspect-repair')?.addEventListener('click', () => {
      const sel = this.layoutEditor.selectedPlacedObject;
      if (sel && sel.is_broken) {
        const res = this.breakdowns.repairCabinet(sel);
        if (res.success) {
          audioSystem.playRepairSound();
          this.placedCabinets = this.storage.getPlacedCabinets();
          this.showObjectInspector(sel);
          this.updateHUD();
        } else {
          audioSystem.playErrorSound();
          alert(res.reason);
        }
      }
    });

    document.getElementById('btn-inspect-sell')?.addEventListener('click', () => {
      const res = this.layoutEditor.sellSelectedObject();
      if (res && res.success) {
        audioSystem.playCoinSound();
        this.placedCabinets = this.storage.getPlacedCabinets();
        this.pathfinder.updateObstacles(this.placedCabinets);
        this.hideObjectInspector();
        this.updateHUD();
      }
    });

    // Botones de cierre de modales
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-overlay');
        if (modal) modal.style.display = 'none';
        if (this.activeMinigame) {
          this.activeMinigame.stop();
          this.activeMinigame = null;
        }
      });
    });

    // Slider de precio de fichas
    const slider = document.getElementById('token-price-slider');
    const priceDisplay = document.getElementById('token-price-display');
    slider?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      priceDisplay.textContent = `$${val.toFixed(2)}`;
      this.economy.setTokenPrice(val);
      this.updateHUD();
    });

    // Botón Continuar día siguiente
    document.getElementById('btn-next-day')?.addEventListener('click', () => {
      document.getElementById('daily-report-modal').style.display = 'none';
      this.startNextDay();
    });
  }

  renderCatalogDrawer() {
    const drawer = document.getElementById('catalog-drawer');
    if (!drawer) return;
    drawer.innerHTML = '';

    const categoryIcons = {
      arcade: '🕹️',
      utility: '🪙',
      snack: '🥤',
      decor: '🌴'
    };

    for (const item of this.catalog) {
      const card = document.createElement('div');
      card.className = 'catalog-item-card';
      card.innerHTML = `
        <span class="cat-icon">${categoryIcons[item.category] || '📦'}</span>
        <span class="cat-title">${item.title}</span>
        <span class="cat-price">$${item.price}</span>
      `;

      card.addEventListener('click', () => {
        audioSystem.playBeep(640, 'triangle', 0.1);
        const res = this.layoutEditor.setPlacementMode(item.id);
        if (res.success) {
          this.showEditorBanner(`Colocando: ${item.title}. Haz clic en el suelo para instalarlo.`);
        } else {
          audioSystem.playErrorSound();
          alert(res.reason);
        }
      });

      drawer.appendChild(card);
    }
  }

  showEditorBanner(msg) {
    const banner = document.getElementById('editor-banner');
    const text = document.getElementById('editor-banner-text');
    if (banner && text) {
      text.textContent = msg;
      banner.style.display = 'flex';
    }
  }

  hideEditorBanner() {
    const banner = document.getElementById('editor-banner');
    if (banner) banner.style.display = 'none';
  }

  showObjectInspector(cab) {
    const panel = document.getElementById('object-inspector');
    if (!panel) return;

    document.getElementById('inspect-title').textContent = cab.title;
    document.getElementById('inspect-category').textContent = cab.category.toUpperCase();
    document.getElementById('inspect-condition').textContent = `${Math.round(cab.condition)}%`;
    document.getElementById('inspect-status').textContent = cab.is_broken ? `⚠ AVERIADA (${cab.breakdown_type})` : '🟢 Operativa';
    document.getElementById('inspect-tokens').textContent = cab.tokens_earned || 0;

    const playBtn = document.getElementById('btn-inspect-play');
    const repairBtn = document.getElementById('btn-inspect-repair');

    if (cab.category === 'arcade' && !cab.is_broken) {
      playBtn.style.display = 'inline-flex';
    } else {
      playBtn.style.display = 'none';
    }

    if (cab.is_broken) {
      repairBtn.style.display = 'inline-flex';
      const info = this.breakdowns.getRepairInfo(cab.breakdown_type);
      repairBtn.textContent = `Reparar ($${info.cost})`;
    } else {
      repairBtn.style.display = 'none';
    }

    panel.style.display = 'flex';
  }

  hideObjectInspector() {
    const panel = document.getElementById('object-inspector');
    if (panel) panel.style.display = 'none';
  }

  openPricingModal() {
    const modal = document.getElementById('pricing-modal');
    const slider = document.getElementById('token-price-slider');
    const priceDisplay = document.getElementById('token-price-display');
    if (modal && slider && priceDisplay) {
      slider.value = this.economy.tokenPrice;
      priceDisplay.textContent = `$${this.economy.tokenPrice.toFixed(2)}`;
      modal.style.display = 'flex';
    }
  }

  updateHUD() {
    document.getElementById('hud-cash').textContent = `$${this.economy.cash.toFixed(2)}`;
    document.getElementById('hud-tokens').textContent = `${this.economy.tokens}`;
    document.getElementById('hud-token-price').textContent = `$${this.economy.tokenPrice.toFixed(2)}`;
    document.getElementById('hud-rep').textContent = `★ ${this.economy.reputation.toFixed(1)}`;

    // Formatear reloj de 24h
    const hours = Math.floor(this.timeMinutes / 60);
    const mins = Math.floor(this.timeMinutes % 60);
    const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    document.getElementById('hud-clock').textContent = `DÍA ${this.day} - ${timeStr}`;
  }

  // Creación y actualización de clientes en la simulación
  updateCustomers(dt) {
    if (!this.isDayActive) return;

    // Generar nuevos clientes según reputación y hora del día
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      // Entre 10:00 y 21:00 es hora punta
      const maxCustomers = Math.floor(4 + this.economy.reputation * 1.5);
      if (this.customers.length < maxCustomers) {
        const c = new CustomerAgent(this.nextCustomerId++, { x: 4, y: 9 });
        this.customers.push(c);
      }
      this.spawnTimer = (this.spawnInterval / (this.economy.reputation * 0.4)) + Math.random() * 2.0;
    }

    const simContext = {
      tokenPrice: this.economy.tokenPrice,
      pathfinder: this.pathfinder,
      entrancePos: { x: 4, y: 9 },
      breakdowns: this.breakdowns,
      findNearestAvailable: (x, y, categoryOrCatalogId) => {
        const targets = this.placedCabinets.filter(c => {
          if (Array.isArray(categoryOrCatalogId)) {
            return categoryOrCatalogId.includes(c.catalog_id) || categoryOrCatalogId.includes(c.category);
          }
          return c.catalog_id === categoryOrCatalogId || c.category === categoryOrCatalogId;
        });
        if (targets.length === 0) return null;
        targets.sort((a, b) => Math.hypot(a.grid_x - x, a.grid_y - y) - Math.hypot(b.grid_x - x, b.grid_y - y));
        return targets[0];
      },
      findAvailableArcade: (x, y) => {
        const arcades = this.placedCabinets.filter(c => c.category === 'arcade');
        if (arcades.length === 0) return null;
        // Priorizar máquinas que no estén ocupadas por otro cliente
        const freeArcades = arcades.filter(arc => !this.customers.some(cust => cust.targetObject?.id === arc.id && cust.state === 'PLAYING'));
        const pool = freeArcades.length > 0 ? freeArcades : arcades;
        return pool[Math.floor(Math.random() * pool.length)];
      },
      registerTokenSale: (amount, totalCost) => {
        audioSystem.playCoinSound();
        this.economy.registerTokenSale(amount, totalCost);
        this.updateHUD();
      },
      registerTokenUse: (cabinet) => {
        audioSystem.playBeep(880, 'square', 0.05);
      },
      registerSnackSale: (cost) => {
        audioSystem.playBeep(600, 'sine', 0.1);
        this.economy.registerSnackSale(cost);
        this.updateHUD();
      },
      removeCustomer: (id, satisfaction) => {
        this.customers = this.customers.filter(c => c.id !== id);
        this.economy.registerCustomerDeparture(satisfaction);
        this.updateHUD();
      }
    };

    for (const cust of this.customers) {
      cust.update(dt, simContext);
    }
  }

  // Ciclo horario del día
  updateClock(dt) {
    if (!this.isDayActive) return;

    this.timeMinutes += dt * this.timeScale;

    // Calcular consumo eléctrico paulatino
    this.economy.calculateElectricityStep(dt, this.placedCabinets, this.catalog);

    // Cierre del día a las 22:00 (1320 minutos)
    if (this.timeMinutes >= 1320) {
      this.closeDay();
    }

    this.updateHUD();
  }

  closeDay() {
    this.isDayActive = false;
    this.timeMinutes = 1320;
    // Expulsar clientes amablemente
    for (const c of this.customers) {
      c.say('¡Es hora de cerrar! Hasta mañana.');
      c.startLeaving({
        pathfinder: this.pathfinder,
        entrancePos: { x: 4, y: 9 },
        removeCustomer: (id) => {
          this.customers = this.customers.filter(cust => cust.id !== id);
        }
      });
    }

    const report = this.economy.endDay(this.day);
    this.showDailyReport(report);
  }

  showDailyReport(report) {
    const modal = document.getElementById('daily-report-modal');
    if (!modal) return;

    document.getElementById('report-day-num').textContent = report.day;
    document.getElementById('report-tokens').textContent = report.tokens_sold;
    document.getElementById('report-gross').textContent = `$${report.gross_income.toFixed(2)}`;
    document.getElementById('report-snacks').textContent = `$${report.snack_income.toFixed(2)}`;
    document.getElementById('report-power').textContent = `-$${report.electricity_cost.toFixed(2)}`;
    document.getElementById('report-repairs').textContent = `-$${report.maintenance_cost.toFixed(2)}`;

    const profitEl = document.getElementById('report-profit');
    profitEl.textContent = `$${report.net_profit.toFixed(2)}`;
    profitEl.className = report.net_profit >= 0 ? 'profit-positive' : 'profit-negative';

    document.getElementById('report-customers').textContent = report.customers_served;
    document.getElementById('report-rep').textContent = `★ ${report.reputation_end.toFixed(1)}`;

    modal.style.display = 'flex';
  }

  startNextDay() {
    this.day++;
    this.timeMinutes = 600; // 10:00 AM
    this.isDayActive = true;
    this.customers = [];

    this.storage.updateShopState({
      day: this.day,
      time_minutes: this.timeMinutes
    });

    this.updateHUD();
  }

  // Lanzador de Minijuegos
  launchMinigame(minigameId, title) {
    const modal = document.getElementById('minigame-modal');
    const canvas = document.getElementById('minigame-canvas');
    const titleEl = document.getElementById('minigame-title');
    const highscoreEl = document.getElementById('minigame-highscore');

    if (!modal || !canvas) return;

    titleEl.textContent = `🕹️ ${title}`;
    const record = this.storage.getMinigameRecord(minigameId);
    highscoreEl.textContent = `RÉCORD: ${record.high_score} (${record.player_initials})`;

    modal.style.display = 'flex';

    const onGameOver = (score) => {
      audioSystem.playErrorSound();
      const updated = this.storage.updateMinigameRecord(minigameId, score, 'PLY');
      highscoreEl.textContent = `RÉCORD: ${updated.high_score} (${updated.player_initials})`;
      setTimeout(() => {
        alert(`¡GAME OVER!\nPuntuación final: ${score}\n${score >= updated.high_score ? '¡NUEVO RÉCORD DE LA SALA!' : '¡Buen intento!'}`);
      }, 100);
    };

    if (minigameId === 'neonSnake') {
      this.activeMinigame = new NeonSnakeGame(canvas, onGameOver);
    } else if (minigameId === 'pixelBreaker') {
      this.activeMinigame = new PixelBreakerGame(canvas, onGameOver);
    } else if (minigameId === 'starDodger') {
      this.activeMinigame = new StarDodgerGame(canvas, onGameOver);
    }

    if (this.activeMinigame) {
      this.activeMinigame.start();
    }
  }

  // Loop a 60 FPS
  gameLoop(now) {
    const dt = Math.min(0.1, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    this.updateClock(dt);
    this.updateCustomers(dt);

    // Renderizado en Canvas
    this.renderer.render(
      this.shopState,
      this.placedCabinets,
      this.customers,
      this.layoutEditor ? this.layoutEditor.hoverGrid : null,
      this.layoutEditor ? this.layoutEditor.selectedPlacedObject : null,
      this.layoutEditor ? this.layoutEditor.ghost : null
    );

    requestAnimationFrame(this.gameLoop.bind(this));
  }
}

// Inicializar la aplicación cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
  const app = new ArcadeShopApp();
  app.init();
});
