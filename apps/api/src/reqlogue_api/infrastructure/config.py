from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    api_title: str = "reqlogue API"
    cors_origins: str = "http://127.0.0.1:3000,http://localhost:3000"
    openai_api_key: str = ""
    openai_stt_model: str = "gpt-realtime-whisper"
    openai_stt_live: bool = False
    orcarouter_api_key: str = ""
    orcarouter_base_url: str = "https://api.orcarouter.ai/v1"
    orcarouter_model: str = "orcarouter/auto"
    orcarouter_live: bool = False

    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        ]
