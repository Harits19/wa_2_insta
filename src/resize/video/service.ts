import AnalyzeSizeService from "../../analyze-size/service";
import ffmpeg, { FfprobeStream } from "fluent-ffmpeg";
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

  async resizeVideo() {
    const { height, width, format } = await this.videoMetadata();
    console.log({ height, width, format });
    const { targetHeight, targetWidth } = await this.analyze({
      height,
      width,
    });

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

  async videoMetadata() {
    return new Promise<FfprobeStream>((resolve, reject) => {
      ffmpeg.ffprobe(this.filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(
          (stream) => stream.codec_type === "video"
        );
        if (videoStream) {
          resolve(videoStream);
        } else {
          reject(new Error("No video stream found"));
        }
      });
    });
  }

  async getVideoThumbnail({ duration = 3000 }: { duration?: number }): Promise<Buffer> {
    const outputChunks: Buffer[] = [];

    return new Promise(async (resolve, reject) => {
      
      ffmpeg(this.filePath)
      .seekInput(2)
      .frames(1)
      .outputOptions('-vframes', '1')
      .format('mjpeg') // 💥 JPG output!
      .on('error', async (err) => {
        reject(err);
      })
      .on('end', async () => {
        console.log('outputChunks', outputChunks.length);
        resolve(Buffer.concat(outputChunks));
      })
      .pipe()
      .on('data', (chunk: Buffer) => outputChunks.push(chunk));
      
    });
  }
}
