import { dummyVideo } from "./constants/dummy";
import { checkENV, env } from "./env/service";
import FsService from "./fs/service";
import { InstagramService } from "./instagram/service";
import { startLocalFileUpload } from "./local/service";
import ResizeVideoService from "./resize/video/service";
import { initWhatsappClient } from "./whatsapp/service";
import fs, { writeFile } from "fs/promises";

export default async function main() {
  checkENV();
  // await initWhatsappClient();
  // await startLocalFileUpload();
  const fsService = new FsService({ base64: dummyVideo });
  const instagramService = new InstagramService({ cookiesKey: "local" });
  await instagramService.initInstagramClient({
    password: env.INSTAGRAM_PASSWORD,
    username: env.INSTAGRAM_USERNAME,
  });

  const tempPath = await fsService.createTempFile();
  const resizeVideo = new ResizeVideoService({
    aspectRatio: "1x1",
    filePath: tempPath,
  });
  const result = await resizeVideo.resizeVideo();
  const thumbnail = await resizeVideo.getVideoThumbnail({});
  console.log({ thumbnail });
  await writeFile("resize.mp4", result);
  await writeFile("thumbnail.jpg", thumbnail);
  console.log({ result });
  await instagramService.publishVideos({
    videos: [
      { video: result, coverImage: thumbnail },
      { video: result, coverImage: thumbnail },
    ],
    caption: "Test caption",
  });
  await fsService.unlink();
}

main();
