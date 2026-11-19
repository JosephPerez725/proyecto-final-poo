#!/usr/bin/env bash
# Ubuntu/WSL setup for RutaRent. Run with bash as your regular Ubuntu user.
set +x
set -Eeuo pipefail
umask 077
trap 'printf "\nSetup stopped at line %s. The error is above. You can retry the same command.\n" "$LINENO" >&2' ERR

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
with_demo=false
if [[ "${1:-}" == '--with-demo-data' ]]; then
    with_demo=true
elif [[ $# -gt 0 ]]; then
    printf 'Usage: bash database/install-ubuntu.sh [--with-demo-data]\n' >&2
    exit 1
fi
if [[ $EUID -eq 0 ]]; then
    printf 'Run as your regular Ubuntu user. The script uses sudo when needed.\n' >&2
    exit 1
fi
for file in bootstrap.sql schema.sql seed.sql verify.sql; do
    [[ -f "$script_dir/$file" ]] || { printf 'Missing file: %s\n' "$file" >&2; exit 1; }
done
command -v apt-get >/dev/null || { printf 'This installer is for Ubuntu.\n' >&2; exit 1; }

printf 'Installing PostgreSQL and its Java JDBC driver in Ubuntu...\n'
sudo -v
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib libpostgresql-jdbc-java

read -r pg_version pg_cluster pg_port pg_status remaining < <(pg_lsclusters --no-header | head -n 1)
if [[ -z "${pg_version:-}" || -z "${pg_port:-}" ]]; then
    printf 'No PostgreSQL cluster found. Review pg_lsclusters before continuing.\n' >&2
    exit 1
fi
if [[ "$pg_status" != 'online' ]]; then
    sudo pg_ctlcluster "$pg_version" "$pg_cluster" start
fi
admin=(sudo -u postgres psql -X -q -v ON_ERROR_STOP=1 -p "$pg_port")

config_dir="$HOME/.config/rutarent"
config_file="$config_dir/database.env"
mkdir -p -- "$config_dir"
chmod 700 "$config_dir"
exec 9>"$config_dir/setup.lock"
flock -n 9 || { printf 'Another RutaRent setup is already running.\n' >&2; exit 1; }
app_exists="$("${admin[@]}" -d postgres -tAc "SELECT count(*) FROM pg_roles WHERE rolname = 'rutarent_app'")"

if [[ -e "$config_file" ]]; then
    if [[ -L "$config_file" || ! -O "$config_file" ]]; then
        printf 'The connection file must be owned by your user and be a regular file.\n' >&2
        exit 1
    fi
    db_password="$(sed -n "s/^export DB_PASSWORD='\([0-9a-f]*\)'$/\1/p" "$config_file")"
    if [[ ! "$db_password" =~ ^[0-9a-f]{48}$ ]]; then
        printf 'Existing connection configuration has an unexpected format. Review it locally.\n' >&2
        exit 1
    fi
    if ! grep -Fqx "export DB_URL='jdbc:postgresql://localhost:$pg_port/rutarent?currentSchema=rutarent'" "$config_file"; then
        printf 'Existing connection configuration uses a different port or database. Review it locally.\n' >&2
        exit 1
    fi
    chmod 600 "$config_file"
else
    if [[ "$app_exists" != '0' ]]; then
        printf 'rutarent_app already exists but this user has no connection configuration. Existing credentials will be preserved.\n' >&2
        exit 1
    fi
    db_password="$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')"
    temp_config="$(mktemp "$config_dir/database.env.XXXXXX")"
    printf "export DB_URL='jdbc:postgresql://localhost:%s/rutarent?currentSchema=rutarent'\nexport DB_USER='rutarent_app'\nexport DB_PASSWORD='%s'\nexport DB_PORT='%s'\n" "$pg_port" "$db_password" "$pg_port" > "$temp_config"
    chmod 600 "$temp_config"
    mv -- "$temp_config" "$config_file"
fi

# The random password is passed only over stdin to psql.
{
    printf '\\set app_password %s\n' "$db_password"
    cat -- "$script_dir/bootstrap.sql"
} | "${admin[@]}" -d postgres

"${admin[@]}" -d rutarent < "$script_dir/schema.sql"
if [[ "$with_demo" == true ]]; then
    "${admin[@]}" -d rutarent < "$script_dir/seed.sql"
fi
"${admin[@]}" -d rutarent < "$script_dir/verify.sql"

PGPASSWORD="$db_password" PGCONNECT_TIMEOUT=5 psql -X -w -h 127.0.0.1 -p "$pg_port" -U rutarent_app -d rutarent \
    -v ON_ERROR_STOP=1 -c 'SELECT current_database(), current_user;' \
    -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'rutarent' ORDER BY table_name;"
unset db_password

printf '\nRutaRent database ready in Ubuntu.\n'
printf 'JDBC URL: jdbc:postgresql://localhost:%s/rutarent?currentSchema=rutarent\n' "$pg_port"
printf 'Private connection configuration: %s\n' "$config_file"
printf 'Load it for a future Java process with: source ~/.config/rutarent/database.env\n'
printf 'JDBC driver: /usr/share/java/postgresql.jar\n'
