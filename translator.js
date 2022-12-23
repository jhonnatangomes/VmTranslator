import { statSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { parseFile } from './parser.js';
import { generateCode, generateInitCode } from './codeGeneration.js';

function main() {
  const args = process.argv.slice(2);
  if (args.length === 1) {
    const [arg] = args;
    const isDirectory = statSync(arg).isDirectory();
    const initCode = generateInitCode();
    if (isDirectory) {
      const files = readdirSync(arg);
      const outputCode = files
        .filter((file) => file.endsWith('.vm'))
        .map(translate)
        .join('\n');
      writeFileSync(arg + '.asm', initCode + outputCode);
    } else {
      const outputCode = translate(arg);
      const filename = arg.replace('.vm', '');
      writeFileSync(filename + '.asm', initCode + outputCode);
    }
  } else {
    console.log('Usage: node translator.js file | directory');
  }
}

function translate(path) {
  const file = readFileSync(path).toString();
  const filename = path.replace('.vm', '');
  const parsedFile = parseFile(file);
  return generateCode(parsedFile, filename);
}

main();
