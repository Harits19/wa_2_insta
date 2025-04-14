import { env, envService } from "./env/service";
import GoogleOauthService from "./google-oauth/service";
import GooglePhotoService from "./google-photo/service";
import { InstagramService } from "./instagram/service";
import fs, { mkdir } from "fs";
import ResizeImageService from "./resize/base-64/service";
import ResizeVideoService from "./resize/video/service";
import path from "path";
import FsService from "./fs/service";
import { AspectRatio } from "./resize/types";
import PromiseService from "./promise/service";

async function main() {
  envService.checkENV();

  const googleOauth = await GoogleOauthService.create();
  const instagramService = await InstagramService.login({
    cookiesKey: "local",
    password: env.INSTAGRAM_PASSWORD,
    username: env.INSTAGRAM_USERNAME,
  });
  const googlePhoto = new GooglePhotoService({ googleOauth });

  let pageToken: string | undefined;

  do {
    const result = await googlePhoto.getImage({
      pageToken,
      date: {
        day: 17,
        month: 4,
        year: 2013,
      },
    });
    const aspectRatio: AspectRatio = "1x1";
    const resizeService = new ResizeImageService({ aspectRatio });
    const promises = result.result.map(async (item) => {
      if (item.mimeType.startsWith("video")) {
        const fsService = new FsService({
          value: item.buffer,
          filename: item.filename,
        });
        const output = await fsService.createTempFile();
        const videoService = new ResizeVideoService({
          aspectRatio,
          filePath: output,
          
        });
        const result = await videoService.getInstagramReadyVideo();
        return {
          video: result,
        };
      }

      if (item.mimeType.startsWith("image")) {
        return {
          image: await resizeService.resizeImage(item.buffer),
        };
      }

      throw new Error(`Unsupported this ${item.mimeType} mime type format `);
    });

    const resizeResult = await PromiseService.run({ promises });

    await instagramService.publishAlbum({
      items: resizeResult.map((item) => ({
        coverImage: item.video?.thumbnail!,
        file: item.image,
        video: item.video?.resizedVideo!,
      })),
    });

    pageToken = result.pageToken;
  } while (pageToken);
}

main();
