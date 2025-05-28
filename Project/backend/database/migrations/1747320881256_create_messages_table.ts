import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('uid', 36).primary().notNullable()

      table.string('chat_uid', 36).notNullable()
      table.string('role').notNullable()
      table.string('content').nullable()
      // table.string('attachment').nullable()

      table.timestamp('created_at')

      table.foreign('chat_uid').references('chats.uid').onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}