import { fetch as crossFetch } from 'cross-fetch';
import { createInMemoryFridStore, type FridStore } from './frid-store.js';

export {
  createInMemoryFridStore,
  createWebStorageFridStore,
  type FridStore,
} from './frid-store.js';

const ANTIFRAUD_SCRIPT_ID = `antifraud-${Date.now()}`;

type EvinaNotifyFunction = (event: Event, cb?: () => void) => void;

function evinaNotifyInWindow(window: Window): window is Window & { evina_notify: EvinaNotifyFunction } {
  return 'evina_notify' in window && typeof window.evina_notify === 'function';
}

type Action = 'submitmsisdn' | 'event' | 'pk' | 'check' | 'antifraud' | 'validate_pin' | 'create_subscription' | 'store_userdata';

type _SubmitMsisdnResponse = { message: string; };
type _SubmitMsisdnOkSmsResponse = {
  sms_to: string;
  sms_body: string;
};
type _SubmitMsisdnOkRedirectResponse = {
  redirect: string;
}

export type SubmitMsisdnOkResponse =
  & (_SubmitMsisdnOkSmsResponse | _SubmitMsisdnOkRedirectResponse)
  & _SubmitMsisdnResponse
  & {
  status: 'ok';
  frid: string;
  operatorcode: string;
};

export type SubmitMsisdnErrorResponse = _SubmitMsisdnResponse & {
  status: 'error';
  frid?: string;
};

type SubmitMsisdnResponse = SubmitMsisdnOkResponse | SubmitMsisdnErrorResponse;

export type SaveEventResponse = {
  status: 'ok' | 'error';
  message: string;
  frid?: string;
};

export type CheckSubscriptionResponse = {
  status: 'ok';
  message: string;
  active: boolean;
};

export type ValidatePinResponse = {
  status: 'ok' | 'error';
  message: string;
  retry: boolean;
}

type _CreateSubscriptionOkResponse = {
  status: 'ok';
  redirect: string;
}

type _CreateSubscriptionErrorResponse = {
  status: 'error';
  message: string;
}

export type CreateSubscriptionResponse =
  | _CreateSubscriptionOkResponse
  | _CreateSubscriptionErrorResponse
  ;

type StoreUserDataResponse = {
  status: 'ok' | 'error';
  message: string;
  frid?: string;
}

export type InternalAgencyClient = {
  saveEvent(event: string, data?: unknown): Promise<SaveEventResponse>;
  submitMsisdn(msisdn: string): Promise<SubmitMsisdnResponse>;
  checkSubscription(msisdn?: string): Promise<CheckSubscriptionResponse>;
  loadAntifraud(selector: string, options?: { tag?: string, observerTarget?: Element }): Promise<void>;
  validatePin(msisdn: string, pin: string): Promise<ValidatePinResponse>;
  createSubscription(frid: string): Promise<CreateSubscriptionResponse>;
  storeUserData(msisdn: string, payload: unknown): Promise<StoreUserDataResponse>;
  fridStore: FridStore;
};

class ResponseError extends Error {
  constructor(
    public readonly response: Response,
    public readonly data: unknown,
  ) {
    super('internal-agency: request failed (see data field)');
  }
}

export function createInternalAgencyClient(parameters: {
  campaignId: string;
  serviceId: string;
  apiEndpoint?: string;
  fridStore?: FridStore;
  fetch?: typeof window.fetch;
  ublockWorkaround?: boolean;
}): Readonly<InternalAgencyClient> {
  const { campaignId, serviceId } = parameters;
  const apiEndpoint = parameters.apiEndpoint ?? 'https://agency-api.flowly.com/internal/';
  const fridStore = parameters.fridStore ?? createInMemoryFridStore();
  const fetch = parameters.fetch ?? crossFetch;
  const ublockWorkaround = parameters.ublockWorkaround ?? true;

  function createApiUrl(action: Action, requestData: Record<string, unknown>): URL {
    const url = new URL(apiEndpoint);

    const parameters: Record<string, string> = {
      action,
      campaignid: campaignId,
      serviceid: serviceId,
      ...requestData,
    };

    if (typeof window !== 'undefined' && 'location' in window) {
      parameters.original_uri = window.location.toString();
    }

    url.search = new URLSearchParams(
      Object.fromEntries(
        Object.entries(parameters).filter(([, value]) => Boolean(value)),
      ),
    ).toString();

    return url;
  }

  async function doFetch(
    method: 'GET' | 'POST',
    action: Action,
    requestData = {},
    requestOptions: Omit<Parameters<typeof fetch>[1], 'method'> = {},
  ) {
    const url = createApiUrl(action, requestData);
    const frid = fridStore.getFrid();
    if (frid) {
      url.searchParams.set('frid', frid);
    }

    const response = await fetch(url, {
      method,
      ...requestOptions,
    });
    const data = await response.json();

    if (!response.ok) {
      throw new ResponseError(response, data);
    }

    if ('frid' in data) {
      fridStore.setFrid(data.frid);
    }

    return data;
  }

  const submitMsisdn = (msisdn: string): Promise<SubmitMsisdnResponse> => {
    return doFetch('GET', 'submitmsisdn', { msisdn });
  };

  const saveEvent = (event: string, data?: unknown): Promise<SaveEventResponse> => {
    const eventParam = ublockWorkaround ? 'pk' : 'event';
    return doFetch('POST', eventParam, { event }, { body: JSON.stringify(data) });
  };

  const checkSubscription = (msisdn = undefined): Promise<CheckSubscriptionResponse> => {
    const params: Partial<Record<'msisdn' | 'frid', string>> = {};
    if (msisdn) {
      params.msisdn = msisdn;
    } else {
      params.frid = fridStore.getFrid();
    }
    return doFetch('GET', 'check', params);
  };

  const loadAntifraud = async (
    selector: string,
    options: { tag?: string, observerTarget?: Element },
  ): Promise<void> => {
    if (!(typeof window !== 'undefined' && window === globalThis)) {
      throw new Error('internal-agency-client: calling loadAntifraud() makes sense only in browser environment');
    }

    const tag = options?.tag ?? 'optin2';
    const observerTarget = options?.observerTarget ?? undefined;

    const { document } = window;

    if (document.getElementById(ANTIFRAUD_SCRIPT_ID) !== null && evinaNotifyInWindow(window)) {
      return Promise.resolve();
    }

    const url = createApiUrl('antifraud', { tag, selector, frid: fridStore.getFrid() });

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = ANTIFRAUD_SCRIPT_ID;
      script.src = url.toString();

      script.addEventListener('load', () => {
        document.dispatchEvent(new Event('DCBProtectRun'));
        new MutationObserver((records, observer) => {
          if (records.length === 0) return;
          records.forEach(record => {
            record.target.addEventListener('click', (ev) => {
              if (evinaNotifyInWindow(window)) {
                window.evina_notify(ev, () => { /* noop */ });
              }
            }, { once: true });
          });
          observer.disconnect();
        }).observe(
          observerTarget ?? document.querySelector(selector) ?? document.body,
          {
            attributes: true,
            subtree: true,
            attributeFilter: ['data-antifraud'],
          },
        );
        resolve();
      });
      script.addEventListener('error', reject);
      document.body.appendChild(script);
    });
  };

  const validatePin = async (msisdn: string, pin: string): Promise<ValidatePinResponse> => {
    return doFetch('GET', 'validate_pin', { frid: fridStore.getFrid(), msisdn, pin });
  };

  const createSubscription = async (frid: string): Promise<CreateSubscriptionResponse> => {
    return doFetch('POST', 'create_subscription', { frid });
  };

  const storeUserData: InternalAgencyClient['storeUserData'] = (msisdn, payload): Promise<StoreUserDataResponse> => {
    return doFetch('POST', 'store_userdata', { frid: fridStore.getFrid(), msisdn }, {
      body: JSON.stringify(payload),
    });
  };

  return Object.freeze({
    submitMsisdn,
    saveEvent,
    checkSubscription,
    loadAntifraud,
    fridStore,
    validatePin,
    createSubscription,
    storeUserData,
  });
}
