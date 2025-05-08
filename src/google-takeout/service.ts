import { mkdir, readdir, readFile } from "fs/promises";
import path, { join } from "path";
import FsService from "../fs/service";
import { getTimestamp, SupplementalMetadataModel } from "./type";
import MyDate from "../date/service";
import { SECOND } from "../constants/size";



export default class GoogleTakeoutService {
  static async organizeGooglePhotoByDate(folderPath: string) {
      console.info("Scanning directory for JSON metadata files", folderPath);
  
      const directoryEntries = await readdir(folderPath);
  
      for (const entry of directoryEntries) {
        if (path.extname(entry).toLowerCase() !== FsService.extension.json)
          continue;
  
        const metadataPath = join(folderPath, entry);
        const rawJson = await readFile(metadataPath, "utf-8");
        const metadata = JSON.parse(rawJson) as SupplementalMetadataModel;
  
        const imageFilename = metadata.title;
        const imagePath = join(folderPath, imageFilename);
  
        const takenDate = new MyDate(getTimestamp(metadata) * SECOND);
        const datedFolderPath = join(folderPath, takenDate.formatDate());
  
        await mkdir(datedFolderPath, { recursive: true });
  
        await FsService.tryCopyFile(
          imagePath,
          join(datedFolderPath, imageFilename)
        );
        await FsService.tryCopyFile(metadataPath, join(datedFolderPath, entry));
      }
    }
}