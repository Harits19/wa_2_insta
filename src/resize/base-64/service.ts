import ResizeService from "../service";
import { Base64 } from "./type";

export default class ResizeImageService extends ResizeService {
  async resizeImages({ images }: { images: string[] }) {
    const result = await Promise.all(images.map(this.resizeImage));

    return result;
  }

  async resizeImage(item: Base64 | Buffer) {
    const sharp = await this.runResize({
      input: typeof item === "string" ? Buffer.from(item, "base64") : item,
    });

    const buffer = await sharp.toBuffer();

    return buffer;
  }
}
