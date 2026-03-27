#!/bin/bash
# seed.sh
docker exec -it eve-mapper-db psql -U postgres -d eve_mapper -c "
INSERT INTO systems (id, name, is_wormhole) VALUES 
(30000142, 'Jita', false),
(30002187, 'Amarr', false),
(30002659, 'Dodixie', false),
(30002053, 'Hek', false),

(30000144, 'Perimeter', false), -- 1 jump from Jita
(30002185, 'Ashab', false),     -- 1 jump from Amarr
(30002660, 'Botane', false),    -- 1 jump from Dodixie
(30005196, 'Ahbazon', false),   -- 0.4 Low-Sec system
(30002794, 'Yria', false),      -- Random High-sec

(31000302, 'J133052', true),
(31000837, 'J161628', true),
(31001111, 'J111111', true),
(31002222, 'J222222', true),
(31003333, 'J333333', true)
ON CONFLICT (id) DO NOTHING;

DELETE FROM connections;

INSERT INTO connections (id, source_system_id, target_system_id, connection_type, wh_size, expires_at) VALUES
(gen_random_uuid(), 30000142, 31000302, 'wormhole', 'large', NOW() + interval '24 hours'),
(gen_random_uuid(), 31000302, 31000837, 'wormhole', 'large', NOW() + interval '24 hours'),
(gen_random_uuid(), 31000837, 30002187, 'wormhole', 'large', NOW() + interval '24 hours'),
(gen_random_uuid(), 30002659, 31001111, 'wormhole', 'medium', NOW() + interval '16 hours'),
(gen_random_uuid(), 31001111, 30002053, 'wormhole', 'medium', NOW() + interval '16 hours'),
(gen_random_uuid(), 30000144, 31002222, 'wormhole', 'large', NOW() + interval '12 hours'),
(gen_random_uuid(), 31002222, 30005196, 'wormhole', 'large', NOW() + interval '12 hours'),
(gen_random_uuid(), 30005196, 31003333, 'wormhole', 'large', NOW() + interval '12 hours'),
(gen_random_uuid(), 31003333, 30002185, 'wormhole', 'large', NOW() + interval '12 hours'),
(gen_random_uuid(), 30002794, 31000302, 'wormhole', 'large', NOW() + interval '24 hours'),
(gen_random_uuid(), 31002222, 31001111, 'wormhole', 'small', NOW() + interval '4 hours');
"
