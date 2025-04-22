import path, { join } from "path";
import { InstagramService } from "../instagram/service";
import { AspectRatio } from "../resize/types";
import fs, { readdir, readFile } from "fs/promises";
import { SupplementalMetadataModel } from "./type";
import { MILLISECOND } from "../constants/size";
import MyDate from "../date/service";
import ResizeVideoService from "../resize/video/service";
import VideoService from "../video/service";
import FileService from "../file/service";
import ResizeImageService from "../resize/base-64/service";
import { VideoImageBuffer } from "../instagram/type";

interface LocalInstagramSyncServiceInterface {
  instagram: InstagramService;
}

export default class LocalInstagramSyncService
  implements LocalInstagramSyncServiceInterface
{
  instagram: InstagramService;

  constructor({ instagram }: LocalInstagramSyncServiceInterface) {
    this.instagram = instagram;
  }

  static async create({
    password,
    username,
  }: {
    password: string;
    username: string;
  }) {
    const instagram = await InstagramService.login({ password, username });

    return new LocalInstagramSyncService({ instagram });
  }

  async uploadWithListOfDates({
    dates,
    aspectRatio,
    folderPath,
  }: {
    dates: string[];
    aspectRatio: AspectRatio;
    folderPath: string;
  }) {
    const files = await readdir(folderPath);
    const jsonExt = ".json";

    const jsonFiles: SupplementalMetadataModel[] = [];
    const imageFilesPath: string[] = [];

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();

      if (ext !== jsonExt) {
        imageFilesPath.push(file);
        continue;
      }
      const filePath = join(folderPath, file);
      const rawData = await readFile(filePath, "utf-8");
      const jsonData = JSON.parse(rawData) as SupplementalMetadataModel;
      jsonFiles.push(jsonData);
    }

    const getTimestamp = (value: SupplementalMetadataModel) =>
      Number(value.photoTakenTime.timestamp);

    const sortedJsonFiles = jsonFiles.sort(
      (a, b) => getTimestamp(a) - getTimestamp(b)
    );

    for (const date of dates) {
      const imagesMetadata = sortedJsonFiles.filter((item) => {
        const photoTakenTime = getTimestamp(item);
        const takenDate = new MyDate(photoTakenTime * MILLISECOND);
        const formattedDate = takenDate.formatDate();
        return formattedDate === date;
      });

      const imageFiles: VideoImageBuffer[] = [];

      for (const metadata of imagesMetadata) {
        const isFileExist = imageFilesPath.find(
          (image) => image.toLowerCase() === metadata.title.toLowerCase()
        );

        if (!isFileExist) {
          // throw new Error(`file ${metadata.title} does'nt exist`);
          continue;
        }
        const filePath = join(folderPath, metadata.title);

        const type = await FileService.getFileType(filePath);

        if (!type) {
          console.error("Unsupported file type");
          continue;
        }

        const buffer = await readFile(filePath);

        imageFiles.push({ buffer, type });
      }

      await this.instagram.publishMultiplePost({
        aspectRatio: "1x1",
        caption: date,
        items: imageFiles,
      });
    }
  }
}
