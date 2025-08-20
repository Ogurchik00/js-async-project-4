import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import nock from 'nock';
import pageLoader from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getFixturePath = (filename) => path.join(__dirname, '__fixtures__', filename);

describe('page-loader', () => {
  const tmpDir = path.join(__dirname, 'tmp');

  beforeAll(async () => {
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test('downloads page with image', async () => {
    const url = 'https://ru.hexlet.io/courses';
    const htmlFixture = await fs.readFile(getFixturePath('before.html'), 'utf-8');
    const htmlExpected = await fs.readFile(getFixturePath('after.html'), 'utf-8');
    const imageFixture = await fs.readFile(getFixturePath('nodejs.png'));

    nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(200, htmlFixture);

    nock('https://ru.hexlet.io')
      .get('/assets/professions/nodejs.png')
      .reply(200, imageFixture);

    const resultPath = await pageLoader(url, tmpDir);

    const downloadedHtml = await fs.readFile(resultPath, 'utf-8');
    expect(downloadedHtml).toEqual(htmlExpected);

    const resourcesDir = path.join(tmpDir, 'ru-hexlet-io-courses_files');
    const files = await fs.readdir(resourcesDir);
    expect(files).toContain('ru-hexlet-io-assets-professions-nodejs.png');
  });
});