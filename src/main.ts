import WhatsappService from "./whatsapp/service";

export default async function main() {
  const whatsappService = new WhatsappService();
  await whatsappService.initWhatsappClient();
}

main();
