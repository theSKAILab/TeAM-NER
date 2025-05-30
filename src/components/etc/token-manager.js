class TokenManager {
  /**
   *
   * @param {Array} tokens
   */
  constructor(classes) {
    this.classes = classes
    this.tokens = []; // Initialize tokens array
    this.rejectedAnnotations = []; // Initialize rejected annotations array
  }

  setTokensAndAnnotation(tokens, currentAnnotation) {
    // Initialize tokens with provided annotation data
    this.tokens = tokens.map((t) => ({
      type: "token",
      start: t[0],
      end: t[1],
      text: t[2],
      currentState: "Candidate",
    }));
    this.words = tokens.map(t => t[2]);
    if (currentAnnotation != undefined) {
      // reset previous annotation state
      for (let i = 0; i < currentAnnotation.entities.length; i++) {
        var annotation = currentAnnotation.entities[i];

        var entityName = annotation.labelClass.name;
        var entityClass = this.classes.find(c => c.name == entityName);
        if (!entityClass) {
          entityClass = { "name": entityName };
        }
        this.addNewBlock(annotation.start, annotation.end, entityClass, annotation.currentState);
      }
    }
  }

  isOverlapping(start, end) {
    var overlappingBlocks = [];

    for (let i = 0; i < this.tokens.length; i++) {
      let currentToken = this.tokens[i];
      if (currentToken.type === "token-block") {
        if ((start >= currentToken.start && start <= currentToken.end) ||
            (end >= currentToken.start && end <= currentToken.end))
        // start is inside a token block
        overlappingBlocks.push(currentToken);
      }
    }
    return overlappingBlocks.length > 0? overlappingBlocks : null;
  }

  addBlockFromBlock(block) {
    this.addNewBlock(
      block.start,
      block.end,
      block.labelClass,
      block.currentState,
      block.annotationHistory,
    )
  }

  /**
   * Creates a new token block with the tokens whose starts match the input
   * parameters
   *
   * @param {Number} start 'start' value of the token forming the start of the token block
   * @param {Number} end 'start' value of the token forming the end of the token block
   * @param {Number} _class the id of the class to highlight
   * @param {Boolean} isHumanOpinion Separate nlp vs human made annotation
   */
  addNewBlock(_start, _end, _class, currentState = "Candidate", page = "annotate") {
    // Directly apply humanOpinion to the block structure
    let selectedTokens = [];
    let newTokens = [];

    let selectionStart = _end < _start ? _end : _start;
    let selectionEnd = _end > _start ? _end : _start;

    for (let i = 0; i < this.tokens.length; i++) {
      let currentToken = this.tokens[i];
      if (currentToken.start >= selectionEnd && selectedTokens.length) {
        // token is first after the selection
        appendNewBlock(selectedTokens, _class, newTokens); // Append selected tokens with updated attributes
        selectedTokens = []; // Ensure selected tokens are cleared after use
        newTokens.push(currentToken);
      } else if (currentToken.end >= selectionStart && currentToken.start < selectionEnd) {
        // overlapping selection
        // token is inside the selection
        if (currentToken.type == "token-block") {
          if (page == "review") {
            this.rejectedAnnotations.push(currentToken);
          }
          this.removeBlock(currentToken.start);
          i--
        } else if (currentToken.type == "token") {
          selectedTokens.push(currentToken);
        }

        // add logic to add block to page if the end of it is the end of the tokens
      } else {
        newTokens.push(currentToken);
      }
    }


    if (selectedTokens.length) {
      appendNewBlock(selectedTokens, _class, newTokens); // Append selected tokens with updated attributes
      selectedTokens = []; // Ensure selected tokens are cleared after use
      //newTokens.push(currentToken);
    }
    // Update the tokens array with new tokens
    this.tokens = newTokens;
    function appendNewBlock(tokens, _class, tokensArray) {
      if (tokens.length) {
        let newBlock = {
          type: "token-block",
          start: tokens[0].start,
          end: tokens[tokens.length - 1].end,
          tokens: tokens,
          labelClass: _class,
          classId: _class.id || 0,
          currentState: currentState,
          reviewed: false,
        };
        tokensArray.push(newBlock);
      }
    }
  }

  /**
   * Removes a token block and puts back all the tokens in their original position
   *
   * @param {Number} blockStart 'start' value of the token block to remove
   */
  removeBlock(blockStart) {
    let newTokens = [];
    for (let i = 0; i < this.tokens.length; i++) {
      if (
        this.tokens[i].type === "token-block" &&
        this.tokens[i].start === blockStart
      ) {
        newTokens.push(...this.tokens[i].tokens);
      } else {
        newTokens.push(this.tokens[i]);
      }
    }
    this.tokens = newTokens;
  }

  /**
   * Exports the tokens and the token blocks as annotations
   */
  exportAsAnnotation() {
    let entities = [];
    for (let i = 0; i < this.tokens.length; i++) {
      if (this.tokens[i].type === "token-block") {
        let b = this.tokens[i];
        const historyEntry = {
          start: b.start,
          end: b.end,
          history: b.annotationHistory,
          currentState: b.currentState,
          name: b.name,
          labelClass: b.labelClass,
          reviewed: b.reviewed,
        }
        entities.push(historyEntry);
      }
    }
    for (let i = 0; i < this.rejectedAnnotations.length; i++) {
      let b = this.rejectedAnnotations[i];
      const historyEntry = {
        start: b.start,
        end: b.end,
        history: b.annotationHistory,
        currentState: "Rejected",
        name: b.name,
        labelClass: b.labelClass,
        reviewed: b.reviewed,
      }
      entities.push(historyEntry);
    }
    return entities;
  }

  // Returns a token-block given its starting index, else returns null
  getBlockByStart(start) {
    for (let i = 0; i < this.tokens.length; i++) {
      const token = this.tokens[i];
      if (token.type === "token-block" && token.start === start) {
        return token;
      }
    }

    return null;
  }
}

export default TokenManager;