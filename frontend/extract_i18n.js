import fs from 'fs';

const content = fs.readFileSync('src/contexts/LanguageContext.tsx', 'utf-8');

// Use regex to find the translations object block
const match = content.match(/const translations: Record<Language, Translations> = (\{[\s\S]*?\n\});\n/);

if (match && match[1]) {
  // Convert TS object to a JS parsable string
  let objStr = match[1];
  
  // Create a function to evaluate the object safely
  const getTranslations = new Function('return ' + objStr);
  
  try {
    const translations = getTranslations();
    
    // Create locales directory
    if (!fs.existsSync('src/locales')) {
      fs.mkdirSync('src/locales');
    }
    
    // Write JSON files
    fs.writeFileSync('src/locales/es.json', JSON.stringify(translations.es, null, 2));
    fs.writeFileSync('src/locales/en.json', JSON.stringify(translations.en, null, 2));
    
    console.log('Successfully extracted translations to src/locales/es.json and src/locales/en.json');
  } catch (e) {
    console.error('Error parsing object:', e);
  }
} else {
  console.log('Could not find translations object.');
}
