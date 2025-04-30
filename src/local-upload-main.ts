import { env } from "./env/service";
import LocalInstagramSyncService from "./local-instagram-sync/service";
import MyDate from "./date/service";
import AppStateService from "./app-state/service";

export default async function main() {
  const localUpload = await LocalInstagramSyncService.create({
    username: env.INSTAGRAM_USERNAME,
    password: env.INSTAGRAM_PASSWORD,
  });

  await AppStateService.init();

  const appState = AppStateService.state;

  const folderPath = appState.uploadFolder;

  await localUpload.uploadWithListOfDates({
    folderPath,
    year: appState.year,
  });
}

main();
