// eslint-disable-next-line import-x/no-mutable-exports
let documentShim: any;

type Element = {
  src: boolean;
  contentWindow: {
    postMessage: () => boolean;
  };
};

const shim = {
  head: {
    appendChild: (child: { onload?: () => void }): void => {
      child.onload?.();
    },
  },
  createElement: (): Element => ({
    src: false,
    contentWindow: {
      postMessage: () => false,
    },
  }),
  addEventListener: (): boolean => false,
};

try {
  documentShim = document || shim;
} catch {
  documentShim = shim;
}

export default documentShim;
