<!-- 系统logo -->
<template>
  <div class="flex-cc logo-wrapper">
    <img :style="logoStyle" src="@imgs/common/logo.svg" alt="MingBo Pro" class="logo-img" />
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'ArtLogo' })

  interface Props {
    /** logo 大小 */
    size?: number | string
  }

  const props = withDefaults(defineProps<Props>(), {
    size: 36
  })

  const logoStyle = computed(() => ({
    width: `${props.size}px`,
    height: `${props.size}px`
  }))
</script>

<style scoped>
  .logo-wrapper {
    flex-shrink: 0;
  }

  .logo-img {
    display: block;
    border-radius: 9px;
  }
</style>
