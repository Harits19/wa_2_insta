import * as fs from "fs/promises";
import path from "path";
import { instagramConstant } from "../instagram/constant";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import { ArrayService } from "../array/service";

export default class FileService {
  static async getAllImageFiles(folderPath: string) {
    const files = await fs.readdir(folderPath);

    const result: string[] = [];

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        continue;
      }

      const imageExtensions = [".jpg", ".jpeg", ".png"];
      const ext = path.extname(filePath).toLowerCase();
      if (!imageExtensions.includes(ext)) {
        continue;
      }

      result.push(file);
    }

    return result;
  }

  /**
   * sort by number of file eg. "xavierstory - 123.jpg"
   */
  static sortByNumber(files: string[]) {
    const getNumber = (value: string) => {
      const numberString = value.split("-").pop()?.split(".").at(0);
      if (!numberString) {
        throw new Error(
          `failed to get number base on filename, filename: ${value}`
        );
      }

      return parseInt(numberString);
    };

    const result = files.sort((a, b) => {
      const numberA = getNumber(a);
      const numberB = getNumber(b);
      return numberA - numberB;
    });

    return result;
  }

  static async instagramFileReadyToUpload(folderPath: string) {
    const files = await FileService.getAllImageFiles(folderPath);
    const sortFiles = FileService.sortByNumber(files);
    const batchFiles = ArrayService.batch({
      files: sortFiles,
      batchLength: instagramConstant.max.post,
    });
    console.log(
      `files length ${files.length}, sorted files length ${sortFiles.length}, batch files length ${batchFiles.length}`
    );
    console.log("result batch files ", JSON.stringify(batchFiles));

    if (batchFiles.length === 0) {
      throw new Error("batch files is empty");
    }
    return batchFiles;
  }

  static async getFileType(filePath: string) {
    const ext = path.extname(filePath).toLowerCase();

    const imageExts = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".gif"];
    const videoExts = [".mp4", ".mov", ".3gp", ".mkv"];

    const isImage = imageExts.includes(ext);
    const isVideo = videoExts.includes(ext);

    if (isImage) return "image";
    if (isVideo) return "video";
    throw new Error(`${filePath} Unsupported file type with extension ${ext}`);
  }

  static getFileSizeBuffer(value?: Buffer) {
    if (!value) {
      return 0;
    }
    const sizeInBytes = value.length;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    return Number(sizeInMB.toFixed(2));
  }

  static totalFileSize(items: Buffer[]) {
    const totalFileSize = items.reduce((prev, curr) => {
      const getSize = this.getFileSizeBuffer;

      const size = getSize(curr);

      return prev + size;
    }, 0);

    return totalFileSize;
  }
}
