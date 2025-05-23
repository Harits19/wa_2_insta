import { SECOND, MINUTE } from "../constants/size";
import { TimeoutError } from "./type";

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


  static async runV2({promises}:{
    promises: Promise<void>[];
  }){

    const maxTask = 5;

    const running: Promise<void>[] = [];

    for(const promise of promises){
      running.push(promise);

    running.splice

      if(running.length >= maxTask){
        console.log('start run concurrency task');
        await Promise.race(running);

      }
    }



  }

  static async withTimeout<T>({
    promise,
    timeout = 5 * MINUTE * SECOND,
  }: {
    promise: Promise<T>;
    timeout?: number;
  }) {
  return promise;
    const timeoutPromise = new Promise<T>((resolve, reject) =>
      setTimeout(() => reject(new TimeoutError("timeout!!")), timeout)
    );
    return Promise.race([timeoutPromise, promise]);
  }

  static async sleep(duration: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, duration));
  }

  static async randomSleep() {
    const sleepTimes = [3, 5, 7];

    const sleepTime = sleepTimes[Math.floor(Math.random() * sleepTimes.length)];

    console.info("start sleep in %d minutes", sleepTime);

    await this.sleep(sleepTime * MINUTE * SECOND);
  }
}
