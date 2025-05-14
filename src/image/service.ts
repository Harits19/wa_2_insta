import sharp from "sharp";

export default class ImageService {
  static async getDimension(value: Buffer) {
    const metadata = await sharp(value).metadata();

    return {
      width: metadata.width,
      height: metadata.height,
    };
  }

}
