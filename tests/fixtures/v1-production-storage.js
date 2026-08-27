'use strict';

const { LEGACY_KEYS } = require('../../storage-v2.js');

const records = Object.freeze({
  checkIns: [
    {
      id: 'v1-check-in-older',
      date: '2026-08-22T23:45:00.000Z',
      feeling: 'Grounded',
      group: 'CALM / GROUNDED',
      icon: '🌲',
      skill: null,
      legacyNote: 'unknown fields stay attached'
    },
    {
      id: 'v1-check-in-newer',
      date: '2026-08-23T14:30:00.000Z',
      feeling: 'Hopeful',
      group: 'BRIGHT / GOOD',
      icon: '☀️',
      skill: null
    }
  ],
  places: [
    {
      id: 'v1-place-zion',
      name: 'Zion National Park',
      state: 'UT',
      status: 'visited',
      memory: 'Watched the canyon wake up.',
      addedAt: '2026-05-04T15:00:00.000Z'
    },
    {
      id: 'v1-place-acadia',
      name: 'Acadia National Park',
      state: 'ME',
      status: 'wishlist',
      memory: '',
      addedAt: '2026-06-11T18:10:00.000Z'
    }
  ],
  listeningLog: [
    {
      id: 'v1-listen-1',
      podcast: 'Ologies with Alie Ward',
      thought: 'Migration is easier when the old trail markers remain.',
      date: '2026-07-18T16:20:00.000Z'
    }
  ],
  campfireLibrary: [
    {
      id: 'v1-campfire-stream',
      kind: 'stream',
      title: 'A saved production episode',
      url: 'https://example.com/episode',
      category: 'Recovery',
      image: 'https://example.com/art.jpg',
      source: 'Link',
      addedAt: '2026-07-19T13:00:00.000Z'
    },
    {
      id: 'v1-campfire-reflection',
      kind: 'reflection',
      title: 'A saved production reflection',
      body: 'The complete legacy reflection remains available.',
      source: 'John',
      sourceUrl: '',
      category: "John's Picks",
      addedAt: '2026-07-20T13:00:00.000Z'
    }
  ],
  listenShelf: [
    {
      id: 'v1-shelf-1',
      title: 'An older saved listen',
      url: 'https://example.com/older-listen',
      category: 'Mind & Life',
      customLegacyField: true
    }
  ],
  parkBadges: ['zion', 'yellowstone']
});

function createV1ProductionStorage() {
  return {
    [LEGACY_KEYS.checkIns]: JSON.stringify(records.checkIns),
    [LEGACY_KEYS.places]: JSON.stringify(records.places),
    [LEGACY_KEYS.questCount]: '12',
    [LEGACY_KEYS.listeningLog]: JSON.stringify(records.listeningLog),
    [LEGACY_KEYS.campfireLibrary]: JSON.stringify(records.campfireLibrary),
    [LEGACY_KEYS.listenShelf]: JSON.stringify(records.listenShelf),
    [LEGACY_KEYS.parkBadges]: JSON.stringify(records.parkBadges),
    [LEGACY_KEYS.weatherEnabled]: 'true',
    [LEGACY_KEYS.installComplete]: 'true',
    [LEGACY_KEYS.installDismissed]: 'false'
  };
}

module.exports = { createV1ProductionStorage, records };
