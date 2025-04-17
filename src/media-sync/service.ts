import { RawDate } from "../date/type";
import GooglePhotoService from "../google-photo/service";
import { DownloadedMediaItem } from "../google-photo/type";
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

  async syncGooglePhotoToInstagram({
    aspectRatio,
    date,
  }: {
    aspectRatio: AspectRatio;
    date: RawDate;
  }) {
    let pageToken: string | undefined;
    let leftOverItems: VideoImageResizeResult[] = [];

    let currentCount = 1;

    do {
      const result = await this.googlePhoto.search({
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

      if (result.pageToken) {
        caption = `${caption} (${currentCount})`;
        currentCount++;
      }

     

      leftOverItems = await this.instagram.publishAlbumV2({
        aspectRatio,
        caption,
        items: downloadedItems.map((item) => ({
          buffer: item.buffer,
          filename: item.filename,
          type: item.type,
        })),
      });

      pageToken = result.pageToken;
    } while (pageToken || leftOverItems.length > 0);
  }
}
