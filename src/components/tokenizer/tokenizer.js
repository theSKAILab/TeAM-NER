class Tokenizer {
    constructor() {
        this.regex = /\w+|\$[\d\.]+|\S+/gm;
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