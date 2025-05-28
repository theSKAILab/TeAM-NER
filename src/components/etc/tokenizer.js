class Tokenizer {
    constructor() {
        // This is the regex used for tokenization, changing this will change the behavior of the groupings of words and symbols

        // Explanation of the regex used for tokenization:
        // First Part: [\w\-\'\"\[\]\(\)]+
            // This part matches any combination of word characters (letters, digits, and underscores), hyphens, single quotes, double quotes, square brackets, and parentheses.
            // The + sign means it will match one or more of these characters in a row.
        // Second Part: \$[\d\.\S]
            // This part matches a dollar sign $ followed by any digit, a period, or any non-whitespace character.
        // Third Part: \S
            // This part matches any single non-whitespace character.

        this.regex = /[\w\-\'\"\[\]\(\)]+|\$[\d\.\S]|\S/gm; 
    }

    tokenize(text) {
        const tokens = text.match(new RegExp(this.regex, 'g'));
        return tokens ? tokens.map(token => token.trim()) : [];
    }

    span_tokenize(text) {
        const tokens = this.tokenize(text);
        const spans = [];

        let startIndex = 0;
        for (const token of tokens) {
            const start = text.indexOf(token, startIndex);
            const end = start + token.length;
            spans.push([start, end, token]);
            startIndex = end;
        }

        return spans;
    }
}

export default Tokenizer;