<script>
import { mapMutations } from "vuex";
import TokenManager from "../etc/token-manager";

export default {
  name: "SharedEditorFunctions",
  data: function () {
    return {
      tm: new TokenManager([]),
    };
  },
  methods: {
    ...mapMutations(["nextSentence", "previousSentence", "resetIndex", "addUndoCreate", "addUndoDelete", "addUndoUpdate","addUndoOverlapping"]),
    undo() {
        console.log({...this.undoStack})
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
            case 'overlapping':
                this.tm.removeBlock(lastAction.newBlockStart);
                for(var i = 0; i < lastAction.overlappingBlocks.length; i++) {
                    this.tm.addNewBlock(lastAction.overlappingBlocks[i].start, lastAction.overlappingBlocks[i].end, this.classes.find(c => c.name == lastAction.overlappingBlocks[i].label), lastAction.overlappingBlocks[i].humanOpinion, lastAction.overlappingBlocks[i].initiallyNLP, lastAction.overlappingBlocks[i].isLoaded, lastAction.overlappingBlocks[i].name, lastAction.overlappingBlocks[i].status, lastAction.overlappingBlocks[i].annotationHistory, lastAction.overlappingBlocks[i].isSymbolActive);
                }
            }
        }
    },
    undoAll() {
        while(this.undoStack.length > 0) { this.undo();}
        this.save();
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
      if (selection.anchorOffset === selection.focusOffset && selection.anchorNode === selection.focusNode) {return; }

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

      // No classes available to tag
      if (!this.classes.length && selection.anchorNode) {
        this.$q.dialog({
          title: 'No Tags Available',
          message: 'Please add some Tags before tagging.',
        })
        selection.empty();
        return;
      }
      
      // Attempt to create a new block
      
      // Determine if the selection will overlap with an existing block and add to undo stack accordingly
      var existingBlocks = this.tm.isOverlapping(start, end);
      if (existingBlocks) {
        console.log("Existing Block:", existingBlocks);
        this.addUndoOverlapping(existingBlocks, start);
        this.tm.addNewBlock(start, end, this.currentClass, true, false);
      } else {
        this.tm.addNewBlock(start, end, this.currentClass, true, false);
        this.addUndoCreate(this.tm.getBlockByStart(start));
      }

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
        this.tm.addNewBlock(start, end, this.currentClass);
      }
      this.save();
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
    }
  },
}

</script>