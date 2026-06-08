import request from '@/utils/http'

export function fetchConfigList(params: Api.SystemManage.ConfigSearchParams) {
  return request.get<{ rows: Api.SystemManage.ConfigItem[]; total: number }>({
    url: '/api/system/config/list',
    params
  })
}

export function fetchConfig(configId: number) {
  return request.get<{ data: Api.SystemManage.ConfigItem }>({
    url: `/api/system/config/${configId}`
  })
}

export function fetchConfigByKey(configKey: string) {
  return request.get<{ data: Api.SystemManage.ConfigItem }>({
    url: `/api/system/config/configKey/${configKey}`
  })
}

export function fetchAddConfig(data: Api.SystemManage.ConfigFormData) {
  return request.post<void>({
    url: '/api/system/config',
    data
  })
}

export function fetchUpdateConfig(data: Api.SystemManage.ConfigFormData) {
  return request.put<void>({
    url: '/api/system/config',
    data
  })
}

export function fetchDeleteConfig(configId: string) {
  return request.del<void>({
    url: `/api/system/config/${configId}`
  })
}

export function fetchRefreshConfigCache() {
  return request.del<void>({
    url: '/api/system/config/refreshCache'
  })
}

export function fetchConfigExport(data: Api.SystemManage.ConfigSearchParams) {
  return request.post<Blob>({
    url: '/api/system/config/export',
    data,
    responseType: 'blob'
  })
}
