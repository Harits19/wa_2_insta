export default class LogService {
  static countTime(key: string) {
    let startTime: number | undefined;
    key = `${key.trim()} `;
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

      const addZero = (value: number, digit: number = 2) =>
        value.toString().padStart(digit, "0");
      console.log(
        `${key}: ${minutes}:${addZero(seconds)}.${addZero(
          milliseconds,
          3
        )} (m:ss.mmm)`
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
