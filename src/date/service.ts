import { SECOND } from "../constants/size";
import { RawDate } from "./type";

export default class MyDate extends Date {
  static fromTimestamp(value: number) {
    const instance = new MyDate(value * SECOND);

    return instance;
  }

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

  toRawDate(): RawDate {
    return {
      day: this.getDate(),
      month: this.getMonth() + 1,
      year: this.getFullYear(),
    };
  }

  formatDate(): string {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const date = this.toLocaleDateString();
    const [month, day, year] = date.split("/");
    const monthName = monthNames[Number(month) - 1];

    return `${day} ${monthName} ${year}`;
  }

  static adjustDate(
    date: Date,
    {
      hour = 0,
      minute = 0,
      second = 0,
    }: { minute?: number; hour?: number; second?: number }
  ) {
    date.setMinutes(date.getMinutes() + minute);
    date.setHours(date.getHours() + hour);
    date.setSeconds(date.getSeconds() - second);

    return date;
  }
}
