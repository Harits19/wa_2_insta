import * as fs from "fs/promises";
import path from "path";

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

  static batchFile(files: string[]) {
    const INSTAGRAM_MAX_POST = 10;

    const result: string[][] = [];

    for (let index = 0; index < files.length; index += INSTAGRAM_MAX_POST) {
      const batch = files.slice(index, index + INSTAGRAM_MAX_POST);

      result.push(batch);
    }

    return result;
  }

  static async instagramFileReadyToUpload(folderPath: string) {
    const files = await FileService.getAllImageFiles(folderPath);
    const sortFiles = FileService.sortByNumber(files);
    const batchFiles = FileService.batchFile(sortFiles);
    console.log(
      `files length ${files.length}, sorted files length ${sortFiles.length}, batch files length ${batchFiles.length}`
    );
    console.log("result batch files ", JSON.stringify(batchFiles));

    if (batchFiles.length === 0) {
      throw new Error("batch files is empty");
    }
    return batchFiles;
  }
}
