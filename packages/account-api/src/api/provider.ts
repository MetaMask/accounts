import type {
  ExtractEventHandler,
  ExtractEventPayload,
} from '@metamask/base-controller';
import { Messenger } from '@metamask/base-controller';
import type { KeyringAccount } from '@metamask/keyring-api';

import type { Bip44Account } from './bip44';

type AccountProviderAccountAddedEvent<Account extends KeyringAccount> = {
  type: 'AccountProvider:accountAdded';
  payload: [Bip44Account<Account>];
};

type AccountProviderEvents<Account extends KeyringAccount> =
  AccountProviderAccountAddedEvent<Account>;

export type AccountProviderEventUnsubscriber = () => void;

/**
 * An account provider is reponsible of providing accounts to an account group.
 */
export abstract class AccountProvider<Account extends KeyringAccount> {
  readonly #messenger: Messenger<never, AccountProviderEvents<Account>>;

  constructor() {
    this.#messenger = new Messenger();
  }

  /**
   * Gets all accounts for a given entropy source and group index.
   *
   * @returns A list of all account for this provider.
   */
  abstract getAccount(id: Bip44Account<Account>['id']): Bip44Account<Account>;

  /**
   * Gets all accounts for a given entropy source and group index.
   *
   * @returns A list of all account for this provider.
   */
  abstract getAccounts(): Bip44Account<Account>[];

  /**
   * Registers event handler.
   *
   * @param event - Event type.
   * @param handler - Event handler.
   * @returns Callback to unsubscribe this handler.
   */
  subscribe<EventType extends AccountProviderEvents<Account>['type']>(
    event: EventType,
    handler: ExtractEventHandler<AccountProviderEvents<Account>, EventType>,
  ): AccountProviderEventUnsubscriber {
    this.#messenger.subscribe(event, handler);
    return () => this.#messenger.unsubscribe(event, handler);
  }

  /**
   * Publishes event.
   *
   * @param event - Event type.
   * @param payload - Event payload.
   */
  protected publish<EventType extends AccountProviderEvents<Account>['type']>(
    event: EventType,
    ...payload: ExtractEventPayload<AccountProviderEvents<Account>, EventType>
  ): void {
    this.#messenger.publish(event, ...payload);
  }
}
