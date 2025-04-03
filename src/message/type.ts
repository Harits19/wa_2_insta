import { MessageMedia } from "whatsapp-web.js";
import { InstagramService } from "../instagram/service";

export interface MessageClientModel {
  isLoadingUploadToInstagram: boolean;
  batchMedia: MessageMedia[];
  instagramService: InstagramService;
}
