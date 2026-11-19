# PostgreSQL para RutaRent

Preparaci�n de la base relacional, separada de las clases Java y del frontend. Estos archivos se elaboraron con asistencia de IA. El servidor, las tablas y sus comprobaciones se crean al ejecutar el instalador en Ubuntu.

**Estado de esta entrega.** Se verific� la correspondencia con las clases Java existentes. La instalaci�n y las comprobaciones SQL en Ubuntu siguen pendientes de ejecuci�n, porque esta sesi�n recibi� `Wsl/E_ACCESSDENIED` y su pol�tica de permisos rechaz� el acceso ampliado. PostgreSQL 16.14 est� instalado en Windows y responde en el puerto 5432 solicitando autenticaci�n. El instalador de abajo prepara la instancia de Ubuntu que usar� tu backend en WSL.

## Instalar y crear la base desde Ubuntu/WSL

Desde la carpeta `proyecto-final-poo`, ejecutar:

```bash
bash database/install-ubuntu.sh --with-demo-data
```

El script pide la contrase�a de sudo directamente en tu terminal, instala los paquetes oficiales de Ubuntu, inicia el primer cluster que muestra `pg_lsclusters`, crea la base `rutarent`, crea los roles y tablas, agrega clientes/veh�culos ficticios y ejecuta comprobaciones. Para una base inicialmente vac�a, omitir `--with-demo-data`.

La ejecuci�n puede repetirse. Conserva los registros y la contrase�a existentes y agrega los objetos que falten. Si encuentra una base hom�nima de otro propietario o un usuario ya existente sin su configuraci�n privada, se detiene para que revises la instalaci�n. Una migraci�n futura de tablas existentes necesitar� su propio SQL.

## Qu� se guarda

| Tabla | Correspondencia con tu Java |
|---|---|
| `rutarent.customers` | Identificador y nombre de `Customer` |
| `rutarent.vehicles` | Identificador de `Vehicule`. Nombre y placa son datos opcionales para presentar el veh�culo |
| `rutarent.rentals` | Cliente, veh�culo, fechas, plan, tarifa contratada y estado de `Rental` |

`RentalPeriod` se representa con `start_date` y `end_date` dentro del alquiler. Los planes se representan por `plan_type` (`DAILY` o `WEEKLY`) y `rate`, la tarifa acordada para ese alquiler. Al leerlo, el repositorio podr� reconstruir el objeto de plan correspondiente.

El identificador del alquiler se genera como `R-1001`, `R-1002`, etc. El estado inicial es `RESERVED`. `ACTIVE` y `CLOSED` coinciden con tu enum. Una devoluci�n cerrada guarda `return_date` y `final_amount`. El c�lculo del precio, las transiciones y sus mensajes se implementar�n y estudiar�n en Java.

La base rechaza fechas invertidas o iguales, referencias a clientes/veh�culos inexistentes, tarifas inv�lidas, estados desconocidos y cierres incompletos. Una restricci�n de exclusi�n evita reservas superpuestas del mismo veh�culo para alquileres `RESERVED` o `ACTIVE`, incluso ante transacciones simult�neas. Usa la extensi�n oficial `btree_gist`.

El extremo final del intervalo se excluye. Un alquiler del 3 al 6 y otro del 6 al 8 pueden coexistir. Esto corresponde al c�lculo de tres d�as con `ChronoUnit.DAYS.between`. Es la misma decisi�n provisional del frontend. La ocupaci�n real de un auto que no vuelve a tiempo deber� coordinarse en el servicio Java.

## Conexi�n futura con Java

El instalador deja la configuraci�n en `~/.config/rutarent/database.env`, con permisos de lectura/escritura para tu usuario. El archivo queda fuera del repositorio y contiene `DB_URL`, `DB_USER`, `DB_PASSWORD` y `DB_PORT`. La contrase�a se genera localmente y se conserva al reejecutar.

```bash
source ~/.config/rutarent/database.env
```

Ese comando carga las variables en la terminal desde la que iniciar�s Java. La URL ser� `jdbc:postgresql://localhost:5432/rutarent?currentSchema=rutarent` cuando el cluster use el puerto 5432. El instalador informa el puerto real. El driver JDBC queda en `/usr/share/java/postgresql.jar`.

El usuario de la aplicaci�n, `rutarent_app`, puede consultar, insertar y actualizar filas, y usar la secuencia de identificadores. `rutarent_owner` es un rol sin inicio de sesi�n que posee los objetos. El acceso de administraci�n se usa solo para preparar la base.

## Consultar desde Ubuntu

```bash
source ~/.config/rutarent/database.env
psql -h 127.0.0.1 -p "$DB_PORT" -U "$DB_USER" -d rutarent -W
```

`-W` pide la contrase�a en la terminal. Puedes abrir la configuraci�n privada localmente para consultarla, sin pegarla en chats ni subirla a GitHub. Dentro de psql, `\dt rutarent.*` muestra las tablas y `SELECT * FROM rutarent.customers;` muestra los clientes. `\q` sale.

## Verificar

```bash
source ~/.config/rutarent/database.env
sudo -u postgres psql -p "$DB_PORT" -d rutarent -v ON_ERROR_STOP=1 -f database/verify.sql
```

Las comprobaciones prueban las restricciones y permisos en una transacci�n que termina en `ROLLBACK`. Sus filas temporales no permanecen. La integraci�n HTTP/JDBC y las operaciones Java todav�a deben conectarse a esta base.

Referencias oficiales: [instalaci�n en Ubuntu](https://documentation.ubuntu.com/server/how-to/databases/install-postgresql/), [restricciones de PostgreSQL](https://www.postgresql.org/docs/current/ddl-constraints.html) y [rangos y reservas](https://www.postgresql.org/docs/current/rangetypes.html).
