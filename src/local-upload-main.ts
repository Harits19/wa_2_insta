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

  const dates = new MyDate(appState.date.start).getDatesBetween(
    new MyDate(appState.date.end)
  );

  console.log(
    "dates",
    dates.map((item) => item.formatDate())
  );

  await localUpload.uploadWithListOfDates({
    aspectRatio: "1x1",
    dates,
    folderPath,
  });
}

main();
