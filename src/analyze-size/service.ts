import { AspectRatio } from "../resize/types";

export default class AnalyzeSizeService {
  aspectRatio: AspectRatio;

  constructor({ aspectRatio }: { aspectRatio: AspectRatio }) {
    this.aspectRatio = aspectRatio;
  }

  get aspectRatioValue() {
    const [width, height] = this.aspectRatio.split("x");

    return parseInt(width) / parseInt(height);
  }

  static getAspectRatio(aspectRatio: AspectRatio) {
    const [width, height] = aspectRatio.split("x");

    return parseInt(width) / parseInt(height);
  }

  analyze(metadata: { width?: number; height?: number }) {
    const aspectRatio = this.aspectRatioValue;

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

    return {
      targetHeight,
      targetWidth,
    };
  }

  static analyze({
    aspectRatio: aspectRatioString,
    ...metadata
  }: {
    width?: number;
    height?: number;
    aspectRatio: AspectRatio;
  }) {
    const aspectRatio = this.getAspectRatio(aspectRatioString);

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

    return {
      targetHeight,
      targetWidth,
    };
  }
}
