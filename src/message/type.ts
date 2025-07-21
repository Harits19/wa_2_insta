import { MessageTypes } from "whatsapp-web.js";
import { InstagramService } from "../instagram/service";
import { AspectRatio } from "../resize/types";
import { VideoImageBuffer } from "../instagram/type";
import zod from "zod";

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
      throw new Error("Salah mengirim file, hanya menerima gambar atau video");
  }
}

export const InstagramCredential = zod.object({
  username: zod.string(),
  password: zod.string(),
});

// extract the inferred type
export type InstagramCredential = zod.infer<typeof InstagramCredential>;

export interface InstagramState {
  username?: string;
  upload: "start" | "process" | "idle";
}

export interface MessageState {
  [key: string]: InstagramState;
}
