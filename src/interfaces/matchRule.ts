export default interface MatchRule {
  name: string;
  priority: number;
  breakChars: string[];
  expressions: string[];
}
