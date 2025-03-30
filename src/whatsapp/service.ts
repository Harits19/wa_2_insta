import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { publishPhoto, publishPhotos } from "../instagram/service";
import {
  handleAddMedia,
  handlePostBatchMedia,
  handleStartUpload,
} from "../message/service";

export async function initWhatsappClient() {
  const client = new Client({ authStrategy: new LocalAuth() });

  return new Promise<void>(async (resolve) => {
    client.on("qr", (qr) => {
      // Generate and scan this code with your phone
      console.log("QR RECEIVED", qr);
      qrcode.generate(qr, { small: true });
    });

    client.on("ready", () => {
      console.log("Whatsapp Client is ready!");
      resolve();
    });

    client.on("message", async (msg) => {
      try {
        await handlePostBatchMedia(msg);
        await handleStartUpload(msg);
        await handleAddMedia(msg);
      } catch (error) {
        console.error(error);
        msg.reply(`error ${error?.toString()}`);
      }
    });

    await client.initialize();
  });
}
