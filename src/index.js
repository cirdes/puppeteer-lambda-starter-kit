const setup = require('./starter-kit/setup');
const aws = require('aws-sdk');
const fs = require('fs');

exports.handler = async (event, context, callback) => {
  console.log(event);
  // For keeping the browser launch
  context.callbackWaitsForEmptyEventLoop = false;
  const browser = await setup.getBrowser();
  exports.run(browser, event.queryStringParameters.cnpj).then(
    (result) => callback(null, result)
  ).catch(
    (err) => callback(err)
  );
};

exports.run = async (browser, params) => {
  let cnpj = '17358877000151';
  if (params) {
    cnpj = params;
  }

  // page creating and setup
  const page = await browser.newPage();
  await page.setViewport({width: 1024, height: 720});
  await page.setDefaultNavigationTimeout(60000);

  // get ready to dismiss dialogs
  page.on('dialog', async (dialog) => {
    await dialog.dismiss();
  });

  // goes to page
  await page.goto('http://efisco.sefaz.pe.gov.br/sfi_trb_gpf/PREmitirCertidaoNegativaNarrativaDebitoFiscal',
   {waitUntil: ['domcontentloaded', 'networkidle0']}
  );

  // input data to forms
  await page.select('#cdTipoDocumento', '2');
  await page.select('select#cdOrgaoEmissor', '1');
  await page.type('#nuDocumento', cnpj);

  // Go to download page
  await page.evaluate(() => {
    const element = document.querySelector('#btt_emitir');
    element.click();
  });
  await page.waitForNavigation();

  // Set download path and click
  await page.waitFor('input[name="btt_pmu_acao_4"]');
  await page._client.send('Page.setDownloadBehavior',
    {behavior: 'allow', downloadPath: '/tmp/'});
  await page.evaluate(() => {
    const element = document.querySelector('input[name="btt_pmu_acao_4"]');
    element.click();
  });
  await page.waitFor(5000);

  // read pdf from disk
  const pdf = await new Promise((resolve, reject) => {
    fs.readFile('/tmp/RelatorioCertidaoNegativaInscrito.pdf', (err, data) => {
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

  // response in API Gateway Format
  const response = {
       statusCode: 200,
       body: JSON.stringify({pdf: 'https://s3.amazonaws.com/screenshots-debug/RelatorioCertidaoNegativaInscrito.pdf'}),
       isBase64Encoded: false,
   };

  await page.close();
  return response;
};
