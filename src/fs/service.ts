import path, { dirname, join } from "path";
import { randomUUID } from "crypto";
import {
  access,
  copyFile,
  mkdir,
  readdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "fs/promises";
import constants from "constants";
import PromiseService from "../promise/service";
// import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from "fs";

export default class FsService {
  value: string | Buffer;
  randomUUID: string;
  extension: string;

  static extension = {
    json: ".json",
  };

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
    const raw = await readFile(path, "utf8"); // non‑blocking I/O
    return JSON.parse(raw) as T;
  }

  static async fileExists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK); // Cek apakah file bisa diakses (ada)
      return true;
    } catch {
      return false;
    }
  }

  static async tryMoveFile(sourcePath: string, targetPath: string) {
    const exists = await FsService.fileExists(sourcePath);

    if (!exists) {
      console.warn(`File does not exist, skipping move: ${sourcePath}`);
      return;
    }

    await rename(sourcePath, targetPath);
    console.info(`Moved file`, { from: sourcePath, to: targetPath });
  }

  static async loadJsonFileInFolder<T>(folder: string) {
    const entries = await readdir(folder);

    // Use Promise.all to read all JSON files concurrently
    const metadataList: (T | null)[] = await PromiseService.run({
      promises: entries.map(async (entry) => {
        if (path.extname(entry).toLowerCase() === ".json") {
          const metadataPath = join(folder, entry);
          const rawJson = await readFile(metadataPath, "utf-8");
          return JSON.parse(rawJson) as T;
        }
        return null; // Return null for non-JSON files, filtered out later
      }),
    });

    // Filter out any null values in case non-JSON files were included

    return metadataList.filter(Boolean) as T[];
  }

  static async findFile(dir: string, targetFilename: string): Promise<string | undefined> {
    const files = await readdir(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        const result = await this.findFile(fullPath, targetFilename);
        if (result) return result;
      } else if (file === targetFilename) {
        return fullPath;
      }
    }
    return undefined;
  }

  static async moveFileIfFound(filename: string, searchPath: string, targetDir: string) {
    const foundPath = await this.findFile(searchPath, filename);

    if (!foundPath) {
      console.error(`❌ File not found: ${filename}`);
      return;
    }

    if (!this.folderExist(targetDir)) {
      await mkdir(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, filename);
    await copyFile(foundPath, targetPath);
    console.log(`✅ Copied: ${foundPath} → ${targetPath}`);
  }
}
