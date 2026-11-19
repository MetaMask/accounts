import {
  BlindSigningMethod,
  BlindSignReason,
  ClearSignContextType,
  ContextModuleBuilder,
} from '@ledgerhq/context-module';
import type {
  BlindSigningReportParams,
  ClearSignContext,
  TypedDataClearSignContext,
  TypedDataContext,
} from '@ledgerhq/context-module';
import { DeviceModelId } from '@ledgerhq/device-management-kit';

import { createDefaultContextModule } from './default-context-module';

const REPORT_PARAMS: BlindSigningReportParams = {
  signatureId: 'signature-id',
  signingMethod: BlindSigningMethod.ETH_SIGN_TRANSACTION,
  isBlindSign: true,
  chainId: 1,
  targetAddress: '0x0000000000000000000000000000000000000001',
  blindSignReason: BlindSignReason.NO_CLEAR_SIGNING_CONTEXT,
  modelId: 'nanoX',
  signerAppVersion: '1.20.0',
  deviceVersion: '2.0.0',
  ethContext: null,
};

const TYPED_DATA: TypedDataContext = {
  deviceModelId: DeviceModelId.NANO_X,
  verifyingContract: '0x0000000000000000000000000000000000000001',
  chainId: 1,
  version: 'v1',
  schema: {},
  fieldsValues: [],
};

describe('createDefaultContextModule', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds an Ethereum context module', () => {
    const contextModule = createDefaultContextModule();

    expect(typeof contextModule.getContexts).toBe('function');
    expect(typeof contextModule.report).toBe('function');
  });

  it('does not send blind-signing reports', async () => {
    const innerReport = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(ContextModuleBuilder.prototype, 'build').mockReturnValue({
      getContexts: jest.fn(),
      getFieldContext: jest.fn(),
      getTypedDataFilters: jest.fn(),
      report: innerReport,
    });

    const contextModule = createDefaultContextModule();

    expect(await contextModule.report(REPORT_PARAMS)).toBeUndefined();
    expect(innerReport).not.toHaveBeenCalled();
  });

  it('delegates clear-signing lookups to the built module', async () => {
    const contexts = [
      { type: 'ethereumToken', payload: 'payload' },
    ] as unknown as ClearSignContext[];
    const fieldContext = {
      type: 'ethereumToken',
      payload: 'field',
    } as unknown as ClearSignContext;
    const typedDataFilters = {
      type: 'success',
    } as unknown as TypedDataClearSignContext;
    const innerContexts = jest.fn().mockResolvedValue(contexts);
    const innerFieldContext = jest.fn().mockResolvedValue(fieldContext);
    const innerTypedDataFilters = jest.fn().mockResolvedValue(typedDataFilters);
    jest.spyOn(ContextModuleBuilder.prototype, 'build').mockReturnValue({
      getContexts: innerContexts,
      getFieldContext: innerFieldContext,
      getTypedDataFilters: innerTypedDataFilters,
      report: jest.fn(),
    });

    const contextModule = createDefaultContextModule();
    const input = { chainId: 1 };

    expect(await contextModule.getContexts(input)).toBe(contexts);
    expect(
      await contextModule.getFieldContext(
        input,
        ClearSignContextType.ETHEREUM_TOKEN,
      ),
    ).toBe(fieldContext);
    expect(await contextModule.getTypedDataFilters(TYPED_DATA)).toBe(
      typedDataFilters,
    );

    expect(innerContexts).toHaveBeenCalledWith(input, undefined);
    expect(innerFieldContext).toHaveBeenCalledWith(
      input,
      ClearSignContextType.ETHEREUM_TOKEN,
    );
    expect(innerTypedDataFilters).toHaveBeenCalledWith(TYPED_DATA);
  });
});
