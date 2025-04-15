import { env, envService } from "./env/service";
import GooglePhotoService from "./google-photo/service";
import { InstagramService } from "./instagram/service";
import ResizeImageService from "./resize/base-64/service";
import ResizeVideoService from "./resize/video/service";
import FsService from "./fs/service";
import { AspectRatio } from "./resize/types";
import PromiseService from "./promise/service";
import { instagramConstant } from "./instagram/constant";

async function main() {
  envService.checkENV();

  const instagramS = await InstagramService.login({
    cookiesKey: "local",
    password: env.INSTAGRAM_PASSWORD,
    username: env.INSTAGRAM_USERNAME,
  });
  const googlePhoto = await GooglePhotoService.create();

}

main();
