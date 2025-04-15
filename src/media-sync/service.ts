import GooglePhotoService from "../google-photo/service";
import { instagramConstant } from "../instagram/constant";
import { InstagramService } from "../instagram/service";
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
  }: {
    aspectRatio: AspectRatio;
  }) {
    let pageToken: string | undefined;

    do {
      const result = await this.googlePhoto.search({
        pageSize: instagramConstant.max.post,
        pageToken,
        date: {
          day: 17,
          month: 4,
          year: 2013,
        },
      });

      const downloadedItems = await PromiseService.run({
        promises: result.items.map((item) =>
          this.googlePhoto.download({ item: item })
        ),
      });

      await this.instagram.publishAlbumV2({
        aspectRatio,
        items: downloadedItems.map((item) => ({
          buffer: item.buffer,
          filename: item.filename,
          type: item.type,
        })),
      });

      pageToken = result.pageToken;
    } while (pageToken);
  }
}
