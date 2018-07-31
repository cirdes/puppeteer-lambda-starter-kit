const fs = require('fs');
const puppeteer = require('puppeteer');
const config = require('./config');

exports.getBrowser = (() => {
  let browser;
  return async () => {
    if (typeof browser === 'undefined' || !await isBrowserAvailable(browser)) {
      await setupChrome();
      browser = await puppeteer.launch({
        headless: false,
        executablePath: config.executablePath,
        args: config.launchOptionForLambda,
        dumpio: !!exports.DEBUG,
      });
      debugLog(async (b) => `launch done: ${await browser.version()}`);
    }
    return browser;
  };
})();

const isBrowserAvailable = async (browser) => {
  try {
    await browser.version();
  } catch (e) {
    debugLog(e); // not opened etc.
    return false;
  }
  return true;
};

const setupChrome = async () => {
  if (!await existsExecutableChrome()) {
    await setupLocalChrome();
    debugLog('setup done');
  }
};

const existsExecutableChrome = () => {
  return new Promise((resolve, reject) => {
    fs.exists(config.executablePath, (exists) => {
      resolve(exists);
    });
  });
};

const setupLocalChrome = () => {
  return new Promise((resolve, reject) => {
    let output = config.executablePath;
    const source = fs.createReadStream(config.localChromePath);
    const target = fs.createWriteStream(output);
    console.log(`source${source}`);
    console.log(`target${output}`);
    source.on('error', (error) => {
      return reject(error);
    });

    target.on('error', (error) => {
      return reject(error);
    });

    target.on('close', () => {
      fs.chmod(output, '0755', (error) => {
        if (error) {
          return reject(error);
        }

        return resolve(output);
      });
    });

    source.pipe(require(`${__dirname}/iltorb`).decompressStream()).pipe(target);
  });
};

const debugLog = (log) => {
  if (config.DEBUG) {
    let message = log;
    if (typeof log === 'function') message = log();
    Promise.resolve(message).then((message) => console.log(message));
  }
};
