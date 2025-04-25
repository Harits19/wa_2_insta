import { join } from "path";
import MyDate from "../date/service";
import FsService from "../fs/service";
import { AppState, AppStateError } from "./type";
import { writeFile } from "fs/promises";

export default class AppStateService {
  private static _state: AppState;
  private static path = join(__dirname, "state.json");

  static get state() {
    if (!this._state)
      throw new Error("AppStateService.init to access the app state");

    return this._state;
  }

  static async init() {
    this._state = await FsService.readJsonFile<AppState>(this.path);
  }

  static async updateStartDate(value: string) {
    this._state.date.start = value;
    await this.updateState();
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

  static async resetFilter() {
    this._state.filter = undefined;

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

 
}
