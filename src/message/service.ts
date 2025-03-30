import { Message, MessageMedia } from "whatsapp-web.js";
import { publishPhotos } from "../instagram/service";

let isLoadingUploadToInstagram = false;

let batchMedia: MessageMedia[] = [];

export function handleStartUpload(msg: Message) {
  const startUploadInstagramKeyword = "start upload to instagram";

  const isStartUploadToInstagram = msg.body
    .toLowerCase()
    .startsWith(startUploadInstagramKeyword);

  if (!isStartUploadToInstagram) return;

  console.log("start upload to instagram!");
  isLoadingUploadToInstagram = true;
}

export async function handleAddMedia(msg: Message) {
  if (!isLoadingUploadToInstagram || !msg.hasMedia) return;

  const media = await msg.downloadMedia();
  console.log("start push to batch upload with id", msg.id.id);
  batchMedia.push(media);
}

export async function handlePostBatchMedia(msg: Message) {
  const endUploadInstagramKeyword = "end upload to instagram";
  const body = msg.body;

  const isEndUploadToInstagram = body
    .toLowerCase()
    .startsWith(endUploadInstagramKeyword);

  if (!isEndUploadToInstagram) return;

  console.log("all media received with size ", batchMedia.length);
  console.log("start post multiple photo");
  const caption = body.split("-").at(1)?.trim();
  await publishPhotos({
    items: batchMedia.map((item) => item.data),
    caption,
  });

  console.log("clear batch media data");
  batchMedia = [];
}
