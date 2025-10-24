import { assertType, describe, expect, it, vi } from 'vitest';
import { createInternalAgencyClient } from './index';

const TEST_ENDPOINT = 'https://test.com/internal/';

const mockFetch = vi.fn().mockImplementation(async () => new Response('{}'));
const createTestClient = () => {
  return {
    ...createInternalAgencyClient({
      campaignId: 'campaignid',
      serviceId: 'serviceid',
      fetch: mockFetch,
      apiEndpoint: TEST_ENDPOINT,
    }),
  };
};

describe('Internal Agency API client', () => {
  describe('createClient', () => {
    it('should return instance from constructor function', () => {
      const client = createTestClient();

      expect(typeof client).toBe('object');
      expect(typeof client.checkSubscription).toBe('function');
      expect(typeof client.loadAntifraud).toBe('function');
      expect(typeof client.saveEvent).toBe('function');
      expect(typeof client.submitMsisdn).toBe('function');
      expect(typeof client.validatePin).toBe('function');
      expect(typeof client.onFridChange).toBe('function');
    });
  });

  type ParametersTestCase<
    T extends (...args: any[]) => any = (...args: any[]) => any
  > = {
    method: T,
    parameters: Parameters<T>,
    searchParams: Record<string, string>,
    options: Omit<Parameters<typeof mockFetch>[1], 'method'>,
  };

  const testClient = createTestClient();

  describe('test request parameters', () => {
    const testParametersCases: ParametersTestCase[] = [
      {
        method: testClient.checkSubscription,
        parameters: [],
        searchParams: {
          action: 'check',
        },
        options: {
          method: 'GET',
        },
      },
      {
        method: testClient.checkSubscription,
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
        method: testClient.saveEvent,
        parameters: ['init', { name: 'test' }],
        searchParams: {
          action: 'pk',
        },
        options: {
          method: 'POST',
          body: '{"name":"test"}',
        },
      },
      {
        method: testClient.submitMsisdn,
        parameters: ['0781234567'],
        searchParams: {
          action: 'submitmsisdn',
          msisdn: '0781234567',
        },
        options: {
          method: 'GET',
        },
      },
      {
        method: testClient.validatePin,
        parameters: ['0781234567', '1234'],
        searchParams: {
          action: 'validate_pin',
          msisdn: '0781234567',
        },
        options: {
          method: 'GET',
        },
      },
    ];

    testParametersCases.forEach(({ method, parameters, searchParams, options }) => {
      it(`${method.name} with ${Object.keys(searchParams).join(', ')}`, async () => {
        vi.clearAllMocks();
        await method(...parameters);
        expect(mockFetch).toHaveBeenCalledOnce();

        const [requestURL, requestOptions] = mockFetch.mock.calls[0] as [URL, RequestInit];
        assertType<URL>(requestURL);
        assertType<RequestInit>(requestOptions);

        expect(requestURL.pathname).toBe('/internal/');
        expect(Object.fromEntries(requestURL.searchParams.entries())).toMatchObject(searchParams);
        expect(requestOptions).toMatchObject(options);
      });
    });

  });

  describe('listen for fridChange event', () => {
    it('should listen for fridChange event', async () => {
      const testClient = createInternalAgencyClient({
        campaignId: 'campaignid',
        serviceId: 'serviceid',
        fridStore: {
          getFrid: () => 'oldFrid',
          setFrid: () => {},
        },
        fetch: (...args) => {
          return Promise.resolve(new Response(JSON.stringify({
            ok: true,
            status: 200,
            frid: 'newFrid',
          })));
        },
      });

      const callback = vi.fn();
      const cleanup = testClient.onFridChange(callback);
      await testClient.submitMsisdn('0781234567');
      expect(callback).toHaveBeenCalledWith('oldFrid', 'newFrid');
      cleanup();
      await testClient.submitMsisdn('0781234567');
      expect(callback).toHaveBeenCalledTimes(1);
    });

  });

});
