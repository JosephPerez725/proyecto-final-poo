# Frontend de RutaRent

Interfaz para el encargado de la agencia. HTML, CSS y JavaScript sin framework ni compilaci�n. Construido con asistencia de IA a pedido de Joseph. Es una primera versi�n del frontend para estudiar y adaptar durante la integraci�n con Java.

## Abrir desde Ubuntu en VS Code

Desde la ra�z de `proyecto-final-poo`, ejecuta `python3 -m http.server 5500 --directory frontend` y abre http://localhost:5500. Mant�n esa terminal abierta. Ctrl+C detiene el servidor.

Tambi�n se puede abrir `index.html` directamente para recorrer los ejemplos. Para conectar la API usa el servidor HTTP, con el origen del frontend autorizado por el backend si est�n en puertos distintos. El puerto o la URL de Java dependen del servidor que construyas.

## Estado real

La vista de prueba arranca con personas y veh�culos ficticios. Permite crear una reserva, simular la entrega y registrar la devoluci�n. Al recargar, se reinician los datos. El banner identifica este modo en todo momento. El formulario comprueba fechas y muestra una estimaci�n. En producci�n Java debe validar las reglas, controlar los estados y calcular el importe definitivo.

La API y PostgreSQL todav�a necesitan implementarse en Java. Pulsa �Datos de ejemplo � Cambiar� para ingresar la URL de una API que cumpla el contrato propuesto de abajo. Una conexi�n fallida muestra el error y conserva el modo anterior. No se incluyen credenciales de base de datos en el frontend.

`data.js` separa la lectura/escritura de datos de los eventos y la presentaci�n en `app.js`. Esta separaci�n permite sustituir el ejemplo por peticiones HTTP. Las reglas del ejemplo sirven para recorrer la interfaz mientras se desarrolla Java.

## Decisiones provisionales para revisar juntos

- Se usan los estados que Joseph escribi� en `RentalStatus`: `RESERVED`, `ACTIVE`, `CLOSED`.
- El plan diario multiplica tarifa por d�as. El semanal cobra `ceil(days / 7) * rate`, como el `WeeklyPlan` local revisado el 19 de noviembre. Ocho d�as equivalen a dos semanas facturadas.
- Los d�as se calculan entre retiro y devoluci�n con fecha final exclusiva, coherente con `ChronoUnit.DAYS.between`. El mismo auto puede reservarse desde el d�a en que termina otra reserva.
- La tarifa la indica el encargado al reservar. Modelo y placa de los veh�culos son detalles opcionales de presentaci�n; el identificador s� es obligatorio, como en `Vehicule`.
- La devoluci�n real usa d�as transcurridos y solo permite una fecha posterior al inicio, hasta hoy. La forma definitiva de cobrar devoluciones tempranas, retrasos y reservas activas vencidas debe acordarse antes de implementar el cierre en Java.
- El frontend muestra clientes y veh�culos ya registrados. La alta de inventario y de clientes no forma parte de esta primera entrega.

## Contrato HTTP propuesto

El contrato siguiente todav�a debe acordarse e implementarse en Java. No se infieren endpoints de las clases Java. La URL base se ingresa en pantalla, por ejemplo `http://localhost:8080/api`. El frontend agrega las rutas siguientes.

| M�todo | Ruta | Contenido o respuesta |
|---|---|---|
| GET | `/customers` | Lista de clientes |
| GET | `/vehicles` | Lista de veh�culos |
| GET | `/rentals` | Lista de alquileres |
| POST | `/rentals` | Crea una reserva con el cuerpo de abajo |
| POST | `/rentals/{id}/deliver` | Entrega un alquiler reservado. Cuerpo `{}` |
| POST | `/rentals/{id}/return` | Devuelve un alquiler activo. Cuerpo `{"returnDate":"2026-12-06"}` |

Ejemplo de las respuestas GET. Los tres endpoints devuelven listas JSON, cada uno con el tipo correspondiente.

```json
{
  "customer": { "id": "C01", "name": "Ana P�rez" },
  "vehicle": { "id": "V01", "name": "Toyota Corolla", "plate": "4321 ABC" },
  "rental": {
    "id": "R-1001", "customerId": "C01", "vehicleId": "V01",
    "startDate": "2026-12-03", "endDate": "2026-12-06",
    "plan": "DAILY", "rate": 200, "status": "RESERVED",
    "amount": 600, "returnDate": null
  }
}
```

Cuerpo para crear la reserva.

```json
{
  "customerId": "C01", "vehicleId": "V01",
  "startDate": "2026-12-03", "endDate": "2026-12-06",
  "plan": "DAILY", "rate": 200
}
```

`DAILY` y `WEEKLY` son los valores admitidos. Los importes y tarifas son n�meros JSON. El backend persiste los identificadores, fechas, tarifa y plan contratados. Las operaciones POST pueden devolver el alquiler actualizado o una respuesta vac�a exitosa. Despu�s de cada operaci�n el frontend vuelve a consultar los registros para mostrar el estado y el importe de Java.

Un error usa un estado HTTP de error y `{"message":"El veh�culo ya est� reservado en esas fechas."}`. El backend debe validar los datos incluso si el formulario ya los valid�. La consulta de disponibilidad y la creaci�n de la reserva deben protegerse conjuntamente frente a solicitudes simult�neas. Ante una interrupci�n de red, actualiza la lista antes de repetir una operaci�n que pudo haberse registrado.

## Accesibilidad y comprobaciones

El formulario tiene etiquetas, validaci�n nativa, errores de texto, foco visible y di�logos nativos que permiten salir con Escape cuando no hay una operaci�n en curso. Los filtros comunican su estado y las confirmaciones se anuncian con `role="status"`. El dise�o adapta la navegaci�n y las tarjetas a pantallas peque�as. La tabla conserva desplazamiento horizontal.

Prueba reservar con fechas invertidas, volver a reservar el mismo auto en fechas superpuestas, cambiar de filtro y buscar un cliente que no existe. Recorre reserva, entrega y devoluci�n, y verifica que un alquiler cerrado no ofrezca otra devoluci�n. En el plan semanal prueba siete y ocho d�as. Conecta despu�s una API y comprueba que los importes mostrados provengan de Java.
