// eslint-disable-next-line import-x/no-mutable-exports
let windowShim: any;

try {
  windowShim = window || {
    addEventListener: (): false => {
      return false;
    },
    removeEventListener: (): false => {
      return false;
    },
  };
} catch {
  windowShim = {
    addEventListener: (): false => {
      return false;
    },
    removeEventListener: (): false => {
      return false;
    },
  };
}

export default windowShim;
