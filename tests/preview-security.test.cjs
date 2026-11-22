const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function compiled(path) {
  return ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

function messaging() {
  const module = { exports: {} };
  vm.runInNewContext(compiled("src/utils/previewMessaging.ts"), {
    module,
    exports: module.exports,
    URL,
  });
  return module.exports;
}

test("preview documents are sent only to the configured origin", () => {
  const { sendPreviewDocument } = messaging();
  const calls = [];
  const target = { postMessage: (...args) => calls.push(args) };
  const doc = { id: "draft-id", title: "Draft" };
  sendPreviewDocument(
    target,
    doc,
    "https://preview.example/path?locale=de",
    "https://cms.example/admin",
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0].cmsLivePreviewData, doc);
  assert.equal(calls[0][1], "https://preview.example");
  sendPreviewDocument(target, doc, "/preview", "https://cms.example/admin");
  assert.equal(calls[1][1], "https://cms.example");
});

test("opaque or executable preview URLs cannot receive draft data", () => {
  const { sendPreviewDocument } = messaging();
  let sent = false;
  for (const url of [
    "data:text/html,preview",
    "javascript:void(0)",
    "file:///tmp/preview",
  ]) {
    assert.throws(
      () =>
        sendPreviewDocument(
          {
            postMessage: () => {
              sent = true;
            },
          },
          {},
          url,
          "https://cms.example",
        ),
      /HTTP or HTTPS/,
    );
  }
  assert.equal(sent, false);
});

test("example preview checks both origin and sender before touching its DOM", () => {
  const listeners = new Map();
  const readyMessages = [];
  const cmsWindow = { postMessage: (...args) => readyMessages.push(args) };
  let mutations = 0;
  const container = {
    set innerHTML(value) {
      mutations++;
    },
    appendChild() {
      mutations++;
    },
  };
  vm.runInNewContext(compiled("example/website/src/index.ts"), {
    exports: {},
    URL,
    opener: null,
    parent: cmsWindow,
    EventSource: class {
      addEventListener() {}
    },
    window: { addEventListener: (name, fn) => listeners.set(name, fn) },
    document: {
      getElementById: () => container,
      createElement: () => ({ content: { firstChild: {} }, innerHTML: "" }),
    },
    setTimeout: (callback) => callback(),
  });
  const receive = listeners.get("message");
  const data = { cmsLivePreviewData: { title: "Preview", subtitle: "Draft" } };
  receive({ origin: "https://attacker.example", source: cmsWindow, data });
  receive({ origin: "http://localhost:3000", source: {}, data });
  receive({ origin: "http://localhost:3000", source: cmsWindow, data: null });
  assert.equal(mutations, 0);
  receive({ origin: "http://localhost:3000", source: cmsWindow, data });
  assert.equal(mutations, 3);
  listeners.get("DOMContentLoaded")();
  assert.deepEqual(readyMessages, [["ready", "http://localhost:3000"]]);
});

test("generated previews retain the document identity and option-field fallbacks", async () => {
  const module = { exports: {} };
  vm.runInNewContext(compiled("src/utils/generateDocument.ts"), {
    module,
    exports: module.exports,
    require: (name) => {
      if (name === "payload/components/forms")
        return { reduceFieldsToValues: (fields) => fields };
      if (name === "payload/dist/fields/config/types")
        return {
          fieldIsPresentationalOnly: () => false,
          fieldAffectsData: () => true,
          optionIsObject: (option) => typeof option === "object",
        };
      return require(name);
    },
  });
  const config = {
    documentId: "document-42",
    collections: [],
    globals: [],
    serverUrl: "https://cms.example",
    apiPath: "/api",
    fieldConfigs: [
      {
        name: "radio",
        type: "radio",
        required: true,
        options: [{ label: "First", value: "first" }],
      },
      { name: "select", type: "select", required: true, options: ["first"] },
    ],
  };
  const doc = await module.exports.generateDocument(config, {});
  assert.equal(doc.id, "document-42");
  assert.equal(doc.radio, "first");
  assert.equal(doc.select, "first");
  const changed = await module.exports.generateDocument(
    { ...config, documentId: undefined },
    { id: "fallback-id", radio: "second", select: "second" },
  );
  assert.equal(changed.id, "fallback-id");
  assert.equal(changed.radio, "second");
  assert.equal(changed.select, "second");
});
