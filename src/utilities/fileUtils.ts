import * as fs from "fs";
import * as path from "path";
import FilterUtils from "./filterUtils";

export default class FileUtils {
  static getAllFiles(
    dirPath: string,
    ignoredFileFilters: string[],
    fileExtensionFilters: string[]
  ): string[] {
    let fileNames: string[] = [];

    let names = fs.readdirSync(dirPath);
    for (let name of names) {
      let fullPath = path.join(dirPath, name);

      // Check if we should ignore this path or file
      let ignoreName = FilterUtils.shouldIgnore(name, ignoredFileFilters);
      let ignorePath = FilterUtils.shouldIgnore(fullPath, ignoredFileFilters);

      if (ignoreName || ignorePath) {
        continue;
      }

      // - Path is a directory
      if (fs.statSync(fullPath).isDirectory()) {
        const tempFileNames = this.getAllFiles(fullPath, fileExtensionFilters, ignoredFileFilters);
        fileNames = fileNames.concat(tempFileNames);
      }
      // - Path is a file
      else {
        // - Only include file that match the file extension filter
        const ignore = FilterUtils.shouldIgnore(name, fileExtensionFilters);
        if (ignore) {
          continue;
        }

        fileNames.push(fullPath);
      }
    }

    return fileNames;
  }
}
