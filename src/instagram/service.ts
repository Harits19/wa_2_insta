import {
  IgApiClient,
  IgLoginRequiredError,
  PostingAlbumPhotoItem,
  PostingAlbumVideoItem,
} from "instagram-private-api";
import * as fs from "fs";
import {
  AlbumResponse,
  ErrorMultiplePost,
  FilterMultiplePost as FilterMultiplePost,
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
import { MINUTE, SECOND } from "../constants/size";
import { readFile, unlink } from "fs/promises";
import { ArrayService } from "../array/service";
import MyDate from "../date/service";
import FileService from "../file/service";
import LogService from "../log/service";
import AppStateService from "../app-state/service";
import { TimeoutError } from "../promise/type";

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

  private async initInstagramClient(overrideSession: boolean = false) {
    const password = this.password;
    const username = this.username;
    const sessionPath = this.sessionPath;

    if (this.isHaveSession && !overrideSession) {
      await this.loadSession();
    } else {
      this.ig = new IgApiClient();
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
    items: Array<
      Partial<PostingAlbumPhotoItem> & Partial<PostingAlbumVideoItem>
    >;
    caption?: string;
  }) {
    console.log(
      `try upload post with length ${items.length} and caption ${caption}`
    );
    if (items.length > instagramConstant.max.post) {
      throw new Error(
        `can't post more than ${instagramConstant.max.post}, current value is ${items.length}`
      );
    }

    const totalFileSize = items.reduce((prev, curr) => {
      const getSize = FileService.getFileSizeBuffer;

      const videoSize = getSize(curr.video);
      const coverImageSize = getSize(curr.coverImage);
      const imageSize = getSize(curr.file);

      return prev + videoSize + coverImageSize + imageSize;
    }, 0);

    console.log("totalFileSize in MB ", totalFileSize);

    const maxAttempt = 3;
    if (items.length === 0) {
      console.log(`items length is empty,`);
      return;
    }

    const isMultiplePost = items.length > 1;

    for (let attempt = 1; attempt <= maxAttempt; attempt++) {
      console.log(`attempt ${attempt} caption ${caption}`);
      const { end, start } = LogService.countTime("time to post ");
      start();
      try {
        const publish = async () => {
          if (isMultiplePost) {
            const publishResult = await this.ig.publish.album({
              items: items as Array<
                PostingAlbumPhotoItem | PostingAlbumVideoItem
              >,
              caption: caption,
            });
            console.log("Posted carousel:", publishResult.media.code);
          } else {
            const item = items[0] as PostingAlbumVideoItem &
              PostingAlbumPhotoItem;

            const isPhoto = Boolean(item.file);
            const isVideo = Boolean(item.video);

            if (isPhoto) {
              const publishResult = await this.ig.publish.photo({
                file: item.file,
                caption: caption,
              });
              console.log(
                "Image posted successfully!",
                publishResult.upload_id
              );
            } else if (isVideo) {
              const publishResult = await this.ig.publish.video({
                video: item.video,
                coverImage: item.coverImage,
                caption: caption,
              });
              console.log(
                "Video posted successfully!",
                publishResult.upload_id
              );
            }
          }
        };

        await PromiseService.withTimeout({
          promise: publish(),
        });
        return;
      } catch (error) {
        console.error(error);
        if (error instanceof IgLoginRequiredError) {
          await this.initInstagramClient(true);
          continue;
        }

        if (attempt !== maxAttempt) {
          continue;
        }

        throw error;
      } finally {
        end();
      }
    }
  }

  async publishMultiplePost({
    aspectRatio,
    items,
    caption,
    onSuccess,
  }: {
    aspectRatio: AspectRatio;
    items: VideoImageBuffer[];
    caption: string;
    onSuccess: () => void;
  }) {
    console.log("before process items length", items.length);
    const allFiles = await this.processAllImageVideo({ aspectRatio, items });
    console.log("after process items length", allFiles.length);

    const batchFiles = ArrayService.batch({
      files: allFiles,
      batchLength: instagramConstant.max.post,
    });

    console.log(
      `total file ${allFiles.length} total post ${batchFiles.length} caption ${caption}`
    );

    const isMultipleUpload = batchFiles.length > 1;

    for (const [index, files] of batchFiles.entries()) {
      const isLastIndex = index === batchFiles.length - 1;
      const state = AppStateService.state;

      console.log("current state", state.post);

      const maxDailyUpload = instagramConstant.max.dailyUpload;

      if (state.post.totalPost > maxDailyUpload) {
        throw new Error(`Reached max daily upload ${maxDailyUpload}`);
      }

      let startIndex: number | undefined;
      const filter = state.filter;

      if (state)
        if (filter) {
          const isFiltered = caption === filter.caption;
          if (isFiltered) {
            startIndex = filter.startIndex;
          }
        }

      if (startIndex !== undefined && index < startIndex) {
        console.log("skip index", index);
        continue;
      }

      const finalCaption = isMultipleUpload
        ? `${caption} (${index + 1})`
        : caption;

      try {
        await AppStateService.updateFilter({ caption, startIndex: index });

        await this.publishAlbum({
          caption: finalCaption,
          items: files.map((item) => ({
            coverImage: item.video?.thumbnail!,
            file: item.image!,
            video: item.video?.buffer!,
          })),
        });
        await AppStateService.updateFilter({ caption, startIndex: index + 1 });

        if (isLastIndex) {
          onSuccess();
        }
      } catch (error) {
        if (error instanceof Error) {
          throw new ErrorMultiplePost({
            message: error.message,
            startIndex: index,
          });
        }
        throw error;
      }

      await PromiseService.sleep(2.5 * MINUTE * SECOND);
      await AppStateService.updateDaily();
      await AppStateService.resetFilter();
    }
  }

  private async processAllImageVideo({
    aspectRatio,
    items,
  }: {
    aspectRatio: AspectRatio;
    items: VideoImageBuffer[];
  }): Promise<VideoImageResizeResult[]> {
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

    const resizeResult = (await PromiseService.run({ promises })).flat();

    return resizeResult;
  }

  async processImageVideo({
    aspectRatio,
    items,
    leftOverItems: leftOverItemsParams = [],
  }: {
    aspectRatio: AspectRatio;
    items: VideoImageBuffer[];
    leftOverItems?: VideoImageResizeResult[];
  }) {
    const resizeResult = await this.processAllImageVideo({
      aspectRatio,
      items,
    });

    const flattenResult: VideoImageResizeResult[] = [
      ...leftOverItemsParams,
      ...resizeResult,
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

    const maxDuration = instagramConstant.max.duration * MINUTE;

    // Resize video based on aspect ratio
    const resizeProcessor = new ResizeVideoService({
      aspectRatio,
      filePath: originalFilePath,
      metadata: originalMetadata,
    });
    const resizedVideoBuffer = await resizeProcessor.resizeVideo();
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
