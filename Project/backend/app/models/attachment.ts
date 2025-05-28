import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
export default class Attachment extends BaseModel {
  @column()
  declare uid: string

  @column()
  declare chatUid: string | null

  @column()
  declare messageUid: string | null

  @column()
  declare name: string

  @column()
  declare type: string

  @column()
  declare size: number

  @column()
  declare path: string

  @column()
  declare url: string

  @column()
  declare gcuid: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}