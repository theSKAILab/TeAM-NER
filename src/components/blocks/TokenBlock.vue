<template>
  <mark :class="['bg-' + backgroundColor, { 'shadow-unreviewed': !this.userHasToggled, 'bg-red': !token.humanOpinion }]">
    <Token v-for="t in token.tokens" :key="t.start" :token="t" />
    <span class="tag">
      <!-- Toggle status cycle button -->
      <i v-if="this.currentPage === 'review'" :class="symbolClass" @click="toggleSymbol"></i>
      {{ token.label }}
      <!-- Replace label button (double arrows) -->
      <q-btn icon="fa fa-exchange-alt" round flat size="xs" text-color="grey-7"
        title="Change label to currently selected label"
        @click="changeClass" />
      <!-- Delete label button (X) -->
      <q-btn v-if="this.currentPage === 'annotate'" icon="fa fa-times-circle" round flat size="xs" text-color="grey-7" title="Delete annotation" @click.stop="recordActionAndEmit('remove-block', token.start)" />
      <q-btn v-if="this.currentPage === 'review'" :icon="reviewedIconClass" round flat size="xs" text-color="grey-9"
        title="Dark indicates that you have reviewed this annotation, light means you have not."
        @click.stop="toggleReviewed" />
    </span>
  </mark>
</template>

<script>
import Token from "./Token";
import { mapState } from "vuex";

export default {
  name: "TokenBlock",
  components: {
    Token,
  },
  props: {
    token: Object,
    backgroundColor: String,
    humanOpinion: Boolean,
    isSymbolActive: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      userHasToggled: false,
      candidateStatus: false,
      isReviewed: false,
    };
  },
  computed: {
    ...mapState(["currentPage"]),
    symbolClass() {
      switch (this.isSymbolActive) {
        case 0: return "fas fa-hourglass-start fa-lg"; // Candidate - Hourglass implies waiting or potential
        case 1: return "fas fa-thumbs-up fa-lg"; //accepted
        case 2: return "fas fa-skull-crossbones fa-lg"; //rejected
        case 3: return "fas fa-history fa-lg"; // Suggested
        default: return "fas fa-question-circle fa-lg";
      }
    },
    reviewedIconClass() {
      return this.userHasToggled ? 'fas fa-toggle-on' : 'fas fa-toggle-off';
    },
  },
  methods: {
    toggleSymbol() {
      //this.recordAction('symbol-state', this.isSymbolActive);
      let oldState = this.isSymbolActive;
      let nextState = (this.isSymbolActive + 1) % 3;
      this.userHasToggled = true;
      this.$emit('update-symbol-state', {
        tokenStart: this.token.start,
        newSymbolState: nextState,
        oldSymbolState: oldState
      });
    },
    toggleReviewed() {
      this.userHasToggled = !this.userHasToggled;
      this.$emit('user-toggle', this.token.start);
    },
    recordAction(actionType, previousState) {
      const action = {
        type: actionType,
        tokenStart: this.token.start,
        previousState: previousState,
        newState: this[actionType === 'symbol-state' ? 'isSymbolActive' : 'userHasToggled'],
        timestamp: Date.now()
      };
      this.$emit('record-undo', action);
    },
    recordActionAndEmit(action, payload) {
      this.recordAction(action, this.token);
      this.$emit(action, payload);
    },
    changeClass() {
      if (this.currentPage === 'review') {
          this.$emit('update-symbol-state', {
            tokenStart: this.token.start,
            newSymbolState: 3, // state for suggested
            oldSymbolState: this.isSymbolActive
          });
      }
      this.recordActionAndEmit('replace-block-label', this.token.start)
    },
  },
};
</script>

<style lang="scss">
  i {
    cursor: pointer;
  }
  mark {
    padding: 0.7rem;
    /* Increased from 0.5rem */
    position: relative;
    background-color: burlywood;
    border: 2px solid $grey-7;
    /* Thicker border for emphasis */
    border-radius: 0.5rem;
    /* Larger border-radius */
  }

  .tag {
    background-color: whitesmoke;
    padding: 6px 0 8px 16px;
    /* Increased padding for larger tag area */
    border: 2px solid grey;
    /* Thicker border */
    border-radius: 0.5rem;
    /* Larger border-radius */
    font-size: small;
    /* Increased font size for better visibility */
  }

  .shadow-unreviewed {
    box-shadow: 0 0 2px 2px goldenrod;
    /* Larger and more pronounced shadow */
  }

  .bg-red {
    box-shadow: 0 0 2px 2px red;
    /* Larger and more pronounced shadow */
  }
</style>