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

        <div class="q-ml-md q-mr-lg cursor-pointer non-selectable" v-if="installablePWA">
          <span class="q-menu-open-button" @click="deferredPrompt.prompt()">
                Install Application
          </span>
        </div>

        <!-- Theme Mode Switch -->
        <q-icon style="margin-top: 5px" color="white" :name="$q.dark.isActive ? 'fas fa-sun' : 'fas fa-moon'" class="cursor-pointer" @click="toggleDarkMode" />
      </div>
      <div>
        <span class="q-ml-sm">
          <strong v-if="$store.state.currentPage === 'annotate'" style="color: rgb(207, 255, 207)">
            | Annotation Mode |
          </strong>
          <strong v-else-if="$store.state.currentPage === 'review'" style="color: rgb(255, 255, 128)">
            | Review Mode |
          </strong>
          <strong v-else style="color: rgb(207, 255, 207)">
            | ISSUE WITH MENU BAR AND CURENT PAGE |
          </strong>
        </span>
      </div>
      <div class="q-ml-md cursor-pointer non-selectable">
        <span>
          File
        </span>
        <q-menu style="border-radius: 0.5rem;">
          <q-list dense style="min-width: 100px">
            <q-item clickable v-close-popup @click="pendingClick = $refs.file">
              <q-item-section>Open</q-item-section>
              <input @change="openFile" type="file" ref="file" accept=".txt" style="display: none" />
            </q-item>
            <export-annotations />
          </q-list>
        </q-menu>
      </div>

      <div class="q-ml-md cursor-pointer non-selectable">
        <span>
          Edit
        </span>
        <q-menu style="border-radius: 0.5rem;">
          <q-list dense style="min-width: 100px">
            <q-item clickable v-close-popup @click="this.emitter.emit('undo')">
              <q-item-section>Undo</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="this.emitter.emit('reset-annotations')">
              <q-item-section>Reset Annotations</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </div>

      <div class="q-ml-md cursor-pointer non-selectable">
        <span>Help</span>

        <q-menu style="border-radius: 0.5rem;">
          <q-list dense style="min-width: 100px">
            <q-item clickable v-close-popup href="https://github.com/tecoholic/ner-annotator/discussions"
              target="_blank">
              <q-item-section>
                Forum
              </q-item-section>
            </q-item>
            <q-item clickable v-close-popup href="https://github.com/tecoholic/ner-annotator/issues" target="_blank">
              Report Issue
            </q-item>
            <q-separator />
            <q-item clickable v-close-popup @click="showAbout = true">
              <q-item-section>About</q-item-section>
            </q-item>
          </q-list>
        </q-menu>

        <about-dialog :show="showAbout" @hide="showAbout = false" />
      </div>

      <q-space />

      <q-icon style="margin-top: 5px" color="white" :name="$q.dark.isActive ? 'fas fa-sun' : 'fas fa-moon'"
        class="cursor-pointer" @click="toggleDarkMode" />

    </div>
  </q-header>

  <q-dialog v-model="promptForProject" persistent>
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Project Name</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-input dense v-model="newProjectName" autofocus @keyup.enter="promptForProject = false" />
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn flat label="Create Project" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <exit-dialog :show="pendingClick != null" @hide="pendingClick = null" @confirm="pendingClick.click()" />
</template>

<script>
import ExportAnnotations from "./ExportAnnotations.vue";
import { mapState, mapMutations } from "vuex";
import { useQuasar } from "quasar";
import AboutDialog from "../etc/AboutDialog.vue";
import ExitDialog from "../etc/ExitDialog.vue";
import OpenDialog from "../etc/OpenDialog.vue";
import { getCurrentWebview } from '@tauri-apps/api/webview';

export default {
  components: { ExportAnnotations, AboutDialog, ExitDialog, OpenDialog },
  name: "MenuBar",
  data: function () {
    return {
      promptForProject: false,
      newProjectName: "",
      showAbout: false,
      pendingClose: null,
      pendingOpen: null,
      installablePWA: false,
      deferredPrompt: null, 
    };
  },
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
      pendingClick: null
    };
  },
  computed: {
    ...mapState(["annotations", "classes","fileName","lastSavedTimestamp"]),
  },
  methods: {
    ...mapMutations(["loadClasses", "loadAnnotations", "setInputSentences", "clearAllAnnotations", "resetIndex"]),
    // Funtion that exports the tags to a JSON file
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
        } catch (e) {
          this.notify("fas fa-exclamation-circle", "Invalid file", "red-6");
        }
      };
      filereader.readAsText(file);
    },
    openFile: function (e) {
      let file = e.target.files[0];
      let filereader = new FileReader();
      filereader.onload = (ev) => {
        this.setInputSentences(ev.target.result);
        this.clearAllAnnotations();
      };
      filereader.readAsText(file);
      this.resetIndex();
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
        } catch (e) {
          this.notify("fas fa-exclamation-circle", "Invalid file", "red-6");
        }
      };
      filereader.readAsText(file);
    },
    toggleDarkMode: function () {
      this.$q.dark.toggle();
    },
    menuKeyBind(e) {
      if (e.ctrlKey) e.preventDefault();
      // if (e.key == "o" && e.ctrlKey) {this.open()};
      // if (e.key == "s" && e.ctrlKey) {return};
      // if (e.key == "b" && e.ctrlKey) {this.close()};
    }
  },
};
</script>
