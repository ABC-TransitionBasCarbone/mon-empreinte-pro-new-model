import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addTranslationToBaseRules } from '../../scripts/i18n/addTranslationToBaseRules.js'

test('ignores stale suggestions and translates existing suggestions', () => {
  const baseRules = {
    stale: { question: 'Question' },
    staleMosaic: { question: 'Question' },
    ordinary: { suggestions: { un: 1, deux: 2 } },
    mosaic: { mosaique: { suggestions: { un: 1, deux: 2 } } }
  }
  const translatedRules = {
    stale: { suggestions: ['one'] },
    staleMosaic: { mosaique: { suggestions: ['one'] } },
    ordinary: { suggestions: ['one', 'two'] },
    mosaic: { mosaique: { suggestions: ['one', 'two'] } }
  }

  assert.deepEqual(addTranslationToBaseRules(baseRules, translatedRules), {
    stale: { question: 'Question' },
    staleMosaic: { question: 'Question' },
    ordinary: { suggestions: { one: 1, two: 2 } },
    mosaic: { mosaique: { suggestions: { one: 1, two: 2 } } }
  })
})
