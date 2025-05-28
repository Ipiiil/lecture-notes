import Chat from '#models/chat'
import Message from '#models/message'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'

export default class ChatsController {
    // Список чатов [проверено]
    async index({ response }: HttpContext) {

        const chats = await Chat
            .query()
            .select('uid', 'title', 'created_at')
            .orderBy('created_at', 'desc')

        return chats
            ? response.json(chats)
            : response.badRequest('Ошибка при получении чатов')
    }

    async show({ params, response }: HttpContext) {
        const messages = await Message
            .query()
            .preload('attachments')
            .where('chat_uid', params.id)
            .orderBy('created_at', 'asc')

        return messages
            ? response.json({ messages: messages })
            : response.json([])
    }

    // Создание чата [проверено]
    async store({ request, response }: HttpContext) {
        logger.info('Создание чата')
        const { uid, title } = request.body()

        const record = new Chat()

        await record
            .merge({
                uid: uid,
                title: title
            })
            .save()

        return record
            ? response.json(record)
            : response.badRequest('Ошибка при создании чата')
    }
}