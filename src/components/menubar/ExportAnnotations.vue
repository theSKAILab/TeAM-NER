
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
        console.log('Export cancelled or name not provided.');
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
            entities: annotation.entities.map(entity => {
              console.log(entity)
              let history = entity[9] || [["Candidate", this.formatDate(new Date()), annotator, entity[3]]];  // Ensure history is initialized

              switch (entity[5]) {
                case 2:
                  history.push(["Rejected", this.formatDate(new Date()), annotator, entity[3]]);
                  break;
                case 1:
                  history.push(["Accepted", this.formatDate(new Date()), annotator, entity[3]]);
                  break;
              }

              return [
                entity[1], // start position
                entity[2], // end position
                history.map(h => [h[0], h[1], h[2], h[3]]) // history array
              ];
            })
          }
        ])
      };

      const jsonStr = JSON.stringify(output, null, 2); // Pretty print JSON
      try {
        await exportFile(jsonStr, `${annotator}-annotations.json`);
        console.log("Export successful");
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
