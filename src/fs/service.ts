import { dirname, join } from "path";
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";

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
    const tempFilePath = join(`temporary/${this.randomUUID}.${this.extension}`);
    return tempFilePath;
  }

  async createTempFile() {
    // Step 1: Decode base64 string to binary
    const videoBuffer =
      typeof this.value === "string"
        ? Buffer.from(this.value, "base64")
        : this.value;

    // Step 2: Create temp file for video
    await mkdir(dirname(this.outputPath), { recursive: true });
    await writeFile(this.outputPath, videoBuffer);

    return this.outputPath;
  }

  async unlink() {
    await unlink(this.outputPath);
  }
}
