FROM brainicism/bgutil-ytdlp-pot-provider:1.3.1 AS pot

FROM python:3.12-slim-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg nodejs ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Prebuilt bgutil POT server (generates YouTube proof-of-origin tokens)
COPY --from=pot /app /opt/bgutil

WORKDIR /app

COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server/server.py .
COPY server/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV HOST=0.0.0.0
ENV DOWNLOAD_DIR=/tmp/tubetone
ENV PYTHONUNBUFFERED=1
ENV POT_BASE_URL=http://127.0.0.1:4416

EXPOSE 10000

CMD ["/entrypoint.sh"]
