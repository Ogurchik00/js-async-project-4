import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { load } from 'cheerio';
import { Listr } from 'listr2';
import debug from 'debug';

const log = debug('page-loader');

// Нормализует имя HTML файла по URL
const normalizeName = (url) => {
  const { hostname, pathname } = new URL(url);
  const name = `${hostname}${pathname}`.replace(/[^a-zA-Z0-9]/g, '-');
  return `${name}.html`;
};

// Нормализует имя ресурса (изображения, css, js)
const normalizeResourceName = (baseUrl, resourcePath) => {
  const { hostname } = new URL(baseUrl);
  return `${hostname}${resourcePath}`.replace(/[^a-zA-Z0-9]/g, '-') + path.extname(resourcePath);
};

// Загрузка ресурсов с отображением прогресса
const downloadResourcesWithProgress = (resources) => {
  const tasks = resources.map(({ url, resourcePath }) => ({
    title: `Скачиваем ${url}`,
    task: () => axios.get(url, { responseType: 'arraybuffer' })
      .then(res => fs.writeFile(resourcePath, res.data))
      .catch(err => {
        throw new Error(`Не удалось скачать ${url}: ${err.message}`);
      }),
  }));

  const listr = new Listr(tasks, { concurrent: true, exitOnError: false });
  return listr.run();
};

// Основная функция загрузки страницы
export const pageLoader = (url, outputDir = process.cwd()) => {
  const mainFileName = normalizeName(url);
  const mainFilePath = path.resolve(outputDir, mainFileName);
  const resourcesDirName = mainFileName.replace(/\.html$/, '_files');
  const resourcesDirPath = path.resolve(outputDir, resourcesDirName);

  log('Скачиваем страницу: %s', url);

  return axios.get(url)
    .then(response => {
      const $ = load(response.data);
      return fs.mkdir(resourcesDirPath, { recursive: true })
        .then(() => {
          const resources = [];

          $('img[src], link[href], script[src]').each((_, el) => {
            const attrName = el.tagName === 'link' ? 'href' : 'src';
            const attrValue = $(el).attr(attrName);
            if (!attrValue) return;

            const resourceUrl = new URL(attrValue, url);
            if (resourceUrl.host !== new URL(url).host) return;

            const resourceName = normalizeResourceName(url, resourceUrl.pathname);
            const resourcePath = path.join(resourcesDirPath, resourceName);

            $(el).attr(attrName, `${resourcesDirName}/${resourceName}`);
            resources.push({ url: resourceUrl.href, resourcePath });
          });

          return downloadResourcesWithProgress(resources)
            .then(() => fs.writeFile(mainFilePath, $.html()))
            .then(() => mainFilePath);
        });
    })
    .catch((err) => {
      log('Ошибка при загрузке страницы: %O', err);
      throw err;
    });
};
