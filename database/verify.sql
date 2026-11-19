\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE rutarent_app;
SET LOCAL search_path TO rutarent, public;

-- All rows used by these checks are rolled back at the end.
INSERT INTO customers (id, name) VALUES ('__rutarent_check_customer', 'Temporary check');
INSERT INTO vehicles (id) VALUES ('__rutarent_check_vehicle'), ('__rutarent_check_vehicle_2');

INSERT INTO rentals (id, customer_id, vehicle_id, start_date, end_date, plan_type, rate)
VALUES ('__rutarent_check_1', '__rutarent_check_customer', '__rutarent_check_vehicle',
        '2030-12-03', '2030-12-06', 'DAILY', 200);

DO $checks$
BEGIN
    BEGIN
        INSERT INTO rentals (id, customer_id, vehicle_id, start_date, end_date, plan_type, rate)
        VALUES ('__rutarent_overlap', '__rutarent_check_customer', '__rutarent_check_vehicle',
                '2030-12-05', '2030-12-07', 'DAILY', 200);
        RAISE EXCEPTION 'FAILED: overlapping reservations were accepted';
    EXCEPTION WHEN exclusion_violation THEN
        RAISE NOTICE 'PASS: overlapping reservations are rejected';
    END;
    BEGIN
        INSERT INTO rentals (id, customer_id, vehicle_id, start_date, end_date, plan_type, rate)
        VALUES ('__rutarent_bad_dates', '__rutarent_check_customer', '__rutarent_check_vehicle',
                '2030-12-09', '2030-12-08', 'DAILY', 200);
        RAISE EXCEPTION 'FAILED: reversed dates were accepted';
    EXCEPTION WHEN check_violation OR data_exception THEN
        RAISE NOTICE 'PASS: reversed dates are rejected';
    END;
    BEGIN
        INSERT INTO rentals (id, customer_id, vehicle_id, start_date, end_date, plan_type, rate)
        VALUES ('__rutarent_bad_customer', '__rutarent_missing_customer', '__rutarent_check_vehicle',
                '2030-12-10', '2030-12-12', 'DAILY', 200);
        RAISE EXCEPTION 'FAILED: missing customer was accepted';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'PASS: unknown customers are rejected';
    END;
    BEGIN
        UPDATE rentals SET rate = -100 WHERE id = '__rutarent_check_1';
        RAISE EXCEPTION 'FAILED: negative rate was accepted';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'PASS: negative rates are rejected';
    END;
    BEGIN
        UPDATE rentals SET rate = 'NaN'::numeric WHERE id = '__rutarent_check_1';
        RAISE EXCEPTION 'FAILED: NaN rate was accepted';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'PASS: NaN rates are rejected';
    END;
    BEGIN
        UPDATE rentals SET status = 'INVALID' WHERE id = '__rutarent_check_1';
        RAISE EXCEPTION 'FAILED: invalid status was accepted';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'PASS: unknown states are rejected';
    END;
    BEGIN
        UPDATE rentals SET status = 'CLOSED' WHERE id = '__rutarent_check_1';
        RAISE EXCEPTION 'FAILED: incomplete return was accepted';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'PASS: closed rentals require return date and final amount';
    END;
    BEGIN
        CREATE TABLE rutarent.__rutarent_forbidden_table (id integer);
        RAISE EXCEPTION 'FAILED: app role could create tables';
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'PASS: app role cannot create tables';
    END;
END
$checks$;

INSERT INTO rentals (id, customer_id, vehicle_id, start_date, end_date, plan_type, rate)
VALUES ('__rutarent_adjacent', '__rutarent_check_customer', '__rutarent_check_vehicle',
        '2030-12-06', '2030-12-08', 'WEEKLY', 1200),
       ('__rutarent_other_vehicle', '__rutarent_check_customer', '__rutarent_check_vehicle_2',
        '2030-12-03', '2030-12-06', 'DAILY', 180);

UPDATE rentals SET status = 'ACTIVE' WHERE id = '__rutarent_check_1';
UPDATE rentals SET status = 'CLOSED', return_date = '2030-12-06', final_amount = 600
WHERE id = '__rutarent_check_1';

DO $passed$
BEGIN
    IF (SELECT count(*) FROM rentals WHERE id IN ('__rutarent_check_1', '__rutarent_adjacent', '__rutarent_other_vehicle')) <> 3 THEN
        RAISE EXCEPTION 'FAILED: accepted reservations are missing';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rentals WHERE id = '__rutarent_check_1' AND status = 'CLOSED' AND final_amount = 600) THEN
        RAISE EXCEPTION 'FAILED: valid return was not saved';
    END IF;
    RAISE NOTICE 'PASS: adjacent dates and different vehicles are accepted';
    RAISE NOTICE 'PASS: valid delivery and return can be persisted';
END
$passed$;
ROLLBACK;
