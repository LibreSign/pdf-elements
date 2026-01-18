<template>
  <div class="signature-box">
    <svg
      v-if="object.icon === 'signature'"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="currentColor"
      class="icon"
    >
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
    <span class="label">{{ object.label }}</span>
  </div>
</template>

<script>
export default {
  name: 'SignatureBox',
  props: {
    object: {
      type: Object,
      required: true,
    },
    fontSize: {
      type: String,
      default: '14px',
    },
  },
}
</script>

<style scoped>
.signature-box {
  box-sizing: border-box;
  border: 2px dashed #2563eb;
  background: rgba(37, 99, 235, 0.08);
  color: #1f2937;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.6em 0.8em;
  border-radius: 6px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06);
  pointer-events: auto;
  width: 100%;
  height: 100%;
  line-height: 1.2;
}
.icon {
  margin-right: 0.4em;
  flex-shrink: 0;
}
.label {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
