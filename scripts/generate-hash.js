// Utilidad para generar el hash bcrypt de la contraseña del administrador.
// Uso:  npm run hash -- "admin123"
const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Debes indicar la contraseña a hashear. Ejemplo:');
  console.error('  npm run hash -- "admin123"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log('\nCopia esta línea completa dentro de tu archivo .env:\n');
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
