import AnalyzeSizeService from "../../analyze-size/service";
import ffmpeg, { FfprobeData, FfprobeStream } from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import { AspectRatio } from "../types";
import { writeFile } from "fs/promises";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path); // no weird regex needed

export default class ResizeVideoService extends AnalyzeSizeService {
  filePath: string;

  constructor({
    aspectRatio,
    filePath,
  }: {
    aspectRatio: AspectRatio;
    filePath: string;
  }) {
    super({ aspectRatio });
    this.filePath = filePath;
  }

  async instagramReadyVideo() {
    const metadata = await this.getVideoMetadata();
    const resizedVideo = await this.resizeVideo(metadata);
    const duration = metadata.format.duration;
    if (!duration) {
      throw new Error("No duration found");
    }

    const thumbnail = await this.getVideoThumbnail({
      duration,
    });

    return {
      thumbnail,
      resizedVideo,
    };
  }

  async resizeVideo(metadata: FfprobeData) {
    const videoMetadata = metadata.streams.find(
      (item) => item.codec_type === "video"
    );

    const duration = metadata.format.duration;

    if (!videoMetadata) {
      throw new Error("No video stream found");
    }

    const { height, width } = videoMetadata;
    console.log({ height, width, duration });

    const { targetHeight, targetWidth } = await this.analyze({
      height,
      width,
    });
    console.log({ targetHeight, targetWidth });

    const result = await this.resizeVideoStream({
      targetHeight,
      targetWidth,
    });

    return result;
  }

  async resizeVideoStream({
    targetHeight,
    targetWidth,
  }: {
    targetWidth: number;
    targetHeight: number;
  }) {
    return new Promise<Buffer>((resolve, reject) => {
      const outputChunks: Buffer[] = [];
      ffmpeg(this.filePath)
        .inputFormat("mp4")
        .videoFilters([
          `scale=w=${targetWidth}:h=${targetHeight}:force_original_aspect_ratio=decrease`,
          `pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:white`,
        ])
        .format("mp4") // must match output type!
        .outputOptions("-movflags frag_keyframe+empty_moov") //
        .on("error", (err) => {
          reject(err);
        })
        .on("end", () => {
          resolve(Buffer.concat(outputChunks));
        })
        .pipe()
        .on("data", (chunk: Buffer) => {
          outputChunks.push(chunk);
        });
    });
  }

  async getVideoMetadata() {
    return new Promise<FfprobeData>((resolve, reject) => {
      ffmpeg.ffprobe(this.filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(metadata);
      });
    });
  }

  async getVideoThumbnail({ duration }: { duration: number }): Promise<Buffer> {
    const outputChunks: Buffer[] = [];

    const timestamp = +(Math.random() * Math.max(1, duration - 1)).toFixed(2);

    return new Promise(async (resolve, reject) => {
      ffmpeg(this.filePath)
        .seekInput(timestamp)
        .frames(1)
        .outputOptions("-vframes", "1")
        .format("mjpeg") // 💥 JPG output!
        .on("error", async (err) => {
          reject(err);
        })
        .on("end", async () => {
          console.log("outputChunks", outputChunks.length);
          resolve(Buffer.concat(outputChunks));
        })
        .pipe()
        .on("data", (chunk: Buffer) => outputChunks.push(chunk));
    });
  }
}
