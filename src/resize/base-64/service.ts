import ResizeService from "../service";

export default class ResizeBase64Service extends ResizeService {
  async resizeBase64Images({ images }: { images: string[] }) {
    const result = await Promise.all(
      images.map(async (item) => {
        const sharp = await this.resizeImage({
          input: Buffer.from(item, "base64"),
        });

        const buffer = await sharp.toBuffer();

        return buffer;
      })
    );

    return result;
  }
}
