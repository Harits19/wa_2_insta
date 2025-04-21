import MyDate from "./date/service";
import { env, envService } from "./env/service";
import GooglePhotoInstagramSync from "./google-photo-instagram-sync/service";

async function main() {
  envService.checkENV();

  const dates = env.GOOGLE_PHOTO_DATES_BACKUP.split(",");

  const googlePhotoInstagram = await GooglePhotoInstagramSync.create({
    password: env.INSTAGRAM_PASSWORD,
    username: env.INSTAGRAM_USERNAME,
  });

  for (const dateString of dates) {
    if (!dateString) continue;
    const date = new MyDate(dateString);

    await googlePhotoInstagram.uploadToInstagram({
      aspectRatio: "1x1",
      date: date.toRawDate(),
    });
  }
}

main();
