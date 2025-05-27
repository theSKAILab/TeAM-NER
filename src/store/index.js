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

            // Proceed with the JSON data processing
            processJsonData(jsonData);
          } catch (error) {
            console.error(`Error processing text file: ${error.message}`);
          }
        };

        fileReader.readAsText(payload);
        return;
      } else {
        throw new Error("Invalid payload type");
      }

      // Continue with the JSON data processing
      processJsonData(jsonData);
    function determineSymbolState(status) {
      switch (status) {
        case "Accepted": return 1;
        case "Rejected": return 2;
        case "Candidate": return 0;
        default: return 0; // Default to candidate if unrecognized status
      }
    }

    function processJsonData(jsonData) {
      /*
      Function to process data in input entities section and map to token metadata
      Currenlty set to send the last annotation in the list of annotation history
      as the information which gets loaded into review page on enter
      */
      const processedTexts = jsonData.annotations.map(([annotationText, annotationEntities], i) => {
        // Store the history of annotations to export to review page
        let annotationHistory = [];
        annotationEntities.entities.forEach((entity) => {
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
              isSymbolActive: determineSymbolState(latestEntry[0]),
              ogNLP: thisAnnotationHistory[0][2] === "nlp",
            }
            if (historyEntry.isSymbolActive != 2) {
              annotationHistory.push(historyEntry);
            } else {
              // If the status is "Rejected", add it to the rejected annotations
              state.rejectedAnnotations.push(historyEntry);
            }

          }
        });
        if (annotationEntities.entities.length) state.annotationHistory[i] = annotationHistory;

        return { id: i, text: annotationText };
      });
      state.originalText = processedTexts.map((item) => item.text).join(state.separator);
      state.inputSentences = state.originalText.split(state.separator).map((s, i) => ({ id: i, text: s }));

      if (jsonData.classes && Array.isArray(jsonData.classes)) {
        mutations.loadClasses(state, jsonData.classes);
      }
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
  loadAnnotations(state, payload) {
    let isValid = typeof payload === "object" && "annotations" in payload && "classes" in payload;

    if (!isValid) {
      throw new Error("loadAnnotations: payload has invalid schema");
    }

    let annotations = payload.annotations;
    if (!Array.isArray(annotations)) {
      throw new Error("loadAnnotations: payload must be an array");
    }

    let newAnnotations = [];

    for (var i = 0; i < annotations.length; i++) {
      if (annotations[i] == null) continue;
      let annotation = {
        text: annotations[i][0],
        entities: annotations[i][1].entities,
      };
      newAnnotations[i] = annotation;
    }
    state.annotations = newAnnotations;
    state.currentAnnotation = state.annotations[state.currentIndex];
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
      currentPage: "start",
      fileName: "",
      lastSavedTimestamp: null,
    };
  },
  getters,
  mutations,
  actions,
};
