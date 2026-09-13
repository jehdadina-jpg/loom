/**
 * Branching conversations.
 *
 * Every conversation runs five beats deep. Each beat offers three replies, and the
 * reply chosen decides both what the character says back and which version of the
 * next beat you get — so the talk genuinely forks rather than just decorating a
 * fixed script. The running tone of your replies decides how it ends.
 *
 * Two rules hold everywhere: no reply is ever wrong, and nobody is ever asked to
 * remember something. Characters offer memories rather than testing for them.
 */

export type Tone = "warm" | "curious" | "quiet";

export interface DialogueChoice {
  text: string;
  reply: string;
  tone: Tone;
  next?: string;
}

export interface DialogueNode {
  id: string;
  line: string;
  choices: DialogueChoice[];
}

export interface DialogueTree {
  npcId: string;
  start: string;
  nodes: Record<string, DialogueNode>;
  endings: Record<Tone, string>;
}

function tree(npcId: string, start: string, nodes: DialogueNode[], endings: Record<Tone, string>): DialogueTree {
  return { npcId, start, nodes: Object.fromEntries(nodes.map((n) => [n.id, n])), endings };
}

// ---------------------------------------------------------------- RAMAL (elder)
const ramal = tree(
  "ramal",
  "b1",
  [
    {
      id: "b1",
      line: "There you are. I was watching the light go down over the ridge.",
      choices: [
        { text: "It's a beautiful evening.", reply: "It is. The good ones always come quietly.", tone: "warm", next: "b2a" },
        { text: "What are you looking at?", reply: "That far slope. It turns gold before anywhere else does.", tone: "curious", next: "b2b" },
        { text: "May I sit with you?", reply: "Always. Pull the stool closer, the wind is coming up.", tone: "quiet", next: "b2a" },
      ],
    },
    {
      id: "b2a",
      line: "My knees tell me the weather now. Better than any forecast.",
      choices: [
        { text: "And what do they say today?", reply: "Dry tomorrow. Rain by the day after, I'd wager.", tone: "curious", next: "b3a" },
        { text: "You've earned those knees.", reply: "Forty seasons on that hillside. They've carried me.", tone: "warm", next: "b3b" },
        { text: "Rest them a while.", reply: "I am. That's what this veranda is for.", tone: "quiet", next: "b3a" },
      ],
    },
    {
      id: "b2b",
      line: "When I was small, my mother said that slope caught the sun first because it was patient.",
      choices: [
        { text: "That's a lovely thing to say.", reply: "She had a way of making the world kinder than it was.", tone: "warm", next: "b3b" },
        { text: "Was she from this village?", reply: "Two valleys over. She walked here to be married and never left.", tone: "curious", next: "b3a" },
        { text: "I like sitting here with you.", reply: "Then we'll sit. There's no hurry in it.", tone: "quiet", next: "b3b" },
      ],
    },
    {
      id: "b3a",
      line: "The young ones are always running somewhere. Naren went past three times already.",
      choices: [
        { text: "He has a lot of energy.", reply: "He has my father's legs and none of his patience.", tone: "warm", next: "b4a" },
        { text: "Where's he off to?", reply: "Nowhere. That's the joy of it at his age.", tone: "curious", next: "b4b" },
        { text: "Let him run.", reply: "Oh, I do. I just like to comment.", tone: "quiet", next: "b4a" },
      ],
    },
    {
      id: "b3b",
      line: "This bench was cut from a tree my husband planted. It has outlasted us both, nearly.",
      choices: [
        { text: "It's a good bench.", reply: "It is. Solid through the middle, like he was.", tone: "warm", next: "b4a" },
        { text: "What kind of tree was it?", reply: "A jackfruit. Terrible for shade, wonderful for sitting on.", tone: "curious", next: "b4b" },
        { text: "You must miss him.", reply: "Some days. Most days I just talk to him and carry on.", tone: "quiet", next: "b4b" },
      ],
    },
    {
      id: "b4a",
      line: "Tell me — have you eaten? You look like someone who forgot to.",
      choices: [
        { text: "Not yet, actually.", reply: "Then that settles it. Deeplia always makes too much.", tone: "warm", next: "b5a" },
        { text: "What's cooking tonight?", reply: "Rice, greens from the garden, and whatever Bimal bartered for.", tone: "curious", next: "b5b" },
        { text: "I'm not very hungry.", reply: "That's alright. Sit anyway. The company is the point.", tone: "quiet", next: "b5a" },
      ],
    },
    {
      id: "b4b",
      line: "You know, I taught half this village to weave. Including the ones who claim they taught themselves.",
      choices: [
        { text: "You should be proud.", reply: "I am. Quietly. Loudly, sometimes, after a festival.", tone: "warm", next: "b5b" },
        { text: "Who was the worst student?", reply: "Bimal. All thumbs. He can build a roof, though.", tone: "curious", next: "b5a" },
        { text: "That's a real thing to leave behind.", reply: "Cloth outlasts talk. That's always been my thinking.", tone: "quiet", next: "b5b" },
      ],
    },
    {
      id: "b5a",
      line: "Stay a moment longer. The lamps are about to come on down the road.",
      choices: [
        { text: "I'd like that.", reply: "Good. Watch the one by the market — it's always first.", tone: "warm" },
        { text: "Who lights them?", reply: "Whoever passes. That's the arrangement. Has been for years.", tone: "curious" },
        { text: "It's peaceful here.", reply: "That's the whole of it, really.", tone: "quiet" },
      ],
    },
    {
      id: "b5b",
      line: "Come back tomorrow, if the day allows. I'm generally here.",
      choices: [
        { text: "I will, gladly.", reply: "Then I'll save you the good side of the bench.", tone: "warm" },
        { text: "Same time?", reply: "Whenever. Time is loose out here on the veranda.", tone: "curious" },
        { text: "Thank you for sitting with me.", reply: "Thank you for stopping. Not everyone does.", tone: "quiet" },
      ],
    },
  ],
  {
    warm: "Ramal pats your hand once, firmly, and goes back to watching the ridge.",
    curious: "Ramal laughs softly. \"So many questions. Good. Keep asking them.\"",
    quiet: "Ramal says nothing more, and somehow that is the friendliest thing of all.",
  },
);

// ---------------------------------------------------------------- BIMAL (son)
const bimal = tree(
  "bimal",
  "b1",
  [
    {
      id: "b1",
      line: "Back from the terraces. My back knows it, my stomach knows it.",
      choices: [
        { text: "Long day?", reply: "Long, but a good one. The upper rows are nearly in.", tone: "curious", next: "b2a" },
        { text: "You work too hard.", reply: "So everyone keeps telling me. Nobody offers to swap.", tone: "warm", next: "b2b" },
        { text: "Sit down, then.", reply: "In a moment. If I sit now I won't get up again.", tone: "quiet", next: "b2a" },
      ],
    },
    {
      id: "b2a",
      line: "The water channel above the third terrace is blocked again. Third time this season.",
      choices: [
        { text: "What's blocking it?", reply: "Leaves, mostly. And one very committed stone.", tone: "curious", next: "b3a" },
        { text: "You'll sort it out.", reply: "I will. Tomorrow, with a longer stick and a worse temper.", tone: "warm", next: "b3b" },
        { text: "Sounds tiring.", reply: "It's the same every year. There's comfort in that, oddly.", tone: "quiet", next: "b3a" },
      ],
    },
    {
      id: "b2b",
      line: "Someone has to do it. And honestly, I like it up there. It's quiet.",
      choices: [
        { text: "What's it like at the top?", reply: "You can see the whole valley. On clear days, two villages over.", tone: "curious", next: "b3a" },
        { text: "You sound like your mother.", reply: "Don't tell her that. She'll be unbearable about it.", tone: "warm", next: "b3b" },
        { text: "Quiet is worth a lot.", reply: "It is. Hard to come by in this house.", tone: "quiet", next: "b3b" },
      ],
    },
    {
      id: "b3a",
      line: "Rumak wants to come up and help next season. She's too small, but she's persistent.",
      choices: [
        { text: "Let her try.", reply: "I might. Give her the easy row and let her feel useful.", tone: "warm", next: "b4a" },
        { text: "How old is she now?", reply: "Nine. Going on forty, the way she talks to me.", tone: "curious", next: "b4b" },
        { text: "She'll get there.", reply: "She will. Faster than I'd like.", tone: "quiet", next: "b4a" },
      ],
    },
    {
      id: "b3b",
      line: "I traded two baskets of greens at the market for rice today. Ilo drives a hard bargain.",
      choices: [
        { text: "Did you get a fair price?", reply: "Fair enough. She always throws something in at the end.", tone: "curious", next: "b4b" },
        { text: "You're a good trader.", reply: "I'm a stubborn one. That's most of trading.", tone: "warm", next: "b4a" },
        { text: "Rice is rice.", reply: "Spoken like someone who's never gone without it.", tone: "quiet", next: "b4b" },
      ],
    },
    {
      id: "b4a",
      line: "Do you remember — no, wait. Let me just tell it. My father once fell asleep in the irrigation channel.",
      choices: [
        { text: "He didn't.", reply: "He did. Woke up soaked and swore the channel moved.", tone: "warm", next: "b5a" },
        { text: "How did that happen?", reply: "Hot day, cool water, and a man who'd worked since dawn.", tone: "curious", next: "b5b" },
        { text: "That's a good story.", reply: "It's the family story. It gets better each telling.", tone: "quiet", next: "b5a" },
      ],
    },
    {
      id: "b4b",
      line: "The roof needs re-thatching before the rains. I keep saying it and keep not doing it.",
      choices: [
        { text: "There's still time.", reply: "There is. There always is, until suddenly there isn't.", tone: "warm", next: "b5b" },
        { text: "Who helps with that?", reply: "Half the road turns up. It's more a gathering than a job.", tone: "curious", next: "b5a" },
        { text: "It'll get done.", reply: "It always does. That's the village for you.", tone: "quiet", next: "b5b" },
      ],
    },
    {
      id: "b5a",
      line: "Right. Water, then food, then I'm sitting down for the rest of my natural life.",
      choices: [
        { text: "You've earned it.", reply: "I have. Don't let anyone move me.", tone: "warm" },
        { text: "What's for dinner?", reply: "Whatever's ready first. I've stopped being fussy.", tone: "curious" },
        { text: "Go and rest.", reply: "Going. Thank you for asking after me.", tone: "quiet" },
      ],
    },
    {
      id: "b5b",
      line: "Good to talk to you. Some days I don't say ten words until the sun's down.",
      choices: [
        { text: "Any time.", reply: "I'll hold you to that.", tone: "warm" },
        { text: "Is it lonely up there?", reply: "Sometimes. Mostly it's just quiet, which is different.", tone: "curious" },
        { text: "I'm glad you're home.", reply: "So am I. Every single evening.", tone: "quiet" },
      ],
    },
  ],
  {
    warm: "Bimal grins, claps your shoulder, and finally sits down.",
    curious: "Bimal shakes his head, amused. \"You ask more than Rumak does.\"",
    quiet: "Bimal nods once and lets the quiet sit comfortably between you.",
  },
);

// ---------------------------------------------------------------- DEEPLIA
const deeplia = tree(
  "deeplia",
  "b1",
  [
    {
      id: "b1",
      line: "Just in time. I've been stirring this pot so long I've forgotten what's in it.",
      choices: [
        { text: "It smells wonderful.", reply: "It had better. It's had all afternoon.", tone: "warm", next: "b2a" },
        { text: "What is it?", reply: "Greens, ginger, whatever the garden gave up this morning.", tone: "curious", next: "b2b" },
        { text: "Can I help?", reply: "Sit. Keeping me company is the help.", tone: "quiet", next: "b2a" },
      ],
    },
    {
      id: "b2a",
      line: "Ramal taught me this one. Badly, at first. I cried over a pot more than once.",
      choices: [
        { text: "You've clearly mastered it.", reply: "Twenty years of practice will do that.", tone: "warm", next: "b3a" },
        { text: "What went wrong back then?", reply: "Too much heat, too little patience. Same as most things.", tone: "curious", next: "b3b" },
        { text: "Learning is hard.", reply: "It is. And then one day it isn't, and you don't notice.", tone: "quiet", next: "b3a" },
      ],
    },
    {
      id: "b2b",
      line: "Rumak picked the greens. She also picked three flowers and called them seasoning.",
      choices: [
        { text: "Did you use them?", reply: "One of them. Don't tell her which.", tone: "warm", next: "b3b" },
        { text: "Is she in the garden a lot?", reply: "Every day. She talks to the plants. They seem to like it.", tone: "curious", next: "b3a" },
        { text: "That's sweet.", reply: "She is. Exhausting, but sweet.", tone: "quiet", next: "b3b" },
      ],
    },
    {
      id: "b3a",
      line: "The market had good ginger this week. Ilo saved me the best of it.",
      choices: [
        { text: "She looks after you.", reply: "We look after each other. It's been that way since we were girls.", tone: "warm", next: "b4a" },
        { text: "How long have you known her?", reply: "Since before either of us could reach the counter.", tone: "curious", next: "b4b" },
        { text: "That's good to have.", reply: "It's the best thing to have, I think.", tone: "quiet", next: "b4a" },
      ],
    },
    {
      id: "b3b",
      line: "There's a festival at the end of the month. The whole road will be cooking at once.",
      choices: [
        { text: "That sounds wonderful.", reply: "It's chaos. Wonderful chaos. My favourite week of the year.", tone: "warm", next: "b4b" },
        { text: "What do you make for it?", reply: "The same thing my mother made. I won't tell you what's in it.", tone: "curious", next: "b4a" },
        { text: "I'd like to be here for it.", reply: "Then be here. There's always a plate spare.", tone: "quiet", next: "b4b" },
      ],
    },
    {
      id: "b4a",
      line: "Sit closer to the fire. The evening comes in cold off the terraces.",
      choices: [
        { text: "That's better, thank you.", reply: "Good. Warm feet, warm mood — that's the rule here.", tone: "warm", next: "b5a" },
        { text: "Does it always get this cold?", reply: "From this month on. By winter we're all in this one room.", tone: "curious", next: "b5b" },
        { text: "The fire's lovely.", reply: "It's the heart of the house. Everything else is arrangement.", tone: "quiet", next: "b5a" },
      ],
    },
    {
      id: "b4b",
      line: "Bimal will come in soon covered in mud and pretend he isn't.",
      choices: [
        { text: "He works so hard.", reply: "He does. I just wish he'd leave the terraces outside.", tone: "warm", next: "b5b" },
        { text: "Does he always?", reply: "Every single evening. Twenty years, no improvement.", tone: "curious", next: "b5a" },
        { text: "You two suit each other.", reply: "We do, don't we. Don't tell him I said so.", tone: "quiet", next: "b5b" },
      ],
    },
    {
      id: "b5a",
      line: "Nearly ready. Will you eat with us?",
      choices: [
        { text: "I'd love to.", reply: "Then it's settled. Sit where you are, I'll bring it.", tone: "warm" },
        { text: "Is there enough?", reply: "There's always enough. That's how I cook.", tone: "curious" },
        { text: "Just a little.", reply: "A little it is. I'll put the rest by for later.", tone: "quiet" },
      ],
    },
    {
      id: "b5b",
      line: "Go and call the others in, would you? Or just sit. Either is fine.",
      choices: [
        { text: "I'll sit, I think.", reply: "Wise. They'll smell it and come on their own.", tone: "warm" },
        { text: "Where is everyone?", reply: "Scattered. They always are, until food is involved.", tone: "curious" },
        { text: "It's nice in here.", reply: "It is. Took years to make it so.", tone: "quiet" },
      ],
    },
  ],
  {
    warm: "Deeplia squeezes your arm and turns back to the pot, humming.",
    curious: "Deeplia smiles. \"You'd have got on well with my mother. She asked everything too.\"",
    quiet: "Deeplia leaves you to the warmth of the fire without another word.",
  },
);

// ---------------------------------------------------------------- RUMAK (grandchild)
const rumak = tree(
  "rumak",
  "b1",
  [
    {
      id: "b1",
      line: "Look! I picked these. All of them. By myself.",
      choices: [
        { text: "They're beautiful.", reply: "I KNOW. The orange one was the hardest to reach.", tone: "warm", next: "b2a" },
        { text: "Where did you find them?", reply: "By the back fence. There's a secret patch. It's mine.", tone: "curious", next: "b2b" },
        { text: "You did well.", reply: "I did do well. Thank you for noticing.", tone: "quiet", next: "b2a" },
      ],
    },
    {
      id: "b2a",
      line: "I'm going to put them in the blue pot. The one nobody's allowed to touch.",
      choices: [
        { text: "A very good choice.", reply: "It's the BEST pot. Grandmother said I could. Probably.", tone: "warm", next: "b3a" },
        { text: "Why is nobody allowed?", reply: "It's old. Older than Father. Maybe older than the house.", tone: "curious", next: "b3b" },
        { text: "Be careful with it.", reply: "I'm always careful. Mostly always.", tone: "quiet", next: "b3a" },
      ],
    },
    {
      id: "b2b",
      line: "Don't tell Naren. He'd pick them all and then there'd be none left.",
      choices: [
        { text: "Your secret is safe.", reply: "Good. You're on my side now. That's official.", tone: "warm", next: "b3b" },
        { text: "Is he really that bad?", reply: "He's worse. He once ate a whole tomato in the garden.", tone: "curious", next: "b3a" },
        { text: "I won't say a word.", reply: "I knew I liked you.", tone: "quiet", next: "b3b" },
      ],
    },
    {
      id: "b3a",
      line: "I'm helping in the garden now. Properly. With the little spade.",
      choices: [
        { text: "That's a real job.", reply: "It IS a real job. Father says so and he knows.", tone: "warm", next: "b4a" },
        { text: "What have you planted?", reply: "Onions. And something green. I forgot which green.", tone: "curious", next: "b4b" },
        { text: "You're growing up fast.", reply: "Everyone says that. I'm growing up at the normal speed.", tone: "quiet", next: "b4a" },
      ],
    },
    {
      id: "b3b",
      line: "When I'm big I'm going to go up to the terraces with Father. He said maybe.",
      choices: [
        { text: "I think you'd be great at it.", reply: "I'd be the BEST. I'd carry two baskets.", tone: "warm", next: "b4b" },
        { text: "What's up there?", reply: "The whole world, Father says. I want to check.", tone: "curious", next: "b4a" },
        { text: "Maybe is nearly yes.", reply: "That's what I said! Nobody agreed with me until now.", tone: "quiet", next: "b4b" },
      ],
    },
    {
      id: "b4a",
      line: "Can I tell you something? The goat doesn't like me. I don't know why.",
      choices: [
        { text: "Goats are like that.", reply: "That's what Grandmother says. I think it's personal.", tone: "warm", next: "b5a" },
        { text: "What does it do?", reply: "It STARES. From far away. For ages.", tone: "curious", next: "b5b" },
        { text: "Give it time.", reply: "I've given it loads of time. It's had months.", tone: "quiet", next: "b5a" },
      ],
    },
    {
      id: "b4b",
      line: "I know a song. Grandmother taught me. It's got about a hundred verses.",
      choices: [
        { text: "Will you sing it?", reply: "Not all hundred. Maybe two. The good ones.", tone: "warm", next: "b5b" },
        { text: "What's it about?", reply: "A river. And a bird that's rude to it.", tone: "curious", next: "b5a" },
        { text: "That sounds lovely.", reply: "It IS lovely. It's the best song.", tone: "quiet", next: "b5b" },
      ],
    },
    {
      id: "b5a",
      line: "Will you be here later? I want to show you the secret patch. Properly.",
      choices: [
        { text: "I'd like that very much.", reply: "Then it's a plan. Don't be late, it gets dark.", tone: "warm" },
        { text: "How secret is it, really?", reply: "VERY. Only me and now you and possibly the chickens.", tone: "curious" },
        { text: "I'll be around.", reply: "Good. I'll wait by the fence.", tone: "quiet" },
      ],
    },
    {
      id: "b5b",
      line: "I have to go. Mother will be looking for me. She's always looking for me.",
      choices: [
        { text: "Off you go, then.", reply: "Bye! Keep the flowers safe, they're important.", tone: "warm" },
        { text: "Why is she always looking?", reply: "Because I'm always somewhere else. It's a whole thing.", tone: "curious" },
        { text: "Take care.", reply: "I always take care. See you!", tone: "quiet" },
      ],
    },
  ],
  {
    warm: "Rumak beams, hugs the flowers to her chest, and runs off shouting your name.",
    curious: "Rumak considers you seriously. \"You ask good questions. Like a grown-up but better.\"",
    quiet: "Rumak waves with one hand, flowers clutched in the other, and skips away.",
  },
);

// ---------------------------------------------------------------- NAREN (grandchild)
const naren = tree(
  "naren",
  "b1",
  [
    {
      id: "b1",
      line: "Want to see the chickens? There's a new one. It's got opinions.",
      choices: [
        { text: "Lead the way.", reply: "Come on, come on — before it goes behind the fence again.", tone: "warm", next: "b2a" },
        { text: "Opinions about what?", reply: "Everything. Mostly where it's allowed to stand.", tone: "curious", next: "b2b" },
        { text: "In a moment.", reply: "Alright. I'll wait. I'm very patient.", tone: "quiet", next: "b2a" },
      ],
    },
    {
      id: "b2a",
      line: "I've named them all. Father says you shouldn't name chickens but I did it anyway.",
      choices: [
        { text: "Names are important.", reply: "That's what I said! They're not just chickens, they're THEM.", tone: "warm", next: "b3a" },
        { text: "What are they called?", reply: "Big One, Small One, Fast One, and Trouble.", tone: "curious", next: "b3b" },
        { text: "Good for you.", reply: "Thanks. Trouble is my favourite.", tone: "quiet", next: "b3a" },
      ],
    },
    {
      id: "b2b",
      line: "The dog and the chickens have a whole system. Nobody understands it except them.",
      choices: [
        { text: "They sound organised.", reply: "They ARE. It's a bit frightening actually.", tone: "warm", next: "b3b" },
        { text: "What kind of system?", reply: "Dog sits there. Chickens go round. Nobody argues.", tone: "curious", next: "b3a" },
        { text: "Animals are clever.", reply: "Cleverer than Rumak thinks, anyway.", tone: "quiet", next: "b3b" },
      ],
    },
    {
      id: "b3a",
      line: "I ran all the way to the market and back today. Twice.",
      choices: [
        { text: "That's a long way!", reply: "It's not that far if you don't stop. I don't stop.", tone: "warm", next: "b4a" },
        { text: "Why twice?", reply: "I forgot the thing the first time. Then I forgot to be annoyed.", tone: "curious", next: "b4b" },
        { text: "You must be tired.", reply: "Not even a bit. I could go again right now.", tone: "quiet", next: "b4a" },
      ],
    },
    {
      id: "b3b",
      line: "Ilo at the market gives me a piece of fruit if I carry things. It's a good arrangement.",
      choices: [
        { text: "Sounds like a fair deal.", reply: "It's the BEST deal. I'd carry things anyway.", tone: "warm", next: "b4b" },
        { text: "What do you carry?", reply: "Baskets. Sacks. Once a very unhappy duck.", tone: "curious", next: "b4a" },
        { text: "You're helpful.", reply: "I know. I'm extremely helpful.", tone: "quiet", next: "b4b" },
      ],
    },
    {
      id: "b4a",
      line: "Grandmother says I never sit still. I sit still LOADS. Just not when she's looking.",
      choices: [
        { text: "That's her mistake, then.", reply: "EXACTLY. Finally, someone sensible.", tone: "warm", next: "b5a" },
        { text: "When do you sit still?", reply: "By the water. That's the one place. Don't tell anyone.", tone: "curious", next: "b5b" },
        { text: "She just likes watching you.", reply: "...Yeah. Probably that.", tone: "quiet", next: "b5a" },
      ],
    },
    {
      id: "b4b",
      line: "The best place in the whole village is the big tree. I can get right to the top.",
      choices: [
        { text: "That sounds brilliant.", reply: "It IS. You can see the market and everyone's roofs.", tone: "warm", next: "b5b" },
        { text: "Isn't that high?", reply: "Very. That's the entire point of it.", tone: "curious", next: "b5a" },
        { text: "Be careful up there.", reply: "I'm always careful. I've only fallen twice.", tone: "quiet", next: "b5b" },
      ],
    },
    {
      id: "b5a",
      line: "Right, I'm going. Things to do. Places to run to.",
      choices: [
        { text: "Go on then.", reply: "Bye! I'll come and find you later!", tone: "warm" },
        { text: "What things?", reply: "Don't know yet. That's what makes it good.", tone: "curious" },
        { text: "Enjoy yourself.", reply: "I always do. See you!", tone: "quiet" },
      ],
    },
    {
      id: "b5b",
      line: "You should come with me sometime. You'd be good at running.",
      choices: [
        { text: "I'd like that.", reply: "Brilliant. I'll go slow. A bit slow.", tone: "warm" },
        { text: "What makes you say that?", reply: "You listen properly. Good runners listen.", tone: "curious" },
        { text: "Maybe I will.", reply: "Maybe is nearly yes. Rumak told me that.", tone: "quiet" },
      ],
    },
  ],
  {
    warm: "Naren is already twenty paces away, waving both arms over his head.",
    curious: "Naren looks pleased with himself. \"Nobody asks me stuff. That was good.\"",
    quiet: "Naren gives you a nod, entirely serious, and bolts off down the road.",
  },
);

// ---------------------------------------------------------------- ILO (vendor)
const vendor = tree(
  "vendor",
  "b1",
  [
    {
      id: "b1",
      line: "Fresh in from the terrace fields this morning. Still cold from the hillside.",
      choices: [
        { text: "It all looks wonderful.", reply: "It is wonderful. I don't put out anything I wouldn't eat.", tone: "warm", next: "b2a" },
        { text: "What's best today?", reply: "The greens. And the oranges, but I'd say that anyway.", tone: "curious", next: "b2b" },
        { text: "I'm just looking.", reply: "Look as long as you like. Looking is free.", tone: "quiet", next: "b2a" },
      ],
    },
    {
      id: "b2a",
      line: "I've had this stall since I was sixteen. My mother had it before me.",
      choices: [
        { text: "That's a real legacy.", reply: "It's a lot of early mornings is what it is.", tone: "warm", next: "b3a" },
        { text: "Has it changed much?", reply: "The road's better. The prices are worse. Same fruit.", tone: "curious", next: "b3b" },
        { text: "You've kept it well.", reply: "I try. She'd have opinions if I didn't.", tone: "quiet", next: "b3a" },
      ],
    },
    {
      id: "b2b",
      line: "Bimal brought these greens down this morning. Drove a hard bargain, as usual.",
      choices: [
        { text: "He said the same about you.", reply: "Did he! Good. That means it was a fair trade.", tone: "warm", next: "b3b" },
        { text: "Who usually wins?", reply: "Neither of us. That's how you know it's working.", tone: "curious", next: "b3a" },
        { text: "You two go back a while.", reply: "Since we were children. Everyone here does.", tone: "quiet", next: "b3b" },
      ],
    },
    {
      id: "b3a",
      line: "Naren runs errands for me. I pay in fruit. He thinks he's getting the better deal.",
      choices: [
        { text: "Maybe he is.", reply: "Maybe. He's saved me a hundred trips this season.", tone: "warm", next: "b4a" },
        { text: "Is he reliable?", reply: "Surprisingly. Fast, too. Rarely drops anything.", tone: "curious", next: "b4b" },
        { text: "That's kind of you.", reply: "It's not kindness, it's staffing.", tone: "quiet", next: "b4a" },
      ],
    },
    {
      id: "b3b",
      line: "The festival's coming. I'll be here from before dawn and I'll still run out of everything.",
      choices: [
        { text: "That's a good problem.", reply: "It's the best problem. Exhausting, though.", tone: "warm", next: "b4b" },
        { text: "What sells out first?", reply: "Oranges. Every year. I never learn.", tone: "curious", next: "b4a" },
        { text: "You'll manage.", reply: "I always do. Then I sleep for two days.", tone: "quiet", next: "b4b" },
      ],
    },
    {
      id: "b4a",
      line: "Here — take this one. No, don't argue. It's bruised on the bottom anyway.",
      choices: [
        { text: "That's very kind.", reply: "It's an orange, not a house. Take it.", tone: "warm", next: "b5a" },
        { text: "Is it really bruised?", reply: "...It might be. Take it before I change my story.", tone: "curious", next: "b5b" },
        { text: "Thank you.", reply: "Go on. Eat it before it eats itself.", tone: "quiet", next: "b5a" },
      ],
    },
    {
      id: "b4b",
      line: "I know every family on this road by what they buy. It's a strange kind of knowing.",
      choices: [
        { text: "That's rather lovely.", reply: "It is. I know when a baby's coming before they announce it.", tone: "warm", next: "b5b" },
        { text: "What do we buy?", reply: "Greens, ginger, and too much rice. Every week.", tone: "curious", next: "b5a" },
        { text: "You see a lot from here.", reply: "Everything passes this stall eventually.", tone: "quiet", next: "b5b" },
      ],
    },
    {
      id: "b5a",
      line: "Come back tomorrow. I'll put the good mangoes aside for you.",
      choices: [
        { text: "I'll be here.", reply: "Then so will they. Under the counter, mind.", tone: "warm" },
        { text: "How early?", reply: "Any time. I'm here before the birds are.", tone: "curious" },
        { text: "You're too generous.", reply: "I'm exactly generous enough. Off you go.", tone: "quiet" },
      ],
    },
    {
      id: "b5b",
      line: "Good to see you at the stall. It's quiet some mornings.",
      choices: [
        { text: "I'll come more often.", reply: "Do. The company's half the reason I open up.", tone: "warm" },
        { text: "Quiet mornings sound nice.", reply: "They are, for an hour. Then they're just quiet.", tone: "curious" },
        { text: "Take care, Ilo.", reply: "And you. Mind the road, it's uneven by the well.", tone: "quiet" },
      ],
    },
  ],
  {
    warm: "Ilo waves you off with both hands, already turning to the next customer.",
    curious: "Ilo laughs. \"You've asked me more than my own children do.\"",
    quiet: "Ilo nods, satisfied, and goes back to arranging the fruit just so.",
  },
);

export const DIALOGUE_TREES: Record<string, DialogueTree> = {
  ramal: ramal,
  bimal: bimal,
  deeplia: deeplia,
  rumak: rumak,
  naren: naren,
  vendor: vendor,
};

export function getDialogueTree(npcId: string): DialogueTree | undefined {
  return DIALOGUE_TREES[npcId];
}

export function dominantTone(tally: Record<Tone, number>): Tone {
  const entries = Object.entries(tally) as [Tone, number][];
  return entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? "warm";
}
