import ffmpeg, { FfprobeData, FfprobeStream } from "fluent-ffmpeg";

export default class VideoService {
  path: string;
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
          console.log("outputChunks", outputChunks.length);
          resolve(Buffer.concat(outputChunks));
        })
        .pipe()
        .on("data", (chunk: Buffer) => outputChunks.push(chunk));
    });
  }

  async getVideoMetadata() {
    return new Promise<FfprobeData>((resolve, reject) => {
      ffmpeg.ffprobe(this.path, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(metadata);
      });
    });
  }
}
