[**BMO Robot — API Reference**](../../../README.md)

***

[BMO Robot — API Reference](../../../README.md) / [server/apiContract](../README.md) / Contracts

# Variable: Contracts

> `const` **Contracts**: `object`

Defined in: server/apiContract.ts:21

## Type declaration

### GET /api/audit/merkle-root

> `readonly` **GET /api/audit/merkle-root**: `object`

#### GET /api/audit/merkle-root.auth

> `readonly` **auth**: `false` = `false`

#### GET /api/audit/merkle-root.response

> `readonly` **response**: `ZodObject`\<\{ `rootHex`: `ZodString`; `total`: `ZodNumber`; \}, `$strip`\>

### GET /api/audit/user/:userId

> `readonly` **GET /api/audit/user/:userId**: `object`

#### GET /api/audit/user/:userId.auth

> `readonly` **auth**: `false` = `false`

#### GET /api/audit/user/:userId.response

> `readonly` **response**: `ZodObject`\<\{ `events`: `ZodArray`\<`ZodObject`\<\{ `kind`: `ZodString`; `merkleRoot`: `ZodString`; `payload`: `ZodRecord`\<`ZodString`, `ZodUnknown`\>; `seq`: `ZodNumber`; `ts`: `ZodString`; \}, `$loose`\>\>; \}, `$strip`\>

### GET /api/federated/latest

> `readonly` **GET /api/federated/latest**: `object`

#### GET /api/federated/latest.auth

> `readonly` **auth**: `false` = `false`

#### GET /api/federated/latest.response

> `readonly` **response**: `ZodObject`\<\{ `scores`: `ZodRecord`\<`ZodString`, `ZodNumber`\>; `trainedOnSamples`: `ZodNumber`; `version`: `ZodNullable`\<`ZodString`\>; \}, `$loose`\>

### GET /api/federated/rounds

> `readonly` **GET /api/federated/rounds**: `object`

#### GET /api/federated/rounds.auth

> `readonly` **auth**: `false` = `false`

#### GET /api/federated/rounds.response

> `readonly` **response**: `ZodObject`\<\{ `rounds`: `ZodArray`\<`ZodObject`\<\{ `completed_at`: `ZodNullable`\<`ZodString`\>; `dp_epsilon`: `ZodNullable`\<`ZodNumber`\>; `model_version_after`: `ZodNullable`\<`ZodString`\>; `participants_count`: `ZodNullable`\<`ZodNumber`\>; `round_number`: `ZodNumber`; `validation_accuracy`: `ZodNullable`\<`ZodNumber`\>; \}, `$loose`\>\>; \}, `$strip`\>

### GET /api/federated/status

> `readonly` **GET /api/federated/status**: `object`

#### GET /api/federated/status.auth

> `readonly` **auth**: `false` = `false`

#### GET /api/federated/status.response

> `readonly` **response**: `ZodObject`\<\{ `bufferSize`: `ZodNumber`; `config`: `ZodObject`\<\{ `clipNorm`: `ZodNumber`; `dpDelta`: `ZodNumber`; `dpEpsilon`: `ZodNumber`; `minClients`: `ZodNumber`; \}, `$loose`\>; `latestVersion`: `ZodNullable`\<`ZodObject`\<\{ `createdAt`: `ZodNumber`; `scores`: `ZodRecord`\<`ZodString`, `ZodNumber`\>; `trainedOn`: `ZodNumber`; `version`: `ZodString`; \}, `$strip`\>\>; \}, `$loose`\>

### GET /api/impact/summary

> `readonly` **GET /api/impact/summary**: `object`

#### GET /api/impact/summary.auth

> `readonly` **auth**: `false` = `false`

#### GET /api/impact/summary.query

> `readonly` **query**: `ZodObject`\<\{ `cohort`: `ZodDefault`\<`ZodString`\>; `sinceDays`: `ZodDefault`\<`ZodCoercedNumber`\<`unknown`\>\>; \}, `$strip`\>

#### GET /api/impact/summary.response

> `readonly` **response**: `ZodRecord`\<`ZodString`, `ZodUnknown`\>

### POST /api/chat

> `readonly` **POST /api/chat**: `object`

#### POST /api/chat.auth

> `readonly` **auth**: `false` = `false`

#### POST /api/chat.body

> `readonly` **body**: `ZodObject`\<\{ `messages`: `ZodArray`\<`ZodObject`\<\{ `content`: `ZodString`; `role`: `ZodEnum`\<\{ `assistant`: `"assistant"`; `user`: `"user"`; \}\>; \}, `$strip`\>\>; `nickname`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>

#### POST /api/chat.response

> `readonly` **response**: `ZodObject`\<\{ `message`: `ZodString`; \}, `$loose`\>

### POST /api/federated/submit

> `readonly` **POST /api/federated/submit**: `object`

#### POST /api/federated/submit.auth

> `readonly` **auth**: `true` = `true`

#### POST /api/federated/submit.body

> `readonly` **body**: `ZodObject`\<\{ `metrics`: `ZodOptional`\<`ZodObject`\<\{ `accuracy`: `ZodNumber`; `durationMs`: `ZodNumber`; `loss`: `ZodNumber`; \}, `$strip`\>\>; `numSamples`: `ZodNumber`; `privacy`: `ZodOptional`\<`ZodObject`\<\{ `delta`: `ZodNumber`; `epsilon`: `ZodNumber`; `noiseSigma`: `ZodNumber`; \}, `$strip`\>\>; `round`: `ZodOptional`\<`ZodNumber`\>; `weights`: `ZodArray`\<`ZodArray`\<`ZodNumber`\>\>; \}, `$strip`\>

#### POST /api/federated/submit.response

> `readonly` **response**: `ZodObject`\<\{ `accepted`: `ZodBoolean`; `queuedForRound`: `ZodNumber`; \}, `$loose`\>
