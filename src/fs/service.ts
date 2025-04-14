import { join } from "path";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";

export default class FsService {
  value: string | Buffer;
  randomUUID: string;
  extension: string;

  constructor({
    value,
    filename,
  }: {
    value: string | Buffer;
    filename?: string;
  }) {
    this.value = value;
    this.randomUUID = randomUUID();
    const extension = filename?.split(".").at(-1);
    this.extension = extension ?? "mp4";
    console.log({ extension: this.extension });
  }

  private get outputPath() {
    const tempFilePath = join(`${this.randomUUID}.${this.extension}`);
    return tempFilePath;
  }

  async createTempFile() {
    // Step 1: Decode base64 string to binary
    const videoBuffer =
      typeof this.value === "string"
        ? Buffer.from(this.value, "base64")
        : this.value;

    // Step 2: Create temp file for video
    await fs.writeFile(this.outputPath, videoBuffer);

    return this.outputPath;
  }

  async unlink() {
    await fs.unlink(this.outputPath);
  }
}
