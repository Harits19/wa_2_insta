import path, { join } from "path";
import { InstagramService } from "../instagram/service";
import { AspectRatio } from "../resize/types";
import fs, { readdir, readFile } from "fs/promises";
import { getTimestamp, SupplementalMetadataModel } from "../google-takeout/type";
import { SECOND } from "../constants/size";
import MyDate from "../date/service";
import FsService from "../fs/service";
import { ErrorMultiplePost, VideoImageBuffer } from "../instagram/type";
import AppStateService from "../app-state/service";
import FileService from "../file/service";
import PromiseService from "../promise/service";
import GoogleTakeoutService from "../google-takeout/service";
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
    folderPath,
    year,
  }: {
    folderPath: string;
    year: string;
  }) {
    await GoogleTakeoutService.organizeGooglePhotoByDate(folderPath);

    const appState = AppStateService.state;
    const startDate = new MyDate(appState.filter?.caption || `1 Jan ${year}`);
    const endDate = new MyDate(`31 Dec ${year}`);
    const dates = startDate.getDatesBetween(endDate);

    console.log({ dates, startDate, endDate, year });

    for (const [index, date] of dates.entries()) {
      await this.processPostsByDate({
        date,
        folderPath,
        dates,
        index,
      });
    }
  }

 

  private async loadImageBuffers(
    metadataList: SupplementalMetadataModel[],
    folder: string
  ): Promise<VideoImageBuffer[]> {
    // Use Promise.all to read and process image files concurrently
    const buffers: VideoImageBuffer[] = [];

    const errors: { error: any; metadata: SupplementalMetadataModel }[] = [];

    for (const metadata of metadataList) {
      try {
        const filePath = join(folder, metadata.title);
        const type = await FileService.getFileType(filePath);
        const buffer = await readFile(filePath);
        buffers.push({
          buffer,
          type,
          filename: metadata.title,
        } as VideoImageBuffer);
      } catch (error: any) {
        errors.push({ error, metadata });
      }
    }

    for (const error of errors) {
      const code = error?.error?.code;

      if (code === "ENOENT") {
        await FsService.moveFileIfFound(
          error.metadata.title,
          join(folder, ".."),
          folder
        );
        continue;
      }

      throw error;
    }

    if (errors.length > 0) {
      return this.loadImageBuffers(metadataList, folder);
    }

    return buffers;
  }

  private async loadJsonMetadata(folder: string) {
    const metadataList =
      await FsService.loadJsonFileInFolder<SupplementalMetadataModel>(folder);

    return metadataList.sort((a, b) => getTimestamp(a) - getTimestamp(b));
  }

  private async handleError(date: MyDate, error: unknown) {
    const dateString = date.formatDate();

    if (error instanceof ErrorMultiplePost) {
      console.error(`Upload failed for ${dateString}:`, error.message);
      await AppStateService.handleErrorUpload({
        date: dateString,
        error,
        startIndex: error.startIndex,
      });
    } else if (error instanceof Error) {
      console.error(`Unexpected error on ${dateString}:`, error.message);
      await AppStateService.handleErrorUpload({
        date: dateString,
        error,
      });
    } else {
      console.error(`Unknown error for ${dateString}:`, error);
      await AppStateService.handleErrorUpload({
        date: dateString,
        error: new Error(`Unexpected error: ${JSON.stringify(error)}`),
      });
    }
  }

  private async processPostsByDate({
    date,
    folderPath,
    dates,
    index,
  }: {
    date: MyDate;
    folderPath: string;
    dates: MyDate[];
    index: number;
  }) {
    try {
      const dateString = date.formatDate();
      console.info("Processing posts for date", dateString);

      await AppStateService.updateCaption(dateString);

      const dailyFolder = join(folderPath, dateString);
      const folderExists = await FsService.folderExist(dailyFolder);

      if (!folderExists) {
        console.warn(`Folder not found: ${dailyFolder}`);
        return;
      }

      const metadataList = await this.loadJsonMetadata(dailyFolder);
      const imageBuffers = await this.loadImageBuffers(
        metadataList,
        dailyFolder
      );

      await AppStateService.updateFilename(imageBuffers.at(0)?.filename);

      await this.instagram.publishMultiplePost({
        aspectRatio: "1x1",
        caption: dateString,
        items: imageBuffers,
        onSuccess: async () => {
          const nextDate = dates.at(index + 1)?.formatDate();
          if (nextDate) {
            await AppStateService.updateCaption(nextDate);
          }
        },
      });
    } catch (error) {
      await this.handleError(date, error);
      throw error;
    }
  }
}
