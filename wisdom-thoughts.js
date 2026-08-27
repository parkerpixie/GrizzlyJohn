(() => {
  'use strict';

  const THOUGHTS = Object.freeze([
    'What are you trying to solve today that might only need to be allowed?',
    'A boundary does not become mean just because somebody dislikes where you put it.',
    'Notice what went right before your brain submits its incident report.',
    'You can change direction without declaring the old direction a failure.',
    'Not every uncomfortable feeling needs an immediate committee meeting.',
    'What is the smallest honest step available from where you actually are?',
    'Today only needs today’s amount of courage.',
    'Acceptance is not approval. It is ending the argument with what already happened.',
    'What could you set down without dropping anything that truly matters?',
    'Rest is not a reward for becoming exhausted enough.',
    'The next right thing is allowed to be unimpressive.',
    'Where would curiosity be more useful than certainty today?',
    'You do not have to attend every argument your mind schedules.',
    'What deserves your energy, and what is merely being loud?',
    'A slower pace can still be forward motion.',
    'Who could help if you stopped requiring yourself to do this alone?',
    'There is no medal for making a hard day harder in private.',
    'What is one thing you can appreciate without turning it into a lesson?',
    'Humility can sound like: I might not have the whole story yet.',
    'Blue would like to remind everyone that a walk can be the entire agenda.',
    'What are you protecting when you say yes too quickly?',
    'You can be disappointed and still choose what happens next.',
    'Sometimes letting go means refusing to rehearse the same case again.',
    'What would self-respect ask you to stop negotiating?',
    'One day at a time also means you do not owe tomorrow an answer tonight.',
    'What good thing has become ordinary enough that you nearly missed it?',
    'You are allowed to ask for directions before the trail becomes a rescue operation.',
    'What if uncertainty is a place to stand, not a problem to eliminate?',
    'A useful pause is still an action.',
    'Where could a little humor loosen the knot without dismissing what matters?',
    'You can apologize for your part without adopting everybody else’s part too.',
    'What would be enough for this particular day?',
    'A changed mind is evidence that you kept paying attention.',
    'Which expectation belongs to reality, and which one belongs to the brochure?',
    'Connection usually begins before you feel perfectly ready for it.',
    'What can you do gently that you have been trying to force?',
    'The trail does not insult you when it requires a switchback.',
    'What are you grateful for that did not need to be earned?',
    'You can miss the old way and still choose the healthier one.',
    'Being honest about your limits is more useful than being impressive about them.',
    'What would happen if you let this be awkward instead of making it catastrophic?',
    'Your first thought may be loud. It does not automatically get the final vote.',
    'Where have you already shown more steadiness than you are giving yourself credit for?',
    'You do not need a five-year plan for a five-minute decision.',
    'What could become possible if you asked one clear question?',
    'Recovery is often ordinary work repeated without a dramatic soundtrack.',
    'A quiet no can protect a wholehearted yes.',
    'What part of today would improve if you stopped rushing past it?',
    'Blue has never once worried that a nap damaged his legacy.',
    'What are you carrying because it matters, and what are you carrying from habit?',
    'You can take responsibility without turning yourself into the villain.',
    'What is one signal that things are going better than they used to?',
    'A small course correction beats defending the wrong road out of pride.',
    'You are allowed to leave some questions unanswered and still eat dinner.',
    'Where might listening do more work than explaining?',
    'The fact that a choice is hard does not mean it is wrong.',
    'What would kindness toward future John look like in the next hour?',
    'You do not have to feel fearless to behave with care.',
    'What can be repaired, and what simply needs to be released?',
    'Sometimes progress looks like noticing the old pattern before acting it out.',
    'What pleasure have you postponed for no particularly good reason?',
    'Your worth is not being graded by today’s productivity.',
    'Where could you trade a perfect response for a present one?',
    'A request for help is information, not a confession of failure.',
    'What would you choose if proving a point were no longer part of the assignment?',
    'You can honor what mattered without returning to what hurt.',
    'What is your body asking for before your brain writes another memo?',
    'There are days when staying steady is the adventure.',
    'What deserves a second look because your first reaction arrived tired?',
    'You can be a work in progress without treating yourself like a construction hazard.',
    'What is one thing you know now that makes the next step kinder?',
    'Leave a little room for the day to surprise you in a good way.'
  ]);

  function thoughtIndexForLocalDate(dateKey) {
    if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
    const [year, month, day] = dateKey.split('-').map(Number);
    const localNoon = new Date(year, month - 1, day, 12);
    if (localNoon.getFullYear() !== year || localNoon.getMonth() !== month - 1 || localNoon.getDate() !== day) return null;
    return Math.floor(localNoon.getTime() / 86400000) % THOUGHTS.length;
  }

  function thoughtForLocalDate(dateKey) {
    const index = thoughtIndexForLocalDate(dateKey);
    return index === null ? null : THOUGHTS[(index + THOUGHTS.length) % THOUGHTS.length];
  }

  const api = Object.freeze({ THOUGHTS, thoughtIndexForLocalDate, thoughtForLocalDate });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.GrizzlyJohnThoughts = api;
})();
