#!/bin/bash
# seed.sh
docker exec -it eve-mapper-db psql -U postgres -d eve_mapper -c "
INSERT INTO systems (id, name, is_wormhole) VALUES 
(30000142, 'Jita', false),
(30002794, 'Yria', false),
(31000302, 'J133052', true),
(31000837, 'J161628', true)
ON CONFLICT (id) DO NOTHING;

DELETE FROM connections;

INSERT INTO connections (id, source_system_id, target_system_id, connection_type, wh_size, expires_at) VALUES
(gen_random_uuid(), 30000142, 31000302, 'wormhole', 'large', NOW() + interval '24 hours'),
(gen_random_uuid(), 31000302, 31000837, 'wormhole', 'medium', NOW() + interval '6 hours'),
(gen_random_uuid(), 30002794, 31000302, 'wormhole', 'large', NOW() + interval '24 hours');
"
