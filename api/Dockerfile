# ローカル開発用（ホットリロード前提）。本番向けマルチステージ最適化は別タスクのスコープ。
FROM eclipse-temurin:21-jdk

# devcontainerのアタッチ先としてweb/mobileのソースも編集・操作できるよう、Node.js + pnpmを同居させる。gitはdevcontainer内でのコミット・ブランチ操作に必要。
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs git \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@10.15.1 --activate \
    && npm install -g @anthropic-ai/claude-code

WORKDIR /app

# gradlew 実行に必要な最小限のみ先にコピーし、レイヤーキャッシュを効かせる
COPY gradlew ./
COPY gradle ./gradle
RUN chmod +x gradlew

EXPOSE 8080 5005

CMD ["./gradlew", "bootRun", "--no-daemon"]
