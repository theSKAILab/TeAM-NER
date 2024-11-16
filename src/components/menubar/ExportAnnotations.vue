
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
      } else {
        ////console.log('Export cancelled or name not provided.');
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
              let history = entity[9] || [];  // Ensure history is initialized

              const state = entity[5] === 2 ? "Rejected" :
                            entity[5] === 1 ? "Accepted" : "Candidate";

              const newHistoryEntry = [
                state,
                this.formatDate(new Date()),
                annotator,
                entity[3], // The class or label from the entity
              ];
              console.log(state, history.length)
              // Fixes duplicate entries in history (only add if no history OR state changes)
              if (history.length == 0 && state == "Accepted") {
                history.push([
                  "Candidate",
                  this.formatDate(new Date()),
                  annotator,
                  entity[3], // The class or label from the entity
                ])
                history.push(newHistoryEntry); // add to file history
              } else if ((state == "Candidate" && history.length == 0) || (history[history.length-1][0] != state))  {
                history.push(newHistoryEntry); // add to file history
              }

              return [
                entity[1], // start position
                entity[2], // end position
                history.map(h => [h[0], h[1], h[2], h[3]]) // history array
              ];
            }): []
          }
        ])
      };

      const jsonStr = JSON.stringify(output, null, 2); // Pretty print JSON
      try {
        await exportFile(jsonStr, `${annotator}-annotations.json`);
        ////console.log("Export successful");
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
