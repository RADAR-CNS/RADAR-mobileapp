export class ConfigKeys {
  static KAFKA_SPECIFICATION_URL = new ConfigKeys('kafka_specification_url')
  static OAUTH_REFRESH_SECONDS = new ConfigKeys('oauth_refresh_seconds')
  static OAUTH_CLIENT_ID = new ConfigKeys('oauth_client_id')
  static OAUTH_CLIENT_SECRET = new ConfigKeys('oauth_client_secret')
  static PROTOCOL_BASE_URL = new ConfigKeys('protocol_base_url')
  static PROTOCOL_PATH = new ConfigKeys('protocol_path')
  static PROTOCOL_BRANCH = new ConfigKeys('protocol_branch')
  static NOTIFICATION_TTL_MINUTES = new ConfigKeys('notification_ttl_minutes')
  static PLATFORM_INSTANCE = new ConfigKeys('platform_instance')
  static QUESTIONNAIRE_FILTERS = new ConfigKeys('questionnaire_filters')
  static APP_VERSION_LATEST = new ConfigKeys('app_version_latest')

  constructor(public value: string) {}

  toString() {
    return this.value
  }
}
