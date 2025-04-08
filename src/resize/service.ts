import sharp from "sharp";
import * as fs from "fs/promises";
import * as fsV2 from "fs";
import { AspectRatio } from "./types";
import FileService from "../file/service";

export default class ResizeService {
  aspectRatio: AspectRatio;

  constructor({ aspectRatio }: { aspectRatio: AspectRatio }) {
    this.aspectRatio = aspectRatio;
  }

  get aspectRatioValue() {
    const [width, height] = this.aspectRatio.split("x");

    return parseInt(width) / parseInt(height);
  }

  async resizeImage({ input }: { input: string | Buffer }) {
    try {
      const aspectRatio = this.aspectRatioValue;

      const metadata = await sharp(input).metadata();

      let targetWidth: number;
      let targetHeight: number;

      if (!metadata.height || !metadata.width) {
        throw new Error("empty metadata height and width");
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

      const info = sharp(input)
        .resize(targetWidth, targetHeight, {
          fit: sharp.fit.contain,
          background: "white",
        })
        .jpeg({ quality: 70 });
      return info;
    } catch (error) {
      console.log("Error resizing image:", error);
      throw error;
    }
  }
}
