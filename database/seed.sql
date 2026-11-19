\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE rutarent_owner;
SET LOCAL search_path TO rutarent, public;

-- Fictitious demonstration data. Existing records are preserved.
INSERT INTO customers (id, name) VALUES
    ('C01', 'Ana Perez'),
    ('C02', 'Luis Rojas')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicles (id, name, plate) VALUES
    ('V01', 'Toyota Corolla', '4321 ABC'),
    ('V02', 'Suzuki Swift', '5812 XYZ'),
    ('V03', 'Kia Sportage', '6734 DEF')
ON CONFLICT DO NOTHING;
COMMIT;
