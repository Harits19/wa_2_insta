import path, { join } from "path";
import { InstagramService } from "../instagram/service";
import { AspectRatio } from "../resize/types";
import fs, { readdir, readFile } from "fs/promises";
import { SupplementalMetadataModel } from "./type";
import { SECOND } from "../constants/size";
import MyDate from "../date/service";
import FileService from "../file/service";
import { ErrorMultiplePost, VideoImageBuffer } from "../instagram/type";
import AppStateService from "../app-state/service";
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
    dates: MyDate[];
    aspectRatio: AspectRatio;
    folderPath: string;
  }) {
    console.log("start read directory ", folderPath);
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

    console.log(
      "total json files",
      jsonFiles.length,
      "total image files",
      jsonFiles.length
    );

    const getTimestamp = (value: SupplementalMetadataModel) =>
      Number(value.photoTakenTime.timestamp);

    const sortedJsonFiles = jsonFiles.sort(
      (a, b) => getTimestamp(a) - getTimestamp(b)
    );

    for (const [index, date] of dates.entries()) {
      try {
        console.log("start read files with date ", date.formatDate());

        await AppStateService.updateStartDate(date.formatDate());

        const imagesMetadata = sortedJsonFiles.filter((item) => {
          const photoTakenTime = getTimestamp(item);
          const takenDate = new MyDate(photoTakenTime * SECOND);
          const formattedDate = takenDate.formatDate();
          return formattedDate === date.formatDate();
        });

        const imageFiles: VideoImageBuffer[] = [];

        for (const metadata of imagesMetadata) {
          const isFileExist = imageFilesPath.find(
            (image) => image.toLowerCase() === metadata.title.toLowerCase()
          );

          if (!isFileExist) {
            throw new Error(`file ${metadata.title} does'nt exist`);
          }
          const filePath = join(folderPath, metadata.title);

          const type = await FileService.getFileType(filePath);

          const buffer = await readFile(filePath);

          imageFiles.push({ buffer, type });
        }

        console.log(
          `image files length ${imageFiles.length}, image metadata length ${imagesMetadata.length}`
        );

        if (imageFiles.length !== imagesMetadata.length) {
          throw new Error(
            `image and metadata length not match, image ${imageFiles.length}, metadata ${imagesMetadata.length} `
          );
        }

        if (imageFiles.length === 0 && imagesMetadata.length === 0) {
          console.log(`empty file, skip date ${date.formatDate()}`);
          continue;
        }

        await this.instagram.publishMultiplePost({
          aspectRatio,
          caption: date.formatDate(),
          items: imageFiles,
          onSuccess: async () => {
            const nextDate = dates.at(index + 1);
            console.log("nextDate", nextDate?.formatDate());
            if (nextDate) {
              await AppStateService.updateStartDate(nextDate.formatDate());
            }
          },
        });
      } catch (error) {
        if (error instanceof ErrorMultiplePost) {
          await AppStateService.handleErrorUpload({
            date: date.formatDate(),
            error,
            startIndex: error.startIndex,
          });
        } else if (error instanceof Error) {
          await AppStateService.handleErrorUpload({
            date: date.formatDate(),
            error,
          });
        } else {
          await AppStateService.handleErrorUpload({
            date: date.formatDate(),
            error: new Error(`Unexpected error ${JSON.stringify(error)}`),
          });
        }

        throw error;
      }
    }
  }
}
