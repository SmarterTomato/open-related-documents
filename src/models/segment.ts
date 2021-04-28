import SegmentType from "../interfaces/segmentType";

export default class Segment {
  constructor(public type: SegmentType, public expression: string, public value: string) {}
}
