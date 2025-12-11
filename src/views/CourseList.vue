<template>
  <div class="container mx-auto p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold">課程管理</h1>
      <router-link to="/course/create" class="btn btn-primary">
        <i class="fas fa-plus mr-2"></i>新增課程
      </router-link>
    </div>

    <!-- Search and Filter -->
    <div class="card bg-base-200 mb-6">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Search -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">搜尋課程</span>
            </label>
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="課程名稱、主題、對象..."
              class="input input-bordered"
            />
          </div>

          <!-- Type Filter -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">課程類型</span>
            </label>
            <select v-model="filterType" class="select select-bordered">
              <option value="">全部類型</option>
              <option value="parent">母課程</option>
              <option value="children">子課程</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">狀態</span>
            </label>
            <select v-model="filterStatus" class="select select-bordered">
              <option value="">全部狀態</option>
              <option value="draft">草稿</option>
              <option value="published">已發布</option>
              <option value="archived">已封存</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <LoadingSpinner v-if="courseStore.loading" message="載入課程中..." />

    <!-- Course List -->
    <div v-else-if="filteredCourses.length > 0" class="grid grid-cols-1 gap-4">
      <div 
        v-for="course in filteredCourses" 
        :key="course.id"
        class="card bg-base-200 hover:bg-base-300 transition-colors"
      >
        <div class="card-body">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h2 class="card-title">
                {{ course.basicInfo?.className || '未命名課程' }}
                <span 
                  class="badge" 
                  :class="course.basicInfo?.courseType === 'parent' ? 'badge-primary' : 'badge-secondary'"
                >
                  {{ course.basicInfo?.courseType === 'parent' ? '母課程' : '子課程' }}
                </span>
              </h2>
              
              <div class="mt-2 space-y-1 text-sm">
                <p v-if="course.basicInfo?.topic">
                  <span class="font-semibold">主題:</span> {{ course.basicInfo.topic }}
                </p>
                <p v-if="course.basicInfo?.audience">
                  <span class="font-semibold">對象:</span> {{ course.basicInfo.audience }}
                </p>
                <p v-if="course.basicInfo?.startDate && course.basicInfo?.endDate">
                  <span class="font-semibold">期間:</span> 
                  {{ formatDate(course.basicInfo.startDate) }} ~ {{ formatDate(course.basicInfo.endDate) }}
                </p>
                <p v-if="course.schedule?.totalHours">
                  <span class="font-semibold">總時數:</span> {{ course.schedule.totalHours }} 小時
                </p>
              </div>

              <div class="mt-3 flex gap-2">
                <span 
                  class="badge badge-sm"
                  :class="getStatusClass(course.status || 'draft')"
                >
                  {{ getStatusText(course.status || 'draft') }}
                </span>
                <span v-if="course.createdAt" class="badge badge-sm badge-ghost">
                  建立於 {{ formatDateTime(course.createdAt) }}
                </span>
              </div>
            </div>

            <div class="flex gap-2">
              <router-link 
                :to="`/course/edit/${course.id}`"
                class="btn btn-sm btn-primary"
              >
                <i class="fas fa-edit"></i>
              </router-link>
              <button 
                @click="confirmDelete(course)"
                class="btn btn-sm btn-error"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-200">
      <div class="card-body text-center py-12">
        <i class="fas fa-folder-open text-6xl text-base-content/30 mb-4"></i>
        <h3 class="text-xl font-semibold mb-2">尚無課程</h3>
        <p class="text-base-content/60 mb-4">
          {{ searchQuery || filterType || filterStatus ? '找不到符合條件的課程' : '開始建立您的第一個課程' }}
        </p>
        <router-link to="/course/create" class="btn btn-primary">
          <i class="fas fa-plus mr-2"></i>新增課程
        </router-link>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      v-if="courseToDelete"
      title="確認刪除課程"
      :message="`確定要刪除課程「${courseToDelete.basicInfo?.className || '未命名課程'}」嗎？此操作無法復原。`"
      confirmText="刪除"
      cancelText="取消"
      @confirm="handleDelete"
      @cancel="courseToDelete = null"
    />

    <!-- Toast Notification -->
    <ToastNotification />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCourseStore } from '../stores/courseStore'
import { useToastStore } from '../stores/toastStore'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import ToastNotification from '../components/common/ToastNotification.vue'

const courseStore = useCourseStore()
const toastStore = useToastStore()

// Search and Filter
const searchQuery = ref('')
const filterType = ref('')
const filterStatus = ref('')
const courseToDelete = ref(null)

// Computed
const filteredCourses = computed(() => {
  let result = courseStore.courses

  // Search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(course => {
      return (
        course.basicInfo?.className?.toLowerCase().includes(query) ||
        course.basicInfo?.topic?.toLowerCase().includes(query) ||
        course.basicInfo?.audience?.toLowerCase().includes(query)
      )
    })
  }

  // Type Filter
  if (filterType.value) {
    result = result.filter(course => course.basicInfo?.courseType === filterType.value)
  }

  // Status Filter
  if (filterStatus.value) {
    result = result.filter(course => (course.status || 'draft') === filterStatus.value)
  }

  return result
})

// Methods
const formatDate = (date) => {
  if (!date) return ''
  if (date.toDate) {
    return date.toDate().toLocaleDateString('zh-TW')
  }
  return new Date(date).toLocaleDateString('zh-TW')
}

const formatDateTime = (timestamp) => {
  if (!timestamp) return ''
  if (timestamp.toDate) {
    return timestamp.toDate().toLocaleString('zh-TW')
  }
  return new Date(timestamp).toLocaleString('zh-TW')
}

const getStatusClass = (status) => {
  const classes = {
    draft: 'badge-warning',
    published: 'badge-success',
    archived: 'badge-ghost'
  }
  return classes[status] || 'badge-ghost'
}

const getStatusText = (status) => {
  const texts = {
    draft: '草稿',
    published: '已發布',
    archived: '已封存'
  }
  return texts[status] || '未知'
}

const confirmDelete = (course) => {
  courseToDelete.value = course
}

const handleDelete = async () => {
  if (!courseToDelete.value) return

  const result = await courseStore.deleteCourse(courseToDelete.value.id)
  
  if (result.success) {
    toastStore.showToast('課程已刪除', 'success')
  } else {
    toastStore.showToast('刪除失敗: ' + result.error, 'error')
  }
  
  courseToDelete.value = null
}

// Lifecycle
onMounted(async () => {
  const result = await courseStore.fetchCourses()
  if (!result.success) {
    toastStore.showToast('載入課程失敗: ' + result.error, 'error')
  }
})
</script>
