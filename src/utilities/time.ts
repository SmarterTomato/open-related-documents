export default class Time {
  static delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
