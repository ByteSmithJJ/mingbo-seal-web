<template>
  <div class="process-designer-container">
    <div class="process-designer-header">
      <div class="header-left">
        <span class="header-title">{{ definitionName || '流程设计器' }}</span>
      </div>

      <div class="header-center">
        <ElButtonGroup size="small" class="toolbar-group">
          <ElButton type="primary" @click="handleSave"
            ><el-icon><EditPen /></el-icon>保存流程</ElButton
          >
          <ElButton type="primary" @click="triggerFileInput"
            ><el-icon><FolderOpened /></el-icon>打开文件</ElButton
          >
          <ElDropdown trigger="click">
            <ElButton type="primary"
              ><el-icon><Download /></el-icon>下载文件<Icon
                icon="ri:arrow-down-s-line"
                style="font-size: 12px"
            /></ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem @click="handleDownload('xml')">下载为 XML 文件</ElDropdownItem>
                <ElDropdownItem @click="handleDownload('svg')">下载为 SVG 文件</ElDropdownItem>
                <ElDropdownItem @click="handleDownload('bpmn')">下载为 BPMN 文件</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
          <ElDropdown trigger="click">
            <ElButton type="primary"
              ><el-icon><View /></el-icon>预览<Icon
                icon="ri:arrow-down-s-line"
                style="font-size: 12px"
            /></ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem @click="handlePreview('xml')">预览 XML</ElDropdownItem>
                <ElDropdownItem @click="handlePreview('json')">预览 JSON</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </ElButtonGroup>

        <ElDivider direction="vertical" />

        <ElButtonGroup size="small" class="toolbar-group">
          <ElButton @click="() => handleAlign('left')" title="左对齐"
            ><Icon icon="ri:align-left" />左对齐</ElButton
          >
          <ElButton @click="() => handleAlign('right')" title="右对齐"
            ><Icon icon="ri:align-right" />右对齐</ElButton
          >
          <ElButton @click="() => handleAlign('top')" title="上对齐"
            ><Icon icon="ri:align-top" />上对齐</ElButton
          >
          <ElButton @click="() => handleAlign('bottom')" title="下对齐"
            ><Icon icon="ri:align-bottom" />下对齐</ElButton
          >
          <ElButton @click="() => handleAlign('center')" title="水平居中"
            ><Icon icon="ri:align-center" />水平居中</ElButton
          >
          <ElButton @click="() => handleAlign('middle')" title="垂直居中"
            ><Icon icon="ri:align-vertically" />垂直居中</ElButton
          >
        </ElButtonGroup>

        <ElDivider direction="vertical" />

        <ElButtonGroup size="small" class="toolbar-group">
          <ElButton @click="handleZoomOut" :disabled="currentZoom <= 0.3" title="缩小">
            <el-icon><ZoomOut /></el-icon>
          </ElButton>
          <ElButton class="zoom-label" disabled>{{ Math.floor(currentZoom * 100) }}%</ElButton>
          <ElButton @click="handleZoomIn" :disabled="currentZoom >= 3.9" title="放大">
            <el-icon><ZoomIn /></el-icon>
          </ElButton>
          <ElButton @click="handleZoomReset" title="适应画布">
            <el-icon><FullScreen /></el-icon>
          </ElButton>
        </ElButtonGroup>

        <ElDivider direction="vertical" />

        <ElButtonGroup size="small" class="toolbar-group">
          <ElButton @click="handleUndo" :disabled="!canUndo" title="撤销">
            <el-icon><RefreshLeft /></el-icon>
          </ElButton>
          <ElButton @click="handleRedo" :disabled="!canRedo" title="恢复">
            <el-icon><RefreshRight /></el-icon>
          </ElButton>
          <ElButton @click="handleReset" title="重新绘制">
            <el-icon><Refresh /></el-icon>
          </ElButton>
        </ElButtonGroup>
      </div>

      <div class="header-right">
        <ElButton v-if="showClose" size="small" @click="$emit('close')">关闭</ElButton>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        style="display: none"
        accept=".xml,.bpmn"
        @change="handleImportFile"
      />
    </div>

    <div class="process-designer-body">
      <div ref="canvasRef" class="canvas-wrapper" />
      <BpmnPropertiesPanel
        v-if="modeler"
        :bpmn-modeler="modeler"
        prefix="flowable"
        :width="400"
        class="properties-wrapper"
      />
    </div>

    <ElDialog v-model="previewVisible" title="预览" width="60%" destroy-on-close>
      <div class="preview-content">
        <pre>{{ previewContent }}</pre>
      </div>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    EditPen,
    FolderOpened,
    Download,
    View,
    ZoomOut,
    ZoomIn,
    FullScreen,
    RefreshLeft,
    RefreshRight,
    Refresh
  } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import BpmnModeler from 'bpmn-js/lib/Modeler'
  import 'bpmn-js/dist/assets/diagram-js.css'
  import 'bpmn-js/dist/assets/bpmn-js.css'
  import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'
  import customTranslate from './plugins/translate'
  import translationsCN from './plugins/translate/zh'
  import flowableModdleExtension from './plugins/moddle'
  import flowableModdleDescriptor from './plugins/moddle/flowableDescriptor.json'
  import CustomPalette from './plugins/palette'
  import CustomContentPad from './plugins/content-pad'
  import BpmnPropertiesPanel from './penal/PropertiesPanel.vue'
  import './process-designer.scss'
  import './process-panel.scss'
  import type { SavePayload } from './types'

  defineOptions({ name: 'ProcessDesigner' })

  const props = withDefaults(
    defineProps<{
      definitionId?: number | string | null
      definitionName?: string
      definitionKey?: string
      bpmnXml?: string
      showClose?: boolean
      showDeploy?: boolean
    }>(),
    {
      definitionId: null,
      definitionName: '',
      definitionKey: '',
      bpmnXml: '',
      showClose: true,
      showDeploy: true
    }
  )

  const emit = defineEmits<{
    save: [payload: SavePayload]
    deploy: [definitionId: number | string]
    close: []
  }>()

  const canvasRef = ref<HTMLElement>()
  const fileInputRef = ref<HTMLInputElement>()

  const currentZoom = ref(1)
  const canUndo = ref(false)
  const canRedo = ref(false)
  const saving = ref(false)
  const deploying = ref(false)
  const previewVisible = ref(false)
  const previewContent = ref('')
  const previewType = ref<'xml' | 'json'>('xml')
  const modeler = ref<any>(null)

  let modelerInstance: BpmnModeler | null = null

  const defaultEmptyDiagram = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:flowable="http://flowable.org/bpmn"
  id="Definitions_1"
  targetNamespace="http://flowable.org/bpmn">
  <bpmn:process id="Process_1" name="业务流程" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="159" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

  onMounted(() => {
    nextTick(() => initModeler(props.bpmnXml || defaultEmptyDiagram))
  })

  onBeforeUnmount(() => {
    modelerInstance?.destroy()
    modelerInstance = null
  })

  watch(
    () => props.bpmnXml,
    (newXml) => {
      if (newXml && modelerInstance) {
        modelerInstance.importXML(newXml).catch(() => {
          modelerInstance?.importXML(defaultEmptyDiagram)
        })
      }
    }
  )

  function initModeler(xml: string) {
    if (!canvasRef.value) return

    modelerInstance?.destroy()

    const translateModule = {
      translate: ['value', customTranslate(translationsCN)]
    }

    modelerInstance = new BpmnModeler({
      container: canvasRef.value,
      additionalModules: [
        CustomPalette,
        CustomContentPad,
        translateModule,
        flowableModdleExtension
      ],
      moddleExtensions: {
        flowable: flowableModdleDescriptor as any
      }
    } as any)

    modelerInstance.importXML(xml).catch(() => {
      modelerInstance?.importXML(defaultEmptyDiagram)
    })

    const eventBus = modelerInstance.get('eventBus')
    const commandStack = modelerInstance.get('commandStack')

    eventBus.on('commandStack.changed', () => {
      canUndo.value = commandStack.canUndo()
      canRedo.value = commandStack.canRedo()
    })

    modelerInstance.on('canvas.viewbox.changed', ({ viewbox }: any) => {
      currentZoom.value = Math.floor(viewbox.scale * 100) / 100
    })

    modeler.value = modelerInstance
  }

  function getStartEventFormTemplateId(): number | null {
    if (!modelerInstance) return null
    const elementRegistry = modelerInstance.get('elementRegistry')
    const startEvent = elementRegistry.find((el: any) => el.type === 'bpmn:StartEvent')
    if (startEvent?.businessObject?.formKey) {
      const match = startEvent.businessObject.formKey.match(/^key_(\d+)$/)
      if (match) {
        return parseInt(match[1], 10)
      }
    }
    return null
  }

  function handleSave() {
    if (!modelerInstance) return
    modelerInstance.saveXML({ format: true }).then((result: any) => {
      emit('save', {
        xml: result.xml || '',
        formTemplateId: getStartEventFormTemplateId(),
        saveAsNewVersion: false
      })
    })
  }

  async function handleSaveProcess() {
    if (!modelerInstance) return
    saving.value = true
    try {
      const result: any = await modelerInstance.saveXML({ format: true })
      if (!result.xml) {
        ElMessage.warning('流程图内容为空')
        return
      }
      try {
        await ElMessageBox.confirm('是否将此模型保存为新版本？', '保存确认', {
          confirmButtonText: '是',
          cancelButtonText: '否',
          distinguishCancelAndClose: true,
          type: 'info'
        })
        emit('save', {
          xml: result.xml || '',
          formTemplateId: getStartEventFormTemplateId(),
          saveAsNewVersion: true
        })
      } catch (action: any) {
        if (action === 'cancel') {
          emit('save', {
            xml: result.xml || '',
            formTemplateId: getStartEventFormTemplateId(),
            saveAsNewVersion: false
          })
        }
      }
    } catch {
      ElMessage.error('保存失败')
    } finally {
      saving.value = false
    }
  }

  function handleDeployProcess() {
    const id = props.definitionId
    if (!id) {
      ElMessage.warning('请先保存流程定义')
      return
    }
    emit('deploy', id)
  }

  function triggerFileInput() {
    fileInputRef.value?.click()
  }

  function handleImportFile() {
    const file = fileInputRef.value?.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (modelerInstance && typeof reader.result === 'string') {
        modelerInstance.importXML(reader.result)
      }
    }
    reader.readAsText(file)
    if (fileInputRef.value) fileInputRef.value.value = ''
  }

  async function handleDownload(type: 'xml' | 'svg' | 'bpmn') {
    if (!modelerInstance) return
    try {
      if (type === 'xml' || type === 'bpmn') {
        const result: any = await modelerInstance.saveXML({ format: true })
        downloadContent(result.xml || '', `diagram.${type}`, 'text/xml')
      } else {
        const result: any = await modelerInstance.saveSVG()
        downloadContent(result.svg || '', 'diagram.svg', 'image/svg+xml')
      }
    } catch {
      ElMessage.error('下载失败')
    }
  }

  function downloadContent(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.download = filename
    a.href = url
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handlePreview(type: 'xml' | 'json') {
    if (!modelerInstance) return
    try {
      const result: any = await modelerInstance.saveXML({ format: true })
      if (type === 'xml') {
        previewContent.value = result.xml || ''
      } else {
        const convert = await import('xml-js')
        previewContent.value = convert.xml2json(result.xml || '', { spaces: 2 })
      }
      previewType.value = type
      previewVisible.value = true
    } catch {
      ElMessage.error('预览失败')
    }
  }

  function handleZoomIn() {
    if (!modelerInstance) return
    const canvas = modelerInstance.get('canvas')
    const newZoom = Math.floor((currentZoom.value + 0.1) * 100) / 100
    currentZoom.value = Math.min(newZoom, 4)
    canvas.zoom(currentZoom.value)
  }

  function handleZoomOut() {
    if (!modelerInstance) return
    const canvas = modelerInstance.get('canvas')
    const newZoom = Math.floor((currentZoom.value - 0.1) * 100) / 100
    currentZoom.value = Math.max(newZoom, 0.2)
    canvas.zoom(currentZoom.value)
  }

  function handleZoomReset() {
    if (!modelerInstance) return
    currentZoom.value = 1
    modelerInstance.get('canvas').zoom('fit-viewport', 'auto')
  }

  function handleUndo() {
    if (!modelerInstance) return
    modelerInstance.get('commandStack').undo()
  }

  function handleRedo() {
    if (!modelerInstance) return
    modelerInstance.get('commandStack').redo()
  }

  function handleReset() {
    if (!modelerInstance) return
    canUndo.value = false
    canRedo.value = false
    modelerInstance.importXML(defaultEmptyDiagram)
    nextTick(() => modelerInstance?.get('canvas').zoom(1, 'auto'))
  }

  function handleAlign(align: string) {
    if (!modelerInstance) return
    const alignElements = modelerInstance.get('alignElements')
    const selection = modelerInstance.get('selection')
    const selectedElements = selection.get()
    if (!selectedElements || selectedElements.length <= 1) {
      ElMessage.warning('请按住 Ctrl 键选择多个元素对齐')
      return
    }
    ElMessageBox.confirm('自动对齐可能造成图形变形，是否继续？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => alignElements.trigger(selectedElements, align))
      .catch(() => {})
  }
</script>

<style lang="scss">
  .process-designer-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: #fff;

    .process-designer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      height: 48px;
      min-height: 48px;
      border-bottom: 1px solid var(--el-border-color-light);
      gap: 12px;
      background: var(--el-bg-color);
      flex-shrink: 0;

      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;

        .header-title {
          font-size: 15px;
          font-weight: 600;
          white-space: nowrap;
        }
      }

      .header-center {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: nowrap;
        overflow-x: auto;

        .toolbar-group {
          flex-shrink: 0;
        }

        .el-divider {
          margin: 0 4px;
          height: 20px;
        }

        .zoom-label {
          min-width: 50px;
          justify-content: center;
          cursor: default;
          font-variant-numeric: tabular-nums;
        }
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
    }

    .process-designer-body {
      flex: 1;
      display: flex;
      min-height: 0;
      overflow: hidden;

      .canvas-wrapper {
        flex: 1;
        min-height: 0;
        outline: none;
        background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMTBoNDBNMTAgMHY0ME0wIDIwaDQwTTIwIDB2NDBNMCAzMGg0ME0zMCAwdjQwIiBmaWxsPSJub25lIiBzdHJva2U9IiNlMGUwZTAiIG9wYWNpdHk9Ii4yIi8+PHBhdGggZD0iTTQwIDBIMHY0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTBlMGUwIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+')
          repeat !important;
      }

      .properties-wrapper {
        width: 400px;
        flex-shrink: 0;
        overflow-y: auto;
        border-left: 1px solid var(--el-border-color-light);
        background: #fff;
      }
    }

    .preview-content {
      max-height: 60vh;
      overflow: auto;

      pre {
        white-space: pre-wrap;
        word-break: break-all;
        font-size: 13px;
        line-height: 1.5;
        padding: 12px;
        background: #f5f7fa;
        border-radius: 4px;
      }
    }
  }

  .process-designer-container .djs-container {
    outline: none !important;

    svg:focus {
      outline: none !important;
    }
  }

  .el-dialog.is-fullscreen {
    .el-dialog__body {
      padding: 0 !important;
      height: calc(100vh - 48px);
      overflow: hidden;
    }
  }
</style>
