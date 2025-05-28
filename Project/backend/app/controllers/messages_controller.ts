import Attachment from '#models/attachment'
import Message from '#models/message'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import { randomUUID } from 'node:crypto'
import GigaChatService from '#services/gigachat_service'
import { inject } from '@adonisjs/core'

@inject()
export default class MessagesController {
    constructor(private gigaChatService: GigaChatService) { }

    // Получение сообщений
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

    // Создание сообщения
    async store({ request, response }: HttpContext) {
        const { messageUid, chatUid, role, content, attachments } = request.body()

        const record = new Message()
        record.uid = messageUid

        await record
            .merge({
                uid: messageUid,
                chatUid: chatUid,
                role: role,
                content: content
            })
            .save()

        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
            await Attachment
                .query()
                .whereIn('uid', attachments)
                .update({
                    chatUid: record.chatUid,
                    messageUid: record.uid
                })
                .catch((err) => {
                    logger.error({ err }, `Ошибка при обновлении вложений для сообщения ${record.uid}`)
                })
        }

        return await this.gigaChatService.sendMessage(chatUid, {
            role: 'user',
            content: content,
            attachments: attachments || []
        }).then(async (res) => {
            const assistant = new Message()
            const uid = randomUUID()

            await assistant
                .merge({
                    uid: uid,
                    chatUid: chatUid,
                    ...res
                }).save()

            return response.json({
                uid: uid,
                chatUid: chatUid,
                ...res
            })
        })
            .catch((err) => {
                logger.error({ err }, `Ошибка при отправке сообщения в GigaChat: ${chatUid}`)
                return response.badRequest('Ошибка при создании сообщения')
            })
    }
}