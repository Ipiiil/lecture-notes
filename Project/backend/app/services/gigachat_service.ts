import logger from '@adonisjs/core/services/logger'
import { Exception } from '@adonisjs/core/exceptions'
import GigaChat from 'gigachat'
import type { UploadedFiles, Chat, ChatCompletion, MessageRole, UploadedFile, DeletedFile } from 'gigachat/interfaces'
import { Agent } from 'node:https'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import env from '#start/env'
import Message from '#models/message'
import Attachment from '#models/attachment'
import app from '@adonisjs/core/services/app'

type SDKMessageRole = MessageRole

export interface SDKMessage {
  role: SDKMessageRole
  content: string
  attachments?: string[]
}

export interface ExtendedChat extends Chat {
  messages: SDKMessage[]
}

export type SDKChatPayload = ExtendedChat
export type SDKChatCompletionResponse = ChatCompletion

export interface UploadedGigaFileInfo {
  gigaChatFileId: string
  originalFileName: string
  gigaChatFileName: string
}

const httpsAgent = new Agent({
  rejectUnauthorized: false
})

export type { SDKMessage as GigaChatMessage, SDKChatCompletionResponse as GigaChatCompletionResponse }

export default class GigaChatService {
  private client: GigaChat
  private defaultModel: string
  private system: SDKMessage

  constructor() {
    let promt
    const prompPath = app.makePath(env.get('GIGACHAT_PROMPT_PATH'))

    try {
      if (fsSync.existsSync(prompPath)) {
        promt = fsSync.readFileSync(prompPath, 'utf-8')
      } else {
        logger.error(`Файл системного промпта не найден по пути: ${prompPath}`)
      }
    } catch (error) {
      logger.error({ err: error }, `Ошибка чтения файла системного промпта: ${prompPath}, будет установлен режим гопника`)
    }

    this.system = {
      role: 'system',
      content: promt ||
        `Ты — ИИ, который мастерски владеет сленгом и атмосферой русской уличной культуры 90-х–2000-х, в частности, субкультурой гопников. 
        Отвечай в стиле гопника. 
        Используй характерный сленг (например, "пацан", "бери нормально", "чисто конкретно"), но держи текст в рамках приличия, без мата и грубостей. 
        Сделай акцент на юмор, браваду и уличную философию. 
        Добавь колоритные детали: спортивный костюм, семки, старый телефон Nokia, подъезд, девяточка (ВАЗ-2109).
        Учти, что текст должен быть живым, как будто пацан с района реально базарит.
        Если нужно, добавь немного иронии или самоиронии, чтобы подчеркнуть абсурдность ситуаций.
        Длина ответа не более 100 слов.`,
    }

    const config = {
      credentials: env.get('GIGACHAT_CREDENTIALS', ''),
      model: env.get('GIGACHAT_MODEL', 'GigaChat'),
      timeout: env.get('GIGACHAT_TIMEOUT', 5000),
      scope: env.get('GIGACHAT_SCOPE', 'GIGACHAT_API_PERS'),

    }

    if (!config.credentials) {
      throw new Exception(
        'GigaChat авторизационные данные отсутствуют. Убедитесь, что GIGACHAT_CREDENTIALS установлены в .env',
        {
          status: 500,
          code: 'E_GIGACHAT_CONFIG_MISSING',
        }
      )
    }

    this.client = new GigaChat({
      credentials: config.credentials,
      model: config.model,
      timeout: config.timeout ? Number(config.timeout) / 1000 : undefined,
      scope: config.scope,
      httpsAgent: httpsAgent
    })
    this.defaultModel = config.model || 'GigaChat'
  }

  async gcListFiles(): Promise<UploadedFiles> {
    return await this.client
      .getFiles()
      .catch()
  }

  async gcDeleteFile(file: string): Promise<DeletedFile> {
    return await this.client
      .deleteFile(file)
      .catch()
  }

  async gcUploadFile(
    file: Attachment,
    purpose: 'general' | 'assistant'
  ): Promise<UploadedFile> {
    try {
      const buffer = await fs.readFile(`storage/uploads/${file.path}`)

      const fileObject = new globalThis.File([buffer], file.name, { type: file.type })
      const response: UploadedFile = await this.client
        .uploadFile(fileObject, purpose)
        .catch()

      if (!response || !('id' in response)) {
        throw new Error('Ответ от GigaChat при загрузке файла не содержит ID файла')
      }

      return response
    } catch (error: any) {
      logger.error({ err: error.message, file }, 'Ошибка при загрузке файла в GigaChat')
      throw new Exception(
        `Ошибка при загрузке файла в GigaChat: ${error.message || 'Неизвестная ошибка SDK'}`,
        {
          status: error.status || 500,
          code: error.code || 'E_GIGACHAT_FILE_UPLOAD_ERROR',
          cause: error.message,
        }
      )
    }
  }

  async sendMessage(
    chatUid: string,
    message: SDKMessage,
    options?: Omit<SDKChatPayload, 'messages' | 'model'>
  ): Promise<ChatCompletion> {
    try {
      let files: string[] = []

      if (message.attachments && message.attachments.length > 0) {
        const uploadPromises = message.attachments.map(async (uid) => {
          try {
            const file = await Attachment
              .query()
              .where('uid', uid)
              .firstOrFail()
              .then(async (res) => {
                return await this.gcUploadFile(
                  res,
                  'general'
                ).then(async (gc) => {
                  await Attachment
                    .query()
                    .where('uid', res.uid)
                    .update({ gcuid: gc.id })
                    .catch(() => { return null })

                  return gc.id
                })
                  .catch((error) => {
                    throw new Exception(
                      `Ошибка при отправке файла в GigaChat || 'Неизвестная ошибка SDK'}`,
                      {
                        status: error.status || 500,
                        code: error.code || 'E_GIGACHAT_MESSAGE_WITH_FILES_ERROR',
                        cause: error,
                      }
                    )
                  })
              })
              .catch(() => { })

            const gcf = await this.client.getFile(String(file))

            logger.info(gcf, 'Информация о файле из хранилища GigaChat')

            return file
          } catch (error) {
            logger.error({ err: error, uid }, `Ошибка обработки вложения ${uid} для загрузки в GigaChat.`)
            return null
          }
        })

        const results = await Promise.all(uploadPromises);

        files = results.filter((fileId): fileId is any => fileId !== null)
      }

      const current: SDKMessage = {
        role: message.role as SDKMessage['role'],
        content: message.content,
        attachments: files || []
      }

      const messagesDb = await Message
        .query()
        .preload('attachments')
        .where('chat_uid', chatUid)
        .orderBy('created_at', 'asc')

      const history: SDKMessage[] = messagesDb.map(item => {
        const sdkMessage: SDKMessage = {
          role: item.role as SDKMessage['role'],
          content: item.content,
          attachments: item.attachments.map(att => att.gcuid) || []
        }

        return sdkMessage
      })

      logger.info({ current }, 'Текущее сообщение')

      const messages: SDKMessage[] = [this.system, ...history, current];

      const payload: SDKChatPayload = {
        model: this.defaultModel,
        ...(options || {
          temperature: env.get('GIGACHAT_MAX_TEMPERATURE'),
          stream: false,
          profanity_check: false,
          max_tokens: env.get('GIGACHAT_MAX_TOKENS'),
          n: 1
        }),
        messages: messages,
      }

      const response = await this.client.chat(payload).then((res) => {
        return res
      })

      return response.choices[0].message

    } catch (error: any) {
      logger.error('Ошибка при отправке сообщения с файлами в GigaChat')
      throw new Exception(
        `Ошибка при отправке сообщения с файлами в GigaChat || 'Неизвестная ошибка SDK'}`,
        {
          status: error.status || 500,
          code: error.code || 'E_GIGACHAT_MESSAGE_WITH_FILES_ERROR',
          cause: error,
        }
      )
    }
  }
}