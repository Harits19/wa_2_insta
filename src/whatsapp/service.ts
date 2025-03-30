import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { publishPhoto, publishPhotos } from "../instagram/service";

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

    let batchMedia: MessageMedia[] = [];
    let isLoadingUploadToInstagram = false;

    client.on("message", async (msg) => {
      const body = msg.body;

      const endUploadInstagramKeyword = "end upload to instagram";

      const isEndUploadToInstagram = body
        .toLowerCase()
        .startsWith(endUploadInstagramKeyword);

      if (isEndUploadToInstagram) {
        console.log("all media received with size ", batchMedia.length);
        console.log("start post multiple photo");
        const caption = body.split("-").at(1)?.trim();
        await publishPhotos({
          items: batchMedia.map((item) => item.data),
          caption,
        });

        console.log("clear batch media data");
        batchMedia = [];
      }

      const startUploadInstagramKeyword = "start upload to instagram";

      const isStartUploadToInstagram = body
        .toLowerCase()
        .startsWith(startUploadInstagramKeyword);

      if (isStartUploadToInstagram) {
        console.log("start upload to instagram!");
        isLoadingUploadToInstagram = true;
      }

      if (isLoadingUploadToInstagram && msg.hasMedia) {
        const media = await msg.downloadMedia();
        console.log("start push to batch upload with id", msg.id.id);
        batchMedia.push(media);
      }
    });

    await client.initialize();
  });
}
