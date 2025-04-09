import { Client, LocalAuth, MessageMedia, MessageTypes } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

import { MessageClientModel } from "../message/type";
import { InstagramService } from "../instagram/service";
import { IgLoginBadPasswordError } from "instagram-private-api";
import { MessageService } from "../message/service";

const clients: Record<string, MessageClientModel> = {};

export async function initWhatsappClient() {
  const client = new Client({
    authStrategy: new LocalAuth(),
  });

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
        const from = msg.from;
        const body = msg.body;
        console.log({ from, body });

        let selectedClients = clients[from];

        const loginKeyword = "login";

        const setNewClient = (instagramService: InstagramService) => {
          const newValue: MessageClientModel = {
            aspectRatio: `1x1`,
            batchMedia: [],
            isLoadingUploadToInstagram: false,
            instagramService,
          };
          clients[from] = newValue;
          return newValue;
        };

        if (body.startsWith(loginKeyword) && !selectedClients) {
          const values = body.split("-");
          const username = values.at(1)?.trim();
          const password = values.at(2)?.trim();

          if (!password || !username) {
            return;
          }

          console.log({ username, password });

          const instagramService = new InstagramService({ cookiesKey: from });
          msg.reply("start login");
          await instagramService.initInstagramClient({ password, username });
          msg.reply("success login");

          setNewClient(instagramService);

          return;
        }

        if (!selectedClients) {
          console.log("client not found, start new client");
          const instagramService = new InstagramService({ cookiesKey: from });

          const isHaveSession = instagramService.isHaveSession;

          if (!isHaveSession) {
            msg.reply(
              "client not found, please input instagram username and password with this format \n *login - example.username - examplePassword*"
            );
            return;
          }

          await instagramService.loadSession();

          selectedClients = setNewClient(instagramService);
        }

        const messageService = new MessageService({ client: selectedClients });

        await messageService.handlePostBatchMedia(msg);
        await messageService.handleStartUpload(msg);
        await messageService.handleAddMedia(msg);
        await messageService.handleCancelUpload(msg);
        await messageService.handleHelpKeyword(msg);

        console.log("state after batch media ", {
          ...selectedClients,
          batchMedia: undefined,
          instagramService: undefined,
        });
      } catch (error) {
        if (error instanceof IgLoginBadPasswordError) {
          console.error(error);
          msg.reply(`incorrect credential`);
          return;
        }
        console.error(error);
        msg.reply(`error ${error?.toString()}`);
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
