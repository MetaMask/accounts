import {
  createDeviceInteraction,
  NanoInteraction,
  TouchInteraction,
} from './device-interaction';
import { DEVICE_MODELS } from './constants';
import type { SpeculosClient } from './client';

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
    const model = DEVICE_MODELS.nanosp;
    const interaction = createDeviceInteraction(client, model);
    expect(interaction).toBeInstanceOf(NanoInteraction);
  });

  it('creates TouchInteraction for touch devices', () => {
    const client = createMockClient();
    const model = DEVICE_MODELS.flex;
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
      // First 6 are 'right', last is 'both'
      for (let callIdx = 0; callIdx < 6; callIdx++) {
        expect(client.pressButton).toHaveBeenNthCalledWith(
          callIdx + 1,
          'right',
        );
      }
      expect(client.pressButton).toHaveBeenNthCalledWith(7, 'both');
    });
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
      const model = DEVICE_MODELS.flex;
      const interaction = new TouchInteraction(client, model);
      await interaction.approveTransaction();
      expect(client.fingerSwipe).toHaveBeenCalledTimes(3);
      expect(client.fingerTap).toHaveBeenCalledTimes(1);
    });
  });

  describe('rejectTransaction', () => {
    it('taps reject button', async () => {
      const client = createMockClient();
      const model = DEVICE_MODELS.flex;
      const interaction = new TouchInteraction(client, model);
      await interaction.rejectTransaction();
      expect(client.fingerTap).toHaveBeenCalledTimes(1);
    });
  });

  describe('enableBlindSigning', () => {
    it('does nothing for NBGL devices', async () => {
      const client = createMockClient();
      const model = DEVICE_MODELS.flex;
      const interaction = new TouchInteraction(client, model);
      await interaction.enableBlindSigning();
      expect(client.fingerTap).not.toHaveBeenCalled();
      expect(client.fingerSwipe).not.toHaveBeenCalled();
    });
  });
});
