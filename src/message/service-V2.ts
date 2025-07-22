import { Message } from "whatsapp-web.js";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

import {
  InstagramCredential,
  InstagramPostBody,
  InstagramServiceState,
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
  messageState: MessageState;

  instagramServiceState: InstagramServiceState;

  private constructor({
    jsonService,
    messageState: listState,
    instagramServiceState,
  }: {
    jsonService: JSONService;
    messageState: MessageState;
    instagramServiceState: InstagramServiceState;
  }) {
    this.jsonService = jsonService;
    this.messageState = listState;
    this.instagramServiceState = instagramServiceState;
  }

  static async init() {
    const jsonService = new JSONService<MessageState>(this.jsonPath);
    const messageState = await jsonService.read();

    const instagramServiceState: InstagramServiceState = {};

    for (const [key, value] of Object.entries(messageState)) {
      if (!value.username) continue;
      const service = await InstagramServiceV2.loadCookies({
        username: value.username,
      });
      if (!service) continue;
      instagramServiceState[key] = service;
    }

    return new MessageServiceV2({
      jsonService,
      messageState,
      instagramServiceState,
    });
  }

  listen = async (msg: Message) => {
    const body = msg.body;
    const chatInstance = await msg.getChat();
    const chat = new ChatModel({ chat: chatInstance });
    const id = chat.key;
    try {
      console.log("receive new message", body);
      console.log("list state before", this.messageState);

      const selectedUser = this.messageState[id];
      const instagramService = this.instagramServiceState[id];

      if (!selectedUser && !instagramService) {
        // belum pernah login, kirim pesan welcome
        await this.initInstagram({ chat });
      } else if (selectedUser && !instagramService) {
        // sudah pernah chat, dan baru mengirim credential
        await this.startLogin({ body, chat, selectedUser });
      } else if (body === "start") {
        await this.startUpload({ chat });
      } else if (selectedUser.upload === "start") {
        if (body === "end") {
          await this.handleEndUpload({ chat });
        } else {
          await this.handleAddMedia({ msg, chat });
        }
      } else if (selectedUser.upload === "end") {
        await this.startPost({ body, chat });
      } else {
        chat.sendMessage("Maaf saya tidak mengerti perintah itu");
      }

      console.log("list state after", this.messageState);
      await this.jsonService.write(this.messageState);
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
    await chat.sendMessage(JSONService.stringify(exampleListUsername));

    this.messageState[chat.key] = {
      upload: "idle",
      media: [],
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

    this.messageState[id] = selectedUser;
    this.instagramServiceState[id] = instagramService;

    chat.sendMessage("Berhasil login");
  }

  async startUpload({ chat }: { chat: ChatModel }) {
    const id = chat.key;
    this.messageState[id].upload = "start";
  }

  handleAddMedia = async ({ msg, chat }: { msg: Message; chat: ChatModel }) => {
    const type = mapMessageType(msg.type);
    console.log({ type });
    const id = chat.key;
    const media = await msg.downloadMedia();
    if (!media) {
      throw new Error("empty value on downloadMedia()");
    }
    console.log("start add media", media.filename);

    const temp = this.messageState[id].media ?? [];
    const path = await this.createFile(media.data, media.mimetype);
    temp.push({
      path,
      filename: media.filename ?? "",
      type: type,
    });
    this.messageState[id].media = temp;
  };

  async createFile(base64: string, mimeType: string) {
    const buffer = Buffer.from(base64, "base64");
    const extension = mimeType.split("/").at(1);
    const filename = uuidv4();
    const output = `temp/${filename}.${extension}`;

    await fs.writeFile(output, buffer);

    return output;
  }

  async handleEndUpload({ chat }: { chat: ChatModel }) {
    const id = chat.key;
    this.messageState[id].upload = "end";
    const postBody: InstagramPostBody = {
      caption: "Isi dengan caption (opsional)",
    };

    await chat.sendMessage("Jawab dengan format seperti ini");
    await chat.sendMessage(JSONService.stringify(postBody));
  }

  async startPost({ body, chat }: { body: string; chat: ChatModel }) {
    const id = chat.key;
    const { caption } = InstagramPostBody.parse(JSON.parse(body));
    const service = this.instagramServiceState[id];
    const items = this.messageState[id].media;

    await service.postAlbum({
      items,
      caption,
    });
  }
}
