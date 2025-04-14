import sharp from "sharp";
import * as fs from "fs/promises";
import * as fsV2 from "fs";
import { AspectRatio } from "../types";
import FileService from "../../file/service";
import ResizeService from "../service";

export default class ResizeLocalService extends ResizeService {
  directory: string;

  constructor({
    aspectRatio,
    folderPath: directory,
  }: {
    aspectRatio: AspectRatio;
    folderPath: string;
  }) {
    super({ aspectRatio });
    this.directory = directory;
  }

  getInputPath(file: string) {
    return `${this.directory}/${file}`;
  }

  private get outputDirectory() {
    return `${this.directory}/${this.aspectRatio}`;
  }

  getOutputPath(file: string) {
    const path = `${this.outputDirectory}/${file}`;
    return path;
  }

  async createOutputDirectory() {
    try {
      await fs.mkdir(this.outputDirectory);
    } catch (error) {
      console.log(error);
    }
  }

  /**
   *
   * @returns output path all resized image
   */
  async startResizeAllImage() {
    const files = await FileService.getAllImageFiles(this.directory);
    await this.createOutputDirectory();
    await Promise.all(files.map((file) => this.resizeLocalService(file)));

    return this.outputDirectory;
  }

  async resizeLocalService(file: string) {
    try {
      const outputPath = this.getOutputPath(file);

      if (fsV2.existsSync(outputPath)) {
        // console.log("file ", outputPath, " already exist, does not need resize");
        console.log("file is exist, start to delete this file ", outputPath);
        await fs.unlink(outputPath);
      }

      const sharpValue = await this.runResize({ input: file });
      await sharpValue.toFile(outputPath);
    } catch (error) {
      console.log("Error resizing image:", error);
      throw error;
    }
  }
}
