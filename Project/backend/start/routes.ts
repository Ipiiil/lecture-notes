/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

const ChatsController = () => import('#controllers/chats_controller')
const MessagesController = () => import('#controllers/messages_controller')
const AttachmentsController = () => import('#controllers/attachments_controller')

router.group(() => {
  router.resource('/chats', ChatsController).apiOnly()
  router.resource('/messages', MessagesController).apiOnly()

  router.group(() => {
    router.post('/', [AttachmentsController, 'store']) // Загрузить файл
    router.delete('/:id', [AttachmentsController, 'destroy']) // Удалить файл
    router.get('/:id', [AttachmentsController, 'show']) // Получить файл
  }).prefix('files')

}).prefix('api')
