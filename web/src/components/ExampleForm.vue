<script setup lang="ts">
import { useForm } from 'vee-validate'
import { exampleFormSchema } from '@/validation/exampleSchema'

const { defineField, handleSubmit, errors, resetForm } = useForm({
  validationSchema: exampleFormSchema,
})
const [name, nameAttrs] = defineField('name')

const submitted = handleSubmit((values) => {
  window.alert(`送信内容: ${values.name}`)
  resetForm()
})
</script>

<template>
  <form class="flex flex-col gap-2" @submit="submitted">
    <label for="name" class="text-sm font-medium">名前（vee-validate + yup 動作確認）</label>
    <input
      id="name"
      v-model="name"
      v-bind="nameAttrs"
      type="text"
      class="rounded border border-gray-300 px-2 py-1"
    />
    <p v-if="errors.name" class="text-sm text-red-600">{{ errors.name }}</p>
    <button type="submit" class="w-fit rounded bg-emerald-600 px-3 py-1 text-white">送信</button>
  </form>
</template>
