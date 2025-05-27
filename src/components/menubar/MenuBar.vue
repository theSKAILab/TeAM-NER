<template>
  <q-header bordered>
      <div class="q-pa-sm q-pl-md row items-center">

        <!-- File -->
        <div class="cursor-pointer non-selectable">
          <span class="q-menu-open-button">
            File
          </span>
          <q-menu>
            <q-list dense style="min-width: 100px">
              <q-item clickable v-close-popup @click="$store.state.currentPage != 'start'? pendingOpen = $refs.file: $refs.file.click()">
                <q-item-section>Open...</q-item-section>
                <input @change="(e) => {onFileSelected(e)}" type="file" ref="file" accept=".txt,.json" id="fileupload" style="display: none"/>
              </q-item>
              <export-annotations />
              <q-item clickable v-close-popup @click="pendingClose = true;" :class="$store.state.currentPage == 'start'? 'disabled': ''">
                <q-item-section >Close</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>

        <!-- Edit -->
        <div class="q-ml-md cursor-pointer non-selectable">
          <span class="q-menu-open-button">
            Edit
          </span>
          <q-menu>
            <q-list dense style="min-width: 100px">
              <q-item clickable v-close-popup @click="this.emitter.emit('undo')" :class="$store.state.currentPage == 'start'? 'disabled': ''">
                <q-item-section>Undo</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="this.emitter.emit('reset-annotations')" :class="$store.state.currentPage == 'start'? 'disabled': ''">
                <q-item-section>Undo All</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>

        <!-- Annotator -->
        <div class="q-ml-md cursor-pointer non-selectable">
          <span class="q-menu-open-button">
            Annotator
          </span>
          <q-menu>
            <q-list dense style="min-width: 100px">
              <q-item clickable v-close-popup @click="() => {$store.state.currentPage == 'annotate'? this.setCurrentPage('review'): this.setCurrentPage('annotate')}" :class="$store.state.currentPage == 'start'? 'disabled': ''">
                <q-item-section>Change Mode</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>

        <!-- Help -->
        <div class="q-ml-md cursor-pointer non-selectable">
          <span class="q-menu-open-button">Help</span>
          <q-menu>
            <q-list dense style="min-width: 100px">
              <q-item clickable v-close-popup href="https://github.com/theSKAILab/TeAM-NER/issues" target="_blank">
                Report Issue
              </q-item>
              <q-item clickable v-close-popup @click="showAbout = true">
                <q-item-section>About</q-item-section>
              </q-item>
            </q-list>
          </q-menu>

          <about-dialog :show="showAbout" @hide="showAbout = false" />
        </div>

        <q-space />

        <!-- Theme Mode Switch -->
        <q-icon style="margin-top: 5px" color="white" :name="$q.dark.isActive ? 'fas fa-sun' : 'fas fa-moon'" class="cursor-pointer" @click="toggleDarkMode" />
      </div>
  </q-header>

  <open-dialog :show="pendingOpen != null" @hide="pendingOpen = null" @confirm="pendingOpen.click()" />
  <exit-dialog :show="pendingClose != null" @hide="pendingClose = null" @confirm="() => {this.setCurrentPage('start')}" />
</template>

<script>
import ExportAnnotations from "./ExportAnnotations.vue";
import { mapState, mapMutations } from "vuex";
import { exportFile } from "./utils";
import { useQuasar } from "quasar";
import AboutDialog from "../etc/AboutDialog.vue";
import ExitDialog from "../etc/ExitDialog.vue";
import OpenDialog from "../etc/OpenDialog.vue";
import { getCurrentWebview } from '@tauri-apps/api/webview';

export default {
  components: { ExportAnnotations, AboutDialog, ExitDialog, OpenDialog },
  name: "MenuBar",
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
  data: function () {
    return {
      promptForProject: false,
      newProjectName: "",
      showAbout: false,
      pendingClose: null,
      pendingOpen: null,
    };
  },
  computed: {
    ...mapState(["annotations", "classes","fileName","lastSavedTimestamp"]),
  },
  methods: {
    ...mapMutations(["loadClasses", "loadAnnotations", "setInputSentences", "clearAllAnnotations", "resetIndex", "setCurrentPage"]),
    // Funtion that exports the tags to a JSON file
    getCurrentWebview() {
      return getCurrentWebview();
    },
    exportTags: async function () {
      await exportFile(JSON.stringify(this.classes), "tags.json");
    },
    importTags: function (e) {
      let file = e.target.files[0];
      let filereader = new FileReader();
      filereader.onload = (ev) => {
        try {
          this.loadClasses(JSON.parse(ev.target.result));
          this.notify(
            "fa fa-check",
            `${this.classes.length} Tags imported successfully`,
            "positive"
          );
        } catch (_) {
          this.notify("fas fa-exclamation-circle", "Invalid file", "red-6");
        }
      };
      filereader.readAsText(file);
    },
    onFileSelected(file) {
      // onFileSelected() is called if the user clicks and manually
      //    selects a file. If they drag and drop, that is handled in
      //    App.vue. If you modify this function, you may also want to
      //    modify App#onDrop(), App#processFileDrop(), and
      //    LoadTextFile#onFileSelected() to match
      file = file.target.files[0];
      this.$store.fileName = file.name;
      let fileType = file.name.split('.').pop();
      this.$store.lastSavedTimestamp = null;
      try {
        let reader = new FileReader();
        reader.readAsText(file);
        reader.addEventListener("load", (event) => {
          this.clearAllAnnotations();
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
    importAnnotations: function (e) {
      let file = e.target.files[0];
      let filereader = new FileReader();
      filereader.onload = (ev) => {
        try {
          this.loadAnnotations(JSON.parse(ev.target.result));
          this.notify(
            "fa fa-check",
            `Annotations imported successfully`,
            "positive"
          );
        } catch (_) {
          this.notify("fas fa-exclamation-circle", "Invalid file", "red-6");
        }
      };
      filereader.readAsText(file);
    },
    toggleDarkMode: function () {
      this.$q.dark.toggle();
    },
  },
};
</script>
