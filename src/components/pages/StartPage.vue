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
    ...mapMutations(["setInputSentences","clearAllAnnotations"]),
  },
};
</script>
