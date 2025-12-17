<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { fetchStatus, createTrack, updateTrack } from './api';
import type { TrackWithDetails, CreateTrackParams, UpdateTrackParams, Status } from './api';

const tracks = ref<TrackWithDetails[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const showForm = ref(false);
const editingTrack = ref<TrackWithDetails | null>(null);

// Form state
const formTitle = ref('');
const formSummary = ref('');
const formNext = ref('');
const formStatus = ref<Status>('planned');
const formParentId = ref<string | null>(null);

// Build tree structure
const rootTracks = computed(() => {
  return tracks.value.filter((t) => t.parent_id === null);
});

function getChildren(parentId: string): TrackWithDetails[] {
  return tracks.value.filter((t) => t.parent_id === parentId);
}

function getTrackById(id: string): TrackWithDetails | undefined {
  return tracks.value.find((t) => t.id === id);
}

async function loadTracks() {
  try {
    loading.value = true;
    error.value = null;
    const response = await fetchStatus();
    tracks.value = response.tracks;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load tracks';
  } finally {
    loading.value = false;
  }
}

function openCreateForm(parentId: string | null = null) {
  editingTrack.value = null;
  formTitle.value = '';
  formSummary.value = '';
  formNext.value = '';
  formStatus.value = 'planned';
  formParentId.value = parentId;
  showForm.value = true;
}

function openEditForm(track: TrackWithDetails) {
  editingTrack.value = track;
  formTitle.value = track.title;
  formSummary.value = track.summary;
  formNext.value = track.next_prompt;
  formStatus.value = track.status;
  formParentId.value = track.parent_id;
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingTrack.value = null;
}

async function submitForm() {
  try {
    if (editingTrack.value) {
      const params: UpdateTrackParams = {
        summary: formSummary.value,
        next_prompt: formNext.value,
        status: formStatus.value,
      };
      await updateTrack(editingTrack.value.id, params);
    } else {
      const params: CreateTrackParams = {
        title: formTitle.value,
        summary: formSummary.value,
        next_prompt: formNext.value,
        status: formStatus.value,
        parent_id: formParentId.value,
      };
      await createTrack(params);
    }
    closeForm();
    await loadTracks();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save track';
  }
}

function getStatusColor(status: Status): string {
  switch (status) {
    case 'planned':
      return 'bg-gray-200 text-gray-700';
    case 'in_progress':
      return 'bg-blue-200 text-blue-800';
    case 'done':
      return 'bg-green-200 text-green-800';
    case 'blocked':
      return 'bg-yellow-200 text-yellow-800';
    case 'superseded':
      return 'bg-red-200 text-red-800';
    default:
      return 'bg-gray-200 text-gray-700';
  }
}

onMounted(() => {
  loadTracks();
});
</script>

<template>
  <div class="max-w-6xl mx-auto p-6">
    <header class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Track Status</h1>
      <p class="text-gray-600 mt-1">Project tracking dashboard</p>
    </header>

    <!-- Error display -->
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
      <button @click="error = null" class="float-right font-bold">&times;</button>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="text-center py-12">
      <div class="text-gray-500">Loading tracks...</div>
    </div>

    <!-- Main content -->
    <div v-else>
      <!-- Action bar -->
      <div class="mb-6">
        <button
          @click="openCreateForm(null)"
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + New Track
        </button>
        <button @click="loadTracks" class="ml-2 text-gray-600 hover:text-gray-800 px-4 py-2">
          Refresh
        </button>
      </div>

      <!-- Empty state -->
      <div v-if="tracks.length === 0" class="text-center py-12 text-gray-500">
        No tracks yet. Create one to get started.
      </div>

      <!-- Track tree -->
      <div v-else class="space-y-4">
        <template v-for="track in rootTracks" :key="track.id">
          <div class="bg-white rounded-lg shadow p-4">
            <!-- Track card -->
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-400 font-mono">{{ track.id }}</span>
                  <span
                    :class="['text-xs px-2 py-0.5 rounded', getStatusColor(track.status)]"
                  >
                    {{ track.status }}
                  </span>
                  <span class="text-xs text-gray-400">[{{ track.kind }}]</span>
                  <span v-if="track.worktree" class="text-xs text-purple-600">
                    @{{ track.worktree }}
                  </span>
                </div>
                <h2 class="text-lg font-semibold mt-1">{{ track.title }}</h2>
                <p v-if="track.summary" class="text-gray-600 text-sm mt-1">{{ track.summary }}</p>
                <p v-if="track.next_prompt" class="text-gray-500 text-sm mt-1 italic">
                  Next: {{ track.next_prompt }}
                </p>
                <div v-if="track.files.length > 0" class="mt-2">
                  <span class="text-xs text-gray-400">Files:</span>
                  <span
                    v-for="file in track.files"
                    :key="file"
                    class="text-xs bg-gray-100 px-1 rounded ml-1"
                  >
                    {{ file }}
                  </span>
                </div>
                <div v-if="track.blocked_by.length > 0" class="mt-1">
                  <span class="text-xs text-yellow-600">
                    Blocked by: {{ track.blocked_by.map((id) => getTrackById(id)?.title || id).join(', ') }}
                  </span>
                </div>
              </div>
              <div class="flex gap-2">
                <button
                  @click="openEditForm(track)"
                  class="text-sm text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
                <button
                  @click="openCreateForm(track.id)"
                  class="text-sm text-green-600 hover:text-green-800"
                >
                  + Child
                </button>
              </div>
            </div>

            <!-- Children (recursive-ish, 2 levels for now) -->
            <div v-if="getChildren(track.id).length > 0" class="mt-4 ml-6 space-y-3 border-l-2 border-gray-200 pl-4">
              <div
                v-for="child in getChildren(track.id)"
                :key="child.id"
                class="bg-gray-50 rounded p-3"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-gray-400 font-mono">{{ child.id }}</span>
                      <span
                        :class="['text-xs px-2 py-0.5 rounded', getStatusColor(child.status)]"
                      >
                        {{ child.status }}
                      </span>
                      <span class="text-xs text-gray-400">[{{ child.kind }}]</span>
                      <span v-if="child.worktree" class="text-xs text-purple-600">
                        @{{ child.worktree }}
                      </span>
                    </div>
                    <h3 class="font-medium mt-1">{{ child.title }}</h3>
                    <p v-if="child.summary" class="text-gray-600 text-sm mt-1">{{ child.summary }}</p>
                    <p v-if="child.next_prompt" class="text-gray-500 text-sm mt-1 italic">
                      Next: {{ child.next_prompt }}
                    </p>
                    <div v-if="child.blocked_by.length > 0" class="mt-1">
                      <span class="text-xs text-yellow-600">
                        Blocked by: {{ child.blocked_by.map((id) => getTrackById(id)?.title || id).join(', ') }}
                      </span>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button
                      @click="openEditForm(child)"
                      class="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      @click="openCreateForm(child.id)"
                      class="text-sm text-green-600 hover:text-green-800"
                    >
                      + Child
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Form modal -->
    <div
      v-if="showForm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
        <h2 class="text-xl font-semibold mb-4">
          {{ editingTrack ? 'Edit Track' : 'New Track' }}
        </h2>
        <form @submit.prevent="submitForm" class="space-y-4">
          <div v-if="!editingTrack">
            <label class="block text-sm font-medium text-gray-700">Title</label>
            <input
              v-model="formTitle"
              type="text"
              required
              class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Summary</label>
            <textarea
              v-model="formSummary"
              rows="3"
              class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            ></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Next</label>
            <textarea
              v-model="formNext"
              rows="2"
              class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            ></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Status</label>
            <select
              v-model="formStatus"
              class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            >
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="blocked">Blocked</option>
              <option value="superseded">Superseded</option>
            </select>
          </div>
          <div class="flex justify-end gap-2 pt-4">
            <button
              type="button"
              @click="closeForm"
              class="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {{ editingTrack ? 'Save' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
