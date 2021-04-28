import { QuickPickItem } from "vscode";
import FileInfo from "./fileInfo";
import MatchResult from "./matchResult";

export class RelatedResultQuickPickItem implements QuickPickItem {
  label: string;
  description: string;

  constructor(public relatedResult: MatchResult) {
    this.label = relatedResult.fileInfo.getName();
    this.description = relatedResult.fileInfo.getRelativePath();
  }
}
