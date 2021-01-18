import get from 'lodash/get.js';
import set from 'lodash/set.js';
import filter from 'lodash/filter.js';
import flatten from 'lodash/flatten.js';
import attempt from 'lodash/attempt.js';
import isEmpty from 'lodash/isEmpty.js';
import isString from 'lodash/isString.js';

const splitter = /[\r\n]+/;
const XSSI = /^\)]\}',?\n/;
const empty = Object.create(null);

function toStringArray(value) {
    return filter(flatten([value]), isString).join(', ');
}

function safeParseJSON(response) {
    const json = String(response.data);
    response.data = JSON.parse(json.replace(XSSI, ''));
}

function asHeaderMap(map, header) {
    const parts = header.split(':');
    const key = String(parts.shift());
    const value = String(parts.join(':'));
    map[key.trim().toLowerCase()] = value.trim();
    return map;
}

function setResponseType(request, http) {
    http.responseType = request.responseType;
    if (request.responseType === 'json')
        http.responseType = 'text';
}

function setStatus(response, http) {
    response.status = http.status;
    response.statusText = http.statusText;
}

function setHeaders(response, http) {
    const headers = http.getAllResponseHeaders() || '';
    response.meta.headers = headers.split(splitter)
        .filter(Boolean)
        .reduce(asHeaderMap, {});
}

function setResponse(response, http) {
    response.data = http.response;
    if (get(response, 'meta.headers.content-type', '').includes('json'))
        attempt(safeParseJSON, response);
}

function setCached(response, sendDate) {
    const date = new Date(get(response, 'meta.headers.date'));
    if (!isNaN(date)) { // determines if Date is valid
        // Date header is only accurate to the nearest second
        // so we round both down to the second before comparing
        const responseTime = Math.floor(date.getTime() / 1000);
        const requestTime = Math.floor(sendDate.getTime() / 1000);
        set(response, 'meta.cached', responseTime < requestTime);
    }
}

function toKeyValuePair(name) {
    return [name, toStringArray(this[name])];
}

function hasHeaderValue([, values]) {
    return !isEmpty(values);
}

function setRequestHeader([name, value]) {
    this.setRequestHeader(name, value);
}

/**
 * @module index
 */

/**
 * A data adapter that uses the [XMLHttpRequest](https://xhr.spec.whatwg.org/) object to convert a Request into a Response. Can be passed to the [@paychex/core](https://github.com/paychex/core) createDataLayer factory method to enable data operations on NodeJS.
 *
 * @static
 * @function xhr
 * @param {Request} request The Request to convert into a Response.
 * @example
 * import xhrAdapter from '@paychex/adapter-xhr/index.js';
 * import { createDataLayer, createProxy } from '@paychex/core/data/index.js';
 *
 * const proxy = createProxy();
 * const { createRequest, fetch, setAdapter } = createDataLayer(proxy, xhrAdapter);
 */
export default function xhr(request) {

    return new Promise(function XHRPromise(resolve) {

        const sendDate = new Date();
        const http = new XMLHttpRequest();

        const response = {
            meta: {
                headers: {},
                messages: [],
                error: false,
                cached: false,
                timeout: false,
            },
            status: 0,
            statusText: 'OK',
            data: null,
        };

        function success() {
            setStatus(response, http);
            setHeaders(response, http);
            setResponse(response, http);
            setCached(response, sendDate);
            resolve(Object.freeze(response));
        }

        function abort() {
            setHeaders(response, http);
            response.status = 0;
            response.meta.error = true;
            response.statusText = response.meta.timeout ?
                'Timeout' : 'Aborted';
            resolve(Object.freeze(response));
        }

        function timeout() {
            response.meta.timeout = true;
            abort();
        }

        function failure() {
            response.meta.error = true;
            setStatus(response, http);
            setHeaders(response, http);
            resolve(Object.freeze(response));
        }

        http.addEventListener('load', success);
        http.addEventListener('abort', abort);
        http.addEventListener('error', failure);
        http.addEventListener('timeout', timeout);

        http.open(request.method, request.url);

        http.timeout = request.timeout;
        http.withCredentials = request.withCredentials;

        setResponseType(request, http);

        Object.keys(get(request, 'headers', empty))
            .map(toKeyValuePair, request.headers)
            .filter(hasHeaderValue)
            .forEach(setRequestHeader, http);

        http.send(request.body);

    });

}
