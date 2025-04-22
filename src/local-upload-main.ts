import { env } from "./env/service";
import LocalInstagramSyncService from "./local-instagram-sync/service";
import path from "path";
import os from "os";
import { readdir, readFile } from "fs/promises";

export default async function main() {
  const localUpload = await LocalInstagramSyncService.create({
    username: env.INSTAGRAM_USERNAME,
    password: env.INSTAGRAM_PASSWORD,
  });

  const folderPath = path.join(
    os.homedir(),
    "Downloads",
    "Backup Google Photo",
    "Takeout",
    "Google Foto",
    "Photos from 2018"
  );

  localUpload.uploadWithListOfDates({
    aspectRatio: "1x1",
    dates: ["31 Dec 2018"],
    folderPath,
  });
}

main();
