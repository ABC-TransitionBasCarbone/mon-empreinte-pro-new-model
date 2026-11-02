import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getModelFromSource } from '@publicodes/tools/compilation'
import Engine from 'publicodes'

const rules = getModelFromSource('data', {
  ignore: ['data/i18n/**'],
  verbose: false
})
const engine = new Engine(rules)

test('commuting starts with service, leave, telework and the transport mosaic', () => {
  const questions = ['DT . filtrage', 'DT . congé', 'DT . TT', 'DT']
  assert.deepEqual(
    questions.map((question) => rules[question].ordre),
    [1, 2, 3, 4]
  )
})

for (const car of ['DT . voiture', 'transport . voiture']) {
  test(`${car}: distance and vehicle details precede consumption and fuel`, () => {
    const questions = [
      'km',
      ...(car === 'DT . voiture' ? ['utilisateur'] : ['meme voiture']),
      'gabarit',
      'motorisation',
      'thermique . consommation aux 100',
      'thermique . carburant',
      car === 'DT . voiture' ? 'voyageurs' : 'passagers'
    ]
    const orders = questions.map((question) => rules[`${car} . ${question}`].ordre)
    assert.ok(orders.every(Number.isFinite))
    assert.ok(
      orders.every((order, index) => index === 0 || order > orders[index - 1])
    )
    assert.equal(
      rules[`${car} . électrique . consommation aux 100`].ordre,
      rules[`${car} . thermique . consommation aux 100`].ordre
    )
  })

  for (const motor of ['thermique', 'hybride', 'électrique']) {
    test(`${car}: ${motor} only enables its own consumption questions`, () => {
      const current = engine.shallowCopy().setSituation({
        'DT . voiture . présent': 'oui',
        'DT . voiture . utilisateur': "'propriétaire'",
        'DT . voiture . km': 20,
        'transport . voiture . présent': 'oui',
        'transport . voiture . km': 200,
        'transport . voiture . meme voiture': 'non',
        [`${car} . motorisation`]: `'${motor}'`
      })
      for (const suffix of ['consommation aux 100', 'carburant']) {
        assert.equal(
          current.evaluate({ 'est applicable': `${car} . thermique . ${suffix}` }).nodeValue,
          motor !== 'électrique'
        )
      }
      assert.equal(
        current.evaluate({ 'est applicable': `${car} . électrique . consommation aux 100` }).nodeValue,
        motor === 'électrique'
      )
    })
  }
}

for (const selected of ['bus', 'métro ou tram']) {
  test(`public transport only asks for hours on the selected ${selected} branch`, () => {
    const current = engine.shallowCopy().setSituation({
      'transport . transports commun . présent': 'oui',
      'transport . transports commun . type . bus . présent': selected === 'bus' ? 'oui' : 'non',
      'transport . transports commun . type . métro ou tram . présent': selected === 'métro ou tram' ? 'oui' : 'non'
    })
    for (const branch of ['bus', 'métro ou tram']) {
      assert.equal(
        current.evaluate({ 'est applicable': `transport . transports commun . type . ${branch} . heures` }).nodeValue,
        branch === selected
      )
      if (branch !== selected) {
        assert.equal(current.evaluate(`transport . transports commun . type . ${branch}`).nodeValue, null)
      }
    }
  })
}

test('the office information has a single OK choice and keeps the footprint after confirmation', () => {
  const question = 'bureaux . énergie . question rhétorique'
  assert.deepEqual(rules[question].formule['une possibilité'].possibilités, ['ok'])
  assert.equal(rules[`${question} . ok`].titre, 'OK')
  const current = engine.shallowCopy().setSituation({})
  assert.equal(current.evaluate('bureaux . énergie').nodeValue, 282)
  assert.ok(
    Object.hasOwn(current.evaluate('bureaux . énergie').missingVariables, question)
  )
  current.setSituation({ [question]: "'ok'" })
  assert.equal(current.evaluate('bureaux . énergie').nodeValue, 282)
})

test('the commuting two-wheel passenger question counts the driver and has a numeric default', () => {
  const question = rules['DT . deux roues . passagers']
  assert.equal(
    question.question,
    'Combien de personnes voyagent avec vous en moyenne sur votre deux-roues lors de vos déplacements domicile-travail ?'
  )
  assert.equal(question['par défaut'], 1)
  assert.equal(question.unité, 'personne')
})

test('same-car remains applicable with default distances when distance questions are skipped', () => {
  const current = engine.shallowCopy().setSituation({
    'DT . voiture . présent': 'oui',
    'DT . voiture . utilisateur': "'propriétaire'",
    'transport . voiture . présent': 'oui'
  })
  assert.equal(
    current.evaluate({ 'est applicable': 'transport . voiture . meme voiture' })
      .nodeValue,
    true
  )
})
