<template>
  <div
    class="fullscreen"
    @dragover.prevent="onDragEnter"
    @dragenter="onDragEnter"
    @dragleave.self="onDragLeave"
    @drop.stop.prevent="onDrop"
    style="overflow-y:scroll;"
  >
    <div :style="{'pointer-events': overlayActive ? 'none' : 'auto'}">
      <q-layout view="hHh lpR fFf">
        <menu-bar @text-file-loaded="switchToPage('annotate')" @json-file-loaded="switchToPage('review')"/>
        <q-page-container>
          <start-page v-if="currentPage === 'start'" @text-file-loaded="switchToPage('annotate')" @json-file-loaded="switchToPage('review')"/>
          <annotation-page v-if="currentPage === 'annotate'" />
          <review-page v-if="currentPage === 'review'" />
        </q-page-container>
      </q-layout>
      <drag-n-drop-overlay :style="{'visibility': overlayActive && pendingFileDrop == null ? 'visible' : 'hidden'}"/>
      <exit-dialog :show="pendingFileDrop != null && currentPage != 'start'" @hide="pendingFileDrop = null" @confirm="processFileDrop()"/>
    </div>
  </div>
</template>

<script>
import MenuBar from "./components/toolbars/MenuBar.vue";
import StartPage from "./components/pages/StartPage.vue";
import AnnotationPage from "./components/pages/AnnotationPage.vue";
import ReviewPage from "./components/pages/ReviewPage.vue";
import DragNDropOverlay from "./components/etc/DragNDropOverlay.vue";
import ExitDialog from "./components/dialogs/ExitDialog.vue";
import { mapState, mapMutations } from "vuex";
import { useQuasar } from "quasar";

export default {
  name: "LayoutDefault",
  setup() {
    const $q = useQuasar();
    return {
      notify(icon, message, level) {
        $q.notify({
          icon,
          message,
          color: level,
          position: "top",
          timeout: 2000,
          actions: [
            {
              label: "Dismiss",
              color: "white",
            },
          ],
        });
      },
    };
  },
  data() {
    return {
      overlayActive: false,
      pendingFileDrop: null,
    };
  },
  components: {
    MenuBar,
    StartPage,
    AnnotationPage,
    ReviewPage,
    DragNDropOverlay,
    ExitDialog
  },
  computed: {
    ...mapState(["annotations", "classes", "currentPage"]),
  },
  methods: {
    ...mapMutations(["loadClasses", "loadAnnotations", "setInputSentences", "clearAllAnnotations", "resetIndex", "setCurrentPage"]),
    switchToPage(page) {
      this.setCurrentPage(page);
    },
    onDragEnter() {
      this.overlayActive = true;
    },
    onDragLeave() {
      this.overlayActive = false;
    },
    onDrop(event) {
      this.overlayActive = false;
      this.pendingFileDrop = event.dataTransfer.files[0]
      if (this.currentPage == "start")  this.processFileDrop();
    },
    processFileDrop() {
      let fileType = this.pendingFileDrop.name.split('.').pop();
      let reader = new FileReader();
      reader.onload = (event) => {
        let file = event.target.result;
        this.setInputSentences(file);
        this.clearAllAnnotations();
        this.resetIndex();
        if (fileType === "txt") {
          this.switchToPage('annotate');
        }
        else if (fileType === "json") {
          this.switchToPage('review');
        }
        else {
          alert('Please upload either a .txt or a .json file.');
        }
      };
      reader.readAsText(this.pendingFileDrop);
      this.pendingFileDrop = null;
    },
  },
};
</script>
