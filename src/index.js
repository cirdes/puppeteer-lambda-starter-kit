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

  console.log('Node VERSION');
  console.log(process.version);

  const page = await browser.newPage();
  await page.setViewport({width: 1024, height: 720});
  await page.setDefaultNavigationTimeout(60000);

  page.on('dialog', async (dialog) => {
    await dialog.dismiss();
  });

  await page.goto('http://efisco.sefaz.pe.gov.br/sfi_trb_gpf/PREmitirCertidaoNegativaNarrativaDebitoFiscal',
   {waitUntil: ['domcontentloaded', 'networkidle0']}
  );
  console.log('cdTipoDocumento');
  // await page.waitFor('#cdTipoDocumento');
  await page.select('#cdTipoDocumento', '2');
  console.log('cdOrgaoEmissor');
  await page.select('select#cdOrgaoEmissor', '1');
  console.log('nuDocumento');
  console.log(cnpj);
  await page.type('#nuDocumento', cnpj);
  console.log('about to click');

  await page.evaluate(() => {
    const element = document.querySelector('#btt_emitir');
    element.click();
  });
  await page.waitForNavigation();

  await page.waitFor('input[name="btt_pmu_acao_4"]');
  console.log('ja chegou');
  await page._client.send('Page.setDownloadBehavior',
    {behavior: 'allow', downloadPath: '/tmp/'});
  await page.evaluate(() => {
    const element = document.querySelector('input[name="btt_pmu_acao_4"]');
    element.click();
  });
  await page.waitFor(5000);
  console.log('clicked');

  // Init download

  // await page.screenshot({path: '/tmp/screenshot.png'});
  const s3 = new aws.S3({apiVersion: '2006-03-01'});
  const pdf = await new Promise((resolve, reject) => {
    fs.readFile('/tmp/RelatorioCertidaoNegativaInscrito.pdf', (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
  console.log('downloaded');
  await s3.putObject({
    ACL: 'public-read',
    Bucket: 'screenshots-debug',
    Key: 'RelatorioCertidaoNegativaInscrito.pdf',
    Body: pdf,
  }).promise();
  console.log('uploaded');
  // await page.waitFor('#btt_emitir');
  // await Promise.all([
  //   page.waitForNavigation(),
  //   page.click('#btt_emitir'),
  // ]);

  const response = {
       statusCode: 200,
       body: JSON.stringify({pdf: 'https://s3.amazonaws.com/screenshots-debug/RelatorioCertidaoNegativaInscrito.pdf'}),
       isBase64Encoded: false,
   };

  await page.close();
  return response;
};
