const primitiveOperations = [
  'add',
  'sub',
  'neg',
  'eq',
  'gt',
  'lt',
  'and',
  'or',
  'not',
];
const memorySegments = [
  'local',
  'argument',
  'this',
  'that',
  'constant',
  'static',
  'temp',
  'pointer',
];
const stackOperations = ['pop', 'push'];
const branchingCommands = ['label', 'if-goto', 'goto'];
const functionCommands = ['return', 'function', 'call'];
export function parseFile(source) {
  const lines = source
    .split('\n')
    .map((l) => l.trim())
    .filter((line) => line && !line.startsWith('//'));
  const tokens = [];
  lines.forEach((line, i) => {
    if (primitiveOperations.includes(line)) {
      return tokens.push({
        type: 'primitiveOperation',
        operation: line,
      });
    }
    const words = line
      .split(' ')
      .filter(Boolean)
      .map((w) => w.trim());
    if (isMemoryAccessCommand(words)) {
      return tokens.push({
        type: 'memoryAccessCommand',
        stackOperation: words[0],
        memorySegment: words[1],
        index: words[2],
      });
    }
    if (isBranchingCommand(words)) {
      return tokens.push({
        type: 'branchingCommand',
        command: words[0],
        label: words[1],
      });
    }
    if (isFunctionCommand(words)) {
      return tokens.push({
        type: 'functionCommand',
        command: words[0],
        label: words[1] || '',
        args: words[2] || '',
      });
    }
    throw new Error(`Invalid command: ${line} \nLine ${i + 1}`);
  });
  return tokens;
}
const identifierRegex = /^[A-Za-z_.:][A-Za-z_.:0-9]*/;
function isBranchingCommand(words) {
  if (words.length !== 2) return false;
  const [command, label] = words;
  return branchingCommands.includes(command) && label.match(identifierRegex);
}
function isFunctionCommand(words) {
  if (words[0] === 'return') {
    if (words.length !== 1) return false;
    return true;
  }
  if (words.length !== 3) return false;
  const [command, name, args] = words;
  return (
    functionCommands.includes(command) &&
    name.match(identifierRegex) &&
    Number.isInteger(Number(args))
  );
}
function isMemoryAccessCommand(words) {
  if (words.length !== 3) return false;
  const [stackOperation, memorySegment, index] = words;
  return (
    stackOperations.includes(stackOperation) &&
    memorySegments.includes(memorySegment) &&
    Number.isInteger(Number(index))
  );
}
