import AnalyzeSizeService from "../../analyze-size/service";
import ffmpeg, { FfprobeData, FfprobeStream } from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import { AspectRatio } from "../types";
import VideoService from "../../video/service";
import { randomUUID } from "crypto";
import { extname } from "path";
import FsService from "../../fs/service";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path); // no weird regex needed

export default class ResizeVideoService extends AnalyzeSizeService {
  filePath: string;
  metadata: FfprobeData;

  constructor({
    aspectRatio,
    filePath,
    metadata,
  }: {
    aspectRatio: AspectRatio;
    filePath: string;
    metadata: FfprobeData;
  }) {
    super({ aspectRatio });
    this.filePath = filePath;
    this.metadata = metadata;
  }

  static async create({
    aspectRatio,
    filePath,
  }: {
    aspectRatio: AspectRatio;
    filePath: string;
  }) {
    const videoService = new VideoService({ path: filePath });

    const metadata = await videoService.getVideoMetadata();

    return new ResizeVideoService({ aspectRatio, filePath, metadata });
  }

  async resizeVideo() {
    const metadata = this.metadata;
    const videoMetadata = metadata.streams.find(
      (item) => item.codec_type === "video"
    );

    if (!videoMetadata) {
      throw new Error("No video stream found");
    }

    const { height, width } = videoMetadata;

    const { targetHeight, targetWidth } = await this.analyze({
      height,
      width,
    });

    console.log(
      this.filePath,
      " convert height from ",
      height,
      " to ",
      targetHeight
    );
    console.log(
      this.filePath,
      "convert width from ",
      width,
      " to ",
      targetWidth
    );

    const result = await this.resizeVideoStream({
      targetHeight,
      targetWidth,
    });

    console.log(this.filePath, "success convert", width, " to ", targetWidth);

    return result;
  }

  async resizeLargeVideo(): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const metadata = this.metadata;
      const videoMetadata = metadata.streams.find(
        (item) => item.codec_type === "video"
      );

      if (!videoMetadata) {
        throw new Error("No video stream found");
      }

      const { height, width } = videoMetadata;

      const { targetHeight, targetWidth } = await this.analyze({
        height,
        width,
      });

      console.log(
        this.filePath,
        " convert height from ",
        height,
        " to ",
        targetHeight
      );
      console.log(
        this.filePath,
        "convert width from ",
        width,
        " to ",
        targetWidth
      );

      const temporaryPath = FsService.getTemporaryPath(this.filePath);
      this.createStream({
        targetHeight,
        targetWidth,
        onEnd: () => {
          resolve(temporaryPath);
        },
        onError: reject,
      }).save(temporaryPath);

      console.log(this.filePath, "success convert", width, " to ", targetWidth);
    });
  }

  private async resizeVideoStream({
    targetHeight,
    targetWidth,
  }: {
    targetWidth: number;
    targetHeight: number;
  }) {
    return new Promise<Buffer>((resolve, reject) => {
      const outputChunks: Buffer[] = [];

      const stream = this.createStream({
        targetHeight,
        targetWidth,
        onError(err) {
          reject(err);
        },
        onEnd: () => {
          resolve(Buffer.concat(outputChunks));
        },
      });
      stream.pipe().on("data", (chunk: Buffer) => {
        outputChunks.push(chunk);
      });
    });
  }

  createStream({
    targetHeight,
    targetWidth,
    onError,
    onEnd,
  }: {
    targetWidth: number;
    targetHeight: number;
    onError: (err: Error) => void;
    onEnd: () => void;
  }) {
    return ffmpeg(this.filePath)
      .inputFormat("mp4")
      .videoFilters([
        `scale=w=${targetWidth}:h=${targetHeight}:force_original_aspect_ratio=decrease`,
        `pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:white`,
      ])
      .format("mp4") // must match output type!
      .outputOptions("-movflags frag_keyframe+empty_moov") //
      .on("error", (err) => {
        onError(err);
      })
      .on("end", () => {
        onEnd();
      });
  }
}
