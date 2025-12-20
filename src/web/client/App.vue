<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { fetchStatus, createTrack, updateTrack } from './api';
import type { TrackWithDetails, CreateTrackParams, UpdateTrackParams, Status } from './api';
import TrackTree from './components/TrackTree.vue';
import TrackForm from './components/TrackForm.vue';

// Auto-refresh configuration
const AUTO_REFRESH_INTERVAL_MS = 5000; // 5 seconds

const tracks = ref<TrackWithDetails[]>([]);

// Track animation state - maps track ID to animation class
const animatedIds = ref<Map<string, string>>(new Map());

// Store previous track state for comparison (id -> updated_at)
const previousTrackState = ref<Map<string, string>>(new Map());

// Root track is the one with parent_id === null (project name from track init)
const rootTrack = computed(() => tracks.value.find((t) => t.parent_id === null));
const projectName = computed(() => rootTrack.value?.title ?? 'Track Status');

// Update document title when project name changes
watch(projectName, (name) => {
  document.title = name;
}, { immediate: true });

const loading = ref(true);
const error = ref<string | null>(null);

const showForm = ref(false);
const editingTrack = ref<TrackWithDetails | null>(null);
const newTrackParentId = ref<string | null>(null);

// Lifted state from TrackTree to persist across refreshes
const statusFilters = ref<Set<Status>>(new Set(['planned', 'in_progress', 'blocked']));
const expandedIds = ref<Set<string>>(new Set());
const worktreeFilter = ref<string | null>(null);

// Auto-refresh state (enabled by default)
const autoRefresh = ref(true);
const refreshIntervalId = ref<ReturnType<typeof setInterval> | null>(null);

// Active statuses for auto-expand logic
const ACTIVE_STATUSES: Status[] = ['planned', 'in_progress', 'blocked'];

// Track whether initial auto-expand has been done
const initialExpandDone = ref(false);

async function loadTracks() {
  try {
    loading.value = true;
    error.value = null;
    const response = await fetchStatus();

    // Detect new and updated tracks for animation
    const newAnimatedIds = new Map<string, string>();
    const isInitialLoad = previousTrackState.value.size === 0;

    if (!isInitialLoad) {
      for (const track of response.tracks) {
        const prevUpdatedAt = previousTrackState.value.get(track.id);
        if (prevUpdatedAt === undefined) {
          // New track
          newAnimatedIds.set(track.id, 'track-card-new');
        } else if (prevUpdatedAt !== track.updated_at) {
          // Updated track
          newAnimatedIds.set(track.id, 'track-card-flash');
        }
      }
    }

    // Update animation state
    animatedIds.value = newAnimatedIds;

    // Clear animations after they complete
    if (newAnimatedIds.size > 0) {
      setTimeout(() => {
        animatedIds.value = new Map();
      }, 1500);
    }

    // Store current state for next comparison
    const newState = new Map<string, string>();
    for (const track of response.tracks) {
      newState.set(track.id, track.updated_at);
    }
    previousTrackState.value = newState;

    tracks.value = response.tracks;

    // Auto-expand the first active super track on initial load
    if (!initialExpandDone.value && response.tracks.length > 0) {
      const firstActiveSuperTrack = response.tracks.find(
        (t) => t.kind === 'super' && ACTIVE_STATUSES.includes(t.status)
      );
      if (firstActiveSuperTrack) {
        expandedIds.value = new Set([firstActiveSuperTrack.id]);
      }
      initialExpandDone.value = true;
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load tracks';
  } finally {
    loading.value = false;
  }
}

// Auto-refresh functions
function startAutoRefresh() {
  if (refreshIntervalId.value) return;
  refreshIntervalId.value = setInterval(() => {
    if (!document.hidden) {
      loadTracks();
    }
  }, AUTO_REFRESH_INTERVAL_MS);
}

function stopAutoRefresh() {
  if (refreshIntervalId.value) {
    clearInterval(refreshIntervalId.value);
    refreshIntervalId.value = null;
  }
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value;
  if (autoRefresh.value) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
}

// Visibility API: pause/resume auto-refresh when tab visibility changes
function handleVisibilityChange() {
  if (!autoRefresh.value) return;
  if (document.hidden) {
    stopAutoRefresh();
  } else {
    loadTracks(); // Refresh immediately when tab becomes visible
    startAutoRefresh();
  }
}

function openCreateForm(parentId: string | null = null) {
  editingTrack.value = null;
  newTrackParentId.value = parentId;
  showForm.value = true;
}

function openEditForm(track: TrackWithDetails) {
  editingTrack.value = track;
  newTrackParentId.value = null;
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingTrack.value = null;
  newTrackParentId.value = null;
}

async function handleFormSubmit(data: {
  title?: string;
  summary: string;
  next_prompt: string;
  status: Status;
  parent_id?: string | null;
  worktree?: string | null;
}) {
  try {
    if (editingTrack.value) {
      const params: UpdateTrackParams = {
        summary: data.summary,
        next_prompt: data.next_prompt,
        status: data.status,
        worktree: data.worktree,
      };
      await updateTrack(editingTrack.value.id, params);
    } else {
      const params: CreateTrackParams = {
        title: data.title!,
        summary: data.summary,
        next_prompt: data.next_prompt,
        status: data.status,
        parent_id: data.parent_id,
        worktree: data.worktree,
      };
      await createTrack(params);
    }
    closeForm();
    await loadTracks();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save track';
  }
}

onMounted(() => {
  loadTracks();
  document.addEventListener('visibilitychange', handleVisibilityChange);
  // Start auto-refresh since it's enabled by default
  startAutoRefresh();
});

onUnmounted(() => {
  stopAutoRefresh();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<template>
  <div class="max-w-6xl mx-auto p-6">
    <header class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">{{ projectName }}</h1>
      <details class="mt-2 text-sm text-gray-600">
        <summary class="cursor-pointer hover:text-gray-800 select-none">Quick Start</summary>
        <div class="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p class="mb-2">Create tasks with summaries describing what to do, then let Claude work through them:</p>
          <code class="block bg-gray-800 text-green-400 p-2 rounded text-xs font-mono">claude --permission-mode dontAsk "Start the next track/task"</code>
        </div>
      </details>
    </header>

    <!-- Error display -->
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
      <button @click="error = null" class="float-right font-bold">&times;</button>
    </div>

    <!-- Action bar -->
    <div class="mb-6 flex items-center gap-4">
      <button
        @click="openCreateForm(null)"
        class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
      >
        + New Track
      </button>
      <button
        @click="loadTracks"
        :disabled="loading"
        class="text-gray-600 hover:text-gray-800 px-4 py-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
      >
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
      <label class="flex items-center gap-2 text-gray-600 cursor-pointer select-none">
        <input
          type="checkbox"
          :checked="autoRefresh"
          @change="toggleAutoRefresh"
          class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span>Auto-refresh</span>
        <span v-if="autoRefresh" class="inline-flex items-center">
          <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        </span>
      </label>
    </div>

    <!-- Track tree (state lifted to App.vue to persist across refreshes) -->
    <TrackTree
      :tracks="tracks"
      :loading="loading"
      :status-filters="statusFilters"
      :expanded-ids="expandedIds"
      :worktree-filter="worktreeFilter"
      :animated-ids="animatedIds"
      @edit="openEditForm"
      @add-child="openCreateForm"
      @update:status-filters="statusFilters = $event"
      @update:expanded-ids="expandedIds = $event"
      @update:worktree-filter="worktreeFilter = $event"
    />

    <!-- Form modal -->
    <TrackForm
      v-if="showForm"
      :track="editingTrack"
      :parent-id="newTrackParentId"
      :all-tracks="tracks"
      @submit="handleFormSubmit"
      @cancel="closeForm"
    />
  </div>
</template>
