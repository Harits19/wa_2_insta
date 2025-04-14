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
}
