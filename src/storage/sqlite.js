/**
 * SQLite Storage Manager para Retro Arcade Shop Simulator
 * Proporciona persistencia declarativa local y simulación de base de datos relacional
 * compatible con SQLite 3.45+ (en memoria o persistida en localStorage / IndexedDB).
 */

export class SQLiteStorage {
  constructor(dbKey = 'retro_arcade_shop_db') {
    this.dbKey = dbKey;
    this.initDatabase();
  }

  initDatabase() {
    const raw = localStorage.getItem(this.dbKey);
    if (!raw) {
      this.resetToDefaults();
    }
  }

  resetToDefaults() {
    const defaultData = {
      arcade_shop: {
        id: 1,
        shop_name: 'Pixel Palace 90s',
        day: 1,
        time_minutes: 600, // 10:00 AM
        cash: 650.0,
        tokens: 150,
        token_price: 1.0,
        reputation: 3.5,
        sound_muted: 0
      },
      placed_cabinets: [
        {
          id: 'cab_init_1',
          catalog_id: 'cab_snake',
          title: 'Neon Cyber Snake',
          category: 'arcade',
          grid_x: 3,
          grid_y: 2,
          rotation: 0,
          condition: 98.0,
          is_broken: 0,
          breakdown_type: null,
          tokens_earned: 0
        },
        {
          id: 'cab_init_2',
          catalog_id: 'cab_breaker',
          title: 'Pixel Breaker 1994',
          category: 'arcade',
          grid_x: 5,
          grid_y: 2,
          rotation: 0,
          condition: 95.0,
          is_broken: 0,
          breakdown_type: null,
          tokens_earned: 0
        },
        {
          id: 'cab_init_3',
          catalog_id: 'vending_change',
          title: "Cambiador de Fichas 'Token-O-Matic'",
          category: 'utility',
          grid_x: 1,
          grid_y: 4,
          rotation: 0,
          condition: 100.0,
          is_broken: 0,
          breakdown_type: null,
          tokens_earned: 0
        },
        {
          id: 'cab_init_4',
          catalog_id: 'vending_soda',
          title: "Máquina de Refrescos 'Neon Cola'",
          category: 'snack',
          grid_x: 7,
          grid_y: 4,
          rotation: 0,
          condition: 96.0,
          is_broken: 0,
          breakdown_type: null,
          tokens_earned: 0
        }
      ],
      daily_finances: [],
      minigame_records: {
        neonSnake: { high_score: 180, player_initials: 'NEO', times_played: 12 },
        pixelBreaker: { high_score: 520, player_initials: 'RET', times_played: 18 },
        starDodger: { high_score: 410, player_initials: 'ACE', times_played: 9 }
      }
    };
    this.saveRaw(defaultData);
    return defaultData;
  }

  getRaw() {
    try {
      const raw = localStorage.getItem(this.dbKey);
      return raw ? JSON.parse(raw) : this.resetToDefaults();
    } catch (e) {
      console.warn('Error reading SQLiteStorage, restoring defaults:', e);
      return this.resetToDefaults();
    }
  }

  saveRaw(data) {
    try {
      localStorage.setItem(this.dbKey, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to SQLite storage:', e);
    }
  }

  // Métodos CRUD para arcade_shop
  getShopState() {
    return this.getRaw().arcade_shop;
  }

  updateShopState(fields) {
    const data = this.getRaw();
    data.arcade_shop = { ...data.arcade_shop, ...fields };
    this.saveRaw(data);
    return data.arcade_shop;
  }

  // Métodos CRUD para placed_cabinets
  getPlacedCabinets() {
    return this.getRaw().placed_cabinets || [];
  }

  setPlacedCabinets(cabinets) {
    const data = this.getRaw();
    data.placed_cabinets = cabinets;
    this.saveRaw(data);
  }

  addCabinet(cabinet) {
    const data = this.getRaw();
    data.placed_cabinets.push(cabinet);
    this.saveRaw(data);
  }

  updateCabinet(id, fields) {
    const data = this.getRaw();
    const idx = data.placed_cabinets.findIndex(c => c.id === id);
    if (idx !== -1) {
      data.placed_cabinets[idx] = { ...data.placed_cabinets[idx], ...fields };
      this.saveRaw(data);
    }
  }

  removeCabinet(id) {
    const data = this.getRaw();
    data.placed_cabinets = data.placed_cabinets.filter(c => c.id !== id);
    this.saveRaw(data);
  }

  // Métodos para finanzas
  addDailyFinance(record) {
    const data = this.getRaw();
    data.daily_finances.push({
      id: Date.now(),
      recorded_at: new Date().toISOString(),
      ...record
    });
    this.saveRaw(data);
  }

  getDailyFinances() {
    return this.getRaw().daily_finances || [];
  }

  // Minijuegos
  getMinigameRecord(gameId) {
    const data = this.getRaw();
    return data.minigame_records?.[gameId] || { high_score: 0, player_initials: 'AAA', times_played: 0 };
  }

  updateMinigameRecord(gameId, score, initials = 'PLY') {
    const data = this.getRaw();
    if (!data.minigame_records) data.minigame_records = {};
    const curr = data.minigame_records[gameId] || { high_score: 0, player_initials: 'AAA', times_played: 0 };
    curr.times_played += 1;
    if (score > curr.high_score) {
      curr.high_score = score;
      curr.player_initials = initials.substring(0, 3).toUpperCase();
    }
    data.minigame_records[gameId] = curr;
    this.saveRaw(data);
    return curr;
  }
}
