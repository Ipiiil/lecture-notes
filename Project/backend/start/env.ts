/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),

  /*
  |----------------------------------------------------------
  | Variables for configuring the drive package
  |----------------------------------------------------------
  */
  DRIVE_DISK: Env.schema.enum(['fs'] as const),

  GIGACHAT_CREDENTIALS: Env.schema.string(),
  GIGACHAT_MODEL: Env.schema.string(),
  GIGACHAT_TIMEOUT: Env.schema.number(),
  GIGACHAT_MAX_TOKENS: Env.schema.number(),
  GIGACHAT_MAX_TEMPERATURE: Env.schema.number(),
  GIGACHAT_SCOPE: Env.schema.string(),
  GIGACHAT_PROMPT_PATH: Env.schema.string(),
})
