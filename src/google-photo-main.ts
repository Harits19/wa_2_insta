import DateService from "./date/service";
import { env, envService } from "./env/service";
import GooglePhotoService from "./google-photo/service";
import { InstagramService } from "./instagram/service";
import MediaSyncService from "./media-sync/service";

async function main() {
  envService.checkENV();

  const instagram = await InstagramService.login({
    cookiesKey: env.INSTAGRAM_USERNAME,
    password: env.INSTAGRAM_PASSWORD,
    username: env.INSTAGRAM_USERNAME,
  });
  const googlePhoto = await GooglePhotoService.create();

  const mediaSyncService = new MediaSyncService({ googlePhoto, instagram });

  const startDate = {
    day: 21,
    month: 6,
    year: 2013,
  };

  const endDate = {
    day: 21,
    month: 6,
    year: 2013,
  };

  const dates = DateService.getDatesBetween(startDate, endDate);

  for (const date of dates) {
    await mediaSyncService.syncGooglePhotoToInstagram({
      aspectRatio: "1x1",
      date,
    });
  }
}

main();
