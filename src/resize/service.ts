import sharp from "sharp";
import AnalyzeSizeService from "../analyze-size/service";

export default class ResizeService extends AnalyzeSizeService {
  async getSharpConfig({ input }: { input: string | Buffer }) {
    try {
      const metadata = await sharp(input).metadata();
      const { targetHeight, targetWidth } = await this.analyze({
        height: metadata.height,
        width: metadata.width,
      });

      const sharpConfig = sharp(input)
        .resize(targetWidth, targetHeight, {
          fit: sharp.fit.contain,
          background: "white",
        })
        .jpeg({ quality: 70 });
      return sharpConfig;
    } catch (error) {
      console.log("Error resizing image:", error);
      throw error;
    }
  }
}
