import { readFile } from "fs/promises";
import ResizeService from "../service";
import { AspectRatio } from "../types";
import { Base64 } from "./type";

export default class ResizeImageService extends ResizeService {
  image: Base64 | Buffer;

  constructor({
    image,
    aspectRatio,
  }: {
    image: Base64 | Buffer;
    aspectRatio: AspectRatio;
  }) {
    super({ aspectRatio });
    this.image = image;
  }

  /**
   * @deprecated use static resizeImage function instead
   * @returns
   */
  async resizeImage() {
    const item = this.image;
    const sharp = await this.runResize({
      input: typeof item === "string" ? Buffer.from(item, "base64") : item,
    });

    const buffer = await sharp.toBuffer();

    return buffer;
  }
}
