export type MPCKeyringOpts = {
  getRandomBytes: (size: number) => Promise<Uint8Array>;
};
