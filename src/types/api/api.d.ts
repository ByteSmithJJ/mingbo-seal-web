/**
 * API 接口类型定义模块
 *
 * 提供所有后端接口的类型定义
 *
 * ## 主要功能
 *
 * - 通用类型（分页参数、响应结构等）
 * - 认证类型（登录、用户信息等）
 * - 系统管理类型（用户、角色等）
 * - 全局命名空间声明
 *
 * ## 使用场景
 *
 * - API 请求参数类型约束
 * - API 响应数据类型定义
 * - 接口文档类型同步
 *
 * ## 注意事项
 *
 * - 在 .vue 文件使用需要在 eslint.config.mjs 中配置 globals: { Api: 'readonly' }
 * - 使用全局命名空间，无需导入即可使用
 *
 * ## 使用方式
 *
 * ```typescript
 * const params: Api.Auth.LoginParams = { userName: 'admin', password: '123456' }
 * const response: Api.Auth.UserInfo = await fetchUserInfo()
 * ```
 *
 * @module types/api/api
 * @author Art Design Pro Team
 */

declare namespace Api {
  /** 通用类型 */
  namespace Common {
    /** 分页参数 */
    interface PaginationParams {
      /** 当前页码 */
      current: number
      /** 每页条数 */
      size: number
      /** 总条数 */
      total: number
    }

    /** 通用搜索参数 */
    type CommonSearchParams = Pick<PaginationParams, 'current' | 'size'>

    /** 分页响应基础结构 */
    interface PaginatedResponse<T = any> {
      records: T[]
      current: number
      size: number
      total: number
    }

    /** 启用状态 */
    type EnableStatus = '1' | '2'
  }

  /** 认证类型 */
  namespace Auth {
    /** 登录参数 */
    interface LoginParams {
      username: string
      password: string
      code?: string
      uuid?: string
    }

    /** 登录响应 */
    interface LoginResponse {
      token: string
      refreshToken: string
    }

    /** 用户信息 */
    interface UserInfo {
      buttons: string[]
      roles: string[]
      userId: number
      userName: string
      email: string
      avatar?: string
    }
  }

  /** 个人中心 / 用户资料 */
  namespace Profile {
    /** 个人信息（GET /system/user/profile 返回） */
    interface UserProfile {
      userId: number
      userName: string
      nickName: string
      email: string
      phonenumber: string
      sex: string
      avatar: string
      status: string
      loginIp: string
      loginDate: string
      pwdUpdateDate: string
      createTime: string
      updateTime: string
      remark: string
      dept?: {
        deptId: number
        deptName: string
      }
      roles?: {
        roleId: number
        roleName: string
        roleKey: string
      }[]
      roleGroup?: string
      postGroup?: string
    }

    /** 修改个人信息参数 */
    interface UpdateProfileParams {
      nickName: string
      email: string
      phonenumber: string
      sex: string
    }

    /** 修改密码参数 */
    interface UpdatePwdParams {
      oldPassword: string
      newPassword: string
    }
  }

  /** 系统管理类型 */
  namespace SystemManage {
    // ==================== 用户管理 ====================

    /** 用户列表（RuoYi TableDataInfo 格式） */
    interface UserList {
      rows: UserListItem[]
      total: number
      code: number
      msg: string
    }

    /** 用户列表项（对应 RuoYi SysUser） */
    interface UserListItem {
      userId: number
      userName: string
      nickName: string
      email: string
      phonenumber: string
      sex: string
      avatar: string
      status: string
      delFlag: string
      loginIp: string
      loginDate: string
      createBy: string
      createTime: string
      updateBy: string
      updateTime: string
      remark: string
      dept?: {
        deptId: number
        deptName: string
      }
      roles?: RoleSimple[]
      roleIds?: number[]
      postIds?: number[]
    }

    /** 角色简要信息 */
    interface RoleSimple {
      roleId: number
      roleName: string
      roleKey: string
      status: string
    }

    /** 用户搜索参数（对接 /system/user/list） */
    interface UserSearchParams {
      pageNum?: number
      pageSize?: number
      userName?: string
      phonenumber?: string
      status?: string
      deptId?: number
      params?: {
        beginTime?: string
        endTime?: string
      }
    }

    /** 新增/编辑用户参数（对接 /system/user POST/PUT） */
    interface UserFormData {
      userId?: number
      userName: string
      nickName: string
      password?: string
      sex: '0' | '1' | '2'
      email?: string
      phonenumber?: string
      avatar?: string
      status: '0' | '1'
      deptId?: number
      roleIds?: number[]
      postIds?: number[]
      remark?: string
    }

    /** 用户角色分配参数 */
    interface UserAuthRoleParams {
      userId: number
      roleIds: number[]
    }

    /** 重置密码参数 */
    interface ResetPwdParams {
      userId: number
      password: string
    }

    /** 修改状态参数 */
    interface ChangeStatusParams {
      userId: number
      status: string
    }

    /** 部门树节点 */
    interface DeptTreeNode {
      id: number
      label: string
      children?: DeptTreeNode[]
    }

    // ==================== 角色管理 ====================

    /** 角色列表 */
    type RoleList = Api.Common.PaginatedResponse<RoleListItem>

    /** 角色列表项（匹配 RuoYi 后端字段） */
    interface RoleListItem {
      roleId: number
      roleName: string
      roleKey: string
      roleSort?: number
      status: string
      dataScope?: string
      description?: string
      createTime: string
      remark?: string
    }

    /** 角色搜索参数 */
    type RoleSearchParams = Partial<
      Pick<RoleListItem, 'roleId' | 'roleName' | 'roleKey' | 'description' | 'status'> &
        Api.Common.CommonSearchParams & {
          startTime: string | null
          endTime: string | null
        }
    >

    /** 角色表单数据 */
    interface RoleFormData {
      roleId?: number
      roleName: string
      roleKey: string
      roleSort: number
      status: string
      dataScope?: string
      description?: string
      menuIds?: number[]
      deptIds?: number[]
      menuCheckStrictly?: boolean
      deptCheckStrictly?: boolean
      remark?: string
    }

    /** 角色搜索参数（RuoYi 格式） */
    interface RoleSearchParamsRuoYi {
      pageNum?: number
      pageSize?: number
      roleName?: string
      roleCode?: string
      status?: string
      beginTime?: string
      endTime?: string
    }

    // ==================== 菜单管理 ====================

    /** 菜单列表项 */
    interface MenuItem {
      menuId: number
      menuName: string
      parentId: number
      orderNum: number
      path: string
      component: string
      query: string
      routeName: string
      isFrame: string
      isCache: string
      menuType: string
      visible: string
      status: string
      perms: string
      icon: string
      createBy: string
      createTime: string
      updateBy: string
      updateTime: string
      remark: string
      children?: MenuItem[]
    }

    /** 菜单表单数据 */
    interface MenuFormData {
      menuId?: number
      parentId: number
      menuName: string
      icon?: string
      menuType: string
      orderNum: number
      isFrame: string
      isCache: string
      visible: string
      status: string
      path?: string
      component?: string
      query?: string
      routeName?: string
      perms?: string
      remark?: string
    }

    // ==================== 部门管理 ====================

    /** 部门列表项 */
    interface DeptItem {
      deptId: number
      parentId: number
      ancestors: string
      deptName: string
      orderNum: number
      leader: string
      phone: string
      email: string
      status: string
      delFlag: string
      createBy: string
      createTime: string
      updateBy: string
      updateTime: string
      children?: DeptItem[]
    }

    /** 部门表单数据 */
    interface DeptFormData {
      deptId?: number
      parentId?: number
      deptName: string
      orderNum: number
      leader?: string
      phone?: string
      email?: string
      status: string
    }

    /** 部门搜索参数 */
    interface DeptSearchParams {
      deptName?: string
      status?: string
    }

    // ==================== 岗位管理 ====================

    /** 岗位列表项 */
    interface PostItem {
      postId: number
      postCode: string
      postName: string
      postSort: number
      status: string
      createBy: string
      createTime: string
      updateBy: string
      updateTime: string
      remark: string
    }

    /** 岗位表单数据 */
    interface PostFormData {
      postId?: number
      postCode: string
      postName: string
      postSort: number
      status: string
      remark?: string
    }

    /** 岗位搜索参数 */
    interface PostSearchParams {
      pageNum?: number
      pageSize?: number
      postCode?: string
      postName?: string
      status?: string
    }

    // ==================== 参数配置 ====================

    /** 参数配置列表项 */
    interface ConfigItem {
      configId: number
      configName: string
      configKey: string
      configValue: string
      configType: string
      createBy: string
      createTime: string
      updateBy: string
      updateTime: string
      remark: string
    }

    /** 参数配置表单数据 */
    interface ConfigFormData {
      configId?: number
      configName: string
      configKey: string
      configValue: string
      configType: string
      remark?: string
    }

    /** 参数配置搜索参数 */
    interface ConfigSearchParams {
      pageNum?: number
      pageSize?: number
      configName?: string
      configKey?: string
      configType?: string
      params?: {
        beginTime?: string
        endTime?: string
      }
    }

    // ==================== 字典管理 ====================

    /** 字典类型列表项 */
    interface DictTypeItem {
      dictId: number
      dictName: string
      dictType: string
      status: string
      createBy: string
      createTime: string
      updateBy: string
      updateTime: string
      remark: string
    }

    /** 字典类型表单数据 */
    interface DictTypeFormData {
      dictId?: number
      dictName: string
      dictType: string
      status: string
      remark?: string
    }

    /** 字典类型搜索参数 */
    interface DictTypeSearchParams {
      pageNum?: number
      pageSize?: number
      dictName?: string
      dictType?: string
      status?: string
      params?: {
        beginTime?: string
        endTime?: string
      }
    }

    /** 字典数据列表项 */
    interface DictDataItem {
      dictCode: number
      dictSort: number
      dictLabel: string
      dictValue: string
      dictType: string
      cssClass: string
      listClass: string
      isDefault: string
      status: string
      createBy: string
      createTime: string
      updateBy: string
      updateTime: string
      remark: string
    }

    /** 字典数据表单数据 */
    interface DictDataFormData {
      dictCode?: number
      dictSort: number
      dictLabel: string
      dictValue: string
      dictType: string
      cssClass?: string
      listClass?: string
      isDefault?: string
      status: string
      remark?: string
    }

    /** 字典数据搜索参数 */
    interface DictDataSearchParams {
      pageNum?: number
      pageSize?: number
      dictType?: string
      dictLabel?: string
      status?: string
    }

    // ==================== 通知公告 ====================

    /** 通知公告列表项 */
    interface NoticeItem {
      noticeId: number
      noticeTitle: string
      noticeType: string
      noticeContent: string
      status: string
      createBy: string
      createTime: string
      updateBy: string
      updateTime: string
      remark: string
    }

    /** 通知公告表单数据 */
    interface NoticeFormData {
      noticeId?: number
      noticeTitle: string
      noticeType: string
      noticeContent: string
      status: string
    }

    /** 通知公告搜索参数 */
    interface NoticeSearchParams {
      pageNum?: number
      pageSize?: number
      noticeTitle?: string
      noticeType?: string
      createBy?: string
      status?: string
    }

    /** 已读用户列表项 */
    interface NoticeReadUserItem {
      userId: number
      userName: string
      nickName: string
      deptName: string
      phonenumber: string
      readTime: string
    }
  }

  /** 监控管理类型 */
  namespace Monitor {
    // ==================== 操作日志 ====================

    /** 操作日志列表项 */
    interface OperLogItem {
      operId: number
      title: string
      businessType: number
      method: string
      requestMethod: string
      operatorType: number
      operName: string
      deptName: string
      operUrl: string
      operIp: string
      operLocation: string
      operParam: string
      jsonResult: string
      status: number
      errorMsg: string
      operTime: string
      costTime: number
    }

    /** 操作日志搜索参数 */
    interface OperLogSearchParams {
      pageNum?: number
      pageSize?: number
      title?: string
      businessType?: number
      status?: number
      operName?: string
      params?: {
        beginTime?: string
        endTime?: string
      }
    }

    // ==================== 登录日志 ====================

    /** 登录日志列表项 */
    interface LogininforItem {
      infoId: number
      userName: string
      status: string
      ipaddr: string
      loginLocation: string
      browser: string
      os: string
      msg: string
      loginTime: string
    }

    /** 登录日志搜索参数 */
    interface LogininforSearchParams {
      pageNum?: number
      pageSize?: number
      userName?: string
      status?: number
      ipaddr?: string
      params?: {
        beginTime?: string
        endTime?: string
      }
    }

    // ==================== 在线用户 ====================

    /** 在线用户列表项 */
    interface OnlineItem {
      tokenId: string
      userName: string
      deptName: string
      ipaddr: string
      loginLocation: string
      browser: string
      os: string
      loginTime: number
    }

    /** 在线用户搜索参数 */
    interface OnlineSearchParams {
      pageNum?: number
      pageSize?: number
      ipaddr?: string
      userName?: string
    }

    // ==================== 定时任务 ====================

    /** 定时任务列表项 */
    interface JobItem {
      jobId: number
      jobName: string
      jobGroup: string
      invokeTarget: string
      cronExpression: string
      misfirePolicy: string
      concurrent: string
      status: string
      createBy: string
      createTime: string
      updateBy: string
      updateTime: string
      remark: string
      nextValidTime?: string
    }

    /** 定时任务搜索参数 */
    interface JobSearchParams {
      pageNum?: number
      pageSize?: number
      jobName?: string
      jobGroup?: string
      status?: string
    }

    /** 定时任务表单数据 */
    interface JobFormData {
      jobId?: number
      jobName: string
      jobGroup: string
      invokeTarget: string
      cronExpression: string
      misfirePolicy: string
      concurrent: string
      status: string
    }

    /** 调度日志列表项 */
    interface JobLogItem {
      jobLogId: number
      jobName: string
      jobGroup: string
      invokeTarget: string
      jobMessage: string
      status: string
      exceptionInfo: string
      startTime: string
      endTime: string
      createTime: string
    }

    // ==================== 服务监控 ====================

    /** 服务监控 - CPU 信息 */
    interface ServerCpu {
      cpuNum: number
      used: number
      sys: number
      free: number
    }

    /** 服务监控 - 内存信息 */
    interface ServerMem {
      total: number
      used: number
      free: number
      usage: number
    }

    /** 服务监控 - JVM 信息 */
    interface ServerJvm {
      total: number
      used: number
      free: number
      usage: number
      name: string
      version: string
      startTime: string
      runTime: string
      home: string
      inputArgs: string
    }

    /** 服务监控 - 系统信息 */
    interface ServerSys {
      computerName: string
      osName: string
      computerIp: string
      osArch: string
      userDir: string
    }

    /** 服务监控 - 磁盘信息 */
    interface ServerSysFile {
      dirName: string
      sysTypeName: string
      typeName: string
      total: string
      free: string
      used: string
      usage: number
    }

    /** 服务监控数据 */
    interface ServerData {
      cpu?: ServerCpu
      mem?: ServerMem
      jvm?: ServerJvm
      sys?: ServerSys
      sysFiles?: ServerSysFile[]
    }

    // ==================== 缓存监控 ====================

    /** 缓存监控 - Redis 基本信息 */
    interface CacheInfo {
      redis_version: string
      redis_mode: string
      tcp_port: string
      connected_clients: string
      uptime_in_days: string
      used_memory_human: string
      used_cpu_user_children: string
      maxmemory_human: string
      aof_enabled: string
      rdb_last_bgsave_status: string
      instantaneous_input_kbps: string
      instantaneous_output_kbps: string
    }

    /** 缓存监控 - 命令统计 */
    interface CommandStat {
      name: string
      value: number
    }

    /** 缓存监控数据 */
    interface CacheData {
      info?: CacheInfo
      commandStats?: CommandStat[]
      dbSize?: number
    }

    /** 缓存列表 - 缓存名称项 */
    interface CacheNameItem {
      cacheName: string
      remark: string
    }

    /** 缓存内容 */
    interface CacheValueData {
      cacheName: string
      cacheKey: string
      cacheValue: string
    }

    /** 调度日志搜索参数 */
    interface JobLogSearchParams {
      pageNum?: number
      pageSize?: number
      jobName?: string
      jobGroup?: string
      status?: string
      params?: {
        beginTime?: string
        endTime?: string
      }
    }
  }
}
