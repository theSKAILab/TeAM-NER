<template>
  <div>
    <classes-block />
    <div class="q-pa-lg" style="height: calc(100vh - 190px); overflow-y:scroll;">
      <component :is="t.type === 'token' ? 'Token' : 'TokenBlock'" v-for="t in tm.tokens" :key="t.start" :token="t"
        :backgroundColor="t.backgroundColor" :humanOpinion="t.humanOpinion" @remove-block="onRemoveBlock"
        @replace-block-label="onReplaceBlockLabel" />
    </div>
    <div class="q-pa-md" style="height: 50px;">
      <q-btn class="q-mx-sm" :color="$q.dark.isActive ? 'grey-3' : 'grey-9'" outline title="Go back one sentence/paragraph" @click="backOneSentence" :disabled="currentIndex == 0" label="Back" />
      <div style="display: inline-block;margin-left: 15px;">
        <span>{{ this.$store.state.currentPage.charAt(0).toUpperCase() + this.$store.state.currentPage.slice(1) }} Mode</span>
        <span class="q-pl-md">{{ this.$store.fileName }}</span>
        <span class="q-pl-md">{{ getWordCount(this.inputSentences[currentIndex].text) }} Words</span>
        <span class="q-pl-md">{{ getCharCount(this.inputSentences[currentIndex].text) }} Characters</span>
        <span class="q-pl-md" v-if="this.annotations[currentIndex].entities.length > 0">{{ this.annotations[currentIndex].entities.length }} Annotations</span>
        <span class="q-pl-xl" v-if="this.$store.lastSavedTimestamp != null" style="text-align: right;position: absolute; right: 110px;">Auto Saved at {{ this.$store.lastSavedTimestamp }}</span>
      </div>
      <q-btn class="q-mx-sm" :color="$q.dark.isActive ? 'grey-3' : 'grey-9'" outline title="Go forward one sentence/paragraph" @click="skipCurrentSentence" :disabled="currentIndex == this.inputSentences.length - 1" label="Next" style="position: absolute; right: 16px;"/>
    </div>
  </div>
</template>
<script>
import { mapState, mapMutations } from "vuex";
import Token from "../blocks/Token";
import TokenBlock from "../blocks/TokenBlock";
import ClassesBlock from "../blocks/ClassesBlock.vue";
import TokenManager from "../token-manager";
import Tokenizer from "../tokenizer/tokenizer";

export default {
  name: "AnnotationPage",
  data: function () {
    return {
      tm: new TokenManager([]),
      currentSentence: {},
      redone: "",
      tokenizer: new Tokenizer(),
      addedTokensStack: [],
    };
  },
  components: {
    Token,
    TokenBlock,
    ClassesBlock,
  },
  computed: {
    ...mapState([
      "annotations",
      "annotationHistory",
      "classes",
      "currentClass",
      "currentIndex",
      "inputSentences",
      "enableKeyboardShortcuts",
      "annotationPrecision",
      "fileName",
      "lastSavedTimestamp",
      "undoStack"
    ]),
  },
  watch: {
    inputSentences() {
      this.resetIndex();
      this.tokenizeCurrentSentence();
    },
    annotations() {
      if (this.currentAnnotation != this.annotations[this.currentIndex]) {
        this.tokenizeCurrentSentence();
      }
    },
    classes() {
      this.tokenizeCurrentSentence();
    },
    annotationPrecision() {
      this.tokenizeCurrentSentence();
    }
  },
  created() {

    if (this.inputSentences.length) {
      this.tokenizeCurrentSentence()
    }

    document.addEventListener("mouseup", this.selectTokens);
    document.addEventListener('keydown', this.keypress);

    // Emits
    this.emitter.on('undo', this.undo);
    this.emitter.on('reset-annotations',  this.resetBlocks);
  },
  beforeUnmount() {
    document.removeEventListener("mouseup", this.selectTokens);
    document.removeEventListener("keydown", this.keypress);
    this.emitter.off('undo', this.undo);
    this.emitter.off('reset-annotations',  this.resetBlocks);
  },
  methods: {
    ...mapMutations(["nextSentence", "previousSentence", "resetIndex", "addUndoCreate", "addUndoDelete", "addUndoUpdate"]),
    /**
     * Keyboard Control Function
     * @param {KeyboardEvent} event - Callback from keypress event
     */
    keypress(event) {
      if (!this.enableKeyboardShortcuts) {
        return
      }
      if (event.keyCode == 32) { // Space
        this.save();
      } else if (event.keyCode == 39) { // right arrow
        this.skipCurrentSentence();
      } else if (event.keyCode == 37) { // left arrow
        this.backOneSentence();
      } else if (event.keyCode == 82 || event.keyCode == 27) { // r / R or ESC
        this.resetBlocks();
      }
      // stop event from bubbling up
      event.stopPropagation()
    },
    /**
     * Tokenizes the current sentence and sets the TokenManager
     */
    tokenizeCurrentSentence() {
      this.currentSentence = this.inputSentences[this.currentIndex];
      this.currentAnnotation = this.annotations[this.currentIndex];

      let tokens, spans;

      if (this.$store.state.annotationPrecision == "char") {
        tokens = this.currentSentence.text.split('');
        spans = [];
        for (let i = 0; i < this.currentSentence.text.length; i++) {
          spans.push([i, i + 1]);
        }
      } else {
        tokens = this.tokenizer.tokenize(this.currentSentence.text);
        spans = this.tokenizer.span_tokenize(this.currentSentence.text);
      }

      let combined = tokens.map((t, i) => [spans[i][0], spans[i][1], t]);
      this.tm = new TokenManager(this.classes);
      this.tm.setTokensAndAnnotation(combined, this.currentAnnotation);
    },
    /**
     * Adds a new block to the TokenManager based on the current selection
     */
    selectTokens() {
      let selection = document.getSelection();
      if (
        selection.anchorOffset === selection.focusOffset &&
        selection.anchorNode === selection.focusNode
      ) {
        return;
      }

      const rangeStart = selection.getRangeAt(0);
      const rangeEnd = selection.getRangeAt(selection.rangeCount - 1);
      let start, end;
      try {
        start = parseInt(rangeStart.startContainer.parentElement.id.replace("t", ""));
        let offsetEnd = parseInt(rangeEnd.endContainer.parentElement.id.replace("t", ""));
        end = offsetEnd + rangeEnd.endOffset;
      } catch {
        return;
      }

      if (!this.classes.length && selection.anchorNode) {
        alert(
          "There are no Tags available. Kindly add some Tags before tagging."
        );
        selection.empty();
        return;
      }
      this.tm.addNewBlock(start, end, this.currentClass, true, false);
      this.addedTokensStack.push(start);
      this.addUndoCreate(this.tm.getBlockByStart(start));
      selection.empty();
      this.save();
    },
    // Callbacks for Token and TokenBlock components
    /**
     * Removes TokenBlock from the TokenManager
     * @param {Number} blockStart - The start position of the block to remove
     */
    onRemoveBlock(blockStart) {
      this.addUndoDelete(this.tm.getBlockByStart(blockStart));
      this.tm.removeBlock(blockStart);
      this.save();
    },
    /**
     * Changes TokenBlock label in the TokenManager
     * @param {Number} blockStart  - The start position of the block to change
     */
    onReplaceBlockLabel(blockStart) {
      this.addUndoUpdate(this.tm.getBlockByStart(blockStart));
      // Get the start and end positions of the existing block before deleting it
      const existingBlock = this.tm.getBlockByStart(blockStart);
      const start = existingBlock.start;
      const end = existingBlock.end;

      // Remove the existing block
      this.tm.removeBlock(blockStart);

      // Create a new block with the same start and end, but with the current tag/label/class
      if (start !== undefined && end !== undefined) {
        this.addedTokensStack.push(start);
        this.tm.addNewBlock(start, end, this.currentClass);
      }
      this.save();
    },
    // Navigation Functions (buttons on bottom)
    /**
     * Resets all blocks to original imported state
     */
    resetBlocks() {
      while(this.undoStack.length > 0) { this.undo();}
      this.addedTokensStack = [];
      this.save();
    },
    /**
     * Goes back one sentence and re-tokenizes the sentence
     */
    skipCurrentSentence() {
      this.save();
      this.nextSentence();
      this.tokenizeCurrentSentence();
    },
    /**
     * Goes back one sentence and re-tokenizes the sentence
     */
    backOneSentence() {
      this.previousSentence();
      this.tokenizeCurrentSentence();
    },
    /**
     * Saves the current annotation to the store
     */
    save() {
      this.$store.commit("addAnnotation", {
        text: this.currentSentence.text,
        entities: this.tm.exportAsAnnotation(),
      });
      this.$store.lastSavedTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    getWordCount(text) {
      if (text == null) return 0;
      let words = text.split(/\s+/).filter((word) => word.length > 0);
      return words.length;
    },
    getCharCount(text) {
      if (text == null) return 0;
      return text.length;
    },
    /**
     * Undo the last action and remove from the undo stack
     */
    undo() {
      if (this.undoStack.length > 0) {
        const lastAction = this.undoStack.pop();
        switch (lastAction.type) {
          case 'remove':
            this.tm.removeBlock(lastAction.start);
            this.save();
            break;
          case 'create':
            this.tm.addNewBlock(lastAction.oldBlock.start, lastAction.oldBlock.end, this.classes.find(c => c.name == lastAction.oldBlock.label), lastAction.oldBlock.humanOpinion, lastAction.oldBlock.initiallyNLP, lastAction.oldBlock.isLoaded, lastAction.oldBlock.name, lastAction.oldBlock.status, lastAction.oldBlock.annotationHistory, lastAction.oldBlock.isSymbolActive);
            this.save();
            break;
          case 'update':
            this.tm.removeBlock(lastAction.oldBlock.start);
            this.tm.addNewBlock(lastAction.oldBlock.start, lastAction.oldBlock.end, this.classes.find(c => c.name == lastAction.oldBlock.label), lastAction.oldBlock.humanOpinion, lastAction.oldBlock.initiallyNLP, lastAction.oldBlock.isLoaded, lastAction.oldBlock.name, lastAction.oldBlock.status, lastAction.oldBlock.annotationHistory, lastAction.oldBlock.isSymbolActive);
            break;
        }
      }
    },
  },
};
</script>