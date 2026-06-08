import request from '@/utils/http'

// ==================== 操作日志 ====================

export function fetchOperLogList(params: Api.Monitor.OperLogSearchParams) {
  return request.get<{ rows: Api.Monitor.OperLogItem[]; total: number }>({
    url: '/api/monitor/operlog/list',
    params
  })
}

export function fetchDeleteOperLog(operIds: string) {
  return request.del<void>({
    url: `/api/monitor/operlog/${operIds}`
  })
}

export function fetchCleanOperLog() {
  return request.del<void>({
    url: '/api/monitor/operlog/clean'
  })
}

// ==================== 登录日志 ====================

export function fetchLogininforList(params: Api.Monitor.LogininforSearchParams) {
  return request.get<{ rows: Api.Monitor.LogininforItem[]; total: number }>({
    url: '/api/monitor/logininfor/list',
    params
  })
}

export function fetchDeleteLogininfor(infoIds: string) {
  return request.del<void>({
    url: `/api/monitor/logininfor/${infoIds}`
  })
}

export function fetchCleanLogininfor() {
  return request.del<void>({
    url: '/api/monitor/logininfor/clean'
  })
}

export function fetchUnlockLoginUser(userName: string) {
  return request.get<void>({
    url: `/api/monitor/logininfor/unlock/${userName}`
  })
}

// ==================== 在线用户 ====================

export function fetchOnlineList(params: Api.Monitor.OnlineSearchParams) {
  return request.get<{ rows: Api.Monitor.OnlineItem[]; total: number }>({
    url: '/api/monitor/online/list',
    params
  })
}

export function fetchForceLogout(tokenId: string) {
  return request.del<void>({
    url: `/api/monitor/online/${tokenId}`
  })
}

// ==================== 定时任务 ====================

export function fetchJobList(params: Api.Monitor.JobSearchParams) {
  return request.get<{ rows: Api.Monitor.JobItem[]; total: number }>({
    url: '/api/monitor/job/list',
    params
  })
}

export function fetchJob(jobId: number) {
  return request.get<{ data: Api.Monitor.JobItem }>({
    url: `/api/monitor/job/${jobId}`
  })
}

export function addJob(data: Api.Monitor.JobFormData) {
  return request.post<void>({
    url: '/api/monitor/job',
    data
  })
}

export function updateJob(data: Api.Monitor.JobFormData) {
  return request.put<void>({
    url: '/api/monitor/job',
    data
  })
}

export function changeJobStatus(jobId: number, status: string) {
  return request.put<void>({
    url: '/api/monitor/job/changeStatus',
    data: { jobId, status }
  })
}

export function runJob(data: { jobId: number; jobGroup: string }) {
  return request.put<void>({
    url: '/api/monitor/job/run',
    data
  })
}

export function deleteJob(jobIds: string) {
  return request.del<void>({
    url: `/api/monitor/job/${jobIds}`
  })
}

// ==================== 调度日志 ====================

export function fetchJobLogList(params: Api.Monitor.JobLogSearchParams) {
  return request.get<{ rows: Api.Monitor.JobLogItem[]; total: number }>({
    url: '/api/monitor/jobLog/list',
    params
  })
}

export function fetchJobLog(jobLogId: number) {
  return request.get<{ data: Api.Monitor.JobLogItem }>({
    url: `/api/monitor/jobLog/${jobLogId}`
  })
}

export function deleteJobLog(jobLogIds: string) {
  return request.del<void>({
    url: `/api/monitor/jobLog/${jobLogIds}`
  })
}

export function cleanJobLog() {
  return request.del<void>({
    url: '/api/monitor/jobLog/clean'
  })
}

// ==================== 服务监控 ====================

export function fetchServer() {
  return request.get<Api.Monitor.ServerData>({
    url: '/api/monitor/server'
  })
}

// ==================== 缓存监控 ====================

export function fetchCache() {
  return request.get<Api.Monitor.CacheData>({
    url: '/api/monitor/cache'
  })
}

export function fetchCacheNames() {
  return request.get<Api.Monitor.CacheNameItem[]>({
    url: '/api/monitor/cache/getNames'
  })
}

export function fetchCacheKeys(cacheName: string) {
  return request.get<string[]>({
    url: `/api/monitor/cache/getKeys/${cacheName}`
  })
}

export function fetchCacheValue(cacheName: string, cacheKey: string) {
  return request.get<Api.Monitor.CacheValueData>({
    url: `/api/monitor/cache/getValue/${cacheName}/${cacheKey}`
  })
}

export function delCacheName(cacheName: string) {
  return request.del<void>({
    url: `/api/monitor/cache/clearCacheName/${cacheName}`
  })
}

export function delCacheKey(cacheKey: string) {
  return request.del<void>({
    url: `/api/monitor/cache/clearCacheKey/${cacheKey}`
  })
}

export function delCacheAll() {
  return request.del<void>({
    url: '/api/monitor/cache/clearCacheAll'
  })
}
