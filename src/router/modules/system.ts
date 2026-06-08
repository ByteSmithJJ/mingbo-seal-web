import { AppRouteRecord } from '@/types/router'

export const systemRoutes: AppRouteRecord = {
  path: '/system',
  name: 'System',
  component: '/index/index',
  meta: {
    title: 'menus.system.title',
    icon: 'ri:settings-3-line',
    roles: ['admin']
  },
  children: [
    {
      path: 'user',
      name: 'User',
      component: '/system/user',
      meta: {
        title: 'menus.system.user',
        icon: 'ri:user-line',
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'role',
      name: 'Role',
      component: '/system/role',
      meta: {
        title: 'menus.system.role',
        icon: 'ri:user-settings-line',
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'menu',
      name: 'Menu',
      component: '/system/menu',
      meta: {
        title: 'menus.system.menu',
        icon: 'ri:menu-line',
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'dept',
      name: 'Dept',
      component: '/system/dept',
      meta: {
        title: 'menus.system.dept',
        icon: 'ri:organization-chart',
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'post',
      name: 'Post',
      component: '/system/post',
      meta: {
        title: 'menus.system.post',
        icon: 'ri:briefcase-line',
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'dict',
      name: 'Dict',
      component: '/system/dict',
      meta: {
        title: 'menus.system.dict',
        icon: 'ri:book-2-line',
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'config',
      name: 'Config',
      component: '/system/config',
      meta: {
        title: 'menus.system.config',
        icon: 'ri:settings-2-line',
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'notice',
      name: 'Notice',
      component: '/system/notice',
      meta: {
        title: 'menus.system.notice',
        icon: 'ri:notification-3-line',
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'log/operlog',
      name: 'SystemLogOperlog',
      component: '/monitor/operlog',
      meta: {
        title: 'menus.system.log.operlog',
        icon: 'ri:file-history-line',
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'log/logininfor',
      name: 'SystemLogLogininfor',
      component: '/monitor/logininfor',
      meta: {
        title: 'menus.system.log.logininfor',
        icon: 'ri:login-box-line',
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'online',
      name: 'SystemMonitorOnline',
      component: '/monitor/online',
      meta: {
        title: 'menus.system.online',
        icon: 'ri:earth-line',
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'job',
      name: 'SystemJob',
      component: '/monitor/job',
      meta: {
        title: 'menus.system.job',
        icon: 'ri:timer-line',
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'job-log',
      name: 'SystemJobLog',
      component: '/monitor/job/job-log',
      meta: {
        title: 'menus.system.jobLog',
        icon: 'ri:history-line',
        isHide: true,
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'druid',
      name: 'SystemDruid',
      component: '/monitor/druid',
      meta: {
        title: 'menus.system.druid',
        icon: 'ri:database-2-line',
        keepAlive: false,
        roles: ['admin']
      }
    },
    {
      path: 'user-center',
      name: 'UserCenter',
      component: '/system/user-center',
      meta: {
        title: 'menus.system.userCenter',
        icon: 'ri:user-line',
        isHide: true,
        keepAlive: true,
        isHideTab: true
      }
    }
  ]
}
