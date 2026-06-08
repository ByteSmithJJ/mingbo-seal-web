import request from '@/utils/http'

export interface ProcessDefinition {
  definitionId?: number
  definitionName: string
  definitionKey: string
  bpmnXml?: string
  formTemplateId?: number | null
  deploymentId?: string
  version?: number
  status?: string
  createTime?: string
  updateTime?: string
  remark?: string
}

export function fetchProcessDefinitionList(params: Record<string, any>) {
  return request.get<any>({
    url: '/process/definition/list',
    params
  })
}

export function fetchProcessDefinitionDetail(id: number) {
  return request.get<any>({
    url: `/process/definition/${id}`
  })
}

export function createProcessDefinition(data: ProcessDefinition) {
  return request.post<any>({
    url: '/process/definition',
    data
  })
}

export function updateProcessDefinition(data: ProcessDefinition) {
  return request.put<any>({
    url: '/process/definition',
    data
  })
}

export function deleteProcessDefinition(ids: string) {
  return request.del<any>({
    url: `/process/definition/${ids}`
  })
}

export function deployProcessDefinition(id: number) {
  return request.post<any>({
    url: `/process/definition/deploy/${id}`
  })
}

export function changeProcessDefinitionStatus(data: { definitionId: number; status: string }) {
  return request.put<any>({
    url: '/process/definition/changeStatus',
    data
  })
}

// ==================== 申请与审批 ====================

export interface ProcessInstance {
  instanceId: number
  definitionId: number
  definitionName: string
  formTemplateId: number | null
  procInstId: string
  businessNo: string
  title: string
  status: string
  currentNodeCode: string
  currentNodeName: string
  applicant: string
  applicantDeptId: number | null
  applyTime: string
  completeTime: string | null
  createTime: string
}

export interface ApprovalRecord {
  recordId: number
  instanceId: number
  taskId: string
  nodeCode: string
  nodeName: string
  approver: string
  result: string
  comment: string
  approveTime: string
  costDuration: number
  createTime: string
}

export interface SealRecord {
  sealRecordId: number
  instanceId: number
  approvalRecordId: number
  sealId: number
  positionId: number
  sealer: string
  sealTime: string
  sealName: string
  sealImage: string
  posX: number
  posY: number
  sealWidth: number
  sealHeight: number
}

export interface PendingTask {
  taskId: string
  taskName: string
  instanceId: number
  businessNo: string
  title: string
  applicant: string
  applyTime: string
}

export function startProcessInstance(data: {
  definitionId: number
  title: string
  formData: string
}) {
  return request.post<any>({ url: '/process/instance/start', data })
}

export function fetchMyApplicationList(params: Record<string, any>) {
  return request.get<any>({ url: '/process/instance/myList', params })
}

export function fetchInstanceDetail(instanceId: number) {
  return request.get<any>({ url: `/process/instance/${instanceId}` })
}

export function withdrawInstance(instanceId: number) {
  return request.put<any>({ url: `/process/instance/${instanceId}/withdraw` })
}

export function fetchPendingTaskList(params: Record<string, any>) {
  return request.get<any>({ url: '/process/task/pending', params })
}

export function approveTask(taskId: string, data: { comment: string }) {
  return request.put<any>({ url: `/process/task/${taskId}/approve`, data })
}

export function rejectTask(taskId: string, data: { comment: string }) {
  return request.put<any>({ url: `/process/task/${taskId}/reject`, data })
}

export function returnTask(taskId: string, data: { comment: string }) {
  return request.put<any>({ url: `/process/task/${taskId}/return`, data })
}

export function fetchApprovedTaskList(params: Record<string, any>) {
  return request.get<any>({ url: '/process/task/approved', params })
}

export function fetchBpmnNodesByTemplate(templateId: number) {
  return request.get<any>({ url: `/process/definition/nodesByTemplate/${templateId}` })
}

// ==================== 统计 ====================

export interface TrendItem {
  day: string   // 日期，如 "2026-06-02"
  count: number // 当天申请数量
}

export function fetchInstanceTrend() {
  return request.get<TrendItem[]>({ url: '/process/instance/trend' })
}
