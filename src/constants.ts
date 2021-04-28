// {1}, {-1}, {*}
const expressionRegExp = /{[\d]*}|{-[\d]*}|[*]/g;
// {1}
const expressionConstantRegExp = /{[\d]*}/g;
// {-1}
const expressionSimilarRegExp = /{-[\d]*}/g;

const constants = { expressionRegExp, expressionConstantRegExp, expressionSimilarRegExp };
export default constants;
