import { LocalStorage } from "quasar";

const niceColors = ["red-11", "blue-11", "light-green-11", "deep-orange-11", "pink-11", "light-blue-11", "lime-11", "brown-11", "purple-11", "cyan-11", "yellow-11", "grey-11", "deep-purple-11", "teal-11", "amber-11", "blue-grey-11", "indigo-11", "green-11", "orange-11"];

const mutations = {
  setCurrentPage(state, page) {
    state.currentPage = page;
  },
  loadClasses(state, payload) {
    if (!Array.isArray(payload)) {
      throw new Error("loadClasses: payload must be an array");
    }
    let isValid = payload.reduce((acc, curr) => acc && typeof curr === "object" && "id" in curr && "name" in curr && "color" in curr, true);
    if (!isValid) {
      throw new Error("loadClasses: payload has invalid schema");
    }
    state.classes = payload;
    state.currentClass = state.classes[0];
    LocalStorage.set("tags", state.classes);
  },
  setInputSentences(state, payload) {
      let jsonData;
      if (typeof payload === "string") {
        // Check if the payload is a JSON string
        try {
          jsonData = JSON.parse(payload);
          // If successful, continue with the JSON data processing
        } catch (jsonError) {
          payload = payload.replace(/(\r\n|\n|\r){2,}/gm, "\n"); // Turn multiple newlines into a single newline
          console.log(payload)
          // If JSON parsing fails, assume it's a text file and proceed to read its content
          jsonData = {
            annotations: [[payload, { entities: [] }]],
            classes: [], // You may need to provide some default values here based on your needs
          };
        }
      } else if (payload instanceof File) {
        // If the payload is a File (assumed to be a text file), read its content
        const fileReader = new FileReader();
        fileReader.onload = function (event) {
          try {
            const fileContent = event.target.result;
            jsonData = {
              annotations: [[fileContent, { entities: [] }]],
              classes: [], // You may need to provide some default values here based on your needs
            };

    var file = payload;
    if (this.fileName.split(".")[1] == "json") {
      file = JSON.parse(file);
    } else {
      // This forces the text file into the annotation file format, thus allowing it to be loaded the same without special edge cases
      file = file.replace(/(\r\n|\n|\r){2,}/gm, "\n");
      file = file.split(state.separator);
      file = file.map((item) => {
        return [
          item,
          {
            entities: []
          }
        ]
      })
      file = {
        annotations: file,
        classes: {}
      }
    }

    // Process Entities in Rich Entity Format (REF) used in this software
    // Additionally, stores the original state of the sentence annotations
    // This is useful for "undo all", but may eventually be replace with recursive execution of undo stack
    for(var i = 0; i < file.annotations.length; i++) {
      for (var j = 0; j < file.annotations[i][1].entities.length; j++) {
        var sentenceOriginalState = []
        var entity = file.annotations[i][1].entities[j];
        if (entity.length >= 3) {
            
            const thisAnnotationHistory = entity[2]
            const latestEntry = thisAnnotationHistory[thisAnnotationHistory.length - 1];

            const historyEntry = {
              start: entity[0],
              end: entity[1],
              history: thisAnnotationHistory,
              status: latestEntry[0],
              name: latestEntry[2],
              label: latestEntry[3],
              isSymbolActive: mutations.determineSymbolState(latestEntry[0]),
              ogNLP: thisAnnotationHistory[0][2] === "nlp",
            }
            if (historyEntry.isSymbolActive == 2) {
              // TODO: LIKELY CAUSE OF REJECTED ANNOTATIONS BEING AN ISSUE
              // If the status is "Rejected", add it to the rejected annotations
              state.rejectedAnnotations.push(historyEntry);
            } else {
              sentenceOriginalState.push(historyEntry);
            }

            // Replace the entity with the history entry
            file.annotations[i][1].entities[j] = historyEntry;
          }
      
        if (file.annotations[i][1].entities.length) state.annotationHistory[i] = sentenceOriginalState;
        }
    }

    state.originalText = file.annotations.map((item) => item[0]).join(state.separator);
    state.inputSentences = state.originalText.split(state.separator).map((s, i) => ({ id: i, text: s }));
    state.annotations = file.annotations.map((sentence) => {
      return {
        text: sentence[0],
        entities: sentence[1].entities,
      }
    })

    if (file.classes && Array.isArray(file.classes)) {
       mutations.loadClasses(state, file.classes);
    }
  },
  addClass(state, payload) {
    // Check if the class already exists
    const existingClass = state.classes.find((c) => c.name === payload);

    // If the class already exists, return
    if (existingClass) {
      return;
    }

    // Add the new class
    const lastIndex = state.classes.reduce((p, c) => (c.id > p ? c.id : p), 0);
    const newClass = {
      id: lastIndex + 1,
      name: payload,
      color: niceColors[lastIndex % niceColors.length],
    };

    // Check again to handle a race condition
    if (!state.classes.some((c) => c.name === newClass.name)) {
      state.classes = [...state.classes, newClass];

      // If this is the first class, set it as the currentClass
      if (state.classes.length === 1) {
        state.currentClass = state.classes[0];
      }
    }
  },
  removeClass(state, payload) {
    state.classes = state.classes.filter((c) => c.id != payload);
    if (state.currentClass.id === payload) {
      state.currentClass = state.classes[0];
    }
  },
  setCurrentClass(state, payload) {
    state.currentClass = state.classes[payload];
  },
  addAnnotation(state, payload) {
    state.annotations[state.currentIndex] = payload;
    state.currentAnnotation = payload;
  },
  clearAllAnnotations(state) {
    state.annotations = [];
    state.currentAnnotation = {};
  },
  setSeparator(state, payload) {
    state.separator = payload;
    state.inputSentences = state.originalText.split(state.separator).map((s, i) => ({ id: i, text: s }));
  },
  setAnnotationPrecision(state, payload) {
    state.annotationPrecision = payload;
  },
  setKeyboardShortcuts(state, payload) {
    state.enableKeyboardShortcuts = payload;
  },
  nextSentence(state) {
    if (state.currentIndex < state.inputSentences.length - 1) {
      state.currentIndex += 1;
      state.currentAnnotation = state.annotations[state.currentIndex] || {};
    } else {
      //alert("You have completed all the sentences");
    }
  },
  previousSentence(state) {
    if (state.currentIndex > 0) {
      state.currentIndex -= 1;
      state.currentAnnotation = state.annotations[state.currentIndex];
    } else {
      alert("You are at the beginning of all sentences");
    }
  },
  resetIndex(state) {
    state.currentIndex = 0;
  },

  // Global Undo Stack
  addUndoCreate(state, block) {
    var newUndo = {
      type: "remove",
      start: block.start,
    }
    state.undoStack.push(newUndo);
    state.undoStack.sort((a, b) => b.timestamp - a.timestamp);
  },
};

const getters = {};

const actions = {
  createNewClass({ commit, state }, className) {
    return new Promise((resolve, reject) => {
      commit("addClass", className);
      try {
        LocalStorage.set("tags", state.classes);
      } catch (e) {
        reject(e);
      }
      resolve();
    });
  },
  deleteClass({ commit, state }, classId) {
    commit("removeClass", classId);
    LocalStorage.set("tags", state.classes);
  },
};

window.addEventListener("beforeunload", async (event) => {
  event.returnValue = "Please make sure you export annotations before closing the file.";
});

export default {
  state() {
    let tags = LocalStorage.getItem("tags");
    return {
      annotations: [],
      rejectedAnnotations: [],
      annotationHistory: {},
      undoStack: [],
      classes: tags || [],
      inputSentences: [],
      originalText: "",
      separator: "\n",
      enableKeyboardShortcuts: false,
      annotationPrecision: "word",
      // current state
      currentAnnotation: {},
      currentClass: (tags && tags[0]) || {},
      currentIndex: 0,
      currentSentence: "",
      currentPage: "start"
    };
  },
  getters,
  mutations,
  actions,
};
