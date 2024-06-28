import 'jspsych/css/jspsych.css';
import {initJsPsych} from 'jspsych';
import FullscreenPlugin from "@jspsych/plugin-fullscreen";
import HtmlKeyboardResponsePlugin from "@jspsych/plugin-html-keyboard-response";
import ImageKeyboardResponsePlugin from "@jspsych/plugin-image-keyboard-response";
import PreloadPlugin from "@jspsych/plugin-preload";
import { readFile, shuffleIndices } from "./utils.ts";
import { generateCircularStimuli } from "./generate-stimuli.ts";

import jsPsychWebgazerValidate from "@jspsych/plugin-webgazer-validate";
import jsPsychExtensionWebgazer from "@jspsych/extension-webgazer";
import jsPsychWebgazerInitCamera from "@jspsych/plugin-webgazer-init-camera";
import jsPsychWebgazerCalibrate from '@jspsych/plugin-webgazer-calibrate';

import DragndropPlugin from "./plugin-dragndrop.ts";

import PavloviaPlugin from "./plugin-pavlovia";

const TRACK_EYE = true;
const jsPsych = initJsPsych({
  extensions: TRACK_EYE ? [{
      type: jsPsychExtensionWebgazer,
      params: {
        auto_initialize: true,
      }
    }] : [],
  on_finish: function() {
      jsPsych.data.displayData('json');
  }
});

const timeline: { [key: string]: any }[] = [];

/* init connection with pavlovia.org */
timeline.push({
  type: PavloviaPlugin,
  command: "init"
});

// Preload assets
// timeline.push({
//   type: PreloadPlugin,
//   images: assetPaths.images,
//   audio: assetPaths.audio,
//   video: assetPaths.video,
// });

timeline.push({
  type: HtmlKeyboardResponsePlugin,
  stimulus: `<h1>Experiment</h1>
<p>In this experiment, you will play a small treasure sorting game. During the playing, your activity and eye movement will be recorded. However, your video will not be recorded. In the next screen, your camera will be calibrated to track your eye properly. Please follow the instructions properly to help us get the most accurate experiment results.</p>
<p>Press any key to go next.</p>`
});

timeline.push({
  type: HtmlKeyboardResponsePlugin,
  stimulus: `<h1>Fullscreen</h1>
<p>For best accuracy and your attention, it is highly recommended that you play the game in fullscreen.</p>
<p>Press any key to fullscreen and continue to camera calibration.</p>`
})
// Switch to fullscreen
// timeline.push({
//   type: FullscreenPlugin,
//   fullscreen_mode: true,
// });

// initialize eye tracking
if (TRACK_EYE) {
  timeline.push({
    type: jsPsychWebgazerInitCamera
  })

  timeline.push({
    type: jsPsychWebgazerCalibrate,
    calibration_points: [[25,50], [50,50], [75,50], [50,25], [50,75]],
    calibration_mode: 'click'
  })
  // timeline.push({
  //   type: jsPsychWebgazerValidate,
  //   validation_points: [[-200,200], [200,200],[-200,-200],[200,-200]],
  //   validation_point_coordinates: 'center-offset-pixels',
  //   roi_radius: 100
  // })
}

// Welcome screen
timeline.push({
  type: HtmlKeyboardResponsePlugin,
  stimulus: `<h1>The Lost Treasures of Colorland</h1>
<p>Welcome to Colorland, a vibrant kingdom where every shape, color, and pattern contributes to its enchanting festivals. This year, a whirlwind has mixed up all the decorations needed for the grand Festival of Patterns. Without these decorations in their right places, the festival cannot start.</p>
<p>Press any key to go next.</p>`
});

// Instructions 1
timeline.push({
  type: HtmlKeyboardResponsePlugin,
  stimulus: `<p>To save the Festival of Patterns, we need your special skills. We have four magical buckets, each dedicated to collecting specific types of festival decorations</p>
  <p>Here’s how you can help: We will show you one special decoration at a time. For the first item, we'll tell you exactly which bucket it belongs to. If you place it correctly, a magical reward will appear! For the other items, we won't tell you their buckets, but if you remember the clues and use your best judgment, you’ll earn more rewards each time you choose correctly.</p>`,
});

const stimulus = await Promise.all([
  // Context 1
    // Action A
  ["A-1", "B-4", "C-1", "D-1", "E-2"],
  ["A-1", "B-1", "C-1", "D-2", "E-3"],
    // Action B
  ["A-1", "B-2", "C-2", "D-4", "E-2"],
  ["A-1", "B-3", "C-2", "D-3", "E-2"],
  // Context 2
    // Action C
  ["A-2", "B-2", "C-1", "D-4", "E-2"],
  ["A-2", "B-3", "C-1", "D-3", "E-2"],
    // Action D
  ["A-2", "B-4", "C-2", "D-1", "E-2"],
  ["A-2", "B-1", "C-2", "D-2", "E-3"],
  // Context 3 (all previous)
].map(features => generateCircularStimuli(
  "/images/features/A-1.png",
  features.map(f => `/images/features/${f}.png`)
)));

const BASKETS = shuffleIndices(4).map(i => [
  {
    color: "blue",
    image: "/images/baskets/basket-blue.png",
    name: "Emerald Vault",
  },
  {
    color: "green",
    image: "/images/baskets/basket-green.png",
    name: "Azure Haven",
  },
  {
    color: "red",
    image: "/images/baskets/basket-red.png",
    name: "Crimson Nook",
  },
  {
    color: "yellow",
    image: "/images/baskets/basket-yellow.png",
    name: "Golden Repository",
  },
][i]);
const correct_buckets = [0, 0, 1, 1, 2, 2, 3, 3];

const rewards = {
  correct: "/images/reward/diamond.png",
  incorrect: "/images/reward/nodiamond.png",
}

const sampleStimuliIndex = shuffleIndices(4)[0];
timeline.push({
  type: HtmlKeyboardResponsePlugin,
  stimulus: `<img src="${stimulus[sampleStimuliIndex]}" />
  <p>This is a treasure. Each treasure has 5 features at 5 corners.</p>`
});
const firstTrial = {
  type: DragndropPlugin,
  element: stimulus[sampleStimuliIndex],
  show_labels: true,
  buckets: BASKETS.map(b => b.image),
  bucket_labels: BASKETS.map(b => b.name),
  correct_bucket_index: correct_buckets[sampleStimuliIndex],
  randomize_bucket_order: true,
  text_prompt: `This treasure belongs to the <b>${BASKETS[correct_buckets[sampleStimuliIndex]].name}</b>. Drag the treasure to that basket.`,
  extensions: TRACK_EYE?[
    {
      type: jsPsychExtensionWebgazer, 
      params: {
        targets: [
          '#jspsych-dragndrop-bucket-0',
          '#jspsych-dragndrop-bucket-1',
          '#jspsych-dragndrop-bucket-2',
          '#jspsych-dragndrop-bucket-3',
          '#jspsych-dragndrop-element',
        ],
      }
    }
  ]:[]
};

function getOutcome() {
  return jsPsych
    .data.get()
    .filter({trial_type: 'dragndrop'})
    .last(1)
    .values()[0]
    .is_correct
}
const firstReward = {
  type: HtmlKeyboardResponsePlugin,
  stimulus: () => getOutcome() ? `<img src="${rewards.correct}" width="500px" /><p>Well done! You have earned a magical reward!</p>` : `<img src="${rewards.incorrect}" width="500px" /><p>Oops! You have not earned a magical reward this time. Please try again.</p>`,
};
const firstLoop = {
  timeline: [firstTrial, firstReward],
  loop_function: () => !getOutcome(),
};
timeline.push(firstLoop);

console.log()

// Context 1
const context1Procedure = {
  timeline: [
    {
      type: ImageKeyboardResponsePlugin,
      stimulus: jsPsych.timelineVariable('stimuli'),
      trial_duration: 1000,
    },
    {
      type: DragndropPlugin,
      element: jsPsych.timelineVariable('stimuli'),
      buckets: BASKETS.map(b => b.image),
      show_labels: true,
      bucket_labels: BASKETS.map(b => b.name),
      correct_bucket_index: jsPsych.timelineVariable('correct_bucket_index'),
      text_prompt: `Drag the treasure to the correct basket.`,
      track_dragging: true,
      randomize_bucket_order: true,
    },
    {
      type: HtmlKeyboardResponsePlugin,
      stimulus: () => getOutcome() ? `<img src="${rewards.correct}" width="500px" /><p>Well done! You have earned a magical reward!</p>` : `<img src="${rewards.incorrect}" width="500px" /><p>Oops! You have not earned a magical reward this time. Please try again.</p>`,
    }
  ],
  timeline_variables: Array.from({ length: 4 }).map((_, i) => (
    { stimuli: stimulus[i], correct_bucket_index: correct_buckets[i] }
  )),
  randomize_order: true,
  repetitions: 1,
}
timeline.push(context1Procedure);

// Context 2
const context2Procedure = {
  timeline: [
    {
      type: ImageKeyboardResponsePlugin,
      stimulus: jsPsych.timelineVariable('stimuli'),
      trial_duration: 1000,
    },
    {
      type: DragndropPlugin,
      element: jsPsych.timelineVariable('stimuli'),
      buckets: BASKETS.map(b => b.image),
      show_labels: true,
      bucket_labels: BASKETS.map(b => b.name),
      correct_bucket_index: jsPsych.timelineVariable('correct_bucket_index'),
      text_prompt: `Drag the treasure to the correct basket.`,
      track_dragging: true,
      randomize_bucket_order: true,
    },
    {
      type: HtmlKeyboardResponsePlugin,
      stimulus: () => getOutcome() ? `<img src="${rewards.correct}" width="500px" /><p>Well done! You have earned a magical reward!</p>` : `<img src="${rewards.incorrect}" width="500px" /><p>Oops! You have not earned a magical reward this time. Please try again.</p>`,
    }
  ],
  timeline_variables: Array.from({ length: 4 }).map((_, i) => (
    { stimuli: stimulus[i+4], correct_bucket_index: correct_buckets[i+4] }
  )),
  randomize_order: true,
  repetitions: 1,
}
timeline.push(context2Procedure);


// Context 3
const context3Procedure = {
  timeline: [
    {
      type: ImageKeyboardResponsePlugin,
      stimulus: jsPsych.timelineVariable('stimuli'),
      trial_duration: 1000,
    },
    {
      type: DragndropPlugin,
      element: jsPsych.timelineVariable('stimuli'),
      buckets: BASKETS.map(b => b.image),
      show_labels: true,
      bucket_labels: BASKETS.map(b => b.name),
      correct_bucket_index: jsPsych.timelineVariable('correct_bucket_index'),
      text_prompt: `Drag the treasure to the correct basket.`,
      track_dragging: true,
      randomize_bucket_order: true,
    },
    {
      type: HtmlKeyboardResponsePlugin,
      stimulus: () => getOutcome() ? `<img src="${rewards.correct}" width="500px" /><p>Well done! You have earned a magical reward!</p>` : `<img src="${rewards.incorrect}" width="500px" /><p>Oops! You have not earned a magical reward this time. Please try again.</p>`,
    }
  ],
  timeline_variables: Array.from({ length: 8 }).map((_, i) => (
    { stimuli: stimulus[i], correct_bucket_index: correct_buckets[i] }
  )),
  randomize_order: true,
  repetitions: 1,
}
timeline.push(context3Procedure);

// outro
timeline.push({
  type: HtmlKeyboardResponsePlugin,
  stimulus: `<h1>Thank you for playing!</h1>`,
});

/* finish connection with pavlovia.org */
timeline.push({
  type: PavloviaPlugin,
  command: "finish"
});



jsPsych.run(timeline);