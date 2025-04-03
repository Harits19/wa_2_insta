import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

import { MessageClientModel } from "../message/type";
import { InstagramService } from "../instagram/service";
import { IgApiClient } from "instagram-private-api";

const clients: Record<string, MessageClientModel> = {};

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
      const from = msg.from;
      const body = msg.body;
      console.log({ from, body });

      const selectedClients = clients[from];

      const loginKeyword = "login";

      if (body.startsWith(loginKeyword)) {
        const values = body.split("-");
        const username = values.at(1)?.trim();
        const password = values.at(2)?.trim();

        if (!password || !username) {
          return;
        }

        console.log({ username, password });
      }

      if (!selectedClients) {
        console.log("client not found, start new client");
        const instagramService = new InstagramService({
          ig: new IgApiClient(),
        });

        const isHaveSession = instagramService.isHaveSession;

        if (!isHaveSession) {
          msg.reply(
            "client not found, please input instagram username and password with this format \n *login - example.username - examplePassword*"
          );
          return;
        }

        clients[from] = {
          batchMedia: [],
          instagramService,
          isLoadingUploadToInstagram: false,
        };

        return;
      }

      // try {
      //   await handlePostBatchMedia(msg);
      //   await handleStartUpload(msg);
      //   await handleAddMedia(msg);
      // } catch (error) {
      //   console.error(error);
      //   msg.reply(`error ${error?.toString()}`);
      // }
    });

    await client.initialize();
  });
}
