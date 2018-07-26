const setup = require('./starter-kit/setup');
const aws = require('aws-sdk');
const fs = require('fs');

exports.handler = async (event, context, callback) => {
  // For keeping the browser launch
  context.callbackWaitsForEmptyEventLoop = false;
  const browser = await setup.getBrowser();
  exports.run(browser).then(
    (result) => callback(null, result)
  ).catch(
    (err) => callback(err)
  );
};

exports.run = async (browser) => {
  const page = await browser.newPage();
  await page.setViewport({width: 1024, height: 768});

  page.on('dialog', async (dialog) => {
    await dialog.dismiss();
  });

  await page.goto('http://efisco.sefaz.pe.gov.br/sfi_trb_gpf/PREmitirCertidaoNegativaNarrativaDebitoFiscal',
   {waitUntil: ['domcontentloaded', 'networkidle0']}
  );
  await page.select('select#cdTipoDocumento', '2');
  await page.select('select#cdOrgaoEmissor', '1');
  await page.type('#nuDocumento', '17358877000151');

  // await page.evaluate(() => {
  //   const element = document.querySelector('#btt_emitir');
  //   console.log(element);
  //   element.click();
  //   return true;
  // });
  // console.log('pageclick');

  // await page.screenshot({path: '/tmp/screenshot.png'});
  // const s3 = new aws.S3({apiVersion: '2006-03-01'});
  // const screenshot = await new Promise((resolve, reject) => {
  //   fs.readFile('/tmp/screenshot.png', (err, data) => {
  //     if (err) return reject(err);
  //     resolve(data);
  //   });
  // });
  // await s3.putObject({
  //   Bucket: 'screenshots-debug',
  //   Key: 'screenshot.png',
  //   Body: screenshot,
  // }).promise();

  console.log('about to click');
  await page.waitFor('#btt_emitir');
  console.log('waited');
  await Promise.all([
    page.waitForNavigation(),
    page.click('#btt_emitir'),
  ]);

  await page.close();
  return 'done';
};
