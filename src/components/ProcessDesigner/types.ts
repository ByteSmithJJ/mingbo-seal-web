export interface DesignerData {
  definitionId?: number | string
  definitionName: string
  definitionKey?: string
  bpmnXml?: string
  formTemplateId?: number | null
}

export interface SavePayload {
  xml: string
  formTemplateId: number | null
  saveAsNewVersion: boolean
}

export interface TemplateOption {
  templateId: number
  templateName: string
  version?: number
}
