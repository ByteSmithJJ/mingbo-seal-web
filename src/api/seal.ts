import request from '@/utils/http'

// ==================== 印章信息 ====================

export interface SealInfo {
  sealId?: number
  sealName: string
  sealCode: string
  sealType: string
  sealImage: string
  status: string
  createBy?: string
  createTime?: string
  updateBy?: string
  updateTime?: string
  remark?: string
  params?: Record<string, any>
}

export function fetchSealList(params: Record<string, any>) {
  return request.get<any>({
    url: '/seal/info/list',
    params
  })
}

export function fetchSealDetail(sealId: number) {
  return request.get<any>({
    url: `/seal/info/${sealId}`
  })
}

export function createSeal(data: SealInfo) {
  return request.post<any>({
    url: '/seal/info',
    data
  })
}

export function updateSeal(data: SealInfo) {
  return request.put<any>({
    url: '/seal/info',
    data
  })
}

export function deleteSeal(sealIds: string) {
  return request.del<any>({
    url: `/seal/info/${sealIds}`
  })
}

// ==================== 印章授权 ====================

export interface SealAuthorization {
  authId?: number
  sealId?: number
  targetType: string
  targetId?: number
  authType: string
  beginTime?: string
  endTime?: string
  status: string
  sealName?: string
  createBy?: string
  createTime?: string
  updateBy?: string
  updateTime?: string
  remark?: string
  params?: Record<string, any>
}

export function fetchAuthorizationList(params: Record<string, any>) {
  return request.get<any>({
    url: '/seal/authorization/list',
    params
  })
}

export function fetchAuthorizationDetail(authId: number) {
  return request.get<any>({
    url: `/seal/authorization/${authId}`
  })
}

export function createAuthorization(data: SealAuthorization) {
  return request.post<any>({
    url: '/seal/authorization',
    data
  })
}

export function updateAuthorization(data: SealAuthorization) {
  return request.put<any>({
    url: '/seal/authorization',
    data
  })
}

export function deleteAuthorization(authIds: string) {
  return request.del<any>({
    url: `/seal/authorization/${authIds}`
  })
}

// ==================== 印章位置配置 ====================

export interface SealPosition {
  positionId?: number
  sealId?: number
  formTemplateId?: number
  positionName: string
  posX: number
  posY: number
  sealWidth: number
  sealHeight: number
  pageNo: number
  sort: number
  nodeCode?: string
  sealName?: string
  templateName?: string
  createBy?: string
  createTime?: string
  updateBy?: string
  updateTime?: string
  remark?: string
  params?: Record<string, any>
}

export function fetchPositionList(params: Record<string, any>) {
  return request.get<any>({
    url: '/seal/position/list',
    params
  })
}

export function fetchPositionDetail(positionId: number) {
  return request.get<any>({
    url: `/seal/position/${positionId}`
  })
}

export function createPosition(data: SealPosition) {
  return request.post<any>({
    url: '/seal/position',
    data
  })
}

export function updatePosition(data: SealPosition) {
  return request.put<any>({
    url: '/seal/position',
    data
  })
}

export function deletePosition(positionIds: string) {
  return request.del<any>({
    url: `/seal/position/${positionIds}`
  })
}
