import { is } from '@metamask/superstruct';

import { EthAccountType } from '../api';
import { KeyringEvent } from '../events';
import {
  AccountCreatedEventStruct,
  AccountDeletedEventStruct,
  AccountUpdatedEventStruct,
  RequestApprovedEventStruct,
  RequestRejectedEventStruct,
} from './events';

describe('events', () => {
  describe('AccountCreatedEventStruct', () => {
    it('should be a valid accountCreated event', () => {
      const event = {
        method: KeyringEvent.AccountCreated,
        params: {
          account: {
            id: '11027d05-12f8-4ec0-b03f-151d86a8089e',
            address: '0x0123',
            methods: [],
            options: {},
            type: EthAccountType.Eoa,
          },
        },
      };

      expect(is(event, AccountCreatedEventStruct)).toBe(true);
    });

    it('should be an invalid accountCreated event (invalid account id)', () => {
      const event = {
        method: KeyringEvent.AccountCreated,
        params: {
          account: {
            id: 'not-a-uuid',
            address: '0x0123',
            methods: [],
            options: {},
            type: EthAccountType.Eoa,
          },
        },
      };

      expect(is(event, AccountCreatedEventStruct)).toBe(false);
    });

    it('should be a valid accountCreated event with displayConfirmation', () => {
      const event = {
        method: KeyringEvent.AccountCreated,
        params: {
          account: {
            id: '11027d05-12f8-4ec0-b03f-151d86a8089e',
            address: '0x0123',
            methods: [],
            options: {},
            type: EthAccountType.Eoa,
          },
          displayConfirmation: true,
        },
      };

      expect(is(event, AccountCreatedEventStruct)).toBe(true);
    });
  });

  describe('AccountUpdatedEventStruct', () => {
    it('should be a valid accountUpdated event', () => {
      const event = {
        method: KeyringEvent.AccountUpdated,
        params: {
          account: {
            id: '11027d05-12f8-4ec0-b03f-151d86a8089e',
            address: '0x0123',
            methods: [],
            options: {},
            type: EthAccountType.Eoa,
          },
        },
      };

      expect(is(event, AccountUpdatedEventStruct)).toBe(true);
    });

    it('should be an invalid accountUpdated event (invalid account id)', () => {
      const event = {
        method: KeyringEvent.AccountUpdated,
        params: {
          account: {
            id: 'not-a-uuid',
            address: '0x0123',
            methods: [],
            options: {},
            type: EthAccountType.Eoa,
          },
        },
      };

      expect(is(event, AccountUpdatedEventStruct)).toBe(false);
    });
  });

  describe('AccountDeletedEventStruct', () => {
    it('should be a valid accountDeleted event', () => {
      const event = {
        method: KeyringEvent.AccountDeleted,
        params: {
          id: '11027d05-12f8-4ec0-b03f-151d86a8089e',
        },
      };

      expect(is(event, AccountDeletedEventStruct)).toBe(true);
    });

    it('should be an invalid accountDeleted event (invalid account id)', () => {
      const event = {
        method: KeyringEvent.AccountDeleted,
        params: {
          id: 'not-a-uuid',
        },
      };

      expect(is(event, AccountDeletedEventStruct)).toBe(false);
    });
  });

  describe('RequestApprovedEventStruct', () => {
    it('should be a valid requestApproved event', () => {
      const event = {
        method: KeyringEvent.RequestApproved,
        params: {
          id: '10423e09-c282-4d4c-8b61-3ca071a32e54',
          result: {
            signature: '0x0123',
          },
        },
      };

      expect(is(event, RequestApprovedEventStruct)).toBe(true);
    });

    it('should be an invalid requestApproved event (invalid request id)', () => {
      const event = {
        method: KeyringEvent.RequestApproved,
        params: {
          id: 'not-a-uuid',
          result: {
            signature: '0x0123',
          },
        },
      };

      expect(is(event, RequestApprovedEventStruct)).toBe(false);
    });

    it('should be an invalid requestApproved event (missing result)', () => {
      const event = {
        method: KeyringEvent.RequestApproved,
        params: {
          id: 'not-a-uuid',
        },
      };

      expect(is(event, RequestApprovedEventStruct)).toBe(false);
    });
  });

  describe('RequestRejectedEventStruct', () => {
    it('should be a valid requestRejected event', () => {
      const event = {
        method: KeyringEvent.RequestRejected,
        params: {
          id: '10423e09-c282-4d4c-8b61-3ca071a32e54',
        },
      };

      expect(is(event, RequestRejectedEventStruct)).toBe(true);
    });

    it('should be an invalid requestRejected event (invalid request id)', () => {
      const event = {
        method: KeyringEvent.RequestRejected,
        params: {
          id: 'not-a-uuid',
        },
      };

      expect(is(event, RequestRejectedEventStruct)).toBe(false);
    });
  });
});
