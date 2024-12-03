<template>

  <div>
    <classes-block />
    <div class="q-pa-lg" style="height:60vh; overflow-y:scroll;">
      <component :is="t.type === 'token' ? 'Token' : 'TokenBlock'" v-for="t in tm.tokens" :key="`${t.type}-${t.start}`"
        :token="t" :class="[t.userHasToggled ? 'user-active' : 'user-inactive']" :isSymbolActive="t.isSymbolActive"
        :backgroundColor="t.backgroundColor" :humanOpinion="t.humanOpinion"
        @update-symbol-state="handleSymbolUpdate(t.start, $event.newSymbolState, $event.oldSymbolState)"
        @remove-block="onRemoveBlock" @replace-block-label="onReplaceBlockLabel" />
    </div>
    <div class="q-pa-md" style="border-top: 1px solid #ccc">
      <q-btn class="q-mx-sm" color="primary" outline title="Undo" @click="undo" label="Undo" />
    </div>
    <div class="q-pa-md" style="border-top: 1px solid #ccc">
      <q-btn color="red" outline class="q-mx-sm" title="Delete all annotations for all sentences/paragraphs"
        @click="resetBlocks" label="Reset" />
      <q-btn class="q-mx-sm" :color="$q.dark.isActive ? 'grey-3' : 'grey-9'" outline
        title="Go back one sentence/paragraph" @click="backOneSentence" :disabled="currentIndex == 0" label="Back" />
      <q-btn class="q-mx-sm" :color="$q.dark.isActive ? 'grey-3' : 'grey-9'" outline
        title="Go forward one sentence/paragraph" @click="saveTags" label="Next" />
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
  name: "ReviewPage",
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
    // Add blocks for all paragraphs
    this.resetBlocks()
    if (this.inputSentences.length) {
      this.tokenizeCurrentSentence()
    }
    document.addEventListener("mouseup", this.selectTokens);
    document.addEventListener('keydown', this.keypress);
  },
  beforeUnmount() {
    document.removeEventListener("mouseup", this.selectTokens);
    document.removeEventListener("keydown", this.keypress);
  },
  methods: {
    ...mapMutations(["nextSentence", "previousSentence", "resetIndex"]),
    keypress(event) {
      if (!this.enableKeyboardShortcuts) {
        return
      }
      if (event.keyCode == 32) { // Space
        this.saveTags();
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
    recordAction(action) {
      ////console.log("Recording action:", action); // This will log the action being recorded
      this.undoStack.push(action);
      // Sort the undo stack by the timestamp to ensure the latest action is on top
      this.undoStack.sort((a, b) => b.timestamp - a.timestamp);
    },
    handleSymbolUpdate(tokenStart, newSymbolState, oldSymbolState) {
      const block = this.tm.getBlockByStart(tokenStart);
      this.recordAction({
        type: 'symbolChange',
        details: {
          tokenStart: block.start,
          oldBlock: block,
          oldSymbolState: oldSymbolState,
          timestamp: Date.now()
        }
      });
      console.log(this.undoStack)

      const token = this.tm.getTokenByStart(tokenStart);
      if (!token) {
        console.error("No token found for start:", tokenStart);
        return;
      }

      // Update the token's state and toggled status
      this.tm.updateSymbolState(tokenStart, newSymbolState);
      const cases = ["Candidate", "Accepted", "Rejected"];
      token.status = cases[newSymbolState];


      this.save()
    },
    onRemoveBlock(tokenStart) {
      this.addToUndo(tokenStart)
      this.tm.removeBlock(tokenStart);
      this.save();
    },
    onReplaceBlockLabel(blockStart) {
      this.addToUndo(blockStart);
      const existingBlock = this.tm.getBlockByStart(blockStart);
      // Remove the existing block
      this.tm.removeBlock(blockStart);
      // Create a new block with the same start and end, but with the current tag/label/class
      if (existingBlock.start !== undefined && existingBlock.end !== undefined) {
        this.addedTokensStack.push(existingBlock.start);
        this.tm.addNewBlock(existingBlock.start, existingBlock.end, this.currentClass);
      }
      console.log(this.undoStack)
      this.save();
    },
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
    undo() {
      if (this.undoStack.length > 0) {
        console.log(this.undoStack)
        const lastAction = this.undoStack.pop();
        var details = lastAction.details;
        switch (lastAction.type) {
          case 'addBlock':
            this.tm.removeBlock(details.start);
            this.save();
            break;
          case 'symbolChange':
            this.tm.removeBlock(details.tokenStart);
            this.tm.addNewBlock(details.oldBlock.start, details.oldBlock.end, this.classes.find(c => c.name == details.oldBlock.label), details.oldBlock.humanOpinion, details.oldBlock.initiallyNLP, details.oldBlock.isLoaded, details.oldBlock.name, ["Candidate","Accepted","Rejected"][details.oldSymbolState], details.oldBlock.annotationHistory, details.oldBlock.userHasToggled, details.oldSymbolState);
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
    determineSymbolState(status) {
      switch (status) {
        case "Accepted": return 1;
        case "Rejected": return 2;
        case "Candidate": return 0;
        default: return 0; // Default to candidate if unrecognized status
      }
    },
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
        console.log(start)
        if (!isNaN(start) && !isNaN(end)) {
          if (!this.classes.length && selection.anchorNode) {
            alert(
              "There are no Tags available. Kindly add some Tags before tagging."
            );
            selection.empty();
            return;
          }
          ////console.log("adding manual block ", start, end, this.currentClass);
          this.tm.addNewBlock(start, end, this.currentClass, true, false, false, "name", "candidate", null, true);
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
        } else {
          console.log("selected text were not tokens");
          selection.empty();
        }
      } catch {
        ////console.log("selected text were not tokens");
        return;
      }  
    },
    resetBlocks() {
      this.resetIndex();
      for (var i = 0; i < this.inputSentences.length; i++) {
        this.$store.commit("addAnnotation", {
          text: this.inputSentences[i].text,
          entities: this.annotationHistory[i] != undefined ? this.annotationHistory[i] : [],
        });
        this.nextSentence();
      }
      this.resetIndex();
      this.undoStack = [];
      this.tokenizeCurrentSentence()
    },
    skipCurrentSentence() {
      this.nextSentence();
      this.tokenizeCurrentSentence();
    },
    backOneSentence() {
      this.previousSentence();
      this.tokenizeCurrentSentence();
    },
    saveTags() {
      this.save();
      this.nextSentence();
      this.tokenizeCurrentSentence();
    },
    save() {
      this.$store.commit("addAnnotation", {
        text: this.currentSentence.text,
        entities: this.tm.exportAsAnnotation(),
      });
    },
  },
};
</script>
