import { join } from "path";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";

export default class FsService {
  base64: string | Buffer;
  randomUUID: string;

  constructor({ base64 }: { base64: string | Buffer }) {
    this.base64 = base64;
    this.randomUUID = randomUUID();
  }

  private get outputPath() {
    const tempFilePath = join(`${this.randomUUID}.mp4`);
    return tempFilePath;
  }

  async createTempFile() {
    // Step 1: Decode base64 string to binary
    const videoBuffer =
      typeof this.base64 === "string"
        ? Buffer.from(this.base64, "base64")
        : this.base64;

    // Step 2: Create temp file for video
    await fs.writeFile(this.outputPath, videoBuffer);

    return this.outputPath;
  }

  async unlink() {
    await fs.unlink(this.outputPath);
  }
}
