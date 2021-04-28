import * as vscode from "vscode";
import * as path from "path";
import Configuration from "../interfaces/configuration";
import MatchRule from "../interfaces/matchRule";
import FileInfo from "../models/fileInfo";
import MatchResult from "../models/matchResult";
import ConfigurationService from "./configurationService";
import constants from "../constants";
import Segment from "../models/segment";
import SegmentType from "../interfaces/segmentType";

export default class FileMatchingService {
  //#region Singleton

  private static instance?: FileMatchingService;

  static getInstance(): FileMatchingService {
    if (!this.instance) {
      const config = ConfigurationService.getInstance().getConfig();

      this.instance = new FileMatchingService(config);
    }

    return this.instance;
  }

  //#endregion

  constructor(private config: Configuration) {}

  calculateMatchResults(file: FileInfo): MatchResult[] {
    const matchedResults: MatchResult[] = [];

    // - Get all matched rules for this file
    for (const rule of this.config.matchRules) {
      const result = this.calculateResultWithRule(file, rule);
      if (!result) {
        continue;
      }

      matchedResults.push(result);
    }

    return matchedResults;
  }

  checkIfFilesMatch(file1: FileInfo, file2: FileInfo): MatchResult | undefined {
    for (const result1 of file1.matchResults) {
      for (const result2 of file2.matchResults) {
        // - Get the first match results
        const isMatch = this.checkIfResultsMatch(result1, result2);
        if (isMatch) {
          return result2;
        }
      }
    }

    return undefined;
  }

  private calculateResultWithRule(file: FileInfo, rule: MatchRule): MatchResult | undefined {
    const fileName = file.getName();

    // - Trying to match file name with each expression, only one match is needed.
    for (const expression of rule.expressions) {
      try {
        const segments = this.calculateSegmentsWithExpression(fileName, expression);
        if (!segments) {
          continue;
        }

        // > Only the first match is needed
        let result = new MatchResult(file, rule, segments);
        return result;
      } catch (error) {
        console.error(
          `Error on matching expression ${fileName} with file name ${expression}. ${error}`
        );
      }
    }

    return undefined;
  }

  private calculateSegmentsWithExpression(
    fileName: string,
    expression: string
  ): Segment[] | undefined {
    const valid = constants.expressionRegExp.test(expression);
    if (!valid) {
      console.error("Matching Expression is not valid: " + expression);
      throw new Error("Matching Expression is not valid: " + expression);
    }

    // - Trying to break file name into segments with expression
    let segments: Segment[] = [];
    let isMatch = true;

    // - Separate the expression into array of constants and variables
    // E.g. {1}, {-1}, {*}
    let expressionVariables = expression.match(constants.expressionRegExp);
    // Anything not variables. E.g. service
    let expressionConstants = expression.split(constants.expressionRegExp);

    // - No variable in the expression is detected. The file name must be exactly the same as the expression
    if (!expressionVariables) {
      const segment = new Segment(SegmentType.constant, expression, fileName);
      segments.push(segment);
      return fileName === expression ? segments : undefined;
    }

    // Ignore empty string at the start and end
    if (!expressionConstants[0]) {
      expressionConstants.shift();
    }
    if (!expressionConstants[expressionConstants.length - 1]) {
      expressionConstants.pop();
    }

    let expressionVarIndex = 0;
    let expressionConstIndex = 0;

    // - Find each expression and constants as segment for the file name
    while (expressionConstIndex < expressionConstants.length) {
      const expressionVar = expressionVariables[expressionVarIndex];
      const expressionConst = expressionConstants[expressionConstIndex];

      // - Trying to match constants in the expression with the file name.
      // - Then extract elements between two constants as a variable
      let start = fileName.indexOf(expressionConst);
      if (start < 0) {
        // > If any constant value cannot be found in the expression, string does not match
        // E.g. fileName: account.ts, expressionConst: service. "service" not found
        isMatch = false;
        break;
      } else if (start > 0) {
        if (!expressionVar) {
          // > Constant is not the first value, but no variable is defined at the first value, string does not match
          // E.g. fileName: accountService.ts, expressionConst: service
          isMatch = false;
          break;
        }

        // > Start with variable
        // E.g. fileName: accountService.ts, expressionConst: {1}account.ts
        let value = fileName.substring(0, start);
        const segment = new Segment(SegmentType.variable, expressionVar, value);
        segments.push(segment);
        fileName = fileName.substring(start);
        expressionVarIndex++;
      } else {
        // > Start with constant
        // E.g. fileName: accountService.ts, expressionConst: account{1}.ts
        const segment = new Segment(SegmentType.constant, expressionConst, expressionConst);
        segments.push(segment);

        // Start next match for the remaining string
        fileName = fileName.substring(expressionConst.length);
        expressionConstIndex++;
      }
    }

    // - Some segments does not match
    if (!isMatch) {
      return undefined;
    }

    // - File name matches, but it may still have one more element
    if (expressionVarIndex < expressionVariables.length) {
      // > If Last element is constant, add the element to the end of the list
      // E.g. fileName: accountService.ts, expression: accountService.{*}
      // File name here already substring-ed
      const segment = new Segment(
        SegmentType.variable,
        expressionVariables[expressionVarIndex],
        fileName
      );
      segments.push(segment);
    }

    return segments;
  }

  private checkIfResultsMatch(result1: MatchResult, result2: MatchResult): boolean {
    const isVariablesMatch = this.checkIfResultVariablesMatch(result1, result2);
    const isConstantsMatch = this.checkIfConstantsMatch(result1, result2);
    return isVariablesMatch && isConstantsMatch;
  }

  private checkIfResultVariablesMatch(result1: MatchResult, result2: MatchResult): boolean {
    // - For variables: {-1}
    const variableSegments1 = result1.segments.filter((x) =>
      x.expression.match(constants.expressionSimilarRegExp)
    );
    const variableSegments2 = result2.segments.filter((x) =>
      x.expression.match(constants.expressionSimilarRegExp)
    );

    for (const segment1 of variableSegments1) {
      for (const segment2 of variableSegments2) {
        const isMatch = this.checkIfSegmentsMatch(result1, result2, segment1, segment2);
        if (!isMatch) {
          return false;
        }
      }
    }

    return true;
  }

  private checkIfConstantsMatch(result1: MatchResult, result2: MatchResult): boolean {
    // - For constants: {1}
    const constantSegments1 = result1.segments.filter((x) =>
      x.expression.match(constants.expressionConstantRegExp)
    );
    const constantSegments2 = result2.segments.filter((x) =>
      x.expression.match(constants.expressionConstantRegExp)
    );

    for (const seg1 of constantSegments1) {
      for (const seg2 of constantSegments2) {
        if (seg1.value !== seg2.value) {
          return false;
        }
      }
    }
    return true;
  }

  private checkIfSegmentsMatch(
    result1: MatchResult,
    result2: MatchResult,
    segment1: Segment,
    segment2: Segment
  ): boolean {
    if (segment1.value === segment2.value) {
      return false;
    }

    // - Get the number from the expression string
    // E.g. {-1}
    const numberStrings = segment1.expression.match(constants.expressionSimilarRegExp);
    if (!numberStrings) {
      return false;
    }

    let numberString = numberStrings[0];
    // From {-1}, maxCount = -1
    let maxDifference = Number(numberString.substring(1, numberString.length - 1)) * -1;

    let array1 = this.breakStringWithStrings(segment1.value, result1.rule.breakChars);
    let array2 = this.breakStringWithStrings(segment2.value, result2.rule.breakChars);
    let count = this.calculateDifferenceBetweenArrays(array1, array2);

    if (count > maxDifference) {
      return false;
    }

    return true;
  }

  private breakStringWithStrings(text: string, array: string[]): string[] {
    // - Make regex string from array
    // E.g. array = ["-", "_", ".", "{Cap}"], regexString = [.-_]|(?=[A-Z])
    let regexString = "[";

    let breakCap = false;
    for (const item of array) {
      if (item.toLowerCase() === "{cap}") {
        // > For capital
        breakCap = true;
      } else {
        // > For other characters
        regexString += item;
      }
    }

    regexString += "]";

    // Add capital characters
    if (breakCap) {
      regexString += "|(?=[A-Z])";
    }

    const regex = new RegExp(
      regexString,
      "g" // Allow breaking multiple
    );
    const result = text.split(regex);
    return result;
  }

  private calculateDifferenceBetweenArrays(array1: string[], array2: string[]): number {
    let count = 0;
    let differ1 = array1.filter((x) => !array2.includes(x));
    let differ2 = array2.filter((x) => !array1.includes(x));

    count = differ1.length + differ2.length;
    return count;
  }
}
