import sharp from "sharp";
import { AspectRatio } from "../resize/types";
import AnalyzeSizeService from "../analyze-size/service";

export default class ImageService {
  image: sharp.Sharp;
  metadata: sharp.Metadata;

  private constructor({
    image,
    metadata,
  }: {
    image: sharp.Sharp;
    metadata: sharp.Metadata;
  }) {
    this.image = image;
    this.metadata = metadata;
  }

  static async createWithPath({ path }: { path: string }) {
    const sharpInstance = sharp(path);
    const metadata = await sharpInstance.metadata();

    return new ImageService({ image: sharpInstance, metadata });
  }

  async resizeWithAspectRatio({ aspectRatio }: { aspectRatio: AspectRatio }) {
    try {
      const { targetHeight, targetWidth } = await AnalyzeSizeService.analyze({
        height: this.metadata.height,
        width: this.metadata.width,
        aspectRatio,
      });

      const sharpConfig = this.image.resize(targetWidth, targetHeight, {
        fit: sharp.fit.contain,
        background: "white",
      });
      return sharpConfig;
    } catch (error) {
      console.log("Error resizing image:", error);
      throw error;
    }
  }

  async rotate() {
    if (this.metadata.orientation && this.metadata.orientation !== 1) {
      await this.image.rotate();
    }
  }

  async instagramReady({ aspectRatio }: { aspectRatio: AspectRatio }) {
    await this.resizeWithAspectRatio({ aspectRatio });
    await this.rotate();

    return this.image.jpeg({ quality: 90 }).toBuffer();
  }
}
