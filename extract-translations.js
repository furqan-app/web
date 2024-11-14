const fs = require('fs-extra');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// Define the directories and files
const srcDir = path.join(__dirname, 'app');
const localesDir = path.join(__dirname, 'messages');
const languages = ['en', 'ar'];

// Function to extract translation keys from a file
function extractKeysFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const ast = parser.parse(content, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  const translations = new Map();

  traverse(ast, {
    CallExpression({ node }) {
      if (node.callee.name === 't' || node.callee.name === 'useTranslations') {
        if (node.arguments.length >= 2) {
          const keyArg = node.arguments[0];
          const defaultMessageArg = node.arguments[1];
          
          if (keyArg.type === 'StringLiteral' && defaultMessageArg.type === 'StringLiteral') {
            translations.set(keyArg.value, defaultMessageArg.value);
          }
        } else if (node.arguments.length === 1 && node.arguments[0].type === 'StringLiteral') {
          // Handle case where only key is provided
          translations.set(node.arguments[0].value, '');
        }
      }
    },
  });

  return translations;
}

// Function to update message files
function updateMessageFiles(translations) {
  languages.forEach((lang) => {
    const filePath = path.join(localesDir, `${lang}.json`);
    const messages = fs.existsSync(filePath) ? fs.readJsonSync(filePath) : {};

    translations.forEach((defaultMessage, key) => {
      if (!messages[key]) {
        messages[key] = defaultMessage || ''; // Use default message if available
      }
    });

    fs.writeJsonSync(filePath, messages, { spaces: 2 });
  });
}

// Function to recursively find all .tsx files
function findAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findAllFiles(filePath, fileList);
    } else if (filePath.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

// Main function to extract keys and update message files
function main() {
  const files = findAllFiles(srcDir);
  const allTranslations = new Map();

  files.forEach((file, index) => {
    // Create progress bar
    const progress = Math.round(((index + 1) / files.length) * 100);
    const progressBar = '='.repeat(progress/2) + '-'.repeat(50 - progress/2);
    process.stdout.write(`\rProcessing: [${progressBar}] ${progress}%`);
    
    const translations = extractKeysFromFile(file);
    translations.forEach((defaultMessage, key) => {
      // Only override if we don't have a default message yet
      if (!allTranslations.has(key) || !allTranslations.get(key)) {
        allTranslations.set(key, defaultMessage);
      }
    });
  });

  process.stdout.write('\n'); // New line after progress bar
  updateMessageFiles(allTranslations);
  console.log('\x1b[32m\x1b[1m%s\x1b[0m', 'Translation extraction completed successfully! Message files have been updated.');
}

main();