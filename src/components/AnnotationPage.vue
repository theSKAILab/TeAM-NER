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
        title="Go forward one sentence/paragraph" @click="saveTags" label="Next" />
    </div>
  </div>
</template>
  <script>
  import { mapState, mapMutations } from "vuex";
  import Token from "./Token";
  import TokenBlock from "./TokenBlock";
  import ClassesBlock from "./ClassesBlock.vue";
  import TokenManager from "./token-manager";
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
      undo() {
        //console.log("Undo Stack:", this.addedTokensStack);
      },

      // Inside AnnotationPage.vue
      applyAnnotationHistory() {
        console.log(this.annotationHistory)
        const annotationHistory = this.annotationHistory[this.currentIndex];
        if (annotationHistory && annotationHistory.length > 0) {
          annotationHistory.forEach((annotation) => {
            const [labelName, start, end, , name, , ogNLP] = annotation;
            const humanOpinion = name !== "nlp";
            const _class = this.classes.find(cls => cls.name === labelName);
            if (_class) {
              this.tm.addNewBlock(start, end, _class, humanOpinion, ogNLP, true, name, status);
            } else {
              console.warn(`Label "${labelName}" not found in classes.`);
            }
          });

          // New logic to adjust humanOpinion based on 'nlp' name
          this.tm.tokens.forEach(token => {
            if (token.type === "token-block") {
              // Determine if this block's annotations came from 'nlp'
              const isNLP = annotationHistory.some(annotation => {
                const [, start, end, , name] = annotation;
                return name === "nlp" && token.start === start && token.end === end;
              });
              token.humanOpinion = !isNLP;
            }
          });
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

        // Call applyAnnotationHistory after setting up tokens and annotations
        this.applyAnnotationHistory();
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
        } catch {
          //console.log("selected text were not tokens");
          return;
        }

        if (!this.classes.length && selection.anchorNode) {
          alert(
            "There are no Tags available. Kindly add some Tags before tagging."
          );
          selection.empty();
          return;
        }
        //console.log("adding manual block ", start, end, this.currentClass);
        this.tm.addNewBlock(start, end, this.currentClass, true, false);
        this.addedTokensStack.push(start);
        selection.empty();
        this.save();
      },
      onRemoveBlock(blockStart) {
        this.tm.removeBlock(blockStart);
        this.save();
      },
      // Replaces a token-block's class with the currently selected class
      onReplaceBlockLabel(blockStart) {
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
      resetBlocks() {
        this.tm.resetBlocks();
        this.addedTokensStack = [];
        this.save();
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
      }
    },
  };
  </script>