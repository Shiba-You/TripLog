# ローカル開発用（ホットリロード前提）。本番向けマルチステージ最適化は別タスクのスコープ。
FROM eclipse-temurin:21-jdk

WORKDIR /app

# gradlew 実行に必要な最小限のみ先にコピーし、レイヤーキャッシュを効かせる
COPY gradlew ./
COPY gradle ./gradle
RUN chmod +x gradlew

EXPOSE 8080 5005

CMD ["./gradlew", "bootRun", "--no-daemon"]
