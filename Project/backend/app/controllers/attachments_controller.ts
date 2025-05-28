import type { HttpContext } from '@adonisjs/core/http'
import Attachment from '#models/attachment'
import { inject } from '@adonisjs/core'
import GigaChatService from '#services/gigachat_service'
import { randomUUID } from 'node:crypto'
import drive from '@adonisjs/drive/services/main'

interface UploadedFile {
    uid: string
    chatUid: string | null
    messageUid: string | null
    name: string
    type: string
    size: number
    path: string
    url: string
}

@inject()
export default class AttachmentsController {
    constructor(private gigaChatService: GigaChatService) { }

    async store({ request }: HttpContext) {
        const { chat_uid, message_uid } = request.body()

        const file = request.file('document', {
            size: '20mb',
            extnames: ['txt', 'pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'],
        })

        const attachments: UploadedFile[] = []

        if (file) {
            const key = `${chat_uid}/${randomUUID()}.${file.extname}`
            await file.moveToDisk(key)

            const attachment = new Attachment()
            const data: UploadedFile = {
                uid: randomUUID(),
                chatUid: chat_uid,
                messageUid: message_uid,
                name: file.clientName,
                type: `${file.type}/${file.subtype}`,
                size: file.size,
                path: file.filePath!,
                url: key
            }

            await attachment.merge(data).save().catch()
            attachments.push(data)
        }
        return attachments
            ? attachments
            : []
    }

    async destroy({ params, response }: HttpContext) {
        const { id } = params

        const attachment = await Attachment.findBy('uid', id)

        if (!attachment) {
            return response.notFound({ message: 'File not found' })
        }

        const disk = drive.use()

        await disk.delete(attachment.path)
            .then(() => { return response.json({ message: 'File delete' }) })
            .catch((err: unknown) => { return response.badRequest(err) })

        await this.gigaChatService.gcDeleteFile(attachment.uid).catch()
    }

    async show({ params, response }: HttpContext) {
        const { id } = params

        try {
            const attachment = await Attachment.query().where('uid', id).firstOrFail()

            const disk = drive.use()
            const exists = await disk.exists(attachment.path)
            if (!exists) {
                return response.notFound({ error: 'Файл не найден' })
            }

            

            const stream = await disk.getStream(attachment.path)

            response.header('Content-Type', attachment.type)
            response.header('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.name)}"`)

            return response.stream(stream)
        } catch (error) {
            return response.notFound({ error: 'Файл не найден', details: error.message })
        }
    }
}

