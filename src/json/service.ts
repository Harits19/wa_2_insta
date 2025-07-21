/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs/promises";
import * as path from "path";
import { set, get } from "lodash";

export default class JSONService<T extends object = any> {
  private resolvedPath: string;

  constructor(filePath: string) {
    this.resolvedPath = path.resolve(process.cwd(), filePath);
  }

  private async ensureFileExists(): Promise<void> {
    try {
      await fs.access(this.resolvedPath);
    } catch {
      await fs.mkdir(path.dirname(this.resolvedPath), { recursive: true });
      await fs.writeFile(
        this.resolvedPath,
        JSON.stringify({}, null, 2),
        "utf-8"
      );
    }
  }

  async read(): Promise<T> {
    try {
      await this.ensureFileExists();
      const data = await fs.readFile(this.resolvedPath, "utf-8");
      return JSON.parse(data) as T;
    } catch {
      await this.write({} as T);
      return {} as T;
    }
  }

  async write(data: T): Promise<void> {
    const jsonString = JSON.stringify(data, null, 2);
    await fs.writeFile(this.resolvedPath, jsonString, "utf-8");
  }

  async updateByKey(keyPath: string, value: any): Promise<void> {
    const json = await this.read();
    set(json, keyPath, value);
    await this.write(json);
  }

  async getByKey<V = any>(keyPath: string): Promise<V> {
    const json = await this.read();
    return get(json, keyPath);
  }
}
