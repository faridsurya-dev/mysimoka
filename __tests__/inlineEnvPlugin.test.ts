import { transformSync } from '@babel/core';

const plugin = require('../babel/inline-mysimoka-env');

function transform(code: string) {
  return transformSync(code, { babelrc: false, configFile: false, plugins: [plugin] })?.code ?? '';
}

test('inlines MYSIMOKA_* env vars and leaves others alone', () => {
  process.env.MYSIMOKA_TEST_INLINE = 'abc';
  const out = transform(
    'const a = process.env.MYSIMOKA_TEST_INLINE; const b = process.env.MYSIMOKA_TEST_UNSET_XYZ; const c = process.env.NODE_ENV;',
  );
  delete process.env.MYSIMOKA_TEST_INLINE;
  expect(out).toContain('const a = "abc"');
  expect(out).toContain('const b = undefined');
  expect(out).toContain('process.env.NODE_ENV');
});
