import GigaChatService from '#services/gigachat_service'
import type { ApplicationService, Config } from '@adonisjs/core/types'

export default class GigachatProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {}

  /**
   * The container bindings have booted
   */
  async boot() {
    const config = this.app.config.get<Config['gigaChat']>('gigaChat')
    this.app.container.singleton(GigaChatService, () => new GigaChatService(config))
  }

  /**
   * The application has been booted
   */
  async start() {}

  /**
   * The process has been started
   */
  async ready() {}

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {}
}