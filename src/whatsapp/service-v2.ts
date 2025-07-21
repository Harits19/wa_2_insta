import { Client, LocalAuth, Message } from "whatsapp-web.js";
import PuppeteerService from "../puppeteer/service";
import qrcode from "qrcode-terminal";

export default class WhatsappServiceV2 {
  client: Client;

  constructor({ client }: { client: Client }) {
    this.client = client;
  }

  static async init({ listen }: { listen: (message: Message) => void }) {
    const client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        ...PuppeteerService.defaultOption(),
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    });

    await client.initialize();

    client.on("qr", (qr) => {
      // Generate and scan this code with your phone
      console.log("qr code received", qr);
      qrcode.generate(qr, { small: true });
    });

    client.on("message", (message) => {
      console.info("message received", message.body);
      try {
        listen(message);
      } catch (error) {
        console.error(error);
      }
    });

    client.on("ready", () => {
      console.log("whatsapp Client is ready!");
    });

    return new WhatsappServiceV2({ client });
  }
}
