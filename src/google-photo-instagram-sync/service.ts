import MyDate from "../date/service";
import { RawDate } from "../date/type";
import GooglePhotoService from "../google-photo/service";
import { instagramConstant } from "../instagram/constant";
import { InstagramService } from "../instagram/service";
import { VideoImageResizeResult } from "../instagram/type";

import PromiseService from "../promise/service";
import { AspectRatio } from "../resize/types";

export default class MediaSyncService {
  instagram: InstagramService;
  googlePhoto: GooglePhotoService;

  constructor({
    googlePhoto,
    instagram,
  }: {
    instagram: InstagramService;
    googlePhoto: GooglePhotoService;
  }) {
    this.googlePhoto = googlePhoto;
    this.instagram = instagram;
  }

  static async create({
    password,
    username,
  }: {
    password: string;
    username: string;
  }) {
    const instagram = await InstagramService.login({
      password,
      username,
    });
    const googlePhoto = await GooglePhotoService.create();

    return new MediaSyncService({ googlePhoto, instagram });
  }

  async uploadWithListOfDate({
    dates,
    aspectRatio,
  }: {
    dates: MyDate[];
    aspectRatio: AspectRatio;
  }) {
    for (const date of dates) {
      if (!date) continue;

      await this.uploadToInstagram({
        aspectRatio,
        date: date.toRawDate(),
      });
    }
  }

  async uploadToInstagram({
    aspectRatio,
    date,
  }: {
    aspectRatio: AspectRatio;
    date: RawDate;
  }) {
    let pageToken: string | undefined;
    let leftOverItems: VideoImageResizeResult[] = [];

    let currentCount = 1;
    let isLastItem = false;

    do {
      const result = await this.googlePhoto.search({
        isLastItem,
        pageSize: instagramConstant.max.post,
        pageToken,
        date,
      });

      const downloadedItems = await PromiseService.run({
        promises: result.items.map((item) =>
          this.googlePhoto.download({ item: item })
        ),
      });
      let caption = `${date.day}/${date.month}/${date.year}`;

      pageToken = result.pageToken;

      const { leftoverItems: leftOverItemsResult, publishItems } =
        await this.instagram.processVideo({
          aspectRatio,
          leftOverItems,
          items: downloadedItems.map((item) => ({
            buffer: item.buffer,
            filename: item.filename,
            type: item.type,
          })),
        });

      leftOverItems = leftOverItemsResult;

      if (pageToken || leftOverItems.length > 0 || currentCount > 1) {
        caption = `${caption} (${currentCount})`;
      }

      currentCount++;
      isLastItem = !pageToken && currentCount > 1;

      await this.instagram.publishAlbum({
        caption,
        items: publishItems.map((item) => ({
          coverImage: item.video?.thumbnail!,
          file: item.image!,
          video: item.video?.buffer!,
        })),
      });
    } while (pageToken || leftOverItems.length > 0);
  }
}
