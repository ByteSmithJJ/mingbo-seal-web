<!-- 表格按钮 -->
<template>
  <ElTooltip v-if="tooltipText" :content="tooltipText" placement="top" effect="dark">
    <div
      :class="[
        'inline-flex items-center justify-center min-w-8 h-8 px-2.5 mr-2.5 text-sm c-p rounded-md align-middle',
        buttonClass
      ]"
      :style="{ backgroundColor: buttonBgColor, color: iconColor }"
      @click="handleClick"
    >
      <ArtSvgIcon :icon="iconContent" />
    </div>
  </ElTooltip>
  <div
    v-else
    :class="[
      'inline-flex items-center justify-center min-w-8 h-8 px-2.5 mr-2.5 text-sm c-p rounded-md align-middle',
      buttonClass
    ]"
    :style="{ backgroundColor: buttonBgColor, color: iconColor }"
    @click="handleClick"
  >
    <ArtSvgIcon :icon="iconContent" />
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'ArtButtonTable' })

  interface Props {
    /** 按钮类型 */
    type?: 'add' | 'edit' | 'delete' | 'more' | 'view' | 'design'
    /** 按钮图标 */
    icon?: string
    /** 按钮样式类 */
    iconClass?: string
    /** icon 颜色 */
    iconColor?: string
    /** 按钮背景色 */
    buttonBgColor?: string
    /** 鼠标悬停提示文字 */
    tooltip?: string
  }

  const props = withDefaults(defineProps<Props>(), {})

  const emit = defineEmits<{
    (e: 'click'): void
  }>()

  // 默认按钮配置
  const defaultButtons = {
    add: { icon: 'ri:add-fill', class: 'bg-theme/12 text-theme', label: '新增' },
    edit: { icon: 'ri:pencil-line', class: 'bg-secondary/12 text-secondary', label: '编辑' },
    delete: { icon: 'ri:delete-bin-5-line', class: 'bg-error/12 text-error', label: '删除' },
    view: { icon: 'ri:eye-line', class: 'bg-info/12 text-info', label: '查看' },
    design: { icon: 'ri:pen-nib-line', class: 'bg-warning/12 text-warning', label: '设计' },
    more: { icon: 'ri:more-2-fill', class: '', label: '更多' }
  } as const

  // 提示文字：优先使用传入的 tooltip，其次用类型默认标签
  const tooltipText = computed(() => {
    if (props.tooltip) return props.tooltip
    if (props.type && defaultButtons[props.type]) return defaultButtons[props.type].label
    return ''
  })

  // 获取图标内容
  const iconContent = computed(() => {
    return props.icon || (props.type ? defaultButtons[props.type]?.icon : '') || ''
  })

  // 获取按钮样式类
  const buttonClass = computed(() => {
    return props.iconClass || (props.type ? defaultButtons[props.type]?.class : '') || ''
  })

  const handleClick = () => {
    emit('click')
  }
</script>
