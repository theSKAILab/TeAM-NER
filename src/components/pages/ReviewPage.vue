<template>
  <div>
    <classes-block />
    <div class="q-pa-lg" style="height: calc(100vh - 190px); overflow-y:scroll;">
      <component :is="t.type === 'token' ? 'Token' : 'TokenBlock'" v-for="t in tm.tokens" :key="`${t.type}-${t.start}`"
        :token="t" :class="[t.userHasToggled ? 'user-active' : 'user-inactive']" :isSymbolActive="t.isSymbolActive"
        :backgroundColor="t.backgroundColor" :humanOpinion="t.humanOpinion"
        @update-symbol-state="handleSymbolUpdate(t.start, $event.newSymbolState)"
        @remove-block="onRemoveBlock" @replace-block-label="onReplaceBlockLabel" @user-toggle="handleUserToggle"/>
    </div>
    <info-bar />
  </div>
</template>
<script>
import { mapState, mapMutations } from "vuex";
import Token from "../objects/Token";
import TokenBlock from "../objects/TokenBlock";
import ClassesBlock from "../objects/ClassesBlock.vue";
import TokenManager from "../etc/token-manager";
import Tokenizer from "../etc/tokenizer";
import InfoBar from "../toolbars/InfoBar.vue";
import SharedEditorFunctions from "../etc/shared.vue";

export default {
  name: "ReviewPage",
  data: function () {
    return {
      tm: new TokenManager([]),
      currentSentence: {},
      tokenizer: new Tokenizer(),
    };
  },
  components: {
    Token,
    TokenBlock,
    ClassesBlock,
    InfoBar
  },
  computed: {
    ...mapState([
      "annotations",
      "annotationHistory",
      "classes",
      "currentClass",
      "currentIndex",
      "inputSentences",
      "annotationPrecision",
      "lastSavedTimestamp",
      "undoStack"
    ])
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
    if (this.inputSentences.length) {
      this.tokenizeCurrentSentence()
    }
    document.addEventListener("mouseup", this.selectTokens);

    // Emits
    this.emitter.on('undo', this.undo);
    this.emitter.on('undoAll',  this.undoAll);
    this.emitter.on('tokenizeCurrentSentence', this.tokenizeCurrentSentence);
  },
  beforeUnmount() {
    document.removeEventListener("mouseup", this.selectTokens);
  },
  mixins: [SharedEditorFunctions],
  methods: {
    ...mapMutations(["resetIndex"]),
  },
};
</script>
