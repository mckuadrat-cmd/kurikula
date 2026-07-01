const fs = require('fs');
const readline = require('readline');

const logFile = 'C:\\Users\\setya\\.gemini\\antigravity\\brain\\5112e58c-4b1b-45c9-b348-a9d9b9470dd6\\.system_generated\\logs\\transcript_full.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(logFile),
  crlfDelay: Infinity
});

let step399Content = '';
let step403Content = '';

rl.on('line', (line) => {
  try {
    const data = JSON.parse(line);
    if (data.step_index === 399) {
      console.log(`Step 399 - type: ${data.type}, source: ${data.source}, content exists: ${!!data.content}`);
      if (data.content) step399Content = data.content;
    }
    if (data.step_index === 403) {
      console.log(`Step 403 - type: ${data.type}, source: ${data.source}, content exists: ${!!data.content}`);
      if (data.content) step403Content = data.content;
    }
  } catch (e) {
    // Ignore
  }
});

rl.on('close', () => {
  if (step399Content && step403Content) {
    const extractCodeLines = (content) => {
      const lines = content.split('\n');
      const codeLines = [];
      for (const line of lines) {
        // match "123: some code" or "123:  some code"
        const match = line.match(/^\d+:\s?(.*)$/);
        if (match) {
          codeLines.push(match[1]);
        }
      }
      return codeLines;
    };
    
    const lines1to200 = extractCodeLines(step399Content);
    const lines200to372 = extractCodeLines(step403Content);
    
    console.log(`Extracted lines 1-200: ${lines1to200.length}`);
    console.log(`Extracted lines 200-372: ${lines200to372.length}`);
    
    const combined = [];
    combined.push(...lines1to200);
    combined.push(...lines200to372.slice(1));
    
    fs.writeFileSync('reconstructed_dashboard.tsx', combined.join('\n'));
    console.log("Wrote reconstructed dashboard to reconstructed_dashboard.tsx!");
  } else {
    console.log("Could not reconstruct. Content missing.");
  }
});
