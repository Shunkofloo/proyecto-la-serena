const SEMAFORO_LABEL = {
  VERDE: 'Día normal',
  AMARILLO: 'Alerta de gestión',
  ROJO: 'Crítico',
};

async function verificarSesion() {
  const respuesta = await fetch('/api/session', { credentials: 'include' });
  if (!respuesta.ok) {
    window.location.href = '/';
    return null;
  }
  const datos = await respuesta.json();
  document.getElementById('rutUsuario').textContent = datos.rut;
  return datos;
}

function configurarPestanas() {
  const botones = document.querySelectorAll('.tabs button');
  botones.forEach((boton) => {
    boton.addEventListener('click', () => {
      botones.forEach((b) => b.classList.remove('activo'));
      boton.classList.add('activo');

      document.querySelectorAll('.vista').forEach((v) => v.classList.remove('activa'));
      document.getElementById(`vista-${boton.dataset.vista}`).classList.add('activa');
    });
  });
}

async function cargarCatalogos() {
  const respuesta = await fetch('/api/catalogos', { credentials: 'include' });
  if (!respuesta.ok) return;
  const { delegaciones, areas } = await respuesta.json();

  const selectDelegacion = document.getElementById('delegacion');
  delegaciones.forEach((d) => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    selectDelegacion.appendChild(opt);
  });

  const selectArea = document.getElementById('area');
  areas.forEach((a) => {
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = a;
    selectArea.appendChild(opt);
  });
}

function pillSemaforo(semaforo, dias) {
  const clase = semaforo.toLowerCase();
  return `<span class="pill ${clase}">Día ${dias} · ${SEMAFORO_LABEL[semaforo] || semaforo}</span>`;
}

function estadoAColumnaKanban(estado) {
  if (/resuelto/i.test(estado)) return 'Resueltos';
  if (/cuello botella/i.test(estado)) return 'Cuello Botella';
  if (/pendiente/i.test(estado)) return 'Pendientes';
  return 'En Proceso';
}

async function cargarRequerimientos() {
  const respuesta = await fetch('/api/requerimientos', { credentials: 'include' });
  if (!respuesta.ok) return;
  const requerimientos = await respuesta.json();

  // ---- Tabla / Panel Semáforo ----
  const tabla = document.getElementById('tablaSemaforo');
  tabla.innerHTML = requerimientos
    .map(
      (r) => `
      <tr>
        <td><strong>#${r.id}</strong></td>
        <td>${formatearFecha(r.fecha)}</td>
        <td>${r.vecino}</td>
        <td>${r.area}</td>
        <td>${r.delegacion}</td>
        <td>${pillSemaforo(r.semaforo, r.dias)}</td>
        <td>${r.estado}</td>
        <td>${r.responsable}</td>
      </tr>`
    )
    .join('');

  // ---- Kanban ----
  document.querySelectorAll('.kanban-columna').forEach((col) => {
    const titulo = col.querySelector('h3').outerHTML;
    col.innerHTML = titulo;
  });

  requerimientos.forEach((r) => {
    const columna = estadoAColumnaKanban(r.estado);
    const contenedor = document.querySelector(`.kanban-columna[data-col="${columna}"]`);
    if (!contenedor) return;

    const tarjeta = document.createElement('div');
    tarjeta.className = `kanban-tarjeta ${r.semaforo.toLowerCase()}`;
    tarjeta.innerHTML = `
      <div class="id">#${r.id}</div>
      <div>${r.vecino} — ${r.area}</div>
      <div class="meta">Día ${r.dias} · ${r.delegacion}</div>
    `;
    contenedor.appendChild(tarjeta);
  });

  // Actualiza los contadores del título de cada columna
  document.querySelectorAll('.kanban-columna').forEach((col) => {
    const cantidad = col.querySelectorAll('.kanban-tarjeta').length;
    const h3 = col.querySelector('h3');
    h3.textContent = `${h3.textContent} (${cantidad})`;
  });
}

function formatearFecha(iso) {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

function configurarFormularioCaptura() {
  const form = document.getElementById('formCaptura');
  const confirmacion = document.getElementById('confirmacionCaptura');
  const inputTelefono = document.getElementById('telefono');

  inputTelefono.addEventListener('input', () => {
    const valor = inputTelefono.value;
    if (!valor.startsWith('+')) {
      inputTelefono.value = '';
      return;
    }
    inputTelefono.value = `+${valor.slice(1).replace(/\D/g, '').slice(0, 11)}`;
  });

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const payload = {
      nombre: document.getElementById('nombre').value.trim(),
      telefono: document.getElementById('telefono').value.trim(),
      delegacion: document.getElementById('delegacion').value,
      canal: document.getElementById('canal').value,
      area: document.getElementById('area').value,
      tipo: document.getElementById('tipo').value,
      descripcion: document.getElementById('descripcion').value.trim(),
      funcionario: document.getElementById('funcionario').value.trim(),
    };

    if (!/^\+569\d{8}$/.test(payload.telefono)) {
      alert('El teléfono debe comenzar con +569 y contener 8 números adicionales.');
      inputTelefono.focus();
      return;
    }

    const respuesta = await fetch('/api/requerimientos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      alert(datos.error || 'No fue posible guardar el ticket.');
      return;
    }

    confirmacion.classList.add('visible');
    form.reset();
    await cargarRequerimientos();
    setTimeout(() => confirmacion.classList.remove('visible'), 3500);
  });
}

function configurarCierreSesion() {
  document.getElementById('btnSalir').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/';
  });
}

(async function iniciar() {
  const sesion = await verificarSesion();
  if (!sesion) return;

  configurarPestanas();
  configurarFormularioCaptura();
  configurarCierreSesion();
  await cargarCatalogos();
  await cargarRequerimientos();
})();
