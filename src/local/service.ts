import { IgApiClient } from "instagram-private-api";
import { listFolder, prefixPath } from "../constants/file";
import FileService from "../file/service";
import { InstagramService } from "../instagram/service";
import ResizeService from "../resize/service";
import { env } from "../env/service";

export async function startLocalFileUpload() {
  const instagramService = new InstagramService({ cookiesKey: "local" });
  await instagramService.initInstagramClient({
    password: env.INSTAGRAM_PASSWORD,
    username: env.INSTAGRAM_USERNAME,
  });
  for (const [index, folder] of listFolder.entries()) {
    const {
      caption,
      path,
      aspectRatio,
      startIndex = 0,
      reduceQuality = false,
      endIndex,
    } = folder;

    let folderPath = `${prefixPath}${path}`;
    console.log(
      `index ${index} start upload folder with detail ${{
        folderPath,
        caption,
      }}`
    );

    if (aspectRatio) {
      console.log("start resize with aspect ratio ", aspectRatio);
      const resizeService = new ResizeService({ aspectRatio, folderPath });
      const resizePath = await resizeService.startResizeAllImage();
      folderPath = resizePath;
    }

    const batchFiles = await FileService.instagramFileReadyToUpload(folderPath);

    console.log("start index from ", startIndex);
    for (const [index, item] of batchFiles.entries()) {
      if (endIndex && index > endIndex) break;
      if (index < startIndex) {
        continue;
      }

      const captionText = `${caption} (${index + 1})`;

      console.log(
        `start upload batch index ${index} with value ${item} reduceQuality ${reduceQuality} caption text ${captionText}`
      );

      await instagramService.publishPhotosLocal({
        items: item.map((item) => `${folderPath}/${item}`),
        caption: captionText,
      });
    }
  }
}
