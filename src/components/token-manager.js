class TokenManager {
  /**
   *
   * @param {Array} tokens
   */
  constructor(classes) {
    this.classes = classes
    this.tokens = []; // Initialize tokens array
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
      // reset prevoius annotation state
      for (let i = 0; i < currentAnnotation.entities.length; i++) {
        var start = currentAnnotation.entities[i][1];
        var end = currentAnnotation.entities[i][2];
        var entityName = currentAnnotation.entities[i][3];
        var entityClass = this.classes.find(c => c.name.toUpperCase() === entityName.toUpperCase());        
        if (!entityClass) {
          entityClass = {"name": entityName};
        }
        this.addNewBlock(start, end, entityClass, true);
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
   * @param {Boolean} isHumanOpinion Seperate nlp vs human made annotation

   */
  addNewBlock(_start, _end, _class, humanOpinion, initiallyNLP = false, isLoaded, name="name", status ="Candidate", annotationHistory, userHasToggled = true,isSymbolActive = 0) {
    // Directly apply humanOpinion to the block structure
    let block = {
      type: "token-block",
      annotationHistory: annotationHistory,
      start: _start,
      end: _end,
      name: name,
      label: _class.name,
      humanOpinion: true,
      initiallyNLP: initiallyNLP,
      userHasToggled: userHasToggled, // Ensure it's set for the new block
      isSymbolActive: isSymbolActive, // Ensure it's set for the new block
      isCandidate: false,
      isLoaded: isLoaded,
      status: status,
      tokens: this.tokens.filter(token => token.start >= _start && token.end <= _end),
      backgroundColor: _class.color || null,
    };
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
          this.removeBlock(currentToken.start);
          i--
      //    selectionEnd-=1
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
          isDeleted: false,
          classId: _class.id || 0,
          backgroundColor: _class.color || null,
          // Set these attributes for all token-blocks, updating existing blocks as needed
          initiallyNLP: updateAttributes ? initiallyNLP : false,
          userHasToggled: true,
          isSymbolActive: isSymbolActive,
          isLoaded: isLoaded,
          status: status,
          annotationHistory: annotationHistory,
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
   * Marks a token block as rejected
   * 
   * @param {Number} blockStart 
   */
  makeRejected(blockStart) {
    for (let i = 0; i < this.tokens.length; i++) {
      if (this.tokens[i].start == blockStart) {
        this.tokens[i].status = "Rejected";
        this.tokens[i].isSymbolActive = 2;
        this.tokens[i].isDeleted = true;
        console.log(this.tokens[i]);
      }
    }
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
        entities.push([b.name, b.start, b.end, b.label, b.initiallyNLP, b.isSymbolActive, b.userHasToggled, b.isLoaded,b.status,b.annotationHistory]);
      }
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
    ////console.log("Error, Unable to get block by start in token-manager.js");
    return null;
  }  
}



export default TokenManager;



/// Make toggle between open/close/reject
/// Update it so previous / loadable 
/// 