[**BMO Robot — API Reference**](../../../README.md)

***

[BMO Robot — API Reference](../../../README.md) / [src/apiClient](../README.md) / ApiError

# Class: ApiError

Defined in: src/apiClient.ts:37

## Extends

- `Error`

## Constructors

### Constructor

> **new ApiError**(`status`, `endpoint`, `payload`, `message?`): `ApiError`

Defined in: src/apiClient.ts:42

#### Parameters

##### status

`number`

##### endpoint

`string`

##### payload

`unknown`

##### message?

`string`

#### Returns

`ApiError`

#### Overrides

`Error.constructor`

## Properties

### cause?

> `optional` **cause**: `unknown`

Defined in: C:/tools/typedoc-tools/node\_modules/typescript/lib/lib.es2022.error.d.ts:26

#### Inherited from

`Error.cause`

***

### endpoint

> **endpoint**: `string`

Defined in: src/apiClient.ts:39

***

### message

> **message**: `string`

Defined in: C:/tools/typedoc-tools/node\_modules/typescript/lib/lib.es5.d.ts:1077

#### Inherited from

`Error.message`

***

### name

> **name**: `string`

Defined in: C:/tools/typedoc-tools/node\_modules/typescript/lib/lib.es5.d.ts:1076

#### Inherited from

`Error.name`

***

### payload

> **payload**: `unknown`

Defined in: src/apiClient.ts:40

***

### stack?

> `optional` **stack**: `string`

Defined in: C:/tools/typedoc-tools/node\_modules/typescript/lib/lib.es5.d.ts:1078

#### Inherited from

`Error.stack`

***

### status

> **status**: `number`

Defined in: src/apiClient.ts:38

***

### prepareStackTrace()?

> `static` `optional` **prepareStackTrace**: (`err`, `stackTraces`) => `any`

Defined in: C:/tools/typedoc-tools/node\_modules/@types/node/globals.d.ts:143

Optional override for formatting stack traces

#### Parameters

##### err

`Error`

##### stackTraces

`CallSite`[]

#### Returns

`any`

#### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

#### Inherited from

`Error.prepareStackTrace`

***

### stackTraceLimit

> `static` **stackTraceLimit**: `number`

Defined in: C:/tools/typedoc-tools/node\_modules/@types/node/globals.d.ts:145

#### Inherited from

`Error.stackTraceLimit`

## Methods

### captureStackTrace()

> `static` **captureStackTrace**(`targetObject`, `constructorOpt?`): `void`

Defined in: C:/tools/typedoc-tools/node\_modules/@types/node/globals.d.ts:136

Create .stack property on a target object

#### Parameters

##### targetObject

`object`

##### constructorOpt?

`Function`

#### Returns

`void`

#### Inherited from

`Error.captureStackTrace`
