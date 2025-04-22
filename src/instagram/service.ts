import {
  IgApiClient,
  IgLoginRequiredError,
  PostingAlbumPhotoItem,
  PostingAlbumVideoItem,
} from "instagram-private-api";
import * as fs from "fs";
import {
  AlbumResponse,
  VideoImageBuffer,
  VideoImageResizeResult as VideoImageResizeResult,
} from "./type";
import FsService from "../fs/service";
import ResizeImageService from "../resize/base-64/service";
import { AspectRatio } from "../resize/types";
import ResizeVideoService from "../resize/video/service";
import PromiseService from "../promise/service";
import VideoService from "../video/service";
import { Base64 } from "../resize/base-64/type";
import { instagramConstant } from "./constant";
import { dirname } from "path";
import { SECOND } from "../constants/size";
import { readFile, unlink } from "fs/promises";

export class InstagramService {
  ig: IgApiClient;
  cookiesKey: string;
  password?: string;
  username?: string;

  private constructor({
    cookiesKey,
    username,
    password,
  }: {
    cookiesKey: string;
    username?: string;
    password?: string;
  }) {
    this.ig = new IgApiClient();
    this.cookiesKey = cookiesKey;
    this.username = username;
    this.password = password;
  }

  static async loginWithSession({ cookiesKey }: { cookiesKey: string }) {
    const instance = new InstagramService({ cookiesKey });
    if (!instance.isHaveSession) return undefined;
    await instance.loadSession();
    return instance;
  }

  static async login({
    password,
    username,
  }: {
    password: string;
    username: string;
  }) {
    const instance = new InstagramService({
      cookiesKey: username,
      password,
      username,
    });
    await instance.initInstagramClient();
    return instance;
  }

  get sessionPath() {
    return `sessions/${this.cookiesKey}-session.json`;
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

  private async initInstagramClient() {
    const password = this.password;
    const username = this.username;
    const sessionPath = this.sessionPath;

    if (this.isHaveSession) {
      await this.loadSession();
    } else {
      if (!password || !username) {
        throw new Error("empty username or password");
      }
      console.log("start init instagram client");

      this.ig.state.generateDevice(username);
      await this.ig.simulate.preLoginFlow();
      const loggedInUser = await this.ig.account.login(username, password);
      console.log("loggedInUser", loggedInUser);

      // Save session data
      const serialized = await this.ig.state.serialize();
      delete serialized.constants; // Remove unneeded constants
      await fs.promises.mkdir(dirname(sessionPath), { recursive: true });
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
    items: Array<PostingAlbumPhotoItem & PostingAlbumVideoItem>;
    caption?: string;
  }) {
    // return;
    if (items.length > instagramConstant.max.post) {
      throw new Error(
        `can't post more than ${instagramConstant.max.post}, current value is ${items.length}`
      );
    }

    try {
      if (items.length === 0) return;

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
    } catch (error) {
      if (error instanceof IgLoginRequiredError) {
        await this.initInstagramClient();
        await this.publishAlbum({ items, caption });

        return;
      }

      throw error;
    }
  }

  async processVideo({
    aspectRatio,
    items,
    leftOverItems: leftOverItemsParams = [],
  }: {
    aspectRatio: AspectRatio;
    items: VideoImageBuffer[];
    leftOverItems?: VideoImageResizeResult[];
  }) {
    if (items.length > instagramConstant.max.post) {
      throw new Error(
        `Can't more post media than ${instagramConstant.max.post} `
      );
    }

    const promises = items.map(async (item) => {
      if (item.type === "video") {
        const result = await this.resizeVideo({
          aspectRatio,
          buffer: item.buffer,
          filename: item.filename,
        });

        if (Array.isArray(result)) {
          return result.map((item) => ({
            video: item,
          }));
        }

        return [
          {
            video: result,
          },
        ];
      }

      return [
        {
          image: await this.resizeImage({ aspectRatio, buffer: item.buffer }),
        },
      ];
    });

    const resizeResult = await PromiseService.run({ promises });

    const flattenResult: VideoImageResizeResult[] = [
      ...leftOverItemsParams,
      ...resizeResult.flat(),
    ];

    const maxPost = instagramConstant.max.post;
    const publishItems = flattenResult.slice(0, maxPost);
    const leftoverItems = flattenResult.slice(maxPost);

    console.log({
      publishItemsLength: publishItems.length,
      leftoverItemsLength: leftoverItems.length,
    });

    return { publishItems, leftoverItems };
  }

  async resizeImage({
    aspectRatio,
    buffer,
  }: {
    aspectRatio: AspectRatio;
    buffer: Buffer | Base64;
  }) {
    const resizeService = new ResizeImageService({
      aspectRatio,
      image: buffer,
    });

    return await resizeService.resizeImage();
  }

  async resizeVideo({
    aspectRatio,
    buffer: inputBuffer,
    filename: inputFilename,
  }: {
    aspectRatio: AspectRatio;
    buffer: Buffer | Base64;
    filename?: string;
  }) {
    // Write original video buffer to temp file
    const originalFile = new FsService({
      value: inputBuffer,
      filename: inputFilename,
    });

    const originalFilePath = await originalFile.createTempFile();

    // Extract metadata from the original video
    const originalVideo = new VideoService({ path: originalFilePath });
    const originalMetadata = await originalVideo.getVideoMetadata();
    const duration = originalMetadata.format.duration;

    if (!duration) {
      throw new Error("No duration found in original video");
    }

    const maxDuration = instagramConstant.max.duration * SECOND;

    // Resize video based on aspect ratio
    const resizeProcessor = new ResizeVideoService({
      aspectRatio,
      filePath: originalFilePath,
    });
    const resizedVideoBuffer = await resizeProcessor.resizeVideo(
      originalMetadata
    );
    // Save resized buffer to new temp file
    const resizedFile = new FsService({ value: resizedVideoBuffer });
    const resizedFilePath = await resizedFile.createTempFile();

    // Clean up original temp file
    await originalFile.unlink();

    const getResult = async () => {
      if (duration > maxDuration) {
        console.log(
          `video duration long more than ${maxDuration}, need to be split`
        );
        const videoService = new VideoService({ path: resizedFilePath });
        const splitVideoResult = await videoService.splitVideo({
          maxDurationPerFile: maxDuration,
          totalDuration: duration,
        });
        const result = await PromiseService.run({
          promises: splitVideoResult.map(async (video) => {
            const videoService = new VideoService({ path: video.path });
            const thumbnail = await videoService.getVideoThumbnail({
              duration: video.duration,
            });

            const buffer = await readFile(video.path);
            await unlink(video.path);

            return {
              buffer,
              thumbnail,
            };
          }),
        });

        return result;
      } else {
        // Extract thumbnail from resized video
        const resizedVideo = new VideoService({ path: resizedFilePath });
        const thumbnailBuffer = await resizedVideo.getVideoThumbnail({
          duration,
        });

        return {
          buffer: resizedVideoBuffer,
          thumbnail: thumbnailBuffer,
        };
      }
    };

    const result = await getResult();
    // Clean up resized temp file
    await resizedFile.unlink();

    return result;
  }
}
