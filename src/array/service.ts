export class ArrayService {
  static batch<T>({
    batchLength,
    files,
    skipFromIndex
  }: {
    files: T[];
    batchLength: number;
    skipFromIndex?: number;
  }) {
    const result: T[][] = [];

    for (let index = 0; index < files.length; index += batchLength) {
      const batch = files.slice(index, index + batchLength);

      result.push(batch);
    }

    return result;
  }
}
