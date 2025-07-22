import {
  IgApiClient,
  IgLoginRequiredError,
  IgResponseError,
  PostingAlbumPhotoItem,
  PostingAlbumVideoItem,
} from "instagram-private-api";
import * as fs from "fs";
import { dirname } from "path";
import { AspectRatio } from "../resize/types";
import { ArrayService } from "../array/service";
import { instagramConstant } from "./constant";
import {
  ErrorMultiplePost,
  PostItem,
  ResizeVideoResult,
  VideoImageBuffer,
  VideoImageResizeResult,
} from "./type";
import ImageService from "../image/service";
import PromiseService from "../promise/service";
import FileService from "../file/service";
import VideoService from "../video/service";
import { MINUTE, SECOND } from "../constants/size";
import ResizeVideoService from "../resize/video/service";
import { readFile } from "fs/promises";
import LogService from "../log/service";

export class InstagramServiceV2 {
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

  static async login({
    password,
    username,
  }: {
    password: string;
    username: string;
  }) {
    const instance = new InstagramServiceV2({
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

  private async loadSession() {
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
    // console.log({ isHaveCache, path });

    // if (isHaveCache) {
    //   const isSplitVideo = Array.isArray(cacheVideo);
    //   if (isSplitVideo) {
    //     return PromiseService.run({
    //       promises: cacheVideo.map((path) => {
    //         return this.getVideoThumbnailBuffer(path);
    //       }),
    //     });
    //   }

    //   return this.getVideoThumbnailBuffer(cacheVideo);
    // }

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

        await fs.unlinkSync(resizedFilePath);

        return result;
      } else {
        return this.getVideoThumbnailBuffer(resizedFilePath);
      }
    };

    const result = await getResult();

    return result;
  }

  private async processAllImageVideo({
    aspectRatio,
    items,
  }: {
    aspectRatio: AspectRatio;
    items: VideoImageBuffer[];
  }): Promise<VideoImageResizeResult[]> {
    const promises = items.map(async (item) => {
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

  public async postAlbum({
    aspectRatio = "1x1",
    caption,
    items,
  }: {
    aspectRatio?: AspectRatio;
    caption?: string;
    items: PostItem[];
  }) {
    const batchFiles = await this.getResizedItems({ aspectRatio, items });

    const isMultipleUpload = batchFiles.length > 1;

    for (const [index, files] of batchFiles.entries()) {
      const finalCaption = isMultipleUpload
        ? `${caption} (${index + 1})`
        : caption;

      try {
        await this.publishAlbum({
          caption: finalCaption,
          items: files.map((item) => ({
            coverImage: item.video!.thumbnail!,
            file: item.image!,
            video: item.video!.buffer!,
            transcodeDelay: item.video?.buffer ? 12000 : undefined,
          })),
        });
      } catch (error) {
        if (error instanceof Error) {
          throw new ErrorMultiplePost({
            message: error.message,
            startIndex: index,
          });
        }
        throw error;
      }

      await PromiseService.sleep(1.5 * SECOND * MINUTE);
    }
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

    const maxAttempt = 1;
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  public async getResizedItems({
    aspectRatio,
    items,
  }: {
    aspectRatio: AspectRatio;
    items: PostItem[];
  }): Promise<VideoImageResizeResult[][]> {
    const isAllImage = items.every((item) => item.type === "image");
    if (isAllImage) {
      const batchImage = ArrayService.batch({
        files: items,
        batchLength: instagramConstant.max.post,
      });

      const result = await Promise.all(
        batchImage.map(async (items) => {
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
}
