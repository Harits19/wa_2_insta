import ResizeService from "../service";

export default class ResizeImageService extends ResizeService {
  async resizeImages({ images }: { images: string[] }) {
    const result = await Promise.all(images.map(this.resizeImage));

    return result;
  }

  async resizeImage(item: string) {
    const sharp = await this.getSharpConfig({
      input: Buffer.from(item, "base64"),
    });

    const buffer = await sharp.toBuffer();

    return buffer;
  }
}
