/**
 * 快速入口配置
 * 包含：应用列表、快速链接等配置
 */
import type { FastEnterConfig } from '@/types/config'

const fastEnterConfig: FastEnterConfig = {
  // 显示条件（屏幕宽度）
  minWidth: 1200,
  // 应用列表
  applications: [
    {
      name: '工作台',
      description: '系统概览与数据统计',
      icon: 'ri:home-smile-2-line',
      iconColor: '#377dff',
      enabled: true,
      order: 1,
      routeName: '/dashboard/console'
    },
    {
      name: '发起申请',
      description: '选择流程并发起审批',
      icon: 'ri:file-add-line',
      iconColor: '#409eff',
      enabled: true,
      order: 2,
      routeName: '/process/start'
    },
    {
      name: '待审批',
      description: '处理待审批任务',
      icon: 'ri:task-line',
      iconColor: '#e6a23c',
      enabled: true,
      order: 3,
      routeName: '/process/pending'
    },
    {
      name: '我的申请',
      description: '查看我发起的流程',
      icon: 'ri:draft-line',
      iconColor: '#67c23a',
      enabled: true,
      order: 4,
      routeName: '/process/my-applications'
    },
    {
      name: '已审批',
      description: '查看已处理的审批',
      icon: 'ri:checkbox-circle-line',
      iconColor: '#10b981',
      enabled: true,
      order: 5,
      routeName: '/process/approved'
    },
    {
      name: '流程定义',
      description: '设计与管理审批流程',
      icon: 'ri:flow-chart',
      iconColor: '#a855f7',
      enabled: true,
      order: 6,
      routeName: '/process/definition'
    },
    {
      name: '印章管理',
      description: '管理印章信息与授权',
      icon: 'ri:seedling-line',
      iconColor: '#f56c6c',
      enabled: true,
      order: 7,
      routeName: '/seal/info'
    },
    {
      name: '表单模板',
      description: '设计与维护审批表单',
      icon: 'ri:file-text-line',
      iconColor: '#38C0FC',
      enabled: true,
      order: 8,
      routeName: '/form/template'
    }
  ],
  // 快速链接
  quickLinks: [
    {
      name: '发起申请',
      enabled: true,
      order: 1,
      routeName: '/process/start'
    },
    {
      name: '待审批',
      enabled: true,
      order: 2,
      routeName: '/process/pending'
    },
    {
      name: '流程定义',
      enabled: true,
      order: 3,
      routeName: '/process/definition'
    },
    {
      name: '印章位置配置',
      enabled: true,
      order: 4,
      routeName: '/seal/position'
    }
  ]
}

export default Object.freeze(fastEnterConfig)
