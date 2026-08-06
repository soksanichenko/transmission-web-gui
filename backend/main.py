import json
import logging
import os
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title='transmission-ui-config')

CONFIG_PATH = Path(os.getenv('CONFIG_PATH', '/data/config.json'))
_KEY_PATH = Path(os.getenv('CONFIG_KEY_PATH', CONFIG_PATH.parent / '.config.key'))

_DEFAULT = {'rpcUrl': '/transmission/rpc', 'username': '', 'password': ''}


def _load_fernet() -> Fernet:
    env_key = os.getenv('CONFIG_ENCRYPTION_KEY')
    if env_key:
        return Fernet(env_key.encode('utf-8'))
    if _KEY_PATH.exists():
        key = _KEY_PATH.read_bytes()
    else:
        key = Fernet.generate_key()
        _KEY_PATH.parent.mkdir(parents=True, exist_ok=True)
        _KEY_PATH.write_bytes(key)
        _KEY_PATH.chmod(0o600)
    return Fernet(key)


_fernet = _load_fernet()


def _decrypt_password(value: str) -> str:
    try:
        return _fernet.decrypt(value.encode('utf-8')).decode('utf-8')
    except InvalidToken:
        # Written by the Ansible template before the first save via this API — still plain text.
        return value


class ConnectionConfig(BaseModel):
    rpcUrl: str
    username: str
    password: str


@app.get('/config')
def get_config() -> dict:
    if not CONFIG_PATH.exists():
        return _DEFAULT
    try:
        data = json.loads(CONFIG_PATH.read_text(encoding='utf-8'))
        data['password'] = _decrypt_password(data['password'])
        return data
    except Exception as exc:
        logger.error('Failed to read %s: %s', CONFIG_PATH, exc)
        raise HTTPException(status_code=500, detail='Failed to read config') from exc


@app.post('/config')
def save_config(cfg: ConnectionConfig) -> dict:
    try:
        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        data = {
            'rpcUrl': cfg.rpcUrl,
            'username': cfg.username,
            'password': _fernet.encrypt(cfg.password.encode('utf-8')).decode('utf-8'),
        }
        CONFIG_PATH.write_text(
            json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8'
        )
        logger.info('Config saved to %s', CONFIG_PATH)
        return {'ok': True}
    except Exception as exc:
        logger.error('Failed to write %s: %s', CONFIG_PATH, exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
