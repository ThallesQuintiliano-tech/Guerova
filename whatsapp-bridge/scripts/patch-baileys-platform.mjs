/**
 * WhatsApp passou a rejeitar UserAgent.Platform.WEB em novos pareamentos.
 * Patch local até o Baileys 6.7.x incorporar MACOS por defeito.
 */
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let file;
try {
  file = require.resolve('@whiskeysockets/baileys/lib/Utils/validate-connection.js');
} catch {
  process.exit(0);
}

const src = fs.readFileSync(file, 'utf8');
const needle = 'platform: proto.ClientPayload.UserAgent.Platform.WEB';
const patch = 'platform: proto.ClientPayload.UserAgent.Platform.MACOS';

if (src.includes(needle)) {
  fs.writeFileSync(file, src.replace(needle, patch));
  console.log('baileys: Platform.WEB → MACOS (pareamento QR)');
} else if (!src.includes(patch)) {
  console.warn('baileys: validate-connection.js inesperado — patch não aplicado');
}
