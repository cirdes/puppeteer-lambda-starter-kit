const setup = require('./starter-kit/setup');
const puppet = require('./utils/puppet');

exports.handler = async (event) => {
  let result;
  let browser;
  try {
    browser = await setup.getBrowser();
    result = await exports.run(browser, event.queryStringParameters);
  } catch (err) {
        console.log(err);
        return err;
  }
  return result;
};

exports.run = async (browser, params) => {
  let cnpj = '17358877000151';
  if (params && params.cnpj) {
    cnpj = params.cnpj;
  }

  // page creating and setup
  const page = await browser.newPage();
  await puppet.setup(page);

  // goes to page
  await page.goto('http://efisco.sefaz.pe.gov.br/sfi_trb_gpf/PREmitirCertidaoNegativaNarrativaDebitoFiscal',
   {waitUntil: ['domcontentloaded', 'networkidle0']}
  );
  // input data to forms
  await page.select('#cdTipoDocumento', '2');
  await page.waitFor('select#cdOrgaoEmissor option[value="1"]');
  await page.select('select#cdOrgaoEmissor', '1');
  await page.type('#nuDocumento', cnpj);
  await page.evaluate(() => {
    const element = document.querySelector('#btt_emitir');
    element.click();
  });

  // Download certificate
  await page.waitFor('input[name="btt_pmu_acao_4"]');
  await page.evaluate(() => {
    const element = document.querySelector('input[name="btt_pmu_acao_4"]');
    element.click();
  });
  await page.waitForNavigation({waitUntil: 'networkidle0'});
  await puppet.updateToS3('RelatorioCertidaoNegativaInscrito.pdf');

  // response in API Gateway Format
  const response = {
       statusCode: 200,
       body: JSON.stringify({pdf: 'https://s3.amazonaws.com/screenshots-debug/RelatorioCertidaoNegativaInscrito.pdf'}),
       isBase64Encoded: false,
   };

  await page.close();
  return response;
};
