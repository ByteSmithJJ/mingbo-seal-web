<template>
  <div class="bpmn-viewer">
    <div ref="canvasRef" class="bpmn-canvas" />
    <div v-if="!xml" class="bpmn-empty">
      <ElEmpty description="暂无流程图" :image-size="80" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import BpmnViewer from 'bpmn-js/lib/NavigatedViewer'
  import 'bpmn-js/dist/assets/diagram-js.css'
  import 'bpmn-js/dist/assets/bpmn-js.css'
  import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'

  const props = withDefaults(
    defineProps<{
      xml?: string
      highlightNodes?: string[]
      completedNodes?: string[]
      rejectedNodes?: string[]
      withdrawnNodes?: string[]
    }>(),
    {
      xml: '',
      highlightNodes: () => [],
      completedNodes: () => [],
      rejectedNodes: () => [],
      withdrawnNodes: () => []
    }
  )

  const canvasRef = ref<HTMLElement>()
  let viewer: BpmnViewer | null = null

  onMounted(() => {
    if (props.xml && canvasRef.value) {
      initViewer(props.xml)
    }
  })

  watch(
    () => props.xml,
    (val) => {
      if (val && canvasRef.value && val !== currentXml) {
        initViewer(val)
      }
    }
  )

  let currentXml = ''

  async function initViewer(xml: string) {
    if (!canvasRef.value || !xml) return
    currentXml = xml

    viewer?.destroy()
    viewer = new BpmnViewer({ container: canvasRef.value })

    try {
      await viewer.importXML(xml)
      const canvas = viewer.get('canvas') as any
      canvas.zoom('fit-viewport', 'auto')
      const elementRegistry = viewer.get('elementRegistry') as any

      // 开始事件：按类型查找
      if (props.completedNodes.includes('start')) {
        const startEl = elementRegistry.find((el: any) => el.type === 'bpmn:StartEvent')
        if (startEl) canvas.addMarker(startEl, 'highlight-completed')
      }
      // 结束事件：按类型查找
      if (props.completedNodes.includes('end')) {
        const endEl = elementRegistry.find((el: any) => el.type === 'bpmn:EndEvent')
        if (endEl) canvas.addMarker(endEl, 'highlight-completed')
      }

      // 已完成节点：绿色
      props.completedNodes.forEach((id) => {
        if (id !== 'start') {
          const el = elementRegistry.get(id)
          if (el) canvas.addMarker(el, 'highlight-completed')
        }
      })

      // 驳回节点：红色
      props.rejectedNodes.forEach((id) => {
        const el = elementRegistry.get(id)
        if (el) canvas.addMarker(el, 'highlight-rejected')
      })

      // 已撤回节点：橙色
      props.withdrawnNodes.forEach((id) => {
        const el = elementRegistry.get(id)
        if (el) canvas.addMarker(el, 'highlight-withdrawn')
      })

      // 当前活跃节点：蓝色
      props.highlightNodes.forEach((id) => {
        const el = elementRegistry.get(id)
        if (el) canvas.addMarker(el, 'highlight-active')
      })
    } catch (e) {
      console.error('[BpmnViewer] 加载流程图失败', e)
    }
  }

  onBeforeUnmount(() => {
    viewer?.destroy()
    viewer = null
  })
</script>

<style lang="scss" scoped>
  .bpmn-viewer {
    min-height: 400px;
    position: relative;

    .bpmn-canvas {
      width: 100%;
      height: 500px;
      outline: none;
      background: #fff;
    }

    .bpmn-empty {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--el-fill-color-lighter);
      border-radius: 8px;
    }
  }

  :deep(.highlight-active:not(.djs-connection) .djs-visual > :first-child) {
    stroke: #409eff !important;
    stroke-width: 3px !important;
    fill: #d9ecff !important;
  }

  :deep(.highlight-completed:not(.djs-connection) .djs-visual > :first-child) {
    stroke: #67c23a !important;
    stroke-width: 3px !important;
    fill: #e1f3d8 !important;
  }

  :deep(.highlight-rejected:not(.djs-connection) .djs-visual > :first-child) {
    stroke: #f56c6c !important;
    stroke-width: 3px !important;
    fill: #fde2e2 !important;
  }

  :deep(.highlight-withdrawn:not(.djs-connection) .djs-visual > :first-child) {
    stroke: #e6a23c !important;
    stroke-width: 3px !important;
    fill: #fdf6ec !important;
  }
</style>
