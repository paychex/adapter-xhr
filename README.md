# @paychex/adapter-xhr

A data adapter that uses the [XMLHttpRequest](https://xhr.spec.whatwg.org/) object to convert a Request into a Response. Can be passed to the [@paychex/core](https://github.com/paychex/core) createDataLayer factory method to enable data operations on NodeJS.

## Installation

```bash
npm install @paychex/adapter-xhr
```

## Importing

### esm

```js
import { xhr } from '@paychex/adapter-xhr';
```

### cjs

```js
const { xhr } = require('@paychex/adapter-xhr');
```

### amd

```js
define(['@paychex/adapter-xhr'], function({ xhr }) { ... });
```

```js
require(['@paychex/adapter-xhr'], function({ xhr }) { ... });
```

### iife

```js
const { xhr } = window['@paychex/adapter-xhr'];
```

## Usage

```js
import { data } from '@paychex/core';
import { xhr } from '@paychex/adapter-xhr';

const proxy = data.createProxy();
const { createRequest, fetch, setAdapter } = data.createDataLayer(proxy, xhr);
```
