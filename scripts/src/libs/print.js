/**
 * 错误日志
 */
function printError(message) {
  console.error('❌ ', new Error(message));
  process.exit(1);
}

/**
 * 日志
 */
function print(message) {
  console.log('🚴 ', message);
}

/**
 * 成功日志
 */
function printSuccess(message) {
  console.log('👌 ', message);
}

module.exports = {
  print,
  printSuccess,
  printError,
};
