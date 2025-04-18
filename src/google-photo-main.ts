import MyDate from "./date/service";
import { RawDate } from "./date/type";
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

  const dates = [
    "31 Dec 2016",
    "10 May 2017",
    "17 May 2017",
    "18 May 2017",
    "23 May 2017", 
    "13 Jun 2017"
  ];

  for (const dateString of dates) {
    if (!dateString) continue;
    const date = new MyDate(dateString);

    await mediaSyncService.syncGooglePhotoToInstagram({
      aspectRatio: "1x1",
      date: date.toRawDate(),
    });
  }
}

main();
