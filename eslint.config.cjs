const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
const tseslint = require('typescript-eslint');
module.exports = defineConfig([
 { ignores: ['**/dist/**','**/.vercel/**','server/public/**','node_modules/**','server/node_modules/**','packages/**/node_modules/**','coverage/**','artifacts/**','.expo/**'] },
 expo,
 { files:['server/**/*.ts','packages/**/*.ts','scripts/**/*.ts'], extends:[tseslint.configs.recommended], languageOptions:{globals:{process:'readonly',Buffer:'readonly',console:'readonly',setTimeout:'readonly',clearTimeout:'readonly'}} },
 { files:['src/**/*.{ts,tsx}'], rules:{'no-restricted-imports':['error',{patterns:[{group:['**/server/**','firebase-admin','openai','@tavily/*','langsmith','langsmith/*'],message:'Privileged clients belong on the server.'}]}]} },
 { files:['src/**/*.{ts,tsx}'], rules:{'no-restricted-syntax':['error',
   { selector:'MemberExpression[property.name=/^(toSorted|toReversed|toSpliced|with)$/]', message:'The installed native runtime lacks ES2023 array copy methods. Copy with slice/spread before sorting, reversing, or splicing.' },
   { selector:'MemberExpression[computed=true][property.value=/^(toSorted|toReversed|toSpliced|with)$/]', message:'The installed native runtime lacks ES2023 array copy methods. Use a copied array.' },
   { selector:'CallExpression[callee.type="MemberExpression"][callee.property.name="throwIfAborted"]', message:'Native AbortSignal lacks this method. Use the portable platform/abort helper.' }
 ]} },
 { files:['**/*.{ts,tsx}'], rules:{'@typescript-eslint/no-redeclare':'off','@typescript-eslint/no-explicit-any':'error','@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}]} }
]);
