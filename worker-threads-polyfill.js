// Complete worker_threads polyfill for Next.js/Vercel
// This polyfill allows libraries to import worker_threads without breaking

// Main export (CommonJS)
module.exports = {
  Worker: class Worker {
    constructor() {
      throw new Error('Worker threads not supported in serverless environment');
    }
  },
  MessageChannel: class MessageChannel {
    constructor() {
      this.port1 = new MessagePort();
      this.port2 = new MessagePort();
    }
  },
  MessagePort: class MessagePort {
    postMessage() {}
    close() {}
    start() {}
    on() {}
    once() {}
    removeListener() {}
  },
  isMainThread: true,
  parentPort: null,
  workerData: null,
  threadId: 0,
  receiveMessageOnPort: () => undefined,
  moveMessagePortToContext: () => {},
  getEnvironmentData: () => ({}),
  setEnvironmentData: () => {},
  markAsUntransferable: () => {},
  isMarkedAsUntransferable: () => false,
  resourceLimits: {},
  SHARE_ENV: Symbol('nodejs.worker_threads.SHARE_ENV'),
  // Additional exports that might be used
  default: this
};

// ES modules support
module.exports.default = module.exports;