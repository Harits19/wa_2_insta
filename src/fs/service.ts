import { join } from "path";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";

export default class FsService {
  base64: string;
  randomUUID: string;

  constructor({ base64 }: { base64: string }) {
    this.base64 = base64;
    this.randomUUID = randomUUID()
  }

  private get outputPath() {
    const tempFilePath = join(`${this.randomUUID}.mp4`);
    return tempFilePath;
  }

  async createTempFile() {
    // Step 1: Decode base64 string to binary
    const videoBuffer = Buffer.from(this.base64, "base64");

    // Step 2: Create temp file for video
    await fs.writeFile(this.outputPath, videoBuffer);

    return this.outputPath;
  }

  async unlink() {
    await fs.unlink(this.outputPath);
  }
}
