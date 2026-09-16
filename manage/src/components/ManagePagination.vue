<script setup>
import { computed } from "vue";

const props = defineProps({
  page: {
    type: Number,
    default: 1
  },
  lastPage: {
    type: Number,
    default: 1
  },
  total: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(["change"]);

function buildPageItems(currentPage, lastPage) {
  if (lastPage <= 7) {
    return Array.from({ length: lastPage }, (_, index) => ({
      type: "page",
      value: index + 1,
      key: `page-${index + 1}`
    }));
  }

  if (currentPage <= 4) {
    return [
      1,
      2,
      3,
      4,
      5,
      { type: "ellipsis", key: "ellipsis-right" },
      lastPage
    ].map((item) => (typeof item === "number"
      ? { type: "page", value: item, key: `page-${item}` }
      : item));
  }

  if (currentPage >= lastPage - 3) {
    return [
      1,
      { type: "ellipsis", key: "ellipsis-left" },
      lastPage - 4,
      lastPage - 3,
      lastPage - 2,
      lastPage - 1,
      lastPage
    ].map((item) => (typeof item === "number"
      ? { type: "page", value: item, key: `page-${item}` }
      : item));
  }

  return [
    { type: "page", value: 1, key: "page-1" },
    { type: "ellipsis", key: "ellipsis-left" },
    { type: "page", value: currentPage - 1, key: `page-${currentPage - 1}` },
    { type: "page", value: currentPage, key: `page-${currentPage}` },
    { type: "page", value: currentPage + 1, key: `page-${currentPage + 1}` },
    { type: "ellipsis", key: "ellipsis-right" },
    { type: "page", value: lastPage, key: `page-${lastPage}` }
  ];
}

const normalizedLastPage = computed(() => Math.max(Number(props.lastPage || 1), 1));
const normalizedPage = computed(() => {
  const page = Math.max(Number(props.page || 1), 1);
  return Math.min(page, normalizedLastPage.value);
});
const pageItems = computed(() => buildPageItems(normalizedPage.value, normalizedLastPage.value));

function handlePageChange(page) {
  const nextPage = Number(page || 1);
  if (nextPage < 1 || nextPage > normalizedLastPage.value || nextPage === normalizedPage.value) {
    return;
  }

  emit("change", nextPage);
}
</script>

<template>
  <div class="pagination-bar">
    <button class="page-button" type="button" :disabled="normalizedPage <= 1" @click="handlePageChange(normalizedPage - 1)">
      上一页
    </button>
    <template v-for="item in pageItems" :key="item.key">
      <button
        v-if="item.type === 'page'"
        class="page-button"
        :class="{ 'page-button--active': item.value === normalizedPage }"
        type="button"
        @click="handlePageChange(item.value)"
      >
        {{ item.value }}
      </button>
      <span v-else class="page-ellipsis">...</span>
    </template>
    <button
      class="page-button"
      type="button"
      :disabled="normalizedPage >= normalizedLastPage"
      @click="handlePageChange(normalizedPage + 1)"
    >
      下一页
    </button>
    <span class="pagination-meta">第 {{ normalizedPage }} / {{ normalizedLastPage }} 页，共 {{ total }} 条</span>
  </div>
</template>
