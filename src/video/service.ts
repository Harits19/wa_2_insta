import { randomUUID } from "crypto";
import ffmpeg, { FfprobeData, FfprobeStream } from "fluent-ffmpeg";
import { PassThrough } from "stream";
import FsService from "../fs/service";
import { mkdir, readFile, unlink } from "fs/promises";
import { dirname } from "path";

export default class VideoService {
  path: string;
  metadata?: FfprobeData;
  constructor({ path }: { path: string }) {
    this.path = path;
  }

  async getVideoThumbnail({ duration }: { duration: number }): Promise<Buffer> {
    const outputChunks: Buffer[] = [];

    const timestamp = +(Math.random() * Math.max(1, duration - 1)).toFixed(2);

    return new Promise(async (resolve, reject) => {
      ffmpeg(this.path)
        .seekInput(timestamp)
        .frames(1)
        .outputOptions("-vframes", "1")
        .format("mjpeg") // 💥 JPG output!
        .on("error", async (err) => {
          reject(err);
        })
        .on("end", async () => {
          resolve(Buffer.concat(outputChunks));
        })
        .pipe()
        .on("data", (chunk: Buffer) => outputChunks.push(chunk));
    });
  }

  async getVideoMetadata() {
    if (this.metadata) return this.metadata;
    return new Promise<FfprobeData>((resolve, reject) => {
      ffmpeg.ffprobe(this.path, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        this.metadata = metadata;
        resolve(metadata);
      });
    });
  }

  async aviToMp4() {
    console.log("start convert avi to mp4");
    const outputPath = `temporary/converted-${randomUUID()}.mp4`;
    await mkdir(dirname(outputPath), { recursive: true });

    return new Promise<string>((resolve, reject) => {
      ffmpeg(this.path)
        .outputOptions([
          "-map 0",
          "-c:v libx264",
          "-preset veryfast",
          "-c:a aac",
          "-b:a 128k",
          "-movflags +faststart",
          "-f mp4",
        ])
        .on("start", (cmd) => {
          console.log("[FFMPEG COMMAND]", cmd);
        })
        .on("stderr", (stderrLine) => {
          console.log("[FFMPEG STDERR]", stderrLine);
        })
        .on("error", (err, stdout, stderr) => {
          console.error("Error converting to mp4:", err.message);
          console.error("stdout:", stdout);
          console.error("stderr:", stderr);
          reject(err);
        })
        .on("end", () => {
          resolve(outputPath);
        })
        .save(outputPath);
    });
  }

  async splitVideo({ maxDurationPerFile, totalDuration }: { maxDurationPerFile: number, totalDuration?: number }) {
    if (!totalDuration) {
      const metadata = await this.getVideoMetadata();
      totalDuration = metadata.format.duration;
    }

    if (!totalDuration) {
      throw new Error("Duration is undefined");
    }

    const totalChunks = Math.ceil(totalDuration / maxDurationPerFile);
    const id = randomUUID();

    const buffers: {
      path: string;
      duration: number;
    }[] = [];

    for (let index = 0; index < totalChunks; index++) {
      const outputPath = `temporary/${id}-${index + 1}.mp4`;

      await FsService.createFile({ outputPath: outputPath });
      const start = index * maxDurationPerFile;

      let duration = maxDurationPerFile;

      const isLastFile = (totalChunks -1) === index;

      if(isLastFile){
        duration = totalDuration % maxDurationPerFile;
      }

      await new Promise<void>((resolve, reject) => {
        ffmpeg(this.path)
          .setStartTime(start)
          .setDuration(maxDurationPerFile)
          .output(outputPath)
          .on("end", (value) => {
            console.log('end split video', value);
            resolve();
          })
          .on("error", reject)
          .run();
      });

      buffers.push({
        duration,
        path: outputPath,
      });

    }

    return buffers;
  }
}
