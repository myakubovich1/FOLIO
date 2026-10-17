import tseslint from 'typescript-eslint';
export default tseslint.config({ignores:['dist/**','.next/**','next-env.d.ts','node_modules/**','.workflow/**','test-results/**']},...tseslint.configs.recommended,{files:['**/*.ts','**/*.tsx'],rules:{'@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}]}});
