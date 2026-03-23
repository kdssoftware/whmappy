CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Table for EVE Systems (Static Data)
CREATE TABLE IF NOT EXISTS systems (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    security_status FLOAT,
    is_wormhole BOOLEAN DEFAULT FALSE
);

-- 2. Table for Logged-in Characters (SSO Tokens)
CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY, -- Character ID from ESI
    name VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    last_location_id INTEGER REFERENCES systems(id) ON DELETE SET NULL
);

-- 3. Table for Wormhole Connections (Dynamic Data)
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system_id INTEGER NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    target_system_id INTEGER NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    connection_type VARCHAR(20) DEFAULT 'wormhole', -- 'wormhole' or 'gate'
    wh_size VARCHAR(20) DEFAULT 'large',           -- 'small', 'medium', 'large', 'xl'
    custom_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by_character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL
);

-- 4. Seed a few systems so the foreign keys don't fail immediately
-- You'll eventually want to import the full EVE SDE here.
INSERT INTO systems (id, name, security_status, is_wormhole) VALUES 
(30000142, 'Jita', 0.9, false),
(30002187, 'Amarr', 1.0, false),
(31000001, 'J100227', -1.0, true)
ON CONFLICT (id) DO NOTHING;
