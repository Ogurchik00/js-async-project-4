#!/usr/bin/env node
import process from 'process';
import { program } from 'commander';
import { pageLoader } from './pageLoader.js';

program
  .version('1.0.0')
  .requiredOption('-o, --output [dir]', 'output directory')
  .argument('<url>', 'URL страницы')
  .parse(process.argv);

const options = program.opts();
const [url] = program.args;

pageLoader(url, options.output)
  .then((filePath) => {
    console.log(`Страница успешно сохранена: ${filePath}`);
  })
  .catch((err) => {
    console.error(err.message); // выводим в STDERR
    process.exit(1); // код ошибки
  });