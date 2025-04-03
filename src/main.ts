import { checkENV } from "./env/service";
import { initInstagramClient } from "./instagram/service";
import { startLocalFileUpload } from "./local/service";
import { initWhatsappClient } from "./whatsapp/service";

export default async function main() {
  checkENV();
  await initWhatsappClient();
  await initInstagramClient();
  await startLocalFileUpload();
  
}

main();
