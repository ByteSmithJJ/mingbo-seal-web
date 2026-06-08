<template>
  <div>
    <el-row>
      <h4><b>审批人设置</b></h4>
      <el-radio-group v-model="dataType" @change="changeDataType">
        <el-radio label="USERS">指定用户</el-radio>
        <el-radio label="ROLES">角色</el-radio>
        <el-radio label="DEPTS">部门</el-radio>
        <el-radio label="INITIATOR">发起人</el-radio>
      </el-radio-group>
    </el-row>
    <el-row>
      <div v-if="dataType === 'USERS'">
        <el-tag v-for="userText in selectedUser.text" :key="userText" effect="plain">
          {{ userText }}
        </el-tag>
        <div class="element-drawer__button">
          <el-button size="small" type="primary" icon="el-icon-plus" @click="onSelectUsers()"
            >添加用户</el-button
          >
        </div>
      </div>
      <div v-if="dataType === 'ROLES'" style="display: block">
        <el-select
          v-model="roleIds"
          multiple
          size="small"
          placeholder="请选择 角色"
          style="width: 340px"
          @change="changeSelectRoles"
        >
          <el-option
            v-for="item in roleOptions"
            :key="item.roleId"
            :label="item.roleName"
            :value="`ROLE${item.roleId}`"
            :disabled="item.status === 1"
          >
          </el-option>
        </el-select>
      </div>
      <div v-if="dataType === 'DEPTS'" style="display: block">
        <el-tree-select
          v-model="deptIds"
          :data="deptTreeData"
          :props="deptProps"
          multiple
          clearable
          check-strictly
          show-checkbox
          node-key="id"
          :render-after-expand="false"
          style="width: 340px"
          placeholder="请选择部门"
          @change="checkedDeptChange"
        />
      </div>
    </el-row>
    <el-row>
      <div v-show="showMultiFlog">
        <el-divider />
        <h4><b>多实例审批方式</b></h4>
        <el-row>
          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px">
            <el-radio v-model="multiLoopType" label="Null" @change="changeMultiLoopType"
              >无</el-radio
            >
            <el-radio
              v-model="multiLoopType"
              label="SequentialMultiInstance"
              @change="changeMultiLoopType"
              >会签（需所有审批人同意）</el-radio
            >
            <el-radio
              v-model="multiLoopType"
              label="ParallelMultiInstance"
              @change="changeMultiLoopType"
              >或签（一名审批人同意即可）</el-radio
            >
          </div>
        </el-row>
        <el-row v-if="multiLoopType !== 'Null'">
          <el-tooltip
            content="开启后，实例需按顺序轮流审批"
            placement="top-start"
            @click.stop.prevent
          >
            <i class="header-icon el-icon-info"></i>
          </el-tooltip>
          <span class="custom-label">顺序审批：</span>
          <el-switch v-model="isSequential" @change="changeMultiLoopType()" />
        </el-row>
      </div>
    </el-row>

    <!-- 候选用户弹窗 -->
    <el-dialog title="候选用户" v-model="userOpen" width="60%" append-to-body>
      <el-row type="flex" :gutter="20">
        <!--部门数据-->
        <el-col :span="7">
          <el-card shadow="never" style="height: 100%">
            <template #header
              ><div>
                <span>部门列表</span>
              </div></template
            >
            <div class="head-container">
              <el-input
                v-model="deptName"
                placeholder="请输入部门名称"
                clearable
                size="small"
                prefix-icon="el-icon-search"
                style="margin-bottom: 20px"
              />
              <el-tree
                :data="deptOptions"
                :props="deptProps"
                :expand-on-click-node="false"
                :filter-node-method="filterNode"
                ref="tree"
                default-expand-all
                @node-click="handleNodeClick"
              />
            </div>
          </el-card>
        </el-col>
        <el-col :span="17">
          <el-table
            ref="multipleTable"
            height="600"
            :data="userTableList"
            border
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="50" align="center" />
            <el-table-column label="用户名" align="center" prop="nickName" />
            <el-table-column label="部门" align="center" prop="dept.deptName" />
          </el-table>
          <ElPagination
            small
            layout="total, prev, pager, next"
            :total="userTotal"
            :page-size="queryParams.pageSize"
            :current-page="queryParams.pageNum"
            @current-change="handlePageChange"
          />
        </el-col>
      </el-row>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="handleTaskUserComplete">确 定</el-button>
          <el-button @click="userOpen = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
  import { fetchGetUserList, fetchDeptTree } from '@/api/system/user'
  import { fetchRoleList } from '@/api/system/role'
  import { ElMessage } from 'element-plus'

  const userTaskForm = {
    dataType: '',
    assignee: '',
    candidateUsers: '',
    candidateGroups: '',
    text: ''
  }

  export default {
    name: 'UserTask',
    props: {
      id: String,
      type: String
    },
    data() {
      return {
        loading: false,
        dataType: 'USERS',
        selectedUser: {
          ids: [],
          text: []
        },
        userOpen: false,
        deptName: undefined,
        deptOptions: [],
        deptProps: {
          children: 'children',
          label: 'label'
        },
        deptTempOptions: [],
        userTableList: [],
        userTotal: 0,
        selectedUserDate: [],
        roleOptions: [],
        roleIds: [],
        deptTreeData: [],
        deptIds: [],
        // 查询参数
        queryParams: {
          pageNum: 1,
          pageSize: 10,
          deptId: undefined
        },
        showMultiFlog: false,
        isSequential: false,
        multiLoopType: 'Null'
      }
    },
    watch: {
      id: {
        immediate: true,
        handler() {
          this.bpmnElement = window.bpmnInstances.bpmnElement
          this.$nextTick(() => this.resetTaskForm())
        }
      },
      deptName(val) {
        this.$refs.tree.filter(val)
      }
    },
    beforeUnmount() {
      this.bpmnElement = null
    },
    methods: {
      resetTaskForm() {
        const bpmnElementObj = this.bpmnElement?.businessObject
        if (!bpmnElementObj) {
          return
        }
        this.clearOptionsData()
        this.dataType = bpmnElementObj['dataType'] || 'USERS'
        if (this.dataType === 'USERS') {
          let userIdData = bpmnElementObj['candidateUsers'] || bpmnElementObj['assignee']
          let userText = bpmnElementObj['text'] || []
          if (userIdData && userIdData.toString().length > 0 && userText && userText.length > 0) {
            this.selectedUser.ids = userIdData.toString().split(',')
            this.selectedUser.text = userText.toString().split(',')
          }
          if (this.selectedUser.ids.length > 1) {
            this.showMultiFlog = true
          }
        } else if (this.dataType === 'ROLES') {
          this.getRoleOptions()
          let roleIdData = bpmnElementObj['candidateGroups'] || ''
          if (roleIdData && roleIdData.length > 0) {
            this.roleIds = roleIdData.split(',')
          }
          this.showMultiFlog = true
        } else if (this.dataType === 'DEPTS') {
          this.getDeptTreeData()
          let deptIdData = bpmnElementObj['candidateGroups'] || ''
          if (deptIdData && deptIdData.length > 0) {
            this.deptIds = deptIdData.split(',')
          }
          this.showMultiFlog = true
        }
        this.getElementLoop(bpmnElementObj)
      },
      clearOptionsData() {
        this.selectedUser.ids = []
        this.selectedUser.text = []
        this.roleIds = []
        this.deptIds = []
      },
      updateElementTask() {
        const taskAttr = Object.create(null)
        for (let key in userTaskForm) {
          taskAttr[key] = userTaskForm[key]
        }
        window.bpmnInstances.modeling.updateProperties(this.bpmnElement, taskAttr)
      },
      getDeptOptions() {
        return new Promise((resolve) => {
          if (!this.deptOptions || this.deptOptions.length <= 0) {
            fetchDeptTree().then((res: any) => {
              const list = Array.isArray(res) ? res : res.data || res || []
              this.deptTempOptions = list
              this.deptOptions = list
              resolve(list)
            })
          } else {
            resolve(this.deptOptions)
          }
        })
      },
      getDeptTreeData() {
        function refactorTree(data) {
          return data.map((node) => {
            let treeData = {
              id: `DEPT${node.id}`,
              label: node.label,
              parentId: node.parentId,
              weight: node.weight
            }
            if (node.children && node.children.length > 0) {
              treeData.children = refactorTree(node.children)
            }
            return treeData
          })
        }
        return new Promise((resolve) => {
          if (!this.deptTreeData || this.deptTreeData.length <= 0) {
            this.getDeptOptions().then(() => {
              this.deptTreeData = refactorTree(this.deptOptions)
              resolve()
            })
          } else {
            resolve()
          }
        })
      },
      getRoleOptions() {
        if (!this.roleOptions || this.roleOptions.length <= 0) {
          fetchRoleList({ pageNum: 1, pageSize: 200 }).then((response: any) => {
            this.roleOptions = response.rows || []
          })
        }
      },
      getUserList() {
        const params = {
          pageNum: this.queryParams.pageNum,
          pageSize: this.queryParams.pageSize,
          deptId: this.queryParams.deptId
        }
        fetchGetUserList(params).then((response: any) => {
          this.userTableList = response.rows || []
          this.userTotal = response.total || 0
        })
      },
      handlePageChange(page) {
        this.queryParams.pageNum = page
        this.getUserList()
      },
      handleSizeChange(size) {
        this.queryParams.pageSize = size
        this.queryParams.pageNum = 1
        this.getUserList()
      },
      filterNode(value, data) {
        if (!value) return true
        return data.label.indexOf(value) !== -1
      },
      handleNodeClick(data) {
        this.queryParams.deptId = data.id
        this.queryParams.pageNum = 1
        this.getUserList()
      },
      handleSelectionChange(selection) {
        this.selectedUserDate = selection
      },
      onSelectUsers() {
        this.selectedUserDate = []
        this.$refs.multipleTable?.clearSelection()
        this.getDeptOptions()
        this.userOpen = true
      },
      handleTaskUserComplete() {
        if (!this.selectedUserDate || this.selectedUserDate.length <= 0) {
          ElMessage.error('请选择用户')
          return
        }
        userTaskForm.dataType = 'USERS'
        this.selectedUser.text = this.selectedUserDate.map((k) => k.nickName) || []
        if (this.selectedUserDate.length === 1) {
          let data = this.selectedUserDate[0]
          userTaskForm.assignee = data.userName || String(data.userId)
          userTaskForm.text = data.nickName
          userTaskForm.candidateUsers = null
          this.showMultiFlog = false
          this.multiLoopType = 'Null'
          this.changeMultiLoopType()
        } else {
          userTaskForm.candidateUsers =
            this.selectedUserDate.map((k) => k.userName || k.userId).join(',') || null
          userTaskForm.text = this.selectedUserDate.map((k) => k.nickName).join(',') || null
          userTaskForm.assignee = null
          this.showMultiFlog = true
        }
        this.updateElementTask()
        this.userOpen = false
      },
      changeSelectRoles(val) {
        let groups = null
        let text = null
        if (val && val.length > 0) {
          userTaskForm.dataType = 'ROLES'
          groups = val.join(',') || null
          let textArr = this.roleOptions.filter((k) => val.indexOf(`ROLE${k.roleId}`) >= 0)
          text = textArr?.map((k) => k.roleName).join(',') || null
        } else {
          userTaskForm.dataType = null
          this.multiLoopType = 'Null'
        }
        userTaskForm.candidateGroups = groups
        userTaskForm.text = text
        this.updateElementTask()
        this.changeMultiLoopType()
      },
      checkedDeptChange(checkedIds) {
        let groups = null
        let text = null
        this.deptIds = checkedIds
        if (checkedIds && checkedIds.length > 0) {
          userTaskForm.dataType = 'DEPTS'
          groups = checkedIds.join(',') || null
          let textArr = []
          let treeStarkData = JSON.parse(JSON.stringify(this.deptTreeData))
          checkedIds.forEach((id) => {
            let stark = []
            stark = stark.concat(treeStarkData)
            while (stark.length) {
              let temp = stark.shift()
              if (temp.children) {
                stark = temp.children.concat(stark)
              }
              if (id === temp.id) {
                textArr.push(temp)
              }
            }
          })
          text = textArr?.map((k) => k.label).join(',') || null
        } else {
          userTaskForm.dataType = null
          this.multiLoopType = 'Null'
        }
        userTaskForm.candidateGroups = groups
        userTaskForm.text = text
        this.updateElementTask()
        this.changeMultiLoopType()
      },
      changeDataType(val) {
        if (
          val === 'ROLES' ||
          val === 'DEPTS' ||
          (val === 'USERS' && this.selectedUser.ids.length > 1)
        ) {
          this.showMultiFlog = true
        } else {
          this.showMultiFlog = false
        }
        this.multiLoopType = 'Null'
        this.changeMultiLoopType()
        Object.keys(userTaskForm).forEach((key) => (userTaskForm[key] = null))
        userTaskForm.dataType = val
        if (val === 'USERS') {
          if (this.selectedUser && this.selectedUser.ids && this.selectedUser.ids.length > 0) {
            if (this.selectedUser.ids.length === 1) {
              userTaskForm.assignee = this.selectedUser.ids[0]
            } else {
              userTaskForm.candidateUsers = this.selectedUser.ids.join(',')
            }
            userTaskForm.text = this.selectedUser.text?.join(',') || null
          }
        } else if (val === 'ROLES') {
          this.getRoleOptions()
          if (this.roleIds && this.roleIds.length > 0) {
            userTaskForm.candidateGroups = this.roleIds.join(',') || null
            let textArr = this.roleOptions.filter(
              (k) => this.roleIds.indexOf(`ROLE${k.roleId}`) >= 0
            )
            userTaskForm.text = textArr?.map((k) => k.roleName).join(',') || null
          }
        } else if (val === 'DEPTS') {
          this.getDeptTreeData()
          if (this.deptIds && this.deptIds.length > 0) {
            userTaskForm.candidateGroups = this.deptIds.join(',') || null
            let textArr = []
            let treeStarkData = JSON.parse(JSON.stringify(this.deptTreeData))
            this.deptIds.forEach((id) => {
              let stark = []
              stark = stark.concat(treeStarkData)
              while (stark.length) {
                let temp = stark.shift()
                if (temp.children) {
                  stark = temp.children.concat(stark)
                }
                if (id === temp.id) {
                  textArr.push(temp)
                }
              }
            })
            userTaskForm.text = textArr?.map((k) => k.label).join(',') || null
          }
        } else if (val === 'INITIATOR') {
          userTaskForm.assignee = '${initiator}'
          userTaskForm.text = '流程发起人'
        }
        this.updateElementTask()
      },
      getElementLoop(businessObject) {
        if (!businessObject.loopCharacteristics) {
          this.multiLoopType = 'Null'
          return
        }
        this.isSequential = businessObject.loopCharacteristics.isSequential
        if (businessObject.loopCharacteristics.completionCondition) {
          const body = businessObject.loopCharacteristics.completionCondition.body
          if (body === '${nrOfCompletedInstances >= nrOfInstances}') {
            this.multiLoopType = 'SequentialMultiInstance'
          } else {
            this.multiLoopType = 'ParallelMultiInstance'
          }
        }
      },
      changeMultiLoopType() {
        if (this.multiLoopType === 'Null') {
          window.bpmnInstances.modeling.updateProperties(this.bpmnElement, {
            loopCharacteristics: null,
            assignee: null
          })
          return
        }
        this.multiLoopInstance = window.bpmnInstances.moddle.create(
          'bpmn:MultiInstanceLoopCharacteristics',
          { isSequential: this.isSequential }
        )
        window.bpmnInstances.modeling.updateProperties(this.bpmnElement, {
          loopCharacteristics: this.multiLoopInstance,
          assignee: '${assignee}'
        })
        let completionCondition = null
        if (this.multiLoopType === 'SequentialMultiInstance') {
          completionCondition = window.bpmnInstances.moddle.create('bpmn:FormalExpression', {
            body: '${nrOfCompletedInstances >= nrOfInstances}'
          })
        }
        if (this.multiLoopType === 'ParallelMultiInstance') {
          completionCondition = window.bpmnInstances.moddle.create('bpmn:FormalExpression', {
            body: '${nrOfCompletedInstances > 0}'
          })
        }
        window.bpmnInstances.modeling.updateModdleProperties(
          this.bpmnElement,
          this.multiLoopInstance,
          {
            collection: '${multiInstanceHandler.getUserIds(execution)}',
            elementVariable: 'assignee',
            completionCondition
          }
        )
      }
    }
  }
</script>

<style scoped lang="scss">
  .el-row .el-radio-group {
    margin-bottom: 15px;
    .el-radio {
      line-height: 28px;
    }
  }
  .el-tag {
    margin-bottom: 10px;
    + .el-tag {
      margin-left: 10px;
    }
  }

  .custom-label {
    padding-left: 5px;
    font-weight: 500;
    font-size: 14px;
    color: #606266;
  }
</style>
