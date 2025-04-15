import { env, envService } from "./env/service";
import GooglePhotoService from "./google-photo/service";
import { InstagramService } from "./instagram/service";
import MediaSyncService from "./media-sync/service";

async function main() {
  envService.checkENV();

  const instagram = await InstagramService.login({
    cookiesKey: "local",
    password: env.INSTAGRAM_PASSWORD,
    username: env.INSTAGRAM_USERNAME,
  });
  const googlePhoto = await GooglePhotoService.create();

  const mediaSyncService = new MediaSyncService({ googlePhoto, instagram });

  await mediaSyncService.syncGooglePhotoToInstagram({ aspectRatio: "16x9" });
}

main();
