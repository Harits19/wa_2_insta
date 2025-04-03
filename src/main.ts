import { checkENV } from "./env/service";
import { startLocalFileUpload } from "./local/service";
import { initWhatsappClient } from "./whatsapp/service";

export default async function main() {
  checkENV();
  await initWhatsappClient();
  await startLocalFileUpload();
  
}

main();
