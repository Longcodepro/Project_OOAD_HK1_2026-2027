from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "OOAD Bus Ticket API"
    debug: bool = False

    mysql_user: str = "app_user"
    mysql_password: str = ""
    mysql_host: str = "localhost"
    mysql_port: int = 3306
    mysql_database: str = "ooad_busticket"

    jwt_secret: str = "change-me"
    jwt_expire_minutes: int = 60  # access token sống 1 giờ

    sms_mock: bool = True  # true: API trả luôn mã OTP vì không gửi SMS thật
    otp_ttl_seconds: int = 120
    otp_resend_seconds: int = 60
    otp_max_attempts: int = 5
    login_max_failures: int = 5
    login_lock_minutes: int = 15

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.mysql_user}:{self.mysql_password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}?charset=utf8mb4"
        )


settings = Settings()
