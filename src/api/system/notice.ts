import request from '@/utils/http'

export function fetchNoticeList(params: Api.SystemManage.NoticeSearchParams) {
  return request.get<{ rows: Api.SystemManage.NoticeItem[]; total: number }>({
    url: '/api/system/notice/list',
    params
  })
}

export function fetchNotice(noticeId: number) {
  return request.get<{ data: Api.SystemManage.NoticeItem }>({
    url: `/api/system/notice/${noticeId}`
  })
}

export function fetchAddNotice(data: Api.SystemManage.NoticeFormData) {
  return request.post<void>({
    url: '/api/system/notice',
    data
  })
}

export function fetchUpdateNotice(data: Api.SystemManage.NoticeFormData) {
  return request.put<void>({
    url: '/api/system/notice',
    data
  })
}

export function fetchDeleteNotice(noticeId: string) {
  return request.del<void>({
    url: `/api/system/notice/${noticeId}`
  })
}

export function fetchNoticeTop() {
  return request.get<{ data: Api.SystemManage.NoticeItem[] }>({
    url: '/api/system/notice/listTop'
  })
}

export function fetchMarkNoticeRead(noticeId: number) {
  return request.post<void>({
    url: '/api/system/notice/markRead',
    params: { noticeId }
  })
}

export function fetchMarkNoticeReadAll(ids: string) {
  return request.post<void>({
    url: '/api/system/notice/markReadAll',
    params: { ids }
  })
}

export function fetchNoticeReadUsers(params: {
  pageNum: number
  pageSize: number
  noticeId: number
  searchValue?: string
}) {
  return request.get<{ rows: Api.SystemManage.NoticeReadUserItem[]; total: number }>({
    url: '/api/system/notice/readUsers/list',
    params
  })
}
