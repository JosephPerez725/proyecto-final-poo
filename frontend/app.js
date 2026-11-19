(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const data = window.RutaRentData;
  const money = new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', maximumFractionDigits: 2 });
  const statusNames = { RESERVED: 'Reservado', ACTIVE: 'Activo', CLOSED: 'Cerrado' };
  let client = data.createDemoClient();
  let records = { customers: [], vehicles: [], rentals: [] };
  let statusFilter = 'ALL';
  let pendingAction = null;
  let busy = false;
  let toastTimer;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  }

  function displayDate(value) {
    return new Date(value + 'T12:00:00Z').toLocaleDateString('es-BO', { day: '2-digit', month: 'short', timeZone: 'UTC' });
  }

  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  }

  function showError(id, message = '') {
    byId(id).textContent = message;
    byId(id).hidden = !message;
  }

  function toast(message) {
    clearTimeout(toastTimer);
    byId('toast').textContent = message;
    byId('toast').hidden = false;
    toastTimer = setTimeout(() => { byId('toast').hidden = true; }, 5000);
  }

  function setBusy(value) {
    busy = value;
    document.querySelectorAll('#save-reservation, #confirm-action, #connect-api, #use-demo, #refresh, #new-rental, [data-action]').forEach(button => { button.disabled = value; });
    document.querySelectorAll('[data-close]').forEach(button => { button.disabled = value; });
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.setAttribute('aria-busy', String(value)));
  }

  function updateMode() {
    const demo = client.mode === 'demo';
    byId('connection-button').textContent = demo ? 'Datos de ejemplo � Cambiar' : 'API conectada � Cambiar';
    byId('mode-banner').textContent = demo
      ? 'Vista de prueba. Las acciones usan datos de ejemplo que se reinician al recargar.'
      : 'API conectada. Las operaciones se env�an al backend Java.';
    byId('mode-banner').style.background = demo ? '' : '#e4f5ef';
    byId('mode-banner').style.color = demo ? '' : '#246546';
    byId('save-reservation').textContent = demo ? 'Crear reserva de prueba' : 'Crear reserva';
  }

  function renderRentals() {
    const query = byId('search').value.trim().toLocaleLowerCase('es');
    const list = records.rentals.filter(rental => {
      const customer = records.customers.find(item => item.id === rental.customerId);
      const vehicle = records.vehicles.find(item => item.id === rental.vehicleId);
      const text = [rental.id, customer?.name, vehicle?.name, vehicle?.plate, vehicle?.id].join(' ').toLocaleLowerCase('es');
      return (statusFilter === 'ALL' || rental.status === statusFilter) && text.includes(query);
    });
    byId('rental-rows').innerHTML = list.map(rental => {
      const customer = records.customers.find(item => item.id === rental.customerId);
      const vehicle = records.vehicles.find(item => item.id === rental.vehicleId);
      const late = rental.status === 'ACTIVE' && rental.endDate < data.today();
      const action = rental.status === 'RESERVED' ? 'deliver' : 'close';
      const actionLabel = action === 'deliver' ? 'Entregar' : 'Devolver';
      const button = rental.status === 'CLOSED' ? '<span class="muted">Finalizado</span>'
        : '<button type="button" class="row-action" data-action="' + action + '" data-id="' + escapeHtml(rental.id) + '" aria-label="' + actionLabel + ' ' + escapeHtml(rental.id) + '">' + actionLabel + '</button>';
      return '<tr><td><div class="customer-cell"><span class="avatar" aria-hidden="true">' + escapeHtml(initials(customer.name)) + '</span><span><strong>' + escapeHtml(customer.name) + '</strong><small>' + escapeHtml(rental.id) + '</small></span></div></td>'
        + '<td><strong>' + escapeHtml(vehicle.name || vehicle.id) + '</strong><small>' + escapeHtml(vehicle.id + (vehicle.plate ? ' � ' + vehicle.plate : '')) + '</small></td>'
        + '<td>' + displayDate(rental.startDate) + ' - ' + displayDate(rental.returnDate || rental.endDate) + '<small class="' + (late ? 'late' : '') + '">' + (late ? 'Devoluci�n pendiente' : data.daysBetween(rental.startDate, rental.returnDate || rental.endDate) + ' d�as') + '</small></td>'
        + '<td>' + (rental.plan === 'WEEKLY' ? 'Semanal' : 'Diario') + '</td><td><span class="status status-' + rental.status + '">' + statusNames[rental.status] + '</span></td>'
        + '<td class="numeric"><strong>' + money.format(rental.amount) + '</strong><small>' + (rental.status === 'CLOSED' ? 'Importe final' : 'Importe previsto') + '</small></td><td>' + button + '</td></tr>';
    }).join('');
    byId('result-count').textContent = list.length + ' de ' + records.rentals.length + ' alquileres';
    byId('empty-state').hidden = list.length > 0;
  }

  function render() {
    const rentals = records.rentals;
    const currentDate = data.today();
    byId('active-count').textContent = rentals.filter(item => item.status === 'ACTIVE').length;
    byId('reserved-count').textContent = rentals.filter(item => item.status === 'RESERVED').length;
    byId('closed-count').textContent = rentals.filter(item => item.status === 'CLOSED').length;
    byId('due-count').textContent = rentals.filter(item => item.status === 'ACTIVE' && item.endDate === currentDate).length;
    byId('overdue-count').textContent = rentals.filter(item => item.status === 'ACTIVE' && item.endDate < currentDate).length + ' fuera de plazo';
    renderRentals();
    byId('vehicle-cards').innerHTML = records.vehicles.map(vehicle => {
      const count = rentals.filter(item => item.vehicleId === vehicle.id && item.status !== 'CLOSED').length;
      return '<article class="directory-card"><div class="vehicle-symbol" aria-hidden="true">?</div><h2>' + escapeHtml(vehicle.name || vehicle.id) + '</h2><p>' + escapeHtml(vehicle.id + (vehicle.plate ? ' � Placa ' + vehicle.plate : '')) + '</p><p>' + count + ' alquileres pendientes o activos</p><button type="button" class="button secondary" data-book-vehicle="' + escapeHtml(vehicle.id) + '">Reservar este veh�culo</button></article>';
    }).join('') || '<p>No hay veh�culos registrados en la API.</p>';
    byId('customer-rows').innerHTML = records.customers.map(customer => '<tr><td><strong>' + escapeHtml(customer.name) + '</strong></td><td>' + escapeHtml(customer.id) + '</td><td>' + rentals.filter(item => item.customerId === customer.id).length + '</td></tr>').join('') || '<tr><td colspan="3">No hay clientes registrados en la API.</td></tr>';
  }

  async function reload() {
    records = await client.load();
    render();
  }

  function resetFilters() {
    byId('search').value = '';
    statusFilter = 'ALL';
    document.querySelectorAll('[data-status]').forEach(button => {
      const selected = button.dataset.status === 'ALL';
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function renderEstimate() {
    const form = byId('reservation-form');
    const start = byId('start-date').value;
    const end = byId('end-date').value;
    byId('rate-label').textContent = form.elements.plan.value === 'WEEKLY' ? 'Tarifa semanal (Bs)' : 'Tarifa diaria (Bs)';
    byId('end-date').setCustomValidity('');
    byId('end-date').removeAttribute('aria-invalid');
    byId('date-error').hidden = true;
    byId('period-summary').textContent = 'Selecciona las fechas';
    byId('amount-summary').textContent = '-';
    if (!start || !end) return;
    try {
      const days = data.daysBetween(start, end);
      byId('period-summary').textContent = days + ' d�as de alquiler';
      const amount = data.estimateAmount(form.elements.plan.value, Number(byId('rate').value), days);
      byId('amount-summary').textContent = money.format(amount);
    } catch (error) {
      if (end <= start) {
        byId('end-date').setCustomValidity(error.message);
        byId('end-date').setAttribute('aria-invalid', 'true');
        byId('date-error').textContent = error.message;
        byId('date-error').hidden = false;
      }
    }
  }

  function openReservation(vehicleId = '') {
    if (busy) return;
    const form = byId('reservation-form');
    form.reset();
    byId('customer').innerHTML = '<option value="">Seleccionar cliente</option>' + records.customers.map(item => '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.name + ' � ' + item.id) + '</option>').join('');
    byId('vehicle').innerHTML = '<option value="">Seleccionar veh�culo</option>' + records.vehicles.map(item => '<option value="' + escapeHtml(item.id) + '">' + escapeHtml((item.name || item.id) + ' � ' + item.id) + '</option>').join('');
    byId('vehicle').value = vehicleId;
    byId('start-date').value = data.today();
    byId('end-date').value = data.offsetDate(data.today(), 3);
    showError('reservation-error');
    renderEstimate();
    byId('reservation-dialog').showModal();
    byId('customer').focus();
  }

  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    const view = button.dataset.view;
    document.querySelectorAll('[data-view]').forEach(item => {
      item.classList.toggle('selected', item === button);
      if (item === button) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current');
    });
    byId('rental-view').hidden = view !== 'rentals';
    byId('vehicle-view').hidden = view !== 'vehicles';
    byId('customer-view').hidden = view !== 'customers';
    const names = { rentals: 'Control de alquileres', vehicles: 'Veh�culos', customers: 'Clientes' };
    byId('page-title').textContent = names[view];
    byId('breadcrumb').textContent = 'Operaciones / ' + button.textContent.trim().replace(/^[^\p{L}]+/u, '');
    document.title = 'RutaRent � ' + names[view];
  }));

  document.querySelectorAll('[data-status]').forEach(button => button.addEventListener('click', () => {
    statusFilter = button.dataset.status;
    document.querySelectorAll('[data-status]').forEach(item => {
      item.classList.toggle('selected', item === button);
      item.setAttribute('aria-pressed', String(item === button));
    });
    renderRentals();
  }));

  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => { if (!busy) byId(button.dataset.close).close(); }));
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); }));
  byId('search').addEventListener('input', renderRentals);
  byId('clear-filters').addEventListener('click', () => { resetFilters(); renderRentals(); });
  byId('new-rental').addEventListener('click', () => openReservation());
  byId('vehicle-cards').addEventListener('click', event => {
    const button = event.target.closest('[data-book-vehicle]');
    if (button) openReservation(button.dataset.bookVehicle);
  });
  byId('reservation-form').addEventListener('input', renderEstimate);

  byId('reservation-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !event.target.reportValidity()) return;
    setBusy(true);
    showError('reservation-error');
    let saved = false;
    try {
      const form = new FormData(event.target);
      await client.reserve({ customerId: form.get('customerId'), vehicleId: form.get('vehicleId'), startDate: form.get('startDate'), endDate: form.get('endDate'), plan: form.get('plan'), rate: Number(form.get('rate')) });
      saved = true;
      byId('reservation-dialog').close();
      resetFilters();
      await reload();
      showError('page-error');
      toast(client.mode === 'demo' ? 'Reserva creada en la vista de prueba.' : 'Reserva registrada por Java.');
    } catch (error) {
      showError(saved ? 'page-error' : 'reservation-error', (saved ? 'La reserva se cre�, pero no se pudo actualizar la lista. Pulsa Actualizar datos. ' : '') + error.message);
    } finally { setBusy(false); }
  });

  byId('rental-rows').addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button || busy) return;
    const rental = records.rentals.find(item => item.id === button.dataset.id);
    if (!rental) return;
    pendingAction = { id: rental.id, action: button.dataset.action };
    const returning = pendingAction.action === 'close';
    const vehicle = records.vehicles.find(item => item.id === rental.vehicleId);
    byId('action-title').textContent = returning ? 'Registrar devoluci�n' : 'Entregar veh�culo';
    byId('action-description').textContent = rental.id + ' � ' + (vehicle.name || vehicle.id) + '. ' + (returning ? 'Se cerrar� el alquiler y se registrar� el importe final.' : 'El alquiler pasar� de reservado a activo.');
    byId('return-date-field').hidden = !returning;
    byId('return-note').hidden = !returning;
    byId('return-date').required = returning;
    byId('return-date').min = data.offsetDate(rental.startDate, 1);
    byId('return-date').value = data.today();
    byId('return-date').max = data.today();
    byId('confirm-action').textContent = returning ? 'Confirmar devoluci�n' : 'Confirmar entrega';
    showError('action-error');
    byId('action-dialog').showModal();
  });

  byId('action-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !pendingAction || !event.target.reportValidity()) return;
    setBusy(true);
    showError('action-error');
    let saved = false;
    try {
      if (pendingAction.action === 'deliver') await client.deliver(pendingAction.id);
      else await client.close(pendingAction.id, byId('return-date').value);
      saved = true;
      byId('action-dialog').close();
      await reload();
      showError('page-error');
      toast(client.mode === 'demo' ? 'Operaci�n realizada en la vista de prueba.' : 'Operaci�n registrada por Java.');
    } catch (error) {
      showError(saved ? 'page-error' : 'action-error', (saved ? 'La operaci�n se registr�, pero no se pudo actualizar la lista. Pulsa Actualizar datos. ' : '') + error.message);
    } finally { pendingAction = saved ? null : pendingAction; setBusy(false); }
  });

  byId('refresh').addEventListener('click', async () => {
    if (busy) return;
    setBusy(true);
    try { await reload(); showError('page-error'); toast('Datos actualizados.'); }
    catch (error) { showError('page-error', error.message); }
    finally { setBusy(false); }
  });

  byId('connection-button').addEventListener('click', () => {
    if (busy) return;
    showError('connection-error');
    byId('connection-dialog').showModal();
  });

  async function switchClient(nextClient) {
    if (busy) return;
    setBusy(true);
    showError('connection-error');
    try {
      const nextRecords = await nextClient.load();
      client = nextClient;
      records = nextRecords;
      resetFilters();
      updateMode();
      render();
      showError('page-error');
      byId('connection-dialog').close();
      toast(client.mode === 'demo' ? 'Vista de prueba cargada.' : 'Conexi�n con la API establecida.');
    } catch (error) { showError('connection-error', error.message); }
    finally { setBusy(false); }
  }

  byId('connection-form').addEventListener('submit', event => {
    event.preventDefault();
    try { switchClient(data.createApiClient(byId('api-url').value)); }
    catch (error) { showError('connection-error', error.message); }
  });
  byId('use-demo').addEventListener('click', () => switchClient(data.createDemoClient()));
  byId('page-date').textContent = new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  updateMode();
  setBusy(true);
  reload().catch(error => showError('page-error', error.message)).finally(() => setBusy(false));
}());
