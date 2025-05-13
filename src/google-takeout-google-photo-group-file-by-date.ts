import GoogleTakeoutService from "./google-takeout/service";
import { prompt } from "./prompt/service";

async function main() {
  const folderPath = "/Users/abdullah.harits/Downloads/Backup Google Photo/result/Takeout/Google Foto/Photos from 2025"
  await GoogleTakeoutService.organizeGooglePhotoByDate(folderPath);
  
}

main();
