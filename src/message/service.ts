import { Message } from "whatsapp-web.js";
import { mapMessageType, MessageClientModel } from "./type";
import { AspectRatio, listAspectRatio } from "../resize/types";
import FileService from "../file/service";
import { IgLoginBadPasswordError } from "instagram-private-api";
import { instagramConstant } from "../instagram/constant";
import { VideoImageBuffer } from "../instagram/type";
import { ArrayService } from "../array/service";

export class MessageService {
  client: MessageClientModel;

  constructor({ client }: { client: MessageClientModel }) {
    this.client = client;
  }

  messageKeyword = {
    cancelUpload: "cancel upload",
    help: "help",
    startUpload: "start upload to instagram",
    endUpload: "end upload to instagram",
  };

  async handleHelpKeyword(msg: Message) {
    const cancelUploadKeyword = this.messageKeyword.help;
    const isHelpKeyword = msg.body.toLowerCase() === cancelUploadKeyword;

    if (!isHelpKeyword) return;

    msg.reply(
      `Use this keyword to upload to Instagram via WhatsApp \n${Object.values(
        this.messageKeyword
      )
        .map((item) => `- ${item}`)
        .join("\n")}`
    );
  }

  async handleCancelUpload(msg: Message) {
    const cancelUploadKeyword = this.messageKeyword.cancelUpload;
    const isCancelKeyword = msg.body.toLowerCase() === cancelUploadKeyword;

    if (!isCancelKeyword) return;

    msg.reply("Cancel Upload Successfully");

    this.resetState();
  }

  async handleStartUpload(msg: Message) {
    const startUploadInstagramKeyword = this.messageKeyword.startUpload;

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
    const type = mapMessageType(msg.type);

    if (media?.data === undefined) {
      throw new Error("media data is undefined");
    }

    if (!type) {
      throw new Error(`message type ${msg.type} not supported`);
    }
    const mediaModel: VideoImageBuffer = {
      type,
      buffer: media.data,
      filename: media.filename ?? undefined,
    };

    console.log("start push to batch upload with id", msg.id.id);
    this.client.batchMedia.push(mediaModel);
  }

  resetState() {
    console.log("clear batch media data");

    this.client.batchMedia = [];
    this.client.isLoadingUploadToInstagram = false;
  }

  async handlePostBatchMedia(msg: Message) {
    try {
      const endUploadInstagramKeyword = this.messageKeyword.endUpload;
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

      const resultBatch = ArrayService.batch({
        files: this.client.batchMedia,
        batchLength: instagramConstant.max.post,
      });

      for (const [i, images] of Object.entries(resultBatch)) {
        const index = Number(i);
        let finalCaption = caption;

        if (resultBatch.length > 1) {
          finalCaption = `${caption ?? ""} ${index + 1}`;
        }

        console.log("start post image with caption ", finalCaption);
        const result = await this.client.instagramService.processImageVideo({
          aspectRatio: this.client.aspectRatio,
          items: this.client.batchMedia,
        });
        await this.client.instagramService.publishAlbum({
          caption: finalCaption,
          items: result.publishItems.map((item) => ({
            coverImage: item.video?.thumbnail!,
            file: item.image!,
            video: item.video?.buffer!,
          })),
        });
      }

      msg.reply("Image posted successfully!");

      this.resetState();
    } catch (error) {
      this.resetState();
      throw error;
    }
  }

  static handleError({ error, msg }: { error: any; msg: Message }) {
    if (error instanceof IgLoginBadPasswordError) {
      console.error(error);
      msg.reply(`incorrect credential`);
      return;
    }
    console.error(error);
    msg.reply(`error ${error?.toString()}`);
  }
}
