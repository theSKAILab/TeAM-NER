<template>
  <div class="q-mx-auto q-my-xl column items-center justify-center">
    <img src="@/assets/umaine.png" alt="UMaine Logo" class="q-mb-sm" width="550px"/>
    <h5 class="text-center text-h4 q-mb-none text-bold">Spatial Knowledge and Artificial Intelligence Lab</h5>
    <h6 class="text-center text-h4 q-mb-none q-mt-lg">Text Annotation Review and Tagging (TART)</h6>
    <h6 class="text-center text-h6 q-mb-none q-mt-xl text-italic">To Start, Open a File from the 'File' Menu</h6>
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
    toggleDarkMode() {
      this.$q.dark.toggle();
    },
  },
};
</script>
