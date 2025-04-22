import * as fs from "fs/promises";
import path from "path";
import { instagramConstant } from "../instagram/constant";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";

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

  static batchFile<T>({
    batchLength,
    files,
  }: {
    files: T[];
    batchLength: number;
  }) {
    const result: T[][] = [];

    for (let index = 0; index < files.length; index += batchLength) {
      const batch = files.slice(index, index + batchLength);

      result.push(batch);
    }

    return result;
  }

  static async instagramFileReadyToUpload(folderPath: string) {
    const files = await FileService.getAllImageFiles(folderPath);
    const sortFiles = FileService.sortByNumber(files);
    const batchFiles = FileService.batchFile({
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

    function checkIsImage() {
      return sharp(filePath)
        .metadata()
        .then(() => true)
        .catch(() => false);
    }

    function checkIsVideo() {
      return new Promise<boolean>((resolve) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err || !metadata || !metadata.format) {
            resolve(false);
          } else if (metadata.streams.some((s) => s.codec_type === "video")) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
      });
    }

    const [isVideo, isImage] = await Promise.all([
      checkIsVideo(),
      checkIsImage(),
    ]);

    if (isVideo) return "video";
    if (isImage) return "image";
  }
}
