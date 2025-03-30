import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { publishPhoto } from "../instagram/service";

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
      const rawData: any = msg.rawData;

      const captionPrefix = rawData?.caption;

      if (typeof captionPrefix !== "string") return;

      const uploadInstagramKeyword = "Upload to instagram";

      const isKeywordValid = captionPrefix
        .toLowerCase()
        .startsWith(uploadInstagramKeyword.toLowerCase());

      if (!msg.hasMedia || !isKeywordValid) return;

      console.log("__________________________________");
      console.log("id ", msg.id.id);
      console.log("timestamp", msg.timestamp);
      const media = await msg.downloadMedia();
      console.log("media ", media.data);
      const caption = captionPrefix.split("-").at(1)?.trim();

      console.log("caption", caption);
      await publishPhoto({ base64: media.data, caption: caption });
    });

    await client.initialize();
  });
}
