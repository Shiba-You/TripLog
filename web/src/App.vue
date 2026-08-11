<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useCounterStore } from '@/stores/counter'
import ExampleForm from '@/components/ExampleForm.vue'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
const health = ref<{ status: string; timestamp: string } | null>(null)
const healthError = ref<string | null>(null)

async function fetchHealth() {
  try {
    const res = await fetch(`${apiBaseUrl}/health`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    health.value = await res.json()
    healthError.value = null
  } catch (e) {
    healthError.value = e instanceof Error ? e.message : String(e)
  }
}

onMounted(fetchHealth)

const counter = useCounterStore()
</script>

<template>
  <main class="mx-auto flex max-w-xl flex-col gap-6 p-8">
    <h1 class="text-xl font-bold">TripLog ローカル開発環境</h1>

    <section class="flex flex-col gap-1">
      <h2 class="font-semibold">API ヘルスチェック</h2>
      <p v-if="health" class="text-emerald-700">
        status: {{ health.status }} / timestamp: {{ health.timestamp }}
      </p>
      <p v-else-if="healthError" class="text-red-600">取得失敗: {{ healthError }}</p>
      <p v-else class="text-gray-500">確認中...</p>
      <button class="w-fit rounded bg-gray-200 px-3 py-1" @click="fetchHealth">再確認</button>
    </section>

    <section class="flex flex-col gap-1">
      <h2 class="font-semibold">Pinia 動作確認</h2>
      <p>count: {{ counter.count }} / doubleCount: {{ counter.doubleCount }}</p>
      <button class="w-fit rounded bg-gray-200 px-3 py-1" @click="counter.increment">+1</button>
    </section>

    <section class="flex flex-col gap-1">
      <h2 class="font-semibold">フォームバリデーション動作確認</h2>
      <ExampleForm />
    </section>
  </main>
</template>
