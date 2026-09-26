// ---------- Utilidades de RUT (mismo criterio que valida el backend) ----------

// Deja pasar solo dígitos y un guion, en el orden correcto, y limita el total
// de dígitos a 9 (8 del cuerpo + 1 verificador), tal como pide el formulario.
function limpiarRut(valorCrudo) {
  let soloValidos = valorCrudo.replace(/[^0-9-]/g, '');

  // Evita más de un guion
  const primerGuion = soloValidos.indexOf('-');
  if (primerGuion !== -1) {
    soloValidos =
      soloValidos.slice(0, primerGuion + 1) +
      soloValidos.slice(primerGuion + 1).replace(/-/g, '');
  }

  const [cuerpoCrudo, verificadorCrudo = ''] = soloValidos.split('-');
  const cuerpo = cuerpoCrudo.slice(0, 8);
  const verificador = verificadorCrudo.slice(0, 1);

  if (soloValidos.includes('-')) {
    return verificador ? `${cuerpo}-${verificador}` : `${cuerpo}-`;
  }
  // Aún no ha escrito el guion: limitamos a 9 dígitos en total
  return cuerpo.slice(0, 9);
}

function validarDigitoVerificador(rutLimpio) {
  const match = /^([0-9]{1,8})-([0-9])$/.exec(rutLimpio);
  if (!match) return false;

  const cuerpo = match[1];
  const dv = match[2];

  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  let dvEsperado = String(resto);
  if (resto === 11) dvEsperado = '0';
  if (resto === 10) return false; // este formulario no acepta verificador "K"

  return dvEsperado === dv;
}

// ---------- Elementos ----------
const inputRut = document.getElementById('rut');
const inputPassword = document.getElementById('password');
const errorRut = document.getElementById('errorRut');
const errorPassword = document.getElementById('errorPassword');
const mensajeError = document.getElementById('mensajeError');
const form = document.getElementById('formLogin');
const btnIngresar = document.getElementById('btnIngresar');
const loginCard = document.getElementById('loginCard');
const btnAbrirLogin = document.getElementById('btnAbrirLogin');
const btnCerrarLogin = document.getElementById('btnCerrarLogin');

function cambiarVisibilidadLogin(visible) {
  loginCard.classList.toggle('visible', visible);
  loginCard.setAttribute('aria-hidden', String(!visible));
  btnAbrirLogin.setAttribute('aria-expanded', String(visible));
  if (visible) inputRut.focus();
}

btnAbrirLogin.addEventListener('click', () => {
  cambiarVisibilidadLogin(!loginCard.classList.contains('visible'));
});

btnCerrarLogin.addEventListener('click', () => cambiarVisibilidadLogin(false));

inputRut.addEventListener('input', () => {
  const posicionAntes = inputRut.selectionStart;
  const largoAntes = inputRut.value.length;

  inputRut.value = limpiarRut(inputRut.value);
  errorRut.textContent = '';

  // Mantiene el cursor razonablemente cerca de donde estaba
  const diferencia = inputRut.value.length - largoAntes;
  const nuevaPosicion = Math.max(0, (posicionAntes || 0) + diferencia);
  inputRut.setSelectionRange(nuevaPosicion, nuevaPosicion);
});

inputRut.addEventListener('blur', () => {
  if (inputRut.value && !validarDigitoVerificador(inputRut.value)) {
    errorRut.textContent = 'El RUT no es válido (revisa el dígito verificador).';
  }
});

function mostrarErrorGeneral(texto) {
  mensajeError.textContent = texto;
  mensajeError.classList.add('visible');
}

function ocultarErrorGeneral() {
  mensajeError.classList.remove('visible');
  mensajeError.textContent = '';
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  ocultarErrorGeneral();
  errorRut.textContent = '';
  errorPassword.textContent = '';

  const rut = inputRut.value.trim();
  const password = inputPassword.value;

  let hayErrores = false;

  if (!rut) {
    errorRut.textContent = 'Ingresa tu RUT.';
    hayErrores = true;
  } else if (!validarDigitoVerificador(rut)) {
    errorRut.textContent = 'El RUT no es válido (revisa el dígito verificador).';
    hayErrores = true;
  }

  if (!password) {
    errorPassword.textContent = 'Ingresa tu contraseña.';
    hayErrores = true;
  }

  if (hayErrores) return;

  btnIngresar.disabled = true;
  btnIngresar.textContent = 'Ingresando...';

  try {
    const respuesta = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ rut, password }),
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      mostrarErrorGeneral(datos.error || 'No fue posible iniciar sesión.');
      return;
    }

    window.location.href = '/dashboard';
  } catch (err) {
    mostrarErrorGeneral('No fue posible conectar con el servidor. Intenta nuevamente.');
  } finally {
    btnIngresar.disabled = false;
    btnIngresar.textContent = 'Ingresar';
  }
});
