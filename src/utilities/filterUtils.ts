export default class FilterUtils {
  static shouldIgnore(item: string, filters: Array<string>): boolean {
    for (let filter of filters) {
      try {
        let reg = new RegExp("^" + filter + "$");
        if (reg.test(item)) {
          return true;
        }
      } catch (error) {
        console.error(`Filter error. filter=${filter} | error=${error}`);
      }
    }

    return false;
  }
}
