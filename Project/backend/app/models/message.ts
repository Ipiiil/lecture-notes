import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column, hasMany } from '@adonisjs/lucid/orm'
import { randomUUID } from 'crypto'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Attachment from './attachment.js'

export default class Message extends BaseModel {
  @column()
  declare uid: string

  @column()
  declare chatUid: string

  @column()
  declare role: string

  @column()
  declare content: string

  // @column()
  // declare attachment: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @hasMany(() => Attachment, {
    localKey: 'uid',
    foreignKey: 'messageUid'
  })
  declare attachments: HasMany<typeof Attachment>

  @beforeCreate()
  static assignUuid(message: Message) {
    if (!message.uid) {
      message.uid = randomUUID()
    }
  }
}