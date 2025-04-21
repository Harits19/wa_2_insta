import WhatsappService from "./whatsapp/service";
import { envService } from "./env/service";

export default async function main() {
  envService.checkENV();
  await WhatsappService.create();
}

main();
