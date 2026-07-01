import json
import logging
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title='transmission-ui-config')

CONFIG_PATH = Path(os.getenv('CONFIG_PATH', '/data/config.json'))

_DEFAULT = {'rpcUrl': '/transmission/rpc', 'username': '', 'password': ''}


class ConnectionConfig(BaseModel):
    rpcUrl: str
    username: str
    password: str


@app.get('/config')
def get_config() -> dict:
    if not CONFIG_PATH.exists():
        return _DEFAULT
    try:
        return json.loads(CONFIG_PATH.read_text(encoding='utf-8'))
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
            'password': cfg.password,
        }
        CONFIG_PATH.write_text(
            json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8'
        )
        logger.info('Config saved to %s', CONFIG_PATH)
        return {'ok': True}
    except Exception as exc:
        logger.error('Failed to write %s: %s', CONFIG_PATH, exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
