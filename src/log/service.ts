export default class LogService {
  static countTime(key: string) {
    const start = () => console.time(key);
    const end = () => console.timeEnd(key);

    return {
      start,
      end,
    };
  }
}
