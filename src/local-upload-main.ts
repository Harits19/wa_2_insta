import { env } from "./env/service";
import LocalInstagramSyncService from "./local-instagram-sync/service";
import path from "path";
import os from "os";
import { readdir, readFile } from "fs/promises";
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
    "Photos from 2018"
  );

  const dates = new MyDate("23 Jan 2018").getDatesBetween(
    new MyDate("27 Dec 2018")
  );

  console.log(
    "dates",
    dates.map((item) => item.formatDate())
  );

  localUpload.uploadWithListOfDates({
    filter: {
      caption: "23 Jan 2018",
      startIndex: 0,
    },
    aspectRatio: "1x1",
    dates,
    folderPath,
  });
}

main();
