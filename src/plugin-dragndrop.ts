import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";

const info = <const>{
  name: "dragndrop",
  parameters: {
    // types: BOOL, STRING, INT, FLOAT, FUNCTION, KEY, KEYS, SELECT, HTML_STRING, IMAGE, AUDIO, VIDEO, OBJECT, COMPLEX
    element: {
      type: ParameterType.IMAGE, 
      default: undefined,
    },
    buckets: {
      type: ParameterType.COMPLEX,
      default: undefined,
    },
    show_labels: {
      type: ParameterType.BOOL,
      default: false,
    },
    bucket_labels: {
      type: ParameterType.COMPLEX,
      default: undefined,
    },
    text_prompt: {
      type: ParameterType.STRING,
      default: "",
    },
    radius: {
      type: ParameterType.INT,
      default: 400,
    },
    track_dragging: {
      type: ParameterType.BOOL,
      default: false,
    },
    randomize_bucket_order: {
      type: ParameterType.BOOL,
      default: false,
    },
    correct_bucket_index: {
      type: ParameterType.INT,
      default: undefined,
    }
  },
};

type Info = typeof info;
type DragDataType = { x: number, y: number, time: number }[];

/**
 * **dragndrop**
 *
 * This plugin allows participants to drag an object on the screen to any other object.
 *
 * @author Rahat Zaman
 * @see {@link https://github.com/jspsych/jspsych-contrib/packages/plugin-dragndrop/README.md}}
 */
class DragndropPlugin implements JsPsychPlugin<Info> {
  static info = info;

  constructor(private jsPsych: JsPsych) {}

  trial(display_element: HTMLElement, trial: TrialType<Info>) {
    const jsPsych = this.jsPsych;
    display_element.innerHTML = "";
    const allDragData: DragDataType[] = [];
    for (let i = 0; i < trial.buckets.length; i++) {
      display_element.innerHTML += `<div id="jspsych-dragndrop-bucket-${i}" class="jspsych-dragndrop-bucket">
        <img src="${trial.buckets[i]}" class="jspsych-dragndrop-bucket-img" />
        ${trial.show_labels ? '<p>'+trial.bucket_labels[i]+'</p>' : ''}
      </div>`;
    }
    // create the draggable element
    display_element.innerHTML += `
    <div id="jspsych-dragndrop-element" class="jspsych-dragndrop-element">
      <img src="${trial.element}" id="jspsych-dragndrop-element-img" class="jspsych-dragndrop-element-img" >
    </div>
    `;
    
    // calculate the center in the screen
    const center_x = window.innerWidth / 2;
    const center_y = window.innerHeight / 2;
    
    // calculate the position for each draggable element with radius, angle, and center. The first bucket is at 0 degrees, the second at 360/num_buckets degrees, and so on.
    const num_buckets = trial.buckets.length;
    const angle = 360 / num_buckets;
    const radius = trial.radius!;
    const draggable_xs = [];
    const draggable_ys = [];
    for (let i = 0; i < num_buckets; i++) {
      draggable_xs.push(center_x + radius * Math.cos((angle * i * Math.PI) / 180));
      draggable_ys.push(center_y + radius * Math.sin((angle * i * Math.PI) / 180));
    }
    // set text prompt at the bottom
    display_element.innerHTML += `
      <div id="jspsych-dragndrop-text-prompt" style="width: 100%; margin=100px; position: absolute; bottom: 10px; left: 0">
        <p>
          ${trial.text_prompt}
        </p>
      </div>
    `;
    
    
    display_element.innerHTML += `
      <style>
        .jspsych-dragndrop-bucket {
          width: 200px;
          height: 200px;
          display: inline-block;
          margin: 10px;
          border: 1px solid #aaa;
          position: absolute;
        }
        .jspsych-dragndrop-bucket-img {
          width: 100%;
          height: 100%;
        }
        .jspsych-dragndrop-element {
          width: 200px;
          height: 200px;
          position: absolute;
          z-index: 10;
          cursor: pointer;
          user-select: none;
        }
        .jspsych-dragndrop-element-img {
          width: 100%;
          height: 100%;
        }
      </style>
    `;
    
    // position the buckets
    const randomBucketIdxs = trial.randomize_bucket_order ? jsPsych.randomization.shuffle(Array.from(Array(trial.buckets.length).keys())) : Array.from(Array(trial.buckets.length).keys());
    for (let i = 0; i < num_buckets; i++) {
      const randomIdx = randomBucketIdxs[i];
      const bucket = display_element.querySelector(`#jspsych-dragndrop-bucket-${randomIdx}`) as HTMLElement;
      bucket.style.left = draggable_xs[i] - 100 + "px";
      bucket.style.top = draggable_ys[i] - 100 + "px";
    }
    
    // make the element draggable
    const element = display_element.querySelector("#jspsych-dragndrop-element") as HTMLElement;
    element.style.left = center_x - 100 + "px";
    element.style.top = center_y - 100 + "px";
    
    // make element draggable to each bucket
    element.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const dx = e.clientX - element.getBoundingClientRect().left;
      const dy = e.clientY - element.getBoundingClientRect().top;
      
      let currentDragData: DragDataType = [];
      
      // tracking
      const trackingInterval = setInterval(() => {
        currentDragData.push({
          x: element.getBoundingClientRect().left + 100, // Correcting to get the center of the element
          y: element.getBoundingClientRect().top + 100,
          time: jsPsych.getTotalTime(),
        });
      }, 10); // Record position every millisecond


      function move(e: MouseEvent) {
        element.style.left = e.clientX - dx + "px";
        element.style.top = e.clientY - dy + "px";
      }
      document.addEventListener("mousemove", move);
      function mouseup() {
        clearInterval(trackingInterval); // Stop tracking when the mouse is released
        document.removeEventListener("mousemove", move);
        allDragData.push(currentDragData);
        // check if the element is inside a bucket
        let droppedInBucketIndex = null;
        for (let i = 0; i < num_buckets; i++) {
          const bucket = display_element.querySelector(`#jspsych-dragndrop-bucket-${i}`) as HTMLElement;
          const rect = bucket.getBoundingClientRect();
          if (
            // check if any corner of the element is inside the bucket
            (element.getBoundingClientRect().left > rect.left && element.getBoundingClientRect().left < rect.right && element.getBoundingClientRect().top > rect.top && element.getBoundingClientRect().top < rect.bottom) ||
            (element.getBoundingClientRect().right > rect.left && element.getBoundingClientRect().right < rect.right && element.getBoundingClientRect().top > rect.top && element.getBoundingClientRect().top < rect.bottom) ||
            (element.getBoundingClientRect().left > rect.left && element.getBoundingClientRect().left < rect.right && element.getBoundingClientRect().bottom > rect.top && element.getBoundingClientRect().bottom < rect.bottom) ||
            (element.getBoundingClientRect().right > rect.left && element.getBoundingClientRect().right < rect.right && element.getBoundingClientRect().bottom > rect.top && element.getBoundingClientRect().bottom < rect.bottom)
          ) {
            droppedInBucketIndex = i;
            break;
          }
        }
        
        // reset the position of the element with smooth transition
        if(droppedInBucketIndex === null) {
          element.style.transition = "left 0.5s, top 0.5s";
          element.style.left = center_x - 100 + "px";
          element.style.top = center_y - 100 + "px";
          setTimeout(() => {
            element.style.transition = "";
          }, 500);
        }
        else {
          element.remove();
          const trial_data = {
            drag_data: allDragData,
            drop_bucket: droppedInBucketIndex,
            is_correct: droppedInBucketIndex === trial.correct_bucket_index,
          };
          jsPsych.finishTrial(trial_data);
        }
        document.removeEventListener("mouseup", mouseup);
      }

      document.addEventListener("mouseup", mouseup);
    });
  }
}

export default DragndropPlugin;
