<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { TrackWithDetails, Status } from '../api';

const props = defineProps<{
  track?: TrackWithDetails | null;
  parentId?: string | null;
  allTracks: TrackWithDetails[];
}>();

const emit = defineEmits<{
  submit: [data: {
    title?: string;
    summary: string;
    next_prompt: string;
    status: Status;
    parent_id?: string | null;
    worktree?: string | null;
  }];
  cancel: [];
}>();

const isEditing = computed(() => !!props.track);
const isExpanded = ref(false);

const title = ref('');
const summary = ref('');
const nextPrompt = ref('');
const status = ref<Status>('planned');
const parentId = ref<string | null>(null);
const worktree = ref('');

// Available parents (exclude self and descendants when editing)
const availableParents = computed(() => {
  if (!props.track) {
    return props.allTracks;
  }
  // When editing, exclude self and any descendants
  const excludeIds = new Set<string>([props.track.id]);
  // Simple approach: just exclude direct children for now
  props.allTracks.forEach((t) => {
    if (t.parent_id === props.track?.id) {
      excludeIds.add(t.id);
    }
  });
  return props.allTracks.filter((t) => !excludeIds.has(t.id));
});

// Reset form when props change
watch(
  () => [props.track, props.parentId],
  () => {
    if (props.track) {
      title.value = props.track.title;
      summary.value = props.track.summary;
      nextPrompt.value = props.track.next_prompt;
      status.value = props.track.status;
      parentId.value = props.track.parent_id;
      worktree.value = props.track.worktree ?? '';
    } else {
      title.value = '';
      summary.value = '';
      nextPrompt.value = '';
      status.value = 'planned';
      parentId.value = props.parentId ?? null;
      worktree.value = '';
    }
  },
  { immediate: true }
);

function handleSubmit() {
  const data: {
    title?: string;
    summary: string;
    next_prompt: string;
    status: Status;
    parent_id?: string | null;
    worktree?: string | null;
  } = {
    summary: summary.value,
    next_prompt: nextPrompt.value,
    status: status.value,
    worktree: worktree.value || null,
  };

  if (!isEditing.value) {
    data.title = title.value;
    data.parent_id = parentId.value;
  } else {
    // Include title if it changed when editing
    if (title.value !== props.track?.title) {
      data.title = title.value;
    }
  }

  emit('submit', data);
}
</script>

<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div
      :class="[
        'bg-white rounded-lg shadow-xl p-6 transition-all duration-200 flex flex-col',
        isExpanded ? 'w-[90%] max-w-none h-[85vh]' : 'max-w-lg w-full'
      ]"
    >
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold">
          {{ isEditing ? 'Edit Track' : 'New Track' }}
        </h2>
        <button
          type="button"
          @click="isExpanded = !isExpanded"
          class="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          :title="isExpanded ? 'Collapse dialog' : 'Expand dialog'"
        >
          <svg
            v-if="!isExpanded"
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" :class="['space-y-4', isExpanded ? 'flex-1 overflow-y-auto flex flex-col' : '']">
        <!-- Title -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Title *</label>
          <input
            v-model="title"
            type="text"
            required
            placeholder="Enter track title"
            class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          />
        </div>

        <!-- Parent selector (only for new tracks) -->
        <div v-if="!isEditing">
          <label class="block text-sm font-medium text-gray-700">Parent Track</label>
          <select
            v-model="parentId"
            class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          >
            <option :value="null">None (root level)</option>
            <option v-for="t in availableParents" :key="t.id" :value="t.id">
              {{ t.title }} ({{ t.id }})
            </option>
          </select>
        </div>

        <!-- Summary -->
        <div :class="isExpanded ? 'flex-1 flex flex-col min-h-0' : ''">
          <label class="block text-sm font-medium text-gray-700">Summary</label>
          <textarea
            v-model="summary"
            :rows="isExpanded ? undefined : 3"
            placeholder="Current state description"
            :class="[
              'mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border',
              isExpanded ? 'flex-1 resize-none' : ''
            ]"
          ></textarea>
        </div>

        <!-- Next prompt -->
        <div :class="isExpanded ? 'flex-1 flex flex-col min-h-0' : ''">
          <label class="block text-sm font-medium text-gray-700">Next</label>
          <textarea
            v-model="nextPrompt"
            :rows="isExpanded ? undefined : 2"
            placeholder="What to do next"
            :class="[
              'mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border',
              isExpanded ? 'flex-1 resize-none' : ''
            ]"
          ></textarea>
        </div>

        <!-- Status -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Status</label>
          <select
            v-model="status"
            class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          >
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
            <option value="superseded">Superseded</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>

        <!-- Worktree -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Worktree</label>
          <input
            v-model="worktree"
            type="text"
            placeholder="e.g. feature-auth"
            class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          />
          <p class="mt-1 text-xs text-gray-500">Git worktree name (optional)</p>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2 pt-4 border-t">
          <button
            type="button"
            @click="emit('cancel')"
            class="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {{ isEditing ? 'Save Changes' : 'Create Track' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
