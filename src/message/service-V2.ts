import { Message } from "whatsapp-web.js";
import {
  InstagramCredential,
  InstagramState,
  mapMessageType,
  MessageState,
} from "./type";
import { InstagramServiceV2 } from "../instagram/service-v2";
import ChatModel from "../chat/model";
import JSONService from "../json/service";

export default class MessageServiceV2 {
  static jsonPath = "src/message/state.json";

  jsonService: JSONService;
  listState: MessageState;

  setInstagram: {
    [key: string]: InstagramServiceV2;
  } = {};

  private constructor({
    jsonService,
    listState,
  }: {
    jsonService: JSONService;
    listState: MessageState;
  }) {
    this.jsonService = jsonService;
    this.listState = listState;
  }

  static async init() {
    const jsonService = new JSONService<MessageState>(this.jsonPath);
    const listState = await jsonService.read();

    return new MessageServiceV2({ jsonService, listState });
  }

  listen = async (msg: Message) => {
    const body = msg.body;
    const chatInstance = await msg.getChat();
    const chat = new ChatModel({ chat: chatInstance });
    const id = chat.key;
    try {
      console.log("receive new message", body);
      console.log("list state before", this.listState);

      const selectedUser = Object.entries(this.listState ?? {}).find(
        (item) => item[0] === id
      )?.[1];

      if (selectedUser) {
        const instagramService = this.setInstagram[id];
        console.log({ instagramService });
        if (!instagramService) {
          await this.startLogin({ body, chat, selectedUser });
        } else if (body === "start") {
          await this.startUpload({ chat });
        } else if (selectedUser.upload === "start") {
          await this.handleAddMedia({ msg });
        }
      } else if (body === "init") {
        await this.initInstagram({ chat });
      } else {
        chat.sendMessage("Maaf saya tidak mengerti perintah itu");
      }

      console.log("list state after", this.listState);
      await this.jsonService.write(this.listState);
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

      chat.sendMessage(JSON.stringify(detail, null, 3));
    }
  };

  async initInstagram({ chat }: { chat: ChatModel }) {
    const exampleListUsername = {
      username: "@username2",
      password: "P@ssword",
    };
    await chat.sendMessage("Jawab dengan format seperti ini");
    await chat.sendMessage(JSON.stringify(exampleListUsername, null, 2));

    this.listState[chat.key] = {
      upload: "idle",
    };
  }

  async startLogin({
    body,
    selectedUser,
    chat,
  }: {
    body: string;
    selectedUser: InstagramState;
    chat: ChatModel;
  }) {
    const id = chat.key;
    const credential = InstagramCredential.parse(JSON.parse(body));

    const instagramService = await InstagramServiceV2.login({
      password: credential.password,
      username: credential.username,
    });
    selectedUser.username = credential.username;

    this.listState[id] = selectedUser;
    this.setInstagram[id] = instagramService;

    chat.sendMessage("Berhasil login");
  }

  async startUpload({ chat }: { chat: ChatModel }) {
    const id = chat.key;
    this.listState[id].upload = "start";
  }

  async handleAddMedia({ msg }: { msg: Message }) {
    const type = mapMessageType(msg.type);
    console.log({ type });
  }
}
