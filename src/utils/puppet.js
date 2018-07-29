/** @module utils/puppet */
const fs = require('fs');
const aws = require('aws-sdk');
const DOWNLOAD_PATH = '/tmp/';

/**
 * Do puppeteer initial setup.
 * @param {Object} page puppeteer page Object.
 */
async function setup(page) {
  // page creating and setup
  await page.setDefaultNavigationTimeout(60000);
  // Set download path
  await page._client.send('Page.setDownloadBehavior',
  {behavior: 'allow', downloadPath: DOWNLOAD_PATH});
  // get ready to dismiss dialogs
  page.on('dialog', async (dialog) => {
    await dialog.dismiss();
  });
}

/**
 * Perform a click and wait for navigation.
 * @param {string} path puppeteer page Object.
 */
async function updateToS3(path) {
  // read pdf from disk
  const pdf = await new Promise((resolve, reject) => {
    fs.readFile(`${DOWNLOAD_PATH}${path}`, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });

  // Uplado to S3 Bucket
  const s3 = new aws.S3({apiVersion: '2006-03-01'});
  await s3.putObject({
    ACL: 'public-read',
    Bucket: 'screenshots-debug',
    Key: 'RelatorioCertidaoNegativaInscrito.pdf',
    Body: pdf,
  }).promise();
}

module.exports = {
    setup,
    updateToS3,
};
