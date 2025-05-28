<template>
    <div class="q-pa-md" style="height: 50px;">
        <q-btn class="q-mx-sm" :color="$q.dark.isActive ? 'grey-3' : 'grey-9'" outline title="Go back one sentence/paragraph" @click="back" :disabled="currentIndex == 0" label="Back" />
        <div style="display: inline-block;margin-left: 15px;">
            <span>{{ this.$store.state.currentPage.charAt(0).toUpperCase() + this.$store.state.currentPage.slice(1) }} Mode</span>
            <span class="q-pl-md">{{ this.$store.fileName }}</span>
            <span class="q-pl-md">{{ getWordCount(this.inputSentences[this.currentIndex].text) }} Words</span>
            <span class="q-pl-md">{{ getCharCount(this.inputSentences[this.currentIndex].text) }} Characters</span>
            <span class="q-pl-md" v-if="this.annotations[this.currentIndex].entities.length > 0">{{ this.annotations[currentIndex].entities.length }} Annotations</span>
            <span class="q-pl-md">Section {{ this.currentIndex + 1 }}/{{ this.annotations.length }}</span>
            <span class="q-pl-xl" v-if="this.$store.lastSavedTimestamp != null" style="text-align: right;position: absolute; right: 110px;">Auto Saved at {{ this.$store.lastSavedTimestamp }}</span>
        </div>
        <q-btn class="q-mx-sm" :color="$q.dark.isActive ? 'grey-3' : 'grey-9'" outline title="Go forward one sentence/paragraph" @click="next" :disabled="currentIndex == this.inputSentences.length - 1" label="Next" style="position: absolute; right: 16px;"/>
    </div>
</template>

<script>
import { mapState, mapMutations } from "vuex";

export default {
    name: "InfoBar",
    computed: {
        ...mapState(["annotations", "currentPage", "fileName", "lastSavedTimestamp","currentIndex","inputSentences"]),
    },
    methods: {
        ...mapMutations(["setCurrentIndex", "setCurrentPage","nextSentence","previousSentence"]),
        getWordCount(text) {
            if (text == null) return 0;
            let words = text.split(/\s+/).filter((word) => word.length > 0);
            return words.length;
            },
        getCharCount(text) {
            if (text == null) return 0;
            return text.length;
        },
        next() {
            this.nextSentence();
            this.emitter.emit("tokenizeCurrentSentence");
        },
        back() {
            this.previousSentence()
            this.emitter.emit("tokenizeCurrentSentence");
        },
    }
}
</script>