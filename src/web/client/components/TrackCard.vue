<script setup lang="ts">
import { ref } from 'vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { TrackWithDetails } from '../api';
import StatusBadge from './StatusBadge.vue';

dayjs.extend(relativeTime);

function formatRelativeTime(timestamp: string | null): string {
  if (!timestamp) return '';
  return dayjs(timestamp).fromNow();
}

const props = defineProps<{
  track: TrackWithDetails;
  allTracks: TrackWithDetails[];
  indent?: number;
  animationClass?: string;
  viewingArchived?: boolean;
}>();

const emit = defineEmits<{
  edit: [track: TrackWithDetails];
  addChild: [parentId: string];
  moveUp: [trackId: string];
  moveDown: [trackId: string];
  archive: [trackId: string];
  unarchive: [trackId: string];
  delete: [trackId: string];
}>();

// Statuses that can be archived
const ARCHIVABLE_STATUSES = ['done', 'on_hold', 'superseded'];

function getTrackTitle(id: string): string {
  const track = props.allTracks.find((t) => t.id === id);
  return track?.title || id;
}

// Click-to-copy functionality
const copiedId = ref(false);
const copiedTitle = ref(false);

async function copyToClipboard(text: string, type: 'id' | 'title') {
  try {
    await navigator.clipboard.writeText(text);
    if (type === 'id') {
      copiedId.value = true;
      setTimeout(() => (copiedId.value = false), 1500);
    } else {
      copiedTitle.value = true;
      setTimeout(() => (copiedTitle.value = false), 1500);
    }
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
</script>

<template>
  <div :class="['bg-white rounded-lg shadow p-4', indent && indent > 0 ? 'ml-6 border-l-2 border-gray-200' : '', animationClass]">
    <div class="flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <!-- Header row -->
        <div class="flex items-center gap-2 flex-wrap">
          <span
            @click="copyToClipboard(track.id, 'id')"
            :class="[
              'text-xs font-mono cursor-pointer hover:text-blue-600 transition-colors',
              copiedId ? 'text-green-600' : 'text-gray-400'
            ]"
            :title="copiedId ? 'Copied!' : 'Click to copy ID'"
          >
            {{ copiedId ? '✓ ' : '' }}{{ track.id }}
          </span>
          <StatusBadge :status="track.status" />
          <span class="text-xs text-gray-400">[{{ track.kind }}]</span>
          <span v-if="track.worktree" class="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
            @{{ track.worktree }}
          </span>
        </div>

        <!-- Title -->
        <h3
          @click="copyToClipboard(track.title, 'title')"
          :class="[
            'font-semibold mt-1 cursor-pointer hover:text-blue-600 transition-colors',
            indent === 0 ? 'text-lg' : 'text-base',
            copiedTitle ? 'text-green-600' : ''
          ]"
          :title="copiedTitle ? 'Copied!' : 'Click to copy title'"
        >
          {{ copiedTitle ? '✓ ' : '' }}{{ track.title }}
        </h3>

        <!-- Summary -->
        <p v-if="track.summary" class="text-gray-600 text-sm mt-1">
          {{ track.summary }}
        </p>

        <!-- Next prompt -->
        <p v-if="track.next_prompt" class="text-gray-500 text-sm mt-1 italic">
          <span class="font-medium not-italic">Next:</span> {{ track.next_prompt }}
        </p>

        <!-- Files -->
        <div v-if="track.files.length > 0" class="mt-2 flex flex-wrap gap-1">
          <span class="text-xs text-gray-400">Files:</span>
          <span
            v-for="file in track.files"
            :key="file"
            class="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono"
          >
            {{ file }}
          </span>
        </div>

        <!-- Dependencies -->
        <div v-if="track.blocks.length > 0" class="mt-1">
          <span class="text-xs text-blue-600">
            Blocks: {{ track.blocks.map(getTrackTitle).join(', ') }}
          </span>
        </div>
        <div v-if="track.blocked_by.length > 0" class="mt-1">
          <span class="text-xs text-yellow-600">
            Blocked by: {{ track.blocked_by.map(getTrackTitle).join(', ') }}
          </span>
        </div>

        <!-- Timestamps -->
        <div class="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
          <span :title="track.created_at">Created {{ formatRelativeTime(track.created_at) }}</span>
          <span :title="track.updated_at">Updated {{ formatRelativeTime(track.updated_at) }}</span>
          <span v-if="track.completed_at" :title="track.completed_at" class="text-green-600">
            Completed {{ formatRelativeTime(track.completed_at) }}
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1 ml-4 flex-shrink-0">
        <!-- Move buttons (hidden in archived view) -->
        <div v-if="!viewingArchived" class="flex flex-col gap-0.5 mr-2">
          <button
            @click="emit('moveUp', track.id)"
            class="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-0.5 rounded"
            title="Move up"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            @click="emit('moveDown', track.id)"
            class="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-0.5 rounded"
            title="Move down"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <!-- Normal view buttons -->
        <template v-if="!viewingArchived">
          <button
            @click="emit('edit', track)"
            class="text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded"
          >
            Edit
          </button>
          <button
            @click="emit('addChild', track.id)"
            class="text-sm text-green-600 hover:text-green-800 hover:bg-green-50 px-2 py-1 rounded"
          >
            + Child
          </button>
          <button
            v-if="ARCHIVABLE_STATUSES.includes(track.status)"
            @click="emit('archive', track.id)"
            class="text-sm text-amber-600 hover:text-amber-800 hover:bg-amber-50 px-2 py-1 rounded"
            title="Archive this track"
          >
            Archive
          </button>
        </template>

        <!-- Archived view buttons -->
        <template v-else>
          <button
            @click="emit('unarchive', track.id)"
            class="text-sm text-amber-600 hover:text-amber-800 hover:bg-amber-50 px-2 py-1 rounded"
          >
            Unarchive
          </button>
          <button
            @click="emit('delete', track.id)"
            class="text-sm text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded"
          >
            Delete
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
