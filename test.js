import { createInternalAgencyClient } from './dist/index.js';
//import { createInternalAgencyClient } from './index.js';

const client = createInternalAgencyClient({
  serviceId: 'INCH000004',
  campaignId: 'INCH000009',
});

const msisdn = '00971504615118';


// "prepare"
const submitMsisdnResponse = await client.submitMsisdn(msisdn);
console.log({ submitResponse: submitMsisdnResponse, frid: client.fridStore.getFrid() });

// validacija pina
const validatePinResponse = await client.validatePin(msisdn, '7286');
console.log({ validatePinResponse });
