import { MessageMedia, MessageTypes } from "whatsapp-web.js";
import { InstagramService } from "../instagram/service";
import { AspectRatio } from "../resize/types";
import { VideoImageBuffer } from "../instagram/type";

export interface MessageClientModel {
  isLoadingUploadToInstagram: boolean;
  batchMedia: VideoImageBuffer[];
  instagramService: InstagramService;
  aspectRatio: AspectRatio;
}

export function mapMessageType(type: MessageTypes): "image" | "video" {
  switch (type) {
    case MessageTypes.VIDEO:
      return "video";
    case MessageTypes.IMAGE:
      return "image";
    default:
      return "image";
  }
}
