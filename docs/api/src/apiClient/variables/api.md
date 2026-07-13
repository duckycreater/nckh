[**BMO Robot — API Reference**](../../../README.md)

***

[BMO Robot — API Reference](../../../README.md) / [src/apiClient](../README.md) / api

# Variable: api

> `const` **api**: `object`

Defined in: src/apiClient.ts:121

## Type declaration

### classifyImage()

> **classifyImage**: (`body`, `opts?`) => `Promise`\<[`ClassifyImageResponse`](../../apiContract/interfaces/ClassifyImageResponse.md)\>

#### Parameters

##### body

[`ClassifyImageRequest`](../../apiContract/interfaces/ClassifyImageRequest.md)

##### opts?

`FetchOptions`

#### Returns

`Promise`\<[`ClassifyImageResponse`](../../apiContract/interfaces/ClassifyImageResponse.md)\>

### getAuditTimeline()

> **getAuditTimeline**: (`cursor?`) => (`opts?`) => `Promise`\<[`AuditTimelineResponse`](../../apiContract/interfaces/AuditTimelineResponse.md)\>

#### Parameters

##### cursor?

`string`

#### Returns

> (`opts?`): `Promise`\<[`AuditTimelineResponse`](../../apiContract/interfaces/AuditTimelineResponse.md)\>

##### Parameters

###### opts?

`FetchOptions`

##### Returns

`Promise`\<[`AuditTimelineResponse`](../../apiContract/interfaces/AuditTimelineResponse.md)\>

### getDatasetStatus()

> **getDatasetStatus**: (`nickname`) => (`opts?`) => `Promise`\<[`DatasetStatusResponse`](../../apiContract/interfaces/DatasetStatusResponse.md)\>

#### Parameters

##### nickname

`string`

#### Returns

> (`opts?`): `Promise`\<[`DatasetStatusResponse`](../../apiContract/interfaces/DatasetStatusResponse.md)\>

##### Parameters

###### opts?

`FetchOptions`

##### Returns

`Promise`\<[`DatasetStatusResponse`](../../apiContract/interfaces/DatasetStatusResponse.md)\>

### getFederatedStats()

> **getFederatedStats**: (`opts?`) => `Promise`\<[`FederatedStatsResponse`](../../apiContract/interfaces/FederatedStatsResponse.md)\>

#### Parameters

##### opts?

`FetchOptions`

#### Returns

`Promise`\<[`FederatedStatsResponse`](../../apiContract/interfaces/FederatedStatsResponse.md)\>

### getSignedManifest()

> **getSignedManifest**: (`name`) => (`opts?`) => `Promise`\<[`SignedManifestResponse`](../../apiContract/interfaces/SignedManifestResponse.md)\>

#### Parameters

##### name

`string`

#### Returns

> (`opts?`): `Promise`\<[`SignedManifestResponse`](../../apiContract/interfaces/SignedManifestResponse.md)\>

##### Parameters

###### opts?

`FetchOptions`

##### Returns

`Promise`\<[`SignedManifestResponse`](../../apiContract/interfaces/SignedManifestResponse.md)\>

### grantDatasetConsent()

> **grantDatasetConsent**: (`body`, `opts?`) => `Promise`\<[`DatasetConsentResponse`](../../apiContract/interfaces/DatasetConsentResponse.md)\>

#### Parameters

##### body

[`DatasetConsentRequest`](../../apiContract/interfaces/DatasetConsentRequest.md)

##### opts?

`FetchOptions`

#### Returns

`Promise`\<[`DatasetConsentResponse`](../../apiContract/interfaces/DatasetConsentResponse.md)\>

### listModels()

> **listModels**: (`opts?`) => `Promise`\<[`ModelListResponse`](../../apiContract/interfaces/ModelListResponse.md)\>

#### Parameters

##### opts?

`FetchOptions`

#### Returns

`Promise`\<[`ModelListResponse`](../../apiContract/interfaces/ModelListResponse.md)\>

### login()

> **login**: (`body`, `opts?`) => `Promise`\<[`LoginResponseOk`](../../apiContract/interfaces/LoginResponseOk.md)\>

#### Parameters

##### body

[`LoginRequest`](../../apiContract/interfaces/LoginRequest.md)

##### opts?

`FetchOptions`

#### Returns

`Promise`\<[`LoginResponseOk`](../../apiContract/interfaces/LoginResponseOk.md)\>

### logout()

> **logout**: (`body`, `opts?`) => `Promise`\<\{ `ok`: `true`; \}\>

#### Parameters

##### body

##### opts?

`FetchOptions`

#### Returns

`Promise`\<\{ `ok`: `true`; \}\>

### rawFetch()

> **rawFetch**: \<`T`\>(`path`, `opts`) => `Promise`\<`T`\> = `apiFetch`

Escape hatch for one-off routes not yet typed here.

#### Type Parameters

##### T

`T`

#### Parameters

##### path

`string`

##### opts

`FetchOptions` = `{}`

#### Returns

`Promise`\<`T`\>

### register()

> **register**: (`body`, `opts?`) => `Promise`\<[`RegisterResponseOk`](../../apiContract/interfaces/RegisterResponseOk.md)\>

#### Parameters

##### body

[`RegisterRequest`](../../apiContract/interfaces/RegisterRequest.md)

##### opts?

`FetchOptions`

#### Returns

`Promise`\<[`RegisterResponseOk`](../../apiContract/interfaces/RegisterResponseOk.md)\>

### revokeDatasetConsent()

> **revokeDatasetConsent**: (`body`, `opts?`) => `Promise`\<[`DatasetConsentResponse`](../../apiContract/interfaces/DatasetConsentResponse.md)\>

#### Parameters

##### body

##### opts?

`FetchOptions`

#### Returns

`Promise`\<[`DatasetConsentResponse`](../../apiContract/interfaces/DatasetConsentResponse.md)\>

### submitFederated()

> **submitFederated**: (`body`, `opts?`) => `Promise`\<[`FederatedSubmitResponse`](../../apiContract/interfaces/FederatedSubmitResponse.md)\>

#### Parameters

##### body

[`FederatedSubmitRequest`](../../apiContract/interfaces/FederatedSubmitRequest.md)

##### opts?

`FetchOptions`

#### Returns

`Promise`\<[`FederatedSubmitResponse`](../../apiContract/interfaces/FederatedSubmitResponse.md)\>
