# ローカル開発用（ホットリロード前提）。本番向けビルド最適化は別タスクのスコープ。
FROM node:20

WORKDIR /app

COPY package.json ./
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate && pnpm install

EXPOSE 5173

CMD ["pnpm", "dev", "--host"]
