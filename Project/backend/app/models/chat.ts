import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column, hasMany } from '@adonisjs/lucid/orm'
import Message from './message.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'

export default class Chat extends BaseModel {
  @column()
  declare uid: string

  @column()
  declare title: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @hasMany(() => Message, {
    localKey: 'uid',
    foreignKey: 'chatUid'
  })
  declare messages: HasMany<typeof Message>

  @beforeCreate()
  static assignUuid(chat: Chat) {
    if (!chat.uid) {
      chat.uid = randomUUID()
    }
  }
}