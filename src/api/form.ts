import request from '@/utils/http'

export interface FormTemplate {
  templateId?: number
  templateName: string
  templateKey: string
  formConfig: string
  version?: number
  status: string
  delFlag?: string
  createBy?: string
  createTime?: string
  updateBy?: string
  updateTime?: string
  remark?: string
}

export function fetchTemplateList(params: Record<string, any>) {
  return request.get<any>({ url: '/form/template/list', params })
}

export function fetchTemplateDetail(templateId: number) {
  return request.get<any>({ url: `/form/template/${templateId}` })
}

export function createTemplate(data: FormTemplate) {
  return request.post<any>({ url: '/form/template', data })
}

export function updateTemplate(data: FormTemplate) {
  return request.put<any>({ url: '/form/template', data })
}

export function deleteTemplate(templateIds: string) {
  return request.del<any>({ url: `/form/template/${templateIds}` })
}
