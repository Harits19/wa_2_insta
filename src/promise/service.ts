import { SECOND, MINUTE } from "../constants/size";

export default class PromiseService {
  static async run<T>({
    promises,
    parallel = false,
  }: {
    promises: Promise<T>[];
    parallel?: boolean;
  }) {
    if (parallel) {
      return Promise.all(promises);
    }

    const result: T[] = [];

    for (const promise of promises) {
      const value = await promise;
      result.push(value);
    }
    return result;
  }

  static async withTimeout<T>({
    promise,
    timeout = 5 * MINUTE * SECOND,
  }: {
    promise: Promise<T>;
    timeout?: number;
  }) {
    const timeoutPromise = new Promise<T>((resolve, reject) =>
      setTimeout(() => reject(new Error("timeout!!")), timeout)
    );

    return Promise.race([timeoutPromise, promise]);
  }

  static async sleep(duration: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, duration));
  }
}
