/**
 * Provides the top-level XHR Adapter that can be used in `@paychex/core` data pipelines.
 *
 * ```js
 * // esm
 * import { xhr } from '@paychex/adapter-xhr';
 *
 * // cjs
 * const { xhr } = require('@paychex/adapter-xhr');
 *
 * // amd
 * define(['@paychex/adapter-xhr'], function({ xhr }) { ... });
 * require(['@paychex/adapter-xhr'], function({ xhr }) { ... });
 *
 * // iife
 * const { xhr } = window['@paychex/adapter-xhr'];
 * ```
 *
 * @module main
 */

import {
    get,
    set,
    filter,
    flatten,
    attempt,
    isEmpty,
    isString,
    isObject,
    isUndefined,
    overSome,
} from 'lodash';

import type { HeadersMap, Request, Response, MetaData, Message } from '@paychex/core/types/data';

export type { Request, Response, MetaData, HeadersMap, Message };

const splitter = /[\r\n]+/;
const XSSI = /^\)]\}',?\n/;
const empty: {} = Object.create(null);
const toString = Object.prototype.toString;

function toStringArray(value: string|string[]): string {
    return filter(flatten([value]), isString).join(', ');
}

function safeParseJSON(response: Response): void {
    const json = String(response.data);
    response.data = JSON.parse(json.replace(XSSI, ''));
}

function asHeaderMap(map: HeadersMap, header: string): HeadersMap {
    const parts = header.split(':');
    const key = String(parts.shift());
    const value = String(parts.join(':'));
    map[key.trim().toLowerCase()] = value.trim();
    return map;
}

function setResponseType(request: Request, http: XMLHttpRequest): void {
    http.responseType = request.responseType;
    if (request.responseType === 'json')
        http.responseType = 'text';
}

function setStatus(response: Response, http: XMLHttpRequest): void {
    response.status = http.status;
    response.statusText = http.statusText;
}

function setHeaders(response: Response, http: XMLHttpRequest): void {
    const headers = http.getAllResponseHeaders() || '';
    response.meta.headers = headers.split(splitter)
        .filter(Boolean)
        .reduce(asHeaderMap, {});
}

function setResponse(response: Response, http: XMLHttpRequest): void {
    response.data = http.response;
    if (get(response, 'meta.headers.content-type', '').includes('json'))
        attempt(safeParseJSON, response);
}

function setCached(response: Response, sendDate: Date): void {
    const date = new Date(get(response, 'meta.headers.date') as string);
    if (!isNaN(Number(date))) { // determines if Date is valid
        // Date header is only accurate to the nearest second
        // so we round both down to the second before comparing
        const responseTime = Math.floor(date.getTime() / 1000);
        const requestTime = Math.floor(sendDate.getTime() / 1000);
        set(response, 'meta.cached', responseTime < requestTime);
    }
}

function toKeyValuePair(name: string): [string, string] {
    return [name, toStringArray(this[name])];
}

function hasHeaderValue([, values]: [string, string|string[]]): boolean {
    return !isEmpty(values);
}

function setRequestHeader([name, value]: [string, string]): void {
    this.setRequestHeader(name, value);
}

function proto(object: any) {
    return Object.getPrototypeOf(object);
}

function isFile(object: any) {
    return toString.call(object) === '[object File]';
}

function isBlob(object: any) {
    return toString.call(object) === '[object Blob]';
}

function isFormData(object: any) {
    return toString.call(object) === '[object FormData]';
}

function isDataView(object: any) {
    return toString.call(object) === '[object DataView]';
}

function isArrayBuffer(object: any) {
    return toString.call(object) === '[object ArrayBuffer]';
}

function isUrlSearchParams(object: any) {
    return toString.call(object) === '[object URLSearchParams]';
}

function isTypedArray(object: any) {
    return get(proto(proto(object)), 'constructor.name') === 'TypedArray';
}

// these types can be processed by
// XmlHttpRequest.send without serialization
const isPassThroughType = overSome(
    isTypedArray,
    isFile,
    isBlob,
    isFormData,
    isUrlSearchParams,
    isArrayBuffer,
    isDataView,
);

function getPayload(body: any): any {
    const payload = isUndefined(body) ? null : body;
    const shouldStringify = isObject(body) && !isPassThroughType(body);
    return shouldStringify ? JSON.stringify(body) : payload;
}

/**
 * A data adapter that uses the [XMLHttpRequest](https://xhr.spec.whatwg.org/) object to convert a Request into a Response. Can be passed to the [@paychex/core](https://github.com/paychex/core) createDataLayer factory method to enable data operations on NodeJS.
 *
 * @param request The Request to convert into a Response.
 * @returns A Response for the given Request.
 * @example
 * ```js
 * const proxy = data.createProxy();
 * const { createRequest, fetch, setAdapter } = data.createDataLayer(proxy, xhr);
 * ```
 */
export function xhr(request: Request): Promise<Response> {

    return new Promise(function XHRPromise(resolve) {

        const sendDate = new Date();
        const http = new XMLHttpRequest();

        const response: Response = {
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

        Object.keys(get(request, 'headers', empty) as HeadersMap)
            .map(toKeyValuePair, request.headers)
            .filter(hasHeaderValue)
            .forEach(setRequestHeader, http);

        http.send(getPayload(request.body));

    });

}
