export default class LogService {
  static countTime(key: string) {
    let startTime: number | undefined;
    const start = () => {
      startTime = Date.now();
      console.time(key);
    };

    const timer = setInterval(() => {
      if (!startTime) throw new Error("Empty startTime");

      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;

      const minutes = Math.floor(elapsedTime / 60000);
      const seconds = Math.floor((elapsedTime % 60000) / 1000);
      const milliseconds = elapsedTime % 1000;

      console.log(
        `${key} ${minutes}:${seconds.toString().padStart(2, "0")}:${milliseconds
          .toString()
          .padStart(3, "0")}ms`
      );
    }, 3000);

    const end = () => {
      console.timeEnd(key);
      timer.close();
    };

    return {
      start,
      end,
    };
  }
}
