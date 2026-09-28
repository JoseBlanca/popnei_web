// The setup of the Vitest project of the tests that run in node.
//
// Node 24, the version the project supports (package.json, "engines"), has
// no global ErrorEvent; node 25 and every browser have it. The client of
// the worker tells a worker that stopped on an error by `instanceof
// ErrorEvent`, and its tests construct one, so under node 24 they failed
// with "ErrorEvent is not defined". A minimal one is defined here, only
// where it is missing, so that a node that has it keeps its own.

type ErrorEventFields = Pick<
  ErrorEvent,
  "message" | "error" | "filename" | "lineno" | "colno"
>;

if (!("ErrorEvent" in globalThis)) {
  class NodeErrorEvent extends Event implements ErrorEventFields {
    readonly message: string;
    readonly error: unknown;
    readonly filename: string;
    readonly lineno: number;
    readonly colno: number;

    constructor(type: string, init: ErrorEventInit = {}) {
      super(type, init);
      this.message = init.message ?? "";
      this.error = init.error;
      this.filename = init.filename ?? "";
      this.lineno = init.lineno ?? 0;
      this.colno = init.colno ?? 0;
    }
  }
  Object.defineProperty(globalThis, "ErrorEvent", {
    value: NodeErrorEvent,
    writable: true,
    configurable: true,
  });
}
