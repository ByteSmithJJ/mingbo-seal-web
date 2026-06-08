<template>
  <div v-loading="loading" class="w-full h-full">
    <iframe
      :src="swaggerUrl"
      frameborder="0"
      class="w-full h-full min-h-[calc(100vh-120px)] border-none"
      @load="handleLoad"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'Swagger' })

const loading = ref(true)
const swaggerUrl = `${import.meta.env.VITE_API_URL}swagger-ui/index.html`

function handleLoad() {
  loading.value = false
}
</script>
