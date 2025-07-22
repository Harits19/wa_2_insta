import { MessageTypes } from "whatsapp-web.js";
import { InstagramService } from "../instagram/service";
import { AspectRatio } from "../resize/types";
import { VideoImageBuffer } from "../instagram/type";
import zod from "zod";
import { InstagramServiceV2 } from "../instagram/service-v2";

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

export const InstagramPostBody = zod.object({
  caption: zod.string().optional(),
});

export type InstagramPostBody = zod.infer<typeof InstagramPostBody>;

// extract the inferred type
export type InstagramCredential = zod.infer<typeof InstagramCredential>;

export interface InstagramState {
  username?: string;
  upload: "start" | "end" | "idle";
  media: {
    path: string;
    filename: string;
    type: "image" | "video"
  }[];
}

export interface MessageState {
  [key: string]: InstagramState;
}

export interface InstagramServiceState {
  [key: string]: InstagramServiceV2;
}
