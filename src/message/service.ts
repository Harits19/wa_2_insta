import { Message } from "whatsapp-web.js";
import { mapMessageType, MediaModel, MessageClientModel } from "./type";
import ResizeImageService from "../resize/base-64/service";
import { AspectRatio, listAspectRatio } from "../resize/types";
import FileService from "../file/service";
import ResizeVideoService from "../resize/video/service";
import FsService from "../fs/service";
import { IgLoginBadPasswordError } from "instagram-private-api";

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
    const mediaModel: MediaModel = {
      ...media,
      type,
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
      let caption = body.split("-").at(1)?.trim();

      const resizeResult = await Promise.all(
        this.client.batchMedia.map(async (item) => {
          const mediaType = item.type;
          if (mediaType === "video") {
            const result = await this.resizeVideo({ base64: item.data });
            return {
              video: {
                buffer: result.resizedVideo,
                thumbnail: result.thumbnail,
              },
            };
          } else if (mediaType === "image") {
            const result = await this.resizeImage({ base64: item.data });
            return {
              image: {
                buffer: result,
              },
            };
          }
        })
      );

      const resultBatch = FileService.batchFile(resizeResult);

      for (const [i, images] of Object.entries(resultBatch)) {
        const index = Number(i);
        let finalCaption = caption;

        if (resultBatch.length > 1) {
          finalCaption = `${caption ?? ""} ${index + 1}`;
        }

        console.log("start post image with caption ", finalCaption);
        await this.client.instagramService.publishAlbum({
          items: images.map((item) => ({
            coverImage: item?.video?.thumbnail,
            file: item?.image?.buffer!,
            video: item?.video?.buffer,
          })),
          caption: finalCaption,
        });
      }

      msg.reply("Image posted successfully!");

      this.resetState();
    } catch (error) {
      this.resetState();
      throw error;
    }
  }

  async resizeVideo({ base64 }: { base64: string }) {
    const fsService = new FsService({ value: base64 });

    const tempPath = await fsService.createTempFile();

    const resizeVideoService = new ResizeVideoService({
      aspectRatio: this.client.aspectRatio,
      filePath: tempPath,
    });
    const { resizedVideo, thumbnail } =
      await resizeVideoService.getInstagramReadyVideo();

    return { resizedVideo, thumbnail };
  }

  async resizeImage({ base64 }: { base64: string }) {
    const resizeImageService = new ResizeImageService({
      aspectRatio: this.client.aspectRatio,
    });

    const result = await resizeImageService.resizeImage(base64);
    return result;
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
