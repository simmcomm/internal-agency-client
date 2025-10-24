import { createInternalAgencyClient } from './dist/index.js';
//import { createInternalAgencyClient } from './index.js';

const client = createInternalAgencyClient({
  serviceId: 'MBIQ000001',
  campaignId: 'MBIQ000001',
  // apiEndpoint: 'https://ssubscribe.eleverse.app/internal/',
  apiEndpoint: 'https://ssubscribe.mybrainiq.com/internal/',
});

// const msisdn = '00971504615118';
const msisdn = '0041787472088';
// client.fridStore.setFrid('f8d47fd2-ea85-40dc-936f-7ed719e4e93f');

// "prepare"
// const submitMsisdnResponse = await client.submitMsisdn(msisdn);
// console.log({ submitResponse: submitMsisdnResponse, frid: client.fridStore.getFrid() });
//
// // validacija pina
// const validatePinResponse = await client.validatePin(msisdn, '7286');
// console.log({ validatePinResponse });

const response = await client.saveEvent('init');
// const response = await client.storeUserData(msisdn, { zip: 'Test', city: 'Test', street: 'Test', product: 'ProtonVPN', lastname: 'Test', firstname: 'Test'
// });
console.log({ response });
