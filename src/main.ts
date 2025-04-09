import { checkENV, env } from "./env/service";
import FsService from "./fs/service";
import { InstagramService } from "./instagram/service";
import { listAspectRatio } from "./resize/types";
import ResizeVideoService from "./resize/video/service";
import fs, { writeFile } from "fs/promises";

export default async function main() {
  checkENV();
  // await initWhatsappClient();
  // await startLocalFileUpload();

  const videoBuffer = await fs.readFile("video.mp4");
  const dummyVideo = videoBuffer.toString("base64");

  const fsService = new FsService({ base64: dummyVideo });
  const instagramService = new InstagramService({ cookiesKey: "local" });
  await instagramService.initInstagramClient({
    password: env.INSTAGRAM_PASSWORD,
    username: env.INSTAGRAM_USERNAME,
  });

  const tempPath = await fsService.createTempFile();

  for (const aspectRatio of listAspectRatio) {
    const resizeVideoService = new ResizeVideoService({
      aspectRatio: aspectRatio,
      filePath: tempPath,
    });
    const { resizedVideo, thumbnail } =
      await resizeVideoService.instagramReadyVideo();

    await writeFile(`resizedVideo-${aspectRatio}.mp4`, resizedVideo);
  }

  return;

  // await instagramService.publishVideos({
  //   videos: [{ video: resizedVideo, coverImage: thumbnail }],
  //   caption: "Test caption",
  // });
  // await fsService.unlink();
}

main();
