<template>
  <div v-loading="loading" class="w-full h-full">
    <iframe
      :src="druidUrl"
      frameborder="0"
      class="w-full h-full min-h-[calc(100vh-120px)] border-none"
      @load="handleLoad"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'Druid' })

const loading = ref(true)
const druidUrl = `${import.meta.env.VITE_API_URL}druid/login.html`

function handleLoad() {
  loading.value = false
}
</script>
