Internal Agency API Client
==========================

## Javascript

### Installation

To install the client, in your terminal type:

```bash
yarn add @simmcomm/internal-agency-client
```

or

```bash
npm install @simmcomm/internal-agency-client
```

### Getting started

#### Obtaining an instance

```javascript
import { createInternalAgencyClient } from '@simmcomm/internal-agency-client';

const client = createInternalAgencyClient({
  campaignId: '<campaignid>',
  serviceId: '<serviceid>',
});

// now you can eg. export this instance
```

All create options:

```typescript
declare function createInternalAgencyClient(parameters: {
  campaignId: string;
  serviceId: string;
  apiEndpoint?: string; // defines alternate API endponint
  fridStore?: FridStore; // frid store implementation, default is in-memory
  fetch?: typeof window.fetch; // fetch implementation, mainly for testing
}): Readonly<InternalAgencyClient>;
```

#### FRID store

When the client obtains `frid` in response payload, it saves it to the FRID store.
By default, FRID is stored into in-memory store. This means, if the client is used in
browser context, every page load will create empty FRID store.

FRID store must adhere to this interface:

```typescript
export type FridStore = {
  getFrid(invalidateStale?: boolean): string | undefined;
  setFrid(frid: string, expire?: number): void;
};
```

To access FRID store, use the `fridStore` property on the client:

```javascript
const frid = client.fridStore.getFrid();
client.fridStore.setFrid('00000000-0000-0000-0000-000000000000');
```

To provide a custom FRID store, pass it to create function:

```javascript
import { createInternalAgencyClient } from '@simmcomm/internal-agency-client';

// if frid store is defined externally
const client = createInternalAgencyClient({
  // ...
  fridStore: myFridStore,
});

// or ad-hoc definition
const client = createInternalAgencyClient({
  // ...
  fridStore: {
    getFrid() {
      // implementation
    },
    setFrid() {
      // implementation
    },
  },
});
```

Two implementations are available out-of-the-box:

```javascript
import {
  createInMemoryFridStore,
  createWebStorageFridStore,
} from '@simmcomm/internal-agency-client';

// stores FRID into either LocalStorage (default) or SessionStorage 
const webStorageFridStore = createWebStorageFridStore();
// or optionally specify web storage interface
const webStorageFridStore = createWebStorageFridStore({
  storage: window.sessionStorage,
});

// stores the frid in-memory, will be cleared on page reload!
const inMemoryFridStore = createInMemoryFridStore();
```

### Methods

The client is described with this type declaration:

```typescript
export type InternalAgencyClient = {
  saveEvent(event: string, data?: unknown): Promise<SaveEventResponse>;
  submitMsisdn(msisdn: string): Promise<SubmitMsisdnResponse>;
  checkSubscription(msisdn?: string): Promise<CheckSubscriptionResponse>;
  loadAntifraud(selector: string, options?: { tag?: string, observerTarget?: Element }): Promise<void>;
  fridStore: FridStore;
};
```
