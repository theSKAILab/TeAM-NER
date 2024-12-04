
<template>
  <q-item clickable v-close-popup @click="promptForNameAndExport()">
    <q-item-section>Export</q-item-section>
  </q-item>
</template>
<script>
import { mapState } from 'vuex'
import { exportFile } from './utils'

export default {
  name: 'ExportAnnotations',
  computed: {
    ...mapState(['annotations', 'classes']),
  },
  methods: {
    promptForNameAndExport() {
      const annotator = prompt('Please enter your name for the annotations export:');
      if (annotator) {
        this.generateJSONExport(annotator);
      }
    },

    async generateJSONExport(annotator) {
      const output = {
        classes: this.classes.map((c, index) => ({
          id: index + 1,
          name: c.name,
          color: c.color
        })),
        annotations: this.annotations.map(annotation => [
          annotation.text,  // Text directly in the array
          {
            entities: annotation.entities.length? annotation.entities.map(entity => {
              //annotation.start, annotation.end, _class, annotation.ogNLP, annotation.ogNLP, true, annotation.name, annotation.status, annotation.annotationHistory, false, annotation.isSymbolActive
              let history = entity.history || [];  // Ensure history is initialized
              
              const newHistoryEntry = [
                entity.status,
                this.formatDate(new Date()),
                annotator,
                entity.label, // The class or label from the entity
              ];
              if (entity.userHasToggled && history[history.length-1][2] != annotator) history.push([history[history.length-1][0],this.formatDate(new Date()),annotator,history[history.length-1][3]]) //  Current reviewer "concurs" with previous reviewer and is not the same as previous reviewer
                else if ((entity.status == "Candidate" || entity.status == "Suggested")&& history.length == 0)  history.push(newHistoryEntry); // New annotation in Annotate or Review mode
                else if (history[history.length-1][0] != entity.status) history.push(newHistoryEntry); // Status change from previous entry in history

              return [
                entity.start, // start position
                entity.end, // end position
                history.map(h => [h[0], h[1], h[2], h[3]]) // history array
              ];
            }): []
          }
        ])
      };

      const jsonStr = JSON.stringify(output, null, 2); // Pretty print JSON
      try {
        await exportFile(jsonStr, `${annotator}-annotations.json`);
      } catch (error) {
        console.error("Export failed:", error);
      }
    },
	formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      return `${year}-${month}-${day}~${hours}:${minutes}:${seconds}`;
    },
  },
}
</script>
