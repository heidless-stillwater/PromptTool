import { syncModifiersWithText, syncVariablesWithText } from './src/lib/prompt-utils';

const variables = {
    MEDIUM: { currentValue: 'sketch', defaultValue: 'sketch', source: 'registry' },
    BUILDING_NAME: { currentValue: 'tower of london', defaultValue: 'tower of london', source: 'prompt' }
};

const text = "Blueprint-style diagram showing how the [BUILDING_NAME:tower of london] was built. Multiple labeled steps : site preparation and foundations, prefabrication of iron components, riveted assembly, crane and scaffolding systems, structural bracing, final elevation and detailing. Cross-sections, arrows, minimal color, historically accurate, clean vector lines. [medium:sketch]";

console.log("Initial text:", text);
let currentText = text;

for (let i = 0; i < 5; i++) {
    currentText = syncVariablesWithText(currentText, variables);
    console.log(`Iteration ${i + 1}:`, currentText);
}
