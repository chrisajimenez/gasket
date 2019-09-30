/* eslint-disable max-nested-callbacks, max-len */
const assume = require('assume');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const path = require('path');


const emptyDocsConfigSet = {
  app: {
    name: 'test-app',
    description: 'Some test app',
    link: 'README.md#overview',
    targetRoot: '/path/to/app/.docs/test-app'
  },
  plugins: [],
  presets: [],
  modules: [],
  structures: [],
  commands: [],
  lifecycles: [],
  transforms: [],
  root: '/path/to/app',
  docsRoot: '/path/to/app/.docs'
};

const fullDocsConfigSet = {
  app: {
    name: 'test-app',
    description: 'Some test app',
    link: 'README.md#overview',
    targetRoot: '/path/to/app/.docs/test-app'
  },
  plugins: [{
    name: 'example-plugin',
    link: 'README.md',
    targetRoot: '/path/to/app/.docs/test-app/plugins/example-plugin'
  }],
  presets: [{
    name: 'example-preset',
    link: 'README.md',
    targetRoot: '/path/to/app/.docs/test-app/presets/example-preset'
  }],
  modules: [{
    name: 'example-module',
    link: 'README.md',
    targetRoot: '/path/to/app/.docs/test-app/modules/example-module'
  }],
  structures: [{
    name: 'example-structure',
    link: 'README.md#structures',
    targetRoot: '/path/to/app/.docs/test-app/plugins/example-plugin'
  }, {
    name: 'example-structure-no-link',
    targetRoot: '/path/to/app/.docs/test-app/plugins/example-plugin'
  }],
  commands: [{
    name: 'example-command',
    link: 'README.md#commands',
    targetRoot: '/path/to/app/.docs/test-app/plugins/example-plugin'
  }],
  lifecycles: [{
    name: 'example-lifecycle',
    link: 'README.md#lifecycles',
    targetRoot: '/path/to/app/.docs/test-app/plugins/example-plugin'
  }],
  transforms: [],
  root: '/path/to/app',
  docsRoot: '/path/to/app/.docs'
};

const writeFileStub = sinon.stub();
const generateIndex = proxyquire('../../lib/utils/generate-index', {
  util: {
    promisify: () => writeFileStub
  }
});
const { generateContent } = generateIndex;

describe('Utils - generateIndex', () => {

  beforeEach(() => {
    writeFileStub.resetHistory();
  });

  it('writes README.md in docs root', async () => {
    await generateIndex(fullDocsConfigSet);
    assume(writeFileStub.getCall(0).args[0]).eqls(path.join(fullDocsConfigSet.docsRoot, 'README.md'));
  });

  it('writes generated content to file', async () => {
    const mockContent = await generateContent(fullDocsConfigSet);
    await generateIndex(fullDocsConfigSet);
    assume(writeFileStub.getCall(0).args[1]).eqls(mockContent);
  });

  describe('generateContent', () => {

    it('adds generated comment', async () => {
      const content = await generateContent(fullDocsConfigSet);
      assume(content).includes('<!-- generated by `gasket docs` -->');
    });

    it('adds section for app', async () => {
      const content = await generateContent(fullDocsConfigSet);
      assume(content).includes('# App');
    });

    describe('links', () => {

      it('adds reference links', async () => {
        const content = await generateContent(fullDocsConfigSet);
        assume(content).includes('<!-- LINKS -->');
        //
        // count the number of ref-style links
        //
        assume(content.match(/\[.+]:/g) || []).lengthOf(7);
      });

      it('links are relative to output dir', async () => {
        const config = fullDocsConfigSet.structures[0];
        const expected = path.relative(fullDocsConfigSet.docsRoot, path.join(config.targetRoot, config.link));
        const content = await generateContent(fullDocsConfigSet);
        assume(content).includes(`[${config.name}]:`);
        assume(content).includes(`:${expected}`);
      });

      it('does not add links if not configured', async () => {
        const config = fullDocsConfigSet.structures[1];
        const content = await generateContent(fullDocsConfigSet);
        assume(content).not.includes(`[${config.name}]:`);
      });
    });

    describe('Sections', () => {

      function checkSection(name, title, includeVersion) {
        const fullContent = generateContent(fullDocsConfigSet);

        it(`adds section title`, () => {
          assume(fullContent).includes(`## ${title}`);
        });

        it(`adds section table`, () => {
          assume(fullContent).includes('| Name');
          assume(fullContent).includes('| Description');
          assume(fullContent).includes('| ----');
        });

        if (includeVersion) {
          it(`includes version in table`, () => {
            assume(fullContent).includes('| Version');
            assume(fullContent).includes('| ----');
          });
        }

        it(`table name is link`, () => {
          const config = fullDocsConfigSet[name][0];
          assume(fullContent).includes(`| [${config.name}] `);
        });

        const emptyContent = generateContent(emptyDocsConfigSet);
        it(`does not add section if no configs`, () => {
          assume(emptyContent).not.includes(`## ${title}`);
        });
      }

      describe('plugins', () => {
        checkSection('plugins', 'Plugins', true);
      });

      describe('presets', () => {
        checkSection('presets', 'Presets', true);
      });

      describe('modules', () => {
        checkSection('modules', 'Modules', true);
      });

      describe('commands', () => {
        checkSection('commands', 'Commands');
      });

      describe('lifecycles', () => {
        checkSection('lifecycles', 'Lifecycles');
      });

      describe('structures', () => {
        checkSection('structures', 'Structures');
      });
    });
  });
});