import { dirname, join } from "path";
import { randomUUID } from "crypto";
import { access, mkdir, readFile, stat, unlink, writeFile } from "fs/promises";
import constants from "constants";

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
    await FsService.createFile({ outputPath: this.outputPath });
    await writeFile(this.outputPath, videoBuffer);

    return this.outputPath;
  }

  static async createFile({ outputPath }: { outputPath: string }) {
    return await mkdir(dirname(outputPath), { recursive: true });
  }

  async unlink() {
    await unlink(this.outputPath);
  }

  static async folderExist(path: string) {
    try {
      // Throws if the path can’t be found or we have no permission.
      await access(path, constants.F_OK | constants.R_OK);

      // Grab file‑system metadata to confirm it’s a directory.
      return (await stat(path)).isDirectory();
    } catch {
      return false; // ENOENT, EACCES, ENOTDIR, …
    }
  }

  static async readJsonFile<T = unknown>(path: string): Promise<T> {
    const raw = await readFile(path, 'utf8');   // non‑blocking I/O
    return JSON.parse(raw) as T;
  }
}
