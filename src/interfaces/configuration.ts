import MatchRule from "./matchRule";

export default interface Configuration {
  ignoredFileFilters: string[];
  fileExtensionFilters: string[];
  matchRules: MatchRule[];
}
