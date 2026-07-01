import { getTemplateNames, writeTemplateToDir } from '../src/core/templates.js';
import * as path from 'path';

console.log('Generating 20 template directories inside templates/workflows/...');

const names = getTemplateNames();
const targetParent = path.join(process.cwd(), 'templates', 'workflows');

names.forEach((name) => {
  const targetDir = path.join(targetParent, name);
  console.log(`Writing template: ${name}`);
  writeTemplateToDir(name, targetDir);
});

console.log('Template generation complete!');
