import {
  Client,
  LocalAuth,
  Message,
} from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

import { MessageClientModel } from "../message/type";
import { InstagramService } from "../instagram/service";
import { MessageService } from "../message/service";
import os from "os";

export default class WhatsappService {
  clients: Record<string, MessageClientModel> = {};

  setNewClient = (instagramService: InstagramService, from: string) => {
    const newValue: MessageClientModel = {
      aspectRatio: `1x1`,
      batchMedia: [],
      isLoadingUploadToInstagram: false,
      instagramService,
    };
    this.clients[from] = newValue;
    return newValue;
  };

  async getClient(msg: Message): Promise<MessageClientModel | null> {
    const from = msg.from;
    const body = msg.body;

    let client = this.clients[from];

    const loginKeyword = "login";

    if (client) return client;

    if (body.startsWith(loginKeyword)) {
      const values = body.split("-");
      const username = values.at(1)?.trim();
      const password = values.at(2)?.trim();

      if (!password || !username) {
        return null;
      }

      const instagramService = new InstagramService({ cookiesKey: from });
      msg.reply("start login");
      await instagramService.initInstagramClient({ password, username });
      msg.reply("success login");

      return this.setNewClient(instagramService, from);
    }

    console.log("client not found, start new client");
    const instagramService = new InstagramService({ cookiesKey: from });

    const isHaveSession = instagramService.isHaveSession;

    if (!isHaveSession) {
      msg.reply(
        "client not found, please input instagram username and password with this format \n *login - example.username - examplePassword*"
      );
      return null;
    }

    await instagramService.loadSession();

    client = this.setNewClient(instagramService, from);

    return client;
  }

  getChromePath() {
    const platform = os.platform();

    if (platform === 'win32') {
      return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    } else if (platform === 'darwin') {
      return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    } else if (platform === 'linux') {
      return '/usr/bin/google-chrome';
    } else {
      throw new Error('Unsupported OS');
    }
  }

  async initWhatsappClient() {
    const client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        executablePath:
          this.getChromePath(),
        args: ['--no-sandbox', '--disable-setuid-sandbox'],

      },
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
          const selectedClient = await this.getClient(msg);

          if (!selectedClient) return;

          const messageService = new MessageService({
            client: selectedClient,
          });

          await messageService.handlePostBatchMedia(msg);
          await messageService.handleStartUpload(msg);
          await messageService.handleAddMedia(msg);
          await messageService.handleCancelUpload(msg);
          await messageService.handleHelpKeyword(msg);

          console.log("state after batch media ", {
            ...selectedClient,
            batchMediaLength: selectedClient.batchMedia.length,
            batchMedia: undefined,
            instagramService: undefined,
          });
        } catch (error) {
          MessageService.handleError({ error, msg });
        }
      });

      await client.initialize();
    });
  }
}
