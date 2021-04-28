import FileInfo from "./fileInfo";
import Segment from "./segment";
import MatchRule from "../interfaces/matchRule";

export default class MatchResult {
  constructor(public fileInfo: FileInfo, public rule: MatchRule, public segments: Segment[]) {}
}
