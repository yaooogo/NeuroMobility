<script setup>
import { computed } from "vue";

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [Number, String],
    default: 16
  },
  width: {
    type: [Number, String],
    default: null
  },
  height: {
    type: [Number, String],
    default: null
  },
  label: {
    type: String,
    default: ""
  }
});

const iconModules = import.meta.glob("@assets/icons/**/*.svg", {
  eager: true,
  import: "default"
});

function normalizeName(value) {
  return String(value || "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\\/g, "/")
    .replace(/\.svg$/i, "");
}

function resolveIconComponent(name) {
  const normalizedName = normalizeName(name);

  return Object.entries(iconModules).find(([filePath]) => {
    const relativePath = filePath
      .replace(/^.*?assets\/icons\//, "")
      .replace(/\.svg$/i, "");

    return relativePath === normalizedName;
  })?.[1];
}

const iconComponent = computed(() => resolveIconComponent(props.name));

const iconStyle = computed(() => {
  const resolvedWidth = props.width ?? props.size;
  const resolvedHeight = props.height ?? props.size;

  return {
    width: `${resolvedWidth}px`,
    height: `${resolvedHeight}px`
  };
});
</script>

<template>
  <component
    :is="iconComponent"
    v-if="iconComponent"
    class="svg-icon"
    :style="iconStyle"
    :aria-label="label || name"
    :role="label ? 'img' : 'presentation'"
  />
</template>

<style scoped lang="scss">
.svg-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
  fill: currentColor;
}
</style>
