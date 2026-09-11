// topicMap.js
// questions.json keeps Part 2 cue cards and Part 3 discussion questions as
// separate flat lists with their own "topic" labels (e.g. Part 2 "A gift for
// a friend" vs Part 3 "Gifts") because that's how real IELTS question banks
// are published. This file is the curated mapping that says which Part 2
// topics belong under which Part 3 discussion theme, so the app can offer a
// single combined topic to practice instead of two disconnected ones.
//
// Key: the exact Part 3 "topic" string from questions.json
// Value: the exact Part 2 "topic" string(s) that pair with it
module.exports = {
  'Losing things': ['Losing something in public'],
  'First impressions': ['A person you only met once'],
  'Making friends': ['Childhood friend'],
  'Memory and learning': ['A course that impressed you'],
  Gifts: ['A gift for a friend', 'Special cake'],
  Movies: ['Least favourite movie'],
  'Learning skills': [
    'Person who taught you a new skill',
    'Learning another language',
    'Person good at learning languages',
  ],
  History: ['Person who loves history'],
  Family: [],
  'Arts and crafts': ['Person good at making things by hand'],
  Communication: ['Uninteresting conversation', 'Unanswered message'],
  Photography: ['Person who likes taking photos'],
  'Children and skills': ['New skill learned as a child'],
  'Saving money': ['Saving money'],
  'Natural places': [
    'Natural place in your city',
    'Important river or lake',
    'Person who loves growing plants',
  ],
  'Environment and economy': ['Environmental law', 'Environmental law to introduce'],
  Organization: ['Organized person', 'Organized happy event'],
  Interviews: ['Famous person interview'],
  Happiness: ['Happy person'],
  'Decision making': [
    'Changed an important decision',
    'Important decision with a happy result',
    'Changed an important opinion',
    'Important decision',
    'Changed plan',
    'Recent change',
  ],
  Business: ['Successful businessperson', 'Person working in a successful company'],
  Cities: ['City you would visit again', 'Tall building', 'Traffic jam', 'Crowded place'],
  'Time management': ['Waste of time'],
  Rules: ['New law'],
  Ageing: ['Older person you admire'],
  Travel: ['Short trip you dislike', 'Place you recommend', 'Place to visit in free time'],
  Noise: ['Noisy place'],
};
