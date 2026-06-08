import BpmnModeler from 'bpmn-js/lib/Modeler'

const defaultEmptyDiagram = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:flowable="http://flowable.org/bpmn"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
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

export function createModeler(container: HTMLElement): BpmnModeler {
  return new BpmnModeler({ container })
}

export async function importXml(modeler: BpmnModeler, xml: string): Promise<void> {
  try {
    await modeler.importXML(xml)
  } catch {
    // 导入失败时加载空白模板
    await modeler.importXML(defaultEmptyDiagram)
  }
}

export async function exportXml(modeler: BpmnModeler): Promise<string> {
  const { xml } = await modeler.saveXML({ format: true })
  return xml ?? defaultEmptyDiagram
}

export function destroyModeler(modeler: BpmnModeler): void {
  modeler.destroy()
}

export { defaultEmptyDiagram }
