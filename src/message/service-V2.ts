import { Chat, Message } from "whatsapp-web.js";
import { InstagramCredential } from "./type";

export default class MessageServiceV2 {
  listState: {
    [key: string]: {
      username?: string;
      password?: string;
      state: "init-instagram";
    };
  };

  constructor() {
    this.listState = {};
  }

  listen = async (msg: Message) => {
    const body = msg.body;
    const chat = await msg.getChat();
    const id = chat.id._serialized;
    try {
      console.log("receive new message", body);

      const selectedUser = Object.entries(this.listState ?? {}).find(
        (item) => item[0] === id
      )?.[1];

      if (selectedUser) {
        if (selectedUser.state === "init-instagram") {
          const credential = InstagramCredential.parse(JSON.parse(body));
          selectedUser.password = credential.password;
          selectedUser.username = credential.username;
          this.listState[id] = selectedUser;
          console.log({ listState: this.listState });
        }
        return;
      }

      if (body === "init") {
        await this.initInstagram(chat);
        return;
      }
    } catch (error) {
      console.error("receive error ", error);

      const detail = {
        stack: "empty stack",
        message: "empty message",
        name: "empty name",
      };

      if (error instanceof Error) {
        detail.message = error.message;
        if (error.stack) {
          detail.stack = error.stack;
        }

        if (error.name) {
          detail.name = error.name;
        }
      }

      chat.sendMessage(`error ${JSON.stringify(detail)}`);
    }
  };

  async initInstagram(chat: Chat) {
    const exampleListUsername = {
      username: "@username2",
      password: "P@ssword",
    };
    await chat.sendMessage("Jawab dengan format seperti ini");
    await chat.sendMessage(JSON.stringify(exampleListUsername, null, 2));

    this.listState[chat.id._serialized] = {
      state: "init-instagram",
    };
  }
}
