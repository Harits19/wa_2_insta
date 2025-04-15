import AnalyzeSizeService from "../../analyze-size/service";
import ffmpeg, { FfprobeData, FfprobeStream } from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import { AspectRatio } from "../types";
import { writeFile } from "fs/promises";
import FsService from "../../fs/service";
import VideoService from "../../video/service";

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


  async resizeVideo(metadata: FfprobeData) {
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

    console.log("convert height from ", height, " to ", targetHeight);
    console.log("convert width from ", width, " to ", targetWidth);


    const result = await this.resizeVideoStream({
      targetHeight,
      targetWidth,
    });

    return result;
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
}
