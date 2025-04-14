import {
  IgApiClient,
  PostingAlbumPhotoItem,
  PostingAlbumVideoItem,
} from "instagram-private-api";
import * as fs from "fs";
import { AlbumResponse } from "./type";

export class InstagramService {
  ig: IgApiClient;
  cookiesKey: string;

  private constructor({ cookiesKey }: { cookiesKey: string }) {
    this.ig = new IgApiClient();
    this.cookiesKey = cookiesKey;
  }

  static async loginWithSession({ cookiesKey }: { cookiesKey: string }) {
    const instance = new InstagramService({ cookiesKey });
    if (!instance.isHaveSession) return undefined;
    await instance.loadSession()
    return instance;
  }

  static async login({
    cookiesKey,
    password,
    username,
  }: {
    cookiesKey: string;
    password: string;
    username: string;
  }) {
    const instance = new InstagramService({ cookiesKey });
    if (instance.isHaveSession) return instance;
    await instance.initInstagramClient({ password, username });
    return instance;
  }

  get sessionPath() {
    return `${this.cookiesKey}-session.json`;
  }

  get isHaveSession() {
    if (!this.cookiesKey) return false;
    const isHaveSession = fs.existsSync(this.sessionPath);
    return isHaveSession;
  }

  async loadSession() {
    const session = JSON.parse(fs.readFileSync(this.sessionPath, "utf-8"));
    await this.ig.state.deserialize(session);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log("Session loaded!");
  }

  private async initInstagramClient({
    password,
    username,
  }: {
    password: string;
    username: string;
  }) {
    const sessionPath = this.sessionPath;

    if (!password || !username) {
      throw new Error("empty username or password");
    }

    if (this.isHaveSession) {
      await this.loadSession();
    } else {
      console.log("start init instagram client");

      this.ig.state.generateDevice(username);
      await this.ig.simulate.preLoginFlow();
      const loggedInUser = await this.ig.account.login(username, password);
      console.log("loggedInUser", loggedInUser);

      // Save session data
      const serialized = await this.ig.state.serialize();
      delete serialized.constants; // Remove unneeded constants
      fs.writeFileSync(sessionPath, JSON.stringify(serialized));

      console.log("Session saved!");
    }
  }

  async publishPhoto({
    value,
    caption,
  }: {
    value: string | Buffer;
    caption?: string;
  }) {
    const publishResult = await this.ig.publish.photo({
      file: typeof value === "string" ? Buffer.from(value, "base64") : value,
      caption: caption, // Caption for the post
    });

    console.log("Image posted successfully!", publishResult.upload_id);
  }

  async publishPhotos({
    items: photos,
    caption,
  }: {
    items: (string | Buffer)[];
    caption?: string;
  }) {
    const items: PostingAlbumPhotoItem[] = photos.map((item) => {
      if (typeof item === "string") {
        return {
          file: Buffer.from(item, "base64"),
        };
      }

      return {
        file: item,
      };
    });
    const publishResult: AlbumResponse = await this.ig.publish.album({
      items,
      caption,
    });

    console.log("Image posted successfully!", publishResult.media.id);
  }

  async publishPhotosLocal({
    items: photos,
    caption,
  }: {
    items: string[];
    caption?: string;
  }) {
    const items: PostingAlbumPhotoItem[] = photos.map((item) => ({
      file: fs.readFileSync(item),
    }));
    const publishResult: AlbumResponse = await this.ig.publish.album({
      items,
      caption,
    });

    console.log("Image posted successfully!", publishResult.media.id);
  }

  async publishVideo({ buffer }: { buffer: Buffer }) {
    const publishResult = await this.ig.publish.video({
      video: buffer,
      coverImage: buffer,
      caption: "Video caption",
    });

    console.log("Video posted successfully!", publishResult.upload_id);
  }

  async publishAlbum({
    items,
    caption,
  }: {
    items: Array<PostingAlbumPhotoItem | PostingAlbumVideoItem>;
    caption?: string;
  }) {
    if (items.length > 1) {
      const publishResult = await this.ig.publish.album({
        items: items,
        caption: caption,
      });
      console.log("Posted carousel:", publishResult.media.code);
    } else {
      const item = items[0] as PostingAlbumVideoItem & PostingAlbumPhotoItem;

      const isPhoto = Boolean(item.file);
      const isVideo = Boolean(item.video);

      if (isPhoto) {
        const publishResult = await this.ig.publish.photo({
          file: item.file,
          caption: caption,
        });
        console.log("Image posted successfully!", publishResult.upload_id);
      } else if (isVideo) {
        const publishResult = await this.ig.publish.video({
          video: item.video,
          coverImage: item.coverImage,
          caption: caption,
        });
        console.log("Video posted successfully!", publishResult.upload_id);
      }
    }
  }
}
