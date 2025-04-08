import { MessageMedia } from "whatsapp-web.js";
import { InstagramService } from "../instagram/service";
import { AspectRatio } from "../resize/types";

export interface MessageClientModel {
  isLoadingUploadToInstagram: boolean;
  batchMedia: MessageMedia[];
  instagramService: InstagramService;
  aspectRatio: AspectRatio;
}
