\set ON_ERROR_STOP on
\set ECHO none

-- Run through the installer as the PostgreSQL administrator.
-- app_password is supplied on stdin, never committed or put in command arguments.
SELECT pg_advisory_lock(725113, 1);

SELECT 'CREATE ROLE rutarent_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rutarent_owner')
\gexec

SELECT format('CREATE ROLE rutarent_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rutarent_app')
\gexec

DO $roles$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname IN ('rutarent_owner', 'rutarent_app')
          AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)
    ) THEN
        RAISE EXCEPTION 'Existing RutaRent roles have administrative privileges. Review them before continuing.';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rutarent_owner' AND rolcanlogin)
       OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rutarent_app' AND NOT rolcanlogin) THEN
        RAISE EXCEPTION 'Existing RutaRent role login settings do not match this installation.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_database
        WHERE datname = 'rutarent' AND pg_get_userbyid(datdba) <> 'rutarent_owner'
    ) THEN
        RAISE EXCEPTION 'A rutarent database already exists with a different owner. Nothing will be replaced.';
    END IF;
END
$roles$;

SELECT 'CREATE DATABASE rutarent OWNER rutarent_owner ENCODING ''UTF8'''
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'rutarent')
\gexec

REVOKE ALL ON DATABASE rutarent FROM PUBLIC;
GRANT CONNECT ON DATABASE rutarent TO rutarent_app;
ALTER ROLE rutarent_app IN DATABASE rutarent SET search_path TO rutarent, public;
SELECT pg_advisory_unlock(725113, 1);
