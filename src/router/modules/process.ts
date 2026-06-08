import { AppRouteRecord } from '@/types/router'

export const processRoutes: AppRouteRecord = {
  path: '/process',
  name: 'Process',
  component: '/index/index',
  meta: {
    title: 'menus.process.title',
    icon: 'ri:flow-chart',
    roles: ['admin']
  },
  children: [
    {
      path: 'definition',
      name: 'ProcessDefinition',
      component: '/process/definition',
      meta: {
        title: 'menus.process.definition',
        icon: 'ri:file-list-3-line',
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'start',
      name: 'ProcessStart',
      component: '/process/start',
      meta: {
        title: 'menus.process.start',
        icon: 'ri:file-add-line',
        keepAlive: false,
        roles: ['admin']
      }
    },
    {
      path: 'my-applications',
      name: 'MyApplications',
      component: '/process/my-applications',
      meta: {
        title: 'menus.process.myApplications',
        icon: 'ri:draft-line',
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'my-applications/:id',
      name: 'ApplicationDetail',
      component: '/process/application-detail',
      meta: {
        title: 'menus.process.applicationDetail',
        isHideTab: true
      }
    },
    {
      path: 'pending',
      name: 'PendingApproval',
      component: '/process/pending',
      meta: {
        title: 'menus.process.pending',
        icon: 'ri:task-line',
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'approved',
      name: 'ApprovedHistory',
      component: '/process/approved',
      meta: {
        title: 'menus.process.approved',
        icon: 'ri:check-double-line',
        keepAlive: true,
        roles: ['admin']
      }
    }
  ]
}
