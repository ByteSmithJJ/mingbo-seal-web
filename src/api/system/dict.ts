import request from '@/utils/http'

// ==================== 字典类型 ====================

export function fetchDictTypeList(params: Api.SystemManage.DictTypeSearchParams) {
  return request.get<{ rows: Api.SystemManage.DictTypeItem[]; total: number }>({
    url: '/api/system/dict/type/list',
    params
  })
}

export function fetchDictType(dictId: number) {
  return request.get<{ data: Api.SystemManage.DictTypeItem }>({
    url: `/api/system/dict/type/${dictId}`
  })
}

export function fetchAddDictType(data: Api.SystemManage.DictTypeFormData) {
  return request.post<void>({
    url: '/api/system/dict/type',
    data
  })
}

export function fetchUpdateDictType(data: Api.SystemManage.DictTypeFormData) {
  return request.put<void>({
    url: '/api/system/dict/type',
    data
  })
}

export function fetchDeleteDictType(dictId: string) {
  return request.del<void>({
    url: `/api/system/dict/type/${dictId}`
  })
}

export function fetchRefreshDictCache() {
  return request.del<void>({
    url: '/api/system/dict/type/refreshCache'
  })
}

export function fetchDictTypeOptionselect() {
  return request.get<{ data: Api.SystemManage.DictTypeItem[] }>({
    url: '/api/system/dict/type/optionselect'
  })
}

export function fetchDictTypeExport(data: Api.SystemManage.DictTypeSearchParams) {
  return request.post<Blob>({
    url: '/api/system/dict/type/export',
    data,
    responseType: 'blob'
  })
}

// ==================== 字典数据 ====================

export function fetchDictDataList(params: Api.SystemManage.DictDataSearchParams) {
  return request.get<{ rows: Api.SystemManage.DictDataItem[]; total: number }>({
    url: '/api/system/dict/data/list',
    params
  })
}

export function fetchDictData(dictCode: number) {
  return request.get<{ data: Api.SystemManage.DictDataItem }>({
    url: `/api/system/dict/data/${dictCode}`
  })
}

export function fetchDictDataByType(dictType: string) {
  return request.get<{ data: Api.SystemManage.DictDataItem[] }>({
    url: `/api/system/dict/data/type/${dictType}`
  })
}

export function fetchAddDictData(data: Api.SystemManage.DictDataFormData) {
  return request.post<void>({
    url: '/api/system/dict/data',
    data
  })
}

export function fetchUpdateDictData(data: Api.SystemManage.DictDataFormData) {
  return request.put<void>({
    url: '/api/system/dict/data',
    data
  })
}

export function fetchDeleteDictData(dictCode: string) {
  return request.del<void>({
    url: `/api/system/dict/data/${dictCode}`
  })
}
