<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { fetchStatus, createTrack, updateTrack, stopServer } from './api';
import type { TrackWithDetails, CreateTrackParams, UpdateTrackParams, Status, GitHost } from './api';
import TrackTree from './components/TrackTree.vue';
import TrackForm from './components/TrackForm.vue';

// Auto-refresh configuration
const AUTO_REFRESH_INTERVAL_MS = 5000; // 5 seconds

const tracks = ref<TrackWithDetails[]>([]);
const projectPath = ref<string>('');
const gitHost = ref<GitHost | null>(null);

// Root track is the one with parent_id === null (project name from track init)
const rootTrack = computed(() => tracks.value.find((t) => t.parent_id === null));
const projectName = computed(() => rootTrack.value?.title ?? 'Track Status');

// Computed label for git host tooltip
const gitHostLabel = computed(() => {
  if (!gitHost.value) return '';
  switch (gitHost.value.type) {
    case 'github': return 'GitHub';
    case 'gitlab': return 'GitLab';
    case 'bitbucket': return 'Bitbucket';
  }
});

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
    tracks.value = response.tracks;
    projectPath.value = response.projectPath;
    gitHost.value = response.gitHost;

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

async function handleStopServer() {
  if (confirm('Stop the web server?')) {
    try {
      await stopServer();
      // Show message since the server will stop
      document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:system-ui;color:#666;">Server stopped. You can close this tab.</div>';
    } catch {
      // Server likely already stopped
    }
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
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h1 class="text-3xl font-bold text-gray-900">{{ projectName }}</h1>
          <a
            v-if="gitHost"
            :href="gitHost.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-gray-400 hover:text-gray-600 transition-colors"
            :title="'View on ' + gitHostLabel"
          >
          <!-- GitHub icon -->
          <svg v-if="gitHost.type === 'github'" class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          <!-- GitLab icon -->
          <svg v-else-if="gitHost.type === 'gitlab'" class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"/>
          </svg>
          <!-- Bitbucket icon -->
          <svg v-else-if="gitHost.type === 'bitbucket'" class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M.778 1.213a.768.768 0 0 0-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 0 0 .77-.646l3.27-20.03a.768.768 0 0 0-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z"/>
          </svg>
        </a>
        </div>
        <button
          @click="handleStopServer"
          class="text-red-400 hover:text-red-600 text-sm transition-colors"
          title="Stop web server"
        >
          Stop Server
        </button>
      </div>
      <h2 class="text-lg text-gray-500 font-mono mt-1">{{ projectPath }}</h2>
      <details class="mt-2 text-sm text-gray-600">
        <summary class="cursor-pointer hover:text-gray-800 select-none">Quick Start</summary>
        <div class="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p class="mb-2">Create tasks with summaries describing what to do, then let the agent work through them:</p>
          <code class="block bg-gray-800 text-green-400 p-2 rounded text-xs font-mono">claude --dangerously-skip-permissions "Start the next track/task, commit the result and then continue on to the next until all are done"</code>
          <code class="block bg-gray-800 text-green-400 p-2 rounded text-xs font-mono">claude "Fetch task NCxRSqUW and then switch to plan mode and help me plan it"</code>
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
