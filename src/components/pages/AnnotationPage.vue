<template>
  <div>
    <classes-block />
    <div class="q-pa-lg" style="height:60vh; overflow-y:scroll;">
      <component :is="t.type === 'token' ? 'Token' : 'TokenBlock'" v-for="t in tm.tokens" :key="t.start" :token="t"
        :backgroundColor="t.backgroundColor" :humanOpinion="t.humanOpinion" @remove-block="onRemoveBlock"
        @replace-block-label="onReplaceBlockLabel" />
    </div>
    <div class="q-pa-md" style="border-top: 1px solid #ccc">
      <q-btn class="q-mx-sm" color="primary" outline title="Undo" @click="undo" label="Undo" />
      <q-btn color="red" outline class="q-mx-sm" title="Delete all annotations for all sentences/paragraphs"
        @click="resetBlocks" label="Reset" />
      <q-btn class="q-mx-sm" :color="$q.dark.isActive ? 'grey-3' : 'grey-9'" outline
        title="Go back one sentence/paragraph" @click="backOneSentence" :disabled="currentIndex == 0" label="Back" />
      <q-btn class="q-mx-sm" :color="$q.dark.isActive ? 'grey-3' : 'grey-9'" outline
        title="Go forward one sentence/paragraph" @click="skipCurrentSentence" label="Next" />
    </div>
  </div>
</template>
<script>
import { mapState, mapMutations } from "vuex";
import Token from "../blocks/Token";
import TokenBlock from "../blocks/TokenBlock";
import ClassesBlock from "../blocks/ClassesBlock.vue";
import TokenManager from "../token-manager";
import TreebankTokenizer from "treebank-tokenizer";

export default {
  name: "AnnotationPage",
  data: function () {
    return {
      tm: new TokenManager([]),
      currentSentence: {},
      redone: "",
      tokenizer: new TreebankTokenizer(),
      addedTokensStack: [],
      undoStack: [],
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
    // Add blocks for all paragraphs
    for (var i = 0; i < this.inputSentences.length; i++) {
      this.$store.commit("addAnnotation", {
        text: this.inputSentences[i].text,
        entities: {},
      });
      this.nextSentence();
    }
    this.resetIndex();
    document.addEventListener("mouseup", this.selectTokens);
    document.addEventListener('keydown', this.keypress);
  },
  beforeUnmount() {
    document.removeEventListener("mouseup", this.selectTokens);
    document.removeEventListener("keydown", this.keypress);
  },
  methods: {
    ...mapMutations(["nextSentence", "previousSentence", "resetIndex"]),
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
     * Add an action to the undo stack
     * @param {Object} action - The action to record
     */
    recordAction(action) {
      this.undoStack.push(action);
      this.undoStack.sort((a, b) => b.timestamp - a.timestamp);
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
        for (var tok in tokens) { if (tokens[tok] == '.') { tokens[tok - 1] = tokens[tok - 1] + "."; tokens.splice(tok, 1) } }
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
      this.recordAction({
        type: 'addBlock',
        details: {
          start: start,
          end: end,
          _class: this.currentClass,
          timestamp: Date.now()
        }
      });
      selection.empty();
      this.save();
    },
    // Callbacks for Token and TokenBlock components
    /**
     * Removes TokenBlock from the TokenManager
     * @param {Number} blockStart - The start position of the block to remove
     */
    onRemoveBlock(blockStart) {
      this.addToUndo(blockStart);
      this.tm.removeBlock(blockStart);
      this.save();
    },
    /**
     * Changes TokenBlock label in the TokenManager
     * @param {Number} blockStart  - The start position of the block to change
     */
    onReplaceBlockLabel(blockStart) {
      this.addToUndo(blockStart);
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
      this.tm.resetBlocks();
      this.undoStack = [];
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
    },
    // Undo Functions
    /**
     * Adds a TokenBlock to the Undo Stack (Generic Undo)
     * @param {Number} tokenStart - The start position of the token to add to the undo stack
     */
    addToUndo(tokenStart) {
      const block = this.tm.getBlockByStart(tokenStart);
      if (!block) {
        console.error('Block not found for start:', tokenStart);
        return;
      }
      this.recordAction({
        type: 'genericUndo',
        details: {
          tokenStart: block.start,
          oldBlock: block,
          timestamp: Date.now()
        }
      });
    },
    /**
     * Undo the last action and remove from the undo stack
     */
    undo() {
      if (this.undoStack.length > 0) {
        const lastAction = this.undoStack.pop();
        var details = lastAction.details;
        switch (lastAction.type) {
          case 'addBlock':
            this.tm.removeBlock(details.start);
            this.save();
            break;
          case 'genericUndo':
            this.tm.removeBlock(details.tokenStart);
            this.tm.addNewBlock(details.oldBlock.start, details.oldBlock.end, this.classes.find(c => c.name == details.oldBlock.label), details.oldBlock.humanOpinion, details.oldBlock.initiallyNLP, details.oldBlock.isLoaded, details.oldBlock.name, details.oldBlock.status, details.oldBlock.annotationHistory, details.oldBlock.userHasToggled, details.oldBlock.isSymbolActive);
            this.save();
            break;
        }
      }
    },
  },
};
</script>