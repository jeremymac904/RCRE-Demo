/**
 * RCRE Community — the learning community inside Training.
 *
 * The point this content has to make, in about four seconds of a broker
 * scrolling it: RCRE agents are not handed software and left alone. There is a
 * room, an instructor, and other agents working the same problems.
 *
 * Two rules held throughout:
 *
 * 1. **Every course, lesson and prompt referenced here is real.** They resolve
 *    to the imported AI Advantage curriculum — 14 courses, 181 lessons. A post
 *    citing a lesson that does not exist would undo the exact claim the
 *    community is making.
 * 2. **Jeremy McDonald appears as the instructor because he is one.** The RCRE
 *    agents posting are synthetic, and the login screen already says every
 *    figure in this environment is invented.
 */

import { lessonById, courseById } from '@/lib/academy'

export type CommunityCategory =
  | 'General Discussion' | 'AI Questions' | 'Lead Follow Up' | 'Marketing'
  | 'Listings' | 'AI Tools' | 'Wins' | 'Training' | 'RCRE Updates'

export const CATEGORIES: CommunityCategory[] = [
  'General Discussion', 'AI Questions', 'Lead Follow Up', 'Marketing',
  'Listings', 'AI Tools', 'Wins', 'Training', 'RCRE Updates',
]

export interface CommunityComment {
  id: string
  authorId: string
  authorName: string
  initials: string
  photo?: string
  body: string
  agoHours: number
}

export interface CommunityPost {
  id: string
  category: CommunityCategory
  title: string
  body: string
  authorId: string
  authorName: string
  authorRole: string
  initials: string
  photo?: string
  agoHours: number
  likes: number
  pinned?: boolean
  /** Marks the recurring "AI Training of the Day" format. */
  trainingOfTheDay?: boolean
  /** Links the post to a REAL lesson, so Community opens Classroom. */
  lessonId?: string
  /** A real prompt lifted from the lesson, shown inline. */
  prompt?: string
  comments: CommunityComment[]
}

const JEREMY = {
  authorId: 'u-jeremy',
  authorName: 'Jeremy McDonald',
  authorRole: 'AI instructor',
  initials: 'JM',
}
const JULIO = {
  authorId: 'u-julio', authorName: 'Julio Arango',
  authorRole: 'Qualifying Broker', initials: 'JA',
  photo: '/brand/people/julio-arango.jpg',
}
const TAQUILLA = {
  authorId: 'u-taquilla', authorName: 'Taquilla Allen',
  authorRole: 'Managing Broker', initials: 'TA',
  photo: '/brand/people/taquilla-allen.jpg',
}
const SARAH = { authorId: 'u-sarah', authorName: 'Sarah Brockner', authorRole: 'REALTOR®', initials: 'SB' }
const VITO = { authorId: 'u-vito', authorName: 'Vito Lombardo', authorRole: 'REALTOR®', initials: 'VL' }
const NOOR = { authorId: 'u-noor', authorName: 'Noor Bengtsson', authorRole: 'REALTOR®', initials: 'NB' }
const REGIENA = { authorId: 'u-regiena', authorName: 'Regiena Brown', authorRole: 'REALTOR®', initials: 'RB' }
const CHAD = { authorId: 'u-chad', authorName: 'Chad Vesely', authorRole: 'REALTOR®', initials: 'CV' }

export const POSTS: CommunityPost[] = [
  {
    id: 'p-1', ...JEREMY, category: 'Training', agoHours: 5, likes: 12,
    pinned: true, trainingOfTheDay: true,
    lessonId: 'c02-l05',
    title: 'AI Training of the Day — Stop Accepting the First Answer',
    body:
      'This is the habit that separates agents who get value out of AI from agents who try it twice and quit. ' +
      'The first answer is a draft. You push back on it the same way you would push back on a junior assistant — ' +
      'tell it what is wrong, what you actually meant, and what good looks like. Six prompts attached to this one. ' +
      'Take fifteen minutes today.',
    comments: [
      { id: 'c-1', authorId: 'u-vito', authorName: 'Vito Lombardo', initials: 'VL', agoHours: 3,
        body: 'This fixed my listing descriptions immediately. I was accepting the first draft every time.' },
      { id: 'c-2', authorId: 'u-noor', authorName: 'Noor Bengtsson', initials: 'NB', agoHours: 2,
        body: 'The "what would make this better" follow-up is doing most of the work for me.' },
    ],
  },
  {
    id: 'p-2', ...TAQUILLA, category: 'RCRE Updates', agoHours: 20, likes: 9, pinned: true,
    title: 'Every RCRE agent now has the full AI Academy',
    body:
      'Fourteen courses, one hundred and eighty-one lessons, and the prompt library are available to you today ' +
      'at no cost. Two lessons have finished video; the rest are written and approved while we record. ' +
      'Start with ChatGPT Setup and Personalization even if you think you already know it — the settings lesson ' +
      'alone changes how the rest behaves.',
    comments: [
      { id: 'c-3', authorId: 'u-regiena', authorName: 'Regiena Brown', initials: 'RB', agoHours: 14,
        body: 'Started last night. The Knowledge Files lesson is worth the whole course.' },
    ],
  },
  {
    id: 'p-3', ...JEREMY, category: 'AI Tools', agoHours: 30, likes: 8,
    lessonId: 'c01-l05',
    title: 'Prompt of the Week — turn your last ten closings into a market note',
    prompt:
      'You are my market analyst. I am going to paste my last ten closings. For each one, note the neighbourhood, ' +
      'list-to-sale ratio and days on market. Then write a short market note for my sphere in plain language — no ' +
      'jargon, no hype, no predictions I cannot support. Ask me three questions before you write it.',
    body:
      'Pair this with the Knowledge Files lesson. Once your closings live in a project file, you stop re-pasting ' +
      'them every month and the note takes about four minutes.',
    comments: [],
  },
  {
    id: 'p-4', ...SARAH, category: 'Wins', agoHours: 46, likes: 15,
    title: 'The follow-up I almost did not send got me a listing appointment',
    body:
      'Buyer went quiet in April. RCRE Today flagged her back on Monday because she had looked at three houses in ' +
      'Mandarin over the weekend. I used the drafted text more or less as written — it referenced the actual street ' +
      'she saved. She replied in nine minutes. Appointment Saturday. I would not have called her.',
    comments: [
      { id: 'c-4', authorId: 'u-julio', authorName: 'Julio Arango', initials: 'JA',
        photo: '/brand/people/julio-arango.jpg', agoHours: 40,
        body: 'This is the whole idea. The system does not sell for you, it tells you who is worth a phone call.' },
      { id: 'c-5', authorId: 'u-chad', authorName: 'Chad Vesely', initials: 'CV', agoHours: 38,
        body: 'Nine minutes. That is the part that gets me.' },
    ],
  },
  {
    id: 'p-5', ...VITO, category: 'AI Questions', agoHours: 52, likes: 4,
    title: 'How much of my client data is safe to put in ChatGPT?',
    body:
      'I want to use it for CMA prep but I do not want to be the guy who pastes somebody’s financials into a chat ' +
      'window. Where is the line?',
    comments: [
      { id: 'c-6', authorId: 'u-jeremy', authorName: 'Jeremy McDonald', initials: 'JM', agoHours: 50,
        body: 'Right question, and there is a whole lesson on it — Privacy and Common Sense, Course 1 Lesson 7. ' +
              'Short version: property data and public record are fine, anything that identifies a person or their ' +
              'finances is not. Use the demonstration account for anything you are unsure about.' },
      { id: 'c-7', authorId: 'u-taquilla', authorName: 'Taquilla Allen', initials: 'TA',
        photo: '/brand/people/taquilla-allen.jpg', agoHours: 44,
        body: 'And if you are ever unsure, ask before you paste. That is a brokerage rule, not a preference.' },
    ],
  },
  {
    id: 'p-6', ...JEREMY, category: 'Listings', agoHours: 68, likes: 7,
    lessonId: 'c05-l01',
    title: 'Listing marketing: write the copy before the photographer arrives',
    body:
      'Most agents wait for photos and then rush the copy in an hour. Flip it. Write the story of the house first, ' +
      'then shoot to the story. Course 5 opens with this and it changes what you ask the photographer for.',
    comments: [],
  },
  {
    id: 'p-7', ...NOOR, category: 'Lead Follow Up', agoHours: 74, likes: 6,
    title: 'What do you actually say on attempt four?',
    body:
      'First three attempts I have down. By the fourth I feel like I am nagging and I go quiet, which is probably ' +
      'worse. What is working for people?',
    comments: [
      { id: 'c-8', authorId: 'u-sarah', authorName: 'Sarah Brockner', initials: 'SB', agoHours: 70,
        body: 'I stopped following up and started sending something useful instead. A comp on their street, a new ' +
              'listing that fits. It is not a follow-up if it has something in it for them.' },
      { id: 'c-9', authorId: 'u-jeremy', authorName: 'Jeremy McDonald', initials: 'JM', agoHours: 66,
        body: 'That is exactly it. The Coach course has a roleplay for this — practise the fourth call against an ' +
              'AI that pushes back before you make it for real.' },
    ],
  },
  {
    id: 'p-8', ...JEREMY, category: 'Training', agoHours: 96, likes: 11,
    lessonId: 'c01-l01',
    title: 'New course available — start here if you are new',
    body:
      'ChatGPT Setup and Personalization is live with finished video on lessons 1 and 7. Eight lessons, about an ' +
      'hour total. Do it in order. The Projects and Knowledge Files lessons are where it stops being a toy.',
    comments: [],
  },
  {
    id: 'p-9', ...REGIENA, category: 'Marketing', agoHours: 110, likes: 5,
    title: 'Thirty days of content in one sitting, and it did not sound like a robot',
    body:
      'Used the content calendar lesson in Real Estate Marketing Pro. The trick was feeding it my own past posts ' +
      'first so it had my voice to work from. Took about ninety minutes for the month.',
    comments: [
      { id: 'c-10', authorId: 'u-noor', authorName: 'Noor Bengtsson', initials: 'NB', agoHours: 100,
        body: 'Did you keep the ones it wrote or rewrite them?' },
      { id: 'c-11', authorId: 'u-regiena', authorName: 'Regiena Brown', initials: 'RB', agoHours: 98,
        body: 'Kept about two-thirds. Rewrote the rest, which is still ten times faster than starting cold.' },
    ],
  },
  {
    id: 'p-10', ...JULIO, category: 'RCRE Updates', agoHours: 140, likes: 10,
    title: 'Office hours every other Thursday',
    body:
      'Bring a real problem — a lead you cannot move, a listing that is not getting showings, a prompt that keeps ' +
      'giving you garbage. We work it live. This is not a webinar and there is no deck.',
    comments: [],
  },
  {
    id: 'p-11', ...CHAD, category: 'AI Questions', agoHours: 160, likes: 3,
    title: 'Is there training on the CMA side of this?',
    body: 'Half my week is comps and pricing conversations. Anything in the Academy for that?',
    comments: [
      { id: 'c-12', authorId: 'u-jeremy', authorName: 'Jeremy McDonald', initials: 'JM', agoHours: 156,
        body: 'Course 8 — CMA and Market Analysis Assistant, sixteen lessons. It is the longest course in the ' +
              'Academy for a reason.' },
    ],
  },
  {
    id: 'p-12', ...SARAH, category: 'General Discussion', agoHours: 190, likes: 7,
    title: 'Anyone else working both markets?',
    body:
      'Picked up a referral in Birmingham and I am licensed there now. Curious how people handle two markets ' +
      'without dropping the ball on either.',
    comments: [
      { id: 'c-13', authorId: 'u-vito', authorName: 'Vito Lombardo', initials: 'VL', agoHours: 180,
        body: 'Block the week by market, not by task. Tuesdays and Thursdays are Birmingham for me and I do not ' +
              'take Jacksonville showings those days.' },
    ],
  },
  {
    id: 'p-13', ...JEREMY, category: 'AI Tools', agoHours: 220, likes: 6,
    title: 'A note on tools: the model matters less than you think',
    body:
      'People ask which one to use. Use the one you already pay for. The habits in this Academy work the same way ' +
      'across all of them, and the day you switch, none of what you learned goes away.',
    comments: [],
  },
]

/** Participation, not points. Deliberately quiet — see the Community page. */
export interface LeaderRow {
  userId: string
  name: string
  initials: string
  photo?: string
  lessonsComplete: number
  posts: number
}

export const LEADERBOARD: LeaderRow[] = [
  { userId: 'u-regiena', name: 'Regiena Brown', initials: 'RB', lessonsComplete: 24, posts: 3 },
  { userId: 'u-sarah', name: 'Sarah Brockner', initials: 'SB', lessonsComplete: 12, posts: 4 },
  { userId: 'u-vito', name: 'Vito Lombardo', initials: 'VL', lessonsComplete: 11, posts: 3 },
  { userId: 'u-noor', name: 'Noor Bengtsson', initials: 'NB', lessonsComplete: 8, posts: 3 },
  { userId: 'u-chad', name: 'Chad Vesely', initials: 'CV', lessonsComplete: 2, posts: 2 },
]

/** Today's featured training post, resolved to its real lesson. */
export function trainingOfTheDay() {
  const post = POSTS.find(p => p.trainingOfTheDay)
  if (!post?.lessonId) return null
  const lesson = lessonById(post.lessonId)
  if (!lesson) return null
  return { post, lesson, course: courseById(lesson.courseId) }
}

export const postsIn = (category?: string): CommunityPost[] => {
  const rows = category ? POSTS.filter(p => p.category === category) : POSTS
  // Pinned first, then newest. Sorting on the data rather than in the view so
  // the feed and the "recent activity" strip cannot disagree about order.
  return [...rows].sort((a, b) =>
    Number(!!b.pinned) - Number(!!a.pinned) || a.agoHours - b.agoHours)
}
