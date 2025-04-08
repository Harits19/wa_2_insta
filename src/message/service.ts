import { Message, MessageMedia } from "whatsapp-web.js";
import { MessageClientModel } from "./type";
import ResizeBase64Service from "../resize/base-64/service";
import { AspectRatio, listAspectRatio } from "../resize/types";

export class MessageService {
  client: MessageClientModel;

  constructor({ client }: { client: MessageClientModel }) {
    this.client = client;
  }

  async handleStartUpload(msg: Message) {
    const startUploadInstagramKeyword = "start upload to instagram";

    const isStartUploadToInstagram = msg.body
      .toLowerCase()
      .startsWith(startUploadInstagramKeyword);
    const aspectRatio = msg.body.split("-").at(1)?.trim();

    if (!isStartUploadToInstagram) return;

    if (listAspectRatio.some((item) => item === aspectRatio)) {
      this.client.aspectRatio = aspectRatio as AspectRatio;
    }

    console.log("start upload to instagram!");
    msg.reply("start listen image");
    this.client.isLoadingUploadToInstagram = true;
  }

  async handleAddMedia(msg: Message) {
    if (!this.client.isLoadingUploadToInstagram || !msg.hasMedia) return;

    const media = await msg.downloadMedia();
    console.log("start push to batch upload with id", msg.id.id);
    this.client.batchMedia.push(media);
  }

  resetState() {
    console.log("clear batch media data");

    this.client.batchMedia = [];
    this.client.isLoadingUploadToInstagram = false;
  }

  async handlePostBatchMedia(msg: Message) {
    try {
      const endUploadInstagramKeyword = "end upload to instagram";
      const body = msg.body;

      const isEndUploadToInstagram = body
        .toLowerCase()
        .startsWith(endUploadInstagramKeyword);

      if (!isEndUploadToInstagram) return;

      console.log(
        "all media received with size ",
        this.client.batchMedia.length
      );
      console.log("start post multiple photo");
      const caption = body.split("-").at(1)?.trim();
      const resizeService = new ResizeBase64Service({
        aspectRatio: this.client.aspectRatio,
      });
      const resizeResult = await resizeService.resizeBase64Images({
        images: this.client.batchMedia.map((item) => item.data),
      });
      msg.reply("start post image");
      await this.client.instagramService.publishPhotos({
        items: resizeResult,
        caption,
      });

      msg.reply("Image posted successfully!");

      this.resetState();
    } catch (error) {
      this.resetState();
      throw error;
    }
  }
}
