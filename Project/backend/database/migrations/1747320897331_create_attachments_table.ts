import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'attachments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('uid', 36).primary().notNullable()

      table.string('chat_uid', 36).nullable()
      table.string('message_uid', 36).nullable()
      table.string('name').notNullable()
      table.string('type').notNullable()
      table.integer('size').notNullable()
      table.integer('path').notNullable()
      table.string('url').notNullable()
      table.string('gcuid', 36).nullable()

      table.timestamp('created_at')

      table.foreign('message_uid').references('messages.uid').onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}