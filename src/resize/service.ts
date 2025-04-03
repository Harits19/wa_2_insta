import sharp from "sharp";
import * as fs from "fs/promises";
import * as fsV2 from "fs";
import { AspectRatio } from "./types";
import FileService from "../file/service";

export default class ResizeService {
  aspectRatio: AspectRatio;
  directory: string;

  constructor({
    aspectRatio,
    folderPath: directory,
  }: {
    aspectRatio: AspectRatio;
    folderPath: string;
  }) {
    this.aspectRatio = aspectRatio;
    this.directory = directory;
  }

  get aspectRatioValue() {
    const [width, height] = this.aspectRatio.split("x");

    return parseInt(width) / parseInt(height);
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
    await Promise.all(files.map((file) => this.resizeImage(file)));

    return this.outputDirectory;
  }

  async resizeImage(file: string) {
    const outputPath = this.getOutputPath(file);

    if (fsV2.existsSync(outputPath)) {
      // console.log("file ", outputPath, " already exist, does not need resize");
      console.log("file is exist, start to delete this file ", outputPath);
      await fs.unlink(outputPath);
    }
    const aspectRatio = this.aspectRatioValue;

    const inputPath = this.getInputPath(file); // Replace with your image

    const metadata = await sharp(inputPath).metadata();

    let targetWidth: number;
    let targetHeight: number;

    if (!metadata.height || !metadata.width) {
      return;
    }

    if (metadata.height > metadata.width) {
      // If the image is taller than wide, use the height to calculate the target width
      targetHeight = metadata.height; // Use the original height
      targetWidth = Math.round(targetHeight * aspectRatio); // Calculate width based on aspect ratio
    } else {
      // If the image is wider than tall, use the width to calculate the target height
      targetWidth = metadata.width; // Use the original width
      targetHeight = Math.round(targetWidth / aspectRatio); // Calculate height based on aspect ratio
    }

    try {
      const info = await sharp(inputPath)
        .resize(targetWidth, targetHeight, {
          fit: sharp.fit.contain,
          background: "white",
        })
        .jpeg({ quality: 70 })
        .toFile(outputPath);
    } catch (error) {
      console.log("Error resizing image:", error);
    }
  }
}
