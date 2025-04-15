import { RawDate } from "./type";

export default class DateService {
  static getDatesBetween(start: RawDate, end: RawDate) {
    const result: RawDate[] = [];

    let currentDate = new Date(start.year, start.month - 1, start.day);
    const finalDate = new Date(end.year, end.month - 1, end.day);

    while (currentDate <= finalDate) {
      result.push({
        day: currentDate.getDate(),
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
      });

      // Increment by one day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }
}
