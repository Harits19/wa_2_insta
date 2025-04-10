import { MessageMedia, MessageTypes } from "whatsapp-web.js";
import { InstagramService } from "../instagram/service";
import { AspectRatio } from "../resize/types";

export type MediaModelType = "video" | "image";
export interface MediaModel extends MessageMedia {
  type: MediaModelType;
}

export interface MessageClientModel {
  isLoadingUploadToInstagram: boolean;
  batchMedia: MediaModel[];
  instagramService: InstagramService;
  aspectRatio: AspectRatio;
}

export function mapMessageType(type: MessageTypes): MediaModelType | undefined {
  switch (type) {
    case MessageTypes.VIDEO:
      return "video";
    case MessageTypes.IMAGE:
      return "image";
  }
}
