import {
  IgApiClient,
  IgLoginRequiredError,
  IgResponseError,
  PostingAlbumPhotoItem,
  PostingAlbumVideoItem,
} from "instagram-private-api";
import * as fs from "fs";
import {
  AlbumModel,
  AlbumResponse,
  ErrorMultiplePost,
  FilterMultiplePost as FilterMultiplePost,
  ResizeVideoResult,
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
import { PublishService } from "instagram-private-api/dist/services/publish.service";
import ImageService from "../image/service";

export class InstagramService {
  client: IgApiClient;
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
    this.client = new IgApiClient();
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
    await this.client.state.deserialize(session);
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
      this.client = new IgApiClient();
      if (!password || !username) {
        throw new Error("empty username or password");
      }
      console.log("start init instagram client");

      this.client.state.generateDevice(username);
      await this.client.simulate.preLoginFlow();
      const loggedInUser = await this.client.account.login(username, password);
      console.log("loggedInUser", loggedInUser);

      // Save session data
      const serialized = await this.client.state.serialize();
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
    const publishResult = await this.client.publish.photo({
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
    const publishResult: AlbumResponse = await this.client.publish.album({
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
    const publishResult: AlbumResponse = await this.client.publish.album({
      items,
      caption,
    });

    console.log("Image posted successfully!", publishResult.media.id);
  }

  async publishVideo({ buffer }: { buffer: Buffer }) {
    const publishResult = await this.client.publish.video({
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

    const allBuffer = items
      .map((item) => {
        const buffers = [item.coverImage, item.file, item.video].filter(
          (item) => item !== undefined
        );
        return buffers;
      })
      .flat();

    const totalFileSize = FileService.totalFileSize(allBuffer);

    console.log("totalFileSize in MB ", totalFileSize);

    let maxAttempt = 1;
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
            const publishResult = await this.client.publish.album({
              items: (
                items as Array<PostingAlbumPhotoItem & PostingAlbumVideoItem>
              ).map((item, index) => {
                if (item.coverImage) {
                  console.log(
                    "cover image content length index",
                    index,
                    "content length",
                    item.coverImage.byteLength
                  );
                }

                if (item.file) {
                  console.log(
                    "file content length index",
                    index,
                    "content length",
                    item.file.byteLength
                  );
                }
                return item;
              }),
              caption: caption,
            });
            console.log("Posted carousel:", publishResult.media.code);
          } else {
            const item = items[0] as PostingAlbumVideoItem &
              PostingAlbumPhotoItem;

            const isPhoto = Boolean(item.file);
            const isVideo = Boolean(item.video);

            if (isPhoto) {
              const publishResult = await this.client.publish.photo({
                file: item.file,
                caption: caption,
              });
              console.log(
                "Image posted successfully!",
                publishResult.upload_id
              );
            } else if (isVideo) {
              const publishResult = await this.client.publish.video({
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
          timeout: 7 * MINUTE * SECOND,
        });
        return;
      } catch (error: any) {
        console.error(error);
        console.error({
          name: error.name,
          message: error.message,
          response: JSON.stringify(error.response?.toJSON().body),
          stack: error.stack,
          text: error.text,
        });

        if (error instanceof IgLoginRequiredError) {
          throw error;
        } else if (error instanceof IgResponseError) {
          if (
            error.text === "User restricted from uploading, please try later."
          ) {
            throw error;
          }
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

  async getProcessedFile({
    aspectRatio,
    items,
    startIndex = 0,
  }: {
    aspectRatio: AspectRatio;
    items: VideoImageBuffer[];
    startIndex?: number;
  }): Promise<VideoImageResizeResult[][]> {
    const isAllImage = items.every(
      (item) => FileService.getFileType(item.path) === "image"
    );
    if (isAllImage) {
      const batchFiles = ArrayService.batch({
        files: items,
        batchLength: instagramConstant.max.post,
        skipFromIndex: startIndex,
      });

      const result = await Promise.all(
        batchFiles.map(async (items, index) => {
          if (index < startIndex) return Promise.resolve([]);
          return Promise.all(
            items.map(async (item) => {
              const result = await this.resizeImageWithPath({
                aspectRatio,
                path: item.path,
              });

              return {
                image: result,
                path: item.path,
              };
            })
          );
        })
      );

      return result;
    } else {
      if (startIndex) {
        throw new Error("Combined image and video can't have startIndex");
      }
      const allFiles = await this.processAllImageVideo({
        aspectRatio,
        items: items,
      });

      const batchFiles = ArrayService.batch({
        files: allFiles,
        batchLength: instagramConstant.max.post,
      });
      return batchFiles;
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
    const state = AppStateService.state;

    const batchFiles = await this.getProcessedFile({
      aspectRatio,
      items,
      startIndex: state.filter?.startIndex,
    });

    console.log(
      `total file ${items.length} total post ${batchFiles.length} caption ${caption}`
    );

    const isMultipleUpload = batchFiles.length > 1;

    for (const [index, files] of batchFiles.entries()) {
      const isLastIndex = index === batchFiles.length - 1;
      const state = AppStateService.state;
      console.log("current state", state.post);
      console.log(`upload ${index + 1} total file ${files.length}`);

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
        await AppStateService.updateFilename(files.at(0)?.path);

        await this.publishAlbum({
          caption: finalCaption,
          items: files.map((item) => ({
            coverImage: item.video?.thumbnail!,
            file: item.image!,
            video: item.video?.buffer!,
            transcodeDelay: item.video?.buffer ? 12000 : undefined,
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

      await AppStateService.updateDaily();
      await PromiseService.sleep(1.5 * SECOND * MINUTE);
    }
  }

  private async processAllImageVideo({
    aspectRatio,
    items,
  }: {
    aspectRatio: AspectRatio;
    items: VideoImageBuffer[];
  }): Promise<VideoImageResizeResult[]> {
    const promises = items.map(async (item, index) => {
      const type = await FileService.getFileType(item.path);

      if (type === "video") {
        const videoResult = await this.resizeVideoWithPath({
          aspectRatio,
          path: item.path,
        });

        if (Array.isArray(videoResult)) {
          return videoResult.map((video) => ({
            video,
            path: item.path!,
          }));
        }

        return {
          video: videoResult,
          path: item.path!,
        };
      } else {
        return {
          image: await this.resizeImageWithPath({
            aspectRatio,
            path: item.path!,
          }),
          path: item.path!,
        };
      }
    });

    const result = await PromiseService.run({
      promises: promises,
      parallel: true,
    });

    return result.flat();
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

  async resizeImageWithPath({
    aspectRatio,
    path,
  }: {
    aspectRatio: AspectRatio;
    path: string;
  }) {
    const service = await ImageService.createWithPath({ path: path });

    return service.instagramReady({ aspectRatio });
  }

  async getVideoThumbnailBuffer(path: string) {
    const videoService = new VideoService({ path: path });
    const thumbnail = await videoService.getVideoThumbnail();

    const buffer = await readFile(path);

    const result: ResizeVideoResult = {
      buffer,
      thumbnail,
      resizedPath: path,
    };

    return result;
  }

  async resizeVideoWithPath({
    aspectRatio,
    path,
  }: {
    aspectRatio: AspectRatio;
    path: string;
  }): Promise<ResizeVideoResult | ResizeVideoResult[]> {
    const appState = AppStateService.state;

    const cacheVideo = appState.video?.find(
      (item) => item.path === path
    )?.resizedPath;
    const isHaveCache = cacheVideo !== undefined;

    console.log({ isHaveCache, path });

    if (isHaveCache) {
      const isSplitVideo = Array.isArray(cacheVideo);
      if (isSplitVideo) {
        return PromiseService.run({
          promises: cacheVideo.map((path) => {
            return this.getVideoThumbnailBuffer(path);
          }),
        });
      }

      return this.getVideoThumbnailBuffer(cacheVideo);
    }

    // Extract metadata from the original video
    const originalVideo = new VideoService({ path });
    const originalMetadata = await originalVideo.getVideoMetadata();
    const duration = originalMetadata.format.duration;

    if (!duration) {
      throw new Error("No duration found in original video");
    }

    const maxDuration = instagramConstant.max.duration * MINUTE;

    // Resize video based on aspect ratio
    const resizeProcessor = new ResizeVideoService({
      aspectRatio,
      filePath: path,
      metadata: originalMetadata,
    });
    const resizedFilePath = await resizeProcessor.resizeLargeVideo();

    const getResult = async (): Promise<
      ResizeVideoResult | ResizeVideoResult[]
    > => {
      if (duration > maxDuration) {
        console.log(
          `video duration ${duration} long more than ${maxDuration}, need to be split`
        );
        const videoService = new VideoService({ path: resizedFilePath });
        const splitVideoResult = await videoService.splitVideo({
          maxDurationPerFile: maxDuration,
          totalDuration: duration,
        });
        const result = await PromiseService.run({
          promises: splitVideoResult.map(async (video) => {
            return this.getVideoThumbnailBuffer(video.path);
          }),
        });

        await AppStateService.pushCurrentVideoProcess({
          path: path,
          resizedPath: result.map((item) => item.resizedPath),
        });

        await unlink(resizedFilePath);

        return result;
      } else {
        await AppStateService.pushCurrentVideoProcess({
          path: path,
          resizedPath: resizedFilePath,
        });
        return this.getVideoThumbnailBuffer(resizedFilePath);
      }
    };

    const result = await getResult();

    return result;
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
            const thumbnail = await videoService.getVideoThumbnail();

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
        const thumbnailBuffer = await resizedVideo.getVideoThumbnail();

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
