import MessageServiceV2 from "./message/service-v2";
import WhatsappServiceV2 from "./whatsapp/service-v2";

async function main() {
  console.log("start main.ts");
  const message = await MessageServiceV2.init();
  await WhatsappServiceV2.init({ listen: message.listen });
  console.log("end main.ts");
}

main().catch(console.error);
