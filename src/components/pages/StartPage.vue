<template>
  <q-icon
    :name="$q.dark.isActive ? 'fas fa-sun' : 'fas fa-moon'"
    :class="[
      $q.dark.isActive ? 'text-white' : 'text-black',
      'cursor-pointer fixed-top-right q-mx-xl q-my-lg text-h5',
    ]"
    @click="toggleDarkMode"
  />
  <div class="q-mx-auto q-my-xl" style="max-width: 600px">
    <h5 class="text-h4 q-mb-sm">NER Text Annotator</h5>
    <p :class="['text-subtitle1', $q.dark.isActive ? 'text-grey-4' : 'text-grey-7']">
      Annotate text for spaCy NER Model training
    </p>
    <div class="q-my-xl q-py-md" style="margin-top: 7rem">
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
      <p :class="['text-subtitle1 q-my-md', $q.dark.isActive ? 'text-grey-4' : 'text-grey-7']">
        Hint: You can also drag and drop files into this window!
      </p>
    </div>
  </div>
  <q-separator />
  <div :class="[$q.dark.isActive ? 'bg-dark' : 'bg-grey-1', 'q-pa-lg']">
    <div class="q-mx-auto" style="max-width: 600px">
      <h4 class="text-h4">
        How do I use the NER Annotator?
      </h4>
      <q-timeline>
        <q-timeline-entry
          subtitle="Step 1"
          title="Load your text file with contents to annotate"
          icon="fa fa-upload"
          color="yellow-8"
        >
          <q-img
            src="@/assets/step-1.png"
            spinner-color="white"
            class="rounded-borders"
            style="border: 1px solid #ccc; width: 80%"
          />
          <p class="text-subtitle1 q-my-md">Tips to prepare the text file</p>
          <ul>
            <li>Break your content in paragraphs or passages</li>
            <li>
              Maintain a consistent seperator between the passages. <br />
              Eg., newline, empty line or a text seperator like <code>---</code>
            </li>
            <li>
              For large datasets, break the text into smaller files and tag them
              seperately
            </li>
          </ul>
        </q-timeline-entry>
        <q-timeline-entry
          subtitle="Step 2"
          title="Create some tags and start tagging your text"
          icon="fa fa-tag"
          color="orange-6"
        >
          <q-img
            src="@/assets/step-2.png"
            spinner-color="white"
            class="rounded-borders"
            style="border: 1px solid #ccc"
          />
          <ul class="q-my-md">
            <li>Use the <strong>New Tag</strong> button to create new tags</li>
            <li>
              Use the <strong>Edit Tag</strong> button to remove unwanted tags
            </li>
            <li>
              Click the <strong>Save</strong> button once you are done
              annotating an entry and to move to the next one
            </li>
            <li>
              Adjust the <strong>Text Seperator</strong> break your content
              correctly into entries
            </li>
            <li>
              Use the <strong>Tags</strong> menu to Export/Import tags to share
              with your team
            </li>
          </ul>
        </q-timeline-entry>
        <q-timeline-entry
          subtitle="Step 3"
          title="Download your annotations as a JSON file that can be used for training"
          icon="fa fa-download"
          color="red-6"
        >
          <q-img
            src="@/assets/step-3.png"
            spinner-color="white"
            class="rounded-borders"
            style="border: 1px solid #ccc; width: 70%"
          />
        </q-timeline-entry>

        <q-timeline-entry
          subtitle="Finally"
          title="Convert to DocBin format and use it for training"
          icon="fa fa-file"
          color="red-10"
        >
          <p>
            See the spaCy documentation
            <a
              :class="$q.dark.isActive ? 'text-light-blue-4' : 'text-dark-blue'"
              href="https://spacy.io/api/data-formats#json-input"
            >
              here
            </a>
            on how to convert the annotations from JSON to DocBin format.
          </p>
        </q-timeline-entry>
      </q-timeline>
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
