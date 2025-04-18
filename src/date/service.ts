import { RawDate } from "./type";

export default class MyDate extends Date {
  getDatesBetween(end: Date) {
    const result: MyDate[] = [];

    let currentDate = this;

    while (currentDate <= end) {
      result.push(
        new MyDate(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate()
        )
      );

      // Increment by one day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  toRawDate() {
    return {
      day: this.getDate(),
      month: this.getMonth() + 1,
      year: this.getFullYear(),
    };
  }
}
