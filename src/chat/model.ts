import { Chat } from "whatsapp-web.js";

export default class ChatModel {
  private chat: Chat;

  constructor({ chat }: { chat: Chat }) {
    this.chat = chat;
  }

  get key(): string {
    return this.chat.id._serialized;
  }

  get instance(): Chat {
    return this.chat;
  }

  // Optional: expose selected Chat methods if needed
  async sendMessage(message: string) {
    return this.chat.sendMessage(message);
  }

  get name() {
    return this.chat.name;
  }

  get id() {
    return this.chat.id;
  }

  // ... etc. add more proxy methods if needed
}
