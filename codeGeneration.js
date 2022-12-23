let currentFunction = '';
let currentCall = 0;
export function generateCode(tokens, filename) {
  let code = '';
  tokens.forEach((token) => {
    if (token.type === 'primitiveOperation') {
      code += generatePrimitiveOperationCode(token);
      return;
    }
    if (token.type === 'memoryAccessCommand') {
      code += generateMemoryAccessCommandCode(token, filename);
      return;
    }
    if (token.type === 'branchingCommand') {
      code += generateBranchingCommandCode(token, filename);
      return;
    }
    if (token.type === 'functionCommand') {
      code += generateFunctionCommandCode(token, filename);
      return;
    }
    throw new Error(`Invalid token: ${JSON.stringify(token, null, 2)}`);
  });
  return code;
}

const POP_STACK = '@SP\n' + 'AM=M-1\n' + 'D=M\n' + '@SP\n' + 'AM=M-1\n';
const INCREASE_STACK_POINTER = '@SP\n' + 'M=M+1\n';
let ifElseCount = 0;
function ifElseLogic() {
  const ifElse =
    `(FALSE_${ifElseCount})\n` +
    '@SP\n' +
    'A=M\n' +
    'M=0\n' +
    `@ENDIF_${ifElseCount}\n` +
    '0;JMP\n' +
    `(TRUE_${ifElseCount})\n` +
    '@SP\n' +
    'A=M\n' +
    'M=-1\n' +
    `(ENDIF_${ifElseCount})\n`;
  ifElseCount++;
  return ifElse;
}

function generatePrimitiveOperationCode(token) {
  if (token.operation === 'add') {
    // SP--;
    // value = *SP;
    // SP--;
    // *SP = *SP + value;
    // SP++;
    return '// add\n' + POP_STACK + 'M=D+M\n' + INCREASE_STACK_POINTER;
  }
  if (token.operation === 'sub') {
    // SP--;
    // value = *SP;
    // SP--;
    // *SP = *SP - value;
    // SP++;
    return '// sub\n' + POP_STACK + 'M=M-D\n' + INCREASE_STACK_POINTER;
  }
  if (token.operation === 'neg') {
    // SP--;
    // *SP = -*SP;
    // SP++;
    return (
      '// neg\n' + '@SP\n' + 'AM=M-1\n' + 'M=-M\n' + INCREASE_STACK_POINTER
    );
  }
  if (token.operation === 'eq') {
    // if(*SP == *(SP - 1)) (*SP - 1) = -1;
    // else (*SP - 1) = 0;
    // SP--;
    return (
      '// eq\n' +
      POP_STACK +
      'D=M-D\n' +
      `@TRUE_${ifElseCount}\n` +
      'D;JEQ\n' +
      ifElseLogic() +
      INCREASE_STACK_POINTER
    );
  }
  if (token.operation === 'gt') {
    // if(*(SP - 1) > *SP) (*SP - 1) = -1;
    // else (*SP - 1) = 0;
    // SP--;
    return (
      '// gt\n' +
      POP_STACK +
      'D=M-D\n' +
      `@TRUE_${ifElseCount}\n` +
      'D;JGT\n' +
      ifElseLogic() +
      INCREASE_STACK_POINTER
    );
  }
  if (token.operation === 'lt') {
    // if(*(SP - 1) < *SP) (*SP - 1) = -1;
    // else (*SP - 1) = 0;
    // SP--;
    return (
      '// lt\n' +
      POP_STACK +
      'D=M-D\n' +
      `@TRUE_${ifElseCount}\n` +
      'D;JLT\n' +
      ifElseLogic() +
      INCREASE_STACK_POINTER
    );
  }
  if (token.operation === 'and') {
    // *(SP - 1) = *SP & *(SP - 1); SP--;
    return '// and\n' + POP_STACK + 'M=D&M\n' + INCREASE_STACK_POINTER;
  }
  if (token.operation === 'or') {
    // *(SP - 1) = *SP | *(SP - 1); SP--;
    return '// or\n' + POP_STACK + 'M=M|D\n' + INCREASE_STACK_POINTER;
  }
  if (token.operation === 'not') {
    // *SP = !*SP;
    return (
      '// not\n' + '@SP\n' + 'AM=M-1\n' + 'M=!M\n' + INCREASE_STACK_POINTER
    );
  }
  throw new Error(`Invalid Token: ${token}`);
}

const PUSH_TO_STACK = '@SP\n' + 'A=M\n' + 'M=D\n' + '@SP\n' + 'M=M+1\n';
const segmentVarName = {
  local: 'LCL',
  argument: 'ARG',
  this: 'THIS',
  that: 'THAT',
};

function pushToMemorySegment(segment, index) {
  return (
    `// push ${segment} ${index}\n` +
    `@${index}\n` +
    'D=A\n' +
    `@${segmentVarName[segment]}\n` +
    'A=D+M\n' +
    'D=M\n' +
    PUSH_TO_STACK
  );
}
function popToMemorySegment(segment, index) {
  return (
    `// pop ${segment} ${index}\n` +
    '@SP\n' +
    'AM=M-1\n' +
    'D=M\n' +
    '@value\n' +
    'M=D\n' +
    `@${index}\n` +
    'D=A\n' +
    `@${segmentVarName[segment]}\n` +
    'D=D+M\n' +
    '@addr\n' +
    'M=D\n' +
    '@value\n' +
    'D=M\n' +
    '@addr\n' +
    'A=M\n' +
    'M=D\n'
  );
}

function pushToStaticSegment(index, filename) {
  return (
    `// push static ${index}\n` +
    `@${filename}.${index}\n` +
    'D=M\n' +
    PUSH_TO_STACK
  );
}
function popToStaticSegment(index, filename) {
  return (
    `// pop static ${index}\n` +
    '@SP\n' +
    'AM=M-1\n' +
    'D=M\n' +
    `@${filename}.${index}\n` +
    'M=D\n'
  );
}

function pushToTemp(index) {
  return (
    `// push temp ${index}\n` +
    `@${index}\n` +
    'D=A\n' +
    '@5\n' +
    'A=D+A\n' +
    'D=M\n' +
    PUSH_TO_STACK
  );
}
function popToTemp(index) {
  return (
    `// pop temp ${index}\n` +
    '@SP\n' +
    'AM=M-1\n' +
    'D=M\n' +
    '@value\n' +
    'M=D\n' +
    `@${index}\n` +
    'D=A\n' +
    '@5\n' +
    'D=A+D\n' +
    '@addr\n' +
    'M=D\n' +
    '@value\n' +
    'D=M\n' +
    '@addr\n' +
    'A=M\n' +
    'M=D\n'
  );
}
function pushToPointer(index) {
  return (
    `// push pointer ${index}\n` +
    `@${index === '0' ? 'THIS' : 'THAT'}\n` +
    'D=M\n' +
    PUSH_TO_STACK
  );
}
function popToPointer(index) {
  return (
    `// pop pointer ${index}\n` +
    '@SP\n' +
    'AM=M-1\n' +
    'D=M\n' +
    `@${index === '0' ? 'THIS' : 'THAT'}\n` +
    'M=D\n'
  );
}

function generateMemoryAccessCommandCode(token, filename) {
  const { memorySegment, stackOperation, index } = token;
  if (memorySegment === 'constant') {
    if (stackOperation === 'push') {
      return (
        `// push constant ${index}\n` + `@${index}\n` + 'D=A\n' + PUSH_TO_STACK
      );
    }
    if (stackOperation === 'pop') {
      throw new Error('Cannot pop to a constant');
    }
  }
  if (memorySegment === 'local') {
    if (stackOperation === 'push') {
      return pushToMemorySegment('local', index);
    }
    if (stackOperation === 'pop') {
      return popToMemorySegment('local', index);
    }
  }
  if (memorySegment === 'argument') {
    if (stackOperation === 'push') {
      return pushToMemorySegment('argument', index);
    }
    if (stackOperation === 'pop') {
      return popToMemorySegment('argument', index);
    }
  }
  if (memorySegment === 'this') {
    if (stackOperation === 'push') {
      return pushToMemorySegment('this', index);
    }
    if (stackOperation === 'pop') {
      return popToMemorySegment('this', index);
    }
  }
  if (memorySegment === 'that') {
    if (stackOperation === 'push') {
      return pushToMemorySegment('that', index);
    }
    if (stackOperation === 'pop') {
      return popToMemorySegment('that', index);
    }
  }
  if (memorySegment === 'static') {
    if (stackOperation === 'push') {
      return pushToStaticSegment(index, filename);
    }
    if (stackOperation === 'pop') {
      return popToStaticSegment(index, filename);
    }
  }
  if (memorySegment === 'temp') {
    if (stackOperation === 'push') {
      return pushToTemp(index);
    }
    if (stackOperation === 'pop') {
      return popToTemp(index);
    }
  }
  if (memorySegment === 'pointer') {
    if (index !== '0' && index !== '1')
      throw new Error(`Invalid pointer segment target: ${token}`);
    if (stackOperation === 'push') {
      return pushToPointer(index);
    }
    if (stackOperation === 'pop') {
      return popToPointer(index);
    }
  }
  throw new Error(`Invalid memory segment destination: ${token}`);
}
function generateBranchingCommandCode(token, filename) {
  const { command, label } = token;
  const codeLabel = currentFunction
    ? `${filename}.${currentFunction}$${label}`
    : label;
  if (command === 'label') {
    return `// label ${codeLabel}` + `(${codeLabel})\n`;
  }
  if (command === 'goto') {
    return `// goto ${codeLabel}` + `@${codeLabel}\n` + '0;JMP\n';
  }
  if (command === 'if-goto') {
    return (
      `// if-goto ${codeLabel}` +
      '@SP\n' +
      'AM=M-1\n' +
      'D=M\n' +
      `@${codeLabel}\n` +
      'D;JNE\n'
    );
  }
}
function generateFunctionCommandCode(token, filename) {
  if (token.command === 'call') {
    return generateCallCode(token, filename);
  }
  if (token.command === 'function') {
    generateFunctionCode(token, filename);
  }
  if (token.command === 'return') {
    generateReturnCode();
  }
}
function generateCallCode(token, filename) {
  const { label, args } = token;
  const returnAddressLabel = `${filename}.${label}$ret.${currentCall++}`;
  return (
    `// call ${label} ${args}` +
    pushReturnAddressToStack() +
    pushRegisterToStack('LCL') +
    pushRegisterToStack('ARG') +
    pushRegisterToStack('THIS') +
    pushRegisterToStack('THAT') +
    repositionArg() +
    repositionLcl() +
    goToFunction() +
    `(${returnAddressLabel})\n`
  );
  function pushReturnAddressToStack() {
    return `@${returnAddressLabel}\n` + 'D=A\n' + PUSH_TO_STACK;
  }
  function pushRegisterToStack(register) {
    return `@${register}\n` + 'D=M\n' + PUSH_TO_STACK;
  }
  function repositionArg() {
    return (
      '@SP\n' +
      'D=M\n' +
      '@5\n' +
      'D=D-A\n' +
      `@${args}\n` +
      'D=D-A\n' +
      '@ARG\n' +
      'M=D\n'
    );
  }
  function repositionLcl() {
    return '@SP\n' + 'D=M\n' + '@LCL\n' + 'M=D\n';
  }
  function goToFunction() {
    return `@${filename}.${label}\n` + '0;JMP\n';
  }
}
function generateFunctionCode(token, filename) {
  const { label, args } = token;
  currentFunction = label;
  const LOCAL_COUNTER = '@R13\n';
  const INTERNAL_LOOP_LABEL = `${filename}.${currentFunction}$__INTERNAL_LOOP__`;
  const END_LOOP_LABEL = `${filename}.${currentFunction}$__INTERNAL_LOOP_END__`;
  return (
    `// function ${label} ${args}` +
    `(${filename}.${label})\n` +
    LOCAL_COUNTER +
    'M=0\n' +
    `(${INTERNAL_LOOP_LABEL})\n` +
    `@${args}\n` +
    'D=A\n' +
    LOCAL_COUNTER +
    'D=D-M\n' +
    `@${END_LOOP_LABEL}\n` +
    'D;JEQ\n' +
    'D=0\n' +
    PUSH_TO_STACK +
    LOCAL_COUNTER +
    'M=M+1\n' +
    `@${INTERNAL_LOOP_LABEL}\n` +
    '0;JMP\n' +
    `(${END_LOOP_LABEL})`
  );
}
function generateReturnCode() {
  currentFunction = '';
  const FRAME = '@R13\n';
  const RETURN_ADDRESS = '@R14\n';
  return (
    `// return` +
    storeLcl() +
    storeReturnAddres() +
    writeReturnValue() +
    repositionStackPointer() +
    restoreRegister('THAT') +
    restoreRegister('THIS') +
    restoreRegister('ARG') +
    restoreRegister('LCL') +
    goToReturnAddress()
  );
  function storeLcl() {
    return '@LCL\n' + 'D=M\n' + FRAME + 'M=D\n';
  }
  function storeReturnAddres() {
    return (
      FRAME + 'D=M\n' + '@5\n' + 'A=D-A\n' + 'D=M\n' + RETURN_ADDRESS + 'M=D\n'
    );
  }
  function writeReturnValue() {
    return '@SP\n' + 'AM=M-1\n' + 'D=M\n' + '@ARG\n' + 'A=M\n' + 'M=D\n';
  }
  function repositionStackPointer() {
    return '@ARG\n' + 'D=M+1\n' + '@SP\n' + 'M=D\n';
  }
  function restoreRegister(register) {
    const registerOffsetMap = {
      THAT: 1,
      THIS: 2,
      ARG: 3,
      LCL: 4,
    };
    return (
      FRAME +
      'D=M\n' +
      `@${registerOffsetMap[register]}\n` +
      'A=D-A\n' +
      'D=M\n' +
      `@${register}\n` +
      'M=D\n'
    );
  }
  function goToReturnAddress() {
    return RETURN_ADDRESS + 'A=M\n' + '0;JMP\n';
  }
}
export function generateInitCode() {
  return (
    '// init' +
    `@256\n` +
    'D=A\n' +
    '@SP\n' +
    'M=D\n' +
    `@Sys.init\n` +
    '0;JMP\n'
  );
}
