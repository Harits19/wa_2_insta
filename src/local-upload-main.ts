import { env } from "./env/service";
import LocalInstagramSyncService from "./local-instagram-sync/service";
import path from "path";
import os from "os";
import MyDate from "./date/service";

export default async function main() {
  const localUpload = await LocalInstagramSyncService.create({
    username: env.INSTAGRAM_USERNAME,
    password: env.INSTAGRAM_PASSWORD,
  });

  const folderPath = path.join(
    os.homedir(),
    "Downloads",
    "Backup Google Photo",
    "result",
    "Takeout",
    "Google Foto",
    "Photos from 2019",
    "Kuliah"
  );

  const dates = new MyDate("12 Feb 2019").getDatesBetween(
    new MyDate("31 Dec 2019")
  );

  console.log(
    "dates",
    dates.map((item) => item.formatDate())
  );

  localUpload.uploadWithListOfDates({
    aspectRatio: "1x1",
    dates,
    folderPath,
  });
}

main();
