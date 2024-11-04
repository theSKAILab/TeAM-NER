<template>
      
  <div>
    <classes-block />
    <div class="q-pa-lg" style="height:60vh; overflow-y:scroll;">
      <component
        :is="t.type === 'token' ? 'Token' : 'TokenBlock'"
        v-for="t in tm.tokens"
        :key="`${t.type}-${t.start}`"
        :token="t"
        :class="[t.userHasToggled ? 'user-active' : 'user-inactive']"
        :isSymbolActive="t.isSymbolActive"
        :backgroundColor="t.backgroundColor"
        :humanOpinion="t.humanOpinion"
        @update-symbol-state="handleSymbolUpdate(t.start, $event.newSymbolState, $event.userHasToggled)"
        @remove-block="onRemoveBlock"
        @replace-block-label="onReplaceBlockLabel"
      />
    </div>
    <div class="q-pa-md" style="border-top: 1px solid #ccc">
      <q-btn
        class="q-mx-sm"
        color="primary"
        outline
        title="Undo"
        @click="undo"
        label="Undo"
      />
    </div>
    <div class="q-pa-md" style="border-top: 1px solid #ccc">
      <q-btn
        color="red"
        outline
        class="q-mx-sm"
        title="Delete all annotations for all sentences/paragraphs"
        @click="resetBlocks"
        label="Reset"
      />
      <q-btn
        class="q-mx-sm"
        :color="$q.dark.isActive ? 'grey-3' : 'grey-9'"
        outline
        title="Go back one sentence/paragraph"
        @click="backOneSentence"
        :disabled="currentIndex == 0"
        label="Back"
      />
      <q-btn
        class="q-mx-sm"
        :color="$q.dark.isActive ? 'grey-3' : 'grey-9'"
        outline
        title="Go forward one sentence/paragraph"
        @click="skipCurrentSentence"
        label="Skip"
      />
      <q-btn
        class="q-mx-sm"
        color="green-7"
        outline
        title="Go forward one sentence/paragraph"
        @click="saveTags"
        label="Save"
      />
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
  name: "ReviewPage",
  data: function() {
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
      this.tokenizeCurrentSentence();
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
      console.log("Recording action:", action); // This will log the action being recorded
      this.undoStack.push(action);
      // Sort the undo stack by the timestamp to ensure the latest action is on top
      this.undoStack.sort((a, b) => b.timestamp - a.timestamp);
    },
    handleSymbolUpdate(tokenStart, newSymbolState, userHasToggled) {
      const token = this.tm.getTokenByStart(tokenStart);
      if (!token) {
        console.error("No token found for start:", tokenStart);
        return;
      }

      const oldSymbolState = token.isSymbolActive;
      const oldUserHasToggled = token.userHasToggled;

      // Update the token's state and toggled status
      this.tm.updateSymbolState(tokenStart, newSymbolState);
      token.userHasToggled = userHasToggled; // Ensure this property exists and is settable

      this.recordAction({
        type: 'symbolUpdate',
        details: {
          tokenStart,
          oldSymbolState,
          newSymbolState,
          oldUserHasToggled,
          newUserHasToggled: userHasToggled,
          timestamp: Date.now()
        }
      });

      console.log("Updated symbol state and user toggled status:", tokenStart, newSymbolState, userHasToggled);
    },
    onAddBlock(start, end, _class, humanOpinion, initiallyNLP = false, isLoaded, name="name", status="candidate", annotationHistory, userHasToggled = false, isSymbolActive = 0) {
      console.log("Adding block:", start, end, _class);  // Confirm
      this.recordAction({
            type: 'addBlock',
            details: {
                start,
                end,
                _class,
                humanOpinion,
                initiallyNLP,
                isLoaded,
                name,
                status,
                annotationHistory,
                userHasToggled,
                isSymbolActive,
                timestamp: Date.now()
            }
        });
        this.tm.addNewBlock(start, end, _class, humanOpinion, initiallyNLP, isLoaded, name, status, annotationHistory, userHasToggled, isSymbolActive);
        // Ensure that the action is correctly recorded in the undo stack
    },
    revertAddBlock(details) {
        // Assuming you have a method to remove a block based on some criteria
        this.tm.removeBlock(details.start, details.end, details._class);
    },
    onRemoveBlock(tokenStart) {
        const block = this.tm.getBlockByStart(tokenStart);
        if (!block) {
            console.error('Block not found for start:', tokenStart);
            return;
        }
        const blockDetails = {
            start: block.start,
            end: block.end,
            _class: block.label,  // Assuming 'label' is the class; adjust if the actual property name differs
            humanOpinion: block.humanOpinion,
            initiallyNLP: block.initiallyNLP,
            isLoaded: block.isLoaded,
            name: block.name,
            status: block.status,
            annotationHistory: block.annotationHistory,
            userHasToggled: block.userHasToggled,
            isSymbolActive: block.isSymbolActive,
            // Include any additional fields that are important for the functionality or logging
        };
        this.recordAction({
            type: 'blockRemove',
            details: {
                tokenStart: block.start,
                blockDetails: blockDetails,
                timestamp: Date.now()
            }
        });
        console.log("Removing block with details:", blockDetails);  // Logging all block details
        this.tm.removeBlock(tokenStart);
    },




    undo() {
        if (this.undoStack.length > 0) {
            const lastAction = this.undoStack.pop(); // Get the most recent action
            console.log("LAST ACTION BEFORE UNDO ",lastAction)
            switch (lastAction.type) {
              case 'symbolUpdate':
                this.revertSymbolUpdate(lastAction.details);
                break;
              case 'blockRemove':
                this.revertBlockRemove(lastAction.details);
                break;
              case 'addBlock':
                this.revertAddBlock(lastAction.details);
                break;
              default:
                console.log("Unhandled action type:", lastAction.type);
            }
        } else {
            console.log("Undo Stack is empty");
        }
    },
    revertSymbolUpdate(details) {
      // Revert the symbol state
      this.tm.updateSymbolState(details.tokenStart, details.oldSymbolState);
      // Revert the user toggle status
      const token = this.tm.getTokenByStart(details.tokenStart);
      if (token) {
        token.userHasToggled = details.oldUserHasToggled;
      }
      console.log("Reverted symbol state and user toggled status for token:", details.tokenStart);
    },
    revertBlockAdd(details) {
      // Assuming a method to remove a block if added inappropriately
      this.tm.removeBlock(details.tokenStart);
    },
    revertBlockRemove(details) {
        if (details && details.blockDetails) {
            console.log("Reverting with class details:", details.blockDetails._class);
            if (!details.blockDetails._class) {
                console.error('Class details are missing');
                return;
            }
            // Assuming other necessary parameters are also needed
            this.tm.addNewBlock(
                details.blockDetails.start,
                details.blockDetails.end,
                details.blockDetails._class,
                details.blockDetails.humanOpinion, // Assuming humanOpinion is a needed parameter
                details.blockDetails.initiallyNLP, // Assuming initiallyNLP is needed
                details.blockDetails.isLoaded,     // Assuming isLoaded is needed
                details.blockDetails.name,         // Assuming name is needed
                details.blockDetails.status,       // Assuming status is needed
                details.blockDetails.annotationHistory, // Assuming annotationHistory is needed
                details.blockDetails.userHasToggled,    // Assuming userHasToggled is needed
                details.blockDetails.isSymbolActive    // Assuming isSymbolActive is needed
            );
        } else {
            console.error('Missing details for reverting block removal');
        }
    },


    /*
    // Load history of annotations from input file 
    applyAnnotationHistory() {
      const annotationHistory = this.annotationHistory;
      if (annotationHistory && annotationHistory.length > 0) {
        annotationHistory.forEach((annotation) => {
          const [labelName, start, end, , name] = annotation;
          // Set humanOpinion to false ONLY if the name is "nlp"
          const humanOpinion = name !== "nlp";
          // Find the matching class object
          const _class = this.classes.find(cls => cls.name === labelName);
          if (_class) {
            // Pass humanOpinion to the addNewBlock method of TokenManager
            console.log("THE OPINION IS HUMAN? ", humanOpinion)
            this.tm.addNewBlock(start, end, _class, humanOpinion);
          } else {
            console.warn(`Label "${labelName}" not found in classes.`);
          }
        });
      }
    },
    */
   // Inside AnnotationPage.vue
   applyAnnotationHistory() {
    const annotationHistory = this.annotationHistory;
    if (annotationHistory && annotationHistory.length > 0) {
      annotationHistory.forEach((annotation) => {
        const [labelName, start, end, , name, status, ogNLP, types] = annotation;
        const humanOpinion = name !== "nlp";
        const initiallyNLP = ogNLP;
        const _class = this.classes.find(cls => cls.name === labelName);
        const isSymbolActive = this.determineSymbolState(status);
        console.log("Added block with symbol ", isSymbolActive);

        if (_class) {
            // Determine the most recent status for isSymbolActive
            this.tm.addNewBlock(start, end, _class, humanOpinion, initiallyNLP, true, name, status, types, false, isSymbolActive);
        } else {
            console.warn(`Label "${labelName}" not found in classes.`);
        }
        });

        // Adjust humanOpinion based on 'nlp' name
        this.tm.tokens.forEach(token => {
            if (token.type === "token-block") {
                const isNLP = annotationHistory.some(annotation => {
                    const [, start, end, , name] = annotation;
                    return name === "nlp" && token.start === start && token.end === end;
                });
                token.humanOpinion = !isNLP;
            }
        });
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
        for (var tok in tokens) {if (tokens[tok] == '.') {tokens[tok-1]=tokens[tok-1]+".";tokens.splice(tok,1)}}
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
        console.log("selected text were not tokens");
        return;
      }

      if (!this.classes.length && selection.anchorNode) {
        alert(
          "There are no Tags available. Kindly add some Tags before tagging."
        );
        selection.empty();
        return;
      }
      console.log("adding manual block ", start, end, this.currentClass);
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
    },
    resetBlocks() {
      this.tm.resetBlocks();
      this.addedTokensStack = [];
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
      this.$store.commit("addAnnotation", {
        text: this.currentSentence.text,
        entities: this.tm.exportAsAnnotation(),
      });
      this.nextSentence();
      this.tokenizeCurrentSentence();
    },
  },
};
</script>
