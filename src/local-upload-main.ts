import AppStateService from "./app-state/service";
import { env } from "./env/service";
import LocalInstagramSyncService from "./local-instagram-sync/service";

async function main() {
  try {
    console.log("start");
    const localUpload = await LocalInstagramSyncService.create({
      username: env.INSTAGRAM_USERNAME,
      password: env.INSTAGRAM_PASSWORD,
    });

    await AppStateService.init();

    const appState = AppStateService.state;

    const folderPath = appState.uploadFolder;
    console.log({ folderPath });

    await localUpload.uploadWithPath(folderPath);
    console.log("end");
  } catch (error) {
    console.error(error);
  }
}

main();
