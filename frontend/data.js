/* UI data access. The preview adapter is temporary; Java owns production rules. */
(function () {
  'use strict';

  const DAY_MS = 86400000;

  function dateNumber(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) {
      throw new Error('Selecciona una fecha v�lida.');
    }
    const date = new Date(value + 'T00:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new Error('Selecciona una fecha v�lida.');
    }
    return date.getTime();
  }

  function daysBetween(start, end) {
    const days = (dateNumber(end) - dateNumber(start)) / DAY_MS;
    if (days <= 0) throw new Error('La devoluci�n debe ser posterior al retiro.');
    return days;
  }

  function estimateAmount(plan, rate, days) {
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('La tarifa debe ser mayor a cero.');
    if (!Number.isInteger(days) || days <= 0) throw new Error('La duraci�n debe ser mayor a cero.');
    if (!['DAILY', 'WEEKLY'].includes(plan)) throw new Error('Selecciona un plan v�lido.');
    const amount = (plan === 'WEEKLY' ? Math.ceil(days / 7) : days) * rate;
    if (!Number.isFinite(amount)) throw new Error('El importe supera el valor permitido.');
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  function today() {
    const date = new Date();
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }

  function offsetDate(value, days) {
    return new Date(dateNumber(value) + days * DAY_MS).toISOString().slice(0, 10);
  }

  function createDemoClient() {
    const base = today();
    const customers = [
      { id: 'C01', name: 'Ana P�rez' }, { id: 'C02', name: 'Luis Rojas' },
      { id: 'C03', name: 'Camila Su�rez' }, { id: 'C04', name: 'Diego Vargas' },
      { id: 'C05', name: 'Valeria M�ndez' }, { id: 'C06', name: 'Mateo Flores' }
    ];
    const vehicles = [
      { id: 'V01', name: 'Toyota Corolla', plate: '4321 ABC' },
      { id: 'V02', name: 'Suzuki Swift', plate: '5812 XYZ' },
      { id: 'V03', name: 'Kia Sportage', plate: '6734 DEF' },
      { id: 'V04', name: 'Hyundai Accent', plate: '2486 GHI' },
      { id: 'V05', name: 'Renault Duster', plate: '9135 JKL' },
      { id: 'V06', name: 'Nissan Versa', plate: '3507 MNO' }
    ];
    const examples = [
      ['R-1006', 'C01', 'V01', 1, 4, 'DAILY', 200, 'RESERVED'],
      ['R-1005', 'C02', 'V02', -3, 0, 'DAILY', 180, 'ACTIVE'],
      ['R-1004', 'C03', 'V03', -2, 6, 'WEEKLY', 1200, 'ACTIVE'],
      ['R-1003', 'C04', 'V04', 2, 9, 'WEEKLY', 1000, 'RESERVED'],
      ['R-1002', 'C05', 'V05', -6, -1, 'DAILY', 250, 'ACTIVE'],
      ['R-1001', 'C06', 'V06', -10, -7, 'DAILY', 170, 'CLOSED']
    ];
    const rentals = examples.map(([id, customerId, vehicleId, start, end, plan, rate, status]) => {
      const startDate = offsetDate(base, start);
      const endDate = offsetDate(base, end);
      return { id, customerId, vehicleId, startDate, endDate, plan, rate, status,
        amount: estimateAmount(plan, rate, daysBetween(startDate, endDate)),
        returnDate: status === 'CLOSED' ? endDate : null };
    });
    let nextId = 1007;

    function findRental(id) {
      const rental = rentals.find(item => item.id === id);
      if (!rental) throw new Error('No se encontr� el alquiler. Actualiza los datos.');
      return rental;
    }

    return {
      mode: 'demo',
      async load() {
        return { customers: structuredClone(customers), vehicles: structuredClone(vehicles), rentals: structuredClone(rentals) };
      },
      async reserve(input) {
        if (!customers.some(customer => customer.id === input.customerId)) throw new Error('Selecciona un cliente.');
        if (!vehicles.some(vehicle => vehicle.id === input.vehicleId)) throw new Error('Selecciona un veh�culo.');
        const days = daysBetween(input.startDate, input.endDate);
        const amount = estimateAmount(input.plan, input.rate, days);
        const collision = rentals.some(rental => rental.vehicleId === input.vehicleId && rental.status !== 'CLOSED'
          && input.startDate < rental.endDate && input.endDate > rental.startDate);
        if (collision) throw new Error('Este veh�culo ya tiene una reserva en ese per�odo. Prueba otro veh�culo u horario.');
        const rental = { ...input, id: 'R-' + nextId++, status: 'RESERVED', amount, returnDate: null };
        rentals.unshift(rental);
        return structuredClone(rental);
      },
      async deliver(id) {
        const rental = findRental(id);
        if (rental.status !== 'RESERVED') throw new Error('Solo se puede entregar un alquiler reservado.');
        rental.status = 'ACTIVE';
        return structuredClone(rental);
      },
      async close(id, returnDate) {
        const rental = findRental(id);
        if (rental.status !== 'ACTIVE') throw new Error('Solo se puede devolver un alquiler activo.');
        const amount = estimateAmount(rental.plan, rental.rate, daysBetween(rental.startDate, returnDate));
        rental.status = 'CLOSED';
        rental.returnDate = returnDate;
        rental.amount = amount;
        return structuredClone(rental);
      }
    };
  }

  function createApiClient(baseUrl) {
    const url = new URL(baseUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error('Usa una URL HTTP o HTTPS sin credenciales, consulta ni fragmento.');
    }
    const base = url.href.replace(/\/$/, '');

    async function request(path, method = 'GET', body) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(base + path, {
          method, signal: controller.signal, headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
          ...(body ? { body: JSON.stringify(body) } : {})
        });
        const text = await response.text();
        let data = null;
        if (text) {
          try { data = JSON.parse(text); }
          catch { throw new Error('La API no devolvi� JSON v�lido. Comprueba su URL y el contrato.'); }
        }
        if (!response.ok) throw new Error(data?.message || 'La operaci�n fue rechazada por la API (HTTP ' + response.status + ').');
        return data;
      } catch (error) {
        if (error.name === 'AbortError') throw new Error('La API tard� demasiado. Comprueba el estado antes de repetir la operaci�n.');
        if (error instanceof TypeError) throw new Error('No se pudo conectar con Java. Comprueba la URL, el servidor y su configuraci�n CORS.');
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }

    return {
      mode: 'api',
      async load() {
        const [customers, vehicles, rentals] = await Promise.all([request('/customers'), request('/vehicles'), request('/rentals')]);
        if (![customers, vehicles, rentals].every(Array.isArray)) throw new Error('La API debe devolver listas JSON para clientes, veh�culos y alquileres.');
        if (!customers.every(item => typeof item.id === 'string' && typeof item.name === 'string')
          || !vehicles.every(item => typeof item.id === 'string')
          || !rentals.every(item => typeof item.id === 'string' && typeof item.customerId === 'string' && typeof item.vehicleId === 'string'
            && ['RESERVED', 'ACTIVE', 'CLOSED'].includes(item.status) && ['DAILY', 'WEEKLY'].includes(item.plan)
            && typeof item.amount === 'number' && Number.isFinite(item.amount) && item.amount >= 0
            && typeof item.rate === 'number' && Number.isFinite(item.rate) && item.rate > 0)) {
          throw new Error('Los datos de la API no coinciden con el contrato de frontend/README.md.');
        }
        rentals.forEach(item => {
          daysBetween(item.startDate, item.endDate);
          if (!customers.some(customer => customer.id === item.customerId) || !vehicles.some(vehicle => vehicle.id === item.vehicleId)) {
            throw new Error('Hay un alquiler cuyo cliente o veh�culo no se encuentra en la API.');
          }
          if (item.status === 'CLOSED') daysBetween(item.startDate, item.returnDate);
        });
        return { customers, vehicles, rentals };
      },
      reserve: input => request('/rentals', 'POST', input),
      deliver: id => request('/rentals/' + encodeURIComponent(id) + '/deliver', 'POST', {}),
      close: (id, returnDate) => request('/rentals/' + encodeURIComponent(id) + '/return', 'POST', { returnDate })
    };
  }

  window.RutaRentData = { createDemoClient, createApiClient, daysBetween, estimateAmount, today, offsetDate };
}());
