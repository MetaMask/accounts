import type { SpeculosClient } from './client';
import { DEVICE_MODELS } from './constants';
import type { DeviceModel } from './constants';
import {
  createDeviceInteraction,
  NanoInteraction,
  TouchInteraction,
} from './device-interaction';

function createMockClient(): jest.Mocked<SpeculosClient> {
  return {
    pressButton: jest.fn().mockResolvedValue(undefined),
    fingerTap: jest.fn().mockResolvedValue(undefined),
    fingerSwipe: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<SpeculosClient>;
}

describe('createDeviceInteraction', () => {
  it('creates NanoInteraction for button devices', () => {
    const client = createMockClient();
    const model = DEVICE_MODELS.nanosp as DeviceModel;
    const interaction = createDeviceInteraction(client, model);
    expect(interaction).toBeInstanceOf(NanoInteraction);
  });

  it('creates TouchInteraction for touch devices', () => {
    const client = createMockClient();
    const model = DEVICE_MODELS.flex as DeviceModel;
    const interaction = createDeviceInteraction(client, model);
    expect(interaction).toBeInstanceOf(TouchInteraction);
  });
});

describe('NanoInteraction', () => {
  describe('approveTransaction', () => {
    it('presses right 6 times then both', async () => {
      const client = createMockClient();
      const interaction = new NanoInteraction(client);
      await interaction.approveTransaction();
      expect(client.pressButton).toHaveBeenCalledTimes(7);
      for (let callIdx = 0; callIdx < 6; callIdx++) {
        expect(client.pressButton).toHaveBeenNthCalledWith(
          callIdx + 1,
          'right',
        );
      }
      expect(client.pressButton).toHaveBeenNthCalledWith(7, 'both');
    }, 10000);
  });

  describe('approveSigning', () => {
    it('presses right 2 times then both', async () => {
      const client = createMockClient();
      const interaction = new NanoInteraction(client);
      await interaction.approveSigning();
      expect(client.pressButton).toHaveBeenCalledTimes(3);
    });
  });

  describe('rejectTransaction', () => {
    it('presses right then both', async () => {
      const client = createMockClient();
      const interaction = new NanoInteraction(client);
      await interaction.rejectTransaction();
      expect(client.pressButton).toHaveBeenCalledWith('right');
      expect(client.pressButton).toHaveBeenCalledWith('both');
    });
  });
});

describe('TouchInteraction', () => {
  describe('approveTransaction', () => {
    it('swipes left 3 times then taps confirm', async () => {
      const client = createMockClient();
      const model = DEVICE_MODELS.flex as DeviceModel;
      const interaction = new TouchInteraction(client, model);
      await interaction.approveTransaction();
      expect(client.fingerSwipe).toHaveBeenCalledTimes(3);
      expect(client.fingerTap).toHaveBeenCalledTimes(1);
    }, 10000);
  });

  describe('rejectTransaction', () => {
    it('taps reject button', async () => {
      const client = createMockClient();
      const model = DEVICE_MODELS.flex as DeviceModel;
      const interaction = new TouchInteraction(client, model);
      await interaction.rejectTransaction();
      expect(client.fingerTap).toHaveBeenCalledTimes(1);
    });
  });

  describe('enableBlindSigning', () => {
    it('does nothing for NBGL devices', async () => {
      const client = createMockClient();
      const model = DEVICE_MODELS.flex as DeviceModel;
      const interaction = new TouchInteraction(client, model);
      await interaction.enableBlindSigning();
      expect(client.fingerTap).not.toHaveBeenCalled();
      expect(client.fingerSwipe).not.toHaveBeenCalled();
    });
  });

  describe('missing coordinates', () => {
    const minimalModel: DeviceModel = {
      id: 'minimal-touch',
      name: 'Minimal Touch',
      speculosModel: 'minimal',
      interactionType: 'touch',
      elfFile: 'minimal.elf',
      screenSize: { width: 400, height: 672 },
    };

    it('throws when tapConfirm has no reviewConfirmButton coordinates', async () => {
      const interaction = new TouchInteraction(
        createMockClient(),
        minimalModel,
      );
      await expect(interaction.tapConfirm()).rejects.toThrow(
        'reviewConfirmButton coordinates',
      );
    });

    it('throws when tapReject has no reviewRejectButton coordinates', async () => {
      const interaction = new TouchInteraction(
        createMockClient(),
        minimalModel,
      );
      await expect(interaction.tapReject()).rejects.toThrow(
        'reviewRejectButton coordinates',
      );
    });

    it('throws when tapBack has no backButton coordinates', async () => {
      const interaction = new TouchInteraction(
        createMockClient(),
        minimalModel,
      );
      await expect(interaction.tapBack()).rejects.toThrow(
        'backButton coordinates',
      );
    });

    it('throws when approveBlindSigning has no confirmButton coordinates', async () => {
      const interaction = new TouchInteraction(
        createMockClient(),
        minimalModel,
      );
      await expect(interaction.approveBlindSigning()).rejects.toThrow(
        'confirmButton coordinates',
      );
    });
  });
});
