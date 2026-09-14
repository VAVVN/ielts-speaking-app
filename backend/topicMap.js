// topicMap.js
// questions.json keeps Part 2 cue cards and Part 3 discussion questions as
// separate flat lists with their own "topic" labels (e.g. Part 2 "A gift for
// a friend" vs Part 3 "Gifts") because that's how real IELTS question banks
// are published. This file is the curated mapping that says which Part 2
// topics belong under which Part 3 discussion theme, so the app can offer a
// single combined topic to practice instead of two disconnected ones.
//
// Verified against the real exam-session pairing on
// https://onthiielts.com.vn/bo-de-du-doan-ielts-speaking-forecast-2026/
// (2026-09-14) - each Part 2 cue card listed here is the one whose actual
// Part 3 discussion set lives under that key's topic bucket.
//
// Key: the exact Part 3 "topic" string from questions.json
// Value: the exact Part 2 "topic" string(s) that pair with it
module.exports = {
  'Losing things': ['Losing something in public'],
  'First impressions': ['A person you only met once'],
  'Making friends': ['A person you only met once', 'Childhood friend'],
  'Memory and learning': ['A course that impressed you'],
  Gifts: ['A gift for a friend'],
  Movies: ['Least favourite movie'],
  'Learning skills': ['Person who taught you a new skill'],
  History: ['Person who loves history'],
  Family: ['Enjoyable evening'],
  'Arts and crafts': ['Person good at making things by hand'],
  Communication: ['Uninteresting conversation', 'Unanswered message'],
  Photography: ['Person who likes taking photos'],
  'Children and skills': ['New skill learned as a child'],
  'Saving money': ['Saving money'],
  'Natural places': ['Natural place in your city'],
  'Environment and economy': ['Natural place in your city'],
  Organization: ['Organized person', 'Organized happy event'],
  Interviews: ['Famous person interview'],
  Happiness: ['Happy person'],
  'Decision making': [
    'Changed an important decision',
    'Important decision with a happy result',
    'Important decision',
  ],
  Business: [
    'Difficult and successful person',
    'Successful businessperson',
    'Person working in a successful company',
  ],
  Cities: ['City you would visit again', 'Crowded place'],
  Shopping: ['Good service'],
  Economy: ['Good service'],
  'Time management': ['Waste of time', 'Getting up early'],
  Stress: ['Waste of time'],
  Rules: ['Waste of time', 'Environmental law', 'New law', 'Environmental law to introduce'],
  Generations: ['Older person you admire'],
  Ageing: ['Older person you admire'],
  Travel: ['Short trip you dislike', 'Place to visit in free time'],
  Noise: ['Noisy place'],
  'Public behaviour': ['Noisy place'],
  Transportation: ['Crowded place', 'Traffic jam'],
  Popularity: ['Famous person in local area'],
  'Change and plans': ['Recent change', 'Changed plan'],
  Opinions: ['Changed an important opinion'],
  Ambition: ['Long-term goal'],
  'Animals and pets': ['Story or book with animals'],
  Advertising: ['Advertisement with a famous person'],
  Holidays: ['Place you recommend'],
  'Artificial intelligence': ['Technological problem'],
  'Language learning': ['Person good at learning languages', 'Learning another language'],
  'Food and festivals': ['Food for a special occasion', 'Special cake'],
  Sports: ['Live sports event'],
  'Medical careers': ['Medical career'],
  Teamwork: ['Working in a group'],
  'Gardening and plants': ['Person who loves growing plants'],
  'Videos and media': ['Interesting video'],
  'Architecture and buildings': ['Tall building'],
  Boredom: ['Boring place'],
  'Leisure time': ['Inexpensive special day out'],
  News: ['Local news'],
  'Homes and visiting': ['Home you like to visit'],
  'Rivers and lakes': ['Important river or lake'],
};
