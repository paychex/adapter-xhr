# @paychex/adapter-xhr

A data adapter that uses the [XMLHttpRequest](https://xhr.spec.whatwg.org/) object to convert a Request into a Response. Can be passed to the [@paychex/core](https://github.com/paychex/core) createDataLayer factory method to enable data operations on NodeJS.

## Installation

```bash
npm install @paychex/adapter-xhr
```

## Usage

```js
import xhrAdapter from '@paychex/adapter-xhr/index.js';
import { createDataLayer, createProxy } from '@paychex/core/data/index.js';

const proxy = createProxy();
const { createRequest, fetch, setAdapter } = createDataLayer(proxy, xhrAdapter);
```
