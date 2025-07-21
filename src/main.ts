import MessageServiceV2 from "./message/service-V2";
import WhatsappServiceV2 from "./whatsapp/service-v2";

async function main() {
  console.log("start main.ts");
  const message = new MessageServiceV2();
  await WhatsappServiceV2.init({ listen: message.listen });
  console.log("end main.ts");
}

main().catch(console.error);
