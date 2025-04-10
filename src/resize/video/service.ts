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
  videoService: VideoService;

  constructor({
    aspectRatio,
    filePath,
  }: {
    aspectRatio: AspectRatio;
    filePath: string;
  }) {
    super({ aspectRatio });
    this.filePath = filePath;
    this.videoService = new VideoService({ path: this.filePath });
  }

  async instagramReadyVideo() {
    const metadata = await this.videoService.getVideoMetadata();
    const resizedVideo = await this.resizeVideo(metadata);
    const duration = metadata.format.duration;
    if (!duration) {
      throw new Error("No duration found");
    }

    const fsService = new FsService({ base64: resizedVideo });
    const tempPath = await fsService.createTempFile();

    const tempVideoService = new VideoService({ path: tempPath });

    const thumbnail = await tempVideoService.getVideoThumbnail({
      duration,
    });

    await fsService.unlink();

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
}
