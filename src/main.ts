import { envService } from "./env/service";
import WhatsappService from "./whatsapp/service";

export default async function main() {
  envService.checkENV();
  const whatsappService = new WhatsappService();
  await whatsappService.initWhatsappClient();
}

main();
