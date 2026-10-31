FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
# pip is left unpinned on purpose: always take the latest security fixes.
# hadolint ignore=DL3013
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY main.py .

ENV CONFIG_PATH=/data/config.json

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8081"]
