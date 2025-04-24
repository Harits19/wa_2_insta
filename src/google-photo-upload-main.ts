import MyDate from "./date/service";
import { env, envService } from "./env/service";
import GooglePhotoInstagramSync from "./google-photo-instagram-sync/service";

async function main() {
  envService.checkENV();


  const googlePhotoInstagram = await GooglePhotoInstagramSync.create({
    password: env.INSTAGRAM_PASSWORD,
    username: env.INSTAGRAM_USERNAME,
  });

  await googlePhotoInstagram.uploadWithListOfDate({
    aspectRatio: "1x1",
    dates: [].map((date) => new MyDate(date)),
  });
}

main();
