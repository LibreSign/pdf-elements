<template>
  <div v-if="isOpen" class="modal-overlay" @click="close">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>Elements Details</h2>
        <button class="close-btn" @click="close">×</button>
      </div>

      <div v-if="elements.length === 0" class="empty-state">
        <p>No elements added yet.</p>
        <p>Click "Add Signature" to add elements to your PDF.</p>
      </div>

      <div v-else class="elements-list">
        <table>
          <thead>
            <tr>
              <th>Document</th>
              <th>Page</th>
              <th>Type</th>
              <th>Label</th>
              <th>ID</th>
              <th>Position</th>
              <th>Size</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in elements" :key="item.id" class="element-row">
              <td class="doc-name">{{ item.docName }}</td>
              <td class="page-num">{{ item.pageNum }}</td>
              <td class="type-badge">
                <span :class="`badge badge-${item.type}`">{{ item.type || 'custom' }}</span>
              </td>
              <td class="label">{{ item.label || '—' }}</td>
              <td class="id" :title="item.id">{{ item.id.substring(0, 12) }}…</td>
              <td class="position">{{ item.x }}, {{ item.y }}</td>
              <td class="size">{{ item.width }}×{{ item.height }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-footer">
        <p class="info-text">
          <strong>How to integrate:</strong> Call <code>pdf.getAllObjects()</code> to get all elements
          or access individual document data via <code>pdf.pdfDocuments</code>
        </p>
        <button class="btn" @click="close">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ElementsViewer',
  props: {
    isOpen: {
      type: Boolean,
      default: false,
    },
    documents: {
      type: Array,
      default: () => [],
    },
  },
  computed: {
    elements() {
      const result = []

      for (let docIdx = 0; docIdx < this.documents.length; docIdx++) {
        const doc = this.documents[docIdx]

        if (!doc.allObjects) continue

        for (let pageIdx = 0; pageIdx < doc.allObjects.length; pageIdx++) {
          const pageObjects = doc.allObjects[pageIdx]

          for (const obj of pageObjects) {
            result.push({
              docName: doc.name || `Document ${docIdx + 1}`,
              pageNum: pageIdx + 1,
              type: obj.type || 'custom',
              label: obj.label || '',
              id: obj.id,
              x: Math.round(obj.x),
              y: Math.round(obj.y),
              width: Math.round(obj.width),
              height: Math.round(obj.height),
            })
          }
        }
      }

      return result
    },
  },
  methods: {
    close() {
      this.$emit('close')
    },
  },
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 200ms ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 900px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 120ms ease;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

.elements-list {
  overflow-x: auto;
  flex: 1;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

thead {
  background: #f9fafb;
  position: sticky;
  top: 0;
  z-index: 10;
}

th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

td {
  padding: 12px 16px;
  color: #1f2937;
  border-bottom: 1px solid #f3f4f6;
}

tbody tr:hover {
  background: #f9fafb;
}

.doc-name {
  font-weight: 500;
  color: #111827;
}

.page-num {
  text-align: center;
  font-weight: 600;
  color: #2563eb;
}

.type-badge {
  text-align: center;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.badge-signature {
  background: #dbeafe;
  color: #1e40af;
}

.badge-text {
  background: #d1fae5;
  color: #065f46;
}

.badge-date {
  background: #fef3c7;
  color: #92400e;
}

.badge-checkbox {
  background: #e9d5ff;
  color: #6b21a8;
}

.badge-custom {
  background: #e5e7eb;
  color: #374151;
}

.label {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.id {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #6b7280;
}

.position,
.size {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #4b5563;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #6b7280;
}

.empty-state p {
  margin: 8px 0;
  font-size: 14px;
}

.empty-state p:first-child {
  font-weight: 500;
  color: #374151;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.info-text {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #4b5563;
  line-height: 1.5;
}

.info-text code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  color: #111827;
  font-weight: 500;
}

.btn {
  border: 1px solid #111827;
  background: #111827;
  color: #ffffff;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 120ms ease;
}

.btn:hover {
  background: #0b1220;
}
</style>
