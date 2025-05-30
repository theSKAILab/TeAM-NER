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

  getTokenByStart(start) {
      return this.tokens.find(token => token.start === start);
  }

  setTokensAndAnnotation(tokens, currentAnnotation) {
    // Initialize tokens with provided annotation data
    this.tokens = tokens.map((t) => ({
      type: "token",
      start: t[0],
      end: t[1],
      text: t[2],
      humanOpinion: true,
      isSymbolActive: 0, // Default humanOpinion to true for all initial tokens
    }));
    this.words = tokens.map(t => t[2]);
    if (currentAnnotation != undefined) {
      // reset previous annotation state
      for (let i = 0; i < currentAnnotation.entities.length; i++) {
        var annotation = currentAnnotation.entities[i];
  
        var entityName = annotation.label;
        var entityClass = this.classes.find(c => c.name == entityName);        
        if (!entityClass) {
          entityClass = {"name": entityName};
        }
        this.addNewBlock(annotation.start, annotation.end, entityClass, annotation.ogNLP, annotation.ogNLP, true, annotation.name, annotation.status, annotation.history, annotation.isSymbolActive);
      }
    }
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
  addNewBlock(_start, _end, _class, humanOpinion, initiallyNLP = false, isLoaded, name="name", status ="Candidate", annotationHistory, isSymbolActive = 0, page) {
    // Directly apply humanOpinion to the block structure
    let selectedTokens = [];
    let newTokens = [];
  
    let selectionStart = _end < _start ? _end : _start;
    let selectionEnd = _end > _start ? _end : _start;
    
    for (let i = 0; i < this.tokens.length; i++) {
      let currentToken = this.tokens[i];
      if (currentToken.start >= selectionEnd && selectedTokens.length) {
        // token is first after the selection
        appendNewBlock(selectedTokens, _class, newTokens, true); // Append selected tokens with updated attributes
        selectedTokens = []; // Ensure selected tokens are cleared after use
        newTokens.push(currentToken);
      } else if (currentToken.end >= selectionStart && currentToken.start < selectionEnd) {
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
      appendNewBlock(selectedTokens, _class, newTokens, true); // Append selected tokens with updated attributes
      selectedTokens = []; // Ensure selected tokens are cleared after use
      //newTokens.push(currentToken);
    }
    // Update the tokens array with new tokens
    this.tokens = newTokens;
    function appendNewBlock(tokens, _class, tokensArray, updateAttributes = false) {
      if (tokens.length) {
        let newBlock = {
          type: "token-block",
          start: tokens[0].start,
          end: tokens[tokens.length - 1].end,
          name: name,
          tokens: tokens,
          humanOpinion: true,
          label: _class.name,
          classId: _class.id || 0,
          backgroundColor: _class.color || null,
          // Set these attributes for all token-blocks, updating existing blocks as needed
          initiallyNLP: updateAttributes ? initiallyNLP : false,
          isSymbolActive: isSymbolActive,
          isLoaded: isLoaded,
          status: status,
          annotationHistory: annotationHistory,
          userHasToggled: false,
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
   * Removes all the tag blocks and leaves only tokens
   */
  resetBlocks() {
    let newTokens = [];
    for (let i = 0; i < this.tokens.length; i++) {
      if (this.tokens[i].type === "token") {
        newTokens.push(this.tokens[i]);
      } else {
        newTokens.push(...this.tokens[i].tokens);
      }
    }
    this.tokens = newTokens;
  }

  updateSymbolState(tokenStart, newSymbolState) {
    const tokenBlock = this.tokens.find(token => token.type === 'token-block' && token.start === tokenStart);
    tokenBlock.isSymbolActive = newSymbolState;
    tokenBlock.userHasToggled = true; // Update based on user interaction
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
          status: b.status,
          name: b.name,
          label: b.label,
          isSymbolActive: b.isSymbolActive,
          ogNLP: b.initiallyNLP,
          userHasToggled: b.userHasToggled,
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
        status: "Rejected",
        name: b.name,
        label: b.label,
        isSymbolActive: 2,
        ogNLP: b.initiallyNLP,
        userHasToggled: b.userHasToggled,
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