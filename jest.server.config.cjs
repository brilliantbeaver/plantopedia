module.exports = {
 modulePathIgnorePatterns:['/\\.vercel/'],
 testEnvironment:'node', testMatch:['<rootDir>/server/tests/**/*.test.ts','<rootDir>/tests/unit/**/*.test.ts'],
 extensionsToTreatAsEsm:['.ts'], transform:{'^.+\\.ts$':['@swc/jest',{jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'es6'}}]},
 moduleNameMapper:{'^(\\.{1,2}/.*)\\.js$':'$1'},
 collectCoverageFrom:['server/src/application/**/*.ts','src/features/capture/metadata.ts'], coverageDirectory:'coverage/server',
};
