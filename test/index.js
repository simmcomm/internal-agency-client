import { expect } from 'chai';
import { createInternalAgencyClient } from '../dist/index.js';

const createTestClient = () => {
  let fetchArgs;
  return {
    ...createInternalAgencyClient({
      campaignId: 'campaignid',
      serviceId: 'serviceid',
      fetch: (...args) => {
        fetchArgs = [...args];
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        });
      },
    }),
    get fetchArgs() {
      return fetchArgs;
    },
  };
};

describe('Internal Agency API client', () => {
  describe('createClient', () => {
    it('should return instance from constructor function', () => {
      const client = createTestClient();

      expect(client).to.be.an('object');
      expect(client.checkSubscription).to.be.a('function');
      expect(client.loadAntifraud).to.be.a('function');
      expect(client.saveEvent).to.be.a('function');
      expect(client.submitMsisdn).to.be.a('function');
    });
  });

  describe('test request parameters', () => {
    const testParametersCases = [
      {
        method: 'checkSubscription',
        parameters: [],
        searchParams: {
          action: 'check',
          frid: null,
        },
        options: {
          method: 'GET',
        },
      },
      {
        method: 'checkSubscription',
        parameters: ['0781234567'],
        searchParams: {
          action: 'check',
          msisdn: '0781234567',
        },
        options: {
          method: 'GET',
        },
      },
      {
        method: 'saveEvent',
        parameters: ['init', { name: 'test' }],
        searchParams: {
          action: 'event',
        },
        options: {
          method: 'POST',
          body: '{"name":"test"}',
        },
      },
      {
        method: 'submitMsisdn',
        parameters: ['0781234567'],
        searchParams: {
          action: 'submitmsisdn',
          msisdn: '0781234567',
        },
        options: {
          method: 'GET',
        },
      },
    ];

    testParametersCases.forEach(({ method, parameters, searchParams, options }) => {
      it(`${method} with ${Object.keys(searchParams).join(', ')}`, async () => {
        const testClient = createTestClient();
        await testClient[method](...parameters);
        const [requestURL, requestOptions] = testClient.fetchArgs;
        const url = new URL(requestURL);
        expect(url.pathname).to.be.equal('/internal/');
        Object.entries(searchParams).forEach(([param, expectedValue]) => {
          expect(url.searchParams.get(param)).to.be.equal(expectedValue);
        });
        Object.entries(requestOptions).forEach(([opt, value]) => {
          expect(requestOptions[opt]).to.be.equal(value);
        });
      });
    });
  });
});
