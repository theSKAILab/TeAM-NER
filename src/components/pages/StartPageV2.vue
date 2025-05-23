<template>
  <div class="q-mx-auto q-my-xl column items-center">
    <img src="@/assets/umaine.png" alt="UMaine Logo" class="q-mb-md" width="550px"/>
    <h5 class="text-center text-h4 q-mb-sm">Spatial Knowledge and Artificial Intelligence Lab</h5>
    <h6 class="text-center text-h5 q-mb-sm">Text Annotation Review and Tagging (TART)</h6>
    <div class="q-my-xl q-py-md" style="width: 300px;">
      <q-file
        v-model="textFile"
        accept=".txt,.json"
        @rejected="fileSelectionError"
        filled
        @update:model-value="onFileSelected"
        label="Open a text or json file to begin"
        :bg-color="$q.dark.isActive ? 'black-1' : 'light-blue-1'"
      >
      <template v-slot:prepend>
        <q-icon name="fas fa-upload" />
      </template>
      </q-file>
    </div>
  </div>
</template>

<script>
import { mapMutations } from "vuex";

export default {
  name: "StartPage",
  emits: ["text-file-loaded", "json-file-loaded"],
  data() {
    return {
      textFile: null,
    };
  },
  methods: {
    ...mapMutations(["setInputSentences"]),
    onFileSelected(file) {
      // onFileSelected() is called if the user clicks and manually
      //    selects a file. If they drag and drop, that is handled in
      //    App.vue. If you modify this function, you may also want to
      //    modify App#onDrop(), App#processFileDrop(), and
      //    LoadTextFile#onFileSelected() to match
      let fileType = file.name.split('.').pop();
      try {
        let reader = new FileReader();
        reader.readAsText(file);
        reader.addEventListener("load", (event) => {
          this.setInputSentences(event.target.result);
          if (fileType === "txt") {
            this.$emit("text-file-loaded");
          }
          else if (fileType === "json") {
            this.$emit("json-file-loaded");
          }
          else {
            alert('Please upload either a .txt or a .json file.');
          }
        });
      } catch (e) {
        this.fileSelectionError();
      }
    },
    fileSelectionError() {
      this.$q.notify({
        icon: "fas fa-exclamation-circle",
        message: "Invalid file",
        color: "red-6",
        position: "top",
        timeout: 2000,
        actions: [{label: "Dismiss", color: "white"}],
      });
    },
    toggleDarkMode() {
      this.$q.dark.toggle();
    },
  },
};
</script>
