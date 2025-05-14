import { join } from "path";
import MyDate from "../date/service";
import FsService from "../fs/service";
import { AppState, AppStateError } from "./type";
import { unlink, writeFile } from "fs/promises";
import { env } from "../env/service";

export default class AppStateService {
  private static _state: AppState;
  private static path = join(
    __dirname,
    env.NODE_ENV ? `state.${env.NODE_ENV}.json` : "state.json"
  );

  static get state() {
    if (!this._state)
      throw new Error("AppStateService.init to access the app state");

    return this._state;
  }

  static async init() {
    console.log('start read app state from this path ', this.path)
    this._state = await FsService.readJsonFile<AppState>(this.path);
  }

  static async updateState() {
    await writeFile(
      this.path,
      JSON.stringify(this._state, null, 2) + "\n",
      "utf8"
    );
  }

  static async updateDaily() {
    const now = new MyDate().formatDate();
    const totalPost = this._state.post.totalPost;
    const lastUpdate = new MyDate(this._state.post.lastUpdate).formatDate();

    if (now === lastUpdate) {
      this._state.post.totalPost = totalPost + 1;
    } else {
      this._state.post.totalPost = 0;
      this._state.post.lastUpdate = now;
    }
    await this.updateState();
  }

  static async updateFilter(value: { startIndex: number; caption: string }) {
    this._state.filter = value;

    await this.updateState();
  }

  static async updateCaption(caption: string) {
    this._state.filter = {
      caption,
      startIndex: this._state.filter?.startIndex ?? 0,
    };
    await this.updateState();
  }

  static async resetFilter() {
    this._state.filter = undefined;

    await this.updateState();
  }

  static async updateFilename(value?: string) {
    this._state.post.filename = value;

    await this.updateState();
  }

  static async handleErrorUpload(value: Omit<AppStateError, "path">) {
    const errors = this._state.errors ?? [];

    const error = value.error;

    errors.push({
      ...value,
      path: this._state.uploadFolder,
      startIndex: value.startIndex,
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
    });
    this._state.errors = errors;

    await this.updateState();
  }

  static async pushCurrentVideoProcess(
    ...value: {
      path: string;
      resizedPath: string | string[];
    }[]
  ) {
    const tempVideo = this._state.video ?? [];

    tempVideo.push(...value);

    this._state.video = tempVideo;
    await this.updateState();
  }

  static async resetLastVideoProcess() {
    const videos = this._state.video ?? [];
    for (const item of videos) {
      if (Array.isArray(item.resizedPath)) {
        for (const resized of item.resizedPath) {
          await unlink(resized);
        }
      } else {
        await unlink(item.resizedPath);
      }
    }
    this._state.video = undefined;
    await this.updateState();
  }
}
