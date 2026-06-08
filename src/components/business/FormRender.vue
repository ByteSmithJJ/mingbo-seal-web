<template>
  <div class="form-render" :class="{ 'is-view': mode === 'view' }">
    <div class="form-render__container" ref="formContainerRef" style="position: relative">
      <form-create
        v-if="safeRule.length > 0"
        v-model:api="fApi"
        v-model="formDataVal"
        :rule="safeRule"
        :option="formOption"
      />

      <template v-if="mode === 'view' && seals && seals.length > 0">
        <img
          v-for="(seal, idx) in seals"
          :key="idx"
          :src="seal.sealImage"
          class="form-render__seal"
          :style="sealStyle(seal)"
          :title="seal.sealName"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { Api } from '@form-create/element-ui'
  import type { SealRecord } from '@/api/process'

  const props = withDefaults(
    defineProps<{
      formConfig: Record<string, any>
      formData?: Record<string, any>
      mode?: 'edit' | 'view'
      seals?: SealRecord[]
    }>(),
    {
      mode: 'edit',
      formData: () => ({}),
      seals: () => []
    }
  )

  const formContainerRef = ref<HTMLElement>()
  const fApi = ref<Api>()
  const formDataVal = ref<Record<string, any>>({})

  // form-create 标准 rule 属性白名单
  const RULE_WHITELIST = new Set([
    'type',
    'field',
    'title',
    'info',
    'value',
    'props',
    'validate',
    'effect',
    'children',
    'hidden',
    'display',
    'prefix',
    'suffix',
    'options',
    'component',
    'slot',
    'emit',
    'emitPrefix',
    'col',
    'wrap',
    'className',
    'style',
    'placeholder',
    'disabled',
    'readonly',
    'on',
    'native',
    'nativeOn',
    'inject'
  ])

  // 从 formConfig 提取 rule + option，并清理设计器内部字段
  const rule = computed(() => {
    const raw = props.formConfig
    if (!raw) return []

    const ruleArr = Array.isArray(raw) ? raw : raw.rule || raw.rules || []
    if (!ruleArr.length) return []

    return ruleArr.map((r: any, i: number) => {
      const cleaned: any = {}
      const dropped: string[] = []
      for (const key of Object.keys(r)) {
        if (RULE_WHITELIST.has(key)) {
          cleaned[key] = r[key]
        } else if (!key.startsWith('_fc_') && key !== 'name') {
          dropped.push(key)
        }
      }
      if (dropped.length) {
        console.log(`[FormRender] rule[${i}] 丢弃非标准字段:`, dropped)
      }
      console.log(`[FormRender] rule[${i}]: type=${cleaned.type}, field=${cleaned.field}`)
      if (!cleaned.type) console.warn(`[FormRender] rule[${i}] 缺少 type`)
      // 布局类/展示类组件不需要 field
      const noFieldTypes = new Set([
        'row',
        'col',
        'divider',
        'html',
        'space',
        'alert',
        'card',
        'button',
        'group',
        'subform',
        'tab',
        'table',
        'grid',
        'flex'
      ])
      if (!cleaned.field && !noFieldTypes.has(cleaned.type)) {
        console.warn(`[FormRender] rule[${i}] 缺少 field`)
      }
      return cleaned
    })
  })

  // 供模板使用的安全规则
  const safeRule = computed(() => rule.value)

  const formOption = computed(() => {
    const raw = props.formConfig
    const opt =
      !Array.isArray(raw) && (raw.option || raw.config || raw.options)
        ? raw.option || raw.config || raw.options || {}
        : {}
    return {
      ...opt,
      form: {
        labelWidth: '100px',
        ...(opt.form || {})
      },
      submitBtn: { show: false },
      resetBtn: { show: false }
    }
  })

  // view 模式下禁用所有字段
  watch(fApi, (api) => {
    if (api && props.mode === 'view') {
      nextTick(() => api.disabled(true))
    }
  })

  // 设置初始表单数据
  watch(
    () => [props.formData, fApi.value] as const,
    ([data, api]) => {
      if (api && data && Object.keys(data).length > 0) {
        api.setValue(data as Record<string, any>)
      }
    }
  )

  onBeforeUnmount(() => {
    if (fApi.value) {
      try {
        fApi.value.destroy?.()
      } catch {
        // form-create 3.x 组件模式下自动清理，忽略
      }
      fApi.value = undefined
    }
  })

  // 对外暴露
  function getFormData(): Record<string, any> {
    return formDataVal.value || {}
  }

  function validate(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!fApi.value) {
        resolve(true)
        return
      }
      fApi.value.validate((valid: boolean) => {
        resolve(valid)
      })
    })
  }

  defineExpose({ getFormData, validate })

  function sealStyle(seal: SealRecord) {
    return {
      position: 'absolute',
      left: `${seal.posX}px`,
      top: `${seal.posY}px`,
      width: `${seal.sealWidth || 120}px`,
      height: `${seal.sealHeight || 120}px`,
      objectFit: 'contain',
      pointerEvents: 'none',
      userSelect: 'none',
      zIndex: 10
    }
  }
</script>

<style scoped lang="scss">
  .form-render {
    &__container {
      min-height: 200px;
    }

    &.is-view {
      .form-render__seal {
        opacity: 0.85;
      }
    }
  }
</style>
