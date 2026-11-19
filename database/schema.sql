\set ON_ERROR_STOP on

BEGIN;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
CREATE SCHEMA IF NOT EXISTS rutarent AUTHORIZATION rutarent_owner;
SET LOCAL ROLE rutarent_owner;
SET LOCAL search_path TO rutarent, public;

CREATE TABLE IF NOT EXISTS customers (
    id text PRIMARY KEY,
    name text NOT NULL,
    CONSTRAINT customers_id_required CHECK (btrim(id) <> ''),
    CONSTRAINT customers_name_required CHECK (btrim(name) <> '')
);

CREATE TABLE IF NOT EXISTS vehicles (
    id text PRIMARY KEY,
    name text,
    plate text UNIQUE,
    CONSTRAINT vehicles_id_required CHECK (btrim(id) <> ''),
    CONSTRAINT vehicles_name_valid CHECK (name IS NULL OR btrim(name) <> ''),
    CONSTRAINT vehicles_plate_valid CHECK (plate IS NULL OR btrim(plate) <> '')
);

CREATE SEQUENCE IF NOT EXISTS rental_id_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS rentals (
    id text PRIMARY KEY DEFAULT ('R-' || nextval('rutarent.rental_id_seq'::regclass)),
    customer_id text NOT NULL REFERENCES customers(id),
    vehicle_id text NOT NULL REFERENCES vehicles(id),
    start_date date NOT NULL,
    end_date date NOT NULL,
    plan_type text NOT NULL,
    rate numeric(12, 2) NOT NULL,
    status text NOT NULL DEFAULT 'RESERVED',
    return_date date,
    final_amount numeric(14, 2),
    CONSTRAINT rentals_id_required CHECK (btrim(id) <> ''),
    CONSTRAINT rentals_dates_valid CHECK (
        isfinite(start_date) AND isfinite(end_date) AND end_date > start_date
    ),
    CONSTRAINT rentals_plan_valid CHECK (plan_type IN ('DAILY', 'WEEKLY')),
    CONSTRAINT rentals_rate_positive CHECK (rate > 0 AND rate <> 'NaN'::numeric),
    CONSTRAINT rentals_status_valid CHECK (status IN ('RESERVED', 'ACTIVE', 'CLOSED')),
    CONSTRAINT rentals_close_valid CHECK (
        (status = 'CLOSED'
            AND return_date IS NOT NULL AND isfinite(return_date) AND return_date > start_date
            AND final_amount IS NOT NULL AND final_amount >= 0 AND final_amount <> 'NaN'::numeric)
        OR (status IN ('RESERVED', 'ACTIVE') AND return_date IS NULL AND final_amount IS NULL)
    ),
    -- [) includes the start date and excludes the scheduled return date.
    -- PostgreSQL also enforces this constraint for simultaneous transactions.
    CONSTRAINT rentals_no_overlap EXCLUDE USING gist (
        vehicle_id WITH =,
        daterange(start_date, end_date, '[)') WITH &&
    ) WHERE (status IN ('RESERVED', 'ACTIVE'))
);

CREATE INDEX IF NOT EXISTS rentals_customer_idx ON rentals(customer_id);
CREATE INDEX IF NOT EXISTS rentals_status_end_idx ON rentals(status, end_date);

GRANT USAGE ON SCHEMA rutarent TO rutarent_app;
GRANT SELECT, INSERT, UPDATE ON customers, vehicles, rentals TO rutarent_app;
GRANT USAGE, SELECT ON SEQUENCE rental_id_seq TO rutarent_app;

COMMENT ON TABLE customers IS 'Customer.java: id and name.';
COMMENT ON TABLE vehicles IS 'Vehicule.java: id. Optional name and plate support presentation.';
COMMENT ON TABLE rentals IS 'Rental with its customer, vehicle, period, contracted plan, rate and lifecycle state. Java calculates prices.';
COMMENT ON COLUMN rentals.rate IS 'Contracted daily or weekly rate, preserved for this rental.';
COMMENT ON COLUMN rentals.final_amount IS 'Final amount calculated by Java when the rental is closed.';
COMMIT;
