<template>
  <!-- component -->
  <div class="antialiased">
    <h1 class="max-w-screen-sm px-3 mx-auto va-h5">Discussion</h1>
    <q-scroll-area
      class="w-full h-screen max-w-screen-sm max-h-screen p-4 mx-auto overflow-y-auto"
    >
      <div class="space-y-4">
        <div
          class="flex"
          :key="comment.id"
          v-for="(comment, i) in userComments"
        >
          <div class="flex-shrink-0 mr-3">
            <q-avatar size="lg">
              <q-img
                no-spinner
                loading="eager"
                class="bg-grey-400"
                :src="comment.user.imageUrl"
                alt=""
              />
            </q-avatar>
          </div>
          <div
            class="flex-1 px-4 py-2 leading-relaxed border border-gray-700 border-solid rounded-lg sm:px-6 sm:py-4"
          >
            <strong>{{ comment.user.name }}</strong>
            <span class="ml-3 text-xs text-gray-400">
              {{ timeAgoStamp(comment.createdAt, 'facebook', 'HH MMM, YYYY') }}
            </span>
            <p class="text-sm">
              {{ comment.text }}
            </p>

            <h4
              class="my-5 text-xs font-bold tracking-wide text-gray-400 uppercase"
              v-if="comment.replies_count && comment.expanded"
            >
              {{
                comment.expanded
                  ? 'Replies'
                  : `${comment.replies_count} Replies`
              }}
            </h4>
            <q-btn
              dense
              flat
              no-caps
              class="text-sm font-semibold text-gray-500"
              v-else-if="comment.replies_count"
              @click="comment.expanded = !comment.expanded"
            >
              {{ `${comment.replies_count} Replies` }}
            </q-btn>

            <div
              class="space-y-4"
              v-if="comment.replies.length && (i === 0 || comment.expanded)"
            >
              <div
                class="flex"
                :key="reply.id"
                v-for="reply in comment.replies"
              >
                <div class="flex-shrink-0 mr-3">
                  <q-avatar size="lg">
                    <q-img
                      no-spinner
                      loading="eager"
                      class="bg-grey-400"
                      :src="reply.user.imageUrl"
                      alt=""
                    />
                  </q-avatar>
                </div>
                <div
                  class="flex-1 px-4 py-2 leading-relaxed rounded-lg sm:px-6 sm:py-4"
                >
                  <strong>{{ reply.user.name }}</strong>
                  <span class="ml-3 text-xs text-gray-400">
                    {{
                      timeAgoStamp(reply.createdAt, 'facebook', 'HH MMM, YYYY')
                    }}
                  </span>
                  <p class="text-xs sm:text-sm">
                    {{ reply.text }}
                  </p>
                </div>
              </div>
            </div>

            <div class="text-center">
              <q-btn
                dense
                flat
                no-caps
                class="text-sm font-semibold text-gray-500"
                v-if="
                  comment.expanded &&
                  comment.replies_count > comment.replies.length
                "
              >
                Show More
              </q-btn>
            </div>
          </div>
        </div>
      </div>
    </q-scroll-area>
  </div>
</template>

<script setup lang="ts">
import { userComments } from 'src/utils/dummy';
import { timeAgoStamp } from 'src/utils/helpers';
</script>
