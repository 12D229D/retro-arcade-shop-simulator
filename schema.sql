-- schema.sql - Retro Arcade Shop Simulator
-- Contrato declarativo de base de datos SQLite 3.45+

CREATE TABLE IF NOT EXISTS arcade_shop (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    shop_name TEXT NOT NULL DEFAULT 'Pixel Palace 90s',
    day INTEGER NOT NULL DEFAULT 1,
    time_minutes INTEGER NOT NULL DEFAULT 600, -- 10:00 AM (600 mins)
    cash REAL NOT NULL DEFAULT 500.0,
    tokens INTEGER NOT NULL DEFAULT 100,
    token_price REAL NOT NULL DEFAULT 1.0,
    reputation REAL NOT NULL DEFAULT 3.0, -- de 1 a 5 estrellas
    sound_muted INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS placed_cabinets (
    id TEXT PRIMARY KEY,
    catalog_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    grid_x INTEGER NOT NULL,
    grid_y INTEGER NOT NULL,
    rotation INTEGER NOT NULL DEFAULT 0, -- 0 o 1
    condition REAL NOT NULL DEFAULT 100.0, -- 0 a 100%
    is_broken INTEGER NOT NULL DEFAULT 0,
    breakdown_type TEXT DEFAULT NULL, -- 'buttons', 'screen', 'coin_jam', 'power'
    tokens_earned INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_finances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day INTEGER NOT NULL,
    tokens_sold INTEGER NOT NULL DEFAULT 0,
    gross_income REAL NOT NULL DEFAULT 0.0,
    electricity_cost REAL NOT NULL DEFAULT 0.0,
    maintenance_cost REAL NOT NULL DEFAULT 0.0,
    snack_income REAL NOT NULL DEFAULT 0.0,
    net_profit REAL NOT NULL DEFAULT 0.0,
    customers_served INTEGER NOT NULL DEFAULT 0,
    reputation_end REAL NOT NULL DEFAULT 3.0,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS minigame_records (
    game_id TEXT PRIMARY KEY,
    game_title TEXT NOT NULL,
    high_score INTEGER NOT NULL DEFAULT 0,
    player_initials TEXT NOT NULL DEFAULT 'AAA',
    times_played INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Registros iniciales por defecto si no existen
INSERT OR IGNORE INTO arcade_shop (id, shop_name, day, time_minutes, cash, tokens, token_price, reputation)
VALUES (1, 'Pixel Palace 90s', 1, 600, 500.0, 100, 1.0, 3.2);

INSERT OR IGNORE INTO minigame_records (game_id, game_title, high_score, player_initials) VALUES
('neonSnake', 'Neon Cyber Snake', 150, 'NEO'),
('pixelBreaker', 'Pixel Breaker 1994', 450, 'RET'),
('starDodger', 'Star Dodger 2099', 320, 'ACE');
