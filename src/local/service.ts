import { listFolder, prefixPath } from "../constants/file";
import FileService from "../file/service";
import { InstagramService } from "../instagram/service";
import ResizeLocalService from "../resize/local/service";

export async function startLocalFileUpload({
  password,
  username,
}: {
  password: string;
  username: string;
}) {
  const instagramService = await InstagramService.login({
    password,
    username,
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
      const resizeService = new ResizeLocalService({ aspectRatio, folderPath });
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
