import WhatsappService from "./whatsapp/service";
import { envService } from "./env/service";
import GoogleOauthService from "./google-oauth/service";
import GooglePhotoService from "./google-photo/service";
export default async function main() {
  
  envService.checkENV();
  const whatsappService = await WhatsappService.create();

  const googleOauth = await GoogleOauthService.create();
  const googlePhoto = new GooglePhotoService({ googleOauth });
  googlePhoto.getImage({
    start: {
      day: 17,
      month: 4,
      year: 2013,
    },
    end: {
      day: 17,
      month: 4,
      year: 2013,
    },
  });
}

main();
